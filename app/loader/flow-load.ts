import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {FlowAction} from '../../typings';
import {isArray} from 'util';

//#region
// // flow-1 结构：流程/节点/操作，每个流程、节点、操作都可以定义别名，适用到其他的流程、节点、操作上; 流程、节点、操作都需要实现接口 Flow1\FlowNode1\FlowAction1;其中文件夹内的index.ts视为流程、节点的定义文件
// export function loadFlow1(this: Application) {
//   this._flowMap = {};
//   this._flowNodeMap = {};
//   this._flowActionMap = {};

//   const flowPath1 = path.join(this.baseDir, 'app', 'flow-1');
//   if (fs.existsSync(flowPath1)) {
//     const flows = fs.readdirSync(flowPath1);
//     for (const flow of flows) {
//       this.coreLogger.warn(`[egg-bag] start to load flow1: ${ flow }`);
//       const nodes = fs.readdirSync(path.join(flowPath1, flow));
//       for (const node of nodes) {
//         const nodeName = node.replace(path.extname(node), '');
//         let flowAlias: string[] | undefined;
//         if (nodeName === 'index') {
//           this.coreLogger.warn(`[egg-bag] found ${ flow } define-file: ${ path.join(flowPath1, flow, node) } `);
//           this._flowMap[flow] = new (require(path.join(flowPath1, flow, node)).default)();
//           flowAlias = this._flowMap[flow].alias;
//           if (flowAlias) {
//             this.coreLogger.warn(`[egg-bag] found ${ flow } alias: ${ flowAlias.join() } `);
//             for (const aname of flowAlias) {
//               this._flowMap[aname] = this._flowMap[flow];
//             }
//           }
//         } else {
//           this.coreLogger.warn(`[egg-bag] found ${ flow } Node1 ${ node }: ${ path.join(flowPath1, flow, node) } `);
//           const actions = fs.readdirSync(path.join(flowPath1, flow, node));
//           for (const action of actions) {
//             const actionName = action.replace(path.extname(action), '');
//             let nodeAlias: string[] | undefined;
//             if (actionName === 'index') {
//               this.coreLogger.warn(`[egg-bag] found ${ flow } Node1 ${ node } define-file: ${ path.join(flowPath1, flow, node, action) } `);
//               this._flowNodeMap[`${ flow }/${ node }`] = new (require(path.join(flowPath1, flow, node, action)).default)();
//               this.throwIfNot(!this._flowNodeMap[`${ flow }/${ node }`].autoAction, `[egg-bag] found ${ flow } Node1 ${ node } define-file error, autoAction must be empty`);
//               nodeAlias = this._flowNodeMap[`${ flow }/${ node }`].alias;
//               if (nodeAlias) {
//                 this.coreLogger.warn(`[egg-bag] found ${ flow } Node ${ node } alias: ${ nodeAlias.join() } `);
//                 for (const aname of nodeAlias) {
//                   this._flowNodeMap[`${ flow }/${ aname }`] = this._flowNodeMap[`${ flow }/${ node }`];
//                 }
//                 if (flowAlias) {
//                   for (const fname of flowAlias) {
//                     for (const aname of nodeAlias) {
//                       this._flowNodeMap[`${ fname }/${ aname }`] = this._flowNodeMap[`${ flow }/${ node }`];
//                     }
//                   }
//                 }
//               }
//             } else {
//               this.coreLogger.warn(`[egg-bag] found ${ flow } Node1 ${ node } Action1 ${ actionName }`);
//               this._flowActionMap[`${ flow }/${ node }/${ actionName }`] = new (require(path.join(flowPath1, flow, node, action)).default)();
//               if (this._flowActionMap[`${ flow }/${ node }/${ actionName }`]['auto'] === true) {
//                 if (!this._flowNodeMap[`${ flow }/${ node }`]) {
//                   this._flowNodeMap[`${ flow }/${ node }`] = {};
//                 }
//                 this._flowNodeMap[`${ flow }/${ node }`].autoAction = actionName;
//                 this.coreLogger.warn(`[egg-bag] found ${ flow } Node ${ node } autoAction: ${ actionName } `);
//               }
//               const alias = this._flowActionMap[`${ flow }/${ node }/${ actionName }`]['alias'];
//               if (alias) {
//                 this.coreLogger.warn(`[egg-bag] found ${ flow } Node ${ node } Action ${ actionName } alias: ${ alias.join() } `);
//                 for (const aname of alias) {
//                   this._flowActionMap[`${ flow }/${ node }/${ aname }`] = this._flowActionMap[`${ flow }/${ node }/${ actionName }`];
//                 }
//                 if (flowAlias && nodeAlias) {
//                   for (const fname of flowAlias) {
//                     for (const nname of nodeAlias) {
//                       for (const aname of alias) {
//                         this._flowActionMap[`${ fname }/${ nname }/${ aname }`] = this._flowActionMap[`${ flow }/${ node }/${ actionName }`];
//                       }
//                     }
//                   }
//                 } else if (flowAlias) {
//                   for (const fname of flowAlias) {
//                     for (const aname of alias) {
//                       this._flowActionMap[`${ fname }/${ node }/${ aname }`] = this._flowActionMap[`${ flow }/${ node }/${ actionName }`];
//                     }
//                   }
//                 } else if (nodeAlias) {
//                   for (const nname of nodeAlias) {
//                     for (const aname of alias) {
//                       this._flowActionMap[`${ flow }/${ nname }/${ aname }`] = this._flowActionMap[`${ flow }/${ node }/${ actionName }`];
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   } else {
//     this.coreLogger.warn(`[egg-bag] not found flow-1 path ${ flowPath1 }`);
//   }
// }
//#endregion
// flow-2 结构：归类/操作，每个操作需要定义 flow、node，表示本操作可以在哪些流程、节点上使用,操作需要实现接口 FlowActionAction2,其中文件夹内的 index.ts视为所以action配置文件,实现接口Flow2
export function loadFlow2(this: Application) {
  this._flowActionMap = {};
  const flowPath2 = path.join(this.baseDir, 'app', 'flow');
  if (fs.existsSync(flowPath2)) {
    const actions = fs.readdirSync(path.join(flowPath2));
    for (const action of actions) {
      const start = +new Date();
      const actionName = action.replace(path.extname(action), '');
      this.coreLogger.warn(`[egg-bag] found flow-action ${ actionName }`);
      const flowAction2 = new (require(path.join(flowPath2, action)).default)() as FlowAction;
      if (flowAction2.flowConfig) {
        for (const config of flowAction2.flowConfig) {
          const flowCodes = isArray(config.flowCode) ? config.flowCode : [config.flowCode];
          const nodeCodes = isArray(config.nodeCode) ? config.nodeCode : [config.nodeCode];
          for (const flowCode of flowCodes) {
            for (const nodeCode of nodeCodes) {
              this._flowActionMap[`${ flowCode }/${ nodeCode }/${ actionName }`] = flowAction2;
            }
          }
        }
      }
      this.coreLogger.warn(`[egg-bag] read over flow-action ${ actionName }, +${ +new Date() - start }ms`);
    }
  } else {
    this.coreLogger.warn(`[egg-bag] not found flow path ${ flowPath2 }`);
  }
}