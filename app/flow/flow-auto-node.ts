import {FlowFields} from '../../typings';
import FlowContext from './flow-context';
export default abstract class FlowAutoNode<D, R, F extends FlowFields> extends FlowContext<D, R, F>{
  abstract enter(): Promise<string>;
}