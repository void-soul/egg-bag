import {BaseContextClass, Application, Context} from 'egg';
const debug = require('debug')('egg-bag:cache');

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
      debug(`cache ${ key } cleared!`);
      await clearChild.call(this, key);
    }
  }
}

export async function setCache(
  this: BaseContextClass,
  config: {
    key: string;
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
    /** 随着当前用户sesion的清空而一起清空 */
    clearWithSession?: boolean;
    result: any;
  }) {
  if (config.result !== null && config.result !== undefined) {
    // 映射关系存放
    if (config.clearKey && config.clearKey.length > 0) {
      for (const clear of config.clearKey) {
        await this.app.redis.get('other').sadd(`[cache-parent]${ clear }`, config.key);
        await this.app.redis.get('other').sadd(`[cache-child]${ config.key }`, clear);
      }
    }
    if (config.autoClearTime) { // 自动清空
      await this.app.redis.get('other').set(`[cache]${ config.key }`, JSON.stringify(config.result), 'EX', config.autoClearTime * 60);
      // 订阅：清空 clear list
      if (config.clearKey && config.clearKey.length > 0) {
        this.app.subSync(`other-[cache]${ config.key }`, async function (this: Context, key: string) {
          await clearChild.call(this.app, key, true);
        }, config.key);
      }
    } else {
      await this.app.redis.get('other').set(`[cache]${ config.key }`, JSON.stringify(config.result));
    }


    if (config.clearWithSession && this.ctx.me) {
      // 订阅：清空 clear list
      this.app.subSync(`user-${ this.ctx.me.devid }`, async function (this: Context, key: string) {
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

export function ContextMethodCache(config: {
  /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
  key: (...args: any[]) => string;
  /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
  clearKey?: (...args: any[]) => string[];
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
        const key = config.key(...args, this.ctx.me);
        const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
        if (cache) {
          debug(`cache ${ key } hit!`);
          return JSON.parse(cache);
        } else {
          debug(`cache ${ key } miss!`);
          const result = await fn.call(this, ...args);
          const clearKey = config.clearKey ? config.clearKey(...args, this.ctx.me) : undefined;
          await setCache.call(this, {
            key,
            clearKey,
            autoClearTime: config.autoClearTime,
            clearWithSession: config.clearWithSession,
            result
          });
          return result;
        }
      };
    } else {
      throw new Error('cache must use on Service,Controller');
    }
  };
}