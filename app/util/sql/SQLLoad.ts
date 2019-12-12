import * as fs from 'fs';
import * as path from 'path';
import MUParser from './MUParser';
import SourceMap from './SourceMap';
import SQLSource from './SQLSource';

/**
 *
 * 加载sql脚本
 * @export
 * @class SqlLoad
 */
export default class {
  private sqlSourceMap: SourceMap = new SourceMap();
  private fnMap: {[key: string]: string} = {};
  private sqlPath: string;
  private fnPath: string;
  constructor (rootPath: string) {
    this.sqlPath = path.join(rootPath, 'app', 'sql');
    this.fnPath = path.join(rootPath, 'app', 'sql-fn');
    const sqlFiles = fs.readdirSync(this.sqlPath);
    sqlFiles.forEach((item) => {
      this.loadSql(item);
    });
    if (fs.existsSync(this.fnPath)) {
      const fnFiles = fs.readdirSync(this.fnPath);
      fnFiles.forEach((item) => {
        this.loadFn(item);
      });
    }
  }
  public getFns(): {[key: string]: string} {
    return this.fnMap;
  }
  public tryLoadSql(id: string): SQLSource {
    let source: SQLSource = this.sqlSourceMap.get(id);
    if (source === undefined) {
      const items = id.split('.');
      if (items.length !== 2) {
        throw new Error(`error sqlid ${ id }!`);
      }
      const loaded = this.loadSql(`${ items[0] }.mu`);
      if (loaded === false || loaded === undefined) {
        throw new Error(`sql-file ${ items[0] } not found!`);
      } else {
        source = this.sqlSourceMap.get(id);
        if (!source) {
          throw new Error(`sql-file ${ items[0] }.${ items[1] }  not found!`);
        }
      }
    }
    return source;
  }
  private loadSql(item: string): boolean {
    const name = item.replace(/.mu/, '');
    const file = path.join(this.sqlPath, item);
    try {
      const fileData = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
      const parser = new MUParser(name, fileData);
      let source: SQLSource | null = parser.next();
      while (source != null) {
        this.sqlSourceMap.put(source.id, source);
        source = parser.next();
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  private loadFn(item: string) {
    const name = item.replace(/.mu/, '');
    const file = path.join(this.fnPath, item);
    this.fnMap[name] = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
  }
}
