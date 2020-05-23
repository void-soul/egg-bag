import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {Flow} from '../util/flow';
import {FlowNode} from 'typings';
const debug = require('debug')('egg-bag');

export function loadFlow(this: Application) {
  this._flowMap = {};
  const flowPath = path.join(this.baseDir, 'app', 'flow');
  if (fs.existsSync(flowPath)) {
    const flowNames = fs.readdirSync(path.join(flowPath));
    for (const flowName of flowNames) {
      const oneFlowPath = path.join(flowPath, flowName);
      const subFiles = fs.readdirSync(oneFlowPath);
      let flow: Flow<any, any> | undefined;
      const nodes: {[code: string]: FlowNode} = {};
      for (const subFile of subFiles) {
        const subFileName = subFile.replace(path.extname(subFile), '');
        const subFullPath = path.join(oneFlowPath, subFile);
        const stat = fs.statSync(subFullPath);
        if (stat.isDirectory() === false) {
          if (subFileName === 'index') {
            flow = new (require(subFullPath).default)() as Flow<any, any>;
            const flowData = require(path.join(oneFlowPath, 'data.json'));
            Object.assign(flow, {flowData});
            const field = path.join(oneFlowPath, 'field.json');
            if (fs.existsSync(field)) {
              const flowField = require(path.join(oneFlowPath, 'field.json'));
              Object.assign(flow, {flowField});
            }
            debug(`found flow ${ flowName }`);
          } else if (subFileName !== 'data' && subFileName !== 'field') {
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