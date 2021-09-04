import * as fs from 'fs';
import * as md5 from 'md5';
import * as path from 'path';
import {Application, Controller} from 'egg';
import {mul, div} from '../util/math';
import {notEmptyString, randomString} from '../util/string';
import {WxPayOption, WxCreatedorder, WxOrder, WxCreateOrderResult, WxOrderQuery, WxCreateRefundOrder, WxRefundOrderQuery, WxRefundOrder, WxPayHook, WxRefHook, WxRefResult, WxPayToUser} from '../../typings';
import rp = require('request-promise');
import Xml2Js = require('xml2js');
import {omit} from 'lodash';
import {EggInstall} from '../util/shell';
import IParseBody from '../middleware/IParseBody';
import {createDecipheriv} from 'crypto';
import {nowTime} from '../util/now';
const parser = new Xml2Js.Parser({trim: true, explicitArray: false, explicitRoot: false});
const builder = new Xml2Js.Builder({xmldec: {version: '1.0'}, rootName: 'xml', cdata: true});
const sign_type = 'MD5';
const omitProps = ['return_code', 'return_msg', 'appid', 'mch_id', 'nonce_str', 'sign', 'result_code', 'err_code', 'err_code_des', 'trade_type'];
const moneyProps = ['total_fee', 'amount', 'settlement_total_fee', 'cash_fee', 'coupon_fee', 'refund_fee', 'settlement_refund_fee', 'coupon_refund_fee'];
const urls = {
  micropay: 'https://api.mch.weixin.qq.com/pay/micropay',
  reverse: 'https://api.mch.weixin.qq.com/secapi/pay/reverse',
  unifiedorder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
  orderquery: 'https://api.mch.weixin.qq.com/pay/orderquery',
  closeorder: 'https://api.mch.weixin.qq.com/pay/closeorder',
  refund: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
  refundquery: 'https://api.mch.weixin.qq.com/pay/refundquery',
  downloadbill: 'https://api.mch.weixin.qq.com/pay/downloadbill',
  downloadfundflow: 'https://api.mch.weixin.qq.com/pay/downloadfundflow',
  send_coupon: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/send_coupon',
  query_coupon_stock: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/query_coupon_stock',
  querycouponsinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/querycouponsinfo',
  transfers: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers',
  gettransferinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gettransferinfo',
  sendredpack: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendredpack',
  sendgroupredpack: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/sendgroupredpack',
  gethbinfo: 'https://api.mch.weixin.qq.com/mmpaymkttransfers/gethbinfo',
  paybank: 'https://api.mch.weixin.qq.com/mmpaysptrans/pay_bank',
  querybank: 'https://api.mch.weixin.qq.com/mmpaysptrans/query_bank',
  getpublickey: 'https://fraud.mch.weixin.qq.com/risk/getpublickey',
  combinedorder: 'https://api.mch.weixin.qq.com/pay/combinedorder'
};
export class WxPay {
  option: WxPayOption;
  notify_url: string;
  private app: Application;
  private appCode: string;
  private certBuffer: Buffer;
  constructor (app: Application, appCode: string) {
    this.appCode = appCode;
    this.app = app;
    this.option = app.config.wxPay![appCode];
    this.option.cert = path.join(app.baseDir, 'app', 'cert', this.option.cert);
    app.throwIfNot(fs.existsSync(this.option.cert), `微信支付应用${ appCode }不存在`);
    this.certBuffer = fs.readFileSync(this.option.cert);
    this.installRoute(app, appCode);
  }
  async transfers(option: WxPayToUser) {
    const params = this.buildParam({
      ...option
    }, 'mch_appid', 'mchid', false);
    return await this.request('transfers', params, true);
  }
  async unifiedorder(wxOrderOption: WxCreatedorder, dataCache?: {[key: string]: any}, devid?: string): Promise<WxCreateOrderResult> {
    const params = this.buildParam({
      ...wxOrderOption,
      fee_type: 'CNY',
      notify_url: `${ this.app.config.baseUri }pay-hook/wx/${ this.appCode }.html`,
      scene_info: wxOrderOption.scene_info ? JSON.stringify(wxOrderOption.scene_info) : '',
      trade_type: this.option.trade_type
    });
    if (dataCache) {
      await this.app.setCache(`${ wxOrderOption.out_trade_no }-wx-pay-${ this.appCode }`, JSON.stringify(dataCache), 'static', 120);
    }
    if (devid) {
      await this.app.setCache(`${ wxOrderOption.out_trade_no }-wx-pay-${ this.appCode }-devid`, devid, 'static', 120);
    }

    const response = await this.request('unifiedorder', params);
    let jsapi: any;
    let app: any;
    if (this.option.trade_type === 'JSAPI') {
      const param = {
        appId: params.appid,
        timeStamp: `${ Math.floor(Date.now() / 1000) }`,
        nonceStr: randomString(32),
        package: `prepay_id=${ response.prepay_id }`,
        signType: 'MD5'
      };
      jsapi = {
        ...param,
        paySign: this.sign(param)
      };
    } else if (this.option.trade_type === 'APP') {
      const param = {
        appid: params.appid,
        partnerid: params.mch_id,
        prepayid: response.prepay_id,
        package: 'Sign=WXPay',
        noncestr: randomString(32),
        timestamp: `${ +new Date() / 1000 }`
      };
      app = {
        ...param,
        paySign: this.sign(param)
      };
    }
    return {
      jsapi,
      app,
      prepay_id: response.prepay_id,
      code_url: response.code_url,
      mweb_url: response.mweb_url,
      dataCacheId: `${ wxOrderOption.out_trade_no }-wx-pay-${ this.appCode }`,
      devCacheId: `${ wxOrderOption.out_trade_no }-wx-pay-${ this.appCode }-devid`
    };
  }
  async orderquery(option: WxOrderQuery): Promise<WxOrder> {
    this.app.throwIf(!option.transaction_id && !option.out_trade_no, '微信订单id和商户订单id必须传递一个!');
    const params = this.buildParam({...option});
    return await this.request('orderquery', params);
  }
  async closeorder(out_trade_no: string) {
    const params = this.buildParam({
      out_trade_no
    });
    await this.request('closeorder', params);
  }
  async cancelorder(out_trade_no: string) {
    await this.app.delCache(`${ out_trade_no }-wx-pay-${ this.appCode }`, 'static');
    await this.app.delCache(`${ out_trade_no }-wx-pay-${ this.appCode }-devid`, 'static');
    try {
      await this.closeorder(out_trade_no);
    } catch (error: any) {
      this.app.coreLogger.error(error);
    }
  }
  async refund(option: WxCreateRefundOrder, dataCache?: {[key: string]: any}, devid?: string): Promise<WxRefResult> {
    const params = this.buildParam({
      ...option,
      notify_url: `${ this.app.config.baseUri }ref-hook/wx/${ this.appCode }.html`,
    });
    if (dataCache) {
      await this.app.setCache(`${ option.out_refund_no }-wx-ref-${ this.appCode }`, JSON.stringify(dataCache), 'static');
    }
    if (devid) {
      await this.app.setCache(`${ option.out_refund_no }-wx-ref-${ this.appCode }-devid`, devid, 'static');
    }
    await this.request('refund', params, true);
    return {
      dataCacheId: `${ option.out_refund_no }-wx-ref-${ this.appCode }`,
      devCacheId: `${ option.out_refund_no }-wx-ref-${ this.appCode }-devid`
    };
  }
  async resetDataCache(dataCache: {[key: string]: any}, dataCacheId: string) {
    await this.app.setCache(dataCacheId, JSON.stringify(dataCache), 'static', 120);
  }
  async resetDevIdCache(devid: string, devCacheId: string) {
    await this.app.setCache(devCacheId, devid, 'static', 120);
  }
  async refundquery(option: WxRefundOrderQuery): Promise<WxRefundOrder> {
    const params = this.buildParam({...option});
    return await this.request('refundquery', params);
  }

