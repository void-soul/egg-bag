import {Context} from 'egg';
import lodash = require('lodash');

/**
 *
 * sql内置函数库
 * @export
 * @class Build
 */
export default class Build {
  private static page = 'COUNT(1) zccw1986 ';
  private count: boolean;
  private sum: boolean;
  private brage = {haveOrderBy: false, haveLimit: false};
  private ctx: Context;
  /**
   *
   * Creates an instance of Build.
   * @param {boolean} count 是否是count查询
   * @param {string} order 排序代码
   * @memberof Build
   */
  constructor (
    count: boolean,
    sum: boolean,
    ctx: Context,
    param: {[propName: string]: any} = {}
  ) {
    this.count = count;
    this.sum = sum;
    this.ctx = ctx;
    lodash.assign(this, param);
  }
  /**
   *
   * 当分页时将函数内包含的内容替换为COUNT(1)
   * @returns
   * @memberof Build
   */
  pageTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.count === true) {
        return Build.page;
      } else if (this.sum !== true) {
        return render(text);
      }
    };
  }
  /**
 *
 * 汇总查询专用
 * @returns
 * @memberof Build
 */
  sumTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.sum !== true) {
        return '';
      } else {
        return render(text);
      }
    };
  }
  /**
   *
   * 当分页时、汇总时忽略函数内包含的内容
   * @returns
   * @memberof Build
   */
  pageIgnoreTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.count === true || this.sum === true) {
        return '';
      } else {
        return render(text);
      }
    };
  }
  /**
   *
   * 将查询条件包起来，如果条件内容不为空，则自动添加WHERE,同时将第一个条件的and、or替换为空
   * 例如:
   * {{#whereTag}}
   * and name = 1
   * and page = 2
   * {{/whereTag}}
   * 输出
   * where name = 1 and page = 2
   * @returns
   * @memberof Build
   */
  where() {
    return (text: string, render: (text: string) => string) => {
      let data = render(text);
      data = lodash.trim(data);
      if (data) {
        data = data.replace(/and|or/i, '');
        return `WHERE ${ data }`;
      } else {
        return '';
      }
    };
  }
  /**
   * 删除第一个and、or
   * 删除最后一个,
   * 删除最后一个;
   * @memberof Build
   */
  trim() {
    return (text: string, render: (text: string) => string) => {
      let data = render(text);
      data = lodash.trim(data);
      if (data) {
        data = data.replace(/(^and\s)|(^or\s)|(,$)|(;$)/i, '');
        return data;
      } else {
        return '';
      }
    };
  }
  /**
   * 分页时将排序部分代码用此函数包起来，可以自动拼接order by
   * 查询条数时，自动忽略此部分
   * etc
   * {{#orderTag}} name desc, age asc {{/orderTag}}
   * ===
   * ORDER BY name desc, age asc
   * @returns
   * @memberof Build
   */
  orderTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.count === true || this.sum === true) {
        return '';
      } else {
        this.brage.haveOrderBy = true;
        const orderBy = new Array<string>();
        const renderOrder = render(text);
        if (/\S/.test(renderOrder)) {
          orderBy.push(renderOrder);
        }
        return orderBy.length > 0 ? ` ORDER BY ${ orderBy.join(',') }` : '';
      }
    };
  }
  enumTag() {
    return (text: string) => {
      const matchs = text.match(/([a-zA-Z_]+)\(([^()]+)\)/);
      if (matchs) {
        const [_a, MapName, Column] = matchs;
        if (MapName && Column) {
          const map = this.ctx.app._globalValues.GlobalMap[MapName.trim()];
          if (map) {
            return `CASE
${ Object.entries(map).map(([k, v]) => `WHEN ${ Column } = '${ k }' THEN '${ v }'`).join(' ') }
END`;
          }
        }
      }
      return "''";
    };
  }
  limitTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.count === true || this.sum === true) {
        return '';
      } else {
        this.brage.haveOrderBy = true;
        const orderBy = new Array<string>();
        const renderOrder = render(text);
        if (/\S/.test(renderOrder)) {
          orderBy.push(renderOrder);
        }
        return orderBy.length > 0 ? ` ORDER BY ${ orderBy.join(',') }` : '';
      }
    };
  }
  /**
   *
   * 分页时将分组部分代码用此函数包起来，可以自动拼接GROUP BY
   * 当分页时、汇总时，自动忽略此部分
   * etc
   * {{#groupTag}} name, age {{/groupTag}}
   * ===
   * group by name.age
   * @returns
   * @memberof Build
   */
  groupTag() {
    return (text: string, render: (text: string) => string) => {
      if (this.count === true || this.sum === true) {
        return '';
      } else {
        const groupBy = render(text) || '';
        return /\S/.test(groupBy) ? ` GROUP BY ${ groupBy }` : '';
      }
    };
  }

  /**
   *
   * beetween and
   * etc.
   * {{#between}} AND t.createtime | ({{createtime}}) {{/between}}
   * createtime: 1,2
   * ===
   * AND t.createtime BETWEEN 1 AND 2
   * @returns
   * @memberof Build
   */
  between() {
    return (text: string, render: (text: string) => string) => {
      const result = render(text);
      if (/\(([\w\W]+)\)/.exec(result)) {
        return render(text).replace(/\(([\w\W]+)\)/, (a, b) => {
          if (a && b) {
            const xx = b.split(',');
            return `'${ xx[0] }' AND '${ xx[1] }'`;
          } else {
            return '';
          }
        }).replace(/\|/, ' BETWEEN ');
      } else {
        return '';
      }
    };
  }

  /**
   *
   * 距离计算,单位米
   * etc
   * {{#distanceTag}} (t.longitude, t.latitude), ({{longitude}}, {{latitude}}) {{/distanceTag}}
   * ===
   * ROUND(ST_DISTANCE(POINT(longitude1, latitude1), POINT({{longitude}}, {{latitude}}))*111195, 2)
   * 可根据需求自行将数据转换为千米，例如
   * {{#distanceTag}} (t.longitude, t.latitude), ({{longitude}}, {{latitude}}) {{/distanceTag}} / 1000
   * @returns
   * @memberof Build
   */
  distanceTag() {
    return (text: string, render: (text: string) => string) => {
      const result = render(text);
      if (/\(([^()]+)\)/.exec(result)) {
        let index = 0;
        return render(text).replace(/\(([^()]+)\)/g, (a, b) => {
          if (a && b) {
            const xx = b.split(',');
            if (index === 0) {
              index++;
              return `ROUND(ST_DISTANCE(POINT(${ xx[0] }, ${ xx[1] })`;
            } else {
              return ` POINT(${ xx[0] }, ${ xx[1] }))*111195, 2)`;
            }
          } else {
            return '';
          }
        });
      } else {
        return '';
      }
    };
  }
}
