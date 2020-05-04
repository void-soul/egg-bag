import {Application, Context} from 'egg';
import * as fs from 'fs';
import * as path from 'path';

import {SQLSource} from './sql';
import MUParser from './sql/MUParser';
import {MongoClient} from 'mongodb';

export function loadMongo(this: Application) {
  if (this.config.mongo && this.config.mongo.uri) {
    Object.assign(this.config.mongo.options, {
      useNewUrlParser: true
    });
    this.coreLogger.warn('[egg-bag] mongodb read and config over');
  }
}
export function loadSql(this: Application) {
  const sqlPath = path.join(this.baseDir, 'app', 'sql');
  const fnPath = path.join(this.baseDir, 'app', 'sql-fn');
  const sqlJSPath = path.join(this.baseDir, 'app', 'sql-script');
  const sqlSourceMap: {[key: string]: SQLSource} = {};
  const fnMap: {[key: string]: string} = {};

  if (fs.existsSync(sqlPath)) {
    const sqlFiles = fs.readdirSync(sqlPath);
    sqlFiles.forEach((item) => {
      const name = item.replace(/.mu/, '');
      const file = path.join(sqlPath, item);
      try {
        const fileData = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
        const parser = new MUParser(name, fileData);
        let source: SQLSource | null = parser.next();
        while (source != null) {
          sqlSourceMap[source.id] = source;
          source = parser.next();
        }
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  if (fs.existsSync(sqlJSPath)) {
    const sqlFiles = fs.readdirSync(sqlJSPath);
    sqlFiles.forEach(item => {
      const name = item.replace(/.js|.ts/, '');
      const scriptReq = require(path.join(sqlJSPath, item));
      const script = scriptReq as {[key: string]: (this: Context, ...args: any[]) => string};
      for (const [k, fn] of Object.entries(script)) {
        sqlSourceMap[`${ name }.${ k }`] = new SQLSource(`${ name }.${ k }`, fn, true);
      }
    });
  }

  if (fs.existsSync(fnPath)) {
    const fnFiles = fs.readdirSync(fnPath);
    fnFiles.forEach((item) => {
      const name = item.replace(/.mu/, '');
      const file = path.join(fnPath, item);
      fnMap[name] = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
    });
  }

  this.getSql = function (this: Context, id: string, ...args: any[]): string {
    const source: SQLSource = sqlSourceMap[id];
    if (source === undefined) {
      throw new Error(`sql-file ${ id } not found!`);
    }
    if (typeof source.template === 'string') {
      return source.template;
    } else {
      return source.template.call(this, ...args);
    }
  };
  this.getSqlFn = (): {[key: string]: string} => {
    return fnMap;
  };
  this.coreLogger.warn('[egg-bag] sql files read over');
}
export async function connMongo(this: Application) {
  if (this.config.mongo && this.config.mongo.uri) {
    this.mongo = new MongoClient(`mongodb://${ this.config.mongo.uri }`, this.config.mongo.options);
    this.coreLogger.warn('[egg-bag] Connecting MongoDB...');
    try {
      await this.mongo.connect();
      this.coreLogger.warn(`[egg-bag] Connect success on ${ this.config.mongo.uri }.`);
    } catch (error) {
      this.coreLogger.warn(`[egg-bag] Connect fail on ${ this.config.mongo.uri }.`);
      this.coreLogger.error(error);
    }
  }
}