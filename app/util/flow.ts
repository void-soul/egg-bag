import {FlowField, FlowData, FlowLine, Context, SqlSession, Application, IService, FlowNodeConfig, FlowNodeBase, SimplyFlowLine, FlowDoParam, FlowDoResult, FlowFetchParam, FlowFetchResult} from '../../typings';
import lodash = require('lodash');

/**
 * 流程上下文
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowContext<Q, S, C, M> {
  readonly ctx: Context;
  readonly service: IService;
  readonly app: Application;
  readonly conn: SqlSession;
  /** 提交流程时，业务相关参数 */
  readonly context: C;
  /** 提交参数 */
  readonly req: Q;
  /** 响应参数 */
  readonly res: S;
  /** 消息通知 */
  readonly noticeList: M[];
  /** 任务执行人id */
  readonly todoList: Set<any>;
  /** 日志 */
  readonly logs: string[];
  /** 可能存在的异常信息,每个节点处理完异常后，可以将异常对象从上下文移除，以通知其他节点异常已经解决 */
  readonly error: string[];
  /** 当前生效字段列表 */
  readonly field: FlowField;
  /** 最终呈现时，过滤哪些操作可以展示。如果这里返回true，那么hide类型的line也会展示 */
  readonly filterLineShow: {
    [lineCodeOrId: string]: boolean;
  };
  /** 当前流程编码 */
  readonly flowCode: string;
  /** 本次操作起始节点编码 */
  readonly fromNodeCode?: string;
  /** 本次目标节点编码 */
  readonly toNodeCode?: string;
  /** 本次操作编码 */
  readonly lineCode?: string;
}
/**
 * 流程定义
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class Flow<Q, S, C, M> extends FlowContext<Q, S, C, M>{
  /** 流程配置 */
  readonly flowData: FlowData = {nodes: {}, lines: {}};
  /** 实现类缓存 */
  readonly nodes: {[key: string]: FlowContext<Q, S, C, M>} = {};
  /** 当流程结束、暂停时，保存数据 */
  abstract save(): Promise<void>;
  /**  流程开始前、暂停后重新执行前、子流程开始前、子流程上报到父流程后执行父流程前，会执行init方法。 */
  abstract init(): Promise<void>;
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 当节点被fetch时，前端需要根据节点返回的特殊字段值得到字段信息 */
  abstract special(): Promise<string>;
  /** 构建context上下文 */
  abstract build(): Promise<void>;
}
/**
 * 任务结点
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNode<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 当节点被fetch时，前端需要根据节点返回的特殊字段值得到字段信息 */
  abstract special(): Promise<string | void>;
  /** 流程暂停后重新执行时，如果以此节点为起始节点，则会执行init方法。 */
  abstract init(): Promise<void>;
  /** 节点作为目标时执行,期间异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<void>;
  /** 在这里可以对上下文的todoList进行操作.只有 流程暂停前最后一个目标节点的todo方法有效。其余节点仅作为流程过渡的判断。 */
  abstract todo(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}
/**
 * 开始结点 所有开始节点都不能被指向
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNodeStart<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 当节点被fetch时，前端需要根据节点返回的特殊字段值得到字段信息 */
  abstract special(): Promise<string | void>;
  /**  流程开始时、子流程开始时，会执行init方法。 */
  abstract init(): Promise<void>;
}
/**
 * 结束节点：不能指向其他节点
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNodeEnd<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 节点作为目标时执行 */
  abstract excute(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}
/**
 * 自动结点 无需人为,不能暂停,返回数字|undefined决定流程走向.
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNodeAuto<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 节点作为目标时执行,返回string可影响流程走向,抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<string | void>;
}
/**
 * 分流结点(无需人为,不能暂停,返回key-value.key=走向,value=走向的上下文)
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNodeShunt<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 节点作为目标时执行,返回key-value.key=走向,value=走向的上下文,返回void表示不分流，按默认line进行.抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<{[k: string]: {req: Q; res: S; context: C}} | void>;
}


/**
 * 系统节点(无需人为,可暂停并作为执行入口)
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 */
export abstract class FlowNodeSystem<Q, S, C, M> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 流程暂停后重新执行时，如果以此节点为起始节点，则会执行init方法。 */
  abstract init(): Promise<void>;
  /** 节点作为目标时执行,抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 当节点被fetch时，前端需要根据节点返回的特殊字段值得到字段信息 */
  abstract special(): Promise<string | void>;
}

