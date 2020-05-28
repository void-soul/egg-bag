import {Application} from 'egg';
import path = require('path');
import * as fs from 'fs';
import {Builder, Nuxt} from 'nuxt';
import {merge} from 'lodash';
import {nuxtDefaultConfig} from '../util/ci-help';
import {IncomingMessage, ServerResponse} from 'http';
const debug = require('debug')('egg-bag:loader');

export function loadNuxt(this: Application) {
  // 此时 config 文件已经被读取并合并，但是还并未生效
  // 这是应用层修改配置的最后时机
  // 注意：此函数只支持同步调用
  // #region nuxt检测配置
  let srcDir = '';
  let nuxtReady = false;
  if (this.config.nuxt) {
    if (process.env.NODE_ENV !== 'production') {
      srcDir = path.join(this.config.baseDir, 'app', 'nuxt');
      if (!fs.existsSync(srcDir)) {
        this.coreLogger.error(`[egg-bag] start dev mode error, found config but not found nuxt path ${ srcDir }`);
        process.exit(1);
      }
    } else {
      const distPath = path.join(this.config.baseDir, '.nuxt', 'dist');
      if (!fs.existsSync(distPath)) {
        this.coreLogger.error(`[egg-bag] start prod mode error, found config but not found nuxt path ${ distPath }`);
        process.exit(1);
      }
    }
    nuxtReady = true;
    debug('config merge over');
    this.config.coreMiddleware.unshift('nuxt');
  }
  return {
    nuxtReady,
    srcDir
  };
}

export function initNuxt(this: Application, nuxtReady: boolean, srcDir: string) {
  if (nuxtReady && this.config.nuxt) {
    let nuxt;
    if (process.env.NODE_ENV !== 'production') {
      nuxt = new Nuxt(merge({}, nuxtDefaultConfig(srcDir, this.config.baseDir, true), this.config.nuxt));
      const builder = new Builder(nuxt);
      debug('build dev mode start');
      builder.build().then(() => {
        debug('Build dev mode done');
      }).catch((error) => {
        this.coreLogger.error('[egg-bag] Build dev mode error', error);
        process.exit(1);
      });
    } else {
      nuxt = new Nuxt();
    }
    this._nuxt = (req: IncomingMessage, res: ServerResponse) => {
      return new Promise((resolve) => nuxt.render(req, res, resolve));
    };
    return true;
  }
  return false;
}