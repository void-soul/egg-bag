import {Application} from 'egg';
export function loadCache(this: Application) {
  this._cacheIO = (this.config.cacheIO) || 'redis';
  this.coreLogger.warn(`[egg-bag] cache has been set to ${ this._cacheIO }`);
  this._devidIO = (this.config.session && this.config.session.devidIO) || 'header';
  this.coreLogger.warn(`[egg-bag] devid-cache has been set to ${ this._devidIO }`);
}
export async function flushRedis(this: Application) {
  if (this._cacheIO === 'redis') {
    this.coreLogger.warn(`[egg-bag] redis-otherdb clean`);
    await this.redis.get('other').flushdb();
  }
}