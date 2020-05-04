import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';

export function loadSync(this: Application) {
  // 异步消息的this永远都是虚拟的context
  const syncSubPath = path.join(this.baseDir, 'app', 'sub-sync');
  if (fs.existsSync(syncSubPath)) {
    const subFiles = fs.readdirSync(syncSubPath);
    for (const subFile of subFiles) {
      const sub = require(path.join(syncSubPath, subFile)).default;
      const subName = subFile.replace(/.js|.ts/, '');
      this.coreLogger.warn(`[egg-bag] created a sync-sub named ${ subName } from ${ subFile }`);
      this.messenger.on(subName, (args: any[]) => {
        this.coreLogger.warn(`[egg-bag] sync-sub named ${ subName } from ${ subFile } has been called`);
        sub.call(this.createAnonymousContext(), ...args);
      });
      this.on(subName, (...args: any[]) => {
        this.coreLogger.warn(`[egg-bag] sync-sub named ${ subName } from ${ subFile } has been called`);
        sub.call(this.createAnonymousContext(), ...args);
      });
    }
  } else {
    this.coreLogger.warn(`[egg-bag] not found sync-sub path ${ syncSubPath }`);
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
      this.coreLogger.warn(`[egg-bag] created a async-sub named ${ subName } from ${ subFile }`);
      this._asyncSubClient[subName] = require(path.join(asyncSubPath, subFile)).default;
    }
  } else {
    this.coreLogger.warn(`[egg-bag] not found async-sub path ${ asyncSubPath }`);
  }
}