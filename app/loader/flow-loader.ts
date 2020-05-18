import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {Flow, FlowStartNode, FlowEndNode, FlowAutoNode, FlowNode} from '../../typings';
const debug = require('debug')('egg-bag');

export function loadFlow(this: Application) {
  this._flowMap = {};
  const flowPath = path.join(this.baseDir, 'app', 'flow');
  const flowNames = fs.readdirSync(path.join(flowPath));
  for (const flowName of flowNames) {
    const oneFlowPath = path.join(flowPath, flowName);
    const subFiles = fs.readdirSync(oneFlowPath);
    let flow: Flow<any, any, any> | undefined;
    const nodeNames = new Array<string[]>();
    for (const subFile of subFiles) {
      const subFileName = subFile.replace(path.extname(subFile), '');
      const subFullPath = path.join(oneFlowPath, subFile);
      const stat = fs.statSync(subFullPath);
      if (stat.isDirectory() === false) {
        if (subFileName === 'index') {
          flow = this._flowMap[flowName] = new (require(subFullPath).default)() as Flow<any, any, any>;
          debug(`found flow ${ flowName }`);
        } else {
          nodeNames.push([subFileName, subFullPath]);
        }
      }
    }
    if (flow) {
      for (const [subFileName, subFullPath] of nodeNames) {
        const node = this._flowMap[flowName] = new (require(subFullPath).default)();
        if (node instanceof FlowStartNode) {
          flow.startNode = node;
          flow.startNodeCode = subFileName;
          debug(`found flow ${ flowName }'s startNode: ${ subFileName }`);
        } else if (node instanceof FlowEndNode) {
          flow.endNode = node;
          flow.endNodeCode = subFileName;
          debug(`found flow ${ flowName }'s endNode: ${ subFileName }`);
        } else if (node instanceof FlowAutoNode) {
          flow.autoNodes[subFileName] = node;
          debug(`found flow ${ flowName }'s autoNode: ${ subFileName }`);
        } else if (node instanceof FlowNode) {
          flow.nodes[subFileName] = node;
          debug(`found flow ${ flowName }'s node: ${ subFileName }`);
        }
      }
    }
  }
}