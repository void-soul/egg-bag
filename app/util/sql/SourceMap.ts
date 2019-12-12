import SQLSource from './SQLSource';

/**
 * sql脚本映射表
 *
 * @export
 * @class SourceMap
 */
export default class SourceMap {
  put(key: string, source: SQLSource) {
    this[key] = source;
  }
  get(key: string): SQLSource {
    return this[key];
  }
}
