import {Application} from 'egg';
import {enumToJson, dataConfig} from '../util/enumUtil';
const debug = require('debug')('egg-bag');
export function loadGlobal(this: Application) {
  if (this.config.globalValues) {
    this._globalValues = enumToJson(this.config.globalValues);
    this.dataConfig = dataConfig;
    debug('globalValues read over');
  } else {
    debug('globalValues not found');
  }
  if (this.config.viewTags) {
    this.config.nunjucks.tags = this.config.viewTags;
    debug('viewTags read over');
  } else {
    debug('viewTags not found');
  }
}