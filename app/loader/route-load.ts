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
    async handel(this: Controller, {params: {flow, node, action}, body: {data}}) {
      return await this.service.paasService.doFlow<any, any>({
        flowPath: `${ flow }/${ node }/${ action }`,
        data
      });
    }
  }, this, {
    before: [IMe]
  });
  EggInstall({
    path: `/do-flow/:dir/:flow/:node/:action.json`,
    method: 'post',
    before: [ILogin],
    async handel(this: Controller, {params: {dir, flow, node, action}, body: {data}}) {
      return await this.service.paasService.doFlow<any, any>({
        flowPath: `${ dir }/${ flow }/${ node }/${ action }`,
        data
      });
    }
  }, this, {
    before: [IMe]
  });
  EggInstall({
    path: `/get-flow/:dir/:flow/:node.json`,
    method: 'get',
    before: [ILogin],
    handel(this: Controller, {params: {dir, flow, node}}) {
      return this.app.getFlowNode(dir, flow, node);
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