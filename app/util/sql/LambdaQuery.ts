import {Empty} from '../empty';
import {add} from '../math';
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
  constructor (
    table: string,
    search: (sql: string, param: Empty) => Promise<T[]>,
    findCount: (sql: string, param: Empty) => Promise<number>,
    excute: (sql: string, param: Empty) => Promise<number>
  ) {
    this.findCount = findCount;
    this.search = search;
    this.excute = excute;
    this.table = table;
  }
  and(lambda: LambdaQuery<T>): this {
    this.andQuerys.push(lambda);
    return this;
  }
  or(lambda: LambdaQuery<T>): this {
    this.orQuerys.push(lambda);
    return this;
  }
  andEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '=');
  }
  andEqT(t: {[P in keyof T]?: T[P]}): this {
    for (const [key, value] of Object.entries(t)) {
      this.common(key as any, value, '=');
    }
    return this;
  }
  andNotEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<>');
  }
  andGreat(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '>');
  }
  andGreatEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '>=');
  }
  andLess(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<');
  }
  andLessEq(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.common(key, value, '<=');
  }
  andLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value);
  }
  andNotLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, 'NOT');
  }
  andLeftLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, '', '%', '');
  }
  andNotLeftLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, 'NOT', '%', '');
  }
  andRightLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, '', '', '%');
  }
  andNotRightLike(
    key: keyof T,
    value: T[keyof T]
  ): this {
    return this.like(key, value, 'NOT', '', '%');
  }
  andIsNull(key: keyof T): this {
    return this.nil(key);
  }
  andIsNotNull(key: keyof T): this {
    return this.nil(key, 'NOT');
  }
  andIn(key: keyof T, value: T[keyof T][]): this {
    return this.commonIn(key, value);
  }
  andNotIn(key: keyof T, value: T[keyof T][]): this {
    return this.commonIn(key, value, 'NOT');
  }
  andBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T]
  ): this {
    return this.between(key, value1, value2);
  }
  andNotBetween(
    key: keyof T,
    value1: T[keyof T],
    value2: T[keyof T]
  ): this {
    return this.between(key, value1, value2, 'NOT');
  }
  andPow(key: keyof T, value: number) {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND POW(2, ${ key }) & ${ value }`);
    this.param[pkey] = value;
    return this;
  }
  andNotPow(key: keyof T, value: number) {
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND NOT POW(2, ${ key }) & ${ value }`);
    this.param[pkey] = value;
    return this;
  }
  andPowWith(key: keyof T, ...values: Array<number | string>) {
    return this.andPow(key, add(...values.map(value => Math.pow(2, +value))));
  }
  andNotPowWith(key: keyof T, ...values: Array<number | string>) {
    return this.andNotPow(key, add(...values.map(value => Math.pow(2, +value))));
  }
  groupBy(key: keyof T): this {
    this.group.push(key);
    return this;
  }

  asc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ key } ASC`);
    }
    return this;
  }

  desc(...keys: (keyof T)[]): this {
    for (const key of keys) {
      this.order.push(`${ key } DESC`);
    }
    return this;
  }

  limit(startRow: number, pageSize: number): this {
    this.startRow = startRow;
    this.pageSize = pageSize;
    return this;
  }
  page(pageNumber: number, pageSize: number): this {
    this.startRow = ((pageNumber || 1) - 1) * pageSize;
    this.pageSize = pageSize;
    return this;
  }
  where(): string {
    return this.condition.join(' ');
  }
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
    return await this.search(sql, this.param);
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
    return await this.findCount(sql, this.param);
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
    const data = await this.search(sql, this.param);
    if (data.length > 0) {
      return (data[0] as unknown as {ct: number}).ct;
    } else {
      return 0;
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
    const data = await this.search(sql, this.param);
    if (data.length > 0) {
      return (data[0] as unknown as {ct: number}).ct;
    } else {
      return 0;
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
    const data = await this.search(sql, this.param);
    if (data.length > 0) {
      return (data[0] as unknown as {ct: string}).ct;
    } else {
      return '';
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
    const pkey = `${ key }_${ this.index++ }`;
    this.condition.push(`AND ${ key } ${ not } IN (:${ pkey }) `);
    this.param[pkey] = value;
    return this;
  }
}
