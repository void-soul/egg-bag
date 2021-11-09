import {EggPlugin} from 'egg';
import 'tsconfig-paths/register';
const plugin: EggPlugin = {
  static: true,
  mysql: {
    enable: true,
    package: 'egg-mysql-ex'
  },
  security: {
    enable: false
  },
  io: {
    enable: true,
    package: 'egg-socket.io'
  },
  alinode: {
    enable: process.env.NODE_ENV === 'production' && !process.platform.startsWith('win'),
    package: 'egg-alinode'
  },
  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks'
  }
};
export default plugin;
