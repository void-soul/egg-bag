import {FlowFields, FlowData, FlowNotice, FlowLine, SqlSession, Application, IService, FlowNodeConfig, FlowNode} from '../../typings';
import {Context} from 'egg';

/**
 * 流程上下文
 * D: 流转data 类型定义
 * R: 流程输出类型
 */
export abstract class FlowContext<D, F extends FlowFields> {
  readonly ctx: Context;
  readonly service: IService;
  readonly app: Application;
  /** 事务 */
  readonly conn: SqlSession;
  /** 提交流程时，业务相关参数 */
  readonly biz: D;

  /** 查询、执行必须参数 */
  readonly flowPath: string;
  readonly flowCode: string;
  readonly flowPaths: string[];
  readonly flowCodeIndex: number;

  /** 源节点 */
  readonly fromNodeCode?: string;
  readonly fromNodeId?: string;
  readonly fromNodeLabel?: string;
  readonly fromNodeConfig?: FlowNodeConfig;
  readonly fromNode?: FlowNode;
  readonly fromNodeLines?: Array<{id: string; line: FlowLine}>;
  /** 目标节点*/
  readonly toNodeCode?: string;
  readonly toNodeId?: string;
  readonly toNodeLabel?: string;
  readonly toNodeConfig?: FlowNodeConfig;
  readonly toNode?: FlowNode;
  readonly toNodeLines?: Array<{id: string; line: FlowLine}>;

  /** 当前处理的操作id或者操作编码:处理时前端必传 */
  readonly lineId?: string;
  /** 当前处理的操作id或者操作编码:处理时前端必传 */
  readonly lineCode?: string;
  /** 当前处理的操作文字 */
  readonly lineLabel?: string;
  /** 当前生效字段列表 */
  field: F;

  /** 消息通知 */
  readonly noticeList: FlowNotice[];
  /** 任务执行人id */
  readonly todoList: Set<any>;
  /** 日志 */
  readonly logs: string[];
  /** 可能存在的异常信息,每个节点处理完异常后，可以将异常对象从上下文移除，以通知其他节点异常已经解决 */
  readonly error?: Error;


  /** 流程字段汇总.nodeType可以是各节点值，也可以是自定义字符 */
  readonly flowField: {[nodeType: string]: F};
  /** 实现类缓存 */
  readonly nodes: {[key: string]: FlowContext<D, F>};
  /** 流程配置 */
  readonly flowData: FlowData;
  /** 保存数据 */
  abstract save(): Promise<void>;
}

/**
 * 流程定义
 * D: 流转上下文 类型定义
 * F: 流程字段类型
 */
export abstract class Flow<D, F extends FlowFields> extends FlowContext<D, F>{
  /** 流程字段汇总.nodeType可以是各节点值，也可以是自定义字符 */
  readonly flowField: {[nodeType: string]: F} = {};
  /** 流程配置 */
  readonly flowData: FlowData = {nodes: {}, lines: {}};
  /** 实现类缓存 */
  readonly nodes: {[key: string]: FlowContext<D, F>} = {};
  /** 保存数据 */
  abstract save(): Promise<void>;
  /** 进入流程时，用来初始化上下文 */
  abstract init(): Promise<void>;
  /** 流程查询时，用来初始化上下文 */
  abstract fetch(): Promise<void>;
}
/** 任务结点(若找不到执行人员,将抛出异常) */
export abstract class FlowTaskNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 从此节点获取流程数据 */
  abstract fetch(): Promise<void>;
  /** 流程从此节点开始执行时触发 */
  abstract init(): Promise<void>;
  /** 流程流转入此节点时触发 */
  abstract enter(): Promise<void>;
  /** 可操作人ID列表:当流程处理到此节点并暂停时触发 */
  abstract todo(): Promise<void>;
  /** 消息列表:当流程处理到此节点为一个中断时触发 */
  abstract notice(): Promise<void>;
}
/** 开始结点(一个流程可以有多个开始节点,除了子流程的开始节点外,所有开始节点都不能被指向)*/
export abstract class FlowStartNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 从此节点获取流程数据 */
  abstract fetch(): Promise<void>;
  /** 流程从此节点开始执行时触发 */
  abstract init(): Promise<void>;
}
/**
 * 结束节点：无出线
 */
export abstract class FlowEndNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 流程流转入此节点时触发 */
  abstract enter(): Promise<void>;
  /** 消息列表:当流程处理到此节点为一个中断时触发 */
  abstract notice(): Promise<void>;
}
/**  自动结点 无需人为,不能暂停,返回数字|undefined决定流程走向. */
export abstract class FlowAutoNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 数据处理，返回number|void */
  abstract enter(): Promise<number | void>;
}
/** 可跳过的任务节点(若找不到执行人员,将跳过该节点)*/
export abstract class FlowSkipNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 从此节点获取流程数据 */
  abstract fetch(): Promise<void>;
  /** 流程从此节点开始执行时触发 */
  abstract init(): Promise<void>;
  /** 流程流转入此节点时触发 */
  abstract enter(): Promise<void>;
  /** 可操作人ID列表:当流程处理到此节点并暂停时触发 */
  abstract todo(): Promise<void>;
  /** 消息列表:当流程处理到此节点为一个中断时触发 */
  abstract notice(): Promise<void>;
}

/** 系统节点(无需人为,可暂停并作为执行入口)*/
export abstract class FlowSysNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  /** 流程从此节点开始执行时触发 */
  abstract init(): Promise<void>;
  /** 流程流转入此节点时调用 */
  abstract enter(): Promise<void>;
  /** 消息列表:当流程处理到此节点为一个中断时触发 */
  abstract notice(): Promise<void>;
}

/** 子流程入口(存在于父流程中,需要指定一个子流程编号,一个父流程目前仅支持一个同名子流程编号) */
export abstract class FlowChildNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  abstract enter(): Promise<void>;
}
/** 子流程上报(相当于一种特殊的结束节点,不过会根据此节点返回值反调父流程中的 【子流程入口】的对应操作) */

export abstract class FlowReportNode<D, F extends FlowFields> extends FlowContext<D, F> implements FlowNode {
  abstract enter(): Promise<number | undefined>;
}