import {Subscription} from 'egg';
import {nowTime} from '../util/now';
import querystring = require('querystring');
import path = require('path');

const scheduleName = '/__schedule?path';
/**
 * singel = true : 必须等上一个执行完成再执行下一个[默认=true]
 * redis = true : 执行锁不在线程内存中，而是在redis中[默认=true]
 * key : 执行锁名称，若不指定，则使用文件名
 * 注: 若自己指定了key,请在app.ts中的启动事件中清空 `schedule-${key}`
 * cron: 从左往右,共6位,*=每, *\/n = 每n
 * second (0 - 59, optional)
 * minute (0 - 59)
 * hour (0 - 23)
 * day of month (1 - 31)
 * month (1 - 12)
 * day of week (0 - 7) (0 or 7 is Sun)
 * @export
 * @abstract
 * @class BaseSchedule
 * @extends {Subscription}
 */
export default abstract class BaseSchedule extends Subscription {
  singel = true;
  redis = true;
  key: string;
  abstract async excute(): Promise<string>;
  async subscribe() {
    if (!this.config.redis) {
      this.redis = false;
    }
    let lockKey: string = this.key;
    if (!lockKey) {
      const parseData = querystring.parse(this.ctx.request.url);
      const name = parseData[scheduleName];
      if (typeof name === 'string') {
        lockKey = path.basename(name);
      }
    }
    if (this.config.scheduleRun === false) {
      this.app.coreLogger.info(`${ lockKey } skip!!`);
      return;
    }
    if (this.singel === true) {
      const lock = this.redis ? await this.app.redis.get('other').get(`schedule-${ lockKey }`) : this.app._cache[`schedule-${ lockKey }`];
      if (lock) {
        this.app.coreLogger.info(`${ lockKey } lock by ${ lock }`);
        return;
      }
    }
    const start = +new Date();
    try {
      if (this.singel === true) {
        if (this.redis) {
          await this.app.redis.get('other').set(`schedule-${ lockKey }`, nowTime());
        } else {
          this.app._cache[`schedule-${ lockKey }`] = nowTime();
        }
      }
      this.app.coreLogger.info(`${ start }:${ lockKey }:started`);
      const data = await this.excute();
      this.app.coreLogger.info(
        `${ lockKey } + ${ +new Date() - start }ms,data: ${ data || 'empty!' }`
      );
    } catch (e) {
      this.app.coreLogger.info(`${ lockKey } + ${ +new Date() - start }ms,error: ${ e }`);
    } finally {
      if (this.singel === true) {
        if (this.redis) {
          await this.app.redis.get('other').del(`schedule-${ lockKey }`);
        } else {
          delete this.app._cache[`schedule-${ lockKey }`];
        }
      }
    }
  }
}
