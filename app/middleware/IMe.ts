import {Context} from 'egg';
export default (): (ctx: Context, next: () => Promise<any>) => Promise<void> => {
  return async (ctx: Context) => {
    const devid = ctx.getDevid();
    if (devid) {
      const me = await ctx.getUser(devid);
      if (me) {
        ctx.login(me, false);
      }
    }
  };
};
