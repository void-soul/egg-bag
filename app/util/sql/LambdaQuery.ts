import {Application, BaseContextClass} from 'egg';
import {Empty} from '../empty';
import {add} from '../math';
import {setCache} from '../method-enhance';
import md5Util = require('md5');
const debug = require('debug')('egg-bag:cache');
const IF = function <T>() {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = function (this: LambdaQuery<T>) {
      if (this.ifv === true) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        fn.call(this, ...args);
      } else {
        this.ifv = true;
      }
      return this;
    };
  };
};
const IF2 = function <T>(def: any) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = async function (this: LambdaQuery<T>) {
      if (this.ifv === true && this.ifvFix === true) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        return await fn.call(this, ...args);
      } else {
        return def;
      }
    };
  };
};
export default class LambdaQuery<T> {
  private andQuerys: LambdaQuery<T>[] = [];
  private orQuerys: LambdaQuery<T>[] = [];
  private condition: string[] = [];
  private group: (keyof T)[] = [];
  private order: string[] = [];
  private param: Empty = {};
  private index = 0;
  private startRow = 0;
  private pageSize = 0;
  private search: (sql: string, param: Empty) => Promise<T[]>;
  private excute: (sql: string, param: Empty) => Promise<number>;
  private findCount: (sql: string, param: Empty) => Promise<number>;
  private table: string;
  private updateData?: T;
  private _cache?: {
    /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
    /** 随着当前用户sesion的清空而一起清空 */
    clearWithSession?: boolean;
  } = undefined;
  private context: BaseContextClass;
  private app: Application;
  protected ifv = true;
  protected ifvFix = true;
  private sql = '';
  private relaces: string[] = [];
  constructor (
    table: string,
    search: (sql: string, param: Empty) => Promise<T[]>,
    findCount: (sql: string, param: Empty) => Promise<number>,
    excute: (sql: string, param: Empty) => Promise<number>,
    context: BaseContextClass,
    app: Application
  ) {
    this.findCount = findCount;
    this.search = search;
    this.excute = excute;
    this.table = table;
    this.context = context;
    this.app = app;
  }
  /**
   * 缓存查询结果
   * @param param
   * @returns
   */
  @IF()
  cache(param: {
    /** 返回缓存清除key,参数=方法的参数+当前用户对象，可以用来批量清空缓存 */
    clearKey?: string[];
    /** 自动清空缓存的时间，单位分钟 */
    autoClearTime?: number;
    /** 随着当前用户sesion的清空而一起清空 */
    clearWithSession?: boolean;
  }): this {
    this._cache = param;
    return this;
  }
  /**
   * 设置为不缓存查询结果
   * @returns
   */
  @IF()
  notCache(): this {
    this._cache = undefined;
    return this;
  }
  /**
   * 清除缓存结果
   * @returns
   */
  @IF()
  clearCache(): this {
    const key = md5Util(this.sql + JSON.stringify(this.param));
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.app.redis.get('other').del(`[cache]${ key }`);
    return this;
  }
  @IF()
  and(fn: (query: LambdaQuery<T>) => LambdaQuery<T>): this {
    this.andQuerys.push(fn(new LambdaQuery<T>(this.table, this.search, this.findCount, this.excute, this.context, this.app)));
    return this;
  }
  @IF()
  or(fn: (query: LambdaQuery<T>) => LambdaQuery<T>): this {
    this.orQuerys.push(fn(new LambdaQuery<T>(this.table, this.search, this.findCount, this.excute, this.context, this.app)));
    return this;
  }
  @IF()
  andEq(
    key: keyof T,
    value: T[keyof T]
  ): this {

    return this.common(key, value, '=');
  }
  @IF()
  andRegexp(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, 'REGEXP');
  }
  @IF()
  andNotRegexp(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, 'REGEXP', 'NOT');
  }
  @IF()
  andShiftEq(key1: keyof T, key2: keyof T, value: T[keyof T]): this {
    return this.commonShift(key1, key2, value, '=');
  }
  @IF()
  andEqT(t: {[P in keyof T]?: T[P]}): this {
    for (const [key, value] of Object.entries(t)) {
      this.common(key as any, value, '=');
    }
    return this;
  }
  @IF()
  andNotEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<>');
  }
  @IF()
  andShiftNotEq(key1: keyof T, key2: keyof T, value: T[keyof T]): this {
    return this.commonShift(key1, key2, value, '<>');
  }
  @IF()
  andGreat(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '>');
  }
  @IF()
  andGreatEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '>=');
  }
  @IF()
  andLess(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<');
  }
  @IF()
  andLessEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<=');
  }
  @IF()
  andLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value);
  }
  @IF()
  andLikePrecise(
    key: keyof T,
    value: string
  ): this {
    return this.common(key, value, 'LIKE');
  }
  @IF()
  andNotLikePrecise(
    key: keyof T,
    value: string
  ): this {
    return this.common(key, value, 'LIKE', 'NOT');
  }
  @IF()
  andNotLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value, 'NOT');
  }
  @IF()
  andLeftLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value, '', '%', '');
  }
  @IF()
  andNotLeftLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value, 'NOT', '%', '');
  }
  @IF()
  andRightLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value, '', '', '%');
  }
  @IF()
  andNotRightLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean
  ): this {
    if (force === true && (value === undefined || value === null || (value as any) === '')) {
      this.ifvFix = false;
    }
    return this.like(key, value, 'NOT', '', '%');
  }
  @IF()
  andIsNull(key: keyof T): this {
    return this.nil(key);
  }
  @IF()
  andIsNotNull(key: keyof T): this {
    return this.nil(key, 'NOT');
  }
  @IF()
  andIn(key: keyof T, value: T[keyof T][], force?: boolean): this {
    if (force === true && value.length === 0) {
      this.ifvFix = false;
    }
    return this.commonIn(key, value);
  }

  @IF()
  andNotIn(key: keyof T, value: T[keyof T][], force?: boolean): this {
    if (force === true && value.length === 0) {
      this.ifvFix = false;
    }
    return this.commonIn(key, value, 'NOT');
  }
  @IF()
  andBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T]
  ): this {
    return this.between(key, value1, value2);
  }
  @IF()
  andNotBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T]
  ): this {
    return this.between(key, value1, value2, 'NOT');
  }
  @IF()
  andPow(key: keyof T, value: number): this {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND POW(2, ${ key }) & :pkey`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andNotPow(key: keyof T, value: number): this {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND NOT POW(2, ${ key }) :pkey`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andMatch(value: string, ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:pkey)`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andNotMatch(value: string, ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:pkey)`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andMatchBoolean(values: {match: boolean; value: string}[], ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:pkey IN BOOLEAN MODE)`);
    this.param[pkey] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ');
    return this;
  }
  @IF()
  andNotMatchBoolean(values: {match: boolean; value: string}[], ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:pkey IN BOOLEAN MODE)`);
    this.param[pkey] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ');
    return this;
  }
  @IF()
  andMatchQuery(value: string, ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:pkey WITH QUERY EXPANSION)`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andNotMatchQuery(value: string, ...keys: (keyof T)[]): this {
    const pkey = `match_${ this.index++ }`;
    this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:pkey WITH QUERY EXPANSION)`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andPowWith(key: keyof T, ...values: Array<number | string>): this {
    return this.andPow(key, add(...values.map(value => Math.pow(2, +value))));
  }
  @IF()
  andNotPowWith(key: keyof T, ...values: Array<number | string>): this {
    return this.andNotPow(key, add(...values.map(value => Math.pow(2, +value))));
  }
  @IF()
  groupBy(key: keyof T): this {
    this.group.push(key);
    return this;
  }
  @IF()
  asc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ key } ASC`);
    }
    return this;
  }
  @IF()
  desc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ key } DESC`);
    }
    return this;
  }
  /**
   * 为下次链条执行提供条件判断：非异步方法跳过，异步方法不执行并返回默认值
   * @param condition
   * @returns
   */
  if(condition: boolean) {
    this.ifv = condition;
    return this;
  }
  @IF()
  limit(startRow: number, pageSize: number): this {
    this.startRow = startRow;
    this.pageSize = pageSize;
    return this;
  }
  @IF()
  page(pageNumber: number, pageSize: number): this {
    this.startRow = ((pageNumber || 1) - 1) * pageSize;
    this.pageSize = pageSize;
    return this;
  }
  @IF()
  updateColumn(key: keyof T, value: T[keyof T]) {
    if (!this.updateData) {
      this.updateData = {} as T;
    }
    this.updateData[key] = value;
    return this;
  }
  /**
   * 替换查询一列
   * @param key 列名
   * @param valueToFind  要查找的值
   * @param valueToReplace 替换结果
   * @param key2 别名，默认是列名
   * @returns
   */
  @IF()
  replaceColumn(key: keyof T, valueToFind: T[keyof T], valueToReplace: T[keyof T], key2?: string) {
    const pkey1 = `${ key }_${ this.index++ }`;
    const pkey2 = `${ key }_${ this.index++ }`;
    this.relaces.push(`REPLACE(${ key }, :${ pkey1 }, :${ pkey2 }) AS ${ key2 || key as any as string }`);
    this.param[pkey1] = valueToFind as any as string;
    this.param[pkey2] = valueToReplace as any as string;
    return this;
  }
  @IF2([])
  async select(...columns: (keyof T)[]): Promise<T[]> {
    this.selectPrepare(...columns);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.search(this.sql, this.param);
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      return await this.search(this.sql, this.param);
    }
  }
  @IF()
  selectPrepare(...columns: (keyof T)[]): this {
    this.sql = `SELECT ${ columns && columns.length > 0 ? columns.join(',') : '*' } ${ this.relaces.length > 0 ? `, ${ this.relaces.join(',') }` : '' } FROM ${ this.table } ${ this.buildWhere(true) }`;
    if (this.group.length > 0) {
      this.sql += `GROUP BY ${ this.group.join(',') } `;
    }
    if (this.order.length > 0) {
      this.sql += `ORDER BY ${ this.order.join(',') } `;
    }
    if (this.pageSize > 0) {
      this.sql += `LIMIT ${ this.startRow }, ${ this.pageSize }`;
    }
    return this;
  }
  @IF2(undefined)
  async one(...columns: (keyof T)[]): Promise<T | undefined> {
    this.limit(0, 1);
    const list = await this.select(...columns);
    return list[0];
  }
  @IF()
  onePrepare(...columns: (keyof T)[]): this {
    this.limit(0, 1);
    return this.selectPrepare(...columns);
  }
  @IF2(0)
  async count(): Promise<number> {
    this.countPrepare();
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.findCount(this.sql, this.param);
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      return await this.findCount(this.sql, this.param);
    }
  }
  @IF()
  countPrepare(): this {
    this.sql = `SELECT COUNT(1) FROM ${ this.table } ${ this.buildWhere(true) }`;
    if (this.group.length > 0) {
      this.sql += `GROUP by ${ this.group.join(',') } `;
    }
    return this;
  }
  @IF2(0)
  async update(data?: T): Promise<number> {
    this.updatePrepare(data);
    if (this.sql) {
      return await this.excute(this.sql, this.param);
    } else {
      return 0;
    }
  }
  @IF()
  updatePrepare(data?: T): this {
    if (!data) {
      data = {} as T;
    }
    if (this.updateData) {
      Object.assign(data, this.updateData);
    }
    const sets = new Array<string>();
    for (const key in data) {
      if ((data as any).hasOwnProperty(key)) {
        sets.push(` ${ key } = :${ key } `);
      }
    }
    if (sets.length > 0) {
      this.sql = `UPDATE ${ this.table } SET ${ sets.join(',') } ${ this.buildWhere(true) }`;
      Object.assign(this.param, data);
    } else {
      this.sql = '';
    }
    return this;
  }
  @IF2(0)
  async delete(): Promise<number> {
    this.deletePrepare();
    return await this.excute(this.sql, this.param);
  }
  @IF()
  deletePrepare(): this {
    this.sql = `DELETE FROM ${ this.table } ${ this.buildWhere(true) } `;
    return this;
  }
  @IF2([])
  async array<K extends T[keyof T]>(key: keyof T): Promise<K[]> {
    const list = await this.select(key);
    return list.map(item => item[key] as K);
  }
  @IF2(undefined)
  async singel<K extends T[keyof T]>(key: keyof T): Promise<K | undefined> {
    const one = await this.one(key);
    if (one) {
      return one[key] as K;
    }
  }
  @IF2(0)
  async sum(key: keyof T): Promise<number> {
    this.sumPrepare(key);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(this.sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(this.sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  @IF()
  sumPrepare(key: keyof T): this {
    this.sql = `SELECT SUM(${ key }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  @IF2(0)
  async avg(key: keyof T): Promise<number> {
    this.avgPrepare(key);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(this.sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(this.sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  @IF()
  avgPrepare(key: keyof T): this {
    this.sql = `SELECT AVG(${ key }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  @IF2(0)
  async max(key: keyof T): Promise<number> {
    this.maxPrepare(key);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(this.sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(this.sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  @IF()
  maxPrepare(key: keyof T): this {
    this.sql = `SELECT MAX(${ key }) mx FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  @IF2(0)
  async min(key: keyof T): Promise<number> {
    this.minPrepare(key);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(this.sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(this.sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  @IF()
  minPrepare(key: keyof T): this {
    this.sql = `SELECT MAX(${ key }) mx FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  @IF2('')
  async groupConcat(key: keyof T, _param?: {distinct?: boolean, separator?: string}): Promise<string> {
    this.groupConcatPrepare(key, _param);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(this.sql, this.param);
      let result = '';
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: string}).ct;
      } else {
        return '';
      }
      await setCache.call(this.context, {
        key,
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(this.sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: string}).ct;
      } else {
        return '';
      }
    }
  }
  @IF()
  groupConcatPrepare(key: keyof T, param?: {distinct?: boolean, separator?: string}): this {
    this.sql = `SELECT GROUP_CONCAT(${ param && param.distinct ? 'DISTINCT' : '' } ${ key } ${ this.order.length > 0 ? `ORDER BY ${ this.order.join(',') } ` : '' } SEPARATOR '${ param && param.separator || ',' }') ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /** 获得sql和参数 */
  get(): {sql: string; param: Empty} {
    return {sql: this.sql, param: this.param};
  }
  private nil(key: keyof T, not = ''): this {
    this.condition.push(`AND ${ key } is ${ not } null`);
    return this;
  }
  private like(
    key: keyof T,
    value: any,
    not = '',
    left = '%',
    right = '%'
  ): this {
    if (value !== null && value !== undefined && value !== '') {
      const pkey = `${ key }_${ this.index++ }`;
      this.condition.push(
        `AND ${ key } ${ not } like concat('${ left }', :${ pkey }, '${ right }') `
      );
      this.param[pkey] = value;
    }
    return this;
  }
  private between(
    key: keyof T,
    value1: any,
    value2: any,
    not = ''
  ): this {
    const pkey1 = `${ key }_${ this.index++ }`;
    const pkey2 = `${ key }_${ this.index++ }`;
    this.condition.push(`AND ${ key } ${ not } BETWEEN :${ pkey1 } AND :${ pkey2 }`);
    this.param[pkey1] = value1;
    this.param[pkey2] = value2;
    return this;
  }
  private common(
    key: keyof T,
    value: any,
    op: string,
    not = ''
  ) {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND ${ key } ${ not } ${ op } :${ pkey } `);
    this.param[pkey] = value;
    return this;
  }
  private commonIn(
    key: keyof T,
    value: any,
    not = ''
  ) {
    if (value && value.length > 0) {
      const pkey = `${ key }_${ this.index++ }`;
      this.condition.push(`AND ${ key } ${ not } IN (:${ pkey }) `);
      this.param[pkey] = value;
    }
    return this;
  }
  private commonShift(
    key1: keyof T,
    key2: keyof T,
    value: any,
    op: string,
    not = ''
  ) {
    const pkey = `${ key1 }_${ key2 }_${ this.index++ }`;
    this.condition.push(`AND (${ key1 } << 8) + ${ key2 } ${ not } ${ op } :${ pkey } `);
    this.param[pkey] = value;
    return this;
  }
  private buildWhere(core?: boolean) {
    const wheres = new Array<string>();
    const where = this.condition.join(' ');
    if (where) {
      wheres.push(`(${ where.replace(/and|or/i, '') })`);
    }
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        const {sql, param, index} = query.where(this.index);
        this.index = index;
        if (sql) {
          wheres.push(` OR (${ sql }) `);
        }
        Object.assign(this.param, param);
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        const {sql, param, index} = query.where(this.index);
        this.index = index;
        if (sql) {
          wheres.push(` AND (${ sql }) `);
        }
        Object.assign(this.param, param);
      }
    }
    if (core === true) {
      if (wheres.length > 0) {
        return `WHERE ${ wheres.join(' ') }`;
      } else {
        return '';
      }
    } else {
      return wheres.join(' ');
    }
  }
  private where(index: number): {sql: string; param: Empty; index: number} {
    const param: Empty = this.param;
    let sql = this.buildWhere();
    for (const [k, v] of Object.entries(this.param)) {
      const newName = k.replace(/\d+$/, (_a: string) => `${ index++ }`);
      sql = sql.replace(k, newName);
      param[newName] = v;
      delete param[k];
    }
    return {sql, param, index};
  }
}
