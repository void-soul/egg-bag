import {Application, Service, Subscription, Context, BaseContextClass, IService} from 'egg';
import {MongoClient, MongoClientOptions, FilterQuery, ClientSession, SessionOptions} from 'mongodb';
// tslint:disable-next-line:no-implicit-dependencies
import {Redis} from 'ioredis';
import {Schema} from 'fast-json-stringify';
// tslint:disable-next-line:no-implicit-dependencies
import {Socket} from 'socket.io';
export * from 'egg';
import {IncomingMessage, ServerResponse} from 'http';
// tslint:disable-next-line:no-implicit-dependencies
import {NuxtConfiguration} from '@nuxt/config';
// tslint:disable-next-line:no-implicit-dependencies
import {Transition} from '@nuxt/vue-app';
// tslint:disable-next-line:no-implicit-dependencies
import {Socket, Server as SocketServer, Namespace as SocketNameSpace} from 'socket.io';
/** 链式计算 */
declare class Bus {
  constructor (result);
  /** 加 */
  add(...args: any[]): this;
  /** 减 */
  sub(...args: any[]): this;
  /** 除 */
  div(...args: any[]): this;
  /** 乘 */
  mul(...args: any[]): this;
  /** 最大 */
  max(...args: any[]): this;
  /** 最小 */
  min(...args: any[]): this;
  /** 取反 */
  ac(): this;
  /** 绝对值 */
  abs(): this;
  /** 四舍五入 */
  round(numDigits: number, upOrDown?: number): this;
  /** 计算结束，返回结果 */
  over(): number;
  /** 计算结果，返回金钱格式化 */
  money(style?: MoneyStyle, currency?: string, prefix?: number, def?: number): string;
}
/** 仿java lambda 查询 */
declare class LambdaQuery<T> {
  constructor (table: string, search: (sql: string, param: Empty) => Promise<T[]>, findCount: (sql: string, param: Empty) => Promise<number>, excute: (sql: string, param: Empty) => Promise<number>);
  /** and 另一个query对象的条件 */
  and(lambda: LambdaQuery<T>): this;
  /** or 另一个query对象的条件 */
  or(lambda: LambdaQuery<T>): this;
  andEq(key: keyof T, value: T[keyof T]): this;
  andNotEq(key: keyof T, value: T[keyof T]): this;
  andGreat(key: keyof T, value: T[keyof T]): this;
  andGreatEq(key: keyof T, value: T[keyof T]): this;
  andLess(key: keyof T, value: T[keyof T]): this;
  andLessEq(key: keyof T, value: T[keyof T]): this;
  andLike(key: keyof T, value: T[keyof T]): this;
  andNotLike(key: keyof T, value: T[keyof T]): this;
  andLeftLike(key: keyof T, value: T[keyof T]): this;
  andNotLeftLike(key: keyof T, value: T[keyof T]): this;
  andRightLike(key: keyof T, value: T[keyof T]): this;
  andNotRightLike(key: keyof T, value: T[keyof T]): this;
  andIsNull(key: keyof T): this;
  andIsNotNull(key: keyof T): this;
  andIn(key: keyof T, value: Array<string | boolean | number>): this;
  andNotIn(key: keyof T, value: Array<string | boolean | number>): this;
  andBetween(key: keyof T, value1: T[keyof T], value2: T[keyof T]): this;
  andNotBetween(key: keyof T, value1: T[keyof T], value2: T[keyof T]): this;
  groupBy(key: keyof T): this;
  /** 指定要更新哪列 */
  updateColumn(key: keyof T, value: T[keyof T]): this;
  asc(...keys: Array<keyof T>): this;
  desc(...keys: Array<keyof T>): this;
  limit(startRow: number, pageSize: number): this;
  /** 获取此query的条件字符串 */
  where(): string;
  /** 查询所有列或者某些列，结果是多条记录 */
  select(...columns: Array<keyof T>): Promise<T[]>;
  /** 查询所有列或者某些列，结果只有一条记录 */
  one(...columns: Array<keyof T>): Promise<T | undefined>;
  /** 查询当前条件下记录数 */
  count(): Promise<number>;
  /** 更新指定条件为data，或者updateColumn指定的data */
  update(data?: T): Promise<number>;
  /** 按当前条件进行删除 */
  delete(): Promise<number>;
}
type JSType = 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey';
declare class LambdaQueryMongo<T> {
  /** https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  $eq(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  $$eq(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  $ne(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  $$ne(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  $gt(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  $$gt(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  $gte(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  $$gte(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  $in(key: keyof T, value: Array<T[keyof T] | RegExp>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  $$in(key: keyof T, value: Array<T[keyof T] | RegExp>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  $nin(key: keyof T, value: Array<T[keyof T] | RegExp>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  $$nin(key: keyof T, value: Array<T[keyof T] | RegExp>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  $lt(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  $$lt(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  $lte(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  $$lte(key: keyof T, value: T[keyof T]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/and/ */
  $and(lambda: LambdaQueryMongo<T>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/nor/ */
  $nor(lambda: LambdaQueryMongo<T>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/or/ */
  $or(lambda: LambdaQueryMongo<T>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/elemMatch/ */
  $elemMatch(lambda: LambdaQueryMongo<T>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  $exists(key: keyof T): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  $$exists(key: keyof T): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/type/ */
  $type(key: keyof T, value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/type/ */
  $$type(key: keyof T, value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  $expr(value: {
    [name: string]: any;
  }): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  $$expr(value: {
    [name: string]: any;
  }): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  $mod(key: keyof T, value: number[]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  $$mod(key: keyof T, value: number[]): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/regex/ */
  $regex(key: keyof T, value: RegExp, options?: Set<'i' | 'm' | 'g' | 'x'>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/regex/ */
  $$regex(key: keyof T, value: RegExp, options?: Set<'i' | 'm' | 'g' | 'x'>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/text/ */
  $text(options: {
    search: string;
    language?: string;
    caseSensitive?: boolean;
    diacriticSensitive?: boolean;
  }): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/where/ */
  $where(fn: (this: T) => boolean): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  $all(key: keyof T, value: Array<T[keyof T]>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  $$all(key: keyof T, value: Array<T[keyof T]>): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/size/ */
  $size(key: keyof T, value: number): this;
  /** https://docs.mongodb.com/manual/reference/operator/query/size/*/
  $$size(key: keyof T, value: number): this;
  asc(...keys: Array<keyof T>): this;
  desc(...keys: Array<keyof T>): this;
  limit(startRow: number, pageSize: number): this;
  /**
   * 中断查询方法
   * @param {...string[]} columns
   * @returns {Promise<T[]>}
   * @memberof LambdaQueryMongo
   */
  select(...columns: Array<keyof T>): Promise<T[]>;
  /**
   *
   * 中断查询方法
   * @param {...string[]} columns
   * @returns {(Promise<T | undefined>)}
   * @memberof LambdaQueryMongo
   */
  one(...columns: Array<keyof T>): Promise<T | undefined>;
  /**
   *
   * 中断查询方法
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  count(): Promise<number>;
  /**
   * 中断更新方法
   * @param {T} data
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  update(data: T): Promise<number>;
  /**
   *
   * 中断删除方法
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  delete(): Promise<number>;
}
declare class PageQuery<T> {
  list: T[];
  totalPage: number;
  totalRow: number;
  constructor (search: (param: Empty, pageSize: number, pageNumber: number, limitSelf: boolean, query: PageQuery<T>, orderBy?: string, orderMongo?: {[P in keyof T]: 1 | -1}) => any);
  param(key: string, value: any): this;
  params(param: Empty): this;
  orderBy(orderby: string): this;
  orderByMongo(name: keyof T, type: 1 | -1): this;
  pageNumber(page: number): this;
  pageSize(size: number): this;
  limitSelf(limitSelf: boolean | string): this;
  select(): Promise<this>;
}
export interface EnmuJson {
  GlobalArray: {
    [key: string]: string[];
  };
  GlobalMap: {
    [key: string]: {
      [key: string]: string;
    };
  };
}
export interface Point {
  latitude: string;
  longitude: string;
  lat: number;
  long: number;
}
export interface WxMiniConfig {
  appId: string;
  appSecret: string;
  /** 小程序二维码设置 */
  qrcode?: {
    /** 线条颜色 */
    lineColor?: {r: number; g: number; b: number};
    /** 宽度 */
    width?: number;
  };
  /**
   *
   * 微信订阅消息场景
   * 当传递此参数后,会自动创建路由
   *
   * keys 表示场景,在前端申请订阅场景权限时使用,同一个key将一次性申请订阅权限
   *      每一个模板可以在不同的场景中被申请
   * model=页面所在分包名
   * page=页面名称
   * name=模板消息标识符,调用this.app.wxSendMs时使用,同一个name将同时发出
   * tmplId=模板id
   *
   * /wx-mini-ms-id.json 得到所有模板消息id数组
   * 返回 {key: [模板id数组]}
   */
  messages?: Array<{
    keys: string[];
    name: string;
    tmplId: string;
    model: string;
    page: string;
  }>;
}
export interface WxMini {
  /**
   *
   * 路径传递： model+page 或者 fullpath
   * @param {{scene: string, model?: string, page?: string, fullpath?: string, png?: boolean, width?: number, lineColor?: {r: number; g: number; b: number}}} param
   * @returns {Promise<Buffer>}
   * @memberof WxMini
   */
  getUnlimited(param: {scene: string; model?: string; page?: string; fullpath?: string; png?: boolean; width?: number; lineColor?: {r: number; g: number; b: number}}): Promise<Buffer>;
  /** https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html */
  sendMs(param: {openids: string[]; name: string; data: {[key: string]: string | number}; scene: string}): Promise<void>;
  /** https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html */
  code2session(code: string): Promise<{openid: string; session_key: string; unionid?: string}>;
  /** 获取提前配置好的订阅消息id */
  getTemplIds(): {[key: string]: string[]};
  /** https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html#%E5%8A%A0%E5%AF%86%E6%95%B0%E6%8D%AE%E8%A7%A3%E5%AF%86%E7%AE%97%E6%B3%95 */
  decrypt<T>({sessionKey, encryptedData, iv}: {iv: string; sessionKey: string; encryptedData: string}): T | undefined;
  /** https://developers.weixin.qq.com/miniprogram/dev/framework/liveplayer/live-player-plugin.html */
  getLiveInfo(start: number, limit: number): Promise<WxLiveInfo[]>;
  /** https://developers.weixin.qq.com/miniprogram/dev/framework/liveplayer/live-player-plugin.html */
  getLiveReplay(room_id: number, start: number, limit: number): Promise<WxLiveReplay[]>;
}
export interface WxOrganConfig {
  /**
   *
   * 应用自定义编码
   * 用于消息回调的url拼接
   * @type {string}
   * @memberof WxOrganConfig
   */
  appCode?: string;
  /**
   *
   * 企业编号 或者 suiteid
   * @type {string}
   * @memberof WxOrganConfig
   */
  corpid: string;
  /**
   *
   * 应用密钥
   * @type {string}
   * @memberof WxOrganConfig
   */
  corpsecret: string;
  /**
   *
   * 当应用是小程序应用,并需要发送小程序消息时,需要指定appid
   * @type {string}
   * @memberof WxOrganConfig
   */
  appid?: string;
  /**
   *
   * 当应用是自建应用,且需要发送应用消息时,需要指定应用id
   * @type {string}
   * @memberof WxOrganConfig
   */
  agentid?: number;
  /**
   *
   * 是否开启消息回调?
   * 当开启时，必须指定token\encodingAesKey
   * 访问地址: /wx-organ/appCode.json
   * @type {boolean}
   * @memberof WxOrganConfig
   */
  msHook?: boolean;
  /**
   *
   * 消息回调解密token
   * @type {string}
   * @memberof WxOrganConfig
   */
  token?: string;
  /**
   *
   * 消息回调解密 key
   * @type {string}
   * @memberof WxOrganConfig
   */
  encodingAESKey?: string;
  /**
   *
   * 小程序消息模板
   * 发送时只要指定name即可
   * 一个name可以有多个消息
   * @memberof WxOrganConfig
   */
  miniMessages?: Array<{
    name: string;
    model: string;
    page: string;
  }>;
  /**
   *
   * 非小程序消息模板
   * 发送时只要指定name即可
   * 一个name可以有多个消息
   * https://work.weixin.qq.com/api/doc#90000/90135/90236
   * @memberof WxOrganConfig
   */
  messages?: Array<{
    name: string;
    msgtype: 'text' | 'image' | 'voice' | 'video' | 'file' | 'textcard' | 'news' | 'mpnews' | 'markdown' | 'taskcard';
    safe?: 0 | 1;
  }>;

  /**
   *
   * 接口模拟调用?
   * 默认false
   * @type {boolean}
   * @memberof WxOrganConfig
   */
  mock?: boolean;
}
export interface WxOrganMini {
  title: string;
  description?: string;
  content_item?: {[key: string]: string};
  emphasis_first_item?: boolean;
}
export interface WxOrganText {
  content: string;
}
export interface WxOrganImage {
  media_id: string;
}
export interface WxOrganVoice {
  media_id: string;
}
export interface WxOrganVideo {
  media_id: string;
  title?: string;
  description?: string;
}
export interface WxOrganFile {
  media_id: string;
}
export interface WxOrganTextCard {
  url: string;
  title: string;
  description: string;
  btntxt?: string;
}
export interface WxOrganNews {
  articles: Array<{
    title: string;
    description?: string;
    url: string;
    picurl?: string;
  }>;
}
export interface WxOrganMpNews {
  articles: Array<{
    title: string;
    thumb_media_id: string;
    author?: string;
    content_source_url?: string;
    content: string;
    digest?: string;
  }>;
}
export interface WxOrganMarkDown {
  content: string;
}
export interface WxOrganTaskCard {
  title: string;
  description: string;
  url?: string;
  task_id: string;
  btn: Array<{
    key: string;
    name: string;
    replace_name?: string;
    color?: 'red' | 'blue';
    is_bold?: boolean;
  }>;
}
export interface WxLiveInfo {
  name: string;
  roomid: number;
  cover_img: string;
  live_satus: number;
  start_time: number;
  end_time: number;
  anchor_name: string;
  anchor_img: string;
  goods: Array<{
    cover_img: string;
    url: string;
    price: number;
    name: string;
  }>;
}

export interface WxLiveReplay {
  expire_time: string;
  create_time: string;
  media_url: string;
}
export interface WxOrgan {
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90205
   * @param {WxDepartment} param
   * @returns {Promise<number>}
   * @memberof WxOrgan
   */
  createDepartment(param: WxDepartment): Promise<number>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90206
   * @param {WxDepartment} param
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  updateDepartment(param: WxDepartment): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90207
   * @param {number} id
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  deleteDepartment(id: number): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90208
   * @param {number} [id]
   * @returns {Promise<WxDepartment[]>}
   * @memberof WxOrgan
   */
  getDepartmentList(id?: number): Promise<WxDepartment[]>;

  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90195
   * @param {WxOrganUser} param
   * @returns {Promise<number>}
   * @memberof WxOrgan
   */
  createUser(param: WxOrganUser): Promise<number | string>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90197
   * @param {WxOrganUser} param
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  updateUser(param: WxOrganUser): Promise<void>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90198
   * @param {(number | string)} userid
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  deleteUser(userid: number | string): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90199
   * @param {(Array<number | string>)} useridlist
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  batchDeleteUser(useridlist: Array<number | string>): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90196
   * @param {(number | string)} userid
   * @returns {Promise<WxOrganUser>}
   * @memberof WxOrgan
   */
  getUser(userid: number | string): Promise<WxOrganUserRead>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90200
   * @param {number} department_id
   * @param {boolean} fetch_child
   * @returns {Promise<WxOrganUserSimply[]>}
   * @memberof WxOrgan
   */
  getDeptUserSimply(department_id: number, fetch_child: boolean): Promise<WxOrganUserSimply[]>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90201
   * @param {number} department_id
   * @param {boolean} fetch_child
   * @returns {Promise<WxOrganUser[]>}
   * @memberof WxOrgan
   */
  getDeptUser(department_id: number, fetch_child: boolean): Promise<WxOrganUserRead[]>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90975
   * @param {({user?: Array<number | string>, party?: number[], tag?: number[]})} {user, party, tag}
   * @returns {(Promise<{invaliduser?: Array<number | string>, invalidparty?: number[], invalidtag?: number[]}>)}
   * @memberof WxOrgan
   */
  inviteUsers({user, party, tag}: {user?: Array<number | string>; party?: number[]; tag?: number[]}): Promise<{invaliduser?: Array<number | string>; invalidparty?: number[]; invalidtag?: number[]}>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90202
   * @param {(number | string)} userid
   * @returns {Promise<string>}
   * @memberof WxOrgan
   */
  userid2openid(userid: number | string): Promise<string>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90202
   * @param {string} openid
   * @returns {(Promise<number | string>)}
   * @memberof WxOrgan
   */
  openid2userid(openid: string): Promise<number | string>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90203
   * @param {string} userid
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  authsucc(userid: string): Promise<void>;

  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90205
   * @param {string} tagname
   * @param {number} tagid
   * @returns {Promise<number>}
   * @memberof WxOrgan
   */
  createTag(tagname: string, tagid: number): Promise<number>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90211
   *
   * @param {string} tagname
   * @param {number} tagid
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  updateTag(tagname: string, tagid: number): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90212
   *
   * @param {number} tagid
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  deleteTag(tagid: number): Promise<void>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90214
   * @param {number} tagid
   * @param {(Array<string | number>)} userlist
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  createTagUser(tagid: number, userlist: Array<string | number>): Promise<void>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90215
   *
   * @param {number} tagid
   * @param {(Array<string | number>)} userlist
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  deleteTagUser(tagid: number, userlist: Array<string | number>): Promise<void>;
  /**
   *https://work.weixin.qq.com/api/doc#90000/90135/90213
   *
   * @param {number} tagid
   * @returns {(Promise<{tagname: string; userlist: Array<{userid: string | number; name: string}>; partylist: number[]}>)}
   * @memberof WxOrgan
   */
  getTagUser(tagid: number): Promise<{tagname: string; userlist: Array<{userid: string | number; name: string}>; partylist: number[]}>;
  /**
   * https://work.weixin.qq.com/api/doc#90000/90135/90216
   *
   * @returns {Promise<Array<{tagid: number; tagname: string}>>}
   * @memberof WxOrgan
   */
  getTag(): Promise<Array<{tagid: number; tagname: string}>>;
  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/91579
   * @param {(Array<string | number>)} userids
   * @param {string} task_id
   * @param {string} clicked_key
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  updateTaskCard(userids: Array<string | number>, task_id: string, clicked_key: string): Promise<void>;

  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90236/%E5%B0%8F%E7%A8%8B%E5%BA%8F%E9%80%9A%E7%9F%A5%E6%B6%88%E6%81%AF
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  sendMiniMs(param: {
    touser?: Array<number | string>;
    toparty?: number[];
    totag?: number[];
    name: string;
    scene?: string;
    ms: WxOrganMini;
  }): Promise<void>;

  /**
   *
   * https://work.weixin.qq.com/api/doc#90000/90135/90236
   * @returns {Promise<void>}
   * @memberof WxOrgan
   */
  sendMs(param: {
    touser?: Array<number | string>;
    toparty?: number[];
    totag?: number[];
    name: string;
    ms: WxOrganText | WxOrganImage | WxOrganVoice | WxOrganVideo | WxOrganFile | WxOrganTextCard | WxOrganNews | WxOrganMpNews | WxOrganMarkDown | WxOrganTaskCard;
  }): Promise<void>;
}
export interface WxConfig {
  corpid: string;
  appSecret: string;
}
export type WxPayType = 'JSAPI' | 'NATIVE' | 'APP' | 'MWEB';
export interface WxPayOption {
  /** 小程序id、公众号id、企业微信id */
  appid: string;
  /** 商户号 */
  mch_id: string;
  /** 商户平台密钥 */
  appSecret: string;
  /** 证书名称(文件名+后缀)，需要放在 app/cert 目录中  */
  cert: string;
  /** 支付方式：微信内网页环境使用JSAPI,微信外网页环境使用MWEB;用户扫码使用NATIVE  */
  trade_type: WxPayType;
}
export interface WxCreatedorder {
  device_info?: string;
  body: string;
  detail?: string;
  out_trade_no: string;
  total_fee: number;
  spbill_create_ip: string;
  time_start?: string;
  time_expire?: string;
  goods_tag?: string;
  product_id?: string;
  limit_pay?: string;
  openid: string;
  receipt?: string;
  scene_info?: {
    store_info: {
      id: string;
      name: string;
      area_code: string;
      address: string;
    };
  };
}

export interface WxCreateOrderJSAPI {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}
export interface WxCreateOrderAPP {
  appid: string;
  partnerid: string;
  prepayid: string;
  package: string;
  noncestr: string;
  timestamp: string;
  sign: string;
}
/** 微信支付预创建订单返回结果 */
export interface WxCreateOrderResult {
  /** jsapi支付方式 */
  jsapi?: WxCreateOrderJSAPI;
  /** app支付方式 */
  app?: WxCreateOrderAPP;
  prepay_id: string;
  code_url?: string;
  mweb_url?: string;
}
export interface WxOrderQuery {
  transaction_id?: string;
  out_trade_no?: string;
}
export interface WxOrder {
  device_info?: string;
  openid: string;
  is_subscribe: 'Y' | 'N';
  trade_type: WxPayType;
  trade_state: 'SUCCESS' | 'REFUND' | 'NOTPAY' | 'CLOSED' | 'REVOKED' | 'USERPAYING' | 'PAYERROR';
  bank_type: string;
  total_fee: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee: number;
  cash_fee_type?: string;
  coupon_fee?: number;
  coupon_count?: number;
  transaction_id: string;
  out_trade_no: string;
  attach?: string;
  time_end: string;
  trade_state_desc: string;
  children?: Array<{
    coupon_type: string;
    coupon_id: string;
    coupon_fee: number;
  }>;
}
export interface WxCreateRefundOrder {
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no: string;
  total_fee: number;
  refund_fee: number;
  refund_desc: string;
  refund_account?: 'REFUND_SOURCE_UNSETTLED_FUNDS' | 'REFUND_SOURCE_RECHARGE_FUNDS';
}
export interface WxRefundOrderQuery {
  transaction_id?: string;
  out_trade_no?: string;
  out_refund_no?: string;
  refund_id?: string;
  offset?: number;
}
export interface WxRefundOrder {
  total_refund_count?: number;
  transaction_id: string;
  out_trade_no: string;
  total_fee: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee: number;
  refund_count: number;
  children?: Array<{
    out_refund_no: string;
    refund_id: string;
    refund_channel?: 'ORIGINAL' | 'BALANCE' | 'OTHER_BALANCE' | 'OTHER_BANKCARD';
    refund_fee: number;
    settlement_refund_fee?: number;
    coupon_refund_fee?: number;
    coupon_refund_count?: number;
    refund_status: 'SUCCESS' | 'REFUNDCLOSE' | 'PROCESSING' | 'CHANGE';
    refund_account?: 'REFUND_SOURCE_RECHARGE_FUNDS' | 'REFUND_SOURCE_UNSETTLED_FUNDS';
    refund_recv_accout: string;
    refund_success_time?: string;
    children?: Array<{
      coupon_type: string;
      coupon_refund_id: string;
      coupon_refund_fee: number;
    }>;
  }>;
}
export interface WxPayHook {
  device_info?: string;
  openid: string;
  is_subscribe: 'Y' | 'N';
  bank_type: string;
  total_fee: number;
  settlement_total_fee?: number;
  fee_type?: string;
  cash_fee: number;
  cash_fee_type?: string;
  coupon_fee?: string;
  coupon_count?: number;
  children?: Array<{
    coupon_type: string;
    coupon_id: string;
    coupon_fee: number;
  }>;
  transaction_id: string;
  out_trade_no: string;
  attach?: string;
  time_end: string;
}
export interface WxRefHook {
  transaction_id: string;
  out_trade_no: string;
  refund_id: string;
  out_refund_no: string;
  total_fee: number;
  settlement_total_fee?: number;
  refund_fee: number;
  settlement_refund_fee: string;
  refund_status: 'SUCCESS' | 'CHANGE' | 'REFUNDCLOSE';
  success_time?: string;
  refund_recv_accout: string;
  refund_account: 'REFUND_SOURCE_RECHARGE_FUNDS' | 'REFUND_SOURCE_UNSETTLED_FUNDS';
  refund_request_source: 'API' | 'VENDOR_PLATFORM';
}
export interface WxPay {
  /**
   * 统一下单接口参数定义
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_1
   * 其中未定义到此处的参数，说明框架会给出默认值
   * attach 与另一个参数dataCache配合使用，调用创建订单接口时
   * 会将dataCache存放到redis中
   * 在支付回调中将dataCache取出传回业务方法
   *
   * 每一个支付应用都有自己的：支付成功、支付失败、退款成功、退款失败回调
   * 所以如果有不同的业务，最好将这些业务都分层不同的支付应用
   * 每个应用实现独立的同步消息通知（sub-async）
   * @memberof WxPay
   */
  unifiedorder(wxOrderOption: WxCreatedorder, dataCache?: {[key: string]: any}): Promise<WxCreateOrderResult>;
  /**
   *
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_2
   * @param {WxOrderQuery} option
   * @returns {Promise<WxOrder>}
   * @memberof WxPay
   */
  orderquery(option: WxOrderQuery): Promise<WxOrder>;
  /**
   *
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_3
   * @param {string} out_trade_no
   * @returns {Promise<void>}
   * @memberof WxPay
   */
  closeorder(out_trade_no: string): Promise<void>;
  /**
   * 取消订单
   * 用于用户取消支付导致的取消订单场景
   * 此方法会清除调起支付时缓存的dataCache
   * 同时会向微信提交关闭订单的申请
   * @param {string} out_trade_no
   * @returns {Promise<void>}
   * @memberof WxPay
   */
  cancelorder(out_trade_no: string): Promise<void>;
  /**
   *
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_4
   * @param {WxCreateRefundOrder} option
   * @returns {Promise<void>}
   * @memberof WxPay
   */
  refund(option: WxCreateRefundOrder): Promise<void>;
  /**
   *
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_5
   * @param {WxRefundOrderQuery} option
   * @returns {Promise<void>}
   * @memberof WxPay
   */
  refundquery(option: WxRefundOrderQuery): Promise<WxRefundOrder>;
}
interface EggSocketNameSpace extends SocketNameSpace {
  // Forward the event to the Controller
  route(event: string, handler: Function): any;
}
interface EggIOServer extends SocketServer {
  of(nsp: string): EggSocketNameSpace;
}
interface CustomMiddleware {}
interface CustomController {}
interface EggSocketIO {
  middleware: CustomMiddleware;
  controller: CustomController;
}
/**
 * 注解声明
 */
interface Decorator {
  (target: any, key: string, descriptor: PropertyDescriptor): void;
}
/**
 * 企业微信员工
 */
export interface WxOrganUser {
  userid: number;
  name: string;
  alias?: string;
  mobile: string;
  department: number[];
  order?: number[];
  is_leader_in_dept?: Array<0 | 1>;
  position?: string;
  gender?: 1 | 0;
  email?: string;
  telephone?: string;
  avatar_mediaid?: string;
  enable?: 1 | 0;
  extattr?: {[key: string]: string | number};
  to_invite?: boolean;
  external_profile?: {[key: string]: string | number};
  external_position?: string;
  address?: string;
}
export interface WxOrganUserRead extends WxOrganUser {
  status?: 1 | 2 | 4;
  avatar?: string;
  thumb_avatar?: string;
  qr_code?: string;
}
export interface WxOrganUserSimply {
  userid: number;
  name: string;
  department: number[];
}
/**
 *
 * 企业微信部门
 * @interface WxDepartment
 */
export interface WxDepartment {
  name: string;
  parentid: number;
  order?: number;
  id: number;
}
export class SetEx<T> extends Set {
  /**
   *
   * @param {keyof T} key 识别是否存在的对象的属性名
   * @param {(oldData: T, newData: T) => void} [onExist] 当存在时作何操作? oldData/newData 哪个将添加到set,由replaceItemWhenExits决定,默认是oldData生效
   * @param {boolean} [replaceWhenExits] 当存在时是否覆盖？
   * @param {(ReadonlyArray<T> | null)} [values] 初始数组
   * @param {(newData: T) => void} [onNotExist] 当不存在时作何操作?
   * @memberof SetEx
   */
  constructor (key: keyof T, onExist?: (oldData: T, newData: T) => void, replaceWhenExits?: boolean, values?: ReadonlyArray<T> | null, onNotExist?: (newData: T) => void);
  /**
   * key: 识别是否存在的对象的属性名
   * onExist: 当存在时作何操作? oldData/newData 哪个将添加到set,由replaceItemWhenExits决定,默认是oldData生效
   * replaceWhenExits: 当存在时是否覆盖？
   * values 初始数组
   * onNotExist 当不存在时作何操作?
   * @param {({key: keyof T, onExist?: (oldData: T, newData: T) => void, onNotExist?: (newData: T) => void, replaceWhenExits: boolean, values?: ReadonlyArray<T> | null})} param
   * @memberof SetEx
   */
  constructor (param: {key: keyof T; onExist?: (oldData: T, newData: T) => void; onNotExist?: (newData: T) => void; replaceWhenExits?: boolean; values?: ReadonlyArray<T> | null});
  /**
   *
   * 添加返回 当前对象
   * @param {T} value
   * @returns {this}
   */
  add(value: T): this;
  addAll(...values: T[]): this;
  /**
   *
   * 添加并返回添加成功的对象:可能是新加入集合的，也可能是原本存在的
   * @param {T} value
   * @returns {T}
   */
  add2(value: T): T;
  /**
   *
   * 添加并返回添加成功的对象:可能是新加入集合的，也可能是原本存在的
   * @param {T} value
   * @returns {T}
   */
  addAll2(values: T[]): T[];
  /**
   * 用key找到匹配的第一个对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {(T | null)}
   */
  find(value: T[keyof T]): T | null;
  /**
   * 用key找到匹配的所有对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {T[]}
   */
  findAll(value: T[keyof T]): T[];
  /**
   *
   * 用函数回调找到匹配的第一个对象
   * @param {(item: T) => boolean} fn
   * @returns {T[]}
   */
  filter(fn: (item: T) => boolean): T | null;
  /**
   *
   * 用函数回调找到匹配的所有对象
   * @param {(item: T) => boolean} fn
   * @returns {T[]}
   */
  filterAll(fn: (item: T) => boolean): T[];
  /**
   *
   * 是否存在key对应的对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {boolean}
   */
  has(value: T[keyof T]): boolean;
  toArray(): T[];
  /**
   *
   * 删除key对应的对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {boolean}
   */
  delete(value: T[keyof T]): boolean;
  /**
   *
   * 重置
   * @param {keyof T} key
   * @param {(oldData: T, newData: T) => void} [onExist]
   * @param {boolean} [replaceWhenExits=false]
   */
  reset({key, onExist, onNotExist, replaceWhenExits}: {
    key?: keyof T;
    onExist?: (oldData: T, newData: T) => void | null;
    onNotExist?: (newData: T) => void | null;
    replaceWhenExits?: boolean;
  }): this;
  set onExist(onExist: ((oldData: T, newData: T) => void) | undefined);
  set key(key: keyof T);
  set replaceWhenExits(replaceWhenExits: boolean);

}

export interface BaseMongoModel {
  _id?: string;
}
export interface BaseUser {
  userid?: any;
  devid?: string;
  socket?: string;
  os?: string;
  device?: string;
  browser?: string;
  wx_mini_session_key?: string;
  client_online?: boolean;
  [key: string]: any;
}
export class Enum {
  constructor (value: string, desc: string);
  eq(value: string): boolean;
  value(): string;
  desc(): string;
}
export function ILogin(): (ctx: Context, next: () => Promise<any>) => Promise<void>;
export class Empty {
  [propName: string]: string | number | boolean | null;
}

export abstract class BaseMongoService<T> extends Service {
  /**
      * 插入
      * 返回成功插入行数
      * @param {{[P in keyof T]?: T[P]}} data
      * @param {*} [transction] 独立事务
      * @param {(serviceTableName: string) => string} [tableName=(
      *       serviceTableName: string
      *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
      * @returns
      */
  insert(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertIfNotExists(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 插入或修改所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replace(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 只插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplate(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   *
   * 只插入非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplateLoose(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplateIfNotExists(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplateIfNotExistsLoose(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 只插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceTemplate(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 只插入或修改非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceTemplateLoose(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 批量插入所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatch(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 批量插入或修改所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatch(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplate(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplateLoose(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplateIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列
    * 返回成功插入行数
    * @param {{[P in keyof T]?: T[P]}} data
    * @param {*} [transction] 独立事务
    * @param {(serviceTableName: string) => string} [tableName=(
    *       serviceTableName: string
    *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
    * @returns
    */
  insertBatchTemplateLooseIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplate(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplateLoose(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键修改全部字段
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateById(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateTemplateById(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateTemplateLooseById(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据主键批量修改全部字段
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchById(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateById(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateLooseById(datas: {
    [P in keyof T]?: T[P];
  }[], transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据自定义条件修改
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {{[P in keyof T]?: T[P]}} where
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatch(data: {
    [P in keyof T]?: T[P];
  }, where: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {{[P in keyof T]?: T[P]}} where
   * @param {*} [transction] 独立事务
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  deleteBatch(where: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据主键删除
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  deleteById(id: any, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  unique<L>(id: any, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L>;
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  uniqueMe(id: any, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T>;
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  single<L>(id: any, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L | null>;
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  singleMe(id: any, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T | null>;
  /**
   * 返回全部数据
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  all<L>(transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 返回全部数据
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allMe(transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allPage<L>(start: number, size: number, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allPageMe(start: number, size: number, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   * 返回总条数
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allCount(transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  template<L>(where: {
    [P in keyof L]?: L[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateMe(where: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   * 根据模版查询所有一条数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateOne<L>(data: {
    [P in keyof L]?: L[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L>;
  /**
   * 根据模版查询所有一条数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateOneMe(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T>;
  /**
   *
   * 根据模版分页查询数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templatePage<L>(data: {
    [P in keyof L]?: L[P];
  }, start: number, size: number, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   *
   * 根据模版分页查询数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templatePageMe(data: {
    [P in keyof T]?: T[P];
  }, start: number, size: number, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 根据模版查询条数
   * @param {{[P in keyof T]?: T[P]}} data，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateCount(data: {
    [P in keyof T]?: T[P];
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQuery<L>(transction?: MongoSession, tableName?: (serviceTableName: string) => string): LambdaQueryMongo<L>;
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQueryMe(transction?: MongoSession, tableName?: (serviceTableName: string) => string): LambdaQueryMongo<T>;
  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: string[]
   *   }} x
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<L[]>}
   */
  customQuery<L>(x: {
    where?: {
      [P in keyof L]?: L[P];
    };
    columns?: (keyof L)[];
    startRow?: number;
    pageSize?: number;
    orders?: {
      [P in keyof L]: 1 | -1;
    };
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  customQueryCount<L>(x: {
    where?: {
      [P in keyof L]?: L[P];
    };
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: {[key: string]: number}
   *   }} x
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<T[]>}
   */
  customQueryMe(x: {
    where?: {
      [P in keyof T]?: T[P];
    };
    columns?: (keyof T)[];
    startRow?: number;
    pageSize?: number;
    orders?: {
      [P in keyof T]: 1 | -1;
    };
  }, transction?: MongoSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns 指定类型数组
   */
  queryBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns 本service对象数组
   */
  queryMeBySqlId(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<T[]>;
  /**
   *
   * 执行数据库查询 条数
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  countBySqlId(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<number>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  queryMutiRowMutiColumnBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<L[]>;
  /**
   *
   * 根据条件返回条数
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  countBySql<L>(item: {
    query: {
      [P in keyof L]?: L[P] | FilterQuery<L>;
    };
    tableName?: string;
  }, transction?: MongoSession): Promise<number>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  queryMutiRowMutiColumnBySql<L>(item: {
    query: {
      [P in keyof L]?: L[P] | FilterQuery<L>;
    };
    options: {
      limit?: number;
      skip?: number;
      sort?: {
        [P in keyof L]: 1 | -1;
      };
      projection?: {
        [P in keyof L]: 1;
      };
    };
    tableName?: string;
  }, transction?: MongoSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  querySingelRowMutiColumnBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<L | null>;
  /**
   *
   * 执行数据库查询 多列单行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  querySingelRowMutiColumnBySql<L>(item: {
    query: {
      [P in keyof L]?: L[P] | FilterQuery<L>;
    };
    options: {
      limit?: number;
      skip?: number;
      sort?: {
        [P in keyof L]: 1 | -1;
      };
      projection?: {
        [P in keyof L]: 1;
      };
    };
    tableName?: string;
  }, transction?: MongoSession): Promise<L | null>;
  /**
   *
   * 执行数据库查询 单列多行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  queryMutiRowSingelColumnBySql<M>(item: {
    query: {
      [P in keyof T]?: T[P] | FilterQuery<T>;
    };
    options: {
      limit?: number;
      skip?: number;
      sort?: {
        [P in keyof T]: 1 | -1;
      };
      projection?: {
        [P in keyof T]: 1;
      };
    };
    tableName?: string;
  }, transction?: MongoSession): Promise<M[]>;
  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  queryMutiRowSingelColumnBySqlId<M>(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<M[]>;
  /**
   *
   * 执行数据库查询 单列单行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  querySingelRowSingelColumnBySql<M>(item: {
    query: {
      [P in keyof T]?: T[P] | FilterQuery<T>;
    };
    options: {
      limit?: number;
      skip?: number;
      sort?: {
        [P in keyof T]: 1 | -1;
      };
      projection?: {
        [P in keyof T]: 1;
      };
    };
    tableName?: string;
  }, transction?: MongoSession): Promise<M | null>;
  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  querySingelRowSingelColumnBySqlId<M>(sqlid: string, param?: {
    [propName: string]: any;
  }, transction?: MongoSession): Promise<M | null>;
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {*} [transction] 独立事务
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transction?: MongoSession): PageQuery<L>;
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {*} [transction] 独立事务
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transction?: MongoSession): PageQuery<T>;
  /**
    *
    * 事务执行方法
    * @param {() => Promise<any>} fn 方法主体
    * @param {*} [transction] 独立事务
    * @returns
    */
  protected transction(fn: (transction?: MongoSession) => Promise<any>, transction?: MongoSession): Promise<any>;
}
export abstract class BaseService<T> extends Service {
  /**
   * 插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insert(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertIfNotExists(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replace(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 只插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplate(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   *
   * 只插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplateLoose(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertTemplateIfNotExists(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
 * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null)
 * 返回自增主键或者0
 * @param {T} data
 * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
 * @param {(serviceTableName: string) => string} [tableName=(
 *       serviceTableName: string
 *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
 * @returns
 */
  insertTemplateLooseIfNotExists(data: {
    [P in keyof T]?: T[P];
  }, columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 只插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceTemplate(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 只插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceTemplateLoose(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 批量插入所有列,返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatch(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 批量插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatch(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   *
   * 批量插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplate(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number[]>;
  /**
   *
   * 批量插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplateLoose(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  insertBatchTemplateIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number[]>;
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null)
    * 返回自增主键或者0
    * @param {T} data
    * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
    * @param {(serviceTableName: string) => string} [tableName=(
    *       serviceTableName: string
    *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
    * @returns
    */
  insertBatchTemplateLooseIfNotExists(datas: {
    [P in keyof T]?: T[P];
  }[], columns: (keyof T)[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 快速批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplate(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number[]>;
  /**
   * 快速批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplateLoose(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplateSafe(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number[]>;
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  replaceBatchTemplateLooseSafe(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 根据主键修改全部字段
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateById(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键修改非空字段(排除undefined、null、空字符串)
   *
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateTemplateById(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 根据主键修改非空字段(排除undefined、null)
   *
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateTemplateLooseById(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据主键批量修改全部字段
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchById(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateById(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateLooseById(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 安全的根据主键修改所有非空字段(null、undefined、空字符串)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateByIdSafe(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string, dealEmptyString?: boolean): Promise<number>;
  /**
   * 安全的根据主键修改所有非空字段(null、undefined)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatchTemplateLooseByIdSafe(datas: {
    [P in keyof T]?: T[P];
  }[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据自定义条件修改
   * @param {T} data
   * @param {T} where
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  updateBatch(data: {
    [P in keyof T]?: T[P];
  }, where: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {T} where
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  deleteBatch(where: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据复合主键删除
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  deleteByIdMuti(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 根据主键删除
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  deleteById(id: any, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   *
   * 一次性删除多个主键
   * @param {any[]} ids
   * @param {*} [transaction=true]
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName]
   * @returns {Promise<number[]>}
   */
  deleteByIds(ids: any[], transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number[]>;
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  unique<L>(id: any, error?: string, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L>;
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  uniqueMe(id: any, error?: string, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T>;
  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  uniqueMuti<L>(data: {
    [P in keyof T]?: T[P];
  }, error?: string, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L>;
  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  uniqueMutiMe(data: {
    [P in keyof T]?: T[P];
  }, error?: string, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T>;
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  single<L>(id: any, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L | null>;
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  singleMe(id: any, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T | null>;
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  singleMuti<L>(data: {
    [P in keyof L]?: L[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L | null>;
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  singleMutiMe(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T | null>;
  /**
   * 返回全部数据
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  all<L>(transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 返回全部数据
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allMe(transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allPage<L>(start: number, size: number, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allPageMe(start: number, size: number, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   * 返回总条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  allCount(transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 根据模版查询所有数据
   *
   * @param {T} data 模版，仅支持 = 操作符
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  template<L>(where: {
    [P in keyof L]?: L[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 根据模版查询所有数据
   *
   * @param {T} data 模版，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateMe(where: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateOne<L>(data: {
    [P in keyof L]?: L[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L>;
  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateOneMe(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T>;
  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templatePage<L>(data: {
    [P in keyof L]?: L[P];
  }, start: number, size: number, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templatePageMe(data: {
    [P in keyof T]?: T[P];
  }, start: number, size: number, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 根据模版查询条数
   * @param {T} data，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  templateCount(data: {
    [P in keyof T]?: T[P];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<number>;
  /**
   * 执行数据库操作
   *
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  executeBySqlId(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<number>;
  /**
   *
   * 执行数据库操作
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  executeBySql(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<number>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  queryMeBySqlId(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<T[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  queryBySql<L>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  queryBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 ,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组,与sql语句的顺序对应
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  queryMulitBySql<L>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[][]>;
  /**
   *
   * 执行数据库查询,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组与sql语句的顺序对应
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  queryMulitBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[][]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  queryMeBySql(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<T[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  queryMutiRowMutiColumnBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  queryMutiRowMutiColumnBySql<L>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  querySingelRowMutiColumnBySqlId<L>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L | null>;
  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  querySingelRowMutiColumnBySql<L>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L | null>;
  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  queryMutiRowSingelColumnBySqlId<M>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<M[]>;
  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  queryMutiRowSingelColumnBySql<L>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<L[]>;
  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  querySingelRowSingelColumnBySqlId<M>(sqlid: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<M | null>;
  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  querySingelRowSingelColumnBySql<M>(sql: string, param?: {
    [propName: string]: any;
  }, transaction?: SqlSession): Promise<M | null>;
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transaction?: SqlSession): PageQuery<L>;
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transaction?: SqlSession): PageQuery<T>;
  /**
   * 创建复杂查询、修改、删除对象
   * 例如: lambdaQuery()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQuery<L>(transaction?: SqlSession, tableName?: (serviceTableName: string) => string): LambdaQuery<L>;
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQueryMe(transaction?: SqlSession, tableName?: (serviceTableName: string) => string): LambdaQuery<T>;
  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: string[] 例如 orders: [['id', 'desc'], ['name', 'asc']]
   *   }} x
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<L[]>}
   */
  customQuery<L>(x: {
    where?: {
      [P in keyof L]?: L[P];
    };
    columns?: (keyof L)[];
    startRow?: number;
    pageSize?: number;
    orders?: [keyof L, 'asc' | 'desc'][];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<L[]>;
  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: string[] 例如 orders: [['id', 'desc'], ['name', 'asc']]
   *   }} x
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<T[]>}
   */
  customQueryMe(x: {
    where?: {
      [P in keyof T]?: T[P];
    };
    columns?: (keyof T)[];
    startRow?: number;
    pageSize?: number;
    orders?: [keyof T, 'asc' | 'desc'][];
  }, transaction?: SqlSession, tableName?: (serviceTableName: string) => string): Promise<T[]>;
  /**
   *
   * 事务执行方法
   * @param {(conn: any) => void} fn 方法主体
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  protected transction(fn: (conn: SqlSession) => Promise<any>, transaction?: SqlSession): Promise<any>;
}
export abstract class BaseSchedule extends Subscription {
  /** 此定时任务唯一标识 */
  key: string;
  /** 定时任务单例运行，不允许多线程  */
  singel = true;
  abstract excute(): Promise<string>;
}

/**
 *
 * 流程上下文
 * @export
 * @interface FlowContext
 * @template P bizParam类型
 * @template F 数据流类型
 * @template R 流程返回值
 */
export interface FlowContext<P, F, R> {
  readonly ctx: Context;
  readonly service: IService;
  readonly app: Application;

  /** 提交流程时，流程相关参数 */
  readonly flowParam: {remark: string};
  /** 提交流程时，业务相关参数 */
  readonly bizParam: P;

  /** 流程编码 */
  readonly flowCode: string;
  /** 来自哪个节点，当前node编码，可以在action中进行判断 */
  readonly fromNode?: string;
  // /** 将要到哪个节点，取自action定义 */
  // toNode?: string;

  /** 数据流 */
  dataFlow: F;
  /** 返回值 */
  returnValue?: R;

  /** 可能存在的异常信息,每个节点处理完异常后，可以将异常对象从上下文移除，以通知其他节点异常已经解决 */
  error?: Error;

  /** 事务 */
  readonly conn: any;
}

export type FlowMeta = (this: FlowContext<P, F, R>) => Promise<void>;

// /**
//  * 流程定义
//  * 在action中，不需要保存业务的状态
//  * 而是在流程定义中进行存储
//  */
// export interface Flow {
//   /* 别名 */
//   alias?: string[];
//   /** 一批节点处理完毕触发,可以存储状态、todo（一批是指一个操作+N个自动操作） */
//   doAfterAllAction?: FlowMeta;
//   /** 一批处理之前调用（一批是指一个操作+N个自动操作） */
//   doBeforeAllAction?: FlowMeta;
//   /** 每个处理完毕触发 */
//   doAfterEveryAction?: FlowMeta;
//   /** 每个处理之前调用 */
//   doBeforeEveryAction?: FlowMeta;
//   /** 异常处理 */
//   doException?: FlowMeta;
// }

// /**
//  * 流程节点定义1
//  */
// export interface FlowNode {
//   /* 别名 */
//   alias?: string[];
//   /** 节点自动操作，系统自动匹配，无需设置 */
//   autoAction?: string;
//   /** 每个节点内操作进行之前调用 */
//   async doAfterEveryAction?: FlowMeta;
//   /** 每个节点内操作进行之后调用 */
//   async doBeforeEveryAction?: FlowMeta;
//   /** 进入此节点时执行，可以匹配结点处理人员、发送消息等 */
//   async onInto?: FlowMeta;
//   /** 离开此节点时执行，可以找到所有的 todo userid,加以清除 */
//   async onLeave?: FlowMeta;
//   /** 异常处理 */
//   doException?: FlowMeta;
// }
// /**
//  * 流程节点定义1
//  */
// export interface FlowAction1 {
//   /* 别名 */
//   alias?: string[];
//   /** 自动执行吗？每个节点只能由一个自动节点,沿用上一个ctx;要求必须存在node的index文件 */
//   auto?: boolean;
//   /** 到哪个节点，用于流程跳转 */
//   toNode: string;
//   /** 节点执行,不用保存 业务的状态、操作历史哦 */
//   excute: FlowMeta;
// }

export type FlowCodeFilter = string | string[];

/**
 * 流程节点定义2
 */
export interface FlowAction {
  /** 流程定义，一个流程对应一个节点 */
  flowConfig: Array<{
    flowCode: FlowCodeFilter;
    nodeCode: FlowCodeFilter;
  }>;
  /** 流程别名 */
  flowAlias?: {
    [name: string]: {
      flowCode?: FlowCodeFilter;
      nodeCode?: FlowCodeFilter;
    };
  };
  /** 节点执行,不用保存 业务的状态、操作历史哦 */
  excute: FlowMeta;
}
export interface FlowActionConfigFilter {
  flowCode?: FlowCodeFilter;
  nodeCode?: FlowCodeFilter;
  alias?: FlowCodeFilter;

  /** 发生异常才进行调用? */
  exception?: boolean;
  /** 先扩展dataFlow，然后再调用handler */
  dataFlow?: {[key: string]: any};
  /** 先扩展dataFlow，然后再调用handler */
  handler?: FlowMeta[] | FlowMeta;
  // toNode?: string;
}
/**
 * 顺序
 * Specil或者All,
 * 空>Reverse,
 * Reverse 仅有一个生效！
 * toNode、doException 都是 Specil>All>空>Reverse,一旦匹配成功就跳出
 */
export interface FlowActionConfigParam {
  before?: FlowActionConfigFilter[];
  after?: FlowActionConfigFilter[];
}

/**
 * 流程操作过滤配置,进行操作时按照声明文件的顺序来执行
 */
export const FlowActionConfig: (config: FlowActionConfigParam) => Decorator;

// tslint:disable-next-line:max-classes-per-file
declare class PaasService extends BaseService<Empty> {
  /** 发送短信验证码,返回验证码编号 */
  sendCode(phone: string): Promise<string>;
  /** 发送任意短信 */
  sendSms(phone: string, TemplateCode: string, params: {[key: string]: string}): Promise<any>;
  /** 验证短信验证码, id是验证码编号 */
  validCode(phone: string, id: string, code: string): Promise<boolean>;
  /** 删除短信验证码缓存 */
  removeCode(phone: string, id: string): Promise<number>;
  /** 图形验证码 */
  picCode(key: string): Promise<string>;
  /** 验证图像验证码 */
  validPicCode(key: string, code: string): Promise<boolean>;
  /** 删除图形验证码缓存 */
  removePicCode(key: string): Promise<number>;
  /** 执行流程 */
  doFlow(
    param: {
      flowPath: string;
      flowParam: {
        remark: string;
      };
      bizParam: any;
      dataFlow?: any;
      conn?: any;
    }
  ): Promise<any>;
}

export interface SqlSession {
  query: (sql: string, param?: {[key: string]: any}) => Promise<any>;
  count: <T>(tableName: string, where?: {[P in keyof T]?: T[P]}) => Promise<number>;
  select: <T>(tableName: string, options?: {
    where?: {[P in keyof T]?: T[P]};
    columns?: (keyof T)[];
    offset?: number;
    limit?: number;
    orders?: [keyof T, 'asc' | 'desc'][];
  }) => Promise<T[]>;
  get: <T>(tableName: string, where?: {[P in keyof T]?: T[P]}, options?: {
    columns?: (keyof T)[];
    orders?: [keyof T, 'asc' | 'desc'][];
  }) => Promise<T>;
  insertIF: <T>(tableName: string, options: Array<{
    row: {[P in keyof T]?: T[P]};
    where: {[P in keyof T]?: T[P]};
  }>, columns: (keyof T)[]) => Promise<{insertId: number; affectedRows: number}>;
  insert: <T>(tableName: string, rows: Array<{[P in keyof T]?: T[P]}> | {[P in keyof T]?: T[P]}, options: {
    columns: (keyof T)[];
  }) => Promise<{insertId: number; affectedRows: number}>;
  replace: <T>(tableName: string, rows: Array<{[P in keyof T]?: T[P]}> | {[P in keyof T]?: T[P]}, options: {
    columns?: (keyof T)[];
    ids: (keyof T)[];
  }) => Promise<{insertId: number; affectedRows: number}>;
  update: <T>(tableName: string, row: {[P in keyof T]?: T[P]}, options: {
    where: {[P in keyof T]?: T[P]};
    columns: (keyof T)[];
  }) => Promise<{affectedRows: number}>;
  updateUnSafe: <T>(tableName: string, row: {[P in keyof T]?: T[P]}, options: {
    where: {[P in keyof T]?: T[P]};
    columns: (keyof T)[];
  }) => Promise<{affectedRows: number}>;
  updateRows: <T>(tableName: string, options: {
    rows: Array<{[P in keyof T]?: T[P]}>;
    where: {[P in keyof T]?: T[P]};
    columns: (keyof T)[];
  }) => Promise<{affectedRows: number}>;
  delete: (tableName: string, where?: {[P in keyof T]?: T[P]}) => Promise<{affectedRows: number}>;
  beginTransactionScope: (fn: (conn: SqlSession) => Promise<any>, ctx: Context) => Promise<any>;
}

export type MongoSession = ClientSession;
export interface MongoFilter<T> {
  query: {[P in keyof T]?: L[P] | FilterQuery<T>};
  options: {
    limit?: number;
    skip?: number;
    sort?: {[P in keyof T]: 1 | -1};
    projection?: {[P in keyof T]: 1};
  };
  tableName: string;
}

export type SqlScript = (this: Context, param?: {[k: string]: any}) => string | MongoFilter<any>;
declare module 'egg' {
  interface Application {
    _wxMini: {[appCode: string]: WxMini};
    _wxOrgan: {[appCode: string]: WxOrgan};
    _wxPay: {[appCode: string]: WxPay};
    _cacheIO: string; // 缓存存放配置
    _devidIO: string; // devid获取、存放配置
    /**
     *
     * 内存缓存
     * @type {{[key: string]: any}}
     * @memberof Application
     */
    _cache: {[key: string]: any};
    _globalValues: EnmuJson;
    mysql: SqlSession;
    redis: {get: (name: 'user' | 'other') => Redis};
    io: EggIOServer & EggSocketNameSpace & EggSocketIO;
    mongo: MongoClient;
    _asyncSubClient: {[code: string]: (...args: any[]) => any};
    /**
     * nuxt 是否已经准备完毕
     */
    _nuxtReady: boolean;
    // /** 流程 */
    // _flowMap: {[name: string]: Flow};
    // /** 流程节点 */
    // _flowNodeMap: {[name: string]: FlowNode};
    /** 流程操作 */
    _flowActionMap: {[name: string]: FlowAction};
    /**
     * 手动调用nuxt渲染
     * 只有配置了nuxt选项后才能使用
     * 推荐使用NUXT注解而不是此方法
     */
    _nuxt?: (req: IncomingMessage, res: ServerResponse, cb: () => void) => Promise<void>;
    /** 加载sql模板，位于 app/sql、app/sql-script */
    _getSql<T>(ctx: Context, count: boolean, id: string, param?: {[key: string]: any}): string | MongoFilter<T>;
    stringifyUser: (user: BaseUser) => string;
    throwNow(message: string, status?: number): never;
    throwIf(test: boolean, message: string, status?: number);
    throwIfNot(test: boolean, message: string, status?: number);
    throwErrorNow(error: Enum): never;
    throwErrorIf(test: boolean, error: Enum);
    throwErrorIfNot(test: boolean, error: Enum);
    /**
     *
     * socket 发送
     * @param {string} roomType 通道类型，内置SOCKET_ALL、SOCKET_USER、SOCKET_DEV
     * @param {string} roomId 通道ID
     * @param {string} event 事件
     * @param {{message?: string; uri?: string; params?: any; id?: string}} {message, uri, params, id}
     * @memberof Application
     */
    emitTo(roomType: string, roomId: string, event: string, {message, uri, params, id}: {message?: string; uri?: string; params?: any; id?: string});
    /**
     *
     * 按照config中的keys进行加盐
     * @param {Application} this
     * @param {string} value
     * @param {string} [key] 加盐
     * @returns {string}
     * @memberof Application
     */
    md5(this: Application, value: string, key?: string): string;
    /**
     * 获取GlobalValues
     */
    dataConfig(configName: string, valueName: string): string | null;
    /**
     *
     * 当缓存设置为 redis、memory时，可以在app中获取
     * @param {string} key
     * @param {string} value
     * @param {('user' | 'other')} [redisName]
     * @param {number} [minutes]
     * @returns {Promise<void>}
     * @memberof Application
     */
    setCache(key: string, value: string, redisName?: 'user' | 'other', minutes?: number): Promise<void>;
    /**
     *
     * 当缓存设置为 redis、memory时，可以在app中获取
     * @param {(string)} key
     * @param {('user' | 'other')} [redisName]
     * @returns {(Promise<string | null>)}
     * @memberof Application
     */
    getCache(key: string, redisName?: 'user' | 'other'): Promise<string | null>;
    /**
     *
     * 当缓存设置为 redis、memory时，可以在app中获取
     * @param {string} key
     * @param {('user' | 'other')} [redisName]
     * @param {number} [minutes]
     * @returns {Promise<void>}
     * @memberof Application
     */
    delCache(key: string, redisName?: 'user' | 'other', minutes?: number): Promise<void>;
    /**
     *
     * 获取微信小程序api对象
     * @param {string} [appCode]
     * @returns {WxMini}
     * @memberof Application
     */
    getWxMini(appCode?: string): WxMini;
    /**
     *
     * 获取企业微信api对象
     * @param {string} [appCode]
     * @returns {WxOrgan}
     * @memberof Application
     */
    getWxOrgan(appCode?: string): WxOrgan;
    /**
     *
     * 获取微信支付对象
     * @param {string} [appCode]
     * @returns {WxPay}
     * @memberof Application
     */
    getWxPay(appCode?: string): WxPay;
    /**
     *
     * 发出同步事件
     * 与emitSync不同，emitSync是异步且无法获取到订阅者的返回值,且可能发送给其他进程
     * emitASync只能发送给同一个进程
     * 返回 事件方法的返回值
     *
     * @param {string} name
     * @param {...any[]} args
     * @returns {*}
     * @memberof Application
     */
    emitASync(name: string, ...args: any[]): Promise<any>;
    /**
     *
     * 处理流程
     * @param {string} flow
     * @param {*} data
     * @returns {Promise<any>}
     * @memberof Application
     */
    doFlow(
      param: {
        flowPath: string;
        flowParam: {
          remark: string;
        };
        bizParam: any;
        dataFlow?: any;
        conn?: any;
      }
    ): Promise<any>;
    /**
     *
     * 发出异步事件,随机找一个worker执行
     * @param {string} name
     * @param {...any[]} args
     * @returns {*}
     * @memberof Application
     */
    emitSyncRandom(name: string, ...args: any[]): void;
    /**
     *
     * 发出异步事件,全部worker执行
     * @param {string} name
     * @param {...any[]} args
     * @returns {*}
     * @memberof Application
     */
    emitSyncAll(name: string, ...args: any[]): void;
    /**
     *
     * 清空指定的方法缓存
     * @returns {Promise<void>}
     * @memberof Application
     */
    clearContextMethodCache(clearKey: string): Promise<void>;
  }
  interface EggAppConfig {
    /**
     *
     * 系统对外访问路径
     * 必须以 /  结尾
     * @type {string}
     * @memberof EggAppConfig
     */
    baseUri: string;
    /**
     *
     * redis: 支持退出登录后，延迟某段时间再删除会话;支持会话每次延长有效期
     * cookie: 支持会话每次延长有效期
     * memory: 单核CPU，开发模式可用
     * @type {('redis' | 'cookie' | 'memory')}
     * @memberof EggAppConfig
     */
    cacheIO?: 'redis' | 'cookie' | 'memory';
    /**
     *
     * query接口是否需要登录才能访问?
     * @type {boolean}
     * @memberof EggAppConfig
     */
    queryLogin?: boolean;
    /**
     * 定时器开启吗?
     * @type {boolean}
     * @memberof EggAppConfig
     */
    scheduleRun?: boolean;
    /**
     *
     * 定时器日志基础service
     * 用于插入日志
     * @type {string}
     * @memberof EggAppConfig
     */
    scheduleLogService?: {
      /** 存储无报错的记录吗? */
      saveNoError: boolean;
      /**  service 的name */
      name: string;
      /** 字段映射 */
      fields: {
        /** 定时任务key字段 */
        key: string;
        /** 开始时间 */
        startTime: string;
        /** 结束时间 */
        endTime: string;
        /** 日志内容 */
        log: string;
        /** 本次运行是否报错 */
        isError: string;
      };
    };
    /**
     * cookie\md5的加盐字符
     * @type {string}
     * @memberof EggAppConfig
     */
    keys?: string;
    mongo?: {
      uri: string;
      options: MongoClientOptions;
      replica: boolean;
      sessionOptions: SessionOptions;
    };
    userScheam: {[key: string]: Schema};
    queryDefaultParam?: {[key: string]: string};
    /** socket相关配置 */
    socket?: {
      /** 每次新连接建立时调用，返回需要加入的房间编号,默认会加入个人id、会话id、所有人房间 */
      rooms: Array<(user: BaseUser) => string>;
      /** 每次新连接建立时调用，返回是否需要踢掉其他同id登录?dickUser只有现在才生效 */
      onlyOneLogin: (user: BaseUser) => boolean;
      /** newUser登录后，是否踢掉oldUser?  */
      dickUser?: (oldUser: BaseUser, newUser: BaseUser) => boolean;
      /** 每次新连接建立时调用，是否加入个人房间? 默认是  */
      joinMe?: (user: BaseUser) => boolean;
    };
    smsDebug: boolean;
    ali: {accessKeyId: string; accessKeySecret: string; endpoint: string; apiVersion: string; RegionId: string; SignName: string; CommonCode: string};
    mysql: {
      client?: {
        host: string;
        port: string;
        localAddress?: string;
        socketPath?: string;
        user: string;
        password: string;
        passwordSha1?: string;
        database: string;
        charset?: string;
        timezone?: string;
        connectTimeout?: number;
        stringifyObjects?: boolean;
        insecureAuth?: boolean;
        typeCast?: boolean;
        supportBigNumbers?: boolean;
        bigNumberStrings?: boolean;
        decimalNumbers?: boolean;
        rowsAsArray?: boolean;
        compress?: boolean;
        dateStrings?: boolean;
        debug?: boolean;
        trace?: boolean;
        localInfile?: boolean;
        ssl?: boolean;
        multipleStatements?: boolean;
        useConnectionPooling?: boolean;
        queueLimit?: number;
        connectionLimit?: number;
        acquireTimeout?: number;
        waitForConnections?: boolean;
      };
      app: boolean;
      alinode: {
        appid: number;
        secret: string;
      };
    };
    redis: {
      /**
       * 客户端,包含user、other，分别存放用户信息、其他缓存
       * other每次启动服务会清空
       * @type {({[key: 'user' | 'other']: {host: string, port: number, password: string, db: number}})}
       */
      clients?: {[key: 'user' | 'other']: {host: string; port: number; password: string; db: number}};
    };
    /**
     *
     * 登录用图形验证码配置
     * size: 验证码中有几个字符
     * ignoreChars: 不会出现的字符
     * noise: 干扰线数量
     *
     * @type {{size?: number, ignoreChars?: string, noise?: number; color?: boolean; background?: string}}
     * @memberof EggAppConfig
     */
    picCode?: {size?: number; ignoreChars?: string; noise?: number; color?: boolean; background?: string};
    session?: {
      /**
       *
       * socket断开后，是否退出session?
       * 默认true
       * @type {boolean}
       */
      socketLogout?: boolean;
      /**
       *
       * session有效期 分钟
       * 默认0 = 不限时间
       * 仅对cookie、redis存储方式有效
       * @type {number}
       */
      sessionMinutes?: number;
      /**
       *
       * 登出后，将会话延长多久后再释放?
       * 默认10
       * 0 = 立即释放
       * 仅对redis存储方式有效
       * @type {number}
       */
      sessionContinueMinutes?: number;
      /**
       * 登录令牌存储、读取方式
       * header：登录时返回，以后每次访问在header里传递
       * cookie: 登录时返回，但访问时只需要携带cookie即可
       *
       * @type {('header' | 'cookie')}
       */
      devidIO?: 'header' | 'cookie';
    };
    viewTags: {
      blockStart?: string;
      blockEnd?: string;
      variableStart?: string;
      variableEnd?: string;
      commentStart?: string;
      commentEnd?: string;
    };
    nuxt?: {
      build?: NuxtConfiguration.Build;
      buildDir?: string;
      css?: string[];
      dev?: boolean;
      env?: NuxtConfiguration.Env;
      fetch?: NuxtConfiguration.Fetch;
      generate?: NuxtConfiguration.Generate;
      globalName?: string;
      globals?: NuxtConfiguration.Globals;
      head?: NuxtConfiguration.Head;
      hooks?: NuxtConfiguration.Hooks;
      ignorePrefix?: string;
      ignore?: string[];
      layoutTransition?: Transition;
      loading?: NuxtConfiguration.Loading | false | string;
      loadingIndicator?: NuxtConfiguration.LoadingIndicator | false | string;
      mode?: 'spa' | 'universal';
      modern?: 'client' | 'server' | boolean;
      modules?: NuxtConfiguration.Module[];
      modulesDir?: string[];
      plugins?: NuxtConfiguration.Plugin[];
      render?: NuxtConfiguration.Render;
      rootDir?: string;
      router?: NuxtConfiguration.Router;
      srcDir?: string;
      transition?: Transition;
      'vue.config'?: {
        silent?: boolean;
        optionMergeStrategies?: any;
        devtools?: boolean;
        productionTip?: boolean;
        performance?: boolean;
        ignoredElements?: Array<string | RegExp>;
        keyCodes?: {[key: string]: number | number[]};
        async?: boolean;
        errorHandler?(err: Error, vm: Vue, info: string): void;
        warnHandler?(msg: string, vm: Vue, trace: string): void;
      };
      watch?: string[];
      watchers?: NuxtConfiguration.Watchers;
    };
    security?: {
      domainWhiteList?: string[];
      protocolWhiteList?: string[];
      csrf?: {
        enable?: boolean;
        useSession?: boolean;
        ignoreJSON?: boolean;
        cookieDomain?: string | ((ctx: Context) => string);
        cookieName?: string;
        sessionName?: string;
        headerName?: string;
        bodyName?: string;
        queryName?: string;
      };
      // csrf,hsts,methodnoallow,noopen,nosniff,csp,xssProtection,xframe,dta
      defaultMiddleware?: string;
      xframe?: {enable?: boolean; value?: 'SAMEORIGIN' | 'DENY' | 'ALLOW-FROM'};
      hsts?: {enable?: boolean; maxAge?: number; includeSubdomains?: boolean};
      dta?: {enable?: boolean};
      methodnoallow?: {enable?: boolean};
      noopen?: {enable?: boolean};
      nosniff?: {enable?: boolean};
      referrerPolicy?: {enable?: boolean; value?: string};
      xssProtection?: {enable?: boolean; value?: string};
      csp?: {enable?: boolean; policy: {[key: string]: any}};
      ssrf?: {ipBlackList?: string; checkAddress?: string};
    };
    /**
     *
     * GlobalValues对象
     * 会自动创建路由:
     * /GlobalValues.json:返回该对象的map和数组格式
     * @type {*}
     * @memberof EggAppConfig
     */
    globalValues?: any;
    /**
     *
     * 小程序配置
     * @type {{
     *       [appCode: string]: WxMiniConfig
     *     }}
     * @memberof EggAppConfig
     */
    wxMini?: {
      [appCode: string]: WxMiniConfig;
    };
    /**
     * 默认小程序编码
     * 使用默认的 小程序二维码路由时，如果不传入code参数,将使用此编码的配置
     */
    defWxMiniAppCode?: string;
    /**
     *
     * 企业微信配置
     * @type {{
     *       [appCode: string]: WxOrganConfig;
     *     }}
     * @memberof EggAppConfig
     */
    wxOrgan?: {
      [appCode: string]: WxOrganConfig;
    };
    /**
     *
     * 默认企业微信编码
     * @type {string}
     * @memberof EggAppConfig
     */
    defWxOrganAppCode?: string;
    /**
     *
     * 公众号配置
     * @type {{
     *       [appCode: string]: WxConfig;
     *     }}
     * @memberof EggAppConfig
     */
    wx?: {
      [appCode: string]: WxConfig;
    };
    /**
     *
     * 默认公众号编码
     * @type {string}
     * @memberof EggAppConfig
     */
    defWxAppCode?: string;
    /**
     *
     * 微信支付配置
     *
     * 回调代码自动加锁
     *
     * 所有金额不需要单位为分，按元即可
     *
     * 支付回调：sub-async/${ appCode }-pay-hook.ts 参数: WxPayHook, 下单时传入的dataCache
     * 退款回调：sub-async/${ appCode }-ref-hook.ts 参数: WxRefHook
     *
     * 回调方法不抛出异常时，会通知微信处理成功
     * 回调方法的this都指向Context,可直接调用this.service.userService
     * 但是没有用户会话对象
     *
     * @type {{
     *       [appCode: string]: WxPayOption
     *     }}
     * @memberof EggAppConfig
     */
    wxPay?: {
      [appCode: string]: WxPayOption;
    };
    /**
     *
     * 默认微信支付对象编码
     * @type {string}
     * @memberof EggAppConfig
     */
    defWxPayAppCode?: string;
  }
  interface Context extends ExtendContextType {
    /** 当前连接的socket链接 */
    socket: Socket;
    /** 当前登录用户 */
    me: BaseUser;
    /**
     * 登录
     * @param {BaseUser} user
     * @param {boolean} [notify] 是否发出登陆通知？默认true
     * @memberof Context
     */
    login(user: BaseUser, notify?: boolean);
    /** 登出 */
    logout();
    /** 执行nuxt渲染 */
    nuxt(): Promise<any>;
    /** 获取会话token */
    getDevid(): string | null;
    /** 添加缓存 */
    setCache(key: string, value: string, redisName?: 'user' | 'other', minutes?: number): Promise<void>;
    /** 设置cookie */
    setCookie(key: string, value: string);
    /** 删除cookie */
    removeCookie(key: string);
    /** 获取缓存 */
    getCache(key: string, redisName?: 'user' | 'other'): Promise<string | null>;
    /** 获取cookie */
    getCookie(key: string);
    /** 删除缓存 */
    delCache(key: string, redisName?: 'user' | 'other', minutes?: number): Promise<void>;
    /** 根据会话令牌获取用户 */
    getUser(devid: string): Promise<BaseUser>;
    /** 获取userid已经登陆的devid */
    getDevids(userid: string | number): Promise<string[] | null>;
    /** 获取userid已经登陆的个人信息 */
    getLoginInfos(userid: string | number): Promise<BaseUser[] | null>;
    /** 删除某人的登录信息,host表示因为哪个IP导致 */
    dickOut(user: BaseUser, host?: string): Promise<void>;
    /**
     *
     * 发出同步事件
     * 与emitSync不同，emitSync是异步且无法获取到订阅者的返回值,且可能发送给其他进程
     * emitASync只能发送给同一个进程
     * this指向当前上下文
     * 返回 事件方法的返回值
     *
     * @param {string} name
     * @param {...any[]} args
     * @returns {*}
     * @memberof Application
     */
    emitASync(name: string, ...args: any[]): Promise<any>;
    /** 执行流程,this指向当前上下文 */
    doFlow(
      param: {
        flowPath: string;
        flowParam: {
          remark: string;
        };
        bizParam: any;
        dataFlow?: any;
        conn?: any;
      }
    ): Promise<any>;
  }
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  interface IService {
    /** 内置的一个mongoservice */
    paasMongoService: BaseMongoService;
    /** 内置的一个mysqlservice */
    paasService: PaasService;
  }
}
/** 空promise方法 */
export function emptyPromise(): Promise<any>;
/** promise化任何函数 */
export function promise<T>(this: any, {fn, target, last = true}: {fn: (...args: any[]) => any; target?: any; last?: boolean}): (...args: any[]) => Promise<T>;
/** 线程级休眠 */
export function sleep(time: number): Promise<{void}>;
/** 转换为数字 */
export function num(val: any, def = 0): number;
/** 最大值 */
export function max(...args: any[]): number;
/** 最小值 */
export function min(...args: any[]): number;
/** 除法 */
export function div(...args: any[]): number;
/** 加法 */
export function add(...args: any[]): number;
/** 乘法 */
export function mul(...args: any[]): number;
/** 减法 */
export function sub(...args: any[]): number;
/** 四舍五入 */
export function round(number: any, numDigits: number, upOrDown = 0): number;
/** 金钱格式化可用样式 */
export enum MoneyStyle {currency, decimal, percent}
/** 金钱格式化 */
export function money(value: any, style: MoneyStyle = MoneyStyle.currency, currency: string = 'CNY', prefix: number = 2, def: number = 0): string;
/** 计算链生成 */
export function calc(result: any): Bus;
/** 计算两个地理信息点之间距离 */
export function getGeo(p1: Point, p2: Point): number;

/** 时间格式字符 YYYY-MM-DD HH:mm:ss */
export const dateTime: string;
/** 时间格式字符 YYYY-MM-DDTHH:mm:ss */
export const dateXSDTime: string;
/** 时间格式字符 YYYY-MM-DD */
export const date: string;
/** 当前时间 YYYY-MM-DD HH:mm:ss */
export function nowTime(): string;
/** 当前时间 YYYY-MM-DD */
export function nowDate(): string;
/** 当前xml时间 YYYY-MM-DDTHH:mm:ss */
export function nowTimeXSD(): string;

/** 对象克隆 */
export function copyBean<T>(source: any, classType: any): T;
/** 类型转换 */
export function convertBean<T>(source: any, classType: any): T;
/** 批量类型转换 */
export function convertBeans<T>(source: any[], classType: any, cb?: (target: T, source: any) => void): T[];
/** 返回一个类的空对象 */
export function emptyBean<T>(classType: any): T;
/** 将一个json数组提取为一个json对象 */
export function createBeanFromArray<T>(source: any[], key: string, value: string): {[name: string]: T};
/** 转换复合对象为指定bean */
export function coverComplexBean<T>(source: any, classType: any): {data: T; array: {[key: string]: any[]}};
/** 将目标对象中为空的字段替换为source中对应key的值或者函数返回值 */
export function fixEmptyPrototy(target: any, source: {[key: string]: any}): Promise<void>;

/** mysql service的数据源 */
export function DataSource(clazz: any, tableName: string, ...idNames: string[]);
/** mongodb service的数据源 */
export function Mongo(clazz: any, tableName: string, dbName?: string);
/** 实体类中忽略ORM的字段标记 */
export function Transient();
/** 过滤一个实体类中非ORM字段 */
export function BuildData(target: any, emptySkip: boolean = false): any;
export const TransientMeda: symbol;
/** service的逻辑删除设置 */
export function LogicDelete(stateFileName: string, deleteState: string = '0');
/** controller方法上添加锁，只支持单个会话不能重复请求同一个接口 */
export const Lock: () => Decorator;
/** controller方法标记为NUXT渲染 */
export const NUXT: (value?: string) => Decorator;
/** controller方法标记为view渲染 */
export const Render: (path: string, view?: string) => Decorator;
/** controller方法标记为get请求 */
export const Get: (value?: string) => Decorator;
/** controller方法标记为post请求 */
export const Post: (value?: string) => Decorator;
/** controller方法标记为put请求 */
export const Put: (value?: string) => Decorator;
/** controller方法标记为delete请求 */
export const Delete: (value?: string) => Decorator;
/** controller方法标记为patch请求 */
export const Patch: (value?: string) => Decorator;
/** controller方法标记为options请求 */
export const Options: (value?: string) => Decorator;
/** controller方法标记为head请求 */
export const Head: (value?: string) => Decorator;
/** controller方法标记为socket io请求 */
export const IO: (value?: string) => Decorator;
/** controller方法执行前调用哪些过滤器 */
export const Before: (fn: () => (ctx: Context, next: () => Promise<any>) => Promise<void>) => Decorator;
/** controller方法执行后调用哪些过滤器 */
export const After: (fn: () => (ctx: Context, next: () => Promise<any>) => Promise<void>) => Decorator;
/** controller方法相应的content-type*/
export const ContentType: (value?: string) => Decorator;
/** controller上统一设置每个方法执行前的过滤器 */
export const BeforeAll: (...fns: Array<() => (ctx: Context, next: () => Promise<any>) => Promise<void>>) => any;
/** controller上统一设置每个方法执行后的过滤器 */
export const AfterAll: (...fns: Array<() => (ctx: Context, next: () => Promise<any>) => Promise<void>>) => any;
/** controller上统一设置每个方法请求地址的前缀，默认为 controller文件名 替换掉controller关键字，并首字母小写 */
export const Prefix: (path: string) => any;
/** service、controller的方法缓存设置 */
export const ContextMethodCache: (config: {
  /** 返回缓存key,参数同方法的参数。可以用来清空缓存。 */
  key: (...args: any[]) => string;
  /** 返回缓存清除key,参数同方法的参数。可以用来批量清空缓存 */
  clearKey?: (...args: any[]) => string[];
  /** 自动清空缓存的时间，单位分钟 */
  autoClearTime?: number;
}) => Decorator;
/** 生成uuid */
export function uuid(): string;
/** 从http://127.0.0.1?key=3333得到key的值  */
export function getPicKey(uri: string): string;
/** 去掉空格，是否是空字符串,null\undefined都算空的, */
export function emptyString(source: any): boolean;
/** 去掉空格，是否是非空字符串,null\undefined都算空的 */
export function notEmptyString(source: any): boolean;
/** 将单引号去除 */
export function safeString(source?: string): string;
/** 生成指定位数的随机数 */
export function randomNumber(len: number): string;
/** 构建微信发送消息字符串 */
export function buildWxStr(data: {[key: string]: string}, maxLabelLength: number, ...titles: string[]): string;
/** 将枚举转换为json,例如GlobalValues */
export function enumToJson(enums: any): EnmuJson;
/** 替换中标点符号为英文的 */
export function replaceChineseCode(str: string): string;

/**
 *
 * 编译
 * 项目的tsconfig.json中必须声明："outDir": "./serviceDistDir",
 * 最终输出目录是 ../serviceDistDir
 * @export
 * @param {string} serviceDistDir 编译输出目录：etc 'service-dist'
 * @param {string[]} [resources]  复制资源文件：etc ['pkg.json']
 * @param {string[]} [dirs] 复制资源文件夹：etc ['app/util/amazon', 'app/util/aws-xml-ejs', 'app/pem']
 * @returns {Promise<void>}
 */
export function ci(serviceDistDir: string, resources?: string[], dirs?: string[]): Promise<void>;
/** 内置socket 房间编号 */
export const SocketRoom: {SOCKET_ALL: string; SOCKET_USER: string; SOCKET_DEV: string};
