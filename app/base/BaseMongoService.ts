import PageQuery from '../util/sql/PageQuery';
import {calc} from '../util/math';
import {LambdaQueryMongo, SQLSource} from '../util/sql';
import {Service} from 'egg';
import {notEmptyString} from '../util/string';
import * as vm from 'vm';
import {StatusError} from '../util/shell';
import {FilterQuery} from 'mongodb';

export default abstract class <T> extends Service {
  private tableName: string;
  private stateFileName: string;
  private deleteState: string;
  private db: string;
  private idName = '_id';
  private keys: Array<keyof T>;
  /**
 * Whether causal consistency should be enabled on this session
 * @type {boolean} default true
 */
  private causalConsistency: boolean = true;
  private readConcern: {
    level: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
  } = {level: 'local'};
  private writeConcern: {
    /**
     * requests acknowledgement that the write operation has
     * propagated to a specified number of mongod hosts
     * @type {(number | 'majority' | string)} default 1
     */
    w?: number | 'majority' | string;
    /**
     * requests acknowledgement from MongoDB that the write operation has
     * been written to the journal
     * @type {boolean} default false
     */
    j?: boolean;
    /**
     * a time limit, in milliseconds, for the write concern
     * @type {number}
     * @memberof WriteConcern
     */
    wtimeout?: number;
  } = {};
  /**
   * 主从读取设置
   * @private
   * @type {('primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest')}
   */
  private readPreference: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest' = 'primary';

