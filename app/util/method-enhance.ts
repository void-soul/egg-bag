import {BaseContextClass} from 'egg';
import {FlowContext, FlowActionConfigParam, FlowActionConfigFilter, FlowCodeFilter, FlowAction} from '../../typings';
import {merge, isArray} from 'lodash';

export function ContextMethodCache(config: {
  /** 返回缓存key,参数同方法的参数。可以用来清空缓存。 */
  key: (...args: any[]) => string;
  /** 返回缓存清除key,参数同方法的参数。可以用来批量清空缓存 */
  clearKey?: (...args: any[]) => string[];
  /** 自动清空缓存的时间，单位分钟 */
  autoClearTime?: number;
}) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    if (target instanceof BaseContextClass) {
      const fn = descriptor.value;
      descriptor.value = async function (this: BaseContextClass) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        const key = config.key.call(this, ...args);
        const cache = await this.app.redis.get('other').get(key);
        if (cache) {
          return JSON.parse(cache);
        } else {
          const result = await fn.call(this, ...args);
          if (config.autoClearTime) {
            this.app.redis.get('other').set(key, JSON.stringify(result), 'EX', config.autoClearTime * 60);
          } else {
            this.app.redis.get('other').set(key, JSON.stringify(result));
          }
          if (config.clearKey) {
            const clearKey = config.clearKey.call(this, ...args);
            if (clearKey && clearKey.length > 0) {
              for (const clear of clearKey) {
                this.app.redis.get('other').sadd(clear, key);
              }
            }
          }
          return result;
        }
      };
    } else {
      throw new Error('cache must use on Service,Controller');
    }
  };
}

const excute = async (ctx: FlowContext<any, any, any>, items?: FlowActionConfigFilter[]) => {
  if (items) {
    for (const item of items) {
      if (
        (item.exception !== true && !ctx.error) ||
        (item.exception === true && ctx.error)
      ) {
        if (item.dataFlow) {
          merge(ctx.dataFlow, item.dataFlow);
        }
        if (item.handler) {
          if (isArray(item.handler)) {
            for (const handler of item.handler) {
              try {
                await handler.call(ctx);
              } catch (error) {
                ctx.error = error;
              }
            }
          } else {
            try {
              await item.handler.call(ctx);
            } catch (error) {
              ctx.error = error;
            }
          }
        }
      }
    }
  }

};

function explainCode(
  codeGloval: {
    flowCodes: string[];
    nodeCodes: string[];
  },
  item: FlowActionConfigFilter,
  result: {[flowNode: string]: FlowActionConfigFilter[]},
  filter: {
    flowCode?: FlowCodeFilter;
    nodeCode?: FlowCodeFilter;
  }
) {
  const flowCodes = filter.flowCode ? isArray(filter.flowCode) ? filter.flowCode : [filter.flowCode] : codeGloval.flowCodes;
  const nodeCodes = filter.nodeCode ? isArray(filter.nodeCode) ? filter.nodeCode : [filter.nodeCode] : codeGloval.nodeCodes;
  for (const flowCode of flowCodes) {
    for (const nodeCode of nodeCodes) {
      if (!result[`${ flowCode }/${ nodeCode }`]) {
        result[`${ flowCode }/${ nodeCode }`] = [];
      }
      result[`${ flowCode }/${ nodeCode }`].push(item);
    }
  }
}
function explainCodes(
  codeGloval: {
    flowCodes: string[];
    nodeCodes: string[];
  },
  result: {[flowNode: string]: FlowActionConfigFilter[]},
  items?: FlowActionConfigFilter[],
  flowAlias?: {
    [name: string]: {
      flowCode?: FlowCodeFilter;
      nodeCode?: FlowCodeFilter;
    };
  }
) {
  if (items) {
    for (const item of items) {
      if (item.alias) {
        if (flowAlias) {
          for (const alias of item.alias) {
            if (flowAlias[alias]) {
              explainCode(codeGloval, item, result, {
                flowCode: item.flowCode || flowAlias[alias].flowCode,
                nodeCode: item.nodeCode || flowAlias[alias].nodeCode
              });
            }
          }
        }
      } else {
        explainCode(codeGloval, item, result, item);
      }
    }
  }
}

export function FlowActionConfig(config: FlowActionConfigParam) {
  return function (target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    if (target instanceof BaseContextClass) {
      let lombaqInterface: FlowAction | undefined = (new (target as any).constructor()) as FlowAction;
      const flowConfig = lombaqInterface.flowConfig;
      let alias = lombaqInterface.flowAlias;
      let flowCodeSet: Set<string> | undefined = new Set<string>();
      let nodeCodeSet: Set<string> | undefined = new Set<string>();
      for (const item of flowConfig) {
        const flowCodes = isArray(item.flowCode) ? item.flowCode : [item.flowCode];
        const nodeCodes = isArray(item.nodeCode) ? item.nodeCode : [item.nodeCode];
        for (const flowCode of flowCodes) {
          flowCodeSet.add(flowCode);
        }
        for (const nodeCode of nodeCodes) {
          nodeCodeSet.add(nodeCode);
        }
      }
      let codeGloval: {
        flowCodes: string[];
        nodeCodes: string[];
      } | undefined = {
        flowCodes: Array.from(flowCodeSet),
        nodeCodes: Array.from(nodeCodeSet)
      };

      const before: {
        [flowNode: string]: FlowActionConfigFilter[];
      } = {};
      const after: {
        [flowNode: string]: FlowActionConfigFilter[];
      } = {};
      explainCodes(codeGloval, before, config.before, alias);
      explainCodes(codeGloval, after, config.after, alias);

      codeGloval.flowCodes.length = 0;
      codeGloval.nodeCodes.length = 0;
      codeGloval = undefined;
      flowCodeSet.clear();
      flowCodeSet = undefined;
      nodeCodeSet.clear();
      nodeCodeSet = undefined;
      flowConfig.length = 0;
      alias = undefined;
      lombaqInterface = undefined;

      const fn = descriptor.value;
      descriptor.value = async function (this: FlowContext<any, any, any>) {
        const pather = `${ this.flowCode }/${ this.fromNode }`;

        await excute(this, before[pather]);

        try {
          await fn.call(this);
        } catch (error) {
          this.error = error;
        }

        await excute(this, after[pather]);

        if (this.error) {
          throw this.error;
        }
        return this.returnValue;
      };
    }
  };
}