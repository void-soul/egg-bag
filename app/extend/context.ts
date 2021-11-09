import {Context} from 'egg';
import {uuid} from '../util/string';
import lodash = require('lodash');
import {BaseUser, FlowDoParam, FlowDoResult, FlowFetchParam, FlowFetchResult, SqlSession} from '../../typings';
import SocketConfig from '../enums/SocketConfig';
import {excuteWithCacheContext} from '../util/method-enhance';
const debug = require('debug')('egg-bag:ms');
const USER = 'Context#user';
export default {
  get me(): BaseUser {
    return this[USER];
  },
  login(this: Context, user: BaseUser, notify = true, dickOut = true) {
    let newUser = false;
    if (!user.devid) {
      if (this.me && this.me.devid) {
        user.devid = this.me.devid;
        user.wx_mini_session_key = this.me.wx_mini_session_key;
        user.client_online = this.me.client_online;
        user.browser = this.me.browser;
        user.device = this.me.device;
        user.os = this.me.os;
        user.socket = this.me.socket;
      } else {
        user.devid = uuid();
        newUser = true;
      }
    }

    // 踢掉其他用户
    if (dickOut && this.app.config.socket) {
      if (this.app.config.socket.onlyOneLogin(user) === true) {
        this.getLoginInfos(user.userid).then(users => {
          if (users) {
            for (const oneUser of users) {
              if (oneUser.devid !== user.devid && (!this.app.config.socket!.dickUser || this.app.config.socket!.dickUser(oneUser, user))) {
                this.dickOut(oneUser, this.request.ip).then(() => { }).catch(() => { });
              }
            }
          }
        }).catch(() => { });
      }
    }
    // cookie方式设置devid，header不需要服务器设置
    if (this.app._devidIO === 'cookie') {
      this.setCookie('devid', user.devid);
    }
    user.client_online = true;
    switch (this.app._cacheIO) {
      case 'cookie':
        this.setCache(user.devid, this.app.stringifyUser(user)).then(() => { }).catch(() => { });
        break;
      case 'redis':
        this.setCache(user.devid, this.app.stringifyUser(user), 'user', this.app.config.session && this.app.config.session.sessionMinutes).then(() => { }).catch(() => { });
        this.app.redis.get('user').sadd(`user-devid-${ user.userid }`, user.devid).then(() => { }).catch(() => { });
        if (newUser) {
          this.app.subSync(`user-${ user.devid }`, async () => {
            await this.app.redis.get('user').srem(`user-devid-${ user.userid }`, user.devid!);
            this.app.emit('logout', user);
          });
        }
        break;
      case 'memory':
        this.setCache(user.devid, this.app.stringifyUser(user)).then(() => { }).catch(() => { });
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
          await this.delCache(this.me.devid);
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
          result.push(await this.getUser(devid));
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
    if (!devid) {
      devid = this.request.query.devid;
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
  async getCache(this: Context, key: string, redisName?: 'user' | 'other' | 'static'): Promise<string | null> {
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
  async setCache(this: Context, key: string, value: string, redisName?: 'user' | 'other' | 'static', minutes?: number): Promise<void> {
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
  async delCache(this: Context, key: string, redisName?: 'user' | 'other' | 'static', minutes?: number): Promise<void> {
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
      this.app.throwIf(!this.me, '缓存的登录信息已失效!');
      return await this.app._asyncSubClient[name].call(this, ...args);
    }
  },
  /** 流程获取 */
  async fetchFlow<Q, S, C, M>(this: Context, param: FlowFetchParam<Q>, devid?: string): Promise<FlowFetchResult<S>> {
    if (devid) {
      await this.loginByDevid(devid);
      this.app.throwIf(!this.me, '缓存的登录信息已失效!');
    } else if (!this.me) {
      this[USER] = this.app.config.defUser;
    }
    return await this.service.paasService.fetchFlow<Q, S, C, M>(param);
  },
  /** 流程处理 */
  async doFlow<Q, S, C, M>(this: Context, param: FlowDoParam<Q>, devid?: string): Promise<FlowDoResult<S>> {
    if (devid) {
      await this.loginByDevid(devid);
      this.app.throwIf(!this.me, '缓存的登录信息已失效!');
    } else if (!this.me && this.app.config.defUser) {
      this[USER] = this.app.config.defUser;
    }
    return await this.service.paasService.doFlow<Q, S, C, M>(param);
  },
  async transctionMysql<T>(this: Context, fn: (conn: SqlSession) => Promise<T>): Promise<T> {
    return await this.app.mysql.beginTransactionScope(
      conn => fn(conn),
      this
    );
  },
  async excuteWithCache<T>(this: Context, config: {
    /** 返回缓存key,参数=方法的参数+当前用户对象，可以用来清空缓存。 */
    key: string;
    /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
    /** 随着当前用户sesion的清空而一起清空 */
    clearWithSession?: boolean | undefined;
  }, fn: () => Promise<T>) {
    return await excuteWithCacheContext<T>(this, config, fn);
  }
};
