import lodash = require('lodash');
/**
 * 对象对象（等同与convertBean）
 * 仅会将classType有的属性进行转换
 * 相当与一次属性过滤
 * @param source
 * @param classType
 */
export const copyBean = <T>(source: any, classType: any): T => {
  const result = {};
  Object.keys(classType).forEach((key) => {
    result[key] =
      source[key] !== undefined ? source[key] : (result[key] = null);
  });
  return result as T;
};
/**
 * 对象转换（等同与copyBean）
 * 仅会将classType有的属性进行转换
 * 相当与一次属性过滤
 * @param source
 * @param classType
 */
export const convertBean = copyBean;
/**
 * 批量对象转换（等同与copyBean）
 * 仅会将classType有的属性进行转换
 * 相当与一次属性过滤
 * @param source
 * @param classType
 */
export const convertBeans = <T>(
  source: any[],
  classType: any,
  cb?: (target: T, source: any) => void
): T[] => {
  const result = new Array<T>();
  for (const bean of source) {
    const data = convertBean<T>(bean, classType);
    if (cb) {
      cb(data, bean);
    }
    result.push(data);
  }
  return result;
};
/**
 * 创建一个空对象
 * 其内各属性都是null
 * @param classType
 */
export const emptyBean = <T>(classType: any): T => {
  const target = {} as T;
  Object.keys(classType).forEach((key) => {
    target[key] = null;
  });
  return target;
};

/**
 * 将一个json数组提取为一个json对象
 * @param source 源数组
 * @param key 作为新对象的key的字段
 * @param value 作为新对象value的字段
 */
export const createBeanFromArray = <T>(
  source: any[],
  key: string,
  value: string
): {
  [name: string]: T;
} => {
  const result: {
    [name: string]: T;
  } = {};
  source.forEach((item) => {
    if (item[key]) {
      result[item[key]] = item[value];
    }
  });
  return result;
};

/**
 * 转换复合对象为指定bean
 * @param source
 * @param classType
 */
export const coverComplexBean = <T>(
  source: any,
  classType: any
): {data: T; array: {[key: string]: any[]}} => {
  const result = {};
  const arrayData = {};
  for (const [key, value] of Object.entries(source)) {
    if (lodash.isArray(value)) {
      arrayData[key] = value;
    } else if (lodash.isObject(value)) {
      lodash.assign(result, value);
    } else {
      result[key] = value;
    }
  }
  return {
    data: convertBean<T>(result, classType),
    array: arrayData
  };
};

/**
 * 将目标对象中为空的字段替换为source中对应key的值或者函数返回值
 * @param target
 * @param source
 */
export const fixEmptyPrototy = async (
  target: any,
  source: {
    [key: string]: any;
  }
) => {
  for (const [key, fn] of Object.entries(source)) {
    if (!target[key]) {
      if (typeof fn === 'function') {
        target[key] = await fn();
      } else {
        target[key] = fn;
      }
    }
  }
};
