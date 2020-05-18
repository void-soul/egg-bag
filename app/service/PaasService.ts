import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import svgCaptcha = require('svg-captcha');
import {FlowContext} from 'typings';
import * as lodash from 'lodash';
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

  public async initFlow(context: FlowContext<any, any, any>) {
    this.app.throwIf(!context.flowCode, '请指定流程');
    const flow = this.app._flowMap[context.flowCode];
    this.app.throwIf(!flow, '请指定流程');
    const fromNode = context.fromNodeCode ? flow.nodes[context.fromNodeCode] : flow.startNode;
    this.app.throwIf(!fromNode, '请指定起始节点');
    lodash.assignWith(context, {
      ctx: this.ctx,
      service: this.ctx.service,
      app: this.app,
      returnValue: {},
      data: {},
      flow,
      fromNode,
      actions: flow.flowConfig[context.fromNodeCode || flow.startNodeCode],
      field: {},
      notice: [],
      todo: [],
      logs: []
    }, (objValue: any, srcValue: any) => lodash.isUndefined(srcValue) ? objValue : srcValue);
    if (fromNode.init) {
      if (context.conn) {
        lodash.assign(fromNode, context);
        await fromNode.init();
      } else {
        await this.transction(async conn => {
          lodash.assign(context, {conn});
          lodash.assign(fromNode, context);
          await fromNode.init();
        });
      }
    }

    return {
      data: context.data,
      returnValue: context.returnValue,
      flowCode: context.flowCode,
      fromNodeCode: context.fromNodeCode,
      toNodeCode: context.toNodeCode,
      actions: context.actions,
      fields: context.field
    };
  }
  public async doFlow(context: FlowContext<any, any, any>) {
    this.app.throwIf(!context.flowCode, '请指定流程');
    const flow = this.app._flowMap[context.flowCode];
    this.app.throwIf(!flow, '请指定流程');
    const fromNode = context.fromNodeCode ? flow.nodes[context.fromNodeCode] : flow.startNode;
    this.app.throwIf(!flow, '请指定节点');
    this.app.throwIf(!context.toNodeCode, '请指定目标节点');

    lodash.assignWith(context, {
      ctx: this.ctx,
      service: this.ctx.service,
      app: this.app,
      returnValue: {},
      data: {},
      flow,
      fromNode,
      actions: [],
      field: {},
      notice: [],
      todo: [],
      logs: []
    }, (objValue: any, srcValue: any) => lodash.isUndefined(srcValue) ? objValue : srcValue);

    if (context.conn) {
      lodash.assign(fromNode, context);
      await this._doFlow(context);
    } else {
      await this.transction(async conn => {
        lodash.assign(context, {conn});
        lodash.assign(fromNode, context);
        await this._doFlow(context);
      });
    }
  }

  private async _doFlow(context: FlowContext<any, any, any>) {
    if (context.actionid) {
      const action = context.flow.flowConfig[context.fromNodeCode].find(item => item.id === context.actionid);
      if (action) {
        context.logs.push(action.label);
      }
    }
    const toNodeCode = context.toNodeCode;
    const toNode = context.flow.nodes[toNodeCode];
    if (toNode) {
      lodash.assign(context, {toNode});
      context.todo.length = 0;
      context.notice.length = 0;
      const actions = context.flow.flowConfig[context.toNodeCode];
      try {
        await toNode.enter();
        await toNode.todo();
        await toNode.notice();
        this.app.throwIf(toNodeCode !== context.toNodeCode, '不能直接修改toNode!');
        if (actions.length === 1) { // 单向操作!
          const action = actions[0];
          if (action.to && action.to !== context.toNodeCode) {
            lodash.assign(context, {
              toNodeCode: action.to,
              fromNodeCode: toNodeCode,
              fromNode: toNode,
              actionid: action.id
            });
            await this._doFlow(context);
          }
        } else if (actions.length > 1) { // 多个操作，找默认
          const defAction = actions.find(item => item.def);
          if (defAction && defAction.to && defAction.to !== context.toNodeCode) {
            const tryNode = context.flow.nodes[defAction.to];
            await tryNode.todo();
            if (context.todo.includes(this.ctx.me)) {
              lodash.assign(context, {
                toNodeCode: defAction.to,
                fromNodeCode: toNodeCode,
                fromNode: toNode,
                actionid: defAction.id
              });
              await this._doFlow(context);
            }
          }
        }
      } catch (error) { // 发生错误：看是否有异常处理流转
        context.error = error;
        const errorAction = actions.find(item => item.error);
        if (errorAction && errorAction.to && errorAction.to !== context.toNodeCode) {
          lodash.assign(context, {
            toNodeCode: errorAction.to,
            fromNodeCode: toNodeCode,
            fromNode: toNode,
            actionid: errorAction.id
          });
          await this._doFlow(context);
        } else { // 没有流转，直接抛出
          throw error;
        }
      }
    } else {
      const autoNode = context.flow.autoNodes[toNodeCode];
      if (autoNode) {
        lodash.assign(context, {toNode: autoNode});
        const newToNodeCode = await autoNode.enter();
        if (newToNodeCode && toNodeCode !== newToNodeCode) {
          lodash.assign(context, {
            toNodeCode: newToNodeCode,
            fromNodeCode: toNodeCode,
            fromNode: autoNode,
            actionid: undefined
          });
          await this._doFlow(context);
        }
      } else if (toNodeCode === context.flow.endNodeCode && context.flow.endNode) {
        lodash.assign(context, {toNode: context.flow.endNode});
        await context.flow.endNode.enter();
      }
    }
  }
}
