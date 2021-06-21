export default class Enum {
  private _value: string;
  private _desc: string;
  private _config: string[];
  constructor (value: string, desc: string, ...config: string[]) {
    this._value = value;
    this._desc = desc;
    this._config = config;
  }
  eq(value: string | number | undefined | null): boolean {
    if (value === undefined) {
      return false;
    }
    if (value === null) {
      return false;
    }
    if (typeof value === 'number') {
      return this._value === `${ value }`;
    }
    return this._value === `${ value }`;
  }
  value(): string {
    return this._value;
  }
  desc(): string {
    return this._desc;
  }
  config(): string[] {
    return this._config;
  }
}
