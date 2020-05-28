import {Application, Context} from 'egg';
import * as fs from 'fs';
import * as path from 'path';
import SQLSource from './sql/SQLSource';
import MUParser from './sql/MUParser';
import {MongoClient} from 'mongodb';
import Build from '../util/sql/Build';
import * as Mustache from 'mustache';
import {MongoFilter, SqlScript} from '../../typings';

const debug = require('debug')('egg-bag:loader');

export function loadMongo(this: Application) {
  if (this.config.mongo && this.config.mongo.uri) {
    Object.assign(this.config.mongo.options, {
      useNewUrlParser: true
    });
    debug('mongodb read and config over');
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
          debug(`sql: ${ source.id } found!`);
          source = parser.next();
        }
        return true;
      } catch (e) {
        return false;
      }
    });
  } else {
    debug('not found any sql');
  }

  if (fs.existsSync(sqlJSPath)) {
    const sqlFiles = fs.readdirSync(sqlJSPath);
    sqlFiles.forEach(item => {
      const name = item.replace(/.js|.ts/, '');
      const scriptReq = require(path.join(sqlJSPath, item));
      const script = scriptReq as {[key: string]: SqlScript};
      for (const [k, fn] of Object.entries(script)) {
        debug(`sql-script: ${ name }.${ k } found!`);
        sqlSourceMap[`${ name }.${ k }`] = new SQLSource(`${ name }.${ k }`, fn, true);
      }
    });
  } else {
    debug('not found any sql-script');
  }

  if (fs.existsSync(fnPath)) {
    const fnFiles = fs.readdirSync(fnPath);
    fnFiles.forEach((item) => {
      const name = item.replace(/.mu/, '');
      const file = path.join(fnPath, item);
      debug(`sql-fn: ${ name } found!`);
      fnMap[name] = fs.readFileSync(file, {encoding: 'utf-8'}).toString();
    });
  } else {
    debug('not found any sql-fn');
  }

  this._getSql = function <T>(ctx: Context, count: boolean, id: string, param?: {[key: string]: any}): string | MongoFilter<T> {
    const source: SQLSource = sqlSourceMap[id];
    if (source === undefined) {
      throw new Error(`sql-file ${ id } not found!`);
    }
    if (typeof source.template === 'string') {
      const buildParam = new Build(count, param);
      const sql = Mustache.render(source.template, buildParam, fnMap);
      debug(id, sql);
      return sql;
    } else {
      const sql = source.template.call(ctx, param);
      debug(id, sql);
      return sql;
    }
  };
  debug('sql files read over');
}
export async function connMongo(this: Application) {
  if (this.config.mongo && this.config.mongo.uri) {
    this.mongo = new MongoClient(`mongodb://${ this.config.mongo.uri }`, this.config.mongo.options);
    debug('Connecting MongoDB...');
    try {
      await this.mongo.connect();
      debug(`Connect success on ${ this.config.mongo.uri }.`);
    } catch (error) {
      debug(`Connect fail on ${ this.config.mongo.uri }.`);
      this.coreLogger.error(error);
    }
  }
}