'use strict';

require('reflect-metadata');
const _ = require('lodash');

const ControllerHandler = require('./shell/handler/controller-handler');
const MethodHandler = require('./shell/handler/method-handler');
const StatusError = require('./shell/exception/status-error');
const RequestMethod = require('./shell/enum/request-method');
const ctMap = new Map();
const ctHandler = new ControllerHandler();
const methodHandler = new MethodHandler(ctMap);
// 路由统计
const routers = [];
const EggShell = (app, options = {}) => {
  const { router, io } = app;
  // 设置全局路由前缀
  if (options.prefix) router.prefix(options.prefix);
  options.before = options.before || [];
  options.after = options.after || [];

  for (const c of ctMap.values()) {
    if (!c.fullPath) {
      continue;
    }
    // 解析控制器元数据
    let { beforeAll, afterAll, prefix } = ctHandler.getMetada(c.constructor);
    const propertyNames = _.filter(Object.getOwnPropertyNames(c), pName => {
      return pName !== 'constructor' && pName !== 'pathName' && pName !== 'fullPath';
    });
    // 解析前缀
    const fullPath = c.fullPath
      .split('\\')
      .join('/')
      .replace(/[\/]{2,9}/g, '/')
      .replace(/(\.ts)|(\.js)/g, '');
    const rootPath = 'controller/';
    if (prefix === undefined || prefix === null) {
      prefix = fullPath.substring(fullPath.indexOf(rootPath) + rootPath.length).replace(/Controller/, '');
      prefix = prefix.startsWith('/') ? prefix : '/' + prefix;
      prefix = prefix.replace(/^\/\w/, a => a.toLowerCase());
    }
    for (const pName of propertyNames) {
      // 解析函数元数据
      let { reqMethod, path, view, before, after, contentType, lock } = methodHandler.getMetada(c[pName]);
      let nuxt = false;
      let render = false;
      if (reqMethod === RequestMethod.NUXT) {
        if (app._nuxtReady === true) {
          nuxt = true;
        }
        reqMethod = 'get';
      } else if (reqMethod === RequestMethod.Render) {
        render = true;
        reqMethod = 'get';
      }
      if (reqMethod && router[reqMethod]) {
        app.coreLogger.info(`[egg-bag] found router: ${ path }.`);
        const befores = [...options.before, ...beforeAll, ...before];
        const afters = [...options.after, ...afterAll, ...after];
        router[reqMethod](prefix + path, async (ctx, next) => {
          const start = +new Date();
          if (lock === true && ctx.me && ctx.me.devid) {
            const lockKey = await ctx.getCache(`${ prefix }-${ path }-${ ctx.me.devid }`, 'other');
            if (lockKey) {
              return (ctx.response.body = {
                status: 'E201000',
                message: `${ start }:重复提交,请等待上次请求处理完成`
              });
            }
            await ctx.setCache(`${ prefix }-${ path }-${ (ctx.me && ctx.me.devid) || 'xxx' }`, start, 'other');
          }
          const instance = new c.constructor(ctx);
          try {
            for (const before of befores) {
              await before()(ctx, next);
            }
            let result;
            if (nuxt === true) {
              result = await instance[pName](ctx);
              Object.assign(ctx.req, {
                asyncData: result,
                user: ctx.me || false,
                globalValues: app._globalValues || false
              });
            } else if (render === true) {
              result = await instance[pName](ctx);
              await ctx.render(view || prefix + path, {
                ...result,
                user: ctx.me || false,
                globalValues: app._globalValues || false,
                ...ctx.req.asyncData
              });
            } else {
              ctx.body = ctx.request ? ctx.request.body : null;
              // 异步操作改装
              const uri = ctx.body._router || ctx.query._router;
              const message = ctx.body._msg || ctx.query._msg;
              const title = ctx.body._title || ctx.query._title;
              const event = ctx.body._event || ctx.query._event;
              if (uri && message) {
                result = 1;
                instance[pName](ctx)
                  .then(_data => {
                    ctx.app.emitTo('USER-', ctx.me.userid, event, {
                      message: `${ title || message }处理完毕,${ message.replace('{{.}}', _data) }`,
                      uri
                    });
                  })
                  .catch(error => {
                    app.coreLogger.error(error);
                    ctx.app.emitTo('USER-', ctx.me.userid, event, {
                      message: `${ title || message }失败了!(${ error && error.message })`,
                      uri
                    });
                  });
              } else {
                result = await instance[pName](ctx);
              }
              if (contentType) {
                ctx.response.type = contentType;
                ctx.response.body = result;
              } else {
                if (result === null) {
                  ctx.response.body = {
                    result: null
                  };
                } else if (typeof result === 'object') {
                  ctx.response.body = result;
                } else {
                  ctx.response.body = {
                    result
                  };
                }
              }
            }
            for (const after of afters) {
              await after()(ctx, next);
            }
            if (nuxt === true) {
              await ctx.nuxt();
            }
          } catch (error) {
            app.coreLogger.error(error);
            if (nuxt === false) {
              ctx.response.body = {
                status: error.status,
                message: error.message
              };
            } else {
              ctx.response.body = {
                status: error.status,
                message: error.message
              };
            }
          } finally {
            if (ctx.app.config.env !== 'prod') {
              ctx.app.coreLogger.info(`${ prefix + path } + ${ +new Date() - start }ms`);
            }
            if (lock === true && ctx.me && ctx.me.devid) {
              await ctx.delCache(`${ prefix }-${ path }-${ ctx.me.devid }`, 'other');
            }
          }
        });
      } else if (reqMethod === 'io') {
        app.coreLogger.info(`[egg-bag] found io-router: ${ path }.`);
        const befores = [...options.before, ...beforeAll, ...before];
        const afters = [...options.after, ...afterAll, ...after];
        io.of('/').route(prefix + path, async function () {
          try {
            const instance = new c.constructor(this);
            for (const before of befores) {
              await before()(instance.ctx, () => { });
            }
            const result = await instance[pName](...instance.ctx.args.slice(1));
            instance.app.io.of('/').emit(instance.ctx.args[0], {
              data: result
            });
            for (const after of afters) {
              await after()(instance.ctx, () => { });
            }
          } catch (error) {
            instance.app.coreLogger.error(error);
            instance.app.io.of('/').emit(instance.ctx.args[0], {
              status: error.status,
              message: error.message
            });
          }
        });
      }
      if (app.config.env !== 'prod') {
        routers.push(`${ lock ? '[lock]' : '' }[${ reqMethod }(${ nuxt ? 'nuxt' : 'rest' })]${ options.prefix === '/' ? '' : options.prefix }${ prefix + path }-->${ fullPath }.${ pName }`);
      }
    }
  }

  if (app.config.env !== 'prod') {
    router.get('/~', function (ctx) {
      ctx.response.body = JSON.stringify(routers, null, 4);
    });
  }
};
const EggInstall = (target, app, options = {}) => {
  const { router } = app;
  if (router[target.method]) {
    app.coreLogger.info(`[egg-bag] found io-router: ${ target.path }.`);
    router[target.method](target.path, async (ctx, next) => {
      const start = +new Date();
      try {
        const befores = [];
        const afters = [];
        if (options.before) befores.push(...options.before);
        if (target.before) befores.push(...target.before);
        if (target.after) afters.push(...target.after);
        if (options.after) afters.push(...options.after);
        for (const before of befores) {
          await before()(ctx, next);
        }
        ctx.body = ctx.request ? ctx.request.body : null;
        const that = {
          app,
          service: ctx.service,
          ctx
        };
        let result = await target.handel.call(that, ctx);
        if (target.type) {
          ctx.response.type = target.type;
          ctx.response.body = result;
        } else {
          if (result === null) {
            ctx.response.body = {
              result: null
            };
          } else if (typeof result === 'object') {
            ctx.response.body = result;
          } else {
            ctx.response.body = {
              result
            };
          }
        }
        for (const after of afters) {
          await after()(ctx, next);
        }
      } catch (error) {
        app.coreLogger.error(error);
        ctx.response.body = {
          status: error.status,
          message: error.message
        };
      } finally {
        if (ctx.app.config.env !== 'prod') {
          ctx.app.coreLogger.info(`${ target.path } + ${ +new Date() - start }ms`);
        }
      }
    });
  }
  if (app.config.env !== 'prod') {
    routers.push(`[${ target.method }]${ target.path }-->native script`);
  }
};
module.exports = {
  EggShell,
  EggInstall,
  StatusError,

  NUXT: methodHandler.nuxt(),
  Render: methodHandler.render(),
  Get: methodHandler.get(),
  Post: methodHandler.post(),
  Put: methodHandler.put(),
  Delete: methodHandler.delete(),
  Patch: methodHandler.patch(),
  Options: methodHandler.options(),
  Head: methodHandler.head(),
  IO: methodHandler.io(),
  ContentType: methodHandler.contentType(),
  Lock: methodHandler.lock,

  Before: methodHandler.before(),
  After: methodHandler.after(),

  BeforeAll: ctHandler.beforeAll(),
  AfterAll: ctHandler.afterAll(),
  Prefix: ctHandler.prefix()
};
