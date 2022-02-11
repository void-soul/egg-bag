import {BaseContextClass, Application, Context} from 'egg';
import {ControllerConfig, HttpConfig} from 'typings';
import {sleep} from './fn';
const debugCache = require('debug')('egg-bag:cache');
// const debugRouter = require('debug')('egg-bag:router');

async function clearChild(this: Application, key: string, skipDel = false) {
  if (skipDel === false) {
    await this.redis.get('other').del(`[cache]${ key }`);
  }
  const childtype = await this.redis.get('other').type(`[cache-child]${ key }`);
  if (childtype === 'set') {
    const parentKeys = await this.redis.get('other').smembers(`[cache-child]${ key }`);
    for (const clear of parentKeys) {
      const type = await this.redis.get('other').type(`[cache-parent]${ clear }`);
      if (type === 'set') {
        await this.redis.get('other').srem(`[cache-parent]${ clear }`, key);
      }
    }
    await this.redis.get('other').del(`[cache-child]${ key }`);
  }
}
async function clearParent(this: Application, clearKey: string) {
  const keys = await this.redis.get('other').smembers(`[cache-parent]${ clearKey }`);
  if (keys) {
    for (const key of keys) {
      debugCache(`cache ${ key } cleared!`);
      await clearChild.call(this, key);
    }
  }
}

export async function setCache(
  this: Application,
  config: {
    key: string;
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
    result: any;
  },
  devid?: string | false | undefined
) {
  if (config.result !== null && config.result !== undefined) {
    // 映射关系存放
    if (config.clearKey && config.clearKey.length > 0) {
      for (const clear of config.clearKey) {
        await this.redis.get('other').sadd(`[cache-parent]${ clear }`, config.key);
        await this.redis.get('other').sadd(`[cache-child]${ config.key }`, clear);
      }
    }
    if (config.autoClearTime) { // 自动清空
      await this.redis.get('other').set(`[cache]${ config.key }`, JSON.stringify(config.result), 'EX', config.autoClearTime * 60);
      // 订阅：清空 clear list
      if (config.clearKey && config.clearKey.length > 0) {
        this.subSync(`other-[cache]${ config.key }`, async function (this: Context, key: string) {
          await clearChild.call(this.app, key, true);
        }, config.key);
      }
    } else {
      await this.redis.get('other').set(`[cache]${ config.key }`, JSON.stringify(config.result));
    }
    if (devid) {
      // 订阅：清空 clear list
      this.subSync(`user-${ devid }`, async function (this: Context, key: string) {
        await clearChild.call(this.app, key);
      }, config.key);
    }
  }
}

export async function clearCache(this: Application, key: string) {
  let type = await this.redis.get('other').type(`[cache-parent]${ key }`);
  if (type === 'set') {
    await clearParent.call(this, key);
  }
  type = await this.redis.get('other').type(`[cache]${ key }`);
  if (type !== 'none') {
    await clearChild.call(this, key);
  }
}
export async function excuteWithCacheApplication<T>(app: Application, config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: string;
  /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
  clearKey?: string[];
  /** 自动清空缓存的时间，单位分钟 */
  autoClearTime?: number;
}, fn: () => Promise<T>) {
  const cache = await app.redis.get('other').get(`[cache]${ config.key }`);
  if (cache) {
    debugCache(`cache ${ config.key } hit!`);
    return JSON.parse(cache) as T;
  } else {
    debugCache(`cache ${ config.key } miss!`);
    const result = await fn();
    await setCache.call(app, {key: config.key, clearKey: config.clearKey, autoClearTime: config.autoClearTime, result});
    return result;
  }
}

export async function excuteWithCacheContext<T>(ctx: Context, config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: string;
  /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
  clearKey?: string[];
  /** 自动清空缓存的时间，单位分钟 */
  autoClearTime?: number;
  /** 随着当前用户sesion的清空而一起清空 */
  clearWithSession?: boolean;
}, fn: () => Promise<T>) {
  const cache = await ctx.redis.get('other').get(`[cache]${ config.key }`);
  if (cache) {
    debugCache(`cache ${ config.key } hit!`);
    return JSON.parse(cache as string);
  } else {
    debugCache(`cache ${ config.key } miss!`);
    const result = await fn();
    await setCache.call(ctx.app, {
      key: config.key,
      clearKey: config.clearKey,
      autoClearTime: config.autoClearTime,
      result
    }, config.clearWithSession && ctx.me && ctx.me.devid);
    return result;
  }
}

export function ContextMethodCache(config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: ((...args: any[]) => string) | string;
  /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
  clearKey?: ((...args: any[]) => string[]) | string[];
  /** 自动清空缓存的时间，单位分钟 */
  autoClearTime?: number;
  /** 随着当前用户sesion的清空而一起清空 */
  clearWithSession?: boolean;
}) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    if (target instanceof BaseContextClass) {
      const fn = descriptor.value;
      descriptor.value = async function (this: BaseContextClass) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const key = typeof config.key === 'function' ? config.key(...args, this.ctx.me) : config.key;
        const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
        if (cache) {
          debugCache(`cache ${ key } hit!`);
          return JSON.parse(cache);
        } else {
          debugCache(`cache ${ key } miss!`);
          const result = await fn.call(this, ...args);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const clearKey = config.clearKey ? typeof config.clearKey === 'function' ? config.clearKey(...args, this.ctx.me) : config.clearKey : undefined;
          await setCache.call(this.app, {
            key,
            clearKey,
            autoClearTime: config.autoClearTime,
            result
          }, config.clearWithSession && this.ctx.me && this.ctx.me.devid);
          return result;
        }
      };
    } else {
      throw new Error('cache must use on Service,Controller');
    }
  };
}

