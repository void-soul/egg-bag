import {Application} from 'egg';
import rp = require('request-promise');
export abstract class BaseWx {
  protected app: Application;
  protected appCode: string;
  protected authErrorCodes = [40001, 40014, 41001, 42001];
  protected name: string;
  protected tokenUrl: string;
  protected mock = false;
  constructor (app: Application, appCode: string) {
    this.app = app;
    this.appCode = appCode;
  }
  protected async getToken(force?: boolean): Promise<string> {
    let token = '';
    let need = force === true;
    const now = +new Date();
    if (need === false) {
      const tokenData = await this.app.getCache(this.tokenCacheName, 'other');
      if (tokenData) {
        const datas = tokenData.split('^_^');
        token = datas[0];
        const lastTime = datas[1];
        const spliceTime = datas[2];
        if (now - parseInt(lastTime, 10) - parseInt(spliceTime, 10) > 0) {
          need = true;
        }
      } else {
        need = true;
      }
    }
    if (need === true) {
      const data = await this.fetch(() => this.tokenUrl, 'get', {}, false);
      token = data.access_token;
      this.app.setCache(this.tokenCacheName, `${ token }^_^${ now }^_^${ data.expires_in * 1000 }`, 'other');
    }
    return token;
  }
  protected async fetch(uri: (token: string) => string, method: 'get' | 'post', data: {[key: string]: any}, needToken: boolean = true, buffer: boolean = false) {
    let token = needToken ? await this.getToken() : '';
    if (this.mock !== true && (!needToken || token)) {
      const start = +new Date();
      let url = uri(token);
      const param = method === 'get' ? {
        method,
        json: buffer ? false : true,
        qs: data,
        encoding: buffer ? null : undefined
      } : {
          json: data,
          method,
          encoding: buffer ? null : undefined
        };
      let response = await rp({
        uri: url,
        ...param
      });
      if (this.authErrorCodes.includes(response.errcode)) {
        token = await this.getToken(true);
        url = uri(token);
        response = await rp({
          uri: url,
          ...param
        });
        this.app.throwIf(response.errcode && response.errcode - 0 !== 0, `${ this.tokenCacheName }-${ url }-${ response.errcode }-${ response.errmsg }`);
      }
      this.app.throwIf(response.errcode && response.errcode - 0 !== 0, `${ this.tokenCacheName }-${ url }-${ response.errcode }-${ response.errmsg }`);
      this.app.coreLogger.info(`fetch data (${ this.tokenCacheName }) ${ +new Date() - start } ms`);
      return response;
    }
  }
  protected get tokenCacheName() {
    return `${ this.name }-${ this.appCode }-token`;
  }
}
