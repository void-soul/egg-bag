'use strict';

require('reflect-metadata');
const _ = require('lodash');
const fs = require('fs');
const os = require('os');
const { join } = require('path');
const ejsexcel = require('ejsexcel');
const ControllerHandler = require('./shell/handler/controller-handler');
const MethodHandler = require('./shell/handler/method-handler');
const StatusError = require('./shell/exception/status-error');
const RequestMethod = require('./shell/enum/request-method');
const ctMap = new Map();
const ctHandler = new ControllerHandler();
const methodHandler = new MethodHandler(ctMap);
const debug = require('debug')('egg-bag:router');
const tempDir = os.tmpdir();
// 路由统计
const routers = [];
const EggShell = (app, options = {}) => {
  const { router, io } = app;
  // 设置全局路由前缀
  if (options.prefix) router.prefix(options.prefix);
  options.before = options.before || [];
  options.after = options.after || [];
  const routerDebug = (app.config.env === 'prod' && app.config.routerDebug === true) || (app.config.env !== 'prod' && app.config.routerDebug !== false);
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
      let { reqMethod, path, view, before, after, view_error, contentType, contentName, lock, name } = methodHandler.getMetada(c[pName]);
      let render = false;
      let excel = false;
      if (reqMethod === RequestMethod.Render) {
        render = true;
        reqMethod = 'get';
      } else if (reqMethod === RequestMethod.Excel) {
        excel = true;
        reqMethod = 'get';
      }
      if (reqMethod && router[reqMethod]) {
        debug(`[egg-bag] found router: ${ prefix + path }.`);
        const befores = [...options.before, ...beforeAll, ...before];
        const afters = [...options.after, ...afterAll, ...after];
        const handelError = async (error, ctx) => {
          app.coreLogger.error(error);
          const errorData = { status: error.status || 500, message: error.message || error };
          if (render === true) {
            const renderPath = ctx.view_error_path || view_error || app.config.view_error_path;
            if (renderPath) {
              try {
                await ctx.render(ctx.view_error_path || view_error || prefix + path, {
                  ...errorData,
                  user: ctx.me || false,
                  globalValues: app._globalValues || false,
                  ...ctx.req.asyncData
                });
              } catch (error) {
                ctx.response.body = errorData;
              }
            } else {
              ctx.response.body = errorData;
            }
          } else if (excel === true) {
            ctx.response.body = errorData;
          } else {
            ctx.response.body = errorData;
          }
        };
        const install = (sp) => {
          router[reqMethod](prefix + sp, async (ctx, next) => {
            const start = +new Date();
            try {
              const redLock = lock === true && ctx.me && ctx.me.devid ? await app._lock.acquire([`${ prefix }-${ path }-${ ctx.me.devid }`], 10 * 60 * 60 * 1000) : undefined;
              const instance = new c.constructor(ctx);
              try {
                for (const before of befores) {
                  await before()(ctx, next);
                }
                let result;
                if (render === true) {
                  result = await instance[pName](ctx);
                  await ctx.render(ctx.view_path || view || prefix + path, {
                    ...result,
                    user: ctx.me || false,
                    globalValues: app._globalValues || false,
                    ...ctx.req.asyncData
                  });
                } else if (excel === true) {
                  result = await instance[pName](ctx);
                  let templateName = view;
                  if (!templateName) {
                    templateName = path.replace(/\//g, '');
                  }
                  app.throwIf(!templateName, '没有指定模板路径！');
                  templateName = templateName.indexOf('.') === -1 ? `${ templateName }.xlsx` : templateName;
                  const exlBuf = await fs.promises.readFile(view ? join(app.baseDir, 'app', 'excel', templateName) : join(app.baseDir, 'excel', 'app', prefix, templateName));
                  const exlBuf2 = await ejsexcel.renderExcel(exlBuf, result, { cachePath: tempDir });
                  ctx.response.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  if (name) {
                    ctx.response.attachment(name);
                  }
                  ctx.response.body = exlBuf2;
                } else {
                  ctx.body = ctx.request ? ctx.request.body : null;
                  // 异步操作改装
                  const uri = ctx.body._router || ctx.query._router;
                  const message = ctx.body._msg || ctx.query._msg;
                  const title = ctx.body._title || ctx.query._title;
                  const event = ctx.body._event || ctx.query._event;
                  const asRequest = !!event || !!title || !!message;
                  if (uri && asRequest) {
                    result = 1;
                    instance[pName](ctx)
                      .then(_data => {
                        if (message) {
                          if (_data === undefined || _data === null) {
                            ctx.app.emitTo('USER-', ctx.me.userid, event, {
                              message: `${ title || message }处理完毕`,
                              uri
                            });
                          } else if (typeof _data === 'object') {
                            ctx.app.emitTo('USER-', ctx.me.userid, event, {
                              message: `${ title || message }处理完毕,${ message.replace(/\{\{([a-z0-9A-Z]+)\}\}/g, (a, b) => (_data[b] === undefined || _data[b] === null ? '' : _data[b])) }`,
                              uri
                            });
                          } else {
                            ctx.app.emitTo('USER-', ctx.me.userid, event, {
                              message: `${ title || message }处理完毕,${ message.replace('{{.}}', _data) }`,
                              uri
                            });
                          }
                        } else {
                          ctx.app.emitTo('USER-', ctx.me.userid, event, {
                            params: {
                              data: _data,
                              title
                            },
                            uri
                          });
                        }
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
                    if (name) {
                      ctx.response.attachment(name);
                    }
                    if (contentName) {
                      ctx.response.attachment(contentName);
                    }
                    if (ctx.file_name) {
                      ctx.response.attachment(ctx.file_name);
                    }
                    ctx.response.type = contentType;
                    ctx.response.body = result;
                  } else if (ctx.response.type !== 'text/html') {
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
                  } else {
                    ctx.response.body = result;
                  }
                }
                for (const after of afters) {
                  await after()(ctx, next);
                }
              } catch (error) {
                handelError(error, ctx);
              } finally {
                if (routerDebug) {
                  debug(`${ prefix + path } + ${ +new Date() - start }ms`);
                }
                if (redLock && lock === true && ctx.me && ctx.me.devid) {
                  await redLock.release();
                }
              }
            } catch (error) {
              console.error(error);
              handelError({
                status: 'E201000',
                message: `${ start }:重复提交,请等待上次请求处理完成`
              }, ctx);
            }
          });
        };
        if (typeof path === 'string') {
          install(path);
        } else {
          for (const ps of path) {
            install(ps);
          }
        }
      } else if (reqMethod === 'io') {
        debug(`[egg-bag] found io-router: ${ prefix + path }.`);
        const befores = [...options.before, ...beforeAll, ...before];
        const afters = [...options.after, ...afterAll, ...after];
        const install = (sp) => {
          io.of('/').route(prefix + sp, async function () {
            const start = +new Date();
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
            } finally {
              debug(`${ prefix + path } + ${ +new Date() - start }ms`);
            }
          });
        };
        if (typeof path === 'string') {
          install(path);
        } else {
          for (const ps of path) {
            install(ps);
          }
        }
      }
      if (routerDebug) {
        routers.push(`${ lock ? '[lock]' : '' }[${ reqMethod }]${ options.prefix === '/' ? '' : options.prefix }${ prefix + path }-->${ fullPath }.${ pName }`);
      }
    }
  }


  if (routerDebug) {
    router.get('/~', function (ctx) {
      ctx.response.body = JSON.stringify(routers, null, 4);
    });
  }
};
const EggInstall = (target, app, options = {}) => {
  const { router } = app;
  const lock = target.lock;
  if (router[target.method]) {
    debug(`[egg-bag] found inner-router: ${ target.path }.`);
    router[target.method](target.path, async (ctx, next) => {
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
          ctx,
          logger: ctx.logger
        };
        const result = await target.handel.call(that, ctx);
        if (target.excel === true) {
          let templateName = ctx.query.templateName || ctx.body.templateName;
          if (!templateName) {
            templateName = target.path.replace(/\//g, '');
          }
          app.throwIf(!templateName, '没有指定模板路径！');
          templateName = templateName.indexOf('.') === -1 ? `${ templateName }.xlsx` : templateName;
          const exlBuf = await fs.promises.readFile(join(app.baseDir, 'app', 'excel', templateName));
          const exlBuf2 = await ejsexcel.renderExcel(exlBuf, result, { cachePath: tempDir });
          ctx.response.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const downLoadName = ctx.query.downLoadName || ctx.body.downLoadName;
          if (downLoadName) {
            ctx.response.attachment(downLoadName);
          }
          ctx.response.body = exlBuf2;
        } else if (target.type) {
          ctx.response.type = target.type;
          ctx.response.body = result;
        } else if (ctx.response.type !== 'text/html') {
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
        } else {
          ctx.response.body = result;
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
        debug(`${ target.path } + ${ +new Date() - start }ms`);
      }
    });
  }
  if (app.config.env !== 'prod') {
    routers.push(`[${ target.method }]${ target.path }-->native script`);
  }
};
const EggIoInstall = (target, app, options = {}) => {
  const { io } = app;
  debug(`[egg-bag] found inner-io: ${ target.path }.`);
  io.of('/').route(target.path, async function () {
    const start = +new Date();
    try {
      const befores = [];
      const afters = [];
      if (options.before) befores.push(...options.before);
      if (target.before) befores.push(...target.before);
      if (target.after) afters.push(...target.after);
      if (options.after) afters.push(...options.after);
      for (const before of befores) {
        await before()(this, () => { });
      }
      const that = {
        app,
        service: this.service,
        ctx: this,
        logger: this.logger
      };
      const result = await target.handel.call(that, this.args.slice(1));
      this.app.io.of('/').emit(this.args[0], {
        data: result
      });
      for (const after of afters) {
        await after()(this, () => { });
      }
    } catch (error) {
      this.app.coreLogger.error(error);
      this.app.io.of('/').emit(this.args[0], {
        status: error.status,
        message: error.message
      });
    } finally {
      this.debug(`${ target.path } + ${ +new Date() - start }ms`);
    }
  });
}
module.exports = {
  EggShell,
  EggInstall,
  EggIoInstall,
  StatusError,

  Render: methodHandler.render(),
  Excel: methodHandler.excel(),
  Get: methodHandler.get(),
  Post: methodHandler.post(),
  Put: methodHandler.put(),
  Delete: methodHandler.delete(),
  Patch: methodHandler.patch(),
  Options: methodHandler.options(),
  Head: methodHandler.head(),
  IO: methodHandler.io(),
  ContentType: methodHandler.contentType(),
  ViewError: methodHandler.viewError(),
  ContentName: methodHandler.contentName(),
  Lock: methodHandler.lock,

  Before: methodHandler.before(),
  After: methodHandler.after(),

  BeforeAll: ctHandler.beforeAll(),
  AfterAll: ctHandler.afterAll(),
  Prefix: ctHandler.prefix()
};
