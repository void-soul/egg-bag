/**
 * sql对象
 *
 * @export
 * @class SQLSource
 */
export default class {
  id: string;
  template: string;
  line: number = 0;
  constructor (id: string, template: string) {
    this.id = id;
    this.template = template;
  }
}
