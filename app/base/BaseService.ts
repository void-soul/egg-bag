import {Service} from 'egg';
import {calc} from '../util/math';
import LambdaQuery from '../util/sql/LambdaQuery';
import PageQuery from '../util/sql/PageQuery';
import {Empty} from '../util/empty';
import {notEmptyString} from '../util/string';
import {SqlSession} from '../../typings';
const debug = require('debug')('egg-bag');
const MethodDebug = function <T>() {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = async function (this: BaseService<T>) {
      // eslint-disable-next-line prefer-rest-params
      const args = Array.from(arguments);
      const result = await fn.call(this, ...args);
      debug(`${ propertyKey }:${ this['tableName'] }`);
      return result;
    };
  };
};

export default abstract class BaseService<T> extends Service {
  private max = 500;
  private tableName: string;
  private idNames: (keyof T)[];
  private keys: (keyof T)[];
  private stateFileName: string;
  private deleteState: string;

  /**
   * 插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insert(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const result = await conn.insert<T>(tableName(this.tableName), data, {
        columns: this.keys
      });

      return result.insertId;
    }, transction);
  }
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const where: {[P in keyof T]?: T[P]} = {};
      columns.forEach((column) => {
        if (notEmptyString(data[column])) {
          where[column] = data[column];
        }
      });
      const result = await conn.insertIF<T>(
        tableName(this.tableName),
        [{row: data, where}],
        this.keys
      );

      return result.insertId;
    }, transction);
  }
  /**
   * 插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replace(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    for (const idName of this.idNames) {
      this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
    }
    return await this.transction(async (conn) => {
      const result = await conn.replace<T>(tableName(this.tableName), data, {
        columns: this.keys,
        ids: this.idNames
      });

      return result.insertId;
    }, transction);
  }
  /**
   *
   * 只插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplate(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const result = await conn.insert<T>(
        tableName(this.tableName),
        this.filterEmptyAndTransient<T>(data, true, dealEmptyString),
        {
          columns: this.keys
        }
      );
      return result.insertId;
    }, transction);
  }
  /**
   *
   * 只插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.insertTemplate(data, transction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplateIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const where: {[P in keyof T]?: T[P]} = {};
      const row = this.filterEmptyAndTransient<T>(data, true, dealEmptyString);
      columns.forEach((column) => {
        if (notEmptyString(row[column])) {
          where[column] = row[column];
        }
      });
      const result = await conn.insertIF<T>(
        tableName(this.tableName),
        [{row, where}],
        Object.keys(row) as any
      );

      return result.insertId;
    }, transction);
  }
  /**
 * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null)
 * 返回自增主键或者0
 * @param {T} data
 * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
 * @param {(serviceTableName: string) => string} [tableName=(
 *       serviceTableName: string
 *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
 * @returns
 */
  @MethodDebug()
  async insertTemplateLooseIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.insertTemplateIfNotExists(data, columns, transction, tableName, false);
  }
  /**
   * 只插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceTemplate(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    for (const idName of this.idNames) {
      this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
    }
    return await this.transction(async (conn) => {
      const realData = this.filterEmptyAndTransient<T>(data, true, dealEmptyString);
      const result = await conn.replace<T>(tableName(this.tableName), realData, {
        ids: this.idNames
      });
      return result.insertId;
    }, transction);
  }
  /**
   * 只插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.replaceTemplate(data, transction, tableName, false);
  }
  /**
   * 批量插入所有列,返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatch(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insert<T>(table, datas.slice(i * this.max, (i + 1) * this.max), {
          columns: this.keys
        });
        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const options = new Array<any>();
      datas.forEach((item) => {
        const where: {[P in keyof T]?: T[P]} = {};
        columns.forEach((column) => {
          if (notEmptyString(item[column])) {
            where[column] = item[column];
          }
        });
        options.push({
          where,
          row: item
        });
      });
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(options.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insertIF<T>(
          table,
          options.slice(i * this.max, (i + 1) * this.max),
          this.keys
        );
        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   * 批量插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatch(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.replace<T>(
          table,
          datas.slice(i * this.max, (i + 1) * this.max),
          {
            columns: this.keys,
            ids: this.idNames
          }
        );
        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   *
   * 批量插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplate(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insert<T>(
          table,
          this.filterEmptyAndTransients<T>(datas.slice(i * this.max, (i + 1) * this.max), true, dealEmptyString),
          {
            columns: this.keys
          }
        );
        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   *
   * 批量插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplateLoose(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.insertBatchTemplate(datas, transction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplateIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const options = new Array<any>();
      datas.forEach((item) => {
        const where: {[P in keyof T]?: T[P]} = {};
        const realData = this.filterEmptyAndTransient<T>(item, true, dealEmptyString);
        columns.forEach((column) => {
          if (notEmptyString(realData[column])) {
            where[column] = realData[column];
          }
        });
        options.push({
          where,
          row: realData
        });
      });
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(options.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insertIF<T>(
          table,
          options.slice(i * this.max, (i + 1) * this.max),
          this.keys
        );

        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null)
    * 返回自增主键或者0
    * @param {T} data
    * @param {*} [transction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
    * @param {(serviceTableName: string) => string} [tableName=(
    *       serviceTableName: string
    *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
    * @returns
    */
  @MethodDebug()
  async insertBatchTemplateLooseIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.insertBatchTemplateIfNotExists(datas, columns, transction, tableName, false);
  }
  /**
   * 快速批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplate(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.replace<T>(
          table,
          this.filterEmptyAndTransients<T>(datas.slice(i * this.max, (i + 1) * this.max), true, dealEmptyString),
          {
            ids: this.idNames
          }
        );

        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   * 快速批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplateLoose(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.replaceBatchTemplate(datas, transction, tableName, false);
  }
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplateSafe(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn) => {
      const table = tableName(this.tableName);
      const result = new Array<number>();
      for (const data of datas) {
        const ret = await conn.replace<T>(table, [this.filterEmptyAndTransient<T>(data, true, dealEmptyString)], {
          ids: this.idNames
        });

        result.push(ret.insertId);
      }
      return result;
    }, transction);
  }
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplateLooseSafe(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.replaceBatchTemplateSafe(datas, transction, tableName, false);
  }
  /**
   * 根据主键修改全部字段
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateById(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const where: {[P in keyof T]?: T[P]} = {};
      for (const idName of this.idNames) {
        this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
        where[idName] = data[idName];
      }
      const result = await conn.update<T>(tableName(this.tableName), data, {
        where,
        columns: this.keys
      });
      return result.affectedRows;
    }, transction);
  }
  /**
   * 根据主键修改非空字段(排除undefined、null、空字符串)
   *
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateTemplateById(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const where: {[P in keyof T]?: T[P]} = {};
      for (const idName of this.idNames) {
        this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
        where[idName] = data[idName];
      }
      const realdata = this.filterEmptyAndTransient<T>(data, true, dealEmptyString);
      const result = await conn.update<T>(tableName(this.tableName), realdata, {
        where,
        columns: Object.keys(realdata) as any
      });
      return result.affectedRows;
    }, transction);
  }
  /**
   * 根据主键修改非空字段(排除undefined、null)
   *
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateTemplateLooseById(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateTemplateById(data, transction, tableName, false);
  }
  /**
   *
   * 根据主键批量修改全部字段
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    const options: {
      [name: string]: any;
    } = [];
    return await this.transction(async (conn) => {
      for (const data of datas) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
          where[idName] = data[idName];
        }
        options.push({
          row: data,
          where,
          columns: this.keys
        });
      }
      let result = 0;
      const table = tableName(this.tableName);
      const length = Math.ceil(options.length / this.max);
      for (let i = 0; i < length; i++) {
        result += (await conn.updateRows<T>(
          table,
          options.slice(i * this.max, (i + 1) * this.max)
        )).affectedRows;
      }
      return result;
    }, transction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    const options: {
      [name: string]: any;
    } = [];
    return await this.transction(async (conn) => {
      for (const data of datas) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(
            !data[idName],
            `${ idName } must be set!(${ JSON.stringify(data) })`
          );
          where[idName] = data[idName];
        }
        const realdata = this.filterEmptyAndTransient<T>(data, true, dealEmptyString);
        options.push({
          row: realdata,
          where,
          columns: Object.keys(realdata)
        });
      }
      let result = 0;
      const table = tableName(this.tableName);
      const length = Math.ceil(options.length / this.max);
      for (let i = 0; i < length; i++) {
        result += (await conn.updateRows<T>(
          table,
          options.slice(i * this.max, (i + 1) * this.max)
        )).affectedRows;
      }
      return result;
    }, transction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateLooseById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateBatchTemplateById(datas, transction, tableName, false);
  }
  /**
   * 安全的根据主键修改所有非空字段(null、undefined、空字符串)
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateByIdSafe(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn) => {
      const table = tableName(this.tableName);
      let result = 0;
      for (const data of datas) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
          where[idName] = data[idName];
        }
        const realdata = this.filterEmptyAndTransient<T>(data, true, dealEmptyString);
        result += (await conn.update<T>(table, realdata, {
          where,
          columns: Object.keys(realdata) as any
        })).affectedRows;
      }
      return result;
    }, transction);
  }
  /**
   * 安全的根据主键修改所有非空字段(null、undefined)
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateLooseByIdSafe(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateBatchTemplateByIdSafe(datas, transction, tableName, false);
  }
  /**
   *
   * 根据自定义条件修改
   * @param {T} data
   * @param {T} where
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatch(
    data: {[P in keyof T]?: T[P]},
    where: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn) => {
      const realData = this.filterEmptyAndTransient<T>(data);
      const result = await conn.updateUnSafe<T>(tableName(this.tableName), realData, {
        where: this.filterEmptyAndTransient<T>(where),
        columns: Object.keys(realData) as any
      });
      return result.affectedRows;
    }, transction);
  }

  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {T} where
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async deleteBatch(
    where: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn) => {
      if (this.stateFileName) {
        const data = {
          [this.stateFileName]: this.deleteState
        };
        const result = await conn.update<T>(tableName(this.tableName), data as any, {
          where: this.filterEmptyAndTransient<T>(where),
          columns: [this.stateFileName as any]
        });
        return result.affectedRows;
      } else {
        const result = await conn.delete(
          tableName(this.tableName),
          this.filterEmptyAndTransient<T>(where)
        );
        return result.affectedRows;
      }
    }, transction);
  }

  /**
   *
   * 根据复合主键删除
   * @param {T[]} datas
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async deleteByIdMuti(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      if (this.stateFileName) {
        data[this.stateFileName] = this.deleteState;
        await this.updateById(data, transction, tableName);
      } else {
        const realdata: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
          realdata[idName] = data[idName];
        }
        const result = await conn.delete(tableName(this.tableName), realdata);
        return result.affectedRows;
      }
    }, transction);
  }
  /**
   *
   * 根据主键删除
   * @param {*} id
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async deleteById(
    id: any,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use deleteByIdMuti'
    );
    this.app.throwIf(!id, 'id must be set for deleteById');
    return await this.transction(async (conn) => {
      if (this.stateFileName) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          where[idName] = id;
        }
        const realdata = {
          [this.stateFileName]: this.deleteState
        };
        const result = await conn.update<T>(tableName(this.tableName), realdata as any, {
          where,
          columns: [this.stateFileName as any]
        });
        return result.affectedRows;
      } else {
        const realdata: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          realdata[idName] = id;
        }
        const result = await conn.delete(tableName(this.tableName), realdata);
        return result.affectedRows;
      }
    }, transction);
  }
  /**
   *
   * 一次性删除多个主键
   * @param {any[]} ids
   * @param {*} [transction=true]
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName]
   * @returns {Promise<number[]>}
   */
  @MethodDebug()
  async deleteByIds(
    ids: any[],
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    const result = new Array<number>();
    for (const id of ids) {
      result.push(await this.deleteById(id, transction, tableName));
    }
    return result;
  }
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async unique<L>(
    id: any,
    error?: string,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use uniqueMuti'
    );
    const realdata: {[P in keyof L]?: L[P]} = {};
    realdata[this.idNames[0] as any] = id;
    let result;
    if (transction === undefined) {
      result = await this.app.mysql.get<L>(tableName(this.tableName), realdata);
    } else {
      await this.transction(async (conn) => {
        result = await conn.get<L>(tableName(this.tableName), realdata);
      }, transction);
    }
    this.app.throwIf(!result, error || `not found data! ${ this.tableName } > ${ id }`);
    return result;
  }
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async uniqueMe(
    id: any,
    error?: string,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.unique<T>(id, error, transction, tableName);
  }

  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async uniqueMuti<L>(
    data: {[P in keyof T]?: T[P]},
    error?: string,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    this.app.throwIf(this.idNames.length === 0, 'this table or not set id!');
    let result;
    if (transction === undefined) {
      result = await this.app.mysql.get<L>(
        tableName(this.tableName),
        this.filterEmptyAndTransient<L>(data)
      );
    } else {
      await this.transction(async (conn) => {
        result = await conn.get<L>(
          tableName(this.tableName),
          this.filterEmptyAndTransient<L>(data)
        );
      }, transction);
    }
    this.app.throwIf(!result, error || 'not found data!');
    return result;
  }

  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async uniqueMutiMe(
    data: {[P in keyof T]?: T[P]},
    error?: string,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.uniqueMuti<T>(data, error, transction, tableName);
  }
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async single<L>(
    id: any,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L | null> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use singleMuti'
    );
    const realdata: {[P in keyof L]?: L[P]} = {};
    realdata[this.idNames[0] as any] = id;
    if (transction === undefined) {
      return await this.app.mysql.get<L>(tableName(this.tableName), realdata);
    } else {
      return await this.transction(
        async (conn) => await conn.get<L>(tableName(this.tableName), realdata),
        transction
      );
    }
  }

  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async singleMe(
    id: any,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T | null> {
    return await this.single<T>(id, transction, tableName);
  }
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async singleMuti<L>(
    data: {[P in keyof L]?: L[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L | null> {
    this.app.throwIf(this.idNames.length === 0, 'this table or not set id!');
    if (transction === undefined) {
      return await this.app.mysql.get<L>(
        tableName(this.tableName),
        this.filterEmptyAndTransient<L>(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.get<L>(
            tableName(this.tableName),
            this.filterEmptyAndTransient<L>(data)
          ),
        transction
      );
    }
  }
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async singleMutiMe(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T | null> {
    return await this.singleMuti<T>(data, transction, tableName);
  }
  /**
   * 返回全部数据
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async all<L>(
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.select<L>(tableName(this.tableName));
    } else {
      return await this.transction(
        async (conn) => await conn.select<L>(tableName(this.tableName)),
        transction
      );
    }
  }
  /**
   * 返回全部数据
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allMe(
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.all<T>(transction, tableName);
  }
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allPage<L>(
    start: number,
    size: number,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.select<L>(tableName(this.tableName), {
        limit: size,
        offset: start
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select<L>(tableName(this.tableName), {
            limit: size,
            offset: start
          }),
        transction
      );
    }
  }
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allPageMe(
    start: number,
    size: number,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.allPage<T>(start, size, transction, tableName);
  }

  /**
   * 返回总条数
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allCount(
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (transction === undefined) {
      return await this.app.mysql.count<T>(tableName(this.tableName));
    } else {
      return await this.transction(
        async (conn) => await conn.count<T>(tableName(this.tableName)),
        transction
      );
    }
  }

  /**
   * 根据模版查询所有数据
   *
   * @param {T} data 模版，仅支持 = 操作符
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async template<L>(
    where: {[P in keyof L]?: L[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.select<L>(tableName(this.tableName), {
        where: this.filterEmptyAndTransient<L>(where)
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select<L>(tableName(this.tableName), {
            where: this.filterEmptyAndTransient<L>(where)
          }),
        transction
      );
    }
  }

  /**
   * 根据模版查询所有数据
   *
   * @param {T} data 模版，仅支持 = 操作符
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateMe(
    where: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.template<T>(where, transction, tableName);
  }

  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateOne<L>(
    data: {[P in keyof L]?: L[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    if (transction === undefined) {
      return await this.app.mysql.get<L>(
        tableName(this.tableName),
        this.filterEmptyAndTransient<L>(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.get<L>(
            tableName(this.tableName),
            this.filterEmptyAndTransient<L>(data)
          ),
        transction
      );
    }
  }

  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateOneMe(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.templateOne<T>(data, transction, tableName);
  }

  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templatePage<L>(
    data: {[P in keyof L]?: L[P]},
    start: number,
    size: number,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.select<L>(tableName(this.tableName), {
        where: this.filterEmptyAndTransient<L>(data),
        limit: size,
        offset: start
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select<L>(tableName(this.tableName), {
            where: this.filterEmptyAndTransient<L>(data),
            limit: size,
            offset: start
          }),
        transction
      );
    }
  }

  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templatePageMe(
    data: {[P in keyof T]?: T[P]},
    start: number,
    size: number,
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.templatePage<T>(data, start, size, transction, tableName);
  }

  /**
   *
   * 根据模版查询条数
   * @param {T} data，仅支持 = 操作符
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateCount(
    data: {[P in keyof T]?: T[P]},
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (transction === undefined) {
      return await this.app.mysql.count<T>(
        tableName(this.tableName),
        this.filterEmptyAndTransient<T>(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.count<T>(
            tableName(this.tableName),
            this.filterEmptyAndTransient<T>(data)
          ),
        transction
      );
    }
  }

  /**
   * 执行数据库操作
   *
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  @MethodDebug()
  async executeBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<number> {
    const sql = this.app._getSql(this.ctx, false, sqlid, param);
    return await this.transction(async (conn) => {
      const result = await conn.query(sql as string, param);
      return result.affectedRows;
    }, transction);
  }

  /**
   *
   * 执行数据库操作
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  @MethodDebug()
  async executeBySql(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const result = await conn.query(sql, param);
      return result.affectedRows;
    }, transction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  @MethodDebug()
  async queryMeBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<T[]> {
    return await this.queryMutiRowMutiColumnBySqlId<T>(sqlid, param, transction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  @MethodDebug()
  async queryBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[]> {
    return await this.queryMutiRowMutiColumnBySql<L>(sql, param, transction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  @MethodDebug()
  async queryBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[]> {
    return await this.queryMutiRowMutiColumnBySqlId<L>(sqlid, param, transction);
  }

  /**
   *
   * 执行数据库查询 ,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组,与sql语句的顺序对应
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  @MethodDebug()
  async queryMulitBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[][]> {
    if (transction === undefined) {
      return await this.app.mysql.query(sql, param);
    } else {
      return await this.transction((conn) => conn.query(sql, param), transction);
    }
  }

  /**
   *
   * 执行数据库查询,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组与sql语句的顺序对应
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  @MethodDebug()
  async queryMulitBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[][]> {
    const sql = this.app._getSql(this.ctx, false, sqlid, param);
    if (transction === undefined) {
      return await this.app.mysql.query(sql as string, param);
    } else {
      return await this.transction((conn) => conn.query(sql as string, param), transction);
    }
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  @MethodDebug()
  async queryMeBySql(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<T[]> {
    return await this.queryMutiRowMutiColumnBySql<T>(sql, param, transction);
  }
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async queryMutiRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[]> {
    const sql = this.app._getSql(this.ctx, false, sqlid, param);
    return await this.queryMutiRowMutiColumnBySql<L>(sql as string, param, transction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async queryMutiRowMutiColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.query(sql, param);
    } else {
      return await this.transction((conn) => conn.query(sql, param), transction);
    }
  }

  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  @MethodDebug()
  async querySingelRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySqlId<L>(sqlid, param, transction);
    if (data) {
      return data[0] || null;
    } else {
      return null;
    }
  }

  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async querySingelRowMutiColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySql<L>(sql, param, transction);
    return data && data.length > 0 ? null : data[0];
  }

  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  @MethodDebug()
  async queryMutiRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<M[]> {
    const data = await this.queryMutiRowMutiColumnBySqlId<{[name: string]: any}>(sqlid, param, transction);
    const result: M[] = [];
    data.forEach((item: {[name: string]: any}) => {
      const key: string = Object.keys(item)[0];
      result.push(item[key] as M);
    });
    return result;
  }

  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async queryMutiRowSingelColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<L[]> {
    const data = await this.queryMutiRowMutiColumnBySql<{[name: string]: any}>(sql, param, transction);
    const result: L[] = [];
    data.forEach((item: {[name: string]: any}) => {
      const key: string = Object.keys(item)[0];
      result.push(item[key] as L);
    });
    return result;
  }

  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  @MethodDebug()
  async querySingelRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    } = await this.queryMutiRowMutiColumnBySqlId(sqlid, param, transction);
    return data.length === 0
      ? null
      : (Object.values(data[data.length - 1])[0] as M);
  }

  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async querySingelRowSingelColumnBySql<M>(
    sql: string,
    param?: {[propName: string]: any},
    transction?: SqlSession
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    } = await this.queryMutiRowMutiColumnBySql(sql, param, transction);
    return data.length === 0 ? null : (Object.values(data[0])[0] as M);
  }

  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transction?: SqlSession): PageQuery<L> {
    return new PageQuery(
      async (
        param: Empty,
        pageSize: number,
        pageNumber: number,
        limitSelf: boolean,
        query: PageQuery<L>,
        orderBy?: string
      ) => {
        let sql = this.app._getSql(this.ctx, false, sqlid, {
          ...param,
          pageSize,
          pageNumber,
          limitSelf,
          orderBy
        });
        if (limitSelf === false) {
          sql = `SELECT _a.* FROM (${ sql }) _a `;
          if (orderBy) {
            sql = `${ sql } ORDER BY ${ orderBy }`;
          }
          if (pageSize > 0) {
            sql = `${ sql } LIMIT ${ calc(pageNumber)
              .sub(1)
              .mul(pageSize)
              .over() }, ${ pageSize }`;
          }
          if (pageSize > 0) {
            const sqlPage = this.app._getSql(this.ctx, true, sqlid, param);
            const totalRow = await this.querySingelRowSingelColumnBySql<number>(
              sqlPage as string,
              param,
              transction
            );
            query.totalRow = totalRow || 0;
            query.totalPage = calc(query.totalRow)
              .add(pageSize - 1)
              .div(pageSize)
              .round(0, 2)
              .over();
          }
        } else {
          Object.assign(param, {
            limitStart: calc(pageNumber)
              .sub(1)
              .mul(pageSize)
              .over(),
            limitEnd: calc(pageSize).over(),
            orderBy
          });
          sql = this.app._getSql(this.ctx, false, sqlid, param);
          if (pageSize > 0) {
            const sqlPage = this.app._getSql(this.ctx, true, sqlid, param);
            const totalRow = await this.querySingelRowSingelColumnBySql<number>(
              sqlPage as string,
              param,
              transction
            );
            query.totalRow = totalRow || 0;
            query.totalPage = calc(query.totalRow)
              .add(pageSize - 1)
              .div(pageSize)
              .round(0, 2)
              .over();
          }
        }
        query.list = await this.queryMutiRowMutiColumnBySql<L>(sql as string, param, transction);
      }
    );
  }
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transction?: SqlSession): PageQuery<T> {
    return this.pageQuery<T>(sqlid, transction);
  }

  /**
   * 创建复杂查询、修改、删除对象
   * 例如: lambdaQuery()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQuery<L>(
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQuery<L> {
    return new LambdaQuery(
      tableName(this.tableName),
      async (sql: string, params: Empty) => await this.queryMutiRowMutiColumnBySql<L>(sql, params, transction),
      async (sql: string, params: Empty) => (await this.querySingelRowSingelColumnBySql<number>(sql, params, transction)) || 0,
      async (sql: string, params: Empty) => await this.executeBySql(sql, params, transction)
    );
  }
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQueryMe(
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQuery<T> {
    return this.lambdaQuery<T>(transction, tableName);
  }

  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: string[] 例如 orders: [['id', 'desc'], ['name', 'asc']]
   *   }} x
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<L[]>}
   */
  @MethodDebug()
  async customQuery<L>(
    x: {
      where?: {[P in keyof L]?: L[P]};
      columns?: (keyof L)[];
      startRow?: number;
      pageSize?: number;
      orders?: [keyof L, 'asc' | 'desc'][];
    },
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transction === undefined) {
      return await this.app.mysql.select<L>(tableName(this.tableName), {
        where: x.where,
        columns: x.columns,
        offset: x.startRow,
        limit: x.pageSize,
        orders: x.orders || []
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select<L>(tableName(this.tableName), {
            where: x.where,
            columns: x.columns,
            offset: x.startRow,
            limit: x.pageSize,
            orders: x.orders || []
          }),
        transction
      );
    }
  }

  /**
   * 简单自定义查询
   * @param {{
   *       where?: {
   *         [key: string]: any
   *       }
   *     columns?: string[]
   *     startRow?: number
   *     pageSize?: number
   *     orders?: string[] 例如 orders: [['id', 'desc'], ['name', 'asc']]
   *   }} x
   * @param {*} [transction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<T[]>}
   */
  @MethodDebug()
  async customQueryMe(
    x: {
      where?: {[P in keyof T]?: T[P]};
      columns?: (keyof T)[];
      startRow?: number;
      pageSize?: number;
      orders?: [keyof T, 'asc' | 'desc'][];
    },
    transction?: SqlSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.customQuery<T>(x, transction, tableName);
  }

  /**
   *
   * 事务执行方法
   * @param {(conn: any) => void} fn 方法主体
   * @param {*} [transction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  protected async transction(
    fn: (conn: SqlSession) => Promise<any>,
    transction?: SqlSession
  ): Promise<any> {
    if (transction === undefined) {
      return await this.app.mysql.beginTransactionScope(
        conn => fn(conn),
        this.ctx
      );
    } else {
      return await fn(transction);
    }
  }

  /**
   *
   * 过滤掉空属性
   * @private
   * @param {*} source
   * @returns {T}
   */
  private filterEmptyAndTransient<L>(source: any, skipEmpty = true, dealEmptyString = true): {[P in keyof L]?: L[P]} {
    const result: {[P in keyof L]?: L[P]} = {};
    this.keys.forEach((key) => {
      if (skipEmpty === true) {
        if (notEmptyString(source[key], dealEmptyString)) {
          result[key as any] = source[key];
        }
      } else {
        result[key as any] = source[key];
      }
    });
    return result;
  }

  /**
   *
   * 过滤掉空属性
   * @private
   * @param {*} source
   * @returns {T}
   */
  private filterEmptyAndTransients<L>(source: any[], skipEmpty = true, dealEmptyString = true): {[P in keyof L]?: L[P]}[] {
    const result = new Array<{[P in keyof L]?: L[P]}>();
    source.forEach((item) => {
      result.push(this.filterEmptyAndTransient<L>(item, skipEmpty, dealEmptyString));
    });
    return result;
  }
}
