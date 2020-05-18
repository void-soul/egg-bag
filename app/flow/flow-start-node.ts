import {FlowFields} from '../../typings';
import FlowContext from './flow-context';
export default abstract class FlowStartNode<D, R, F extends FlowFields> extends FlowContext<D, R, F>{
  abstract init(): Promise<void>;
}