export default class <T> extends Set {
  private uniqueKey: keyof T;
  private whenOnExist?: (oldData: T, newData: T) => void | null;
  private whenOnNotExist?: (newData: T) => void | null;
  private replaceItemWhenExits: boolean;
  /**
   * @param key 识别是否存在的对象的属性名
   * @param onExist 当存在时作何操作? oldData/newData 哪个将添加到set,由replaceItemWhenExits决定,默认是oldData生效
   * @param onNotExist 当不存在时作何操作?
   * @param replaceWhenExits 当存在时是否覆盖？
   * @param values 初始数组
   */
  constructor (
    key: keyof T | {
      key: keyof T;
      onExist?: (oldData: T, newData: T) => void;
      onNotExist?: (newData: T) => void;
      replaceWhenExits?: boolean;
      values?: ReadonlyArray<T> | null;
    },
    onExist?: (oldData: T, newData: T) => void,
    replaceWhenExits = false,
    values?: ReadonlyArray<T> | null,
    onNotExist?: (newData: T) => void
  ) {
    if (typeof key === 'object') {
      super(key.values);
      this.whenOnExist = key.onExist;
      this.uniqueKey = key.key;
      this.replaceItemWhenExits = key.replaceWhenExits === true;
      this.whenOnNotExist = key.onNotExist;
    } else {
      super(values);
      this.whenOnExist = onExist;
      this.uniqueKey = key;
      this.replaceItemWhenExits = replaceWhenExits;
      this.whenOnNotExist = onNotExist;
    }
  }

  /**
   *
   * 添加返回 当前对象
   * @param {T} value
   * @returns {this}
   */
  add(value: T): this {
    let flag = false;
    this.forEach((item) => {
      if (item[this.uniqueKey] === value[this.uniqueKey]) {
        flag = true;
        if (this.whenOnExist) {
          this.whenOnExist(item, value);
        }
        if (this.replaceItemWhenExits === true) {
          super.delete(item);
          flag = false;
        }
        return false;
      }
    });
    if (flag === false) {
      super.add(value);
      if (this.whenOnNotExist) {
        this.whenOnNotExist(value);
      }
    }
    return this;
  }
  addAll(...values: T[]): this {
    for (const value of values) {
      this.add(value);
    }
    return this;
  }
  /**
   *
   * 添加并返回添加成功的对象:可能是新加入集合的，也可能是原本存在的
   * @param {T} value
   * @returns {T}
   */
  add2(value: T): T {
    let flag = false;
    let tmp = value;
    this.forEach((item) => {
      if (item[this.uniqueKey] === value[this.uniqueKey]) {
        flag = true;
        if (this.whenOnExist) {
          this.whenOnExist(item, value);
        }
        if (this.replaceItemWhenExits === true) {
          super.delete(item);
          flag = false;
        } else {
          tmp = item;
        }
        return false;
      }
    });
    if (flag === false) {
      super.add(value);
      if (this.whenOnNotExist) {
        this.whenOnNotExist(value);
      }
    }
    return tmp;
  }
  /**
   *
   * 添加并返回添加成功的对象:可能是新加入集合的，也可能是原本存在的
   * @param {T} value
   * @returns {T}
   */
  addAll2(values: T[]): T[] {
    const result: T[] = [];
    for (const value of values) {
      result.push(this.add2(value));
    }
    return result;
  }
  /**
   * 用key找到匹配的第一个对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {(T | null)}
   */
  find(value: T[keyof T]): T | null {
    for (const item of this) {
      if (item[this.uniqueKey] === value) {
        return item;
      }
    }
    return null;
  }
  /**
   * 用key找到匹配的所有对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {T[]}
   */
  findAll(value: T[keyof T]): T[] {
    const res = new Array<T>();
    this.forEach((item) => {
      if (item[this.uniqueKey] === value) {
        res.push(item);
      }
    });
    return res;
  }
  /**
   *
   * 用函数回调找到匹配的第一个对象
   * @param {(item: T) => boolean} fn
   * @returns {T[]}
   */
  filter(fn: (item: T) => boolean): T | null {
    for (const item of this) {
      if (fn(item) === true) {
        return item;
      }
    }
    return null;
  }
  /**
   *
   * 用函数回调找到匹配的所有对象
   * @param {(item: T) => boolean} fn
   * @returns {T[]}
   */
  filterAll(fn: (item: T) => boolean): T[] {
    const res = new Array<T>();
    this.forEach((item) => {
      if (fn(item) === true) {
        res.push(item);
      }
    });
    return res;
  }
  /**
   *
   * 是否存在key对应的对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {boolean}
   */
  has(value: T[keyof T]): boolean {
    for (const item of this) {
      if (item[this.uniqueKey] === value) {
        return true;
      }
    }
    return false;
  }
  toArray(): T[] {
    return Array.from(this);
  }
  /**
   *
   * 删除key对应的对象
   * @param {*} value 这是对象的关键属性,而非对象
   * @returns {boolean}
   */
  delete(value: T[keyof T]): boolean {
    for (const item of this) {
      if (item[this.uniqueKey] === value) {
        super.delete(item);
        return true;
      }
    }
    return false;
  }
  /**
   *
   * 重置
   * @param {keyof T} key
   * @param {(oldData: T, newData: T) => void} [onExist]
   * @param {boolean} [replaceWhenExits=false]
   */
  reset({key, onExist, onNotExist, replaceWhenExits}: {
    key?: keyof T;
    onExist?: (oldData: T, newData: T) => void | null;
    onNotExist?: (newData: T) => void | null;
    replaceWhenExits?: boolean;
  }): this {
    if (onExist !== undefined) {
      this.whenOnExist = onExist;
    }
    if (onNotExist !== undefined) {
      this.whenOnNotExist = onNotExist;
    }
    if (key) {
      this.uniqueKey = key;
    }
    if (replaceWhenExits !== undefined) {
      this.replaceItemWhenExits = replaceWhenExits;
    }
    this.clear();
    return this;
  }
  set onExist(onExist: ((oldData: T, newData: T) => void) | undefined) {
    this.whenOnExist = onExist;
  }
  set key(key: keyof T) {
    this.uniqueKey = key;
  }
  set replaceWhenExits(replaceWhenExits: boolean) {
    this.replaceItemWhenExits = replaceWhenExits;
  }
}
