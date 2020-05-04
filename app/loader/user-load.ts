import {ObjectSchema} from 'fast-json-stringify';
import {Application} from 'egg';
import FastJson = require('fast-json-stringify');

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
  this.coreLogger.warn('[egg-bag] user-schema read over');
}