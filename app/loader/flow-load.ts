import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {Flow} from '../util/flow';
import {FlowNodeBase} from 'typings';
const debug = require('debug')('egg-bag:loader');

export function loadFlow(this: Application) {
  this._flowMap = {};
  const flowPath = path.join(this.baseDir, 'app', 'flow');
  if (fs.existsSync(flowPath)) {
    const flowNames = fs.readdirSync(path.join(flowPath));
    for (const flowName of flowNames) {
      const oneFlowPath = path.join(flowPath, flowName);
      const subFiles = fs.readdirSync(oneFlowPath);
      let flow: Flow<any, any, any, any> | undefined;
      const nodes: {[code: string]: FlowNodeBase} = {};
      for (const subFile of subFiles) {
        const subFileName = subFile.replace(path.extname(subFile), '');
        const subFullPath = path.join(oneFlowPath, subFile);
        const stat = fs.statSync(subFullPath);
        if (stat.isDirectory() === false) {
          if (subFileName === 'index') {
            flow = new (require(subFullPath).default)() as Flow<any, any, any, any>;
            const flowData = require(path.join(oneFlowPath, 'data.json'));
            Object.assign(flow, {flowData});
            debug(`found flow ${ flowName }`);
          } else if (subFileName !== 'data' && subFileName !== 'defined') {
            nodes[subFileName] = new (require(subFullPath).default)();
          }
        }
      }
      if (flow) {
        Object.assign(flow, {nodes});
        this._flowMap[flowName] = flow;
      }
    }
  }
}