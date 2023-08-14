import {arraySplit} from './object';

/**
 * 回调函数promise化
 * 调用示例
 * soap.excute(arg1, arg2, function(error, data){});
 * 可使用为:
 * const soap_excute = promise({
 *  fn: soap.excute,
 *  target: soap
 * });
 * const data = await soap_excute(arg1, arg2);
 * @param this
 * @param param1
 */
export const promise = function <T>(
  this: any,
  {fn, target, last = true}: {fn: (...args: any[]) => any; target?: any; last?: boolean}
): (...args: any[]) => Promise<T> {
  return (...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      args[last === true ? 'push' : 'unshift'](
        (
          err: {
            message: string;
            [key: string]: any;
          } | null,
          data: T
        ) => {
          if (err === null || err === undefined) {
            return resolve.call(this, data);
          }
          return reject(err);
        }
      );
      if (target) {
        fn.apply(target, args);
      } else {
        fn.apply({}, args);
      }
    });
  };
};

export const sleep = (time: number = parseInt(`${ Math.random() }`) + 200,) =>
  new Promise((resolve) => setTimeout(resolve, time));

/**
 * 执行器
 * @param fn
 * @param {
    ifFinish?: (result?: T) => boolean; // 是否结束,默认是建议判断 !!result
    maxTryTimes?: number; //最多尝试几次,默认是20
    onFail?: () => Promise<boolean | undefined> | boolean | undefined; // 失败时的回调，返回false表示停止执行
    name?: string;  // 执行器名称，用于打印日志
    exitIfFail?: boolean; // 失败时是否退出，默认是false. 这里设置true后，onFail返回true,也会停止执行
    defVal?: T; // 失败时的默认值
    sleepAppend?: number; // 等待延迟MS，默认是1000内随机+200
 * }
 * @returns
 */
export async function dieTrying<T = any>(
  fn: (...args: any[]) => Promise<T | undefined> | T | undefined,
  {
    ifFinish = (result?: T) => !!result,
    maxTryTimes = 20,
    onFail,
    name = 'dieTrying',
    exitIfFail = true,
    defVal,
    sleepAppend = 0
  }: {
    ifFinish?: (result?: T) => boolean;
    maxTryTimes?: number;
    onFail?: () => Promise<boolean | undefined> | boolean | undefined;
    name?: string;
    exitIfFail?: boolean;
    defVal?: T;
    sleepAppend?: number;
  } = {}): Promise<T | undefined> {
  let count = 0;
  let result = defVal;
  while (result = await fn(), !ifFinish(result)) {
    await sleep(parseInt(`${ Math.random() * 1000 }`) + sleepAppend);
    count++;
    console.debug(`${ name } try ${ count } times`);
    if (count > maxTryTimes) {
      if (onFail) {
        const remuseExcute = await onFail();
        console.error(`${ name } timeout`);
        count = 0;
        if (remuseExcute === false) {
          break;
        }
      }
      if (exitIfFail) {
        break;
      }
    }
  }
  return result;
}
/**
 * 数组分割执行
 * @param datas 数组
 * @param fn 执行的函数, 参数1：分割数组；参数2：第几个分割数组；参数3：分割数组的数量；参数4：从第几个下标（相对于总数组）元素开始；参数5：到第几个下标（相对于总数组）元素结束
 * @param config 配置（三选一）：everyLength=每组个数(最后一组可能不足次数), groupCount=拆分几组, extendParams=依附拆分数组；
 * @param 额外选项 settled=是否并行?
 * T: datas类型
 * E: extendParams类型
 * R: 返回值类型
 */
export async function execSplit<T = any, R = any, E = any>(
  datas: T[],
  fn: (args: T[], index: number, length: number, extendParam?: E, startIndex?: number, endIndex?: number) => Promise<R>,
  {everyLength = 0, groupCount = 0, settled = false, extendParams = new Array<E>()} = {}
): Promise<{result: R[]; error: string[];}> {
  if (extendParams.length > 0) {
    groupCount = extendParams.length;
  }
  if (everyLength === 0 && groupCount === 0) {throw new Error('参数错误!');}

  const reasons: {result: R[]; error: string[];} = {result: [], error: []};
  const ps = {everyLength, groupCount};
  const list = arraySplit(datas, ps);
  if (settled) {
    const result = await Promise.allSettled(list.map((list, i) => fn(list, i, list.length, extendParams[i])));
    for (const item of result) {
      if (item.status === 'rejected') {
        reasons.error.push(item.reason);
      } else {
        reasons.result.push(item.value);
      }
    }
  } else {
    for (let i = 0; i < list.length; i++) {
      try {
        const startIndex = (i - 1) * ps.everyLength;
        const endIndex = startIndex + list[i].length - 1;
        reasons.result.push(await fn(list[i], i, list.length, extendParams[i], startIndex, endIndex));
      } catch (error) {
        reasons.error.push(error as string);
      }
    }
  }
  return reasons;
}