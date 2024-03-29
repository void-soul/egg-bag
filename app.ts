import {Application} from 'egg';
import {loadSync, loadAsync} from './app/loader/sub-load';
import {loadWXMini, loadWXOrgan, loadWXPay} from './app/loader/wx-load';
import {loadMessage} from './app/loader/ms-load';
import {loadMongo, loadSql, connMongo} from './app/loader/sql-load';
import {loadUser} from './app/loader/user-load';
import {loadGlobal} from './app/loader/global-load';
import {loadView} from './app/loader/view-load';
import {loadCache, flushRedis, redisPsub, loadRedis} from './app/loader/cache-load';
import {loadRouter} from './app/loader/route-load';
import {loadFlow} from './app/loader/flow-load';
const debug = require('debug')('egg-bag');
export default class {
  app: Application;
  constructor (app: Application) {
    this.app = app;
  }
  configWillLoad() {
    debug('start load config!');
    const start = +new Date();

    // 消息订阅注入
    loadSync.call(this.app);
    loadAsync.call(this.app);

    // 内部消息定义
    loadMessage.call(this.app);

    // 微信配置读取
    loadWXMini.call(this.app);
    loadWXOrgan.call(this.app);
    loadWXPay.call(this.app);

    // mongodb初始化
    loadMongo.call(this.app);
    loadSql.call(this.app);

    // 用户设置
    loadUser.call(this.app);

    // 配置读取
    loadGlobal.call(this.app);
    loadView.call(this.app);
    // 流程读取
    loadFlow.call(this.app);

    debug(` over load config, +${ +new Date() - start }ms`);
  }

  didLoad() {
    // 所有的配置已经加载完毕
    // 可以用来加载应用自定义的文件，启动自定义的服务
    loadCache.call(this.app);
  }

  async willReady() {
    await loadRedis.call(this.app);
    // 所有的插件都已启动完毕，但是应用整体还未 ready
    // 可以做一些数据初始化等操作，这些操作成功才会启动应用
    // 清除缓存数据
    await flushRedis.call(this.app);
    // redis 订阅 key 过期
    // 需要配置redis.conf: notify-keyspace-events "Ex" */
    await redisPsub.call(this.app);
    // mongo连接
    await connMongo.call(this.app);
  }

  didReady() {
    // 应用已经启动完毕
    // 路由配置
    loadRouter.call(this.app);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async serverDidReady() {
    // http / https server 已启动，开始接受外部请求
    // 此时可以从 app.server 拿到 server 的实例
    this.app.emit('start');
    this.app.emitASync('start').catch(this.app.logger.error);
  }
}
