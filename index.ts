import * as egg from 'egg';
import Application from './lib/application';
import Agent from './lib/Agent';
import Enum from './app/enums/Enum';
import BaseService from './app/base/BaseService';
import BaseMongoService from './app/base/BaseMongoService';
import {Empty, emptyPromise} from './app/util/empty';
import {promise, sleep, dieTrying, execSplit} from './app/util/fn';
import {num, max, min, div, add, mul, sub, round, merge, money, calc} from './app/util/math';
import {dateTime, dateXSDTime, date, nowTime, nowDate, nowTimeXSD, dateFormat} from './app/util/now';
import {copyBean, convertBean, convertBeans, emptyBean, createBeanFromArray, coverComplexBean, fixEmptyPrototy, mixArray, mixList, arraySplit} from './app/util/object';
import SetEx from './app/util/SetEx';
import {DataSource, Mongo, Transient, BuildData, TransientMeda, LogicDelete} from './app/util/shell-extend';
import {Render, Get, Post, Put, Delete, Patch, Options, Head, IO, Before, After, BeforeAll, AfterAll, Prefix, ViewError, ContentType, ContentName, Lock, Excel} from './app/util/shell';
import {uuid, getPicKey, emptyString, notEmptyString, safeString, trimObject, randomNumber, randomString, randomString2, randomString3, eqString, buildWxStr, replaceChineseCode} from './app/util/string';
import BaseSchedule from './app/base/BaseSchedule';
import ILogin from './app/middleware/ILogin';
import SocketConfig from './app/enums/SocketConfig';
import {ci} from './app/util/ci-help';
import {enumToJson} from './app/util/enumUtil';
import {ContextMethodCache, ContextMethodLock, controller, http, param} from './app/util/method-enhance';
import {FlowContext, Flow, FlowNode, FlowNodeStart, FlowNodeSystem, FlowNodeEnd, FlowNodeAuto, FlowNodeChild, FlowNodeShunt} from './app/util/flow';
export = {
  ...egg,
  Application,
  Agent,
  Enum,
  BaseService,
  BaseMongoService,
  Empty, emptyPromise,
  promise, sleep, dieTrying, execSplit,
  num, max, min, div, add, mul, sub, round, merge, money, calc,
  dateTime, dateXSDTime, date, nowTime, nowDate, nowTimeXSD, dateFormat,
  copyBean, convertBean, convertBeans, emptyBean, createBeanFromArray, coverComplexBean, fixEmptyPrototy, mixArray, mixList, arraySplit,
  SetEx,
  DataSource, Mongo, Transient, BuildData, TransientMeda, LogicDelete,
  Render, Get, Post, Put, Delete, Patch, Options, Head, IO, ViewError, ContentType, ContentName, Before, After, BeforeAll, AfterAll, Prefix, Lock, Excel,
  uuid, getPicKey, emptyString, notEmptyString, safeString, trimObject, randomNumber, randomString, randomString2, randomString3, eqString, buildWxStr, replaceChineseCode,
  BaseSchedule,
  ILogin,
  ci,
  enumToJson,
  SocketRoom: {
    SOCKET_ALL: SocketConfig.SOCKET_ALL.value(),
    SOCKET_USER: SocketConfig.SOCKET_USER.value(),
    SOCKET_DEV: SocketConfig.SOCKET_DEV.value()
  },
  ContextMethodCache, ContextMethodLock, controller, http, param,
  FlowContext, Flow, FlowNode, FlowNodeStart, FlowNodeSystem, FlowNodeEnd, FlowNodeAuto, FlowNodeChild, FlowNodeShunt
};