  /**
   * 插入
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async (conn: any) => {
      const id = await this.getDb().collection(tableName(this.tableName)).insertOne(data, {
        session: conn
      });
      return id.insertedCount;
    }, transaction);
  }
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async (conn: any) => {
      const query: {[P in keyof T]?: T[P]} = {};
      columns.forEach((column) => {
        if (notEmptyString(data[column])) {
          query[column] = data[column];
        }
      });
      const exist = await this.getDb().collection(tableName(this.tableName)).countDocuments(query, {
        session: conn
      });
      if (exist === 0) {
        return this.insert(data, conn, tableName);
      } else {
        return 0;
      }
    }, transaction);
  }
  /**
   * 插入或修改所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async (conn: any) => {
      const query = {
        _id: data[this.idName]
      };
      const exist = await this.getDb().collection(tableName(this.tableName)).countDocuments(query, {
        session: conn
      });
      if (exist > 0) {
        return this.updateById(data, conn, tableName);
      } else {
        return this.insert(data, conn, tableName);
      }
    }, transaction);
  }
  /**
   *
   * 只插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.insert(this.filterEmptyAndTransient(data, true, dealEmptyString), transaction, tableName);
  }
  /**
   *
   * 只插入非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    ) => serviceTableName,
  ): Promise<number> {
    return this.insertTemplate(data, transaction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.insertIfNotExists(this.filterEmptyAndTransient(data, true, dealEmptyString), columns, transaction, tableName);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transaction=true] 是否开启独立事务，默认true(开启);否则传入事务连接
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  async insertTemplateIfNotExistsLoose(
    data: {[P in keyof T]?: T[P]},
    columns: Array<keyof T>,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return this.insertTemplateIfNotExists(data, columns, transaction, tableName, false);
  }
  /**
   * 只插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.replace(this.filterEmptyAndTransient(data, true, dealEmptyString), transaction, tableName);
  }
  /**
   * 只插入或修改非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.replaceTemplate(data, transaction, tableName, false);
  }
  /**
   * 批量插入所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    for (const data of datas) {
      this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    }
    return await this.transction(async (conn: any) => {
      const result = await this.getDb().collection(tableName(this.tableName)).insertMany(datas, {
        session: conn
      });
      return result.insertedCount;
    }, transaction);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.insertIfNotExists(data, columns, conn, tableName);
      }
      return result;
    }, transaction);
  }
  /**
   * 批量插入或修改所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.replace(data, conn, tableName);
      }
      return result;
    }, transaction);
  }
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    return await this.transction(async (conn: any) => {
      return this.insertBatch(this.filterEmptyAndTransients(datas, true, dealEmptyString), conn, tableName);
    }, transaction);
  }
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    return await this.insertBatchTemplate(datas, transaction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
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
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.insertTemplateIfNotExists(data, columns, conn, tableName, dealEmptyString);
      }
      return result;
    }, transaction);
  }
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列
    * 返回成功插入行数
    * @param {{[P in keyof T]?: T[P]}} data
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
    ) => serviceTableName,
  ): Promise<number> {
    return await this.insertBatchTemplateIfNotExists(datas, columns, transaction, tableName, false);
  }
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.replaceTemplate(data, conn, tableName, dealEmptyString);
      }
      return result;
    }, transaction);
  }
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
  ): Promise<number> {
    return await this.replaceBatchTemplate(datas, transaction, tableName, false);
  }
  /**
   * 根据主键修改全部字段
   * @param {{[P in keyof T]?: T[P]}} data
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
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async (conn: any) => {
      const filter = {
        _id: data[this.idName]
      };
      const result = await this.getDb().collection(tableName(this.tableName)).updateOne(filter, data, {
        session: conn
      });
      return result.modifiedCount;
    }, transaction);
  }
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.updateById(this.filterEmptyAndTransient(data, true, dealEmptyString), transaction, tableName);
  }
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
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
    return this.updateTemplateById(data, transaction, tableName, false);
  }
  /**
   *
   * 根据主键批量修改全部字段
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.updateById(data, conn, tableName);
      }
      return result;
    }, transaction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
    return await this.transction(async (conn: any) => {
      let result = 0;
      for (const data of datas) {
        result += await this.updateById(this.filterEmptyAndTransient(data, true, dealEmptyString), conn, tableName);
      }
      return result;
    }, transaction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
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
   *
   * 根据自定义条件修改
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {{[P in keyof T]?: T[P]}} where
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
      const result = await this.getDb().collection(tableName(this.tableName)).updateMany(where, realData, {
        session: conn
      });
      return result.modifiedCount;
    }, transaction);
  }

  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {{[P in keyof T]?: T[P]}} where
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
        const result = await this.getDb().collection(tableName(this.tableName)).updateMany(where, data, {
          session: conn
        });
        return result.modifiedCount;
      } else {
        const result = await this.getDb().collection(tableName(this.tableName)).deleteMany(where, {
          session: conn
        });
        return result.deletedCount;
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
    const filter = {
      _id: id
    };
    return await this.transction(async (conn: any) => {
      if (this.stateFileName) {
        const data = {
          [this.stateFileName]: this.deleteState
        };
        const result = await this.getDb().collection(tableName(this.tableName)).updateOne(filter, data, {
          session: conn
        });
        return result.modifiedCount;
      } else {
        const result = await this.getDb().collection(tableName(this.tableName)).deleteOne(filter, {
          session: conn
        });
        return result.deletedCount;
      }
    }, transaction);
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
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    let result;
    result = await this.single<L>(id, transaction, tableName);
    if (!result) {
      this.app.throwNow(`not found data! ${ this.tableName } > ${ id }`);
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
  async uniqueMe(
    id: any,
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.unique<T>(id, transaction, tableName);
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
    const filter = {
      _id: id
    };
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(tableName(this.tableName)).findOne<T>(filter, {
        session: conn
      });
    }, transaction);
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
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>({}, {
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
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
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>({}, {
        limit: size,
        skip: start,
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
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
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments({}, {
        session: conn
      });
    }, transaction);
  }
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
   * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
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
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>(this.filterEmptyAndTransient(where), {
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
  }
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
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
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
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
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(tableName(this.tableName)).findOne(this.filterEmptyAndTransient(data), {
        session: conn
      });
    }, transaction);
  }
  /**
   * 根据模版查询所有一条数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
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
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
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
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>(this.filterEmptyAndTransient(data), {
        limit: size,
        skip: start,
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
  }
  /**
   *
   * 根据模版分页查询数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
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
   * @param {{[P in keyof T]?: T[P]}} data，仅支持 = 操作符
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
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments(this.filterEmptyAndTransient(data), {
        session: conn
      });
    }, transaction);
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
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQuery<L>(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQueryMongo<L> {
    return new LambdaQueryMongo(
      async (lambda: LambdaQueryMongo<L>, columns: Array<keyof L>) => {
        const projection: {[key in keyof L]?: 0 | 1} = {};
        for (const key of columns) {
          projection[key] = 1;
        }
        return await this.transction(async (conn: any) => {
          const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>(lambda.query, {
            limit: lambda.pageSize,
            skip: lambda.startRow,
            session: conn,
            projection
          });
          const result = await cursor.toArray();
          cursor.close();
          cursor.destroy();
          return result;
        }, transaction);
      },
      async (lambda: LambdaQueryMongo<L>) => {
        return await this.transction(async (conn: any) => {
          return await this.getDb().collection(tableName(this.tableName)).countDocuments(lambda.query, {
            session: conn
          });
        }, transaction);
      },
      async (lambda: LambdaQueryMongo<L>, data: {[P in keyof L]?: L[P]}) => {
        const realData = this.filterEmptyAndTransient(data);
        return await this.transction(async (conn: any) => {
          const result = await this.getDb().collection(tableName(this.tableName)).updateMany(lambda.query, realData, {
            session: conn
          });
          return result.modifiedCount;
        }, transaction);
      },
      async (lambda: LambdaQueryMongo<L>) => {
        return await this.transction(async (conn: any) => {
          if (this.stateFileName) {
            const data = {
              [this.stateFileName]: this.deleteState
            };
            const result = await this.getDb().collection(tableName(this.tableName)).updateMany(lambda.query, data, {
              session: conn
            });
            return result.modifiedCount;
          } else {
            const result = await this.getDb().collection(tableName(this.tableName)).deleteMany(lambda.query, {
              session: conn
            });
            return result.deletedCount;
          }
        }, transaction);
      }
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
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQueryMe(
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQueryMongo<T> {
    return this.lambdaQuery(transaction, tableName);
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
   *     orders?: string[]
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
      orders?: {[P in keyof L]: 1 | -1};
    },
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    const projection: {[P in keyof L]?: 0 | 1} = {};
    if (x.columns) {
      for (const key of x.columns) {
        projection[key] = 1;
      }
    }
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(tableName(this.tableName)).find<L>(x.where || {}, {
        limit: x.pageSize,
        skip: x.startRow,
        sort: x.orders,
        projection,
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
  }
  async customQueryCount<L>(
    x: {
      where?: {[P in keyof L]?: L[P]}
    },
    transaction: any = true,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments(x.where || {}, {
        session: conn
      });
    }, transaction);
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
   *     orders?: {[key: string]: number}
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
      orders?: {[P in keyof T]: 1 | -1};
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
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
   * 执行数据库查询 条数
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async countBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transaction: any = true
  ): Promise<number> {
    const source: SQLSource = this.app.getSql(sqlid);
    const item = this.getSqlItem<T>(source.template, param);
    return await this.countBySql<T>(item, transaction);
  }
  /**
   *
   * 执行数据库查询 多列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
    const item = this.getSqlItem<L>(source.template, param);
    return await this.queryMutiRowMutiColumnBySql(item, transaction);
  }
  /**
   *
   * 根据条件返回条数
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async countBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | FilterQuery<L>};
      tableName?: string
    },
    transaction: any = true
  ): Promise<number> {
    const table = item.tableName || this.tableName;
    this.app.throwIf(!table, 'not set tableName!!');
    return await this.transction(async (conn: any) => {
      return await this.getDb().collection(table).count(item.query, {
        session: conn
      });
    }, transaction);
  }
  /**
   *
   * 执行数据库查询 多列多行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns 列名 =key的json数组
   */
  async queryMutiRowMutiColumnBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | FilterQuery<L>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof L]: 1 | -1};
        projection?: {[P in keyof L]: 1}
      },
      tableName?: string
    },
    transaction: any = true
  ): Promise<L[]> {
    const table = item.tableName || this.tableName;
    this.app.throwIf(!table, 'not set tableName!!');
    if (!item.query) {
      item.query = {};
    }
    if (!item.options) {
      item.options = {};
    }
    return await this.transction(async (conn: any) => {
      const cursor = await this.getDb().collection(table).find<L>(item.query, {
        ...item.options,
        session: conn
      });
      const result = await cursor.toArray();
      cursor.close();
      cursor.destroy();
      return result;
    }, transaction);
  }
  /**
   *
   * 执行数据库查询 多列单行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async querySingelRowMutiColumnBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | FilterQuery<L>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof L]: 1 | -1};
        projection?: {[P in keyof L]: 1}
      },
      tableName?: string
    },
    transaction: any = true
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySql<L>(item, transaction);
    if (data) {
      return data[0] || null;
    } else {
      return null;
    }
  }
  /**
   *
   * 执行数据库查询 单列多行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async queryMutiRowSingelColumnBySql<M>(
    item: {
      query: {[P in keyof T]?: T[P] | FilterQuery<T>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof T]: 1 | -1};
        projection?: {[P in keyof T]: 1}
      },
      tableName?: string
    },
    transaction: any = true
  ): Promise<M[]> {
    const data = await this.queryMutiRowMutiColumnBySql(item, transaction);
    const result: M[] = [];
    data.forEach((oo: {[name: string]: any}) => {
      const key: string = Object.keys(oo)[0];
      result.push(oo[key] as M);
    });
    return result;
  }
  /**
   *
   * 执行数据库查询 单列多行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
   * 执行数据库查询 单列单行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns
   */
  async querySingelRowSingelColumnBySql<M>(
    item: {
      query: {[P in keyof T]?: T[P] | FilterQuery<T>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof T]: 1 | -1};
        projection?: {[P in keyof T]: 1}
      },
      tableName?: string
    },
    transaction: any = true
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    } = await this.queryMutiRowMutiColumnBySql(item, transaction);
    return data.length === 0
      ? null
      : (Object.values(data[data.length - 1])[0] as M);
  }
  /**
   *
   * 执行数据库查询 单列单行
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
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
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transaction: any = true): PageQuery<L> {
    const source: SQLSource = this.app.getSql(sqlid);
    return new PageQuery(
      async (
        param: {[key: string]: any},
        pageSize: number,
        pageNumber: number,
        limitSelf: boolean,
        query: PageQuery<L>,
        _orderBy?: string,
        orderMongo?: {[P in keyof L]: 1 | -1}
      ) => {
        if (limitSelf === false) {
          if (pageSize > 0) {
            const pageItem = this.getSqlItem<L>(source.template, param);
            const totalRow = await this.countBySql(
              pageItem,
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
            limit: calc(pageNumber)
              .sub(1)
              .mul(pageSize)
              .over(),
            skip: pageSize
          });
        }
        const item = this.getSqlItem<L>(source.template, param);
        if (orderMongo) {
          if (!item.options.sort) {
            item.options.sort = orderMongo;
          } else {
            Object.assign(item.options.sort, orderMongo);
          }
        }
        if (pageSize > 0 && limitSelf === false) {
          if (!item.options) {
            item.options = {};
          }
          item.options.limit = +pageSize;
          item.options.skip = calc(pageNumber).sub(1).mul(pageSize).over();
        }
        query.list = await this.queryMutiRowMutiColumnBySql<L>(item, transaction);
      }
    );
  }
  /**
   *
   * 创建分页查询语句
   * @param {string} sqlid sql语句编码,sql语句实际是一个json对象
   * {
        query: https://docs.mongodb.com/manual/reference/operator/query/,
        options:{
          limit?: number;
          skip?: number;
          sort?: {[P in keyof T]: 1 | -1};
          projection?: {[P in keyof T]: 1}
        },
        tableName?: string
   * }
   * @param {*} [transaction=true] 开始独立事务查询?默认true，可设置为某个事务连接，用于查询脏数据
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transaction: any = true): PageQuery<T> {
    return this.pageQuery<T>(sqlid, transaction);
  }

  /**
    *
    * 事务执行方法
    * @param {() => Promise<any>} fn 方法主体
    * @param {*} [transaction=true] 是否开启独立事务，默认true;否则传入事务连接
    * @returns
    */
  protected async transction(
    fn: (transaction: any) => Promise<any>,
    transaction: any = true
  ): Promise<any> {
    if (transaction === true && this.app.config.mongo && this.app.config.mongo.replica === true) {
      const session = this.app.mongo.startSession({
        causalConsistency: this.causalConsistency,
        defaultTransactionOptions: {
          readConcern: this.readConcern,
          writeConcern: this.writeConcern,
          readPreference: this.readPreference
        }
      });
      try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      }
    } else if (transaction === true) {
      return await fn(undefined);
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

  /**
   *
   * 获取表对象
   * @private
   * @returns
   */
  private getDb() {
    return this.app.mongo.db(this.db);
  }

  private getSqlItem<L>(sql: string, params: {[key: string]: any} = {}) {
    const sandbox: {
      db: {
        query: {[P in keyof L]?: L[P] | FilterQuery<L>};
        options: {
          limit?: number;
          skip?: number;
          sort?: {[P in keyof L]: 1 | -1};
          projection?: {[P in keyof L]: 1}
        },
        tableName: string
      };
      $regex: (s: string) => RegExp;
      [key: string]: any;
    } = {
      db: {
        query: {},
        options: {},
        tableName: this.tableName
      },
      $regex: (s: string) => (new RegExp(s)),
      $: params
    };
    vm.createContext(sandbox);
    try {
      vm.runInContext(sql, sandbox);
    } catch (error) {
      throw new StatusError(`render error ${ sql } => ${ error }`);
    }
    this.app.throwIf(!sandbox.db.tableName, `not set tableName ${ sql }`);
    return sandbox.db;
  }
}
