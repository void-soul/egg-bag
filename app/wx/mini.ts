import {Application} from 'egg';
import {BaseWx} from './base';
import {WxMiniConfig, WxLiveInfo, WxLiveReplay} from '../../typings';
import crypto = require('crypto');
export class WxMini extends BaseWx {
  protected name = 'wxMini';
  private config: WxMiniConfig;
  private templNameCache: {[name: string]: {page: string; tmplId: string}[]}; // 订阅消息缓存
  private templKeyCache: {[key: string]: string[]}; // 订阅消息场景分组id
  constructor (app: Application, appCode: string) {
    super(app, appCode);
    this.config = app.config.wxMini![appCode];
    this.tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${ this.config.appId }&secret=${ this.config.appSecret }`;
    this.templNameCache = {};
    this.templKeyCache = {};
    if (this.config.messages) {
      for (const item of this.config.messages) {
        if (!this.templNameCache[item.name]) {
          this.templNameCache[item.name] = [];
        }
        this.templNameCache[item.name].push({
          tmplId: item.tmplId,
          page: `pages/${ item.model }/${ item.page }/${ item.page }`
        });
        for (const key of item.keys) {
          if (!this.templKeyCache[key]) {
            this.templKeyCache[key] = [];
          }
          this.templKeyCache[key].push(item.tmplId);
        }
      }
    }
  }
  async getUnlimited({scene, model, page, fullpath, png, width, lineColor}: {scene: string; model?: string; page?: string; fullpath?: string; png?: '0' | '1' | 0 | 1 | true | false | 'true' | 'false'; width?: number; lineColor?: {r: number; g: number; b: number}}) {
    this.app.throwIf(!fullpath && (!model || !page), '路径不完整,fullpath或者model+page必须传一个');
    const pageto = fullpath ?? `pages/${ model }/${ page }/${ page }`;
    return await this.fetch(
      (token: string) => `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${ token }`,
      'post',
      {
        scene,
        page: pageto,
        line_color: lineColor ?? this.config.qrcode?.lineColor,
        is_hyaline: png === 'true' || png === '1' || png === true || png === 1,
        width: width ?? this.config.qrcode?.width ?? 500
      },
      true,
      true
    );
  }
  async sendMs(
    {openids, name, data, scene}: {
      openids: string[];
      name: string;
      data: {[key: string]: string | number};
      scene: string;
    }) {
    const temps = this.templNameCache[name];
    const dataSend: {[key: string]: {value: string | number}} = {};
    for (const [key, value] of Object.entries(data)) {
      dataSend[key] = {value: value ?? ''};
    }
    if (scene) {
      scene = `?${ scene }`;
    } else {
      scene = '';
    }
    for (const temp of temps) {
      for (const touser of openids) {
        await this.fetch(
          (token: string) => `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${ token }`,
          'post',
          {
            touser,
            data: dataSend,
            template_id: temp.tmplId,
            page: `${ temp.page }${ scene }`
          }
        );
      }
    }
  }
  async code2session(code: string): Promise<{openid: string; session_key: string; unionid?: string}> {
    const data = await this.fetch(
      () => `https://api.weixin.qq.com/sns/jscode2session?appid=${ this.config.appId }&secret=${ this.config.appSecret }&js_code=${ code }&grant_type=authorization_code`,
      'get',
      {},
      false
    );
    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid
    };
  }
  getTemplIds() {
    return this.templKeyCache;
  }
  decrypt<T>({sessionKey, encryptedData, iv}: {iv: string; sessionKey: string; encryptedData: string}): T | undefined {
    this.app.throwIf(!sessionKey, '会话过期，请重新登陆!');
    const sessionKeyBuf = new Buffer(sessionKey, 'base64');
    const encryptedDataBuf = new Buffer(encryptedData, 'base64');
    const ivBuf = new Buffer(iv, 'base64');
    try {
      // 解密
      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuf, ivBuf);
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true);
      const decoded = decipher.update(encryptedDataBuf, 'binary', 'utf8') + decipher.final('utf8');
      const decodedData = JSON.parse(decoded);
      this.app.throwIf(decodedData.watermark.appid !== this.config.appId, '加密验证失败');
      return decodedData as T;
    } catch (err) {
      throw new Error('加密验证失败');
    }
  }
  async getLiveInfo(start: number, limit: number): Promise<WxLiveInfo[]> {
    const data = await this.fetch(
      (token: string) => `https://api.weixin.qq.com/wxa/business/getliveinfo?access_token=${ token }`,
      'post',
      {start, limit}
    );
    return data.room_info;
  }
  async getLiveReplay(room_id: number, start: number, limit: number): Promise<WxLiveReplay[]> {
    const data = await this.fetch(
      (token: string) => `https://api.weixin.qq.com/wxa/business/getliveinfo?access_token=${ token }`,
      'post',
      {room_id, start, limit, action: 'get_replay'}
    );
    return data.live_replay;
  }
}
