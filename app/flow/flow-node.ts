import {FlowFields, FlowNotice} from '../../typings';
import FlowContext from './flow-context';

export default abstract class FlowNode<D, R, F extends FlowFields> extends FlowContext<D, R, F>{
  /** 数据初始化：界面请求时，用于初始化流程上下文数据.需要在这里给上下文绑定 actions、fields */
  abstract init(): Promise<void>;
  /** 流程进入此节点时调用 */
  abstract enter(): Promise<void>;
  /** 可操作人ID列表:当流程处理到此节点为一个中断时触发 */
  abstract todo(): Promise<any[]>;
  /** 消息列表:当流程处理到此节点为一个中断时触发 */
  abstract notice(): Promise<FlowNotice[]>;
}