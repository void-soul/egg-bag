import 'reflect-metadata';
const transientMeda = Symbol('Transient');

export class DataConfigDefined {}
function dataSource() {
  return (clazz: any, tableName: string, ...idNames: string[]) => {
    return <T extends {new(...args: any[]): {}}>(constructor: T) => {
      return class extends constructor {
        tableName = tableName;
        idNames = idNames;
        keys = clazz ? Object.keys(clazz) : [];
      };
    };
  };
}
function mongo() {
  return (clazz: any, tableName: string, dbName?: string) => {
    return <T extends {new(...args: any[]): {}}>(constructor: T) => {
      return class extends constructor {
        tableName = tableName;
        db = dbName;
        keys = clazz ? Object.keys(clazz) : [];
      };
    };
  };
}
/**
 *
 * 在调用service的删除功能时，进行update state，而不是直接删除
 * @returns
 */
function logicDelete() {
  return (stateFileName: string, deleteState = '0') => {
    return <T extends {new(...args: any[]): {}}>(constructor: T) => {
      return class extends constructor {
        stateFileName = stateFileName;
        deleteState = deleteState;
      };
    };
  };
}

function transient() {
  return Reflect.metadata(transientMeda, true);
}
/**
 *
 * 过滤掉实体类中 Transient 属性
 * @param {*} target
 * @param {boolean} [emptySkip=false] 是否跳过空字段
 * @returns
 */
function buildData(target: any, emptySkip = false) {
  const data = {};
  Object.keys(target).forEach((key) => {
    if (Reflect.getMetadata(transientMeda, target, key) !== true) {
      if (
        emptySkip !== true ||
        (target[key] !== null && target[key] !== undefined)
      ) {
        data[key] = target[key];
      }
    }
  });
  return data;
}

/* tslint:disable-next-line */
export const DataSource = dataSource();
/* tslint:disable-next-line */
export const Mongo = mongo();
/* tslint:disable-next-line */
export const Transient = transient;
/* tslint:disable-next-line */
export const BuildData = buildData;
/* tslint:disable-next-line */
export const TransientMeda = transientMeda;
/* tslint:disable-next-line */
export const LogicDelete = logicDelete();
