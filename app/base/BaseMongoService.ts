import PageQuery from '../util/sql/PageQuery';
import {calc} from '../util/math';
import LambdaQueryMongo from '../util/sql/LambdaQueryMongo';
import {Service} from 'egg';
import {notEmptyString} from '../util/string';
// import * as vm from 'vm';
// import {StatusError} from '../util/shell';
import {Filter} from 'mongodb';
import {MongoSession, MongoFilter} from '../../typings';
const debug = require('debug')('egg-bag:mongo');
const MethodDebug = function <T>() {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = async function (this: BaseMongoService<T>) {
      // eslint-disable-next-line prefer-rest-params
      const args = Array.from(arguments);
      try {
        const result = await fn.call(this, ...args);
        debug(`${ propertyKey }:${ this['tableName'] }`);
        return result;
      } catch (error) {
        this.app.logger.error(`service ${ propertyKey } have an error, it's argumens: ${ args.join('#') }`);
        throw error;
      }
    };
  };
};

export default abstract class BaseMongoService<T> extends Service {
  private tableName: string;
  private stateFileName: string;
  private deleteState: string;
  private db: string;
  private idName = '_id';
  private keys: (keyof T)[];

  /**
   * 插入
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insert(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async session => {
      const id = await this.getDb().collection(tableName(this.tableName)).insertOne(this.filterEmptyAndTransient(data, false), {
        session
      });
      return id.insertedId;
    }, transction);
  }
  /**
   * 如果指定列名不存在数据库中，则插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async session => {
      const query: {[P in keyof T]?: T[P]} = {};
      columns.forEach((column) => {
        if (notEmptyString(data[column])) {
          query[column] = data[column];
        }
      });
      const exist = await this.getDb().collection(tableName(this.tableName)).countDocuments(query, {
        session
      });
      if (exist === 0) {
        return this.insert(this.filterEmptyAndTransient(data, false), session, tableName);
      } else {
        return 0;
      }
    }, transction);
  }
  /**
   * 插入或修改所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replace(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async session => {
      const query = {
        _id: data[this.idName]
      };
      const exist = await this.getDb().collection(tableName(this.tableName)).countDocuments(query, {
        session
      });
      if (exist > 0) {
        return this.updateById(this.filterEmptyAndTransient(data, false), session, tableName);
      } else {
        return this.insert(this.filterEmptyAndTransient(data, false), session, tableName);
      }
    }, transction);
  }
  /**
   *
   * 只插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplate(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return this.insert(this.filterEmptyAndTransient(data, true, dealEmptyString), transction, tableName);
  }
  /**
   *
   * 只插入非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
  ): Promise<number> {
    return this.insertTemplate(data, transction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplateIfNotExists(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return this.insertIfNotExists(this.filterEmptyAndTransient(data, true, dealEmptyString), columns, transction, tableName);
  }
  /**
   * 如果指定列名不存在数据库中，则插入非空列(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertTemplateIfNotExistsLoose(
    data: {[P in keyof T]?: T[P]},
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return this.insertTemplateIfNotExists(data, columns, transction, tableName, false);
  }
  /**
   * 只插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceTemplate(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return this.replace(this.filterEmptyAndTransient(data, true, dealEmptyString), transction, tableName);
  }
  /**
   * 只插入或修改非空字段(undefined、null)
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceTemplateLoose(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return this.replaceTemplate(data, transction, tableName, false);
  }
  /**
   * 批量插入所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatch(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
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
    return await this.transction(async session => {
      const result = await this.getDb().collection(tableName(this.tableName)).insertMany(this.filterEmptyAndTransients(datas, false), {
        session
      });
      return result.insertedCount;
    }, transction);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.insertIfNotExists(this.filterEmptyAndTransient(data, false), columns, session, tableName);
      }
      return result;
    }, transction);
  }
  /**
   * 批量插入或修改所有列
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatch(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.replace(this.filterEmptyAndTransient(data, false), session, tableName);
      }
      return result;
    }, transction);
  }
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplate(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    return await this.transction(async session => {
      return this.insertBatch(this.filterEmptyAndTransients(datas, true, dealEmptyString), session, tableName);
    }, transction);
  }
  /**
   *
   * 批量插入非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplateLoose(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.insertBatchTemplate(datas, transction, tableName, false);
  }
  /**
   * 如果指定列名不存在数据库中，则批量插入所有非空列
   * 返回成功插入行数
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async insertBatchTemplateIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.insertTemplateIfNotExists(data, columns, session, tableName, dealEmptyString);
      }
      return result;
    }, transction);
  }
  /**
    * 如果指定列名不存在数据库中，则批量插入所有非空列
    * 返回成功插入行数
    * @param {{[P in keyof T]?: T[P]}} data
    * @param {*} [transction] 独立事务
    * @param {(serviceTableName: string) => string} [tableName=(
    *       serviceTableName: string
    *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
    * @returns
    */
  @MethodDebug()
  async insertBatchTemplateLooseIfNotExists(
    datas: {[P in keyof T]?: T[P]}[],
    columns: (keyof T)[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
  ): Promise<number> {
    return await this.insertBatchTemplateIfNotExists(datas, columns, transction, tableName, false);
  }
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplate(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.replaceTemplate(data, session, tableName, dealEmptyString);
      }
      return result;
    }, transction);
  }
  /**
   * 快速批量插入或修改非空字段(undefined、null、空字符串)
   * 返回成功插入行数
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async replaceBatchTemplateLoose(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.replaceBatchTemplate(datas, transction, tableName, false);
  }
  /**
   * 根据主键修改全部字段
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateById(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async session => {
      const filter = {
        _id: data[this.idName]
      };
      const result = await this.getDb().collection(tableName(this.tableName)).updateOne(filter, {$set: this.filterEmptyAndTransient(data, false)}, {
        session
      });
      return result.modifiedCount;
    }, transction);
  }
  /**
   * 根据主键删除字段
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async unSetById(
    id: any,
    columns: Array<keyof T>,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      const projection: {[key in keyof T]?: 0 | 1} = {};
      for (const key of columns) {
        projection[key] = 1;
      }
      const result = await this.getDb().collection(tableName(this.tableName)).updateOne({
        _id: id
      }, {$unset: projection}, {
        session
      });
      return result.modifiedCount;
    }, transction);
  }
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateTemplateById(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    this.app.throwIf(!data[this.idName], `_id must be set!${ this.tableName }`);
    return await this.transction(async session => {
      const filter = {
        _id: data[this.idName]
      };
      const result = await this.getDb().collection(tableName(this.tableName)).updateOne(filter, {$set: this.filterEmptyAndTransient(data, true, dealEmptyString)}, {
        session
      });
      return result.modifiedCount;
    }, transction);
  }
  /**
   * 根据主键修改非空字段(undefined、null、空字符串)
   *
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateTemplateLooseById(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return this.updateTemplateById(data, transction, tableName, false);
  }
  /**
   *
   * 根据主键批量修改全部字段
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.updateById(data, session, tableName);
      }
      return result;
    }, transction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName,
    dealEmptyString = true
  ): Promise<number> {
    if (datas.length === 0) {
      return 0;
    }
    return await this.transction(async session => {
      let result = 0;
      for (const data of datas) {
        result += await this.updateTemplateById(data, session, tableName, dealEmptyString);
      }
      return result;
    }, transction);
  }
  /**
   * 根据主键修改所有非空字段(null、undefined、空字符串)
   * 注意：此方法操作的列是所有记录的串集，若某条记录中不存在字段，则会重置为null
   * 若想安全的修改，请使用updateBatchTemplateByIdSafe(较慢，但每条都会完整保存)
   * @param {Array<{[P in keyof T]?: T[P]}>} datas
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatchTemplateLooseById(
    datas: {[P in keyof T]?: T[P]}[],
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.updateBatchTemplateById(datas, transction, tableName, false);
  }
  /**
   *
   * 根据自定义条件修改
   * @param {{[P in keyof T]?: T[P]}} data
   * @param {{[P in keyof T]?: T[P]}} where
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async updateBatch(
    data: {[P in keyof T]?: T[P]},
    where: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      const realData = this.filterEmptyAndTransient(data);
      const result = await this.getDb().collection(tableName(this.tableName)).updateMany(where, {$set: realData}, {
        session
      });
      return result.modifiedCount;
    }, transction);
  }
  @MethodDebug()
  async unsetBatch(
    columns: Array<keyof T>,
    where: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      const projection: {[key in keyof T]?: 0 | 1} = {};
      for (const key of columns) {
        projection[key] = 1;
      }
      const result = await this.getDb().collection(tableName(this.tableName)).updateMany(where, {$unset: projection}, {
        session
      });
      return result.modifiedCount;
    }, transction);
  }
  /**
   *
   * 自定义条件删除,如果service开启注解：logicDelete,那么将逻辑删除
   * @param {{[P in keyof T]?: T[P]}} where
   * @param {*} [transction] 独立事务
   * @param {boolean} [fixTransient=true] 是否过滤一遍transient标记的字段?
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async deleteBatch(
    where: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      if (this.stateFileName) {
        const data = {
          [this.stateFileName]: this.deleteState
        };
        const result = await this.getDb().collection(tableName(this.tableName)).updateMany(where, {$set: data}, {
          session
        });
        return result.modifiedCount;
      } else {
        const result = await this.getDb().collection(tableName(this.tableName)).deleteMany(where, {
          session
        });
        return result.deletedCount;
      }
    }, transction);
  }

  /**
   *
   * 根据主键删除
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async deleteById(
    id: any,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    const filter = {
      _id: id
    };
    return await this.transction(async session => {
      if (this.stateFileName) {
        const data = {
          [this.stateFileName]: this.deleteState
        };
        const result = await this.getDb().collection(tableName(this.tableName)).updateOne(filter, {$set: data}, {
          session
        });
        return result.modifiedCount;
      } else {
        const result = await this.getDb().collection(tableName(this.tableName)).deleteOne(filter, {
          session
        });
        return result.deletedCount;
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
    transction?: MongoSession,
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
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async unique<L>(
    id: any,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    const result = await this.single<L>(id, transction, tableName);
    if (!result) {
      this.app.throwNow(`not found data! ${ this.tableName } > ${ id }`);
    }
    return result;
  }
  /**
   * 根据主键查询，若查询不到结果，抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async uniqueMe(
    id: any,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.unique<T>(id, transction, tableName);
  }
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async single<L>(
    id: any,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L | null> {
    const filter = {
      _id: id
    };
    return await this.transction(async session => {
      return await this.getDb().collection(tableName(this.tableName)).findOne<T>(filter, {
        session
      });
    }, transction);
  }
  /**
   *
   * 根据主键查询，若查询不到结果，不抛出异常
   * @param {*} id
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async singleMe(
    id: any,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T | null> {
    return await this.single<T>(id, transction, tableName);
  }
  /**
   * 返回全部数据
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async all<L>(
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async session => {
      const cursor = this.getDb().collection(tableName(this.tableName)).find<L>({}, {
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
  }
  /**
   * 返回全部数据
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allMe(
    transction?: MongoSession,
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
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allPage<L>(
    start: number,
    size: number,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async session => {
      const cursor = this.getDb().collection(tableName(this.tableName)).find<L>({}, {
        limit: size,
        skip: start,
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
  }
  /**
   *
   * 分页方式返回全部数据
   * @param {number} start 起始记录
   * @param {number} size 返回条数
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allPageMe(
    start: number,
    size: number,
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.allPage<T>(start, size, transction, tableName);
  }

  /**
   * 返回总条数
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async allCount(
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments({}, {
        session
      });
    }, transction);
  }
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async template<L>(
    where: {[P in keyof L]?: L[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async session => {
      const cursor = this.getDb().collection(tableName(this.tableName)).find<L>(this.filterEmptyAndTransient(where), {
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
  }
  /**
   * 根据模版查询所有数据
   *
   * @param {{[P in keyof T]?: T[P]}} data 模版，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateMe(
    where: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.template<T>(where, transction, tableName);
  }
  /**
   * 根据模版查询所有一条数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateOne<L>(
    data: {[P in keyof L]?: L[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L> {
    return await this.transction(async session => {
      return await this.getDb().collection(tableName(this.tableName)).findOne(this.filterEmptyAndTransient(data), {
        session
      });
    }, transction);
  }
  /**
   * 根据模版查询所有一条数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateOneMe(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T> {
    return await this.templateOne<T>(data, transction, tableName);
  }
  /**
   *
   * 根据模版分页查询数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction] 独立事务
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
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async session => {
      const cursor = this.getDb().collection(tableName(this.tableName)).find<L>(this.filterEmptyAndTransient(data), {
        limit: size,
        skip: start,
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
  }
  /**
   *
   * 根据模版分页查询数据
   * @param {{[P in keyof T]?: T[P]}} data ，仅支持 = 操作符
   * @param {number} start
   * @param {number} size
   * @param {*} [transction] 独立事务
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
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.templatePage<T>(data, start, size, transction, tableName);
  }

  /**
   *
   * 根据模版查询条数
   * @param {{[P in keyof T]?: T[P]}} data，仅支持 = 操作符
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns
   */
  @MethodDebug()
  async templateCount(
    data: {[P in keyof T]?: T[P]},
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<number> {
    return await this.transction(async session => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments(this.filterEmptyAndTransient(data), {
        session
      });
    }, transction);
  }

  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQuery<L>(
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQueryMongo<L> {
    return new LambdaQueryMongo(
      async (lambda: LambdaQueryMongo<L>, columns: (keyof L)[]) => {
        const projection: {[key in keyof L]?: 0 | 1} = {};
        for (const key of columns) {
          projection[key] = 1;
        }
        return await this.transction(async session => {
          const cursor = this.getDb().collection(tableName(this.tableName)).find<L>(lambda.query, {
            limit: lambda.pageSize,
            skip: lambda.startRow,
            session,
            projection
          });
          const result = await cursor.toArray();
          cursor.close();
          return result;
        }, transction);
      },
      async (lambda: LambdaQueryMongo<L>) => {
        return await this.transction(async session => {
          return await this.getDb().collection(tableName(this.tableName)).countDocuments(lambda.query, {
            session
          });
        }, transction);
      },
      async (lambda: LambdaQueryMongo<L>, data: {[P in keyof L]?: L[P]}, keys: string[]) => {
        const realData = this.filterEmptyAndTransient(data, true, true, keys);
        return await this.transction(async session => {
          const result = await this.getDb().collection(tableName(this.tableName)).updateMany(lambda.query, {$set: realData}, {
            session
          });
          return result.modifiedCount;
        }, transction);
      },
      async (lambda: LambdaQueryMongo<L>) => {
        return await this.transction(async session => {
          if (this.stateFileName) {
            const data = {
              [this.stateFileName]: this.deleteState
            };
            const result = await this.getDb().collection(tableName(this.tableName)).updateMany(lambda.query, {$set: data}, {
              session
            });
            return result.modifiedCount;
          } else {
            const result = await this.getDb().collection(tableName(this.tableName)).deleteMany(lambda.query, {
              session
            });
            return result.deletedCount;
          }
        }, transction);
      },
      async (lambda: LambdaQueryMongo<L>, keys: string[]) => {
        return await this.transction(async session => {
          const projection: {[k: string]: 1} = {};
          for (const key of keys) {
            projection[key] = 1;
          }
          const result = await this.getDb().collection(tableName(this.tableName)).updateMany(lambda.query, {$unset: projection}, {
            session
          });
          return result.modifiedCount;
        }, transction);
      }
    );
  }
  /**
   * 创建复杂查询对象
   * 例如: lambdaQueryMe()
   *       .andEq(CpResource.resourcecode, 'xxx')
   *       .select(CpResource.resourcename)
   *
   * @param {*} [transction] 独立事务
   * @param {(serviceTableName: string) => string} [tableName=(
   *       serviceTableName: string
   *     ) => serviceTableName] 表名构造方法，该方法可以修改默认的表名,适用于一个实体类根据业务分表后的场景
   * @returns {LambdaQueryMongo<L>}
   */
  lambdaQueryMe(
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): LambdaQueryMongo<T> {
    return this.lambdaQuery(transction, tableName);
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
   * @param {*} [transction] 独立事务
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
      orders?: {[P in keyof L]: 1 | -1};
    },
    transction?: MongoSession,
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
    return await this.transction(async session => {
      const cursor = this.getDb().collection(tableName(this.tableName)).find<L>(x.where || {}, {
        limit: x.pageSize,
        skip: x.startRow,
        sort: x.orders,
        projection,
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
  }
  @MethodDebug()
  async customQueryCount<L>(
    x: {
      where?: {[P in keyof L]?: L[P]};
    },
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<L[]> {
    return await this.transction(async session => {
      return await this.getDb().collection(tableName(this.tableName)).countDocuments(x.where || {}, {
        session
      });
    }, transction);
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
   * @param {*} [transction] 独立事务
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
      orders?: {[P in keyof T]: 1 | -1};
    },
    transction?: MongoSession,
    tableName: (serviceTableName: string) => string = (
      serviceTableName: string
    ) => serviceTableName
  ): Promise<T[]> {
    return await this.customQuery<T>(x, transction, tableName);
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
   * @param {*} [transction] 独立事务
   * @returns 指定类型数组
   */
  @MethodDebug()
  async queryBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
  ): Promise<L[]> {
    return await this.queryMutiRowMutiColumnBySqlId<L>(sqlid, param, transction);
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
   * @param {*} [transction] 独立事务
   * @returns 本service对象数组
   */
  @MethodDebug()
  async queryMeBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
  ): Promise<T[]> {
    return await this.queryMutiRowMutiColumnBySqlId<T>(sqlid, param, transction);
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
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async countBySqlId(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
  ): Promise<number> {
    const item = this.app._getSql<T>(this.ctx, false, false, sqlid, param) as MongoFilter<T>;
    return await this.countBySql<T>(item, transction);
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
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async queryMutiRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
  ): Promise<L[]> {
    const item = this.app._getSql<L>(this.ctx, false, false, sqlid, param) as MongoFilter<L>;
    return await this.queryMutiRowMutiColumnBySql(item, transction);
  }
  /**
   *
   * 根据条件返回条数
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async countBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | Filter<L>};
      tableName?: string;
    },
    transction?: MongoSession
  ): Promise<number> {
    const table = item.tableName || this.tableName;
    this.app.throwIf(!table, 'not set tableName!!');
    return await this.transction(async session => {
      return await this.getDb().collection(table).count(item.query, {
        session
      });
    }, transction);
  }
  /**
   *
   * 执行数据库查询 多列多行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {*} [transction] 独立事务
   * @returns 列名 =key的json数组
   */
  @MethodDebug()
  async queryMutiRowMutiColumnBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | Filter<L>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof L]: 1 | -1};
        projection?: {[P in keyof L]: 1};
      };
      tableName?: string;
    },
    transction?: MongoSession
  ): Promise<L[]> {
    const table = item.tableName || this.tableName;
    this.app.throwIf(!table, 'not set tableName!!');
    if (!item.query) {
      item.query = {};
    }
    if (!item.options) {
      item.options = {};
    }
    return await this.transction(async session => {
      const cursor = this.getDb().collection(table).find<L>(item.query, {
        ...item.options,
        session
      });
      const result = await cursor.toArray();
      cursor.close();
      return result;
    }, transction);
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
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async querySingelRowMutiColumnBySqlId<L>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
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
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async querySingelRowMutiColumnBySql<L>(
    item: {
      query: {[P in keyof L]?: L[P] | Filter<L>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof L]: 1 | -1};
        projection?: {[P in keyof L]: 1};
      };
      tableName?: string;
    },
    transction?: MongoSession
  ): Promise<L | null> {
    const data = await this.queryMutiRowMutiColumnBySql<L>(item, transction);
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
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async queryMutiRowSingelColumnBySql<M>(
    item: {
      query: {[P in keyof T]?: T[P] | Filter<T>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof T]: 1 | -1};
        projection?: {[P in keyof T]: 1};
      };
      tableName?: string;
    },
    transction?: MongoSession
  ): Promise<M[]> {
    const data = await this.queryMutiRowMutiColumnBySql(item, transction);
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
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async queryMutiRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
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
   * 执行数据库查询 单列单行
   * @param {{[propName: string]: any}} item 查询对象,格式：https://docs.mongodb.com/manual/reference/operator/query/
   * @param {{ [propName: string]: any }} [param]
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async querySingelRowSingelColumnBySql<M>(
    item: {
      query: {[P in keyof T]?: T[P] | Filter<T>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof T]: 1 | -1};
        projection?: {[P in keyof T]: 1};
      };
      tableName?: string;
    },
    transction?: MongoSession
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    }[] = await this.queryMutiRowMutiColumnBySql(item, transction);
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
   * @param {*} [transction] 独立事务
   * @returns
   */
  @MethodDebug()
  async querySingelRowSingelColumnBySqlId<M>(
    sqlid: string,
    param?: {[propName: string]: any},
    transction?: MongoSession
  ): Promise<M | null> {
    const data: {
      [name: string]: any;
    }[] = await this.queryMutiRowMutiColumnBySqlId(sqlid, param, transction);
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
   * @param {*} [transction] 独立事务
   * @returns {PageQuery}
   */
  pageQuery<L>(sqlid: string, transction?: MongoSession): PageQuery<L> {
    return new PageQuery(
      async (
        param: {[key: string]: any},
        pageSize: number,
        pageNumber: number,
        limitSelf: boolean,
        countSelf: boolean,
        sumSelf: boolean,
        query: PageQuery<L>,
        _orderBy?: string,
        orderMongo?: {[P in keyof L]: 1 | -1}
      ) => {
        if (sumSelf === true) {
          const itemSum = this.app._getSql<L>(this.ctx, false, true, sqlid, {
            ...param,
            pageSize,
            pageNumber,
            limitSelf,
            orderMongo
          }) as MongoFilter<L>;
          query.sum = await this.querySingelRowMutiColumnBySql<L>(itemSum, transction);
        }
        if (limitSelf === false) {
          if (pageSize > 0) {
            const pageItem = countSelf ? this.app._getSql<L>(this.ctx, true, false, sqlid, param) as MongoFilter<L> : this.app._getSql<L>(this.ctx, true, false, `${ sqlid }_count`, param) as MongoFilter<L>;
            const totalRow = await this.countBySql(
              pageItem,
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
            limit: calc(pageNumber)
              .sub(1)
              .mul(pageSize)
              .over(),
            skip: pageSize
          });
        }
        const item = this.app._getSql<L>(this.ctx, false, false, sqlid, {
          ...param,
          pageSize,
          pageNumber,
          limitSelf,
          orderMongo
        }) as MongoFilter<L>;
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
        query.list = await this.queryMutiRowMutiColumnBySql<L>(item, transction);
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
   * @param {*} [transction] 独立事务
   * @returns {PageQuery}
   */
  pageQueryMe(sqlid: string, transction?: MongoSession): PageQuery<T> {
    return this.pageQuery<T>(sqlid, transction);
  }

  /**
    *
    * 事务执行方法
    * @param {() => Promise<any>} fn 方法主体
    * @param {*} [transction] 独立事务
    * @returns
    */
  protected async transction(
    fn: (transction?: MongoSession) => Promise<any>,
    transction?: MongoSession
  ): Promise<any> {
    if (transction === undefined && this.app.config.mongo && this.app.config.mongo.replica === true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const session = this.app.mongo.startSession(this.app.config.mongo.sessionOptions);
      try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      }
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
  private filterEmptyAndTransient(source: any, skipEmpty = true, dealEmptyString = true, keys?: string[]): {[P in keyof T]?: T[P]} {
    const result: {[P in keyof T]?: T[P]} = {};
    const deal = (key: keyof T) => {
      if (skipEmpty === true) {
        if (notEmptyString(source[key], dealEmptyString)) {
          result[key] = source[key];
        }
      } else {
        result[key] = source[key];
      }
    };
    if (keys) {
      [...this.keys, ...keys as any].forEach(deal);
    } else {
      this.keys.forEach(deal);
    }
    return result;
  }

  /**
   *
   * 过滤掉空属性
   * @private
   * @param {*} source
   * @returns {T}
   */
  private filterEmptyAndTransients(source: any[], skipEmpty = true, dealEmptyString = true): {[P in keyof T]?: T[P]}[] {
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

  // private getSqlItem<L>(sql: string, params: {[key: string]: any} = {}) {
  //   const sandbox: {
  //     db: {
  //       query: {[P in keyof L]?: L[P] | Filter<L>};
  //       options: {
  //         limit?: number;
  //         skip?: number;
  //         sort?: {[P in keyof L]: 1 | -1};
  //         projection?: {[P in keyof L]: 1};
  //       };
  //       tableName: string;
  //     };
  //     $regex: (s: string) => RegExp;
  //     [key: string]: any;
  //   } = {
  //     db: {
  //       query: {},
  //       options: {},
  //       tableName: this.tableName
  //     },
  //     $regex: (s: string) => (new RegExp(s)),
  //     $: params
  //   };
  //   vm.createContext(sandbox);
  //   try {
  //     vm.runInContext(sql, sandbox);
  //   } catch (error) {
  //     throw new StatusError(`render error ${ sql } => ${ error }`);
  //   }
  //   this.app.throwIf(!sandbox.db.tableName, `not set tableName ${ sql }`);
  //   return sandbox.db;
  // }
}
