import {Context} from 'egg';
import ErrorCode from '../enums/ErrorCode';
export default (): (ctx: Context, next: () => Promise<any>) => Promise<void> => {
  return async (ctx: Context, next: () => Promise<any>) => {
    ctx.app.throwErrorIf(!ctx.me, ErrorCode.E201003);
    await next();
  };
};
