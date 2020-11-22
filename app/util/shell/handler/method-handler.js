'use strict';

const { METHOD_METADATA, PATH_METADATA, BEFORE_METADATA, AFTER_METADATA, CONTENT_TYPE_METADATA, NAME_METADATA, VIEW_METADATA, LOCK_METADATA, CONTENT_NAME_METADATA } = require('../constants');
const RequestMethod = require('../enum/request-method');

const createMappingDecorator = Symbol('createMappingDecorator');
const createSingleDecorator = Symbol('createSingleDecorator');
const createArrayDecorator = Symbol('createArrayDecorator');
const createTwoDecorator = Symbol('createTwoDecorator');
const createThreeDecorator = Symbol('createThreeDecorator');
const mappingRequest = Symbol('mappingRequest');

class MethodHandler {
  constructor (cMap) {
    this.cMap = cMap;
  }

  getMetada (targetCb) {
    const reqMethod = Reflect.getMetadata(METHOD_METADATA, targetCb);
    const path = Reflect.getMetadata(PATH_METADATA, targetCb);
    const before = Reflect.getMetadata(BEFORE_METADATA, targetCb) || [];
    const after = Reflect.getMetadata(AFTER_METADATA, targetCb) || [];
    const contentType = Reflect.getMetadata(CONTENT_TYPE_METADATA, targetCb);
    const contentName = Reflect.getMetadata(CONTENT_NAME_METADATA, targetCb);
    const view = Reflect.getMetadata(VIEW_METADATA, targetCb);
    const name = Reflect.getMetadata(NAME_METADATA, targetCb);
    const lock = Reflect.getMetadata(LOCK_METADATA, targetCb);

    return {
      reqMethod,
      path,
      view,
      before,
      after,
      contentType,
      contentName,
      lock,
      name
    };
  }
  render () {
    return this[createTwoDecorator](RequestMethod.Render);
  }
  excel () {
    return this[createThreeDecorator](RequestMethod.Excel);
  }
  io () {
    return this[createMappingDecorator](RequestMethod.IO);
  }
  get () {
    return this[createMappingDecorator](RequestMethod.GET);
  }

  post () {
    return this[createMappingDecorator](RequestMethod.POST);
  }

  put () {
    return this[createMappingDecorator](RequestMethod.PUT);
  }

  delete () {
    return this[createMappingDecorator](RequestMethod.DELETE);
  }

  patch () {
    return this[createMappingDecorator](RequestMethod.PATCH);
  }

  options () {
    return this[createMappingDecorator](RequestMethod.OPTIONS);
  }

  head () {
    return this[createMappingDecorator](RequestMethod.HEAD);
  }

  before () {
    return this[createArrayDecorator](BEFORE_METADATA);
  }

  after () {
    return this[createArrayDecorator](AFTER_METADATA);
  }

  contentType () {
    return this[createSingleDecorator](CONTENT_TYPE_METADATA);
  }
  contentName () {
    return this[createSingleDecorator](CONTENT_NAME_METADATA);
  }
  lock () {
    return (_target, _key, descriptor) => {
      Reflect.defineMetadata(LOCK_METADATA, true, descriptor.value);
    };
  }
  [createMappingDecorator] (method) {
    return path => {
      return this[mappingRequest]({
        [PATH_METADATA]: path,
        [METHOD_METADATA]: method
      });
    };
  }
  [createTwoDecorator] (method) {
    return (path, view) => {
      return this[mappingRequest]({
        [PATH_METADATA]: path,
        [VIEW_METADATA]: view,
        [METHOD_METADATA]: method
      });
    };
  }
  [createThreeDecorator] (method) {
    return (path, view, name) => {
      return this[mappingRequest]({
        [PATH_METADATA]: path,
        [VIEW_METADATA]: view,
        [NAME_METADATA]: name,
        [METHOD_METADATA]: method
      });
    };
  }
  [mappingRequest] (metadata) {
    const path = metadata[PATH_METADATA];
    const view = metadata[VIEW_METADATA];
    const name = metadata[NAME_METADATA];
    const reqMethod = metadata[METHOD_METADATA];

    return (target, _key, descriptor) => {
      this.cMap.set(target, target);
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
      Reflect.defineMetadata(METHOD_METADATA, reqMethod, descriptor.value);
      Reflect.defineMetadata(VIEW_METADATA, view, descriptor.value);
      Reflect.defineMetadata(NAME_METADATA, name, descriptor.value);
      return descriptor;
    };
  }

  [createSingleDecorator] (metadata) {
    return value => {
      return (target, _key, descriptor) => {
        this.cMap.set(target, target);
        Reflect.defineMetadata(metadata, value, descriptor.value);
        return descriptor;
      };
    };
  }

  [createArrayDecorator] (metadata) {
    return values => {
      return (_target, _key, descriptor) => {
        const _values = Reflect.getMetadata(metadata, descriptor.value) || [];
        values = values instanceof Array ? values : [values];
        values = values.concat(_values);
        Reflect.defineMetadata(metadata, values, descriptor.value);
        return descriptor;
      };
    };
  }
}

module.exports = MethodHandler;
