import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
const debug = require('debug')('egg-bag:loader');
export function loadSync(this: Application) {
  // 异步消息的this永远都是虚拟的context
  const syncSubPath = path.join(this.baseDir, 'app', 'sub-sync');
  if (fs.existsSync(syncSubPath)) {
    const subFiles = fs.readdirSync(syncSubPath);
    for (const subFile of subFiles) {
      const sub = require(path.join(syncSubPath, subFile)).default;
      const subName = subFile.replace(/.js|.ts/, '');
      this.subSync(subName, sub);
    }
  } else {
    debug(`not found sync-sub path ${ syncSubPath }`);
  }
}

export function loadAsync(this: Application) {
  // 当从this.ctx发送消息时,this会沿用
  // 当从this.app发送消息时,this指向虚拟context
  this._asyncSubClient = {};
  const asyncSubPath = path.join(this.baseDir, 'app', 'sub-async');
  if (fs.existsSync(asyncSubPath)) {
    const subFiles = fs.readdirSync(asyncSubPath);
    for (const subFile of subFiles) {
      const subName = subFile.replace(/.js|.ts/, '');
      const sub = require(path.join(asyncSubPath, subFile)).default;
      this.subASync(subName, sub);
    }
  } else {
    debug(`not found async-sub path ${ asyncSubPath }`);
  }
}