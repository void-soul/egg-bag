import * as fs from 'fs';
import IMe from './app/middleware/IMe';
import {Application} from 'egg';
import {Builder, Nuxt} from 'nuxt';
import {dataConfig, enumToJson} from './app/util/enumUtil';
import {EggInstall, EggShell} from './app/util/shell';
import {IncomingMessage, ServerResponse} from 'http';
import {merge} from 'lodash';
import {MongoClient} from 'mongodb';
import {nuxtDefaultConfig} from './app/util/ci-help';
import {ObjectSchema} from 'fast-json-stringify';
import {querys, routes} from './app/routes/PaasController';
import {SQLLoad} from './app/util/sql';
import {WxMini} from './app/wx/mini';
import {WxOrgan} from './app/wx/organ';
import {WxPay} from './app/wx/pay';
import FastJson = require('fast-json-stringify');
import path = require('path');
export default class {
  app: Application;
  nuxtReady = false;
  srcDir = '';
  constructor (app: Application) {
    this.app = app;
  }
  configWillLoad() {
    // 此时 config 文件已经被读取并合并，但是还并未生效
    // 这是应用层修改配置的最后时机
    // 注意：此函数只支持同步调用
    // #region nuxt检测配置
    if (this.app.config.nuxt) {
      if (process.env.NODE_ENV !== 'production') {
        this.srcDir = path.join(this.app.config.baseDir, 'app', 'nuxt');
        if (!fs.existsSync(this.srcDir)) {
          this.app.coreLogger.error(`[egg-bag] start dev mode error, found config but not found nuxt path ${ this.srcDir }`);
          process.exit(1);
        }
      } else {
        const distPath = path.join(this.app.config.baseDir, '.nuxt', 'dist');
        if (!fs.existsSync(distPath)) {
          this.app.coreLogger.error(`[egg-bag] start prod mode error, found config but not found nuxt path ${ distPath }`);
          process.exit(1);
        }
      }
      this.nuxtReady = true;
      this.app.coreLogger.warn('[egg-bag] config merge over');
      this.app.config.coreMiddleware.unshift('nuxt');
    }
    // #endregion

    // 异步消息订阅注入
    // 异步消息的this永远都是虚拟的context
    const syncSubPath = path.join(this.app.baseDir, 'app', 'sub-sync');
    if (fs.existsSync(syncSubPath)) {
      const subFiles = fs.readdirSync(syncSubPath);
      for (const subFile of subFiles) {
        const sub = require(path.join(syncSubPath, subFile)).default;
        const subName = subFile.replace(/.js|.ts/, '');
        this.app.coreLogger.warn(`[egg-bag] created a sync-sub named ${ subName } from ${ subFile }`);
        this.app.messenger.on(subName, (args: any[]) => {
          this.app.coreLogger.warn(`[egg-bag] sync-sub named ${ subName } from ${ subFile } has been called`);
          sub.call(this.app.createAnonymousContext(), ...args);
        });
        this.app.on(subName, (...args: any[]) => {
          this.app.coreLogger.warn(`[egg-bag] sync-sub named ${ subName } from ${ subFile } has been called`);
          sub.call(this.app.createAnonymousContext(), ...args);
        });
      }
    } else {
      this.app.coreLogger.warn(`[egg-bag] not found sync-sub path ${ syncSubPath }`);
    }
    // 同步消息注入
    // 当从this.ctx发送消息时,this会沿用
    // 当从this.app发送消息时,this指向虚拟context
    this.app._asyncSubClient = {};
    const asyncSubPath = path.join(this.app.baseDir, 'app', 'sub-async');
    if (fs.existsSync(asyncSubPath)) {
      const subFiles = fs.readdirSync(asyncSubPath);
      for (const subFile of subFiles) {
        const subName = subFile.replace(/.js|.ts/, '');
        this.app.coreLogger.warn(`[egg-bag] created a async-sub named ${ subName } from ${ subFile }`);
        this.app._asyncSubClient[subName] = require(path.join(asyncSubPath, subFile)).default;
      }
    } else {
      this.app.coreLogger.warn(`[egg-bag] not found async-sub path ${ asyncSubPath }`);
    }
    // 内部消息定义
    this.app.messenger.on('update-cache', ({key, value}: {key: string; value: any}) => this.app._cache[key] = value);
    this.app.messenger.on('remove-cache', (key: string) => {
      delete this.app._cache[key];
    });
    // 小程序配置读取
    if (this.app.config.wxMini) {
      this.app._wxMini = {};
      for (const appCode of Object.keys(this.app.config.wxMini)) {
        this.app.coreLogger.warn(`[egg-bag] read wx-mini ${ appCode }`);
        this.app._wxMini[appCode] = new WxMini(this.app, appCode);
      }
    } else {
      this.app.coreLogger.warn('[egg-bag] not found wx-mini-config');
    }
    // 企业微信配置读取
    if (this.app.config.wxOrgan) {
      this.app._wxOrgan = {};
      for (const appCode of Object.keys(this.app.config.wxOrgan)) {
        this.app.coreLogger.warn(`[egg-bag] read wx-organ ${ appCode }`);
        this.app._wxOrgan[appCode] = new WxOrgan(this.app, appCode);
      }
    } else {
      this.app.coreLogger.warn('[egg-bag] not found wx-organ-config');
    }
    // 微信支付配置读取
    if (this.app.config.wxPay) {
      this.app._wxPay = {};
      for (const appCode of Object.keys(this.app.config.wxPay)) {
        this.app.coreLogger.warn(`[egg-bag] read wx-pay ${ appCode }`);
        this.app._wxPay[appCode] = new WxPay(this.app, appCode);
      }
    } else {
      this.app.coreLogger.warn('[egg-bag] not found wx-organ-config');
    }
    // mongodb初始化
    if (this.app.config.mongo && this.app.config.mongo.uri) {
      Object.assign(this.app.config.mongo.options, {
        useNewUrlParser: true
      });
      this.app.coreLogger.warn('[egg-bag] mongodb read and config over');
    }
    const sqls = new SQLLoad(this.app.baseDir);
    this.app.getSql = (id: string) => sqls.tryLoadSql(id);
    this.app.getSqlFn = () => sqls.getFns();
    this.app.coreLogger.warn('[egg-bag] sql files read over');
    // #region 用户设置
    const schema: ObjectSchema = {
      title: 'User Scheam',
      type: 'object',
      properties: {
        userid: {type: 'string'},
        devid: {type: 'string'},
        socket: {type: 'string'},
        os: {type: 'string'},
        device: {type: 'string'},
        browser: {type: 'string'},
        wx_mini_session_key: {type: 'string'},
        client_online: {type: 'boolean'},
        ...this.app.config.userScheam
      }
    };
    this.app.stringifyUser = FastJson(schema);
    this.app.coreLogger.warn('[egg-bag] user-schema read over');
    // #endregion

    // 配置读取
    if (this.app.config.globalValues) {
      this.app._globalValues = enumToJson(this.app.config.globalValues);
      this.app.dataConfig = dataConfig;
      this.app.coreLogger.warn('[egg-bag] globalValues read over');
    } else {
      this.app.coreLogger.warn('[egg-bag] globalValues not found');
    }
    if (this.app.config.viewTags) {
      this.app.config.nunjucks.tags = this.app.config.viewTags;
      this.app.coreLogger.warn('[egg-bag] viewTags read over');
    } else {
      this.app.coreLogger.warn('[egg-bag] viewTags not found');
    }
  }

