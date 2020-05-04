import {Application} from 'egg';
export function loadView(this: Application) {
  if (this.config.viewTags) {
    this.config.nunjucks.tags = this.config.viewTags;
    this.coreLogger.warn('[egg-bag] viewTags read over');
  } else {
    this.coreLogger.warn('[egg-bag] viewTags not found');
  }
}