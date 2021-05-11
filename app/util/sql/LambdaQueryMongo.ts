import {div, add} from '../math';
const IF = function <T>() {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = function (this: LambdaQueryMongo<T>) {
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
export default class LambdaQueryMongo<T> {
  private _query: {[P in keyof T]?: any} = {};
  private _order: {[P in keyof T]?: number} = {};
  private _startRow?: number;
  private _pageSize?: number;
  private _keys: string[] = [];
  private _find: (lambda: LambdaQueryMongo<T>, columns: Array<keyof T>) => Promise<T[]>;
  private _findCount: (lambda: LambdaQueryMongo<T>) => Promise<number>;
  private _update: (lambda: LambdaQueryMongo<T>, data: {[P in keyof T]?: T[P]}, keys: string[]) => Promise<number>;
  private _remove: (lambda: LambdaQueryMongo<T>) => Promise<number>;
  protected ifv = true;
  constructor (
    find: (lambda: LambdaQueryMongo<T>, columns: Array<keyof T>) => Promise<T[]>,
    findCount: (lambda: LambdaQueryMongo<T>) => Promise<number>,
    update: (lambda: LambdaQueryMongo<T>, data: {[P in keyof T]?: T[P]}, keys: string[]) => Promise<number>,
    remove: (lambda: LambdaQueryMongo<T>) => Promise<number>
  ) {
    this._find = find;
    this._findCount = findCount;
    this._update = update;
    this._remove = remove;
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  @IF()
  $eq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$eq', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  @IF()
  $eqT(t: {[P in keyof T]?: T[P]}): this {
    for (const [key, value] of Object.entries(t)) {
      this.common(value, '$eq', key as any);
    }
    return this;
  }
  /** not  https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  @IF()
  $$eq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$eq: value}, '$not', key);
  }
  /**  https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  @IF()
  $ne(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$ne', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  @IF()
  $$ne(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$ne: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  @IF()
  $gt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$gt', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  @IF()
  $$gt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$gt: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  @IF()
  $gte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$gte', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  @IF()
  $$gte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$gte: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  @IF()
  $in(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    if (value && value.length > 0) {
      return this.common(value, '$in', key);
    }
    return this;
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  @IF()
  $$in(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    if (value && value.length > 0) {
      return this.common({$in: value}, '$not', key);
    }
    return this;
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  @IF()
  $nin(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    if (value && value.length > 0) {
      return this.common(value, '$nin', key);
    }
    return this;
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  @IF()
  $$nin(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    if (value && value.length > 0) {
      return this.common({$nin: value}, '$not', key);
    }
    return this;
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  @IF()
  $lt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$lt', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  @IF()
  $$lt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$lt: value}, '$not', key);
  }
  /**  https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  @IF()
  $lte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$lte', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  @IF()
  $$lte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$lte: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/and/ */
  @IF()
  $and(lambda: LambdaQueryMongo<T>): this {
    return this.common(lambda.query, '$and', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/nor/ */
  @IF()
  $nor(lambda: LambdaQueryMongo<T>): this {
    return this.common(lambda.query, '$nor', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/or/ */
  @IF()
  $or(lambda: LambdaQueryMongo<T>): this {
    return this.common(lambda.query, '$or', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/elemMatch/ */
  @IF()
  $elemMatch(lambda: LambdaQueryMongo<T>): this {
    return this.common(lambda.query, '$elemMatch', undefined, 'object');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  @IF()
  $exists(
    key: keyof T
  ): this {
    return this.common(true, '$exists', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  @IF()
  $$exists(key: keyof T): this {
    return this.common({$exists: true}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/type/ */
  @IF()
  $type(
    key: keyof T,
    value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'
  ): this {
    return this.common(value, '$type', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/type/ */
  @IF()
  $$type(
    key: keyof T,
    value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'
  ): this {
    return this.common({$type: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  @IF()
  $expr(
    value: {[name: string]: any}
  ): this {
    return this.common(value, '$expr');
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  @IF()
  $$expr(
    value: {[name: string]: any}
  ): this {
    return this.common({$expr: value}, '$not');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  @IF()
  $mod(
    key: keyof T,
    value: number[]
  ): this {
    return this.common(value, '$mod', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  @IF()
  $$mod(
    key: keyof T,
    value: number[]
  ): this {
    return this.common({$mod: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/regex/ */
  @IF()
  $regex(
    key: keyof T,
    value: RegExp,
    options?: Set<'i' | 'm' | 'g' | 'x'>
  ): this {
    if (options) {
      this.common(Array.from(options).join(''), '$options', key);
    }
    return this.common(value, '$regex', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/regex/ */
  @IF()
  $$regex(
    key: keyof T,
    value: RegExp,
    options?: Set<'i' | 'm' | 'g' | 'x'>
  ): this {
    if (options) {
      this.common(Array.from(options).join(''), '$options', key);
    }
    return this.common({$regex: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/text/ */
  @IF()
  $text(
    options: {
      search: string;
      language?: string;
      caseSensitive?: boolean;
      diacriticSensitive?: boolean;
    }
  ): this {
    return this.common(options, '$text');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/where/ */
  @IF()
  $where(fn: (this: T) => boolean) {
    return this.common(fn, '$where');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  @IF()
  $all(
    key: keyof T,
    value: Array<T[keyof T]>
  ): this {
    return this.common(value, '$all', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  @IF()
  $$all(
    key: keyof T,
    value: Array<T[keyof T]>
  ): this {
    return this.common({$all: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/size/ */
  @IF()
  $size(
    key: keyof T,
    value: number
  ): this {
    return this.common(value, '$size', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/size/*/
  @IF()
  $$size(
    key: keyof T,
    value: number
  ): this {
    return this.common({$size: value}, '$not', key);
  }
  @IF()
  asc(...keys: Array<keyof T>): this {
    for (const key of keys) {
      this.order[key] = 1;
    }
    return this;
  }
  @IF()
  desc(...keys: Array<keyof T>): this {
    for (const key of keys) {
      this.order[key] = -1;
    }
    return this;
  }
  @IF()
  limit(startRow: number, pageSize: number): this {
    this._startRow = startRow;
    this._pageSize = pageSize;
    return this;
  }
  @IF()
  page(pageNumber: number, pageSize: number): this {
    this._startRow = ((pageNumber || 1) - 1) * pageSize;
    this._pageSize = pageSize;
    return this;
  }
  @IF()
  key(...keys: string[]): this {
    this._keys?.splice(0, 0, ...keys);
    return this;
  }
  if(condition: boolean) {
    this.ifv = condition;
    return this;
  }
  /**
   * 中断查询方法
   * @param {...string[]} columns
   * @returns {Promise<T[]>}
   * @memberof LambdaQueryMongo
   */
  async select(...columns: Array<keyof T>): Promise<T[]> {
    return await this._find(this, columns);
  }
  /**
   *
   * 中断查询方法
   * @param {...string[]} columns
   * @returns {(Promise<T | undefined>)}
   * @memberof LambdaQueryMongo
   */
  async one(...columns: Array<keyof T>): Promise<T | undefined> {
    const result = await this._find(this, columns);
    return result[0];
  }
  /**
   *
   * 中断查询方法
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  async count(): Promise<number> {
    return await this._findCount(this);
  }
  async sum(key: keyof T): Promise<number> {
    const data = await this.select(key);
    return add(...data.map(item => item[key] as any as number));
  }
  async avg(key: keyof T): Promise<number> {
    const data = await this.select(key);
    const sum = add(...data.map(item => item[key] as any as number));
    return data.length > 0 ? div(sum, data.length) : 0;
  }
  /**
   * 中断更新方法
   * @param {T} data
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  async update(data: T): Promise<number> {
    return await this._update(this, data, this._keys);
  }
  /**
   *
   * 中断删除方法
   * @returns {Promise<number>}
   * @memberof LambdaQueryMongo
   */
  async delete(): Promise<number> {
    return await this._remove(this);
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
  private common(
    value: any,
    op: string,
    key?: keyof T,
    append: 'value' | 'array' | 'object' = 'value'
  ) {
    if (key) {
      if (!this._query[key]) {
        this._query[key] = {};
      }
      if (append === 'value') {
        this._query[key][op] = value;
      } else if (append === 'array') {
        if (this._query[key][op]) {
          this._query[key][op].push(value);
        } else {
          this._query[key][op] = [value];
        }
      } else if (append === 'object') {
        if (this._query[key][op]) {
          Object.assign(this._query[key][op], value);
        } else {
          this._query[key][op] = value;
        }
      }
    } else {
      if (append === 'value') {
        this._query[op] = value;
      } else if (append === 'array') {
        if (this._query[op]) {
          this._query[op].push(value);
        } else {
          this._query[op] = [value];
        }
      } else if (append === 'object') {
        if (this._query[op]) {
          Object.assign(this._query[op], value);
        } else {
          this._query[op] = value;
        }
      }
    }
    return this;
  }

  get query() {
    return this._query;
  }
  get order() {
    return this._order;
  }
  get startRow() {
    return this._startRow;
  }
  get pageSize() {
    return this._pageSize;
  }
}
