import {Context} from 'egg';
import {uuid} from '../util/string';
import lodash = require('lodash');
import {BaseUser} from '../../typings';
import SocketConfig from '../enums/SocketConfig';
const debug = require('debug')('egg-bag');
const USER = 'Context#user';
export default {
  get me(this: Context): BaseUser {
    return this[USER];
  },
  login(this: Context, user: BaseUser, notify = true) {
    let newUser = false;
    if (!user.devid) {
      if (this.me && this.me.devid) {
        user.devid = this.me.devid;
      } else {
        user.devid = uuid();
        newUser = true;
      }
    }

    // 踢掉其他用户
    if (this.app.config.socket) {
      if (this.app.config.socket.onlyOneLogin(user) === true) {
        this.getLoginInfos(user.userid).then(users => {
          if (users) {
            for (const oneUser of users) {
              if (oneUser.devid !== user.devid && (!this.app.config.socket!.dickUser || this.app.config.socket!.dickUser(oneUser, user))) {
                this.dickOut(oneUser, this.request.ip);
              }
            }
          }
        });
      }
    }
    // cookie方式设置devid，header不需要服务器设置
    if (this.app._devidIO === 'cookie') {
      this.setCookie('devid', user.devid);
    }
    user.client_online = true;
    switch (this.app._cacheIO) {
      case 'cookie':
        this.setCache(user.devid, this.app.stringifyUser(user));
        break;
      case 'redis':
        this.setCache(user.devid, this.app.stringifyUser(user), 'user', this.app.config.session && this.app.config.session.sessionMinutes);
        this.app.redis.get('user').sadd(`user-devid-${ user.userid }`, user.devid);
        if (newUser) {
          this.app.subSync(`user-${ user.devid }`, async () => {
            await this.app.redis.get('user').srem(`user-devid-${ user.userid }`, user.devid!);
            this.app.emit('logout', user);
          });
        }
        break;
      case 'memory':
        this.setCache(user.devid, this.app.stringifyUser(user));
        break;
    }
    if (notify === true) {
      this.app.emit('login', user, this.request.ip);
    }
    this[USER] = user;
  },
  async logout(this: Context) {
    if (this.me && this.me.devid && this.me.client_online) {
      this.me.client_online = false;
      // cookie方式设置devid，header不需要服务器设置
      if (this.app._devidIO === 'cookie') {
        this.removeCookie('devid');
      }
      this.app.emit('logout', this.me);
      switch (this.app._cacheIO) {
        case 'cookie':
          this.delCache(this.me.devid);
          break;
        case 'redis':
          await this.delCache(this.me.devid, 'user', this.app.config.session && this.app.config.session.sessionContinueMinutes);
          break;
        case 'memory':
          await this.delCache(this.me.devid);
          break;
      }

    }
  },
  async getDevids(this: Context, userid: string | number): Promise<string[] | null> {
    switch (this.app._cacheIO) {
      case 'redis':
        return await this.app.redis.get('user').smembers(`user-devid-${ userid }`);
    }
    return null;
  },
  async getLoginInfos(this: Context, userid: string | number): Promise<BaseUser[] | null> {
    switch (this.app._cacheIO) {
      case 'redis':
        // eslint-disable-next-line no-case-declarations
        const devids = await this.app.redis.get('user').smembers(`user-devid-${ userid }`);
        // eslint-disable-next-line no-case-declarations
        const result = new Array<BaseUser>();
        for (const devid of devids) {
          result.push(this.getUser(devid));
        }
        return result;
    }
    return null;
  },
  async dickOut(this: Context, user: BaseUser, host?: string) {
    if (user && user.devid && user.client_online) {
      user.client_online = false;
      this.app.emit('logout', user);
      switch (this.app._cacheIO) {
        case 'cookie':
          break;
        case 'redis':
          await this.delCache(user.devid, 'user');
          await this.app.redis.get('user').srem(`user-devid-${ user.userid }`, user.devid);
          this.app.io.of('/').to(`${ SocketConfig.SOCKET_DEV.value() }-${ user.devid }`).emit('dick-out', {
            host: host || '未知'
          });
          break;
        case 'memory':
          await this.delCache(user.devid);
          break;
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
  getDevid(this: Context): string | null {
    let devid = lodash.get(this, 'socket.handshake.query.devid');
    if (!devid) {
      switch (this.app._devidIO) {
        case 'cookie':
          devid = this.getCookie('devid');
          break;
        case 'header':
          devid = this.get('devid');
          break;
      }
    }
    return devid || null;
  },
  async getUser(this: Context, devid: string) {
    const user = await this.getCache(devid, 'user');
    if (user) {
      return JSON.parse(user) as BaseUser;
    }
  },
  async loginByDevid(this: Context, devid: string) {
    const user = await this.getUser(devid);
    this[USER] = user;
  },
  async getCache(this: Context, key: string, redisName?: 'user' | 'other'): Promise<string | null> {
    let meString: string | null = null;
    if (key) {
      if (this.app._cacheIO === 'cookie') {
        meString = this.cookies.get(key, {
          signed: true,
          encrypt: true
        });
      } else {
        meString = await this.app.getCache(key, redisName);
      }
    }
    return meString;
  },
  setCookie(this: Context, key: string, value: string) {
    this.cookies.set(key, value, {
      httpOnly: true,
      encrypt: true,
      maxAge: this.app.config.session && this.app.config.session.sessionMinutes ? this.app.config.session.sessionMinutes * 60 * 1000 : undefined,
      overwrite: true,
      signed: true
    });
  },
  getCookie(this: Context, key: string) {
    return this.getCache(key);
  },
  removeCookie(this: Context, key: string) {
    this.cookies.set(key, undefined);
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
      debug(` async-sub named ${ name } has been called`);
      return await this.app._asyncSubClient[name].call(this, ...args);
    }
  },
  async emitASyncWithDevid(this: Context, name: string, devid: string, ...args: any[]) {
    if (this.app._asyncSubClient[name]) {
      debug(` async-sub named ${ name } has been called`);
      if (devid) {
        await this.loginByDevid(devid);
      }
      return await this.app._asyncSubClient[name].call(this, ...args);
    }
  }
};
