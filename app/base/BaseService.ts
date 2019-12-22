import {Service} from 'egg';
import * as Mustache from 'mustache';
import {calc} from '../util/math';
import {Build, LambdaQuery, PageQuery, SQLSource} from '../util/sql';
import {Empty} from '../util/empty';
import {notEmptyString} from '../util/string';
export default abstract class <T> extends Service {
  private max = 500;
  private tableName: string;
  private idNames: Array<keyof T>;
  private keys: Array<keyof T>;
  private stateFileName: string;
  private deleteState: string;

  /**
   * 插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insert(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const result = await conn.insert(tableName(this.tableName), data, {
        columns: this.keys
      });

      return result.insertId;
    }, transaction);
  }
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const where: {[P in keyof T]?: T[P]} = {};
      columns.forEach((column) => {
        if (notEmptyString(data[column])) {
          where[column] = data[column];
        }
      });
      const result = await conn.insertIF(
        tableName(this.tableName),
        [{row: data, where}],
        this.keys
      );

      return result.insertId;
    }, transaction);
  }
  /**
   * 插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replace(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    for (const idName of this.idNames) {
      this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
    }
    return await this.transction(async (conn: any) => {
      const result = await conn.replace(tableName(this.tableName), data, {
        columns: this.keys,
        ids: this.idNames
      });

      return result.insertId;
    }, transaction);
  }
  /**
   *
   * 只插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertTemplate(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const result = await conn.insert(
        tableName(this.tableName),
        this.filterEmptyAndTransient(data, true, dealEmptyString),
        {
          columns: this.keys
        }
      );
      return result.insertId;
    }, transaction);
  }
  /**
   *
   * 只插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.insertTemplate(data, transaction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertTemplateIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const where: {[P in keyof T]?: T[P]} = {};
      const row = this.filterEmptyAndTransient(data, true, dealEmptyString);
      columns.forEach((column) => {
        if (notEmptyString(row[column])) {
          where[column] = row[column];
        }
      });
      const result = await conn.insertIF(
        tableName(this.tableName),
        [{row, where}],
        Object.keys(row)
      );

      return result.insertId;
    }, transaction);
  }
  /**
 * 如果指定列名不存在数据库中，则插入非空列(排除undefined、null)
 * 返回自增主键或者0
 * @param {T} data
 * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
 * @param {(serviceTableName: string) => string} [tableName=(
 *       serviceTableName: string
 *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
 * @returns
 */
  async insertTemplateLooseIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.insertTemplateIfNotExists(data, columns, transaction, tableName, false);
  }
  /**
   * 只插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceTemplate(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    for (const idName of this.idNames) {
      this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
    }
    return await this.transction(async (conn: any) => {
      const realData = this.filterEmptyAndTransient(data, true, dealEmptyString);
      const result = await conn.replace(tableName(this.tableName), realData, {
        ids: this.idNames
      });
      return result.insertId;
    }, transaction);
  }
  /**
   * 只插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.replaceTemplate(data, transaction, tableName, false);
  }
  /**
   * 批量插入所有列,返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertBatch(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insert(table, datas.slice(i * this.max, (i + 1) * this.max), {
          columns: this.keys
        });
        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertBatchIfNotExists(
    datas: Array<{[P in keyof T]?: T[P]}>,
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
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
        const ret = await conn.insertIF(
          table,
          options.slice(i * this.max, (i + 1) * this.max),
          this.keys
        );
        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
   * 批量插入或修改所有列
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceBatch(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.replace(
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
    }, transaction);
  }
  /**
   *
   * 批量插入非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertBatchTemplate(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.insert(
          table,
          this.filterEmptyAndTransients(datas.slice(i * this.max, (i + 1) * this.max), true, dealEmptyString),
          {
            columns: this.keys
          }
        );
        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
   *
   * 批量插入非空字段(排除undefined、null)
   * 返回自增主键或者0
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertBatchTemplateLoose(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.insertBatchTemplate(datas, transaction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null、空字符串)
   * 返回自增主键或者0
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertBatchTemplateIfNotExists(
    datas: Array<{[P in keyof T]?: T[P]}>,
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const options = new Array<any>();
      datas.forEach((item) => {
        const where: {[P in keyof T]?: T[P]} = {};
        const realData = this.filterEmptyAndTransient(item, true, dealEmptyString);
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
        const ret = await conn.insertIF(
          table,
          options.slice(i * this.max, (i + 1) * this.max),
          this.keys
        );

        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列(排除undefined、null)
    * 返回自增主键或者0
    * @param {T} data
    * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
    * @param {(serviceTableName: string) => string} [tableName=(
    *       serviceTableName: string
    *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
    * @returns
    */
  async insertBatchTemplateLooseIfNotExists(
    datas: Array<{[P in keyof T]?: T[P]}>,
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.insertBatchTemplateIfNotExists(datas, columns, transaction, tableName, false);
  }
  /**
   * 快速批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceBatchTemplate(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const result = new Array<number>();
      const table = tableName(this.tableName);
      const length = Math.ceil(datas.length / this.max);
      for (let i = 0; i < length; i++) {
        const ret = await conn.replace(
          table,
          this.filterEmptyAndTransients(datas.slice(i * this.max, (i + 1) * this.max), true, dealEmptyString),
          {
            ids: this.idNames
          }
        );

        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
   * 快速批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 注意：此方法认为所有记录的字段都和第一条一致,比第一条多的字段不会保存，比第一条少的字段将变为null
   * 若想安全的修改，请使用replaceBatchTemplateSafe(较慢，但每条都会完整保存)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceBatchTemplateLoose(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    return await this.replaceBatchTemplate(datas, transaction, tableName, false);
  }
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null、空字符串)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceBatchTemplateSafe(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.transction(async (conn: any) => {
      const table = tableName(this.tableName);
      const result = new Array<number>();
      for (const data of datas) {
        const ret = await conn.replace(table, [this.filterEmptyAndTransient(data, true, dealEmptyString)], {
          ids: this.idNames
        });

        result.push(ret.insertId);
      }
      return result;
    }, transaction);
  }
  /**
   * 安全的批量插入或修改非空字段(排除undefined、null)
   * 返回自增主键或者修改行数(当修改时，会删除旧记录并重新插入)
   * 此方法是数据库级别的函数，先删除再插入
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async replaceBatchTemplateLooseSafe(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    if (datas.length === 0) {
      return [];
    }
    return await this.replaceBatchTemplateSafe(datas, transaction, tableName, false);
  }
  /**
   * 根据主键修改全部字段
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateById(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const where: {[P in keyof T]?: T[P]} = {};
      for (const idName of this.idNames) {
        this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
        where[idName] = data[idName];
      }
      const result = await conn.update(tableName(this.tableName), data, {
        where,
        columns: this.keys
      });
      return result.affectedRows;
    }, transaction);
  }
  /**
   * 根据主键修改非空字段(排除undefined、null、空字符串)
   *
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateTemplateById(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const where: {[P in keyof T]?: T[P]} = {};
      for (const idName of this.idNames) {
        this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
        where[idName] = data[idName];
      }
      const realdata = this.filterEmptyAndTransient(data, true, dealEmptyString);
      const result = await conn.update(tableName(this.tableName), realdata, {
        where,
        columns: Object.keys(realdata)
      });
      return result.affectedRows;
    }, transaction);
  }
  /**
   * 根据主键修改非空字段(排除undefined、null)
   *
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateTemplateLooseById(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateTemplateById(data, transaction, tableName, false);
  }
  /**
   *
   * 根据主键批量修改全部字段
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatchById(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
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
    return await this.transction(async (conn: any) => {
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
        result += (await conn.updateRows(
          table,
          options.slice(i * this.max, (i + 1) * this.max)
        )).affectedRows;
      }
      return result;
    }, transaction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatchTemplateById(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
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
    return await this.transction(async (conn: any) => {
      for (const data of datas) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(
            !data[idName],
            `${ idName } must be set!(${ JSON.stringify(data) })`
          );
          where[idName] = data[idName];
        }
        const realdata = this.filterEmptyAndTransient(data, true, dealEmptyString);
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
        result += (await conn.updateRows(
          table,
          options.slice(i * this.max, (i + 1) * this.max)
        )).affectedRows;
      }
      return result;
    }, transaction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatchTemplateLooseById(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateBatchTemplateById(datas, transaction, tableName, false);
  }
  /**
   * 安全的根据主键修改所有非空字段(null、undefined、空字符串)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatchTemplateByIdSafe(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn: any) => {
      const table = tableName(this.tableName);
      let result = 0;
      for (const data of datas) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
          where[idName] = data[idName];
        }
        const realdata = this.filterEmptyAndTransient(data, true, dealEmptyString);
        result += (await conn.update(table, realdata, {
          where,
          columns: Object.keys(realdata)
        })).affectedRows;
      }
      return result;
    }, transaction);
  }
  /**
   * 安全的根据主键修改所有非空字段(null、undefined)
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatchTemplateLooseByIdSafe(
    datas: Array<{[P in keyof T]?: T[P]}>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateBatchTemplateByIdSafe(datas, transaction, tableName, false);
  }
  /**
   *
   * 根据自定义条件修改
   * @param {T} data
   * @param {T} where
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async updateBatch(
    data: {[P in keyof T]?: T[P]},
    where: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const realData = this.filterEmptyAndTransient(data);
      const result = await conn.updateUnSafe(tableName(this.tableName), realData, {
        where: this.filterEmptyAndTransient(where),
        columns: Object.keys(realData)
      });
      return result.affectedRows;
    }, transaction);
  }

  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {T} where
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async deleteBatch(
    where: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      if (this.stateFileName) {
        const data = {
          [this.stateFileName]: this.deleteState
        };
        const result = await conn.update(tableName(this.tableName), data, {
          where: this.filterEmptyAndTransient(where),
          columns: [this.stateFileName]
        });
        return result.affectedRows;
      } else {
        const result = await conn.delete(
          tableName(this.tableName),
          this.filterEmptyAndTransient(where)
        );
        return result.affectedRows;
      }
    }, transaction);
  }

  /**
   *
   * 根据复合主键删除
   * @param {T[]} datas
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async deleteByIdMuti(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      if (this.stateFileName) {
        data[this.stateFileName] = this.deleteState;
        await this.updateById(data, transaction, tableName);
      } else {
        const realdata: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          this.app.throwIf(!data[idName], `id must be set!${ this.tableName }`);
          realdata[idName] = data[idName];
        }
        const result = await conn.delete(tableName(this.tableName), realdata);
        return result.affectedRows;
      }
    }, transaction);
  }
  /**
   *
   * 根据主键删除
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async deleteById(
    id: any,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use deleteByIdMuti'
    );
    this.app.throwIf(!id, 'id must be set for deleteById');
    return await this.transction(async (conn: any) => {
      if (this.stateFileName) {
        const where: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          where[idName] = id;
        }
        const realdata = {
          [this.stateFileName]: this.deleteState
        };
        const result = await conn.update(tableName(this.tableName), realdata, {
          where,
          columns: [this.stateFileName]
        });
        return result.affectedRows;
      } else {
        const realdata: {[P in keyof T]?: T[P]} = {};
        for (const idName of this.idNames) {
          realdata[idName] = id;
        }
        const result = conn.delete(tableName(this.tableName), realdata);
        return result.affectedRows;
      }
    }, transaction);
  }
  /**
   *
   * 一次性删除多个主键
   * @param {any[]} ids
   * @param {*} [transaction=true]
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName]
   * @returns {Promise<number[]>}
   */
  async deleteByIds(
    ids: any[],
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number[]> {
    const result = new Array<number>();
    for (const id of ids) {
      result.push(await this.deleteById(id, transaction, tableName));
    }
    return result;
  }
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async unique<L>(
    id: any,
    error?: string,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use uniqueMuti'
    );
    const realdata: {[P in keyof T]?: T[P]} = {};
    realdata[this.idNames[0]] = id;
    let result;
    if (transaction === true) {
      result = await this.app.mysql.get(tableName(this.tableName), realdata);
    } else {
      await this.transction(async (conn) => {
        result = await conn.get(tableName(this.tableName), realdata);
      });
    }
    this.app.throwIf(!result, error || `not found data! ${ this.tableName } > ${ id }`);
    return result;
  }
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async uniqueMe(
    id: any,
    error?: string,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.unique<T>(id, error, transaction, tableName);
  }

  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async uniqueMuti<L>(
    data: {[P in keyof T]?: T[P]},
    error?: string,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    this.app.throwIf(this.idNames.length === 0, 'this table or not set id!');
    let result;
    if (transaction === true) {
      result = await this.app.mysql.get(
        tableName(this.tableName),
        this.filterEmptyAndTransient(data)
      );
    } else {
      await this.transction(async (conn) => {
        result = await conn.get(
          tableName(this.tableName),
          this.filterEmptyAndTransient(data)
        );
      });
    }
    this.app.throwIf(!result, error || 'not found data!');
    return result;
  }

  /**
   * 根据复合主键查询，若查询不到结果，抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async uniqueMutiMe(
    data: {[P in keyof T]?: T[P]},
    error?: string,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.uniqueMuti<T>(data, error, transaction, tableName);
  }
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async single<L>(
    id: any,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L | null> {
    this.app.throwIfNot(
      this.idNames.length === 1,
      'this table is muti id(or not set id), please use singleMuti'
    );
    const realdata: {[P in keyof T]?: T[P]} = {};
    realdata[this.idNames[0]] = id;
    if (transaction === true) {
      return await this.app.mysql.get(tableName(this.tableName), realdata);
    } else {
      return await this.transction(
        async (conn) => await conn.get(tableName(this.tableName), realdata)
      );
    }
  }

  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async singleMe(
    id: any,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T | null> {
    return await this.single<T>(id, transaction, tableName);
  }
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async singleMuti<L>(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L | null> {
    this.app.throwIf(this.idNames.length === 0, 'this table or not set id!');
    if (transaction === true) {
      return await this.app.mysql.get(
        tableName(this.tableName),
        this.filterEmptyAndTransient(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.get(
            tableName(this.tableName),
            this.filterEmptyAndTransient(data)
          )
      );
    }
  }
  /**
   * 根据复合主键查询，若查询不到结果，不抛出异常
   * @param {T} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async singleMutiMe(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T | null> {
    return await this.singleMuti<T>(data, transaction, tableName);
  }
  /**
   * 返回全部数据
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async all<L>(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.select(tableName(this.tableName));
    } else {
      return await this.transction(
        async (conn) => await conn.select(tableName(this.tableName))
      );
    }
  }
  /**
   * 返回全部数据
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async allMe(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.all<T>(transaction, tableName);
  }
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async allPage<L>(
    start: number,
    size: number,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.select(tableName(this.tableName), {
        limit: size,
        offset: start
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select(tableName(this.tableName), {
            limit: size,
            offset: start
          })
      );
    }
  }
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async allPageMe(
    start: number,
    size: number,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.allPage<T>(start, size, transaction, tableName);
  }

  /**
   * 返回总条数
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async allCount(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (transaction === true) {
      return await this.app.mysql.count(tableName(this.tableName));
    } else {
      return await this.transction(
        async (conn) => await conn.count(tableName(this.tableName))
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
  async template<L>(
    where: {[P in keyof L]?: L[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.select(tableName(this.tableName), {
        where: this.filterEmptyAndTransient(where)
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select(tableName(this.tableName), {
            where: this.filterEmptyAndTransient(where)
          })
      );
    }
  }

  /**
   * 根据模版查询所有数据
   *
   * @param {T} data 模版，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templateMe(
    where: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.template<T>(where, transaction, tableName);
  }

  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templateOne<L>(
    data: {[P in keyof L]?: L[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    if (transaction === true) {
      return await this.app.mysql.get(
        tableName(this.tableName),
        this.filterEmptyAndTransient(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.get(
            tableName(this.tableName),
            this.filterEmptyAndTransient(data)
          )
      );
    }
  }

  /**
   * 根据模版查询所有一条数据
   * @param {T} data ，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templateOneMe(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.templateOne<T>(data, transaction, tableName);
  }

  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templatePage<L>(
    data: {[P in keyof L]?: L[P]},
    start: number,
    size: number,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.select(tableName(this.tableName), {
        where: this.filterEmptyAndTransient(data),
        limit: size,
        offset: start
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select(tableName(this.tableName), {
            where: this.filterEmptyAndTransient(data),
            limit: size,
            offset: start
          })
      );
    }
  }

  /**
   *
   * 根据模版分页查询数据
   * @param {T} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templatePageMe(
    data: {[P in keyof T]?: T[P]},
    start: number,
    size: number,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.templatePage<T>(data, start, size, transaction, tableName);
  }

  /**
   *
   * 根据模版查询条数
   * @param {T} data，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async templateCount(
    data: {[P in keyof T]?: T[P]},
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (transaction === true) {
      return await this.app.mysql.count(
        tableName(this.tableName),
        this.filterEmptyAndTransient(data)
      );
    } else {
      return await this.transction(
        async (conn) =>
          await conn.count(
            tableName(this.tableName),
            this.filterEmptyAndTransient(data)
          )
      );
    }
  }

  /**
   * 执行数据库操作
   *
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  async executeBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<number> {
    const source: SQLSource = this.app.getSql(sqlid);
    const buildParam = new Build(false, param);
    const sql = Mustache.render(source.template, buildParam, this.app.getSqlFn());
    return await this.transction(async (conn: any) => {
      const result = await conn.query(sql, param);
      return result.affectedRows;
    }, transaction);
  }

  /**
   *
   * 执行数据库操作
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  async executeBySql(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      const result = await conn.query(sql, param);
      return result.affectedRows;
    }, transaction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  async queryMeBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<T[]> {
    return await this.queryMutiRowMutiColumnBySqlId<T>(sqlid, param, transaction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  async queryBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[]> {
    return await this.queryMutiRowMutiColumnBySql<L>(sql, param, transaction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  async queryBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[]> {
    return await this.queryMutiRowMutiColumnBySqlId<L>(sqlid, param, transaction);
  }

  /**
   *
   * 执行数据库查询 ,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组,与sql语句的顺序对应
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  async queryMulitBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[][]> {
    if (transaction === true) {
      return await this.app.mysql.query(sql, param);
    } else {
      return await this.transction(async (conn) => conn.query(sql, param));
    }
  }

  /**
   *
   * 执行数据库查询,sql语句可包含多条查询语句,一次性返回所有结果,结果是一个数据集数组与sql语句的顺序对应
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 指定类型数组
   */
  async queryMulitBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[][]> {
    const source: SQLSource = this.app.getSql(sqlid);
    const buildParam = new Build(false, param);
    const sql = Mustache.render(source.template, buildParam, this.app.getSqlFn());
    if (transaction === true) {
      return await this.app.mysql.query(sql, param);
    } else {
      return await this.transction(async (conn) => conn.query(sql, param));
    }
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 本service对象数组
   */
  async queryMeBySql(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<T[]> {
    return await this.queryMutiRowMutiColumnBySql<T>(sql, param, transaction);
  }
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async queryMutiRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[]> {
    const source: SQLSource = this.app.getSql(sqlid);
    const buildParam = new Build(false, param);
    const sql = Mustache.render(source.template, buildParam, this.app.getSqlFn());
    return await this.queryMutiRowMutiColumnBySql<L>(sql, param, transaction);
  }

  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async queryMutiRowMutiColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.query(sql, param);
    } else {
      return await this.transction(async (conn) => conn.query(sql, param));
    }
  }

  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async querySingelRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySqlId<L>(sqlid, param, transaction);
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
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async querySingelRowMutiColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySql<L>(sql, param, transaction);
    return data && data.length > 0 ? null : data[0];
  }

  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sqlid sql语句编码
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async queryMutiRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<M[]> {
    const data = await this.queryMutiRowMutiColumnBySqlId<{[name: string]: any}>(sqlid, param, transaction);
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
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async queryMutiRowSingelColumnBySql<L>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<L[]> {
    const data = await this.queryMutiRowMutiColumnBySql<{[name: string]: any}>(sql, param, transaction);
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
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async querySingelRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    } = await this.queryMutiRowMutiColumnBySqlId(sqlid, param, transaction);
    return data.length === 0
      ? null
      : (Object.values(data[data.length - 1])[0] as M);
  }

  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sql sql语句
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async querySingelRowSingelColumnBySql<M>(
    sql: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    } = await this.queryMutiRowMutiColumnBySql(sql, param, transaction);
    return data.length === 0 ? null : (Object.values(data[0])[0] as M);
  }

  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transaction: any = true): PageQuery<L> {
    const source: SQLSource = this.app.getSql(sqlid);
    return new PageQuery(
      async (
        param: Empty,
        pageSize: number,
        pageNumber: number,
        limitSelf: boolean,
        query: PageQuery<L>,
        orderBy?: string,
        _orderMongo?: {[P in keyof L]?: 1 | -1}
      ) => {
        let buildParam;
        let sql;
        if (limitSelf === false) {
          buildParam = new Build(false, param);
          sql = `SELECT _a.* FROM (${ Mustache.render(
            source.template,
            buildParam,
            this.app.getSqlFn()
          ) }) _a `;
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
            const buildParamPage = new Build(true, param);
            const sqlPage = Mustache.render(source.template, buildParamPage, this.app.getSqlFn());
            const totalRow = await this.querySingelRowSingelColumnBySql<number>(
              sqlPage,
              param,
              transaction
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
          buildParam = new Build(false, param);
          sql = Mustache.render(source.template, buildParam, this.app.getSqlFn());
          if (pageSize > 0) {
            const buildParamPage = new Build(true, param);
            const sqlPage = Mustache.render(source.template, buildParamPage, this.app.getSqlFn());
            const totalRow = await this.querySingelRowSingelColumnBySql<number>(
              sqlPage,
              param,
              transaction
            );
            query.totalRow = totalRow || 0;
            query.totalPage = calc(query.totalRow)
              .add(pageSize - 1)
              .div(pageSize)
              .round(0, 2)
              .over();
          }
        }
        query.list = await this.queryMutiRowMutiColumnBySql<L>(sql, param, transaction);
      }
    );
  }
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transaction: any = true): PageQuery<T> {
    return this.pageQuery<T>(sqlid, transaction);
  }

  /**
   * 创建复杂查询、修改、删除对象
   * 例如: lambdaQuery()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQuery<L>(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQuery<L> {
    return new LambdaQuery(
      tableName(this.tableName),
      async (sql: string, params: Empty) => await this.queryMutiRowMutiColumnBySql<L>(sql, params, transaction),
      async (sql: string, params: Empty) => (await this.querySingelRowSingelColumnBySql<number>(sql, params, transaction)) || 0,
      async (sql: string, params: Empty) => await this.executeBySql(sql, params, transaction)
    );
  }
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQuery<L>}
   */
  lambdaQueryMe(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQuery<T> {
    return this.lambdaQuery<T>(transaction, tableName);
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
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<L[]>}
   */
  async customQuery<L>(
    x: {
      where?: {[P in keyof L]?: L[P]};
      columns?: Array<keyof L>;
      startRow?: number;
      pageSize?: number;
      orders?: Array<[keyof L, 'asc' | 'desc']>;
    },
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    if (transaction === true) {
      return await this.app.mysql.select(tableName(this.tableName), {
        where: x.where,
        columns: x.columns,
        offset: x.startRow,
        limit: x.pageSize,
        orders: x.orders || []
      });
    } else {
      return await this.transction(
        async (conn) =>
          await conn.select(tableName(this.tableName), {
            where: x.where,
            columns: x.columns,
            offset: x.startRow,
            limit: x.pageSize,
            orders: x.orders || []
          })
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
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {Promise<T[]>}
   */
  async customQueryMe(
    x: {
      where?: {[P in keyof T]?: T[P]};
      columns?: Array<keyof T>;
      startRow?: number;
      pageSize?: number;
      orders?: Array<[keyof T, 'asc' | 'desc']>;
    },
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.customQuery<T>(x, transaction, tableName);
  }

  /**
   *
   * 事务执行方法
   * @param {(conn: any) => void} fn 方法主体
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
   * @returns
   */
  public async transction(
    fn: (conn: any) => Promise<any>,
    transaction: any = true
  ): Promise<any> {
    if (transaction === true) {
      return await this.app.mysql.beginTransactionScope(
        (conn: any) => fn(conn),
        this.ctx
      );
    } else {
      return await fn(transaction);
    }
  }

  /**
   *
   * 过滤掉空属性
   * @private
   * @param {*} source
   * @returns {T}
   */
  private filterEmptyAndTransient(source: any, skipEmpty = true, dealEmptyString = true): {[P in keyof T]?: T[P]} {
    const result: {[P in keyof T]?: T[P]} = {};
    this.keys.forEach((key) => {
      if (skipEmpty === true) {
        if (notEmptyString(source[key], dealEmptyString)) {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
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
  private filterEmptyAndTransients(source: any[], skipEmpty = true, dealEmptyString = true): Array<{[P in keyof T]?: T[P]}> {
    const result = new Array<{[P in keyof T]?: T[P]}>();
    source.forEach((item) => {
      result.push(this.filterEmptyAndTransient(item, skipEmpty, dealEmptyString));
    });
    return result;
  }
}
