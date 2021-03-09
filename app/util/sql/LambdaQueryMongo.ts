import {div, add} from '../math';

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
  $eq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$eq', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  $eqT(t: {[P in keyof T]?: T[P]}): this {
    for (const [key, value] of Object.entries(t)) {
      this.common(value, '$eq', key as any);
    }
    return this;
  }
  /** not  https://docs.mongodb.com/manual/reference/operator/query/eq/ */
  $$eq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$eq: value}, '$not', key);
  }
  /**  https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  $ne(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$ne', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/ne/ */
  $$ne(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$ne: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  $gt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$gt', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/gt/ */
  $$gt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$gt: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  $gte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$gte', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/gte/ */
  $$gte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$gte: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  $in(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    return this.common(value, '$in', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/in/ */
  $$in(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    return this.common({$in: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  $nin(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    return this.common(value, '$nin', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/nin/ */
  $$nin(
    key: keyof T,
    value: Array<T[keyof T] | RegExp>
  ): this {
    return this.common({$nin: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  $lt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$lt', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/lt/ */
  $$lt(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$lt: value}, '$not', key);
  }
  /**  https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  $lte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(value, '$lte', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/lte/ */
  $$lte(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common({$lte: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/and/ */
  $and(lambda: LambdaQueryMongo<T>) {
    return this.common(lambda.query, '$and', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/nor/ */
  $nor(lambda: LambdaQueryMongo<T>) {
    return this.common(lambda.query, '$nor', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/or/ */
  $or(lambda: LambdaQueryMongo<T>) {
    return this.common(lambda.query, '$or', undefined, 'array');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/elemMatch/ */
  $elemMatch(lambda: LambdaQueryMongo<T>) {
    return this.common(lambda.query, '$elemMatch', undefined, 'object');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  $exists(
    key: keyof T
  ): this {
    return this.common(true, '$exists', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/exists/ */
  $$exists(key: keyof T): this {
    return this.common({$exists: true}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/type/ */
  $type(
    key: keyof T,
    value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'
  ): this {
    return this.common(value, '$type', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/type/ */
  $$type(
    key: keyof T,
    value: 'double' | 'string' | 'object' | 'array' | 'binData' | 'undefined' | 'objectId' | 'bool' | 'date' | 'null' | 'regex' | 'javascript' | 'javascriptWithScope' | 'int' | 'timestamp' | 'long' | 'decimal' | 'minKey' | 'maxKey'
  ): this {
    return this.common({$type: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  $expr(
    value: {[name: string]: any}
  ): this {
    return this.common(value, '$expr');
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/expr/ */
  $$expr(
    value: {[name: string]: any}
  ): this {
    return this.common({$expr: value}, '$not');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  $mod(
    key: keyof T,
    value: number[]
  ): this {
    return this.common(value, '$mod', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/mod/ */
  $$mod(
    key: keyof T,
    value: number[]
  ): this {
    return this.common({$mod: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/regex/ */
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
  $where(fn: (this: T) => boolean) {
    return this.common(fn, '$where');
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  $all(
    key: keyof T,
    value: Array<T[keyof T]>
  ): this {
    return this.common(value, '$all', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/all/ */
  $$all(
    key: keyof T,
    value: Array<T[keyof T]>
  ): this {
    return this.common({$all: value}, '$not', key);
  }
  /** https://docs.mongodb.com/manual/reference/operator/query/size/ */
  $size(
    key: keyof T,
    value: number
  ): this {
    return this.common(value, '$size', key);
  }
  /** not https://docs.mongodb.com/manual/reference/operator/query/size/*/
  $$size(
    key: keyof T,
    value: number
  ): this {
    return this.common({$size: value}, '$not', key);
  }
  asc(...keys: Array<keyof T>): this {
    for (const key of keys) {
      this.order[key] = 1;
    }
    return this;
  }

  desc(...keys: Array<keyof T>): this {
    for (const key of keys) {
      this.order[key] = -1;
    }
    return this;
  }

  limit(startRow: number, pageSize: number): this {
    this._startRow = startRow;
    this._pageSize = pageSize;
    return this;
  }
  page(pageNumber: number, pageSize: number): this {
    this._startRow = ((pageNumber || 1) - 1) * pageSize;
    this._pageSize = pageSize;
    return this;
  }
  key(...keys: string[]): this {
    this._keys?.splice(0, 0, ...keys);
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
