import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import {FlowContext, SqlSession} from '../../typings';
import svgCaptcha = require('svg-captcha');
const debug = require('debug')('egg-bag');
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

  public async doFlow<D, R>(
    {flowPath, conn, data, returnValue, error}: {
      flowPath: string;
      conn?: SqlSession;

      data?: D;
      returnValue?: R;
      error?: Error;
    }): Promise<R> {
    const flowCodes = flowPath.split('/');
    this.app.throwIf(flowCodes.length !== 3, `error flow: ${ flowPath }`);
    const flowCode = flowCodes.length === 3 ? flowCodes[0] : flowCodes[1];
    const fromNode = flowCodes.length === 3 ? flowCodes[1] : flowCodes[2];
    const actionCode = flowCodes.length === 3 ? flowCodes[2] : flowCodes[3];
    const dir = flowCodes[0];
    this.app.throwIf(!this.app._flowActionMap[flowPath], `not found flow: ${ flowPath }`);
    debug(`start do flow: ${ flowPath }`);
    if (conn) {
      const result = await this._doFlow({
        dir, flowCode, fromNode, actionCode, flowPath, conn, data, returnValue, error
      });
      debug(`over do flow: ${ flowPath }`);
      return result;
    } else {
      const result = await this.transction(async conn2 => {
        return await this._doFlow({
          dir, flowCode, fromNode, actionCode, flowPath, conn: conn2, data, returnValue, error
        });
      });
      debug(`over do flow: ${ flowPath }`);
      return result;
    }
  }

  private async _doFlow<D, R>({dir, flowCode, fromNode, actionCode, flowPath, data, returnValue, conn, error}: {
    dir: string;
    flowCode: string;
    fromNode: string;
    actionCode: string;
    flowPath: string;

    data?: D;
    returnValue?: R;
    conn?: SqlSession;
    error?: Error;
  }): Promise<R> {
    const context = {
      ctx: this.ctx,
      service: this.service,
      app: this.app,
      actionCode,
      fromNode,
      flowCode,
      actionInfo: this.app.getFlowAction(dir, flowCode, flowCode, actionCode),
      conn,

      data: data || {} as D,
      returnValue: returnValue || {} as R,
      error
    } as FlowContext<D, R>;
    await this.app._flowActionMap[flowPath].excute.call(context);
    return context.returnValue;
  }
}
