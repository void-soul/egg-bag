import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import svgCaptcha = require('svg-captcha');
import {SqlSession} from '../../typings';
import {FlowExcute} from '../util/flow';
const debug = require('debug')('egg-bag:base');
/**
 * 说明：PAASservice
 * 作者：dedede
 * 日期：2018-11-4 23:39:59
 * 版本：1.0.0
 * @export
 * @class
 * @extends {BaseService<{}>}
 */
export default class extends BaseService<Empty> {
  public async sendCode(phone: string) {
    const code = randomNumber(4);
    const id = uuid();
    if (this.config.smsDebug === false) {
      await this.sendSms(phone, this.config.ali.CommonCode, {code});
    } else {
      debug(`${ phone }=>${ code }`);
    }
    await this.ctx.setCache(`${ id }-${ phone }`, code, 'other', 5);
    return id;
  }
  public async sendSms(phone: string, TemplateCode: string, params: {[key: string]: string}) {
    const client = new Core({
      accessKeyId: this.config.ali.accessKeyId,
      accessKeySecret: this.config.ali.accessKeySecret,
      endpoint: this.config.ali.endpoint,
      apiVersion: this.config.ali.apiVersion
    });
    if (this.config.smsDebug === false) {
      await client.request('SendSms', {
        RegionId: this.config.ali.RegionId,
        PhoneNumbers: phone,
        SignName: this.config.ali.SignName,
        TemplateCode,
        TemplateParam: JSON.stringify(params)
      }, {method: 'POST'});
    }
  }
  public async validCode(phone: string, id: string, code: string) {
    const codeCache = await this.ctx.getCache(`${ id }-${ phone }`, 'other');
    return codeCache === code;
  }
  public async removeCode(phone: string, id: string) {
    await this.ctx.delCache(`${ id }-${ phone }`, 'other');
  }
  public async picCode(key: string) {
    const code = svgCaptcha.create(this.app.config.picCode);
    await this.ctx.setCache(`${ key }-pic`, code.text, 'other', 5);
    return code.data;
  }
  public async validPicCode(key: string, code: string) {
    const codeCache = await this.ctx.getCache(`${ key }-pic`, 'other');
    return `${ codeCache }`.toLowerCase() === `${ code }`.toLowerCase();
  }
  public async removePicCode(key: string) {
    await this.ctx.delCache(`${ key }-pic`, 'other');
  }
  public async fetchFlow<D, M>({
    flowPath, fromNodeId, fromNodeCode, biz, conn
  }: {
    flowPath: string;
    fromNodeId?: string;
    fromNodeCode?: string;
    biz: D;
    conn?: SqlSession;
  }) {
    if (conn) {
      return (new FlowExcute<D, M>(this.ctx, this.ctx.service, this.app, conn)).fetch({
        flowPath, fromNodeId, fromNodeCode, biz
      });
    } else {
      return await this.transction(async conn2 => {
        return (new FlowExcute<D, M>(this.ctx, this.ctx.service, this.app, conn2)).fetch({
          flowPath, fromNodeId, fromNodeCode, biz
        });
      });
    }
  }
  public async doFlow<D, M>({
    flowPath,
    fromNodeId,
    fromNodeCode,
    actionId,
    actionCode,
    toNodeId,
    toNodeCode,
    biz,
    conn
  }: {
    flowPath: string;
    fromNodeId?: string;
    fromNodeCode?: string;
    actionId?: string;
    actionCode?: string;
    toNodeId?: string;
    toNodeCode?: string;
    biz: D;
    conn?: SqlSession;
  }) {
    if (conn) {
      return (new FlowExcute<D, M>(this.ctx, this.ctx.service, this.app, conn)).do({
        flowPath,
        fromNodeId,
        fromNodeCode,
        actionId,
        actionCode,
        toNodeId,
        toNodeCode,
        biz
      });
    } else {
      return await this.transction(async conn2 => {
        return (new FlowExcute<D, M>(this.ctx, this.ctx.service, this.app, conn2)).do({
          flowPath,
          fromNodeId,
          fromNodeCode,
          actionId,
          actionCode,
          toNodeId,
          toNodeCode,
          biz
        });
      });
    }
  }
}
