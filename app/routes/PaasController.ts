import {Controller} from 'egg';
import ILogin from '../middleware/ILogin';
import * as dayjs from 'dayjs';
import {dateTime, date, nowTime} from '../util/now';
import lodash = require('lodash');
const debug = require('debug')('egg-bag:auth');
const query = {
  path: '/query.json',
  method: ['get', 'post'],
  before: [ILogin],
  async handel(this: Controller, {
    query: {sqlCode, currentPage, pageSize, sortName, sortType, limitSelf},
    queries
  }) {
    this.app.throwIf(!sqlCode, '没有指定sql语句编码!');
    const params: {
      [key: string]: any;
    } = {};
    if (this.app.config.queryDefaultParam) {
      for (const [name, key] of Object.entries(this.app.config.queryDefaultParam)) {
        params[name] = lodash.get(
          this.ctx.me,
          key
        );
      }
    }
    Object.keys(queries).forEach((item) => {
      if (queries[item].length > 1) {
        params[item] = queries[item];
      } else {
        params[item] = queries[item][0];
      }
    });
    const page = this.service.paasService
      .pageQueryMe(sqlCode)
      .pageNumber(currentPage)
      .pageSize(pageSize)
      .params(params)
      .limitSelf(limitSelf);
    if (sortName && sortType) {
      page.orderBy(`${ sortName } ${ sortType }`);
    }
    return await page.select();
  }
};
const excel = {
  path: '/excel.xlsx',
  method: ['get', 'post'],
  excel: true,
  before: [ILogin],
  async handel(this: Controller, {
    query: {sqlCode, sortName, sortType},
    queries
  }) {
    this.app.throwIf(!sqlCode, '没有指定sql语句编码!');
    const params: {
      [key: string]: any;
    } = {};
    if (this.app.config.queryDefaultParam) {
      for (const [name, key] of Object.entries(this.app.config.queryDefaultParam)) {
        params[name] = lodash.get(
          this.ctx.me,
          key
        );
      }
    }
    Object.keys(queries).forEach((item) => {
      if (queries[item].length > 1) {
        params[item] = queries[item];
      } else {
        params[item] = queries[item][0];
      }
    });
    const page = this.service.paasService
      .pageQueryMe(sqlCode)
      .params(params);
    if (sortName && sortType) {
      page.orderBy(`${ sortName } ${ sortType }`);
    }
    await page.select();
    return {
      list: page.list,
      config: this.app._globalValues.GlobalMap,
      now: nowTime(),
      me: this.ctx.me,
      params
    };
  }
};
const queryMongo = {
  path: '/query-mongo.json',
  before: [ILogin],
  method: ['get', 'post'],
  async handel(this: Controller, {
    query: {sqlCode, currentPage, pageSize, sortName, sortType, limitSelf},
    queries
  }) {
    this.app.throwIf(!sqlCode, '没有指定sql语句编码!');
    const params: {
      [key: string]: any;
    } = {};
    if (this.app.config.queryDefaultParam) {
      for (const [name, key] of Object.entries(this.app.config.queryDefaultParam)) {
        params[name] = this.ctx.me[key];
      }
    }
    Object.keys(queries).forEach((item) => {
      if (queries[item].length > 1) {
        params[item] = queries[item];
      } else {
        params[item] = queries[item][0];
      }
    });
    const page = this.service.paasMongoService
      .pageQueryMe(sqlCode)
      .pageNumber(currentPage)
      .pageSize(pageSize)
      .params(params)
      .limitSelf(limitSelf);
    if (sortName && sortType) {
      page.orderByMongo(sortName, sortType === 'asc' ? 1 : -1);
    }
    return await page.select();
  }
};
const excelMongo = {
  path: '/excel-mongo.xlsx',
  method: ['get', 'post'],
  excel: true,
  before: [ILogin],
  async handel(this: Controller, {
    query: {sqlCode, sortName, sortType},
    queries
  }) {
    this.app.throwIf(!sqlCode, '没有指定sql语句编码!');
    const params: {
      [key: string]: any;
    } = {};
    if (this.app.config.queryDefaultParam) {
      for (const [name, key] of Object.entries(this.app.config.queryDefaultParam)) {
        params[name] = this.ctx.me[key];
      }
    }
    Object.keys(queries).forEach((item) => {
      if (queries[item].length > 1) {
        params[item] = queries[item];
      } else {
        params[item] = queries[item][0];
      }
    });
    const page = this.service.paasMongoService
      .pageQueryMe(sqlCode)
      .params(params);
    if (sortName && sortType) {
      page.orderByMongo(sortName, sortType === 'asc' ? 1 : -1);
    }
    await page.select();
    return {
      list: page.list,
      config: this.app._globalValues.GlobalMap,
      now: nowTime(),
      me: this.ctx.me,
      params
    };
  }
};
const now = {
  path: '/now.json',
  method: ['get', 'post'],
  handel({query: {minute, hour, day, week, month, year, format}}) {
    return dayjs()
      .add(minute || 0, 'minute')
      .add(hour || 0, 'hour')
      .add(day || 0, 'day')
      .add(week || 0, 'week')
      .add(month || 0, 'month')
      .add(year || 0, 'year').format(format || dateTime);
  }
};
const unix = {
  path: '/unix.json',
  method: ['get', 'post'],
  handel() {
    return dayjs().unix();
  }
};
const stamp = {
  path: '/stamp.json',
  method: ['get', 'post'],
  handel() {
    return dayjs().valueOf();
  }
};
const today = {
  path: '/today.json',
  method: ['get', 'post'],
  handel({query: {minute, hour, day, week, month, year, format}}) {
    return dayjs()
      .add(minute || 0, 'minute')
      .add(hour || 0, 'hour')
      .add(day || 0, 'day')
      .add(week || 0, 'week')
      .add(month || 0, 'month')
      .add(year || 0, 'year').format(format || date);
  }
};
const phoneCode = {
  path: '/code.json',
  method: ['get', 'post'],
  async handel(this: Controller, {query: {phone}}: any) {
    return await this.service.paasService.sendCode(phone);
  }
};
const picCode = {
  path: '/pic-code.json',
  method: ['get', 'post'],
  type: 'image/svg+xml',
  async handel(this: Controller, {query: {key}}) {
    return await this.service.paasService.picCode(key);
  }
};
const getConfigJson = {
  path: '/GlobalValues.json',
  method: ['get', 'post'],
  handel(this: Controller) {
    return this.app._globalValues;
  }
};
const getWxIds = {
  path: '/wx-mini-ms-id.json',
  method: ['get', 'post'],
  handel(this: Controller, {query: {code}}) {
    return this.app.getWxMini(code).getTemplIds();
  }
};
const getWxQr = {
  path: '/wx-mini-qr.png',
  method: ['get', 'post'],
  type: 'image/png',
  async handel(this: Controller, {query: {model, page, fullpath, scene, png, code}}) {
    return this.app.getWxMini(code).getUnlimited({model, page, fullpath, scene, png});
  }
};
const wxDecrypt = {
  path: '/wx-decrypt',
  method: ['get', 'post'],
  before: [ILogin],
  handel(this: Controller, {query: {encryptedData, iv, code}}) {
    return this.app.getWxMini(code).decrypt({
      sessionKey: this.ctx.me.wx_mini_session_key!,
      iv,
      encryptedData
    });
  }
};
const fetchFlow = {
  path: '/fetch-flow',
  method: ['get', 'post'],
  before: [ILogin],
  async handel(this: Controller, {body: {flowPath, fromNodeId, fromNodeCode, biz, skipError}}) {
    return await this.service.paasService.fetchFlow({flowPath, fromNodeId, fromNodeCode, biz, skipError});
  }
};

