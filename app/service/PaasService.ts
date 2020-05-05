import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import {FlowContext} from '../../typings';
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

  public async doFlow(
    {flowPath, flowParam, bizParam, dataFlow, conn}: {
      flowPath: string;
      flowParam: {remark: string};
      bizParam: any;
      dataFlow?: any;
      conn?: any;
    }) {
    const flowCodes = flowPath.split('/');
    const flowCode = flowCodes[0];
    const fromNode = flowCodes[1];
    this.app.throwIf(flowCodes.length !== 2, `error flow: ${ flowPath }`);
    this.app.throwIf(flowCodes.length === 0, `not found flow: ${ flowPath }`);
    this.app.throwIf(!this.app._flowActionMap[flowPath], `not found flow: ${ flowPath }`);

    if (conn) {
      return await this._doFlow({
        flowCode, fromNode, flowPath, flowParam, bizParam, dataFlow, conn
      });
    } else {
      return await this.transction(async conn2 => {
        return await this._doFlow({
          flowCode, fromNode, flowPath, flowParam, bizParam, dataFlow, conn: conn2
        });
      });
    }

    // return await this.transction(async conn => {
    //   const context = {
    //     ctx: this.ctx,
    //     service: this.service,
    //     app: this.app,

    //     flowParam: {
    //       remark: flowParam.remark,
    //       userid: this.ctx.me.userid
    //     },
    //     bizParam,

    //     fromNode,
    //     flowCode,

    //     bizIds: [],
    //     bizDatas: [],
    //     dataFlow: dataFlow || {} as any,

    //     conn
    //   } as FlowContext<any, any, any>;
    //   // 全部执行前

    //   const flow = this.app._flowMap[flowCode];
    //   if (flow && flow.doBeforeAllAction) {
    //     try {
    //       await flow.doBeforeAllAction.call(context);
    //     } catch (error) {
    //       context.error = error;
    //       if (flow.doException) {
    //         await flow.doException.call(context);
    //       } else {
    //         throw error;
    //       }
    //     }
    //   }

    //   // 离开旧节点、进入新节点，同时如果新节点有自动action，则执行
    //   await this.excuteFlowAction(context, flow, flowCode, flowPath);

    //   // 全部执行完毕
    //   if (flow && flow.doAfterAllAction) {
    //     try {
    //       await flow.doAfterAllAction.call(context);
    //     } catch (error) {
    //       context.error = error;
    //       if (flow.doException) {
    //         await flow.doException.call(context);
    //       } else {
    //         throw error;
    //       }
    //     }
    //   }
    //   return context.returnValue;
    // });
  }

  private async _doFlow({flowCode, fromNode, flowPath, flowParam, bizParam, dataFlow, conn}: {
    flowCode: string;
    fromNode: string;
    flowPath: string;
    flowParam: {remark: string};
    bizParam: any;
    dataFlow?: any;
    conn: any;
  }) {
    const context = {
      ctx: this.ctx,
      service: this.service,
      app: this.app,

      flowParam: {
        remark: flowParam.remark,
        userid: this.ctx.me.userid
      },
      bizParam,

      fromNode,
      flowCode,

      bizIds: [],
      bizDatas: [],
      dataFlow: dataFlow || {} as any,

      conn
    } as FlowContext<any, any, any>;
    await this.app._flowActionMap[flowPath].excute.call(context);
    // 全部执行前
    // const flow = this.app._flowMap[flowCode];
    // if (flow && flow.doBeforeAllAction) {
    //   try {
    //     await flow.doBeforeAllAction.call(context);
    //   } catch (error) {
    //     context.error = error;
    //     if (flow.doException) {
    //       await flow.doException.call(context);
    //     } else {
    //       throw error;
    //     }
    //   }
    // }

    // 离开旧节点、进入新节点，同时如果新节点有自动action，则执行
    // await this.excuteFlowAction(context, flow, flowCode, flowPath);

    // 全部执行完毕
    // if (flow && flow.doAfterAllAction) {
    //   try {
    //     await flow.doAfterAllAction.call(context);
    //   } catch (error) {
    //     context.error = error;
    //     if (flow.doException) {
    //       await flow.doException.call(context);
    //     } else {
    //       throw error;
    //     }
    //   }
    // }
    return context.returnValue;
  }

  // private async excuteFlowAction(context: FlowContext<any, any, any>, flow: Flow, flowCode: string, actionCode: string) {
  //   const fromNode = this.app._flowNodeMap[`${ flowCode ? `${ flowCode }` : '' }${ context.fromNode ? `/${ context.fromNode }` : '' }`];
  //   const action = this.app._flowActionMap[actionCode];

  //   if (action) {
  //     if (action['toNode']) {
  //       Object.assign(context, {
  //         toNode: action['toNode']
  //       });
  //     }
  //     // 节点执行前
  //     if (fromNode && fromNode.doBeforeEveryAction) {
  //       try {
  //         await fromNode.doBeforeEveryAction.call(context);
  //       } catch (error) {
  //         context.error = error;
  //         if (fromNode.doException) {
  //           await fromNode.doException.call(context);
  //         } else if (flow && flow.doException) {
  //           await flow.doException.call(context);
  //         } else {
  //           throw error;
  //         }
  //       }
  //     }
  //     if (flow && flow.doBeforeEveryAction) {
  //       try {
  //         await flow.doBeforeEveryAction.call(context);
  //       } catch (error) {
  //         context.error = error;
  //         if (flow.doException) {
  //           await flow.doException.call(context);
  //         } else {
  //           throw error;
  //         }
  //       }
  //     }
  //     // 执行
  //     try {
  //       await action.excute.call(context);
  //     } catch (error) {
  //       context.error = error;
  //       if (fromNode && fromNode.doException) {
  //         await fromNode.doException.call(context);
  //       } else if (flow && flow.doException) {
  //         await flow.doException.call(context);
  //       } else {
  //         throw error;
  //       }
  //     }
  //     // 节点执行后
  //     if (fromNode && fromNode.doAfterEveryAction) {
  //       try {
  //         await fromNode.doAfterEveryAction.call(context);
  //       } catch (error) {
  //         context.error = error;
  //         if (fromNode.doException) {
  //           await fromNode.doException.call(context);
  //         } else if (flow && flow.doException) {
  //           await flow.doException.call(context);
  //         } else {
  //           throw error;
  //         }
  //       }
  //     }
  //     if (flow && flow.doAfterEveryAction) {
  //       try {
  //         await flow.doAfterEveryAction.call(context);
  //       } catch (error) {
  //         context.error = error;
  //         if (flow.doException) {
  //           await flow.doException.call(context);
  //         } else {
  //           throw error;
  //         }
  //       }
  //     }
  //     // 节点发生了变化
  //     if (context.fromNode !== context.toNode) {
  //       // 来源节点 离开
  //       if (fromNode && fromNode.onLeave) {
  //         try {
  //           await fromNode.onLeave.call(context);
  //         } catch (error) {
  //           context.error = error;
  //           if (fromNode.doException) {
  //             await fromNode.doException.call(context);
  //           } else if (flow && flow.doException) {
  //             await flow.doException.call(context);
  //           } else {
  //             throw error;
  //           }
  //         }
  //       }

  //       // 新节点
  //       if (context.toNode) {
  //         const toNode = this.app._flowNodeMap[`${ flowCode }/${ context.toNode }`];
  //         if (toNode) {
  //           //  进入
  //           if (toNode.onInto) {
  //             try {
  //               await toNode.onInto.call(context);
  //             } catch (error) {
  //               context.error = error;
  //               if (toNode.doException) {
  //                 await toNode.doException.call(context);
  //               } else if (flow && flow.doException) {
  //                 await flow.doException.call(context);
  //               } else {
  //                 throw error;
  //               }
  //             }
  //           }
  //           // 自动
  //           if (toNode.autoAction) {
  //             Object.assign(context, {
  //               fromNode: context.toNode
  //             });
  //             await this.excuteFlowAction(context, flow, flowCode, `${ flowCode }/${ context.toNode }/${ toNode.autoAction }`);
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
}
