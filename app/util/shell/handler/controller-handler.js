'use strict';

require('reflect-metadata');

const { CONTROLLER_AFTER_ALL_METADATA, CONTROLLER_BEFORE_ALL_METADATA, CONTROLLER_PREFIX_METADATA } = require('../constants');

const createArrayDecorator = Symbol('createArrayDecorator');
const createSingleDecorator = Symbol('createSingleDecorator');
const createCoupleDecorator = Symbol('createCoupleDecorator');

class ControllerHandler {
  beforeAll() {
    return this[createArrayDecorator](CONTROLLER_BEFORE_ALL_METADATA);
  }

  afterAll() {
    return this[createArrayDecorator](CONTROLLER_AFTER_ALL_METADATA);
  }

  prefix() {
    return this[createSingleDecorator](CONTROLLER_PREFIX_METADATA);
  }

  getMetada(target) {
    const beforeAll = Reflect.getMetadata(CONTROLLER_BEFORE_ALL_METADATA, target) || [];
    const afterAll = Reflect.getMetadata(CONTROLLER_AFTER_ALL_METADATA, target) || [];
    const prefix = Reflect.getMetadata(CONTROLLER_PREFIX_METADATA, target);

    return {
      beforeAll,
      afterAll,
      prefix
    };
  }

  [createSingleDecorator](metadata) {
    return value => {
      return target => {
        Reflect.defineMetadata(metadata, value, target);
      };
    };
  }

  [createCoupleDecorator](metadata) {
    return (value1, value2) => {
      return target => {
        Reflect.defineMetadata(
          metadata,
          {
            name: value2,
            description: value1
          },
          target
        );
      };
    };
  }

  [createArrayDecorator](metadata) {
    return values => {
      return target => {
        const _values = Reflect.getMetadata(metadata, target) || [];
        values = values instanceof Array ? values : [values];
        values = values.concat(_values);
        Reflect.defineMetadata(metadata, values, target);
      };
    };
  }
}

module.exports = ControllerHandler;
