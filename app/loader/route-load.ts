import {Application, Controller} from 'egg';
import {EggInstall, EggShell, EggIoInstall} from '../util/shell';
import IMe from '../middleware/IMe';
import ILogin from '../middleware/ILogin';
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

  EggInstall({
    path: `/do-flow/:flow/:node/:action.json`,
    method: 'post',
    before: [ILogin],
    async handel(this: Controller, {params: {flow, node, action}, body: {flowParam, bizParam}}) {
      return await this.service.paasService.doFlow({flowPath: `${ flow }/${ node }/${ action }`, flowParam, bizParam});
    }
  }, this, {
    before: [IMe]
  });

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