/**  */
/**
 * 子流程入口(存在于父流程中,需要指定一个子流程编号,一个父流程目前仅支持一个同名子流程编号)
 * Q: 请求参数
 * S: 响应参数
 * C: 流转data 类型定义
 * M: 消息类型
 *
 * Q2：子流程请求参数
 * S2：子流程响应
 * C2：子流程流转data
 */
export abstract class FlowNodeChild<Q, S, C, M, Q2, S2, C2> extends FlowContext<Q, S, C, M> implements FlowNodeBase {
  /** 进入子流程前执行，进入子流程后执行子流程的开始节点的默认操作 */
  abstract excute(): Promise<void>;
  /** 当发起子流程时，可以在这里根据自己的上下文构建子流程的上下文 */
  abstract childContext(): Promise<{req: Q2; res: S2; context: C2}>;
  /** 子流程上报时执行 */
  abstract report(): Promise<void>;
  /** 可以在这里根据子流程上下文构建父流程的上下文 */
  abstract parentContext(req: Q2, res: S2, context: C2): Promise<{req: Q; res: S; context: C}>;
}
class StatusError extends Error {
  egg: number;
  constructor (message: string) {
    super(message);
    this.egg = 1;
  }
}
const debugFlow = require('debug')('egg-bag:flow');
const nodeType = {
  start: FlowNodeStart,
  task: FlowNode,
  sys: FlowNodeSystem,
  end: FlowNodeEnd,
  auto: FlowNodeAuto,
  shunt: FlowNodeShunt,
  child: FlowNodeChild
};
interface NodeFilter {
  child?: string; id?: string; code?: string; start?: boolean
}
const explainCode = /([A-Za-z]+)(\d*)[-]*(\d*)/;
interface FlowCore<Q, S, C, M> {
  /** 查询、执行必须参数 */
  flowCode: string;
  srcFlowCode: string;
  appFlowCode: string;
  /** 源节点 */
  fromNodeId?: string;
  fromNodeConfig?: FlowNodeConfig;
  fromNode?: FlowNodeBase;
  fromNodeLines?: Array<{id: string; line: FlowLine}>;
  /** 目标节点*/
  toNodeId?: string;
  toNodeConfig?: FlowNodeConfig;
  toNode?: FlowNodeBase;
  toNodeLines?: Array<{id: string; line: FlowLine}>;

  /** 当前处理的操作id或者操作编码:处理时前端必传 */
  lineId?: string;
  lineConfig?: FlowLine;

