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

export const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
