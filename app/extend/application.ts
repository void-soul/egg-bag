import Enum from '../enums/Enum';
import {StatusError} from '../util/shell';
import {Application, Context} from 'egg';
import md5Util = require('md5');
import {clearCache, excuteLockWithApplication, excuteWithCacheApplication} from '../util/method-enhance';
import {FlowFetchParam, FlowFetchResult, FlowDoParam, FlowDoResult, SqlSession} from '../../typings';
const debug = require('debug')('egg-bag:ms');
export default {
  /**
 * 立即抛出一个异常
 * @param {string} message
 * @param {number} [status]
 * @returns {never}
 */
  throwNow(message: string, status?: number): never {
    throw new StatusError(message, status);
  },
  /**
 * 若test成立，则抛出一个异常
 * @param {boolean} test
 * @param {string} message
 * @param {number} [status]
 */
  throwIf(test: boolean, message: string, status?: number) {
    if (test === true) {
      throw new StatusError(message, status);
    }
  },
  /**
 * 若test 不成立，则抛出一个异常
 * @param {boolean} test
 * @param {string} message
 * @param {number} [status]
 */
  throwIfNot(test: boolean, message: string, status?: number) {
    if (test !== true) {
      throw new StatusError(message, status);
    }
  },
  /**
 * 立即抛出一个预定义的异常(ErrorCode.xxxx)
 * @param {Enum} error
 * @returns {never}
 */
  throwErrorNow(error: Enum): never {
    throw new StatusError(error.desc(), +error.value());
  },
  /**
 * 若test成立，则抛出一个预定义的异常(ErrorCode.xxxx)
 * @param {boolean} test
 * @param {Enum} error
 */
  throwErrorIf(test: boolean, error: Enum) {
    if (test === true) {
      throw new StatusError(error.desc(), +error.value());
    }
  },
  /**
 * 若test不成立，则抛出一个预定义的异常()
 * @param {boolean} test
 * @param {Enum} error ErrorCode.xxxx
 */
  throwErrorIfNot(test: boolean, error: Enum) {
    if (test !== true) {
      throw new StatusError(error.desc(), +error.value());
    }
  },
  emitTo(this: Application, roomType: string, roomId: string, event: string, {message, uri, params, id}: {
    message?: string;
    uri?: string;
    params?: any;
    id?: string;
  }) {
    this.io.of('/').to(`${ roomType }-${ roomId }`).emit('event', {
      event, message, uri, params, id
    });
  },
  md5(this: Application, value: string, key?: string): string {
    return md5Util(`${ value }${ key ?? this.config.keys ?? '' }`);
  },
  async getCache(this: Application, key: string, redisName?: 'user' | 'other' | 'static'): Promise<string | null> {
    let meString: string | null = null;
    if (key) {
      switch (this._cacheIO) {
        case 'cookie':
          break;
        case 'redis':
          if (redisName) {
            meString = await this.redis.get(redisName).get(key);
          }
          break;
        case 'memory':
          meString = this._cache[key];
          break;
      }
    }
    return meString;
  },
  async setCache(this: Application, key: string, value: string, redisName?: 'user' | 'other' | 'static', minutes?: number): Promise<void> {
    switch (this._cacheIO) {
      case 'cookie':
        break;
      case 'redis':
        if (redisName) {
          if (minutes) {
            await this.redis.get(redisName).set(key, value, 'EX', minutes * 60);
          } else {
            await this.redis.get(redisName).set(key, value);
          }
        }
        break;
      case 'memory':
        this._cache[key] = value;
        this.messenger.sendToApp('update-cache', {key, value});
        break;
    }
  },
  async delCache(this: Application, key: string, redisName?: 'user' | 'other' | 'static', minutes?: number): Promise<void> {
    switch (this._cacheIO) {
      case 'cookie':
        break;
      case 'redis':
        if (redisName) {
          if (minutes) {
            const old = await this.redis.get(redisName).get(key);
            if (old) {
              await this.redis.get(redisName).set(key, old, 'EX', minutes * 60);
            }
          } else {
            await this.redis.get(redisName).del(key);
          }
        }
        break;
      case 'memory':
        delete this._cache[key];
        this.messenger.sendToApp('remove-cache', key);
        break;
    }
  },
  getWxMini(this: Application, appCode?: string) {
    this.throwIf(!appCode && !this.config.defWxMiniAppCode, '缺少appcode');
    if (!appCode) {
      appCode = this.config.defWxMiniAppCode;
    }
    return this._wxMini[appCode!];
  },
  getWxOrgan(this: Application, appCode?: string) {
    this.throwIf(!appCode && !this.config.defWxOrganAppCode, '缺少appcode');
    if (!appCode) {
      appCode = this.config.defWxOrganAppCode;
    }
    return this._wxOrgan[appCode!];
  },
  getWxPay(this: Application, appCode?: string) {
    this.throwIf(!appCode && !this.config.defWxPayAppCode, '缺少appcode');
    if (!appCode) {
      appCode = this.config.defWxPayAppCode;
    }
    return this._wxPay[appCode!];
  },
  async emitASync(this: Application, name: string, ...args: any[]) {
    debug(`async-sub named ${ name } has been called`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.createAnonymousContext().emitASync(name, ...args);
  },
  async emitASyncWithDevid(this: Application, name: string, devid: string, ...args: any[]) {
    debug(`async-sub named ${ name } has been called`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.createAnonymousContext().emitASyncWithDevid(name, devid, ...args);
  },
  emitSyncRandom(this: Application, name: string, ...args: any[]) {
    this.messenger.sendRandom(name, args);
  },
  emitSyncAll(this: Application, name: string, ...args: any[]) {
    this.messenger.sendToApp(name, args);
  },
  /**
   * 订阅异步消息
   * @param name
   * @param fn
   */
  subSync(this: Application, name: string, fn: (this: Context, ...args: any) => void, ...argsOut: any[]) {
    debug(`created a sync-sub named ${ name }`);
    this.messenger.on(name, (...args: any[]) => {
      debug(`sync-sub named ${ name } from subSync has been called`);
      fn.apply(this.createAnonymousContext(), [...args, ...argsOut]);
    });
    this.on(name, (...args: any[]) => {
      debug(`sync-sub named ${ name } from subSync has been called`);
      fn.apply(this.createAnonymousContext(), [...args, ...argsOut]);
    });
  },

  /**
   * 订阅同步消息
   * @param name
   * @param fn
   */
  subASync(this: Application, name: string, fn: (this: Context, ...args: any) => Promise<any>) {
    debug(`created a async-sub named ${ name }`);
    this._asyncSubClient[name] = fn;
  },
  async clearContextMethodCache(this: Application, clearKey: string) {
    await clearCache.call(this, clearKey);
  },
  /** 流程获取 */
  async fetchFlow<Q, S, C, M>(this: Application, param: FlowFetchParam<Q>, devid?: string): Promise<FlowFetchResult<S>> {
    const ctx = this.createAnonymousContext();
    return await ctx.fetchFlow<Q, S, C, M>(param, devid);
  },
  /** 流程处理 */
  async doFlow<Q, S, C, M>(this: Application, param: FlowDoParam<Q>, devid?: string): Promise<FlowDoResult<S>> {
    const ctx = this.createAnonymousContext();
    return await ctx.doFlow<Q, S, C, M>(param, devid);
  },
  async transctionMysql<T>(this: Application, fn: (conn: SqlSession) => Promise<T>): Promise<T> {
    return await this.mysql.beginTransactionScope(
      conn => fn(conn),
      this.createAnonymousContext()
    );
  },
  async excuteWithLock<T>(this: Application, config: {
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
  }, fn: () => Promise<T>): Promise<T> {
    return await excuteLockWithApplication<T>(this, config, fn);
  },
  async excuteWithCache<T>(this: Application, config: {
    /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
    key: string;
    /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
  }, fn: () => Promise<T>) {
    return await excuteWithCacheApplication<T>(this, config, fn);
  }
};
