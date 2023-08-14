import {Application, BaseContextClass} from 'egg';
import {add} from '../math';
import {setCache} from '../method-enhance';
import md5Util = require('md5');
const debug = require('debug')('egg-bag:cache');
/** 是否进行下一个动作 */
const IF_PROCEED = function <T>() {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = function (this: LambdaQuery<T>) {
      if (this.if_proceed === true) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        fn.call(this, ...args);
      } else {
        this.if_proceed = true;
      }
      return this;
    };
  };
};
/*** 是否执行最终查询/操作*/
const IF_EXEC = function <T>(def: any) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = async function (this: LambdaQuery<T>) {
      if (this.if_proceed === true && this.if_exec === true) {
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
  private index = 0;
  private startRow = 0;
  private pageSize = 0;
  private search: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<T[]>;
  private excute: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<number>;
  private findCount: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<number>;
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
  private paramKeys: {[k: string]: string[] | T} = {};
  private context: BaseContextClass;
  private app: Application;
  private sql = '';
  private fns: string[] = [];
  protected param: {[k: string]: T[keyof T]} = {};
  // 是否执行下一个动作
  protected if_proceed = true;
  // 是否执行查询
  protected if_exec = true;

  constructor (
    table: string,
    search: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<T[]>,
    findCount: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<number>,
    excute: (sql: string, param: {[k: string]: T[keyof T]}) => Promise<number>,
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
  /** 清空条件 */
  clear() {
    this._cache = undefined;
    this.pageSize = 0;
    this.startRow = 0;
    this.index = 0;
    this.order.length = 0;
    this.group.length = 0;
    this.condition.length = 0;
    this.fns.length = 0;
    this.sql = '';
    this.param = {};
    this.paramKeys = {};
    this.andQuerys.length = 0;
    this.orQuerys.length = 0;
    return this;
  }
  /** 对通过key方法设置的参数进行重新设置 */
  set(name: string, v1: T[keyof T], v2?: T[keyof T]) {
    if (!this.paramKeys[name]) {
      throw new Error('param not cached!please use key(name) define it before set');
    }
    if (this.paramKeys[name][0]) {
      this.param[this.paramKeys[name][0]] = v1 as any;
    }
    if (this.paramKeys[name][1]) {
      this.param[this.paramKeys[name][1]] = v2 as any;
    }
    return this;
  }
  /**
   * 缓存查询结果
   * @param param
   * @returns
   */
  @IF_PROCEED<T>()
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
  @IF_PROCEED<T>()
  stopCache(): this {
    this._cache = undefined;
    return this;
  }
  /**
   * 清除缓存结果
   * @returns
   */
  @IF_PROCEED<T>()
  clearCache(): this {
    const key = md5Util(this.sql + JSON.stringify(this.param));
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.app.redis.get('other').del(`[cache]${ String(key) }`);
    return this;
  }
  /**
   * 为下次链条执行提供条件判断：非异步方法跳过，异步方法不执行并返回默认值
   * @param condition
   * @returns
   */
  @IF_PROCEED<T>()
  if(condition: boolean) {
    this.if_proceed = condition;
    return this;
  }
  /**
   * and 连接另一个LamdbaQuery
   * @param fn 返回 LamdbaQuery
   * @returns
   */
  @IF_PROCEED<T>()
  and(fn: (query: LambdaQuery<T>) => LambdaQuery<T>): this {
    this.andQuerys.push(fn(new LambdaQuery<T>(this.table, this.search, this.findCount, this.excute, this.context, this.app)));
    return this;
  }
  /**
   * or 连接另一个LamdbaQuery
   * @param fn 返回 LamdbaQuery
   * @returns
   */
  @IF_PROCEED<T>()
  or(fn: (query: LambdaQuery<T>) => LambdaQuery<T>): this {
    this.orQuerys.push(fn(new LambdaQuery<T>(this.table, this.search, this.findCount, this.excute, this.context, this.app)));
    return this;
  }
  /**
   * 等于操作
   * key = value
   * @param key
   * @param value
   * @param name 用作缓存的参数名;通用则覆盖原有条件;
   * @returns
   */
  @IF_PROCEED<T>()
  andEq(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '=', {name});
  }
  /**
   * 属性相等
   * key1 = key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andEqKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '=');
  }
  /**
   * key 满足 正则：value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andRegexp(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, 'REGEXP', {name});
  }
  /**
   * key 不满足 正则：value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotRegexp(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, 'REGEXP', {name, not: 'NOT'});
  }
  /**
   * (key1 << 8) + key2 = value
   *
   * 通过 (key1 << 8) + key2
   * 可以将两个number型值合并为一个新的number型值
   * 只要number1和number2不变，则结果不变；任意一个变则结果变
   * 一般用于两个表的数字主键合并为另一个表的数字主键
   *
   * @param key1
   * @param key2
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andShiftEq(key1: keyof T, key2: keyof T, value: T[keyof T], name?: string): this {
    return this.commonShift(key1, key2, value, '=', {name});
  }
  /**
   * 整个对象中每个属性都进行等于判断
   * @param t
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andEqT(t: {[P in keyof T]?: T[P]}, name?: string): this {
    if (name && this.paramKeys[name]) {
      for (const [key, pname] of Object.entries(this.paramKeys[name] as any)) {
        this.param[pname as string] = t[key];
      }
    } else {
      const paramKeys: T = {} as T;
      for (const [key, value] of Object.entries(t)) {
        const pkey = `p${ this.index++ }`;
        this.condition.push(`AND ${ String(key) } = :${ pkey } `);
        this.param[pkey] = value as any;
        if (name) {
          paramKeys[key] = [pkey];
        }
      }
      if (name) {
        this.paramKeys[name] = paramKeys;
      }
    }
    return this;
  }
  /**
   * key <> value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotEq(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '<>', {name});
  }
  /**
   * 属性不相等
   *  key1 <> key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andNotEqKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '<>');
  }
  /**
   * (key1 << 8) + key2 <> value
   *
   * 通过 (key1 << 8) + key2
   * 可以将两个number型值合并为一个新的number型值
   * 只要number1和number2不变，则结果不变；任意一个变则结果变
   * 一般用于两个表的数字主键合并为另一个表的数字主键
   *
   * @param key1
   * @param key2
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andShiftNotEq(key1: keyof T, key2: keyof T, value: T[keyof T], name?: string): this {
    return this.commonShift(key1, key2, value, '<>', {name});
  }
  /**
   * key > value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andGreat(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '>', {name});
  }
  /**
   * key1 > key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andGreatKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '>');
  }
  /**
   * key >= value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andGreatEq(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '>=', {name});
  }
  /**
   * key1 >= key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andGreatEqKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '>=');
  }
  /**
   * key < value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andLess(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '<', {name});
  }
  /**
   * key1 < key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andLessKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '<');
  }
  /**
   * key <= value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andLessEq(
    key: keyof T,
    value: T[keyof T],
    name?: string
  ): this {
    return this.common(key, value, '<=', {name});
  }
  /**
   * key1 <= key2
   * @param key1
   * @param key2
   * @returns
   */
  @IF_PROCEED<T>()
  andLessEqKey(
    key1: keyof T,
    key2: keyof T
  ): this {
    return this.commonKey(key1, key2, '<=');
  }
  /**
   * key like %value%
   * value 会自动变为 %value%
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {name});
  }
  /**
   * key like value
   * value 不会自动变为 %value%,而是直接传递
   * @param key
   * @param value
   * @returns
   */
  @IF_PROCEED<T>()
  andLikePrecise(
    key: keyof T,
    value: string,
    name?: string
  ): this {
    return this.common(key, value, 'LIKE', {name});
  }
  /**
   * key not like value
   * value 不会自动变为 %value%,而是直接传递
   * @param key
   * @param value
   * @returns
   */
  @IF_PROCEED<T>()
  andNotLikePrecise(
    key: keyof T,
    value: string,
    name?: string
  ): this {
    return this.common(key, value, 'LIKE', {name, not: 'NOT'});
  }
  /**
   * key not like %value%
   * value 会自动变为 %value%
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {name, not: 'NOT'});
  }
  /**
   * 左like
   * key like %value
   * value 会自动变为 %value
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andLeftLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {
      right: '',
      name
    });
  }
  /**
   * 非左like
   * key not like %value
   * value 会自动变为 %value
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotLeftLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {
      right: '',
      name,
      not: 'NOT'
    });
  }
  /**
   * 右like
   * key like value%
   * value 会自动变为 value%
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andRightLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {
      left: '',
      name
    });
  }
  /**
   * 非右like
   * key like value%
   * value 会自动变为 value%
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotRightLike(
    key: keyof T,
    value: T[keyof T],
    force?: boolean,
    name?: string
  ): this {
    if (force !== false && (value === undefined || value === null || (value as any) === '')) {
      this.if_exec = false;
    }
    return this.like(key, value, {
      left: '',
      name,
      not: 'NOT'
    });
  }
  @IF_PROCEED<T>()
  andIsNull(key: keyof T): this {
    return this.nil(key);
  }
  @IF_PROCEED<T>()
  andIsNotNull(key: keyof T): this {
    return this.nil(key, 'NOT');
  }
  /**
   * key IN value
   * value是数组
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andIn(key: keyof T, value: T[keyof T][], force?: boolean, name?: string): this {
    if (force !== false && value.length === 0) {
      this.if_exec = false;
    }
    return this.commonIn(key, value, {name});
  }
  /**
   * key NOT IN value
   * value是数组
   * @param key
   * @param value
   * @param force 当value为空时，是否跳过最终执行？即不查询直接返回或者不执行update、delete
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotIn(key: keyof T, value: T[keyof T][], force?: boolean, name?: string): this {
    if (force !== false && value.length === 0) {
      this.if_exec = false;
    }
    return this.commonIn(key, value, {name, not: 'NOT'});
  }
  /**
   * key BETWEEN value1 AND value2
   * @param key
   * @param value1
   * @param value2
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T],
    name?: string
  ): this {
    return this.between(key, value1, value2, {name});
  }
  /**
   * key NOT BETWEEN value1 AND value2
   * @param key
   * @param value1
   * @param value2
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T],
    name?: string
  ): this {
    return this.between(key, value1, value2, {name, not: 'NOT'});
  }
  /**
   * POW(2, key) & value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andPow(key: keyof T, value: number, name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND POW(2, ${ String(key) }) & :${ pkey }`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * NOT POW(2, key) & value
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotPow(key: keyof T, value: number, name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND NOT POW(2, ${ String(key) }) & :${ pkey }`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * 全文搜索
   * MATCH(key1, key2, key3) AGAINST (value)
   * @param value
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andMatch(value: string, keys: (keyof T)[], name?: string,): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:${ pkey })`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * 反全文搜索
   * NOT MATCH(key1, key2, key3) AGAINST (value)
   * @param value
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotMatch(value: string, keys: (keyof T)[], name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:${ pkey })`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * boolean model 全文搜索
   * MATCH(key1, key2, key3) AGAINST (+|-value1 +|-value2 IN BOOLEAN MODE)
   * @param values
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andMatchBoolean(values: {match: boolean; value: string}[], keys: (keyof T)[], name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ') as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:${ pkey } IN BOOLEAN MODE)`);
      this.param[pkey] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ') as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * boolean model 反向全文搜索
   * NOT MATCH(key1, key2, key3) AGAINST (+|-value1 +|-value2 IN BOOLEAN MODE)
   * @param values
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotMatchBoolean(values: {match: boolean; value: string}[], keys: (keyof T)[], name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ') as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:${ pkey } IN BOOLEAN MODE)`);
      this.param[pkey] = values.map(v => `${ v.match ? '+' : '-' }${ v.value }`).join(' ') as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * QUERY EXPANSION 全文搜索
   * MATCH(key1, key2, key3) AGAINST (value WITH QUERY EXPANSION)
   * @param value
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andMatchQuery(value: string, keys: (keyof T)[], name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND MATCH(${ keys.join(',') }) AGAINST (:${ pkey } WITH QUERY EXPANSION)`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * QUERY EXPANSION 反向全文搜索
   * NOT MATCH(key1, key2, key3) AGAINST (value WITH QUERY EXPANSION)
   * @param value
   * @param keys
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotMatchQuery(value: string, keys: (keyof T)[], name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND NOT MATCH(${ keys.join(',') }) AGAINST (:${ pkey } WITH QUERY EXPANSION)`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * POW算法解构
   * POW(2, key) & ( POW(2, value1) + POW(2, value2) + POW(2, value3) )
   * @param key
   * @param values
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andPowWith(key: keyof T, values: Array<number | string>, name?: string): this {
    return this.andPow(key, add(...values.map(value => Math.pow(2, +value))), name);
  }
  /**
   * 反向POW算法解构
   * NOT POW(2, key) & ( POW(2, value1) + POW(2, value2) + POW(2, value3) )
   * @param key
   * @param values
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotPowWith(key: keyof T, values: Array<number | string>, name?: string): this {
    return this.andNotPow(key, add(...values.map(value => Math.pow(2, +value))), name);
  }
  /**
   * 字符串位置查询
   * LOCATE (key, value) > 0
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andIncludes(key: keyof T, value: string, name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND LOCATE (:${ pkey }, ${ String(key) }) > 0`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * 反向字符串位置查询
   * LOCATE (key, value) = 0
   * @param key
   * @param value
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  andNotIncludes(key: keyof T, value: string, name?: string): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value as any;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND LOCATE (:${ pkey }, ${ String(key) }) = 0`);
      this.param[pkey] = value as any;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  /**
   * 分组
   * @param key
   * @returns
   */
  @IF_PROCEED<T>()
  groupBy(key: keyof T): this {
    this.group.push(key);
    return this;
  }
  /**
   * 排列1
   * @param keys
   * @returns
   */
  @IF_PROCEED<T>()
  asc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ String(key) } ASC`);
    }
    return this;
  }
  /**
   * 排列2
   * @param keys
   * @returns
   */
  @IF_PROCEED<T>()
  desc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ String(key) } DESC`);
    }
    return this;
  }
  /**
   * 分页：按照limit原生计算
   * @param startRow
   * @param pageSize
   * @returns
   */
  @IF_PROCEED<T>()
  limit(startRow: number, pageSize: number): this {
    this.startRow = startRow;
    this.pageSize = pageSize;
    return this;
  }
  /**
   * 分页：按照页码、每页记录计算
   * @param pageNumber
   * @param pageSize
   * @returns
   */
  @IF_PROCEED<T>()
  page(pageNumber: number, pageSize: number): this {
    this.startRow = ((pageNumber || 1) - 1) * pageSize;
    this.pageSize = pageSize;
    return this;
  }
  /**
   * 设置更新列名
   * 再次设置时，直接覆盖
   * @param key
   * @param value
   * @returns
   */
  @IF_PROCEED<T>()
  updateColumn(key: keyof T, value: T[keyof T]) {
    if (!this.updateData) {
      this.updateData = {} as T;
    }
    this.updateData[key] = value;
    return this;
  }
  /**
   * 替换更新一列
   * @param key 列名
   * @param valueToFind  要查找的值
   * @param valueToReplace 替换结果
   * @returns
   */
  @IF_PROCEED<T>()
  updateReplaceColumn(key: keyof T, valueToFind: T[keyof T], valueToReplace: T[keyof T]) {
    const [pkey1, pkey2] = [`p${ this.index++ }`, `p${ this.index++ }`];
    this.fns.push(` ${ String(key) } = REPLACE(${ String(key) }, :${ pkey1 }, :${ pkey2 }) `);
    this.param[pkey1] = valueToFind as any;
    this.param[pkey2] = valueToReplace as any;
    return this;
  }
  /**
   * 替换查询一列
   * @param key 列名
   * @param valueToFind  要查找的值
   * @param valueToReplace 替换结果
   * @param key2 别名，默认是列名
   * @param name
   * @returns
   */
  @IF_PROCEED<T>()
  queryReplaceColumn(key: keyof T, valueToFind: T[keyof T], valueToReplace: T[keyof T], key2?: string, name?: string) {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = valueToFind;
      this.param[this.paramKeys[name][1]] = valueToReplace;
    } else {
      const [pkey1, pkey2] = [`p${ this.index++ }`, `p${ this.index++ }`];
      this.fns.push(`REPLACE(${ String(key) }, :${ pkey1 }, :${ pkey2 }) AS ${ key2 || key as any as string }`);
      this.param[pkey1] = valueToFind as any;
      this.param[pkey2] = valueToReplace as any;
      if (name) {
        this.paramKeys[name] = [pkey1, pkey2];
      }
    }
    return this;
  }
  /**
   * 查询返回列表
   * @param columns
   * @returns
   */
  @IF_EXEC<T>([])
  async select(...columns: (keyof T)[]): Promise<T[]> {
    this.selectPrepare(...columns);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ String(key) }`);
      if (cache) {
        debug(`cache for query ${ String(key) } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.search(this.sql, this.param);
      if (result.length > 0) {
        await setCache.call(this.app, {
          key,
          result,
          ...this._cache
        });
      }
      return result;
    } else {
      return await this.search(this.sql, this.param);
    }
  }
  /**
   * 生成查询sql
   * @param columns
   * @returns
   */
  @IF_PROCEED<T>()
  selectPrepare(...columns: (keyof T)[]): this {
    this.sql = `
      SELECT
      ${ columns && columns.length > 0 ? columns.join(',') : '*' }
      ${ this.fns.length > 0 ? `, ${ this.fns.join(',') }` : '' }
      FROM ${ this.table }
      ${ this.buildWhere(true) }
    `;
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
  /**
   * 去重查询，返回列表
   * @param columns
   * @returns
   */
  @IF_EXEC<T>([])
  async selectDistinct(...columns: (keyof T)[]): Promise<T[]> {
    this.selectDistinctPrepare(...columns);
    if (this._cache) {
      const key = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ String(key) }`);
      if (cache) {
        debug(`cache for query ${ String(key) } hit!`);
        return JSON.parse(cache);
      }

      const result = await this.search(this.sql, this.param);
      if (result && result.length > 0) {
        await setCache.call(this.app, {
          key,
          result,
          ...this._cache
        });
      }
      return result;
    } else {
      return await this.search(this.sql, this.param);
    }
  }
  /**
   * 生成去重查询语句
   * @param columns
   * @returns
   */
  @IF_PROCEED<T>()
  selectDistinctPrepare(...columns: (keyof T)[]): this {
    this.sql = `
      SELECT DISTINCT
      ${ columns && columns.length > 0 ? columns.join(',') : '*' }
      ${ this.fns.length > 0 ? `, ${ this.fns.join(',') }` : '' }
      FROM ${ this.table }
      ${ this.buildWhere(true) }
    `;
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
  /**
   * 查询一条记录
   * 返回对象或者undefined
   * @param columns
   * @returns
   */
  @IF_EXEC<T>(undefined)
  async one(...columns: (keyof T)[]): Promise<T | undefined> {
    this.limit(0, 1);
    const list = await this.select(...columns);
    return list[0];
  }
  /**
   * 查询一条记录，必定返回对象
   * 不做非空判断
   * @param columns
   * @returns
   */
  @IF_EXEC<T>({})
  async oneUnique(...columns: (keyof T)[]): Promise<T> {
    this.limit(0, 1);
    const list = await this.select(...columns);
    if (list.length === 0) {throw new Error('not found');}
    return list[0];
  }
  /**
   *
   * @param columns 生成查询单条数据sql
   * @returns
   */
  @IF_PROCEED<T>()
  onePrepare(...columns: (keyof T)[]): this {
    this.limit(0, 1);
    return this.selectPrepare(...columns);
  }
  /**
   * 执行更新操作
   * @param data
   * @returns
   */
  @IF_EXEC<T>(0)
  async update(data?: T): Promise<number> {
    this.updatePrepare(data);
    if (this.sql) {
      return await this.excute(this.sql, this.param);
    } else {
      return 0;
    }
  }
  /**
   * 生成更新语句
   * @param data
   * @returns
   */
  @IF_PROCEED<T>()
  updatePrepare(data?: T): this {
    if (!data) {
      data = {} as T;
    }
    if (this.updateData) {
      Object.assign(data as any, this.updateData);
    }
    const sets = new Array<string>(...this.fns);
    for (const key in data) {
      if ((data as any).hasOwnProperty(key)) {
        sets.push(` ${ String(key) } = :${ String(key) } `);
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
  /**
   * 删除
   * @returns
   */
  @IF_EXEC<T>(0)
  async delete(): Promise<number> {
    this.deletePrepare();
    return await this.excute(this.sql, this.param);
  }
  /**
   * 生成删除语句
   * @returns
   */
  @IF_PROCEED<T>()
  deletePrepare(): this {
    this.sql = `DELETE FROM ${ this.table } ${ this.buildWhere(true) } `;
    return this;
  }
  /**
   * 查询单列
   * @param key
   * @param distinct 是否去重
   * @returns
   */
  @IF_EXEC<T>([])
  async array<K extends T[keyof T]>(key: keyof T, distinct?: boolean): Promise<K[]> {
    const list = await (distinct ? this.selectDistinct(key) : this.select(key));
    return list.map(item => item[key] as K);
  }
  /**
   * 查询单列单行
   * @param key
   * @param distinct 是否去重
   * @returns
   */
  @IF_EXEC<T>(undefined)
  async singel<K extends T[keyof T]>(key: keyof T, distinct?: boolean): Promise<K | undefined> {
    this.limit(0, 1);
    const list = await (distinct ? this.selectDistinct(key) : this.select(key));
    if (list.length > 0) {
      return (list[0] as any)[key] as K;
    }
  }
  /**
   * 查询行数
   * @returns
  */
  @IF_EXEC<T>(0)
  async count(key?: keyof T, distinct?: boolean): Promise<number> {
    this.countPrepare(key, distinct);
    return await this.singelQuery<number>(0);
  }
  /**
   * 生成查询行数sql
   * @returns
  */
  @IF_PROCEED<T>()
  countPrepare(key?: keyof T, distinct?: boolean): this {
    this.sql = `SELECT COUNT(${ distinct ? 'DISTINCT' : '' } ${ key ? String(key) : 1 }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    if (this.group.length > 0) {
      this.sql += `GROUP by ${ this.group.join(',') } `;
    }
    return this;
  }
  /**
   * 预先设置 count数据的列名，可在最终select或者one中返回
   * @param key
   * @param countName 列名
   * @returns
   */
  @IF_PROCEED<T>()
  countAs(key: keyof T, countName?: string, distinct?: boolean): this {
    this.fns.push(`COUNT(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ${ countName || `${ String(key) }` }`);
    return this;
  }
  /**
   * 查询和
   * @param key
   * @param distinct  是否去重
   * @returns
   */
  @IF_EXEC<T>(0)
  async sum(key: keyof T, distinct?: boolean): Promise<number> {
    this.sumPrepare(key, distinct);
    return await this.singelQuery<number>(0);
  }
  /**
   * 生成查询和sql
   * @param key
   * @param distinct  是否去重
   * @returns
   */
  @IF_PROCEED<T>()
  sumPrepare(key: keyof T, distinct?: boolean): this {
    this.sql = `SELECT  SUM(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /**
   * 预先设置 sum数据的列名，可在最终select或者one中返回
   * @param key
   * @param sumName 列名
   * @param distinct 是否去重
   * @returns
   */
  @IF_PROCEED<T>()
  sumAs(key: keyof T, sumName?: string, distinct?: boolean): this {
    this.fns.push(`SUM(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ${ sumName || `${ String(key) }` }`);
    return this;
  }
  /**
   * 求平均
   * @param key
   * @param distinct 是否去重
   * @returns
   */
  @IF_EXEC<T>(0)
  async avg(key: keyof T, distinct?: boolean): Promise<number> {
    this.avgPrepare(key, distinct);
    return await this.singelQuery<number>(0);
  }
  /**
   * 生成平均sql
   * @param key
   * @param distinct  是否去重
   * @returns
   */
  @IF_PROCEED<T>()
  avgPrepare(key: keyof T, distinct?: boolean): this {
    this.sql = `SELECT AVG(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /**
   * 预先设置 avg数据的列名，可在最终select或者one中返回
   * @param key
   * @param avgName 列名
   * @param distinct 是否去重
   * @returns
   */
  @IF_PROCEED<T>()
  avgAs(key: keyof T, avgName?: string, distinct?: boolean): this {
    this.fns.push(`AVG(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ${ avgName || `${ String(key) }` }`);
    return this;
  }
  /**
   * 最大值
   * @param key
   * @param def
   * @param distinct
   * @returns
   */
  @IF_EXEC<T>(undefined)
  async max<L = number>(key: keyof T, def?: L, distinct?: boolean): Promise<L | undefined> {
    this.maxPrepare(key, distinct);
    return await this.singelQuery<L>(def);
  }
  /**
   * 生成最大值sql
   * @param key
   * @param distinct
   * @returns
   */
  @IF_PROCEED<T>()
  maxPrepare(key: keyof T, distinct?: boolean): this {
    this.sql = `SELECT MAX(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /**
   * 预先设置 最大数据的列名，可在最终select或者one中返回
   * @param key
   * @param maxName 列名
   * @returns
   */
  @IF_PROCEED<T>()
  maxAs(key: keyof T, maxName?: string, distinct?: boolean): this {
    this.fns.push(`MAX(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ${ maxName || `${ String(key) }` }`);
    return this;
  }
  @IF_EXEC<T>(undefined)
  async min<L = number>(key: keyof T, def?: L, distinct?: boolean): Promise<L | undefined> {
    this.minPrepare(key, distinct);
    return await this.singelQuery<L>(def);
  }
  /**
   * 预生成最小值sql
   * @param key
   * @returns
   */
  @IF_PROCEED<T>()
  minPrepare(key: keyof T, distinct?: boolean): this {
    this.sql = `SELECT MIN(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /**
   * 预先设置 最小数据的列名，可在最终select或者one中返回
   * @param key
   * @param minName 列名
   * @returns
   */
  @IF_PROCEED<T>()
  minAs(key: keyof T, minName?: string, distinct?: boolean): this {
    this.fns.push(`MIN(${ distinct ? 'DISTINCT' : '' } ${ String(key) }) ${ minName || `${ String(key) }` }`);
    return this;
  }
  /**
   * 拼接
   * @param key
   * @param _param
   * @returns
   */
  @IF_EXEC<T>('')
  async groupConcat(key: keyof T, _param?: {distinct?: boolean, separator?: string}): Promise<string> {
    this.groupConcatPrepare(key, _param);
    return await this.singelQuery<string>('');
  }
  /**
   * 预生成拼接的sql
   * @param key
   * @param param
   * @returns
   */
  @IF_PROCEED<T>()
  groupConcatPrepare(key: keyof T, param?: {distinct?: boolean, separator?: string, asc?: (keyof T)[], desc?: (keyof T)[]}): this {
    this.sql = `SELECT
    GROUP_CONCAT(
      ${ param && param.distinct ? 'DISTINCT' : '' } ${ String(key) }
      ${ param && param.asc && param.asc.length > 0 ? `ORDER BY ${ param.asc.map(i => `${ String(i) } ASC`) } ` : '' }
      ${ param && param.desc && param.desc.length > 0 ? `${ param && param.asc && param.asc.length > 0 ? '' : 'ORDER BY' } ${ param.desc.map(i => `${ String(i) } DESC`) } ` : '' }
      SEPARATOR '${ param && param.separator || ',' }'
    ) ct FROM ${ this.table } ${ this.buildWhere(true) }`;
    return this;
  }
  /**
   * 预先设置 拼接的列名，可在最终select或者one中返回
   * @param key
   * @param param 参数
   * @returns
   */
  @IF_PROCEED<T>()
  groupConcatAs(key: keyof T, param?: {distinct?: boolean, separator?: string, asc?: (keyof T)[], desc?: (keyof T)[], groupName?: string}): this {
    this.fns.push(`GROUP_CONCAT(
      ${ param && param.distinct ? 'DISTINCT' : '' } ${ String(key) }
      ${ param && param.asc && param.asc.length > 0 ? `ORDER BY ${ param.asc.map(i => `${ String(i) } ASC`) } ` : '' }
      ${ param && param.desc && param.desc.length > 0 ? `${ param && param.asc && param.asc.length > 0 ? '' : 'ORDER BY' } ${ param.desc.map(i => `${ String(i) } DESC`) } ` : '' }
      SEPARATOR '${ param && param.separator || ',' }'
    ) ${ param && param.groupName || `${ String(key) }` }`);
    return this;
  }
  /** 获得sql和参数 */
  get(): {sql: string; param: {[k: string]: T[keyof T]}} {
    return {sql: this.sql, param: this.param};
  }
  private nil(key: keyof T, not = ''): this {
    this.condition.push(`AND ${ String(key) } is ${ not } null`);
    return this;
  }
  private like(
    key: keyof T,
    value: any,
    {
      not = '',
      left = '%',
      right = '%',
      name = ''
    } = {}
  ): this {
    if (value !== null && value !== undefined && value !== '') {
      if (name && this.paramKeys[name]) {
        this.param[this.paramKeys[name][0]] = value;
      } else {
        const pkey = `p${ this.index++ }`;
        this.condition.push(
          `AND ${ String(key) } ${ not } LIKE CONCAT('${ left }', :${ pkey }, '${ right }') `
        );
        this.param[pkey] = value;
        if (name) {
          this.paramKeys[name] = [pkey];
        }
      }
    }
    return this;
  }
  private between(
    key: keyof T,
    value1: any,
    value2: any,
    {not = '', name = ''} = {}
  ): this {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value1;
      this.param[this.paramKeys[name][1]] = value2;
    } else {
      const [pkey1, pkey2] = [`p${ this.index++ }`, `p${ this.index++ }`];
      this.condition.push(`AND ${ String(key) } ${ not } BETWEEN :${ pkey1 } AND :${ pkey2 }`);
      this.param[pkey1] = value1;
      this.param[pkey2] = value2;
      if (name) {
        this.paramKeys[name] = [pkey1, pkey2];
      }
    }

    return this;
  }
  private common(
    key: keyof T,
    value: any,
    op: string,
    {not = '', name = ''} = {}
  ) {
    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND ${ String(key) } ${ not } ${ op } :${ pkey } `);
      this.param[pkey] = value;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
    return this;
  }
  private commonKey(
    key1: keyof T,
    key2: keyof T,
    op: string,
    not = ''
  ) {
    this.condition.push(`AND ${ String(key1) } ${ not } ${ op } ${ String(key2) } `);
    return this;
  }
  private commonIn(
    key: keyof T,
    value: any,
    {not = '', name = ''} = {}
  ) {
    if (value && value.length > 0) {
      if (name && this.paramKeys[name]) {
        this.param[this.paramKeys[name][0]] = value;
      } else {
        const pkey = `p${ this.index++ }`;
        this.condition.push(`AND ${ String(key) } ${ not } IN (:${ pkey }) `);
        this.param[pkey] = value;
        if (name) {
          this.paramKeys[name] = [pkey];
        }
      }
    }
    return this;
  }
  private commonShift(
    key1: keyof T,
    key2: keyof T,
    value: any,
    op: string,
    {not = '', name = ''} = {}
  ) {

    if (name && this.paramKeys[name]) {
      this.param[this.paramKeys[name][0]] = value;
    } else {
      const pkey = `p${ this.index++ }`;
      this.condition.push(`AND (${ String(key1) } << 8) + ${ String(key2) } ${ not } ${ op } :${ pkey } `);
      this.param[pkey] = value;
      if (name) {
        this.paramKeys[name] = [pkey];
      }
    }
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
  private where(index: number): {sql: string; param: {[k: string]: T[keyof T]}; index: number} {
    const param: {[k: string]: T[keyof T]} = this.param;
    let sql = this.buildWhere();
    for (const [k, v] of Object.entries(this.param)) {
      const newName = k.replace(/\d+$/, (_a: string) => `${ index++ }`);
      sql = sql.replace(k, newName);
      param[newName] = v;
      delete param[k];
    }
    return {sql, param, index};
  }
  private async singelQuery<L = number>(def?: L) {
    let cacheKey: string;
    if (this._cache) {
      cacheKey = md5Util(this.sql + JSON.stringify(this.param));
      const cache = await this.app.redis.get('other').get(`[cache]${ cacheKey }`);
      if (cache) {
        debug(`cache for query ${ cacheKey } hit!`);
        return JSON.parse(cache);
      }
    }
    const result_ = await this.search(this.sql, this.param);
    if (result_.length > 0) {
      def = (result_[0] as unknown as {ct: L}).ct;
      if (this._cache) {
        await setCache.call(this.app, {
          key: cacheKey!,
          result: def,
          ...this._cache
        });
      }
    }
    return def;
  }
}
