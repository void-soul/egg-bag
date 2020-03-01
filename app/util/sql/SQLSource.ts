/**
 * sql对象
 *
 * @export
 * @class SQLSource
 */
export default class {
  id: string;
  template: string;
  line = 0;
  constructor (id: string, template: string) {
    this.id = id;
    this.template = template;
  }
}
