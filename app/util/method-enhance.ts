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
    return JSON.parse(cache);
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
        const key = typeof config.key === 'function' ? config.key(...args, this.ctx.me) : config.key;
        const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
        if (cache) {
          debugCache(`cache ${ key } hit!`);
          return JSON.parse(cache);
        } else {
          debugCache(`cache ${ key } miss!`);
          const result = await fn.call(this, ...args);
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
  key: (() => string) | string;
  /** 被锁定线程是否sleep直到解锁为止? */
  lockWait?: boolean;
  /** 当设置了lockWait=true时，等待多少ms进行一次锁查询? 默认100ms */
  lockRetryInterval?: number;
  /** 当设置了lockWait=true时，等待多少ms即视为超时，放弃本次访问？默认0，即永不放弃 */
  lockMaxWaitTime?: number;
  /** 错误信息 */
  errorMessage?: string;
}, fn: () => Promise<T>) {
  const key = typeof config.key === 'function' ? config.key() : config.key;
  let wait_time = 0;
  const fn_ = async () => {
    try {
      const lock = await app._lock.lock(key, 10 * 60 * 60 * 1000);
      debugCache(`get lock ${ key } ok!`);
      try {
        return await fn();
      } finally {
        debugCache(`unlock ${ key } ok!`);
        await lock.unlock();
      }
    } catch (error) {
      if (config.lockWait !== false && wait_time <= (config.lockMaxWaitTime || 0)) {
        debugCache(`get lock ${ key } fail, wait for ${ config.lockRetryInterval || 100 }`);
        await sleep(config.lockRetryInterval || 100);
        wait_time += (config.lockRetryInterval || 100);
        return await fn_();
      } else {
        debugCache(`get lock ${ key } fail`);
        throw new Error(config.errorMessage || `get lock fail: ${ key }`);
      }
    }
  };
  return await fn_();
}

/** 与缓存共用时，需要在缓存之前 */
export function ContextMethodLock(config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: ((...args: any[]) => string) | string;
  /** 被锁定线程是否sleep直到解锁为止? */
  lockWait?: boolean;
  /** 当设置了lockWait=true时，等待多少ms进行一次锁查询? 默认100ms */
  lockRetryInterval?: number;
  /** 当设置了lockWait=true时，等待多少ms即视为超时，放弃本次访问？默认0，即永不放弃 */
  lockMaxWaitTime?: number;
  /** 错误信息 */
  errorMessage?: string;
}) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    if (target instanceof BaseContextClass) {
      descriptor.value = async function (this: BaseContextClass) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        const key = typeof config.key === 'function' ? config.key(...args, this.ctx.me) : config.key;
        let wait_time = 0;
        const fn = async () => {
          try {
            const lock = await this.app._lock.lock(key, 10 * 60 * 60 * 1000);
            debugCache(`get lock ${ key } ok!`);
            try {
              return await descriptor.value.call(this, ...args);
            } finally {
              debugCache(`unlock ${ key } ok!`);
              await lock.unlock();
            }
          } catch (error) {
            if (config.lockWait !== false && wait_time <= (config.lockMaxWaitTime || 0)) {
              debugCache(`get lock ${ key } fail, wait for ${ config.lockRetryInterval || 100 }`);
              await sleep(config.lockRetryInterval || 100);
              wait_time += (config.lockRetryInterval || 100);
              return await fn();
            } else {
              debugCache(`get lock ${ key } fail`);
              throw new Error(config.errorMessage || `get lock fail: ${ key }`);
            }
          }
        };
        return await fn();
      };
    } else {
      throw new Error('cache must use on Service,Controller');
    }
  };
}
export function http(config?: HttpConfig) {
  return function <T>(target: any, propertyKey: string, _descriptor: TypedPropertyDescriptor<T>) {
    let methods: {[key: string]: HttpConfig | undefined} = Reflect.getOwnMetadata('methods', target) || [];
    if (!methods) {
      methods = {};
    }
    methods[propertyKey] = config;
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