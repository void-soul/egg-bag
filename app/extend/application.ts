import Enum from '../enums/Enum';
import {StatusError} from '../util/shell';
import {Application} from 'egg';
import md5Util = require('md5');
const debug = require('debug')('egg-bag');
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
    return md5Util(value + (key || this.config.keys || ''));
  },
  async getCache(this: Application, key: string, redisName?: 'user' | 'other'): Promise<string | null> {
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
  async setCache(this: Application, key: string, value: string, redisName?: 'user' | 'other', minutes?: number): Promise<void> {
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
  async delCache(this: Application, key: string, redisName?: 'user' | 'other', minutes?: number): Promise<void> {
    switch (this._cacheIO) {
      case 'cookie':
        break;
      case 'redis':
        if (redisName) {
          if (minutes) {
            const old = await this.redis.get(redisName).get(key);
            if (old) {
              this.redis.get(redisName).set(key, old, 'EX', minutes * 60);
            }
          } else {
            this.redis.get(redisName).del(key);
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
    return await this.createAnonymousContext().emitASync(name, ...args);
  },
  async doFlow(
    this: Application,
    param: {
      flowPath: string;
      flowParam: {
        remark: string;
      };
      bizParam: any;
      dataFlow?: any;
      conn?: any;
    }
  ): Promise<any> {
    const context = this.createAnonymousContext();
    return await context.doFlow(param);
  },
  emitSyncRandom(this: Application, name: string, ...args: any[]) {
    this.messenger.sendRandom(name, args);
  },
  emitSyncAll(this: Application, name: string, ...args: any[]) {
    this.messenger.sendToApp(name, args);
  },
  async clearContextMethodCache(this: Application, clearKey: string) {
    const keys = await this.redis.get('other').smembers(clearKey);
    if (keys) {
      for (const key of keys) {
        debug(`cache ${ key } cleared!`);
        await this.redis.get('other').del(key);
      }
    }
    debug(`cache ${ clearKey } cleared!`);
    await this.redis.get('other').del(clearKey);
  }
};
