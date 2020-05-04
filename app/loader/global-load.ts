import {Application} from 'egg';
import {enumToJson, dataConfig} from '../util/enumUtil';
export function loadGlobal(this: Application) {
  if (this.config.globalValues) {
    this._globalValues = enumToJson(this.config.globalValues);
    this.dataConfig = dataConfig;
    this.coreLogger.warn('[egg-bag] globalValues read over');
  } else {
    this.coreLogger.warn('[egg-bag] globalValues not found');
  }
  if (this.config.viewTags) {
    this.config.nunjucks.tags = this.config.viewTags;
    this.coreLogger.warn('[egg-bag] viewTags read over');
  } else {
    this.coreLogger.warn('[egg-bag] viewTags not found');
  }
}