export default class Enum {
  private _value: string;
  private _desc: string;
  constructor (value: string, desc: string) {
    this._value = value;
    this._desc = desc;
  }
  eq(value: string): boolean {
    return this._value === value;
  }
  value(): string {
    return this._value;
  }
  desc(): string {
    return this._desc;
  }
}
