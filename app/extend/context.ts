import {Context} from 'egg';
import {uuid} from '../util/string';
import lodash = require('lodash');
import {BaseUser} from '../../typings';
const USER = 'Context#user';
export default {
  get me(this: Context): BaseUser {
    return this[USER];
  },
  login(this: Context, user: BaseUser, notify = true) {
    if (!user.devid) {
      if (this.me && this.me.devid) {
        user.devid = this.me.devid;
      } else {
        user.devid = uuid();
      }
    }
    if (this.app._devidIO === 'cookie') {
      this.cookies.set('devid', user.devid, {
        httpOnly: true,
        encrypt: true,
        maxAge: this.app.config.session && this.app.config.session.sessionMinutes ? this.app.config.session.sessionMinutes * 60 * 1000 : undefined,
        overwrite: true,
        signed: true
      });
    }
    user.client_online = true;
    this.setCache(user.devid, this.app.stringifyUser(user), 'user', this.app.config.session && this.app.config.session.sessionMinutes);
    if (notify === true) {
      this.app.emit('login', user, this.request.ip);
    }
    this[USER] = user;
  },
  async logout(this: Context) {
    if (this.me) {
      if (this.app._devidIO === 'cookie') {
        this.cookies.set('devid', undefined);
      }
      if (this.me.devid && this.me.client_online) {
        this.app.emit('logout', this.me);
        this.me.client_online = false;
        await this.setCache(this.me.devid, this.app.stringifyUser(this.me), 'user');
        await this.delCache(this.me.devid, 'user', this.app.config.session && this.app.config.session.sessionContinueMinutes);
      }
    }
  },
  nuxt(this: Context) {
    return new Promise((resolve) => {
      if (this.app._nuxt) {
        this.app._nuxt(this.req, this.res, resolve);
      }
    });
  },
  getDevid(this: Context) {
    let devid = lodash.get(this, 'socket.handshake.query.devid');
    if (!devid) {
      switch (this.app._devidIO) {
        case 'cookie':
          devid = this.cookies.get('devid', {
            signed: true,
            encrypt: true
          });
          break;
        case 'header':
          devid = this.get('devid');
          break;
      }
    }
    return devid;
  },
  async getUser(this: Context, devid: string | undefined | null) {
    const user = await this.getCache(devid, 'user');
    if (user) {
      return JSON.parse(user) as BaseUser;
    }
  },
  async getCache(this: Context, key: string | undefined | null, redisName?: 'user' | 'other'): Promise<string | null | undefined> {
    if (key) {
      let meString: string | null | undefined = '';
      if (this.app._cacheIO === 'cookie') {
        meString = this.cookies.get(key, {
          signed: true,
          encrypt: true
        });
      } else {
        meString = await this.app.getCache(key, redisName);
      }
      return meString;
    }
  },
  async setCache(this: Context, key: string, value: string, redisName?: 'user' | 'other', minutes?: number): Promise<void> {
    if (this.app._cacheIO === 'cookie') {
      this.cookies.set(key, value, {
        httpOnly: true,
        encrypt: true,
        maxAge: minutes ? minutes * 60 * 1000 : undefined,
        overwrite: true,
        signed: true
      });
    } else {
      await this.app.setCache(key, value, redisName, minutes);
    }
  },
  async delCache(this: Context, key: string, redisName?: 'user' | 'other', minutes?: number): Promise<void> {
    if (this.app._cacheIO === 'cookie') {
      this.cookies.set(key, undefined);
    } else {
      await this.app.delCache(key, redisName, minutes);
    }
  },
  async emitASync(this: Context, name: string, ...args: any[]) {
    if (this.app._asyncSubClient[name]) {
      this.coreLogger.info(`[egg-bag] async-sub named ${ name } has been called`);
      return await this._asyncSubClient[name].call(this, ...args);
    }
  }
};