  private sign(param: {[key: string]: string | undefined | number}): string {
    return md5(`${ Object.keys(param).filter((item) => notEmptyString(param[item]) && item !== 'sign').sort().map((item) => `${ item }=${ param[item] }`).join('&') }&key=${ this.option.appSecret }`).toUpperCase();
  }
  private async request(name: string, params: any, cert = false, strict = true) {
    const response = await rp({
      uri: urls[name],
      method: 'POST',
      body: builder.buildObject(params),
      agentOptions: cert ? {
        pfx: this.certBuffer,
        passphrase: this.option.mch_id
      } : undefined
    });
    return await this.parseData(response, name, {
      strict
    });
  }
  private async parseData(data: string, name: string, option: {
    strict?: boolean; encry?: boolean; sign?: boolean;
  }) {
    let response = await parser.parseStringPromise(data);
    if (option.strict === true) {
      this.app.throwIf(response.return_code === 'FAIL', `${ this.appCode }-${ name }-${ response.return_code }-${ response.return_msg }`);
      this.app.throwIf(response.result_code === 'FAIL', `${ this.appCode }-${ name }-${ response.result_code }-${ response.err_code_des }`);
      this.app.throwIf(response.err_code, `${ this.appCode }-${ name }-${ response.err_code }-${ response.err_code_des }`);
      this.app.throwIf(response.appid !== undefined && response.appid !== this.option.appid, `${ this.appCode }-${ name }-提交(${ this.option.appid })、返回(${ response.appid })的appid不符`);
      this.app.throwIf(response.mch_id !== undefined && response.mch_id !== this.option.mch_id, `${ this.appCode }-${ name }-提交(${ this.option.mch_id })、返回(${ response.mch_id })的mch_id不符`);
    }
    if (option.sign === true) {
      const sign = this.sign(response);
      this.app.throwIf(sign !== response.sign, `${ this.appCode }-${ name }-签名不符-验证${ sign }-返回${ response.sign }`);
    }
    if (option.encry === true) {
      const key = md5(this.option.appSecret).toLowerCase();
      const decipher = createDecipheriv('aes-256-ecb', key, '');
      decipher.setAutoPadding(true);
      const encryData = decipher.update(response.req_info, 'base64', 'utf8') + decipher.final('utf8');
      response = await parser.parseStringPromise(encryData);
    }
    const array: {[key: string]: {[key: string]: any}} = {};
    const needToSkipKeys = new Array<string>();
    for (const key of Object.keys(response)) {
      const matchs = key.match(/_(\d+)/g);
      if (matchs) {
        needToSkipKeys.push(key);
        const realKey = key.replace(matchs.join(''), '');
        const realValue = moneyProps.includes(realKey) ? div(response[key], 100) : response[key];
        matchs.map((item) => item.replace('_', ''));
        if (!array[matchs[0]]) {
          array[matchs[0]] = {};
        }
        if (matchs[1]) {
          if (!array[matchs[0]].array) {
            array[matchs[0]].array = {};
          }
          if (!array[matchs[0]].array[matchs[1]]) {
            array[matchs[0]].array[matchs[1]] = {};
          }
          array[matchs[0]].array[matchs[1]][realKey] = realValue;
        } else {
          array[matchs[0]][realKey] = realValue;
        }
      } else if (moneyProps.includes(key)) {
        response[key] = div(response[key], 100);
      }
    }
    for (const key of Object.keys(array)) {
      if (array[key].array) {
        array[key].children = Object.values(array[key].array);
        delete array[key].array;
      }
    }
    const result = omit<{[key: string]: any}>(response, [...omitProps, ...needToSkipKeys]);
    const child = Object.values(array);
    if (child.length > 0) {
      result.children = Object.values(array);
    }
    return result as any;
  }
  /**
   *
   * @param param 业务基本参数
   * @param appid 应用ID参数名称
   * @param mch_id  商户ID参数名称
   * @param sign_typeNeed sign_type是否需要?
   * @returns
   */
  private buildParam(param: {[key: string]: string | undefined | number}, appid = 'appid', mch_id = 'mch_id', sign_typeNeed = true): {
    [key: string]: string | undefined | number;
  } {
    Object.assign(param, {nonce_str: randomString(32)});
    param[mch_id] = this.option.mch_id;
    if (appid) {
      param[appid] = this.option.appid;
    }
    if (sign_typeNeed === true) {
      param.sign_type = sign_type;
    }
    Object.keys(param).filter((key) => moneyProps.includes(key)).forEach((key) => {
      param[key] = mul(param[key], 100);
    });
    param.sign = this.sign(param);
    return param;
  }
  private installRoute(app: Application, appCode: string) {
    // tslint:disable-next-line: no-this-assignment
    const that = this;
    EggInstall({
      path: `/pay-hook/wx/${ appCode }.html`,
      method: 'post',
      before: [IParseBody],
      type: 'application/xml; charset=utf-8',
      async handel(this: Controller) {
        if (!this.ctx.bufferBody) {
          return builder.buildObject({return_code: 'FAIL', return_msg: 'miss bufferBody'});
        } else {
          const data = await that.parseData(this.ctx.bufferBody.join(''), 'pay-hook', {strict: true, sign: true}) as WxPayHook;
          try {
            const lock = await this.app.getCache(`${ data.transaction_id }-wx-pay-hook`, 'static');
            if (lock) {
              this.app.coreLogger.error(`wx-pay-hook(${ data.transaction_id })locked-${ lock }`);
              return builder.buildObject({return_code: 'FAIL', return_msg: `locked-${ lock }`});
            }
            await this.app.setCache(`${ data.transaction_id }-wx-pay-hook`, `${ appCode }-${ nowTime() }`, 'static');
            let dataCache: any;
            const dataCacheStr = await this.app.getCache(`${ data.out_trade_no }-wx-pay-${ appCode }`, 'static');
            if (dataCacheStr) {
              dataCache = JSON.parse(dataCacheStr);
            }
            const devid = await this.app.getCache(`${ data.out_trade_no }-wx-pay-${ appCode }-devid`, 'static');
            if (devid) {
              await this.app.emitASyncWithDevid(`${ appCode }-pay-hook`, devid, data, dataCache);
            } else {
              await this.app.emitASync(`${ appCode }-pay-hook`, data, dataCache);
            }
            await this.app.delCache(`${ data.out_trade_no }-wx-pay-${ appCode }`, 'static');
            await this.app.delCache(`${ data.out_trade_no }-wx-pay-${ appCode }-devid`, 'static');
            return builder.buildObject({return_code: 'SUCCESS', return_msg: 'OK'});
          } catch (error: any) {
            this.app.coreLogger.error(error);
            return builder.buildObject({return_code: 'FAIL', return_msg: error.message});
          } finally {
            await this.app.delCache(`${ data.transaction_id }-wx-pay-hook`, 'static');
          }
        }
      }
    }, app);
    EggInstall({
      path: `/ref-hook/wx/${ appCode }.html`,
      method: 'post',
      before: [IParseBody],
      async handel(this: Controller) {
        if (!this.ctx.bufferBody) {
          return builder.buildObject({return_code: 'FAIL', return_msg: 'miss bufferBody'});
        } else {
          const data = await that.parseData(this.ctx.bufferBody.join(''), 'ref-hook', {strict: true, encry: true}) as WxRefHook;
          try {
            const lock = await this.app.getCache(`${ data.refund_id }-wx-ref-hook`, 'static');
            if (lock) {
              this.app.coreLogger.error(`wx-ref-hook(${ data.refund_id })locked-${ lock }`);
              return builder.buildObject({return_code: 'FAIL', return_msg: `locked-${ lock }`});
            }
            await this.app.setCache(`${ data.refund_id }-wx-ref-hook`, `${ appCode }-${ nowTime() }`, 'static');

            let dataCache: any;
            const dataCacheStr = await this.app.getCache(`${ data.out_refund_no }-wx-ref-${ appCode }`, 'static');
            if (dataCacheStr) {
              dataCache = JSON.parse(dataCacheStr);
            }
            const devid = await this.app.getCache(`${ data.out_refund_no }-wx-ref-${ appCode }-devid`, 'static');
            if (devid) {
              await this.app.emitASyncWithDevid(`${ appCode }-ref-hook`, devid, data, dataCache);
            } else {
              await this.app.emitASync(`${ appCode }-ref-hook`, data, dataCache);
            }
            await this.app.delCache(`${ data.out_refund_no }-wx-ref-${ appCode }-devid`, 'static');
            await this.app.delCache(`${ data.out_refund_no }-wx-ref-${ appCode }`, 'static');
            return builder.buildObject({return_code: 'SUCCESS', return_msg: 'OK'});
          } catch (error: any) {
            this.app.coreLogger.error(error);
            return builder.buildObject({return_code: 'FAIL', return_msg: error.message});
          } finally {
            await this.app.delCache(`${ data.refund_id }-wx-ref-hook`, 'static');
          }
        }
      }
    }, app);
  }
}
