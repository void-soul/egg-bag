import {SqlScript} from '../../../typings';
/**
 * sql对象
 *
 * @export
 * @class SQLSource
 */
export default class {
  id: string;
  template: string | SqlScript;
  line = 0;
  script = false;
  constructor (id: string, template: string | SqlScript, script = false) {
    this.id = id;
    this.template = template;
    this.script = script;
  }
}
