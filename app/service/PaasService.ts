import * as Core from '@alicloud/pop-core';
import BaseService from '../base/BaseService';
import {Empty} from '../util/empty';
import {randomNumber, uuid} from '../util/string';
import svgCaptcha = require('svg-captcha');
import {FlowLine, SqlSession, FlowNodeConfig, FlowData} from '../../typings';
import {FlowContext, FlowTaskNode, FlowStartNode, FlowSkipNode, FlowSysNode, FlowEndNode, FlowAutoNode, FlowChildNode, FlowReportNode} from '../util/flow';
const debug = require('debug')('egg-bag');
const nodeType = {
  start: FlowStartNode,
  task: FlowTaskNode,
  skip: FlowSkipNode,
  sys: FlowSysNode,
  end: FlowEndNode,
  auto: FlowAutoNode,
  child: FlowChildNode,
  report: FlowReportNode
};
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

  public async fetchFlow(param: {
    flowPath: string;
    fromNodeId?: string;
    fromNodeNode?: string;

    biz: any;
    conn?: SqlSession;
  }) {
    const context = await this.initContext(param, false);
    this.app.throwIf(!context.fromNode, '起始节点没有实现');

    Object.assign(context, {
      toNodeCode: context.fromNodeCode,
      toNodeId: context.fromNodeId,
      toNodeConfig: context.fromNodeConfig,
      toNodeLines: context.fromNodeLines,
      toNode: context.fromNode,
      toNodeLabel: context.fromNodeLabel
    });

    if (context.fromNode! instanceof FlowTaskNode || context.fromNode! instanceof FlowStartNode || context.fromNode! instanceof FlowSkipNode) {
      await context.fromNode.fetch.call(context);
      return this.getResult(context);
    }
    this.app.throwNow('起始节点只能是task、start、skip');
  }
  public async doFlow(param: {
    flowPath: string;
    fromNodeId?: string;
    fromNodeNode?: string;
    actionId?: string;
    actionCode?: string;

    biz: any;
    conn?: SqlSession;
  }) {
    const context = await this.initContext(param, true);
    this.app.throwIf(!context.fromNodeLines || context.fromNodeLines.length === 0, '起始节点没有任何出线');
    this.app.throwIf(!param.actionId && !param.actionCode, '请指定操作');
    let action: {id: string; line: FlowLine} | undefined;
    if (param.actionId) {
      action = context.fromNodeLines!.find(item => item.id === param.actionId);
    } else if (param.actionCode) {
      action = context.fromNodeLines!.find(item => item.line.code === param.actionCode);
    } else {
      action = context.fromNodeLines!.find(item => item.line.def);
    }
    this.app.throwIf(!action, '操作id无效');
    const to = this.getNode(context.flowData, context.nodes, {fromOrTo: true, strict: true}, {id: action!.line.to});
    Object.assign(context, {
      lineId: action?.id,
      lineCode: action?.line.code,
      lineLabel: action?.line.name,
      ...to
    });

    if (context.conn) {
      await this._doFlow(context);
      await context.save.call(context);
    } else {
      await this.transction(async conn => {
        Object.assign(context, {conn});
        await this._doFlow(context);
        await context.save.call(context);
      });
    }

    return this.getResult(context);
  }
  private async _doFlow(context: FlowContext<any, any>) {
    context.todoList.length = 0;
    context.noticeList.length = 0;
    // 起始节点 init
    if (context.fromNode) {
      if (
        context.fromNode instanceof FlowTaskNode ||
        context.fromNode instanceof FlowStartNode ||
        context.fromNode instanceof FlowSkipNode ||
        context.fromNode instanceof FlowSysNode
      ) {
        await context.fromNode.init.call(context);
      }
    }
    let nextAction: {id: string; line: FlowLine} | undefined;
    switch (context.toNodeConfig!.type) {
      case 'start': {
        this.app.throwNow('开始节点不能被指向');
      }
      case 'task': {
        this.app.throwIf(!context.toNode, `${ context.toNodeId }未实现`);
        this.app.throwIf(!context.toNodeLines || context.toNodeLines.length === 0, `${ context.toNodeId }无出线`);
        const node = context.toNode! as FlowTaskNode<any, any>;
        try {
          await node.enter.call(context);
          await node.todo.call(context);
          await node.notice.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error) {
          this.app.throwIf(context.todoList.length === 0, `${ context.toNodeLabel }找不到可执行人(${ context.toNodeCode })`);
          nextAction = await this.tryToFindDefAction(context);
        }
        break;
      }
      case 'skip': {
        this.app.throwIf(!context.toNode, `${ context.toNodeId }未实现`);
        this.app.throwIf(!context.toNodeLines || context.toNodeLines.length === 0, `${ context.toNodeId }无出线`);
        const node = context.toNode! as FlowSkipNode<any, any>;
        try {
          await node.enter.call(context);
          await node.todo.call(context);
          await node.notice.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error) {
          if (context.todoList.length === 0) {
            nextAction = context.toNodeLines!.find(item => item.line.def);
          } else {
            nextAction = await this.tryToFindDefAction(context);
          }
        }
        break;
      }
      case 'auto': {
        this.app.throwIf(!context.toNode, `${ context.toNodeId }未实现`);
        this.app.throwIf(!context.toNodeLines || context.toNodeLines.length === 0, `${ context.toNodeId }无出线`);
        let nextSwitch: number | void;
        const node = context.toNode! as FlowAutoNode<any, any>;
        try {
          nextSwitch = await node.enter.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error) {
          if (typeof nextSwitch === 'number') {
            const value = `${ nextSwitch }`;
            nextAction = context.toNodeLines!.find(item => item.line.swi.includes(value));
          }
          if (!nextAction) {
            nextAction = context.toNodeLines!.find(item => item.line.def);
          }
          this.app.throwIf(!nextAction, `${ context.toNodeId }结果为${ nextSwitch },但无匹配的操作`);
        }
        break;
      }
      case 'child': {
        this.app.throwIf(!context.toNodeConfig?.child, '未声明子流程');
        const node = context.toNode! as FlowChildNode<any, any>;
        try {
          await node.enter.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error) {
          // 切换到子流程
          this.switchFlow(context, context.toNodeConfig?.child!, `${ context.flowPath }/${ context.toNodeConfig?.child }`);
          // 查找子流程开始节点
          const startAsTo = this.getNode(context.flowData, context.nodes, {fromOrTo: false, strict: true}, {start: true});
          // 查找默认操作
          this.app.throwIf(!startAsTo || !startAsTo.toNodeLines || startAsTo.toNodeLines.length === 0, `${ startAsTo!.toNodeId }无出线`);
          // 起始节点默认操作
          nextAction = startAsTo!.toNodeLines!.find((item: {line: FlowLine}) => item.line.def);
          this.app.throwIf(!nextAction, `${ startAsTo!.toNodeId }无默认出线`);
          // 设置起始节点
          Object.assign(context, startAsTo);
        }
        break;
      }
      case 'sys': {
        this.app.throwIf(!context.toNode, `${ context.toNodeId }未实现`);
        this.app.throwIf(!context.toNodeLines || context.toNodeLines.length === 0, `${ context.toNodeId }无出线`);
        const node = context.toNode! as FlowSysNode<any, any>;
        try {
          await node.enter.call(context);
          await node.notice.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error) {
          nextAction = context.toNodeLines!.find(item => item.line.def);
        }
        break;
      }
      case 'report': {
        const node = context.toNode! as FlowReportNode<any, any>;
        let nextSwitch: number | void;
        try {
          nextSwitch = await node.enter.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        if (!context.error && context.flowCodeIndex > 0) {
          const flowCode = context.flowCode;
          // 切换到上级流程
          this.switchFlow(context, context.flowPaths[context.flowCodeIndex - 1]);
          // 查找 子流程入口节点
          const childAsTo = this.getNode(context.flowData, context.nodes, {fromOrTo: false, strict: false}, {child: flowCode});
          if (childAsTo) {
            if (typeof nextSwitch === 'number') {
              const value = `${ nextSwitch }`;
              nextAction = childAsTo.toNodeLines!.find((item: {line: FlowLine}) => item.line.swi.includes(value));
            }
            if (!nextAction) {
              nextAction = childAsTo.toNodeLines!.find((item: {line: FlowLine}) => item.line.def);
            }
            if (nextAction) {
              // 设置起始节点
              Object.assign(context, childAsTo);
            }
          }
        }
        break;
      }
      case 'end': {
        const node = context.toNode! as FlowEndNode<any, any>;
        try {
          await node.enter.call(context);
          await node.notice.call(context);
        } catch (error) {
          Object.assign(context, {error});
        }
        break;
      }
    }
    if (context.error) {
      if (context.toNodeLines) {
        nextAction = context.toNodeLines.find(item => item.line.error === true);
      }
    }
    if (nextAction && nextAction.line.to !== context.toNodeId) {
      Object.assign(context, {
        lineId: nextAction.id,
        lineCode: nextAction.line.code,
        lineLabel: nextAction.line.name,

        fromNodeCode: context.toNodeCode,
        fromNodeId: context.toNodeId,
        fromNodeConfig: context.toNodeConfig,
        fromNodeLines: context.toNodeLines,
        fromNode: context.toNode,
        fromNodeLabel: context.toNodeLabel,

        ...this.getNode(context.flowData, context.nodes, {fromOrTo: false, strict: true}, {id: nextAction.line.to}),
      });
      await this._doFlow(context);
    }
  }
  private getNode(
    flowData: FlowData,
    nodes: {[key: string]: FlowContext<any, any>},
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
      this.app.throwIf(!nodeId || !nodeConfig, `${ filter.id }|${ filter.code }没有对应配置节点!`);
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
        [`${ prefix }Config`]: nodeConfig,
        [`${ prefix }Lines`]: lines,
        [`${ prefix }Label`]: nodeConfig.name
      };

      this.app.throwIf(nodeType[nodeConfig.type] !== undefined && !nodeConfig.code, `${ nodeId }没有实现!`);
      this.app.throwIf(!nodes[nodeConfig.code!], `${ nodeId }没有实现!`);
      const node = nodes[nodeConfig.code!]!;
      this.app.throwIfNot(node instanceof nodeType[nodeConfig.type], `${ nodeId }定义是${ nodeConfig.type },但实现不是`);

      result[`${ prefix }Node`] = node;
    }
    return result;
  }
  private async initContext(param: {
    biz: any;
    conn?: SqlSession;
    fromNodeId?: string;
    fromNodeNode?: string;
    flowPath: string;
  }, run: boolean) {
    this.app.throwIf(!param.flowPath, '请指定流程');
    const flowPaths = param.flowPath.split('/');
    const setCheck = new Set<string>(flowPaths);
    this.app.throwIf(setCheck.size !== flowPaths.length, '流程路径中有重复值');
    const flowCodeIndex = flowPaths.length - 1;
    const flowCode = flowPaths[flowCodeIndex];
    const flow = this.app._flowMap[flowCode];
    this.app.throwIf(!flow, `流程：${ flowCode }无效`);

    const context = {
      ctx: this.ctx,
      service: this.ctx.service,
      app: this.app,

      conn: param.conn,

      biz: param.biz || {},

      flowCode,
      flowPath: param.flowPath,
      flowPaths,
      flowCodeIndex,

      flowField: flow.field,
      nodes: flow.nodes,
      save: flow.save,
      flowData: flow.flowData,

      ...this.getNode(flow.flowData, flow.nodes, {fromOrTo: true, strict: true}, {start: true}),

      field: {},
      noticeList: [],
      todoList: [],
      logs: []
    } as FlowContext<any, any>;
    if (run === true) {
      await flow.init.call(context);
    } else {
      await flow.fetch.call(context);
    }
    return context;
  }
  private getResult(context: FlowContext<any, any>) {
    return {
      biz: context.biz,
      flowCode: context.flowCode,
      flowPath: context.flowPath,

      fromNodeId: context.fromNodeId,
      fromNodeCode: context.fromNodeCode,

      lines: context.fromNodeLines ? context.fromNodeLines.filter(item => item.line.hide === false && item.line.error === false).map(item => {
        return {
          name: item.line.name,
          code: item.line.code,
          from: item.line.from,
          to: item.line.to
        };
      }) : [],

      fields: context.field
    };
  }
  private async tryToFindDefAction(context: FlowContext<any, any>) {
    const defAction = context.toNodeLines!.find(item => item.line.def);
    if (defAction && defAction.line.to !== context.toNodeId) {
      const toNode = this.getNode(context.flowData, context.nodes, {fromOrTo: false, strict: false}, {id: defAction.line.to});
      const fromNode = this.getNode(context.flowData, context.nodes, {fromOrTo: true, strict: false}, {id: defAction.line.from});
      if (toNode && fromNode) {
        if (context.toNode instanceof FlowTaskNode || context.toNode instanceof FlowSkipNode) {
          const backUp = this.backUpContext(context);
          Object.assign(context, {
            todoList: [],

            lineId: defAction.id,
            lineCode: defAction.line.code,
            lineLabel: defAction.line.name,

            ...toNode,
            ...fromNode
          });
          await context.toNode.todo.call(context);
          const todoList = context.todoList;
          Object.assign(context, backUp);
          if (todoList.includes(this.ctx.me)) {
            return defAction;
          }
        }
      }
    }
  }
  private async switchFlow(context: FlowContext<any, any>, flowCode: string, flowPath?: string) {
    this.app.throwIf(!flowCode, '请指定流程');
    let flowPaths = context.flowPaths;
    if (flowPath) {
      flowPaths = flowPath.split('/');
      const setCheck = new Set<string>(flowPaths);
      this.app.throwIf(setCheck.size !== flowPaths.length, '流程路径中有重复值');
    } else {
      flowPath = context.flowPath;
    }
    const flow = this.app._flowMap[flowCode];
    this.app.throwIf(!flow, `流程：${ flowCode }无效`);
    const flowCodeIndex = context.flowPaths.indexOf(flowCode);
    Object.assign(context, {
      flowCode,
      flowPath,
      flowPaths,
      flowCodeIndex,

      flowField: flow.field,
      nodes: flow.nodes,
      save: flow.save,
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

      lineId: undefined,
      lineCode: undefined,
      lineLabel: undefined,

      field: {},
      noticeList: [],
      todoList: [],
      logs: [],

      biz: context.biz
    });
    await flow.init.call(context);
    return context;
  }
  private backUpContext(context: FlowContext<any, any>) {
    return {
      flowPath: context.flowPath,
      flowCode: context.flowCode,
      flowPaths: context.flowPaths,
      flowCodeIndex: context.flowCodeIndex,

      toNodeCode: context.toNodeCode,
      toNodeId: context.toNodeId,
      toNodeConfig: context.toNodeConfig,
      toNode: context.toNode,
      toNodeLabel: context.toNodeLabel,
      toNodeLines: context.toNodeLines,

      fromNodeCode: context.fromNodeCode,
      fromNodeId: context.fromNodeId,
      fromNodeConfig: context.fromNodeConfig,
      fromNode: context.fromNode,
      fromNodeLabel: context.fromNodeLabel,
      fromNodeLines: context.fromNodeLines,

      lineId: context.lineId,
      lineCode: context.lineCode,
      lineLabel: context.lineLabel,

      field: context.field,

      todoList: context.todoList,
      noticeList: context.noticeList,
      biz: context.biz,
      logs: context.logs,

      flowField: context.flowField,
      nodes: context.nodes,
      flowData: context.flowData,
      save: context.save
    };
  }
}