  context: FlowContext<Q, S, C, M>;
  specialValue: string;
  flow: Flow<Q, S, C, M>;
}
export class FlowExcute<Q, S, C, M> {
  private cores: {
    [key: string]: FlowCore<Q, S, C, M>;
  };
  private conn: SqlSession;
  private app: Application;
  private ctx: Context;
  private service: IService;
  private activeCode = '';
  private flowCodes: string[][];
  private flowPath = '';
  constructor (ctx: Context, service: IService, app: Application, conn: SqlSession) {
    this.ctx = ctx;
    this.service = service;
    this.app = app;
    this.conn = conn;
    this.cores = {};
    this.flowCodes = [];
  }
  public async fetch({flowPath, fromNodeId, fromNodeCode, req, skipData, key}: FlowFetchParam<Q>): Promise<FlowFetchResult<S>> {
    this.flowPath = flowPath;
    this.append(flowPath)
      .defFlow()
      .active(this.activeCode, {req})
      .from({id: fromNodeId, code: fromNodeCode, start: true});
    if (skipData === 1 && !this.cores[this.activeCode].fromNode) {
      return {} as any;
    }
    await this.checkFrom()
      .from2To(true)
      .specilAndField();
    const core = this.cores[this.activeCode];
    if (skipData === 1) {
      return this.getResult(key);
    } else if (core.fromNode! instanceof FlowNode || core.fromNode! instanceof FlowNodeStart || core.fromNode! instanceof FlowNodeSystem) {
      await core.flow.build.call(core.context);
      await core.flow.fetch.call(core.context);
      await core.fromNode.fetch.call(core.context);
      await this.specilAndField();
      return this.getResult(key);
    } else {
      await core.flow.build.call(core.context);
      await core.flow.fetch.call(core.context);
      return this.getResult(key);
    }
  }
  public async do({
    flowPath,
    fromNodeId,
    fromNodeCode,
    actionId,
    actionCode,
    toNodeId,
    toNodeCode,
    req
  }: FlowDoParam<Q>): Promise<FlowDoResult<S>> {
    this.flowPath = flowPath;
    this.append(flowPath).defFlow().active(this.activeCode, {req});
    if (fromNodeCode || fromNodeId) {
      this.from({id: fromNodeId, code: fromNodeCode, start: false});
    } else if (toNodeId || toNodeCode) {
      this.to({id: toNodeId, code: toNodeCode, start: false});
    } else {
      this.from({start: true});
    }
    const core = this.cores[this.activeCode];
    if (core.toNode) {
      lodash.assign(core, {
        lineId: 'unkonwn',
        lineCode: 'unkonwn',
        lineLabel: 'unkonwn'
      });
      lodash.assign(core.context, {lineCode: 'unkonwn'});
      if (!core.fromNode) {
        lodash.assign(core, {
          fromNodeCode: 'unkonwn',
          fromNodeId: 'unkonwn',
          fromNodeLabel: 'unkonwn'
        });
        lodash.assign(core.context, {fromNodeCode: 'unkonwn'});
      }
    } else {
      this.throwIf(!core.fromNodeLines || core.fromNodeLines.length === 0, '起始节点没有任何出线');
      let action: {id: string; line: FlowLine} | undefined;
      if (actionId) {
        action = core.fromNodeLines!.find(item => item.id === actionId);
      } else if (actionCode) {
        action = core.fromNodeLines!.find(item => item.line.code === actionCode);
      } else {
        action = core.fromNodeLines!.find(item => item.line.def);
      }
      if (!action) {
        const lines = core.fromNodeLines!.filter(item => item.line.error === false);
        if (lines.length === 1) {
          action = lines[0];
        }
      }
      this.throwIf(!action, '操作无效');
      this.to({id: action!.line.to});
      this.throwIf(!core.toNode, '找不到目标节点');
      this.line(action!);
    }
    await this.specilAndField();
    await this.init();
    await this.specilAndField();
    await this._doFlow(false);
    return this.getResult();
  }
  public getLine({flowCode, fromNodeId, fromNodeCode, actionId, actionCode}: {
    flowCode: string; fromNodeId?: string; fromNodeCode?: string; actionId?: string; actionCode?: string;
  }) {
    this.append(flowCode).defFlow().active(this.activeCode).from({id: fromNodeId, code: fromNodeCode, start: false});
    if (!this.cores[this.activeCode].fromNode) {
      return [];
    }
    const core = this.cores[this.activeCode];
    if (actionId || actionCode) {
      return core.fromNodeLines?.filter(item => item.id === actionId || item.line.code === actionCode).sort((a, b) => a.line.index > b.line.index ? 1 : -1).map(item => this.line2Simply(item, core));
    } else {
      return core.fromNodeLines?.sort((a, b) => a.line.index > b.line.index ? 1 : -1).map(item => this.line2Simply(item, core));
    }
  }
  private async init(): Promise<this> {
    const core = this.cores[this.activeCode];
    await core.flow.build.call(core.context);
    await core.flow.init.call(core.context);
    if (core.fromNode && (core.fromNode instanceof FlowNode || core.fromNode instanceof FlowNodeStart || core.fromNode instanceof FlowNodeSystem)) {
      await core.fromNode.init.call(core.context);
    }
    return this;
  }
  private append(flowPath: string): this {
    const flowCodes = flowPath.split('/');
    const setCheck = new Set<string>(flowCodes);
    this.throwIf(setCheck.size !== flowCodes.length, '流程路径中有重复值');
    this.flowCodes.splice(this.splitIndex(), 0, ...flowCodes.map(item => [item]));
    return this;
  }
  private defFlow(): this {
    this.activeCode = this.flowCodes[this.flowCodes.length - 1][0];
    return this;
  }
  private activeIndex() {
    let activeIndex = -1;
    if (this.activeCode) {
      const explains = explainCode.exec(this.activeCode);
      activeIndex = this.flowCodes.findIndex(item => item.includes(explains![1]));
    }
    return activeIndex;
  }
  private splitIndex() {
    let splitIndex = this.activeIndex() + 1;
    if (splitIndex === 0) {
      splitIndex = this.flowCodes.length;
    }
    return splitIndex;
  }
  private active(flowCode: string, data?: {req?: Q; res?: S; context?: C}): this {
    const explains = explainCode.exec(flowCode);
    this.throwIf(!explains, `${ flowCode }格式错误`);
    const appFlowCode = explains![1];
    const srcFlowCode = `${ explains![1] }${ explains![2] }`;
    if (!this.cores[srcFlowCode]) {
      this.cores[srcFlowCode] = {
        flowCode: srcFlowCode,
        appFlowCode,
        srcFlowCode,
        context: {
          ctx: this.ctx,
          service: this.service,
          app: this.app,
          conn: this.conn,
          context: {} as C,
          req: {} as Q,
          res: {} as S,
          noticeList: [],
          todoList: new Set(),
          logs: [],
          error: [],
          filterLineShow: {},
          field: {},
          flowCode: srcFlowCode
        },
        flow: this.app._flowMap[appFlowCode],
        specialValue: ''
      };
    }
    if (!this.cores[flowCode]) {
      this.cores[flowCode] = {
        flowCode,
        appFlowCode,
        srcFlowCode,
        context: {
          ctx: this.ctx,
          service: this.service,
          app: this.app,
          conn: this.conn,
          context: lodash.cloneDeep(this.cores[srcFlowCode].context.context),
          req: lodash.cloneDeep(this.cores[srcFlowCode].context.req),
          res: lodash.cloneDeep(this.cores[srcFlowCode].context.res),
          noticeList: lodash.cloneDeep(this.cores[srcFlowCode].context.noticeList),
          todoList: lodash.cloneDeep(this.cores[srcFlowCode].context.todoList),
          logs: lodash.cloneDeep(this.cores[srcFlowCode].context.logs),
          error: lodash.cloneDeep(this.cores[srcFlowCode].context.error),
          filterLineShow: this.cores[srcFlowCode].context.filterLineShow,
          field: lodash.cloneDeep(this.cores[srcFlowCode].context.field),
          flowCode
        },
        flow: this.app._flowMap[appFlowCode],
        specialValue: ''
      };
    }
    if (data) {
      lodash.assign(this.cores[flowCode].context, data);
    }

    this.activeCode = flowCode;
    return this;
  }
  private from(filter: NodeFilter): this {
    const result = this.filter(filter);
    if (result) {
      lodash.assign(this.cores[this.activeCode], {
        fromNodeId: result.nodeId,
        fromNodeConfig: result.nodeConfig,
        fromNodeLines: result.lines,
        fromNode: result.node
      });
      lodash.assign(this.cores[this.activeCode].context, {
        fromNodeCode: result.nodeConfig.code
      });
    } else {
      lodash.assign(this.cores[this.activeCode].context, {
        fromNodeCode: undefined
      });
    }
    return this;
  }
  private to(filter: NodeFilter): this {
    const result = this.filter(filter);
    if (result) {
      lodash.assign(this.cores[this.activeCode], {
        toNodeId: result.nodeId,
        toNodeConfig: result.nodeConfig,
        toNodeLines: result.lines,
        toNode: result.node
      });
      lodash.assign(this.cores[this.activeCode].context, {
        toNodeCode: result.nodeConfig.code
      });
    } else {
      lodash.assign(this.cores[this.activeCode], {
        toNodeId: undefined,
        toNodeConfig: undefined,
        toNodeLines: undefined,
        toNode: undefined
      });
      lodash.assign(this.cores[this.activeCode].context, {
        toNodeCode: undefined
      });
    }
    return this;
  }
  private from2To(copy: boolean): this {
    const core = this.cores[this.activeCode];
    lodash.assign(core, {
      toNodeId: core.fromNodeId,
      toNodeConfig: core.fromNodeConfig,
      toNodeLines: core.fromNodeLines,
      toNode: core.fromNode
    });
    lodash.assign(this.cores[this.activeCode].context, {
      toNodeCode: core.fromNodeConfig?.code
    });
    if (copy === false) {
      lodash.assign(core, {
        fromNodeId: undefined,
        fromNodeConfig: undefined,
        fromNodeLines: undefined,
        fromNode: undefined
      });
      lodash.assign(this.cores[this.activeCode].context, {
        fromNodeCode: undefined
      });
    }
    return this;
  }
  private to2From(copy: boolean): this {
    const core = this.cores[this.activeCode];
    lodash.assign(core, {
      fromNodeId: core.toNodeId,
      fromNodeConfig: core.toNodeConfig,
      fromNodeLines: core.toNodeLines,
      fromNode: core.toNode
    });
    lodash.assign(this.cores[this.activeCode].context, {
      fromNodeCode: core.toNodeConfig?.code
    });
    if (copy === false) {
      lodash.assign(core, {
        toNodeId: undefined,
        toNodeConfig: undefined,
        toNodeLines: undefined,
        toNode: undefined
      });
      lodash.assign(this.cores[this.activeCode].context, {
        toNodeCode: undefined
      });
    }
    return this;
  }
  private explainLines(lines: Array<{id: string; line: FlowLine}>) {
    const noError = lines.filter(item => item.line.error === false);
    return {
      noError,
      def: noError.length === 1 ? noError[0] : noError.find(item => item.line.def),
      error: lines.find(item => item.line.error === true)
    };
  }
  private checkFrom(): this {
    this.throwIf(!this.cores[this.activeCode].fromNode, '起始节点没有实现');
    return this;
  }
  private line(action: {
    id: string;
    line: FlowLine;
  }): this {
    lodash.assign(this.cores[this.activeCode], {
      lineId: action.id,
      lineConfig: action.line
    });
    lodash.assign(this.cores[this.activeCode].context, {lineCode: action.line.code});
    return this;
  }
  private async specilAndField(): Promise<this> {
    const core = this.cores[this.activeCode];
    let specialValue: string | void;
    if (core.fromNode && (core.fromNode instanceof FlowNode || core.fromNode instanceof FlowNodeStart || core.fromNode instanceof FlowNodeSystem)) {
      specialValue = await core.fromNode.special.call(core.context);
    }
    if (!specialValue) {
      specialValue = await core.flow.special.call(core.context);
    }
    if (specialValue) {
      core.specialValue = specialValue;
      if (core.fromNode! instanceof FlowNode || core.fromNode! instanceof FlowNodeStart || core.fromNode! instanceof FlowNodeSystem) {
        Object.assign(core.context, {
          field: core.fromNodeConfig
            && core.fromNodeConfig.fields
            && core.fromNodeConfig.fields[core.specialValue] || {}
        });
      }
    }
    return this;
  }
  private async _doFlow(skip: boolean) {
    let core = this.cores[this.activeCode];
    const to = core.toNodeConfig?.name || core.toNodeId || 'unkonwn';
    let from = core.fromNodeConfig?.name || core.fromNodeId || 'unkonwn';
    debugFlow(`${ core.flowCode }>>>[${ from }]=>[${ core.lineConfig?.name || core.lineConfig?.code || core.lineId || 'unkonwn' }]=>[${ to }]`);
    core.context.todoList.clear();
    if (core.lineConfig?.log && skip !== true) {
      core.context.logs.push(core.lineConfig.log);
    }
    const toType = core.toNodeConfig!.type;
    const lines = this.explainLines(core.toNodeLines!);
    this.throwIf(toType !== 'end' && lines.noError.length === 0, `${ to }无非错误出线`);

    let nextAction: {id: string; line: FlowLine} | undefined;
    let skipDo = false;
    switch (toType) {
      case 'start': {
        this.throwNow('开始节点不能被指向');
        break;
      }
      case 'task': {
        try {
          const node = core.toNode! as FlowNode<Q, S, C, M>;
          await node.excute.call(core.context);
          await node.todo.call(core.context);
          if (core.context.todoList.size === 0) {
            if (core.toNodeConfig!.empty === 1) {
              nextAction = lines.def;
              skipDo = true;
            } else if (core.toNodeConfig!.empty === 2) {
              this.throwNow(`${ to }找不到可执行人`);
            }
          }
          if (core.context.todoList.has(this.ctx.me.userid)) {
            if (core.toNodeConfig!.me === 1) {
              nextAction = lines.def;
              skipDo = true;
            }
          }
        } catch (error: any) {
          if (error.eggBag !== 1 && lines.error) {
            core.context.error.push(error.message);
            nextAction = lines.error;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'auto': {
        try {
          const node = core.toNode! as FlowNodeAuto<Q, S, C, M>;
          const nextSwitch = await node.excute.call(core.context);
          if (lines.noError.length > 1 && typeof nextSwitch === 'string') {
            nextAction = lines.noError.find(item => item.line.swi.includes(nextSwitch));
          }
          if (!nextAction) {
            nextAction = lines.def;
          }
          this.throwIf(!nextAction, `${ to }结果为${ nextSwitch },但无匹配的操作`);
        } catch (error: any) {
          if (error.eggBag !== 1 && lines.error) {
            core.context.error.push(error.message);
            nextAction = lines.error;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'shunt': {
        try {
          const node = core.toNode! as FlowNodeShunt<Q, S, C, M>;
          const nextSwitch = await node.excute.call(core.context);
          if (lines.noError.length > 1 && typeof nextSwitch === 'object') {
            let i = 0;
            for (const [k, data] of Object.entries(nextSwitch)) {
              const matchAction = lines.noError.find(item => item.line.swi.includes(k)) || lines.def;
              this.throwIf(!matchAction, `${ to }结果为${ k },但无匹配的操作`);
              await this.active(`${ core.flowCode }-${ i++ }`, data).to2From(false).line(matchAction!).to({id: matchAction?.line.to})._doFlow(false);
            }
            return;
          } else {
            this.throwIf(!lines.def, `${ to }无匹配的操作`);
            nextAction = lines.def;
          }
        } catch (error: any) {
          if (error.eggBag !== 1 && lines.error) {
            core.context.error.push(error.message);
            nextAction = lines.error;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'child': {
        const child = core.toNodeConfig!.child!;
        this.throwIf(!core.toNodeConfig?.child, '未声明子流程');
        const node = core.toNode! as FlowNodeChild<Q, S, C, M, any, any, any>;
        await node.excute.call(core.context);
        await this.save();
        const childData = await node.childContext.call(core.context);
        await this.append(child).active(child, childData).from({start: true}).checkFrom().init();
        core = this.cores[this.activeCode];
        const childLines = this.explainLines(core.fromNodeLines!);
        from = core.fromNodeConfig?.name || core.fromNodeId || 'unkonwn';
        this.throwIf(!childLines.def, `${ from }无默认出线`);
        nextAction = childLines.def;
        break;
      }
      case 'sys': {
        try {
          const node = core.toNode! as FlowNodeSystem<Q, S, C, M>;
          await node.excute.call(core.context);
        } catch (error: any) {
          if (error.eggBag !== 1 && lines.error) {
            core.context.error.push(error.message);
            nextAction = lines.error;
          } else {
            throw error;
          }
        }
        break;
      }
      case 'end': {
        const node = core.toNode! as FlowNodeEnd<Q, S, C, M>;
        await node.excute.call(core.context);
        break;
      }
    }
    if (nextAction) {
      await this.to2From(false).line(nextAction).to({id: nextAction.line.to})._doFlow(skipDo);
    } else if (core.toNode && (core.toNode instanceof FlowNode || core.toNode instanceof FlowNodeEnd || core.toNode instanceof FlowNodeSystem)) {
      await core.toNode.notice.call(core.context);
      await this.save();
      const activeIndex = this.activeIndex();
      if (core.toNodeConfig!.up === true && activeIndex > 0) {
        const parentCodes = this.flowCodes[activeIndex - 1];
        for (const parentCode of parentCodes) {
          const child = core.flowCode;
          this.active(parentCode).from({child});
          core = this.cores[this.activeCode];
          from = core.fromNodeConfig?.name || core.fromNodeId || 'unkonwn';
          if (core.fromNode) {
            this.throwIf(core.fromNodeLines!.length !== 1, `${ from }只能有一个出线`);
            const parentNode = core.fromNode as FlowNodeChild<Q, S, C, M, any, any, any>;
            const parentData = await parentNode.parentContext.call(core.context, core.context.res, core.context.req, core.context.context);
            this.active(core.flowCode, parentData);
            await this.init();
            await this.line(core.fromNodeLines![0]).to({id: core.fromNodeLines![0].line.to})._doFlow(true);
          }
        }
      }
    } else {
      await this.save();
    }
  }
  private async save() {
    const core = this.cores[this.activeCode];
    await core.flow.save.call(core.context);
    core.context.error.length = core.context.logs.length = 0;
  }
  private getResult(key?: string) {
    const core = this.cores[this.activeCode];
    let tmplines: {id: string; line: FlowLine;}[] = [];
    let lines: SimplyFlowLine[] = [];
    if (core.toNodeLines) {
      tmplines = core.toNodeLines.filter(item => {
        const show = core.context.filterLineShow[item.id]
          || core.context.filterLineShow[item.line.code]
          || (item.line.hide === false && item.line.error === false)
          || (key && item.line.key === key);
        if (show === true) {
          if (item.line.blackList && item.line.blackList.length > 0 && item.line.blackList.includes(core.specialValue)) {
            return false;
          }
          if (item.line.whiteList && item.line.whiteList.length > 0 && item.line.whiteList.includes(core.specialValue)) {
            return true;
          }
          return true;
        } else {
          return false;
        }
      });
      tmplines.sort((a, b) => a.line.index > b.line.index ? 1 : -1);
      lines = tmplines.map(item => this.line2Simply(item, core));
    }
    return {
      res: core.context.res,
      flowCode: core.flowCode,
      fromNodeId: core.toNodeId,
      fromNodeCode: core.toNodeConfig?.code,
      lines,
      fields: core.context.field,
      error: core.context.error,
      flowPath: this.flowPath
    };
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
  private filter(filter: NodeFilter) {
    let nodeId: string | undefined;
    let nodeConfig: FlowNodeConfig | undefined;
    const flowData = this.cores[this.activeCode].flow.flowData;
    const nodes = this.cores[this.activeCode].flow.nodes;
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
    if (nodeId && nodeConfig) {
      const lines = new Array<{line: FlowLine; id: string}>();
      for (const [id, line] of Object.entries(flowData.lines)) {
        if (line.from === nodeId) {
          lines.push({id, line});
        }
      }
      this.throwIf(nodeType[nodeConfig.type] !== undefined && !nodeConfig.code, `${ nodeConfig.name }(${ nodeId })没有实现!`);
      this.throwIf(!nodes[nodeConfig.code!], `${ nodeConfig.name }(${ nodeId })没有实现!`);
      const node = nodes[nodeConfig.code!]!;
      this.throwIfNot(node instanceof nodeType[nodeConfig.type], `${ nodeConfig.name }(${ nodeId })定义是${ nodeConfig.type },但实现不是`);

      return {
        node, nodeId, nodeConfig, lines
      };
    }
  }
  private line2Simply(item: {id: string; line: FlowLine}, core: FlowCore<Q, S, C, M>): SimplyFlowLine {
    const explains = explainCode.exec(core.flowCode);
    const activeIndex = this.flowCodes.findIndex(item => item.includes(explains![1]));
    return {
      name: item.line.name,
      code: item.line.code,
      from: item.line.from,
      to: item.line.to,
      right: item.line.right,
      back: item.line.back,
      id: item.id,
      fast: item.line.fast,
      flow: this.flowCodes.slice(0, activeIndex + 1).map(item => item[0]).join('/')
    };
  }
}