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
  @IF()
  notCache(): this {
    this._cache = undefined;
    return this;
  }
  @IF()
  and(lambda: LambdaQuery<T>): this {
    this.andQuerys.push(lambda);
    return this;
  }
  @IF()
  or(lambda: LambdaQuery<T>): this {
    this.orQuerys.push(lambda);
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
    value: T[keyof T]
  ): this {
    return this.like(key, value);
  }
  @IF()
  andNotLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, 'NOT');
  }
  @IF()
  andLeftLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, '', '%', '');
  }
  @IF()
  andNotLeftLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, 'NOT', '%', '');
  }
  @IF()
  andRightLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, '', '', '%');
  }
  @IF()
  andNotRightLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
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
  andIn(key: keyof T, value: T[keyof T][]): this {
    return this.commonIn(key, value);
  }

  @IF()
  andNotIn(key: keyof T, value: T[keyof T][]): this {
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
    this.condition.push(`AND POW(2, ${ key }) & ${ value }`);
    this.param[pkey] = value;
    return this;
  }
  @IF()
  andNotPow(key: keyof T, value: number): this {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND NOT POW(2, ${ key }) & ${ value }`);
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
  where(): string {
    return this.condition.join(' ');
  }
  @IF()
  updateColumn(key: keyof T, value: T[keyof T]) {
    if (!this.updateData) {
      this.updateData = {} as T;
    }
    this.updateData[key] = value;
    return this;
  }
  async select(...columns: (keyof T)[]): Promise<T[]> {
    let sql = `SELECT ${ columns && columns.length > 0 ? columns.join(',') : '*'
      } FROM ${ this.table } `;
    sql += `WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    if (this.group.length > 0) {
      sql += `GROUP BY ${ this.group.join(',') } `;
    }
    if (this.order.length > 0) {
      sql += `ORDER BY ${ this.order.join(',') } `;
    }
    if (this.pageSize > 0) {
      sql += `LIMIT ${ this.startRow }, ${ this.pageSize }`;
    }


    if (this._cache) {
      const key = md5Util(sql);
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.search(sql, this.param);
      await setCache.call(this.context, {
        key: md5Util(sql),
        result,
        ...this._cache
      });
      return result;
    } else {
      return await this.search(sql, this.param);
    }
  }
  async one(...columns: (keyof T)[]): Promise<T | undefined> {
    this.limit(0, 1);
    const list = await this.select(...columns);
    return list[0];
  }
  async count(): Promise<number> {
    let sql = `SELECT COUNT(1) FROM ${ this.table } `;
    sql += `WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    if (this.group.length > 0) {
      sql += `GROUP by ${ this.group.join(',') } `;
    }

    if (this._cache) {
      const key = md5Util(sql);
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.findCount(sql, this.param);
      await setCache.call(this.context, {
        key: md5Util(sql),
        result,
        ...this._cache
      });
      return result;
    } else {
      return await this.findCount(sql, this.param);
    }
  }
  async update(data?: T): Promise<number> {
    if (!data) {
      data = {} as T;
    }
    if (this.updateData) {
      Object.assign(data, this.updateData);
    }
    let sql = `UPDATE ${ this.table } SET `;
    const sets = new Array<string>();
    for (const key in data) {
      if ((data as any).hasOwnProperty(key)) {
        sets.push(` ${ key } = :${ key } `);
      }
    }
    sql += `${ sets.join(',') } WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    Object.assign(this.param, data);
    return await this.excute(sql, this.param);
  }
  async delete(): Promise<number> {
    let sql = `DELETE FROM ${ this.table }  WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    return await this.excute(sql, this.param);
  }
  async array<K extends T[keyof T]>(key: keyof T): Promise<K[]> {
    const list = await this.select(key);
    return list.map(item => item[key] as K);
  }
  async singel<K extends T[keyof T]>(key: keyof T): Promise<K | undefined> {
    const one = await this.one(key);
    if (one) {
      return one[key] as K;
    }
  }
  async sum(key: keyof T): Promise<number> {
    let sql = `SELECT SUM(${ key }) ct FROM ${ this.table } `;
    sql += `WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }

    if (this._cache) {
      const key = md5Util(sql);
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key: md5Util(sql),
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  async avg(key: keyof T): Promise<number> {
    let sql = `SELECT AVG(${ key }) ct FROM ${ this.table } `;
    sql += `WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    if (this._cache) {
      const key = md5Util(sql);
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(sql, this.param);
      let result = 0;
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
      await setCache.call(this.context, {
        key: md5Util(sql),
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: number}).ct;
      } else {
        return 0;
      }
    }
  }
  async groupConcat(key: keyof T, param?: {distinct?: boolean, separator?: string}): Promise<string> {
    let sql = `SELECT GROUP_CONCAT(${ param && param.distinct ? 'DISTINCT' : '' } ${ key } ${ this.order.length > 0 ? `ORDER BY ${ this.order.join(',') } ` : '' } SEPARATOR '${ param && param.separator || ',' }') ct FROM ${ this.table } `;
    sql += `WHERE 1 = 1 ${ this.where() } `;
    if (this.orQuerys.length > 0) {
      for (const query of this.orQuerys) {
        sql += ` OR (${ query.where() }) `;
      }
    }
    if (this.andQuerys.length > 0) {
      for (const query of this.andQuerys) {
        sql += ` AND (${ query.where() }) `;
      }
    }
    if (this._cache) {
      const key = md5Util(sql);
      const cache = await this.app.redis.get('other').get(`[cache]${ key }`);
      if (cache) {
        debug(`cache for query ${ key } hit!`);
        return JSON.parse(cache);
      }

      const result_ = await this.search(sql, this.param);
      let result = '';
      if (result_.length > 0) {
        result = (result_[0] as unknown as {ct: string}).ct;
      } else {
        return '';
      }
      await setCache.call(this.context, {
        key: md5Util(sql),
        result,
        ...this._cache
      });
      return result;
    } else {
      const data = await this.search(sql, this.param);
      if (data.length > 0) {
        return (data[0] as unknown as {ct: string}).ct;
      } else {
        return '';
      }
    }
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
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(
      `AND ${ key } ${ not } like concat('${ left }', :${ pkey }, '${ right }') `
    );
    this.param[pkey] = value;
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
}
