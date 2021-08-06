import lodash = require('lodash');
import {Empty} from '../empty';
import {SqlScript} from 'typings';
const _pageNumber = Symbol('pageNumber');
const _pageSize = Symbol('pageSize');
const _orderBy = Symbol('orderBy');
const _orderMongo = Symbol('_orderMongo');
const _param = Symbol('param');
const _limitSelf = Symbol('limitSelf');
const _countSelf = Symbol('countSelf');
const _sumSelf = Symbol('sumSelf');
/**
 *
 * 分页查询对象
 * @export
 * @class PageQuery
 */
export default class PageQuery<T> {
  list: T[];
  sum: T | null;
  totalPage: number;
  totalRow: number;
  private [_limitSelf] = false;
  private [_sumSelf] = false;
  private [_countSelf] = false;
  private [_pageNumber] = 1;
  private [_pageSize] = 0;
  private [_orderBy]: string;
  private [_orderMongo]: {[P in keyof T]: 1 | -1};
  private [_param]: Empty = new Empty();
  private search: (
    param: Empty,
    pageSize: number,
    pageNumber: number,
    limitSelf: boolean,
    countSelf: boolean,
    sumSelf: boolean,
    query: PageQuery<T>,
    orderBy?: string,
    orderMongo?: {[P in keyof T]: 1 | -1},
  ) => Promise<void>;
  constructor (
    search: (
      param: Empty,
      pageSize: number,
      pageNumber: number,
      limitSelf: boolean,
      countSelf: boolean,
      sumSelf: boolean,
      query: PageQuery<T>,
      orderBy?: string,
      orderMongo?: {[P in keyof T]: 1 | -1},
    ) => Promise<void>
  ) {
    this.search = search;
  }

  param(key: string, value: any): this {
    this[_param][key] = value;
    return this;
  }
  params(param: Empty): this {
    lodash.assign(this[_param], param);
    return this;
  }
  orderBy(orderby: string): this {
    if (orderby && !orderby.includes('undefined')) {
      this[_orderBy] = orderby;
    }
    return this;
  }
  orderByMongo(name: keyof T, type: 1 | -1): this {
    this[_orderMongo][name] = type;
    return this;
  }
  pageNumber(page: number): this {
    this[_pageNumber] = page;
    return this;
  }
  pageSize(size: number): this {
    this[_pageSize] = size;
    return this;
  }
  limitSelf(limitSelf: boolean | string): this {
    this[_limitSelf] = limitSelf === true || limitSelf === 'true';
    return this;
  }
  countSelf(countSelf: boolean | string): this {
    this[_countSelf] = countSelf === true || countSelf === 'true';
    return this;
  }
  sumSelf(sumSelf: boolean | string): this {
    this[_sumSelf] = sumSelf === true || sumSelf === 'true';
    return this;
  }
  async select(): Promise<this> {
    await this.search(
      this[_param],
      this[_pageSize],
      this[_pageNumber],
      this[_limitSelf],
      this[_countSelf],
      this[_sumSelf],
      this,
      this[_orderBy],
      this[_orderMongo]
    );
    return this;
  }
}

export const test: SqlScript = function () {
  return '1';
};
