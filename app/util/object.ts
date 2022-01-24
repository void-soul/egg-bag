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
 * @param value 作为新对象value的字段,不传则将自身为value
 */
export const createBeanFromArray = <F, T = F>(
  source: F[],
  key: keyof F,
  value?: keyof F
): {
  [name: string]: T;
} => {
  const result: {
    [name: string]: T;
  } = {};
  if (value) {
    source.forEach((item) => {
      if (item[key]) {
        result[`${ item[key] }`] = item[value] as unknown as T;
      }
    });
  } else {
    source.forEach((item) => {
      if (item[key]) {
        result[`${ item[key] }`] = item as unknown as T;
      }
    });
  }
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


export const mixArray = <T>(array: T[], key: keyof T, defKey?: string): {[key: string]: number} => {
  const obj = array.map(item => item[key]);
  const result: {[k: string]: number} = {};
  for (const i of obj) {
    let ki = '';
    if (i !== undefined && i !== null) {
      ki = `${ i }`;
    } else if (defKey) {
      ki = defKey;
    }
    if (!result[ki]) {
      result[ki] = 0;
    }
    result[ki]++;
  }
  return result;
};

export const mixList = <T>(array: T[], key: keyof T, defKey?: string): {[key: string]: T[]} => {
  const result: {[k: string]: T[]} = {};
  for (const i of array) {
    let ki = '';
    if (i[key] !== undefined && i[key] !== null) {
      ki = `${ i[key] }`;
    } else if (defKey) {
      ki = defKey;
    }
    if (!result[ki]) {
      result[ki] = [];
    }
    result[ki].push(i);
  }
  return result;
};