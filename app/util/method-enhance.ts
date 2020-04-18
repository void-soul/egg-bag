import {BaseContextClass} from 'egg';

export function ContextMethodCache(config: {
  /** 返回缓存key,参数同方法的参数 */
  key: (...args: any[]) => string;
  /** 返回缓存清除key,参数同方法的参数 */
  clearKey?: (...args: any[]) => string;
  /** 自动清空缓存的方法 */
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
            if (clearKey && clearKey !== key) {
              this.app.redis.get('other').sadd(clearKey, key);
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
