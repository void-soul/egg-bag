import {EggPlugin} from 'egg';

const plugin: EggPlugin = {
  static: true,
  mysql: {
    enable: true,
    package: 'egg-mysql-ex'
  },
  redis: {
    enable: true,
    package: 'egg-redis'
  },
  security: {
    enable: false
  },
  io: {
    enable: true,
    package: 'egg-socket.io'
  },
  alinode: {
    enable: process.env.NODE_ENV === 'production' && process.platform.indexOf('win') !== 0,
    package: 'egg-alinode'
  },
  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks'
  }
};
export default plugin;
