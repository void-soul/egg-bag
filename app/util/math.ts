import Decimal from 'decimal.js';
import {Point, MoneyOption} from '../../typings';

function isNum(a: any): boolean {
  return a !== '' && a !== null && !isNaN(a);
}
export const num = (val: any, def = 0): number => {
  if (!isNum(val)) {
    return def;
  }
  return +val;
};
function filterNumber(array: any[]): number[] {
  const res: number[] = [];
  array.forEach((element) => {
    if (isNum(element)) {
      res.push(+element);
    }
  });
  return res;
}
function filterNumber2(array: any[], def?: number): Decimal[] {
  const res: Decimal[] = [];
  array.forEach((element) => {
    if (isNum(element)) {
      res.push(new Decimal(element));
    } else if (def !== undefined) {
      res.push(new Decimal(def));
    }
  });
  return res;
}

export const max = (...args: any[]): number => {
  const arr = filterNumber(args);
  return Math.max.apply(null, arr);
};

export const min = (...args: any[]): number => {
  const arr = filterNumber(args);
  return Math.min.apply(null, arr);
};

export const div = (...args: any[]): number => {
  const arr: Decimal[] = filterNumber2(args);
  if (arr.length > 1) {
    return arr.reduce((a, b) => a.div(b)).toNumber();
  } else if (arr.length > 0) {
    return arr[0].toNumber();
  } else {
    return 0;
  }
};

export const add = (...args: any[]): number => {
  const arr = filterNumber2(args);
  if (arr.length > 1) {
    return arr.reduce((a, b) => a.add(b)).toNumber();
  } else if (arr.length > 0) {
    return arr[0].toNumber();
  } else {
    return 0;
  }
};

export const mul = (...args: any[]): number => {
  const arr = filterNumber2(args);
  if (arr.length > 1) {
    return arr.reduce((a, b) => a.mul(b)).toNumber();
  } else if (arr.length > 0) {
    return arr[0].toNumber();
  } else {
    return 0;
  }
};

export const sub = (...args: any[]): number => {
  const arr = filterNumber2(args, 0);
  if (arr.length > 1) {
    return arr.reduce((a, b) => a.sub(b)).toNumber();
  } else if (arr.length > 0) {
    return arr[0].toNumber();
  } else {
    return 0;
  }
};

const roundMode = [Decimal.ROUND_HALF_UP, Decimal.ROUND_UP, Decimal.ROUND_DOWN];
export const round = (number: any, numDigits: number, upOrDown = 0): number => {
  if (isNum(number)) {
    const nu = new Decimal(number);
    return nu.toDP(numDigits, roundMode[upOrDown]).toNumber();
  } else {
    return 0;
  }
};
/** =value.xx,其中xx=number,如number=99，表示修正数字为value.99 */
export const merge = function (value: any, number: any) {
  if (isNum(value) && isNum(number)) {
    return new Decimal(value).floor().add(`0.${ number }`).toNumber();
  } else if (isNum(value)) {
    return value;
  } else {
    return 0;
  }
};


export const money = (
  value: any,
  option: MoneyOption = {}
): string => {
  // Intl.NumberFormat(option.local ?? 'zh', {
  //   style: option.style ?? 'currency',
  //   currency: option.currency ?? 'CNY',
  //   minimumFractionDigits: option.prefix ?? 2,
  //   currencyDisplay: option.currencyDisplay ?? 'symbol',
  //   useGrouping: option.useGrouping ?? true
  // }).format(isNum(value) ? value : option.def).replace(/CN|\s/g, '');
  return (isNum(value) ? value : option.def).toLocaleString(option.local ?? 'zh', {
    style: option.style ?? 'currency',
    currency: option.currency ?? 'CNY',
    minimumFractionDigits: option.prefix ?? 2,
    currencyDisplay: option.currencyDisplay ?? 'symbol',
    useGrouping: option.useGrouping ?? true
  }).replace(/CN|\s/g, '');
};

