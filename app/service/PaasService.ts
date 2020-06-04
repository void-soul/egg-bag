import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import svgCaptcha = require('svg-captcha');
import {FlowLine, SqlSession, FlowNodeConfig, FlowData} from '../../typings';
import {FlowContext, FlowTaskNode, FlowStartNode, FlowSkipNode, FlowSysNode, FlowEndNode, FlowAutoNode, FlowChildNode, FlowShuntNode} from '../util/flow';
const debugFlow = require('debug')('egg-bag:flow');
const debug = require('debug')('egg-bag:base');
const nodeType = {
  start: FlowStartNode,
  task: FlowTaskNode,
  skip: FlowSkipNode,
  sys: FlowSysNode,
  end: FlowEndNode,
  auto: FlowAutoNode,
  shunt: FlowShuntNode,
  child: FlowChildNode
};
class StatusError extends Error {
  egg: number;
  constructor (message: string) {
    super(message);
    this.egg = 1;
  }
}
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

  public async fetchFlow<D, M>(param: {
    flowPath: string;
    fromNodeId?: string;
    fromNodeCode?: string;

    biz: D;
    conn?: SqlSession;
  }) {
    const {context, fetch} = await this.initContext<D, M>(param);
    this.throwIf(!context.fromNode, '起始节点没有实现');

    Object.assign(context, {
      toNodeCode: context.fromNodeCode,
      toNodeId: context.fromNodeId,
      toNodeConfig: context.fromNodeConfig,
      toNodeLines: context.fromNodeLines,
      toNode: context.fromNode,
      toNodeLabel: context.fromNodeLabel
    });

    if (context.fromNode! instanceof FlowTaskNode || context.fromNode! instanceof FlowStartNode || context.fromNode! instanceof FlowSkipNode) {
      context.field = context.fromNodeConfig && context.fromNodeConfig.fields && context.fromNodeConfig.fields[context._specialValue] || {};
      await fetch.call(context);
      await context.fromNode.fetch.call(context);
      return await this.getResult<D, M>(context, false);
    }
    this.throwNow('起始节点只能是task、start、skip');
  }
  public async doFlow<D, M>(param: {
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
    const {context, init} = await this.initContext<D, M>(param);
    let to: {
      [k: string]: any;
    } | undefined;
    let action: {id: string; line: FlowLine} | undefined;
    if (param.toNodeId || param.toNodeCode) {
      to = this.getNode<D, M>(context.flowData, context.nodes, {fromOrTo: false, strict: true}, {id: param.toNodeId, code: param.toNodeCode});
      Object.assign(context, {
        lineId: 'unkonwn',
        lineCode: 'unkonwn',
        lineLabel: 'unkonwn'
      });
      if (!context.fromNodeCode) {
        Object.assign(context, {
          fromNodeCode: 'unkonwn',
          fromNodeId: 'unkonwn',
          fromNodeLabel: 'unkonwn'
        });
      }
    } else {
      this.throwIf(!context.fromNodeLines || context.fromNodeLines.length === 0, '起始节点没有任何出线');
      if (param.actionId) {
        action = context.fromNodeLines!.find(item => item.id === param.actionId);
        debugFlow(`match-action: ${ param.actionId }`);
      } else if (param.actionCode) {
        action = context.fromNodeLines!.find(item => item.line.code === param.actionCode);
        debugFlow(`match-action: ${ param.actionCode }`);
      } else {
        action = context.fromNodeLines!.find(item => item.line.def);
        debugFlow('match-def-action');
      }
      if (!action) {
        const lines = context.fromNodeLines!.filter(item => item.line.error === false);
        if (lines.length === 1) {
          action = lines[0];
          debugFlow('match-singel-action');
        }
      }
      this.throwIf(!action, '操作无效');
      to = this.getNode<D, M>(context.flowData, context.nodes, {fromOrTo: false, strict: true}, {id: action!.line.to});
      Object.assign(context, {
        lineId: action?.id,
        lineCode: action?.line.code,
        lineLabel: action?.line.name,
        lingLog: action?.line.log
      });
    }
    this.throwIf(!to, '找不到目标节点');
    Object.assign(context, to);

    if (context.conn) {
      await this._doFlow<D, M>(context, false, init);
    } else {
      await this.transction(async conn => {
        Object.assign(context, {conn});
        await this._doFlow<D, M>(context, false, init);
      });
    }

    return await this.getResult<D, M>(context, true);
  }
  private async _doFlow<D, M>(context: FlowContext<D, M>, skip: boolean, init?: () => Promise<void>) {
    debugFlow(`from[${ context.fromNodeLabel }:${ context.fromNodeId }]=>[${ context.lineId }:${ context.lineLabel }:${ context.lineCode }]=>[${ context.toNodeLabel }:${ context.toNodeId }]`);
    context.todoList.clear();
    // 起始节点 init
    if (init) {
      await init.call(context);
      debugFlow(`init-flow: ${ context.flowCode }`);
      if (context.fromNode) {
        if (context.fromNode instanceof FlowTaskNode || context.fromNode instanceof FlowStartNode || context.fromNode instanceof FlowSkipNode || context.fromNode instanceof FlowSysNode) {
          await context.fromNode.init.call(context);
          debugFlow(`init-node: ${ context.fromNodeLabel }(${ context.fromNodeId })`);
        }
      }
    }
    if (context.lingLog && skip !== true) {
      context.logs.push(context.lingLog);
    }
    let nextAction: {id: string; line: FlowLine} | undefined;
    const lines = context.toNodeLines!.filter(item => item.line.error === false);
    let newFlowInit: (() => Promise<void>) | undefined;
    const defAction = lines.length === 1 ? lines[0] : lines.find(item => item.line.def);
    const errorAction = lines.find(item => item.line.error);
    let skipDo = false;
    switch (context.toNodeConfig!.type) {
      case 'start': {
        this.throwNow('开始节点不能被指向');
        break;
      }
      case 'task': {
        this.throwIf(!context.toNode, `${ context.toNodeLabel }(${ context.toNodeId })未实现`);
        this.throwIf(lines.length === 0, `${ context.toNodeLabel }(${ context.toNodeId })无非错误出线`);
        try {
          const node = context.toNode! as FlowTaskNode<D, M>;
          await node.excute.call(context);
          debugFlow(`excute-task-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          await node.todo.call(context);
          debugFlow(`todo-task-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          this.throwIf(context.todoList.size === 0, `${ context.toNodeLabel }找不到可执行人(${ context.toNodeCode })`);
          // 操作人包含自己？
          if (defAction && context.todoList.has(this.ctx.me.userid)) {
            debugFlow(`def-task-node: ${ context.toNodeLabel }(${ context.toNodeId }) with includes ctx.me`);
            nextAction = defAction;
            skipDo = true;
          }
        } catch (error) {
          debugFlow(`error-task-node: ${ context.toNodeLabel }(${ context.toNodeId })===${ error.message }`);
          if (error.eggBag !== 1 && errorAction) {
            context.error.push(error.message);
            Object.assign(context, {error});
            nextAction = errorAction;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'skip': {
        this.throwIf(!context.toNode, `${ context.toNodeLabel }(${ context.toNodeId })未实现`);
        this.throwIf(lines.length === 0, `${ context.toNodeLabel }(${ context.toNodeId })无非错误出线`);
        try {
          const node = context.toNode! as FlowSkipNode<D, M>;
          await node.excute.call(context);
          debugFlow(`excute-skip-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          await node.todo.call(context);
          debugFlow(`todo-skip-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          if (defAction) {
            if (context.todoList.size === 0) {
              debugFlow(`def-skip-node: ${ context.toNodeLabel }(${ context.toNodeId }) with empty todo`);
              nextAction = defAction;
              skipDo = true;
            } else if (context.todoList.has(this.ctx.me.userid)) {
              debugFlow(`def-skip-node: ${ context.toNodeLabel }(${ context.toNodeId }) with includes ctx.me`);
              nextAction = defAction;
              skipDo = true;
            }
          }
        } catch (error) {
          debugFlow(`error-skip-node: ${ context.toNodeLabel }(${ context.toNodeId })===${ error.message }`);
          if (error.eggBag !== 1 && errorAction) {
            context.error.push(error.message);
            Object.assign(context, {error});
            nextAction = errorAction;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'auto': {
        this.throwIf(!context.toNode, `${ context.toNodeLabel }(${ context.toNodeId })未实现`);
        this.throwIf(lines.length === 0, `${ context.toNodeLabel }(${ context.toNodeId })无非错误出线`);
        try {
          const node = context.toNode! as FlowAutoNode<D, M>;
          const nextSwitch = await node.excute.call(context);
          debugFlow(`excute-auto-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          if (lines.length > 1 && typeof nextSwitch === 'string') {
            const value = `${ nextSwitch }`;
            nextAction = lines.find(item => item.line.swi.includes(value));
          }
          if (nextAction) {
            debugFlow(`match-auto-node: ${ context.toNodeLabel }(${ context.toNodeId }) with ${ nextSwitch }, hit:${ nextAction.id }`);
          } else if (defAction) {
            debugFlow(`def-auto-node: ${ context.toNodeLabel }(${ context.toNodeId }) with none match`);
            nextAction = defAction;
          }
          this.throwIf(!nextAction, `${ context.toNodeLabel }(${ context.toNodeId })结果为${ nextSwitch },但无匹配的操作`);
        } catch (error) {
          debugFlow(`error-auto-node: ${ context.toNodeLabel }(${ context.toNodeId })===${ error.message }`);
          if (error.eggBag !== 1 && errorAction) {
            context.error.push(error.message);
            Object.assign(context, {error});
            nextAction = errorAction;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'shunt': {
        this.throwIf(!context.toNode, `${ context.toNodeLabel }(${ context.toNodeId })未实现`);
        this.throwIf(lines.length === 0, `${ context.toNodeLabel }(${ context.toNodeId })无非错误出线`);
        try {
          const node = context.toNode! as FlowShuntNode<D, M>;
          const nextSwitch = await node.excute.call(context);
          debugFlow(`excute-shunt-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
          if (lines.length > 1 && typeof nextSwitch === 'object') {
            for (const [k, biz] of Object.entries(nextSwitch)) {
              const value = `${ k }`;
              const matchAction = lines.find(item => item.line.swi.includes(value)) || defAction;
              this.throwIf(!matchAction, `${ context.toNodeLabel }(${ context.toNodeId })结果为${ k },但无匹配的操作`);
              Object.assign(context, {biz});
              debugFlow(`do-shunt-node: ${ context.toNodeLabel }(${ context.toNodeId }) with none match${ k }`);
              await this.doAction(context, matchAction!, true);
            }
          } else {
            debugFlow(`def-shunt-node: ${ context.toNodeLabel }(${ context.toNodeId }) with none match`);
            this.throwIf(!defAction, `${ context.toNodeLabel }(${ context.toNodeId })无匹配的操作`);
            nextAction = defAction;
          }
        } catch (error) {
          debugFlow(`error-shunt-node: ${ context.toNodeLabel }(${ context.toNodeId })===${ error.message }`);
          if (error.eggBag !== 1 && errorAction) {
            context.error.push(error.message);
            Object.assign(context, {error});
            nextAction = errorAction;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'child': {
        this.throwIf(!context.toNodeConfig?.child, '未声明子流程');
        const node = context.toNode! as FlowChildNode<D, M, any>;
        await node.excute.call(context);
        debugFlow(`excute-child-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
        // 切换到子流程
        const child = context.toNodeConfig!.child!;
        newFlowInit = await this.switchFlow<D, M>(context, child, `${ context.flowPath }/${ child }`);
        // 查找子流程开始节点
        const noError = context.fromNodeLines!.filter(item => item.line.error === false);
        // 查找默认操作
        nextAction = noError.length === 1 ? noError[0] : noError.find(item => item.line.def);
        this.throwIf(!nextAction, `${ context.flowCode }/${ context.fromNodeId }无默认出线`);
        debugFlow(`child-start-def: ${ context.fromNodeLabel }(${ context.fromNodeId })`);
        const biz = await node.childContext.call(context);
        Object.assign(context, {biz});
        break;
      }
      case 'sys': {
        this.throwIf(!context.toNode, `${ context.toNodeLabel }(${ context.toNodeId })未实现`);
        this.throwIf(lines.length === 0, `${ context.toNodeLabel }(${ context.toNodeId })无非错误出线`);
        try {
          const node = context.toNode! as FlowSysNode<D, M>;
          await node.excute.call(context);
          debugFlow(`excute-sys-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
        } catch (error) {
          debugFlow(`error-sys-node: ${ context.toNodeLabel }(${ context.toNodeId })===${ error.message }`);
          if (error.eggBag !== 1 && errorAction) {
            context.error.push(error.message);
            Object.assign(context, {error});
            nextAction = errorAction;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'end': {
        const node = context.toNode! as FlowEndNode<D, M>;
        await node.excute.call(context);
        debugFlow(`excute-end-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
        break;
      }
    }
    if (nextAction) {
      await this.doAction<D, M>(context, nextAction, skipDo, newFlowInit);
    } else if (context.toNode && (context.toNode instanceof FlowTaskNode || context.toNode instanceof FlowEndNode || context.toNode instanceof FlowSkipNode || context.toNode instanceof FlowSysNode)) {
      await context.toNode.notice.call(context);
      debugFlow(`notice-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
      await context.save.call(context);
      debugFlow('flow save');
      if (context.toNodeConfig!.up === true) {
        debugFlow(`excute-report-node: ${ context.toNodeLabel }(${ context.toNodeId })`);
        if (context.flowCodeIndex > 0) {
          // 切换到上级流程
          const childFlowInit = await this.switchFlow<D, M>(context, context.flowPaths[context.flowCodeIndex - 1], context.flowPath);
          // 查找 子流程入口节点
          if (context.fromNode) {
            this.throwIf(context.fromNodeLines!.length !== 1, `${ context.fromNodeLabel }(${ context.fromNodeId })只能有一个出线`);
            const parentNode = context.fromNode as FlowChildNode<D, M, any>;
            const biz = await parentNode.parentContext(context.biz);
            Object.assign(context, {biz});
            debugFlow(`do-report-node: ${ context.fromNodeLabel }(${ context.fromNodeId })`);
            await this.doAction<D, M>(context, context.fromNodeLines![0], true, childFlowInit);
          }
        }
      }
    } else if (context.toNodeConfig!.type !== 'shunt') {
      await context.save.call(context);
      debugFlow('flow save');
    }
  }
  private getNode<D, M>(
    flowData: FlowData,
    nodes: {[key: string]: FlowContext<D, M>},
    option: {fromOrTo: boolean; strict: boolean},
    filter: {child?: string; id?: string; code?: string; start?: boolean}
  ) {
    let nodeId: string | undefined;
    let nodeConfig: FlowNodeConfig | undefined;
    if (filter.id && flowData.nodes[filter.id]) {
      nodeId = filter.id;
      nodeConfig = flowData.nodes[filter.id];
    } else if (filter.code) {
      for (const [id, node] of Object.entries(flowData.nodes)) {
        if (node.code === filter.code) {
          nodeId = id;
          nodeConfig = node;
          break;
        }
      }
    } else if (filter.child) {
      for (const [id, node] of Object.entries(flowData.nodes)) {
        if (node.type === 'child' && node.child === filter.child) {
          nodeId = id;
          nodeConfig = node;
          break;
        }
      }
    } else if (filter.start === true) {
      for (const [id, node] of Object.entries(flowData.nodes)) {
        if (node.type === 'start') {
          nodeId = id;
          nodeConfig = node;
          break;
        }
      }
    }

    if (option.strict === true) {
      this.throwIf(!nodeId || !nodeConfig, `${ filter.id }|${ filter.code }没有对应配置节点!`);
    }
    const prefix = option.fromOrTo === true ? 'from' : 'to';
    let result: {[k: string]: any} | undefined;
    if (nodeId && nodeConfig) {
      const lines = new Array<{line: FlowLine; id: string}>();
      for (const [id, line] of Object.entries(flowData.lines)) {
        if (line.from === nodeId) {
          lines.push({id, line});
        }
      }
      result = {
        [`${ prefix }NodeCode`]: nodeConfig.code,
        [`${ prefix }NodeId`]: nodeId,
        [`${ prefix }NodeConfig`]: nodeConfig,
        [`${ prefix }NodeLines`]: lines,
        [`${ prefix }NodeLabel`]: nodeConfig.name
      };

      this.throwIf(nodeType[nodeConfig.type] !== undefined && !nodeConfig.code, `${ nodeConfig.name }(${ nodeId })没有实现!`);
      this.throwIf(!nodes[nodeConfig.code!], `${ nodeConfig.name }(${ nodeId })没有实现!`);
      const node = nodes[nodeConfig.code!]!;
      this.throwIfNot(node instanceof nodeType[nodeConfig.type], `${ nodeConfig.name }(${ nodeId })定义是${ nodeConfig.type },但实现不是`);

      result[`${ prefix }Node`] = node;
    }
    return result;
  }
  private async initContext<D, M>(param: {
    biz: any;
    conn?: SqlSession;
    fromNodeId?: string;
    fromNodeCode?: string;
    toNodeId?: string;
    toNodeCode?: string;
    flowPath: string;
  }) {
    this.throwIf(!param.flowPath, '请指定流程');
    const flowPaths = param.flowPath.split('/');
    const setCheck = new Set<string>(flowPaths);
    this.throwIf(setCheck.size !== flowPaths.length, '流程路径中有重复值');
    const flowCodeIndex = flowPaths.length - 1;
    const flowCode = flowPaths[flowCodeIndex];
    const flow = this.app._flowMap[flowCode];
    this.throwIf(!flow, `流程：${ flowCode }无效`);

    const context = {
      ctx: this.ctx,
      service: this.ctx.service,
      app: this.app,

      conn: param.conn,

      biz: param.biz || {} as D,

      flowCode,
      flowPath: param.flowPath,
      flowPaths,
      flowCodeIndex,

      nodes: flow.nodes,
      save: flow.save,
      _specialValue: '',
      finish: flow.finish,
      flowData: flow.flowData,

      ...this.getNode<D, M>(flow.flowData, flow.nodes, {fromOrTo: true, strict: false}, {start: !param.toNodeId && !param.toNodeCode, id: param.fromNodeId, code: param.fromNodeCode}),

      field: {},
      noticeList: [],
      todoList: new Set(),
      logs: [],
      error: []
    } as FlowContext<D, M>;
    Object.assign(context, {
      _specialValue: await flow.special.call(context)
    });
    return {
      context,
      fetch: flow.fetch,
      init: flow.init
    };
  }
  private async getResult<D, M>(context: FlowContext<D, M>, isDo: boolean) {
    return {
      biz: isDo ? await context.finish() : context.biz,
      flowCode: context.flowCode,
      flowPath: context.flowPath,

      fromNodeId: context.toNodeId,
      fromNodeCode: context.toNodeCode,

      lines: context.toNodeLines ? context.toNodeLines.filter(item => item.line.hide === false && item.line.error === false).map(item => {
        return {
          name: item.line.name,
          code: item.line.code,
          from: item.line.from,
          to: item.line.to,
          right: item.line.right,
          back: item.line.back,
          id: item.id
        };
      }) : [],

      fields: context.field,
      error: context.error
    };
  }
  private async switchFlow<D, M>(context: FlowContext<D, M>, flowCode: string, flowPath: string, child?: string) {
    this.throwIf(!flowCode, '请指定流程');
    const flowPaths = flowPath.split('/');
    const setCheck = new Set<string>(flowPaths);
    this.throwIf(setCheck.size !== flowPaths.length, '流程路径中有重复值');
    const flow = this.app._flowMap[flowCode];
    this.throwIf(!flow, `流程：${ flowCode }无效`);
    const flowCodeIndex = context.flowPaths.indexOf(flowCode);
    Object.assign(context, {
      flowCode,
      flowPath,
      flowPaths,
      flowCodeIndex,

      nodes: flow.nodes,
      save: flow.save,
      finish: flow.finish,
      flowData: flow.flowData,

      toNodeCode: undefined,
      toNodeId: undefined,
      toNodeConfig: undefined,
      toNode: undefined,
      toNodeLabel: undefined,
      toNodeLines: undefined,

      fromNodeCode: undefined,
      fromNodeId: undefined,
      fromNodeConfig: undefined,
      fromNode: undefined,
      fromNodeLabel: undefined,
      fromNodeLines: undefined,

      ...this.getNode<D, M>(flow.flowData, flow.nodes, {fromOrTo: true, strict: !child}, {start: !child, child}),

      field: {},
      noticeList: [],
      todoList: new Set(),
      logs: []
    });
    Object.assign(context, {
      _specialValue: await flow.special.call(context)
    });
    debugFlow(`switch-flow: ${ flowCode }-${ flowPath }`);
    return flow.init;
  }
  private async doAction<D, M>(context: FlowContext<D, M>, nextAction: {id: string; line: FlowLine}, skip: boolean, newFlowInit?: (() => Promise<void>)) {
    Object.assign(context, {
      lineId: nextAction.id,
      lineCode: nextAction.line.code,
      lineLabel: nextAction.line.name,
      lingLog: nextAction.line.log,

      fromNodeCode: context.toNodeCode,
      fromNodeId: context.toNodeId,
      fromNodeConfig: context.toNodeConfig,
      fromNodeLines: context.toNodeLines,
      fromNode: context.toNode,
      fromNodeLabel: context.toNodeLabel,

      ...this.getNode<D, M>(context.flowData, context.nodes, {fromOrTo: false, strict: true}, {id: nextAction.line.to}),
    });
    await this._doFlow<D, M>(context, skip, newFlowInit);
  }
  private throwIf(test: boolean, message: string) {
    if (test === true) {
      throw new StatusError(message);
    }
  }
  private throwIfNot(test: boolean, message: string) {
    if (test === false) {
      throw new StatusError(message);
    }
  }
  private throwNow(message: string) {
    throw new StatusError(message);
  }
}