  async didLoad() {
    // 所有的配置已经加载完毕
    // 可以用来加载应用自定义的文件，启动自定义的服务
    this.app._cacheIO = (this.app.config.cacheIO) || 'redis';
    this.app.coreLogger.warn(`[egg-bag] cache has been set to ${ this.app._cacheIO }`);
    this.app._devidIO = (this.app.config.session && this.app.config.session.devidIO) || 'header';
    this.app.coreLogger.warn(`[egg-bag] devid-cache has been set to ${ this.app._devidIO }`);
  }

  async willReady() {
    // 所有的插件都已启动完毕，但是应用整体还未 ready
    // 可以做一些数据初始化等操作，这些操作成功才会启动应用
    // 清除缓存数据
    if (this.app._cacheIO === 'redis') {
      this.app.coreLogger.warn(`[egg-bag] redis-otherdb clean`);
      await this.app.redis.get('other').flushdb();
    }
    // #region mongo连接
    if (this.app.config.mongo && this.app.config.mongo.uri) {
      this.app.mongo = new MongoClient(`mongodb://${ this.app.config.mongo.uri }`, this.app.config.mongo.options);
      this.app.coreLogger.warn('[egg-bag] Connecting MongoDB...');
      try {
        await this.app.mongo.connect();
        this.app.coreLogger.warn(`[egg-bag] Connect success on ${ this.app.config.mongo.uri }.`);
      } catch (error) {
        this.app.coreLogger.warn(`[egg-bag] Connect fail on ${ this.app.config.mongo.uri }.`);
        this.app.coreLogger.error(error);
      }
    }
    // #endregion

    // #region nuxt配置
    if (this.nuxtReady && this.app.config.nuxt) {
      let nuxt;
      if (process.env.NODE_ENV !== 'production') {
        nuxt = new Nuxt(merge({}, nuxtDefaultConfig(this.srcDir, this.app.config.baseDir, true), this.app.config.nuxt));
        const builder = new Builder(nuxt);
        this.app.coreLogger.warn('[egg-bag] build dev mode start');
        builder.build().then(() => {
          this.app.coreLogger.warn('[egg-bag] Build dev mode done');
        }).catch((error) => {
          this.app.coreLogger.error('[egg-bag] Build dev mode error', error);
          process.exit(1);
        });
      } else {
        nuxt = new Nuxt();
      }
      this.app._nuxt = (req: IncomingMessage, res: ServerResponse) => {
        return new Promise((resolve) => nuxt.render(req, res, resolve));
      };
      this.app._nuxtReady = true;
    }
    // #endregion
  }

  async didReady() {
    // 应用已经启动完毕
    // 路由配置
    EggShell(this.app, {
      prefix: '/',
      before: [IMe]
    });
    // 内置路由安装
    for (const route of routes) {
      EggInstall(route, this.app, {
        before: [IMe]
      });
    }
    for (const route of querys) {
      if (this.app.config.queryLogin === false) {
        route.before.length = 0;
      }
      EggInstall(route, this.app, {
        before: [IMe]
      });
    }
  }

  async serverDidReady() {
    // http / https server 已启动，开始接受外部请求
    // 此时可以从 app.server 拿到 server 的实例
  }
}