const doFlow = {
  path: '/do-flow',
  method: ['get', 'post'],
  lock: true,
  before: [ILogin],
  async handel(this: Controller, {body: {flowPath, fromNodeId, fromNodeCode, actionId, actionCode, biz}}) {
    return await this.service.paasService.doFlow({flowPath, fromNodeId, fromNodeCode, actionId, actionCode, biz});
  }
};
const getFlowLine = {
  path: '/get-flow-line',
  method: ['get', 'post'],
  before: [ILogin],
  handel(this: Controller, {query: {flowCode, fromNodeId, fromNodeCode, actionId, actionCode}}) {
    return this.service.paasService.getLine({
      flowCode, fromNodeId, fromNodeCode, actionId, actionCode
    });
  }
};
const socketRoomIn = {
  path: '/login',
  before: [ILogin],
  handel(this: Controller, roomid: string) {
    this.ctx.socket.join(roomid);
    debug(`${ this.ctx.me.userid } join to ${ roomid }`);
  }
};
const socketRoomOut = {
  path: '/logout',
  handel(this: Controller, roomid: string) {
    this.ctx.socket.leave(roomid);
    debug(`${ this.ctx.me.userid } leave from ${ roomid }`);
  }
};

export const routes = [
  now, phoneCode, picCode, getConfigJson, today, getWxIds, getWxQr, wxDecrypt, fetchFlow, doFlow, getFlowLine, unix, stamp
];
export const querys = [
  query, queryMongo, excel, excelMongo
];
export const sockets = [
  socketRoomOut, socketRoomIn
];
