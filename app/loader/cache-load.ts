import {Application} from 'egg';
const debug = require('debug')('egg-bag');
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
