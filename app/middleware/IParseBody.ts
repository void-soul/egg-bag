/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {Context} from 'egg';
export default (): (ctx: Context, next: () => Promise<any>) => Promise<void> => {
  return async (ctx: Context, next: () => Promise<any>) => {
    return new Promise((resolve) => {
      const data = new Array<Buffer>();
      ctx.req.on('data', (chunk: Buffer) => data.push(chunk));
      ctx.req.on('end', async () => {
        ctx.bufferBody = data;
        await next();
        resolve();
      });
    });
  };
};
