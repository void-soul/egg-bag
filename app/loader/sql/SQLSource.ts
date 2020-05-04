import {Context} from 'egg';
/**
 * sql对象
 *
 * @export
 * @class SQLSource
 */
export default class {
  id: string;
  template: string | ((this: Context, ...args: any[]) => string);
  line = 0;
  script = false;
  constructor (id: string, template: string | ((this: Context, ...args: any[]) => string), script = false) {
    this.id = id;
    this.template = template;
    this.script = script;
  }
}
