import * as egg from 'egg';
import Application from './lib/application';
import Agent from './lib/Agent';
import Enum from './app/enums/Enum';
import BaseService from './app/base/BaseService';
import BaseMongoService from './app/base/BaseMongoService';
import {Empty, emptyPromise} from './app/util/empty';
import {promise, sleep} from './app/util/fn';
import {num, max, min, div, add, mul, sub, round, MoneyStyle, money, calc} from './app/util/math';
import {dateTime, dateXSDTime, date, nowTime, nowDate, nowTimeXSD} from './app/util/now';
import {copyBean, convertBean, convertBeans, emptyBean, createBeanFromArray, coverComplexBean, fixEmptyPrototy} from './app/util/object';
import SetEx from './app/util/SetEx';
import {DataSource, Mongo, Transient, BuildData, TransientMeda, LogicDelete} from './app/util/shell-extend';
import {NUXT, Render, Get, Post, Put, Delete, Patch, Options, Head, IO, Before, After, BeforeAll, AfterAll, Prefix, ContentType, Lock} from './app/util/shell';
import {uuid, getPicKey, emptyString, notEmptyString, safeString, randomNumber, randomString, buildWxStr, replaceChineseCode} from './app/util/string';
import BaseSchedule from './app/base/BaseSchedule';
import ILogin from './app/middleware/ILogin';
import SocketConfig from './app/enums/SocketConfig';
import {ci} from './app/util/ci-help';
import {enumToJson} from './app/util/enumUtil';
import {ContextMethodCache} from './app/util/method-enhance';

export = {
  ...egg,
  Application,
  Agent,
  Enum,
  BaseService,
  BaseMongoService,
  Empty,
  emptyPromise,
  promise,
  sleep,
  num, max, min, div, add, mul, sub, round, MoneyStyle, money, calc,
  dateTime, dateXSDTime, date, nowTime, nowDate, nowTimeXSD,
  copyBean, convertBean, convertBeans, emptyBean, createBeanFromArray, coverComplexBean, fixEmptyPrototy,
  SetEx,
  DataSource, Mongo, Transient, BuildData, TransientMeda, LogicDelete,
  NUXT, Render, Get, Post, Put, Delete, Patch, Options, Head, IO, ContentType, Before, After, BeforeAll, AfterAll, Prefix, Lock,
  uuid, getPicKey, emptyString, notEmptyString, safeString, randomNumber, randomString, buildWxStr, replaceChineseCode,
  BaseSchedule,
  ILogin,
  ci,
  enumToJson,
  SocketRoom: {
    SOCKET_ALL: SocketConfig.SOCKET_ALL.value(),
    SOCKET_USER: SocketConfig.SOCKET_USER.value(),
    SOCKET_DEV: SocketConfig.SOCKET_DEV.value()
  },
  ContextMethodCache
};
