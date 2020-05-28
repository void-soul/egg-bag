import {ObjectSchema} from 'fast-json-stringify';
import {Application} from 'egg';
import FastJson = require('fast-json-stringify');
const debug = require('debug')('egg-bag:loader');
export function loadUser(this: Application) {
  const schema: ObjectSchema = {
    title: 'User Scheam',
    type: 'object',
    properties: {
      userid: {type: 'string'},
      devid: {type: 'string'},
      socket: {type: 'string'},
      os: {type: 'string'},
      device: {type: 'string'},
      browser: {type: 'string'},
      wx_mini_session_key: {type: 'string'},
      client_online: {type: 'boolean'},
      ...this.config.userScheam
    }
  };
  this.stringifyUser = FastJson(schema);
  debug('user-schema read over');
}