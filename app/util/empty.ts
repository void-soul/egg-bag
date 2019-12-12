/**
 *
 * 空对象
 * @export
 * @class Empty
 */
export class Empty {
  [propName: string]: string | number | boolean | null;
}

export const emptyPromise: Promise<any> = new Promise((resolve) =>
  resolve(null)
);
