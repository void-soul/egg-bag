import {Context, IService, Application} from 'egg';
import {SqlSession, FlowAction, FlowFields} from '../../typings';

export default class FlowContext<D, R, F extends FlowFields> {
  readonly ctx: Context;
  readonly service: IService;
  readonly app: Application;
  /** 事务 */
  readonly conn: SqlSession;
  /** 提交流程时，业务相关参数 */
  readonly data: D;
  /** 返回值 */
  readonly returnValue: R;
  /** 操作列表 */
  actions: FlowAction[];
  /** 字段列表 */
  fields: F;
  /* 现在执行的是哪个操作? */
  activeAction: FlowAction;
  /** 可能存在的异常信息,每个节点处理完异常后，可以将异常对象从上下文移除，以通知其他节点异常已经解决 */
  error?: Error;
}