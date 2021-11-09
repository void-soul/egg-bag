import {Application} from 'egg';
const debug = require('debug')('egg-bag:loader');
import Redis = require('ioredis');
import Redlock = require('redlock');

export async function loadRedis(this: Application) {
  return new Promise((resolve, reject) => {
    if (this.config.redis && this.config.redis.clients) {
      const redisLib: {[key: string]: Redis.Redis} = {};
      const count = Object.keys(this.config.redis.clients).length;
      let ready = 0;
      for (const [name, config] of Object.entries(this.config.redis.clients)) {
        redisLib[name] = new Redis(config);
        if (name === 'other') {
          this._lock = new Redlock([redisLib[name]]);
        }
        redisLib[name].on('connect', () => {
          this.coreLogger.info(`[egg-bag] redis client ${ name } connect success`);
          ready++;
          if (ready === count) {
            resolve(count);
          }
        });
        redisLib[name].on('error', err => {
          ready++;
          this.coreLogger.error(`[egg-bag] client ${ name } error: ${ err }`);
          this.coreLogger.error(err);
          if (ready === count) {
            reject(count);
          }
        });
      }
      this.redis = {
        get: (name: string) => redisLib[name]
      };
    }
  });
}

export function loadCache(this: Application) {
  this._cacheIO = (this.config.cacheIO) || 'redis';
  debug(`cache has been set to ${ this._cacheIO }`);
  this._devidIO = (this.config.session && this.config.session.devidIO) || 'header';
  debug(`devid-cache has been set to ${ this._devidIO }`);
}
export async function flushRedis(this: Application) {
  if (this._cacheIO === 'redis') {
    debug(`redis-otherdb clean`);
    await this.redis.get('other').flushdb();
  }
}
export async function redisPsub(this: Application) {
  if (this._cacheIO === 'redis') {
    const sub = this.redis.get('sub');
    if (sub) {
      const rooms = {
        [`${ (this.config.redis.clients as any).user.db }`]: 'user',
        [`${ (this.config.redis.clients as any).other.db }`]: 'other'
      };
      await sub.subscribe(`__keyevent@${ (this.config.redis.clients as any).user.db }__:expired`, `__keyevent@${ (this.config.redis.clients as any).other.db }__:expired`);
      sub.on('message', (message: string, key: string) => {
        const dbs = /__keyevent@([0-9]+)__:expired/.exec(message);
        if (dbs?.length === 2 && rooms[dbs[1]]) {
          this.emit(`${ rooms[dbs[1]] }-${ key }`);
        }
      });
    }
  }
}
