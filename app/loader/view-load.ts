import {Application} from 'egg';
const debug = require('debug')('egg-bag:loader');
export function loadView(this: Application) {
  if (this.config.viewTags) {
    this.config.nunjucks.tags = this.config.viewTags;
    debug('viewTags read over');
  } else {
    debug('viewTags not found');
  }
}