import {Application} from 'egg';
import {EggInstall, EggShell, EggIoInstall} from '../util/shell';
import IMe from '../middleware/IMe';
import {querys, routes, sockets} from '../routes/PaasController';
export function loadRouter(this: Application) {
  EggShell(this, {
    prefix: '/',
    before: [IMe]
  });
  // 内置路由安装
  for (const route of routes) {
    EggInstall(route, this, {
      before: [IMe]
    });
  }

  for (const route of querys) {
    if (this.config.queryLogin === false) {
      route.before.length = 0;
    }
    EggInstall(route, this, {
      before: [IMe]
    });
  }
  for (const route of sockets) {
    EggIoInstall(route, this, {
      before: [IMe]
    });
  }
}