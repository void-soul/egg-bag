import {FlowField, FlowData, FlowLine, SqlSession, Application, IService, FlowNodeConfig, FlowNode} from '../../typings';
import {Context} from 'egg';

/**
 * 流程上下文
 * D: 流转data 类型定义
 * R: 流程输出类型
 */
export abstract class FlowContext<D, M> {
  readonly _specialValue: string;
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
  /** 当前处理的操作日志 */
  readonly lingLog?: string;
  /** 当前生效字段列表 */
  field: FlowField;

  /** 消息通知 */
  readonly noticeList: M[];
  /** 任务执行人id */
  readonly todoList: Set<any>;
  /** 日志 */
  readonly logs: string[];
  /** 可能存在的异常信息,每个节点处理完异常后，可以将异常对象从上下文移除，以通知其他节点异常已经解决 */
  readonly error: string[];

  /** 实现类缓存 */
  readonly nodes: {[key: string]: FlowContext<D, M>};
  /** 流程配置 */
  readonly flowData: FlowData;
  /** 保存数据 */
  abstract save(): Promise<void>;
  /** 当本次流程[处理]完毕时,可以根据上下文返回数据给前端. */
  abstract finish(): Promise<D>;
}

/**
 * 流程定义
 * D: 流转上下文 类型定义
 * FlowField: 流程字段类型
 */
export abstract class Flow<D, M> extends FlowContext<D, M>{
  /** 流程配置 */
  readonly flowData: FlowData = {nodes: {}, lines: {}};
  /** 实现类缓存 */
  readonly nodes: {[key: string]: FlowContext<D, M>} = {};
  /** 当流程结束、暂停时，保存数据 */
  abstract save(): Promise<void>;
  /**  流程开始前、暂停后重新执行前、子流程开始前、子流程上报到父流程后执行父流程前，会执行init方法。 */
  abstract init(): Promise<void>;
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 当本次流程[处理]完毕时,可以根据上下文返回数据给前端. */
  abstract finish(): Promise<D>;
  /** 当节点被fetch时，前端需要根据节点返回的特殊字段值得到字段信息 */
  abstract special(): Promise<string>;
}
/** 任务结点(若找不到执行人员,将抛出异常) */
export abstract class FlowTaskNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 流程暂停后重新执行时，如果以此节点为起始节点，则会执行init方法。 */
  abstract init(): Promise<void>;
  /** 节点作为目标时执行,期间异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<void>;
  /** 在这里可以对上下文的todoList进行操作.只有 流程暂停前最后一个目标节点的todo方法有效。其余节点仅作为流程过渡的判断。 */
  abstract todo(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}
/** 开始结点 所有开始节点都不能被指向 */
export abstract class FlowStartNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /**  流程开始时、子流程开始时，会执行init方法。 */
  abstract init(): Promise<void>;
}
/**
 * 结束节点：不能指向其他节点
 */
export abstract class FlowEndNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 节点作为目标时执行 */
  abstract excute(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}
/**  自动结点 无需人为,不能暂停,返回数字|undefined决定流程走向. */
export abstract class FlowAutoNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 节点作为目标时执行,返回string可影响流程走向,抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<string | void>;
}
/**  分流结点(无需人为,不能暂停,返回key-value.key=走向,value=走向的上下文) */
export abstract class FlowShuntNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 节点作为目标时执行,返回key-value.key=走向,value=走向的上下文,返回void表示不分流，按默认line进行.抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<{[k: string]: D} | void>;
}
/** 可跳过的任务节点(若找不到执行人员,将跳过该节点)*/
export abstract class FlowSkipNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 前端调用fetch-flow获取流程数据时调用 */
  abstract fetch(): Promise<void>;
  /** 流程暂停后重新执行时，如果以此节点为起始节点，则会执行init方法。 */
  abstract init(): Promise<void>;
  /** 节点作为目标时执行,抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<void>;
  /** 在这里可以对上下文的todoList进行操作.只有 流程暂停前最后一个节点的todo方法有效。其余节点仅作为流程过渡的判断。 */
  abstract todo(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}

/** 系统节点(无需人为,可暂停并作为执行入口)*/
export abstract class FlowSysNode<D, M> extends FlowContext<D, M> implements FlowNode {
  /** 流程暂停后重新执行时，如果以此节点为起始节点，则会执行init方法。 */
  abstract init(): Promise<void>;
  /** 节点作为目标时执行,抛出异常会被error-action捕获并处理.若没有error-action,则抛出异常 */
  abstract excute(): Promise<void>;
  /** 在这里可以对流程上下文的noticeList进行操作。只有流程暂停、结束前最后一个目标节点的notice方法会被调用 */
  abstract notice(): Promise<void>;
}

/** 子流程入口(存在于父流程中,需要指定一个子流程编号,一个父流程目前仅支持一个同名子流程编号) */
export abstract class FlowChildNode<D, M, C> extends FlowContext<D, M> implements FlowNode {
  /** 进入子流程前执行，进入子流程后执行子流程的开始节点的默认操作 */
  abstract excute(): Promise<void>;
  /** 当发起子流程时，可以在这里根据自己的上下文构建子流程的上下文 */
  abstract childContext(): Promise<C>;
  /** 子流程上报时执行 */
  abstract report(): Promise<void>;
  /** 可以在这里根据子流程上下文构建父流程的上下文 */
  abstract parentContext(childContext: C): Promise<D>;
}