export async function excuteLockWithApplication<T>(app: Application, config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: ((...args: any[]) => string) | string;
  /** 被锁定线程是否sleep直到解锁为止? 默认true */
  lockWait?: boolean;
  /** 当设置了lockWait=true时，等待多少【毫秒】进行一次锁查询? 默认：100MS */
  lockRetryInterval?: number;
  /** 当设置了lockWait=true时，等待多少【毫秒】即视为超时，放弃本次访问？默认：永不放弃 */
  lockMaxWaitTime?: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 允许的并发数，默认：1 */
  lockMaxActive?: number;
  /** 单个锁多少【毫秒】后自动释放?默认：60*1000MS  */
  lockMaxTime?: number;
}, fn__: () => Promise<T>) {
  const key = `[lock]${ typeof config.key === 'function' ? config.key() : config.key }`;
  let wait_time = 0;

  const getLock = async () => {
    let initLock: any;
    try {
      initLock = await app._lock.acquire([`[lockex]${ key }`], 5000);
      const count = await app.redis.get('other').get(key);
      if (count === null || parseInt(count) < (config.lockMaxActive ?? 1)) {
        await app.redis.get('other').incr(key);
        return true;
      } else {
        return false;
      }
    } catch (er: any) {
      return await getLock();
    } finally {
      if (initLock) {
        try {
          await initLock.release();
          // eslint-disable-next-line no-empty
        } catch (error: any) {
        }
      }
    }
  };
  const fn = async () => {
    const lock = await getLock();
    if (lock === false) {
      if (config.lockWait !== false && ((config.lockMaxWaitTime ?? 0) === 0 || (wait_time + (config.lockRetryInterval ?? 100)) <= (config.lockMaxWaitTime ?? 0))) {
        debugCache(`get lock ${ key } fail, retry after ${ config.lockRetryInterval ?? 100 }ms...`);
        await sleep(config.lockRetryInterval ?? 100);
        wait_time += (config.lockRetryInterval ?? 100);
        return await fn();
      } else {
        debugCache(`get lock ${ key } fail`);
        throw new Error(config.errorMessage || `get lock fail: ${ key }`);
      }
    } else {
      debugCache(`get lock ${ key } ok!`);
      await app.redis.get('other').pexpire(key, config.lockMaxTime ?? 60000);
      try {
        return await fn__();
      } finally {
        debugCache(`unlock ${ key } ok!`);
        await app.redis.get('other').decr(key);
      }
    }
  };
  return await fn();
}

/** 与缓存共用时，需要在缓存之前:有缓存则返回缓存,否则加锁执行并缓存,后续队列全部返回缓存,跳过执行 */
export function ContextMethodLock(config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: ((...args: any[]) => string) | string;
  /** 被锁定线程是否sleep直到解锁为止? 默认true */
  lockWait?: boolean;
  /** 当设置了lockWait=true时，等待多少【毫秒】进行一次锁查询? 默认100ms */
  lockRetryInterval?: number;
  /** 当设置了lockWait=true时，等待多少【毫秒】即视为超时，放弃本次访问？默认永不放弃 */
  lockMaxWaitTime?: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 允许的并发数，默认=1 */
  lockMaxActive?: number;
  /** 单个锁多少【毫秒】后自动释放?即时任务没有执行完毕或者没有主动释放锁?  */
  lockMaxTime?: number;
}) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    if (target instanceof BaseContextClass) {
      const fn__ = descriptor.value;
      descriptor.value = async function (this: BaseContextClass) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        config.key = typeof config.key === 'function' ? config.key(...args, this.ctx.me) : config.key;
        return await excuteLockWithApplication(this.app, config, async () => await fn__.call(this, ...args));
      };
    } else {
      throw new Error('cache must use on Service,Controller');
    }
  };
}
export function http(config?: HttpConfig) {
  return function <T>(target: any, propertyKey: string, _descriptor: TypedPropertyDescriptor<T>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    let methods: {[key: string]: HttpConfig | undefined} = Reflect.getOwnMetadata('methods', target) || [];
    if (!methods) {
      methods = {};
    }
    methods[propertyKey] = config;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Reflect.defineMetadata('methods', methods, target.constructor);
  };
}
export function param(config?: {
  name: string;
  query?: boolean;
  body?: boolean;
  header?: boolean;
  cookie?: boolean;
}) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Reflect.defineMetadata(parameterIndex, config, target.constructor, propertyKey);
  };
}
export function controller(config?: ControllerConfig) {
  return <T extends {new(...args: any[]): any}>(constructor: T) => {
    const methods: {[key: string]: HttpConfig | undefined} = Reflect.getOwnMetadata('methods', constructor) || [];
    for (const [methodName, methodConfig] of Object.entries(methods)) {
      console.log(methodName, methodConfig, config);
    }
    return class extends constructor {
    };
  };
}