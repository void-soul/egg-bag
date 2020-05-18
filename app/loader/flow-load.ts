import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {FlowAction, Flow} from '../../typings';
import {isArray} from 'util';
const debug = require('debug')('egg-bag');

function loadOneAction(this: Application, file: string, fullPath: string, scranConfig: boolean) {
  const fileName = file.replace(path.extname(file), '');
  debug(`found flow-action ${ fileName }`);
  const flowAction = new (require(fullPath).default)() as FlowAction;
  if (scranConfig && flowAction.flowConfig) {
    for (const config of flowAction.flowConfig) {
      const flowCodes = isArray(config.flowCode) ? config.flowCode : [config.flowCode];
      const nodeCodes = isArray(config.nodeCode) ? config.nodeCode : [config.nodeCode];
      for (const flowCode of flowCodes) {
        for (const nodeCode of nodeCodes) {
          this._flowActionMap[`${ flowCode }/${ nodeCode }/${ fileName }`] = flowAction;
        }
      }
    }
  }
  if (!flowAction.flowConfig) {
    flowAction.flowConfig = [];
  }
  return flowAction;
}


export function loadFlow(this: Application) {
  this._flowActionMap = {};
  this._flowNodeDefined = {};
  this._flowActionDefined = {};
  const flowPath = path.join(this.baseDir, 'app', 'flow');
  if (fs.existsSync(flowPath)) {
    global['flowActionConfig'] = new Map();
    const files = fs.readdirSync(path.join(flowPath));
    for (const file of files) {
      const fullPath = path.join(flowPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const subFiles = fs.readdirSync(fullPath);
        const actionCache: {[k: string]: FlowAction} = {};
        let flow: Flow | undefined;
        for (const subFile of subFiles) {
          const subFileName = subFile.replace(path.extname(subFile), '');
          const subFullPath = path.join(fullPath, subFile);
          if (subFileName === 'index') {
            flow = new (require(subFullPath).default)() as Flow;
            if (flow.defined) {
              for (const defined of flow.defined) {
                for (const [nodeCode, node] of Object.entries(defined.nodes)) {
                  this._flowNodeDefined[`${ file }/${ defined.code }/${ nodeCode }`] = node;
                  if (node.actions) {
                    for (const action of node.actions) {
                      let cache = global['flowActionConfig'].get(`${ file }/${ action.code }`);
                      if (!cache) {
                        cache = [];
                      }
                      cache.push({
                        flowCode: defined.code,
                        nodeCode
                      });
                      global['flowActionConfig'].set(`${ file }/${ action.code }`, cache);
                    }
                  }
                }
              }
            }
            debug(`found flow ${ file }`);
          }
        }

        for (const subFile of subFiles) {
          const subFileName = subFile.replace(path.extname(subFile), '');
          const subFullPath = path.join(fullPath, subFile);
          if (subFileName !== 'index') {
            actionCache[subFileName] = loadOneAction.call(this, subFileName, subFullPath, false);
          }
        }
        if (flow && flow.defined) {
          for (const defined of flow.defined) {
            for (const [nodeCode, node] of Object.entries(defined.nodes)) {
              if (node.actions) {
                for (const action of node.actions) {
                  if (actionCache[action.code]) {
                    this._flowActionMap[`${ file }/${ defined.code }/${ nodeCode }/${ action.code }`] = actionCache[action.code];
                    this._flowActionDefined[`${ file }/${ defined.code }/${ nodeCode }/${ action.code }`] = action;
                  }
                }
              }
            }
          }
        }
      } else {
        loadOneAction.call(this, file, fullPath, true);
      }
    }
  } else {
    debug(`not found flow path ${ flowPath }`);
  }
}