const IF = function () {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;
    descriptor.value = function (this: Bus) {
      if (this['ifit'] === true) {
        // eslint-disable-next-line prefer-rest-params
        const args = Array.from(arguments);
        fn.call(this, ...args);
      }
      this['ifit'] = true;
      return this;
    };
  };
};

export class Bus {
  private result: number;
  private ifit = true;
  constructor (result: any) {
    this.result = num(result);
  }
  @IF()
  add(...args: any[]): this {
    this.result = add(this.result, ...args);
    return this;
  }
  @IF()
  sub(...args: any[]): this {
    this.result = sub(this.result, ...args);
    return this;
  }
  @IF()
  div(...args: any[]): this {
    this.result = div(this.result, ...args);
    return this;
  }
  @IF()
  mul(...args: any[]): this {
    this.result = mul(this.result, ...args);
    return this;
  }
  @IF()
  max(...args: any[]): this {
    this.result = max(this.result, ...args);
    return this;
  }
  @IF()
  min(...args: any[]): this {
    this.result = min(this.result, ...args);
    return this;
  }
  @IF()
  ac(): this {
    this.result = sub(0, this.result);
    return this;
  }
  @IF()
  abs(): this {
    this.result = Math.abs(this.result);
    return this;
  }
  @IF()
  round(numDigits: number, upOrDown?: number): this {
    this.result = round(this.result, numDigits, upOrDown);
    return this;
  }
  @IF()
  merge(number: any) {
    this.result = merge(this.result, number);
    return this;
  }
  if(condition: boolean) {
    this.ifit = condition;
    return this;
  }
  over(): number {
    return this.result;
  }
  money(
    option?: MoneyOption
  ): string {
    return money(this.result, option);
  }
  lt(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return r.lessThan(d);
  }
  le(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return r.lessThanOrEqualTo(d);
  }
  gt(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return r.greaterThan(d);
  }
  ge(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return r.greaterThanOrEqualTo(d);
  }
  nlt(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return !r.lessThan(d);
  }
  nle(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return !r.lessThanOrEqualTo(d);
  }
  ngt(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return !r.greaterThan(d);
  }
  nge(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return !r.greaterThanOrEqualTo(d);
  }
  eq(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return r.equals(d);
  }
  ne(data: any): boolean {
    const [d, r] = filterNumber2([data, this.result]);
    return !r.eq(d);
  }

  ifLt(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = r.lessThan(d);
    return this;
  }
  ifLe(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = r.lessThanOrEqualTo(d);
    return this;
  }
  ifGt(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = r.greaterThan(d);
    return this;
  }
  ifGe(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = r.greaterThanOrEqualTo(d);
    return this;
  }
  ifNlt(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = !r.lessThan(d);
    return this;
  }
  ifNle(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = !r.lessThanOrEqualTo(d);
    return this;
  }
  ifNgt(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = !r.greaterThan(d);
    return this;
  }
  ifNge(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = !r.greaterThanOrEqualTo(d);
    return this;
  }
  ifEq(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = r.equals(d);
    return this;
  }
  ifNe(data: any): this {
    const [d, r] = filterNumber2([data, this.result]);
    this.ifit = !r.eq(d);
    return this;
  }
}

export const calc = (result: any) => {
  return new Bus(result);
};

export const getGeo = (p1: Point, p2: Point) => {
  p1.lat = calc(p1.latitude).mul(Math.PI).div(180).over();
  p1.long = calc(p1.longitude).mul(Math.PI).div(180).over();
  p2.lat = calc(p2.latitude).mul(Math.PI).div(180).over();
  p2.long = calc(p2.longitude).mul(Math.PI).div(180).over();
  return calc(
    Math.round(
      mul(
        Math.asin(
          Math.sqrt(
            add(Math.pow(Math.sin(div(sub(p1.lat, p2.lat), 2)), 2),
              mul(
                Math.cos(p1.lat), Math.cos(p2.lat), Math.pow(Math.sin(div(sub(p1.long, p2.long), 2)), 2)
              ))
          )), 2, 6378.137, 10000))).div(10000).round(2).over();
};