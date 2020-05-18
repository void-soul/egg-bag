import {FlowFields, FlowAction, FlowStartNode, FlowEndNode, FlowNode, FlowAutoNode} from '../../typings';
import FlowContext from './flow-context';

export default abstract class Flow<D, R, F extends FlowFields> extends FlowContext<D, R, F>{
  abstract flowData: {nodes: any; areas: any; lines: any};
  abstract flowConfig: {[node: string]: FlowAction[]};
  abstract flowField: {
    [nodeType: string]: F;
  };
  startNodeCode: string;
  startNode: FlowStartNode<D, R, F>;
  endNodeCode: string;
  endNode: FlowEndNode<D, R, F>;
  nodes: {[key: string]: FlowNode<D, R, F>};
  autoNodes: {[key: string]: FlowAutoNode<D, R, F>};
  /** 保存数据 */
  abstract save(): Promise<void>;
}