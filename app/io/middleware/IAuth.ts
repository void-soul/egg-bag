import {Context} from 'egg';
import SocketConfig from '../../enums/SocketConfig';
const debug = require('debug')('egg-bag');
export default (): any => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const {app, socket} = ctx;
    const id = socket.id;
    const query = socket.handshake.query;
    const dick = (msg: string) => {
      app.coreLogger.error(msg);
      socket.disconnect();
      // return (nsp.adapter as any).remoteDisconnect(id, true, (err: any) => app.coreLogger.error(err));
    };
    // 用户信息
    const {devid} = query;
    if (!devid) {
      return dick('not found devid!');
    }
    const me = await ctx.getUser(devid);
    if (!me || !me.devid) {
      return dick('not found user-info by socket-devid and socket-query');
    }
    me.socket = id;
    ctx.login(me, me.client_online !== true);
    const userid = me.userid;
    if (app.config.socket) {
      for (const room of app.config.socket.rooms) {
        const roomId = room(me);
        if (roomId) {
          // 当前id
          socket.join(roomId);
          debug(`${ me.userid } join to ${ roomId }`);
        }
      }
    }
    // 加入个人room
    if (!app.config.socket || !app.config.socket.joinMe || (app.config.socket && app.config.socket.joinMe && app.config.socket.joinMe(me) === true)) {
      socket.join(`${ SocketConfig.SOCKET_USER.value() }-${ userid }`);
    }
    // 加入本次登陆room
    socket.join(`${ SocketConfig.SOCKET_DEV.value() }-${ me.devid }`);
    // 全部room
    socket.join(SocketConfig.SOCKET_ALL.value());
    await next();
    // 退出
    if (app.config.session && app.config.session.socketLogout === true) {
      ctx.logout();
    }
  };
};
