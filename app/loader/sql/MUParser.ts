import SQLSource from './SQLSource';
/**
 * md解析文件
 *
 * @export
 * @class MUParser
 */
export default class MUParser {
  static END = 1;
  private modelName: string;
  private linNumber = 0;
  private lastLine: string;
  private lastlastLine: string;
  private status = 0;
  private lineSeparator = '\n';
  private files: string[];
  constructor (modelName: string, file: string) {
    this.modelName = modelName;
    this.files = file.replace(/\r/g, '').split(this.lineSeparator);
    this.skipHeader();
  }
  next(): SQLSource | null {
    let sqlId: string = this.readSqlId();
    if (this.status === MUParser.END) {
      return null;
    }
    // 去掉可能的尾部空格
    sqlId = sqlId.trim();
    this.skipComment();
    if (this.status === MUParser.END) {
      return null;
    }
    const sqlLine: number = this.linNumber;
    const sql: string = this.readSql();
    const source: SQLSource = new SQLSource(`${ this.modelName }.${ sqlId }`, sql);
    source.line = sqlLine;
    return source;
  }
  private skipHeader(): void {
    while (true) {
      const line: string = this.nextLine();
      if (this.status === MUParser.END) {
        return;
      }
      if (line.startsWith('===')) {
        return;
      }
    }
  }
  private nextLine(): string {
    const line: string = this.files[this.linNumber];
    this.linNumber++;
    if (line === undefined) {
      this.status = MUParser.END;
    }
    // 保存最后读的俩行
    this.lastlastLine = this.lastLine;
    this.lastLine = line;
    return line;
  }
  private readSqlId(): string {
    return this.lastlastLine;
  }
  private skipComment(): void {
    let findComment = false;
    while (true) {
      let line: string = this.nextLine();
      if (this.status === MUParser.END) {
        return;
      }
      line = line.trim();
      if (!findComment && line.length === 0) {
        continue;
      }
      if (line.startsWith('*')) {
        // 注释符号
        findComment = true;
        continue;
      } else {
        if (line.length === 0) {
          continue;
        } else if (line.startsWith('```') || line.startsWith('~~~')) {
          // 忽略以code block开头的符号
          continue;
        } else {
          // 注释结束
          return;
        }
      }
    }
  }
  private readSql(): string {
    const list: string[] = [];
    list.push(this.lastLine);
    while (true) {
      const line: string = this.nextLine();

      if (this.status === MUParser.END) {
        return this.getBuildSql(list);
      }

      if (line.startsWith('===')) {
        // 删除下一个sqlId表示
        list.pop();
        return this.getBuildSql(list);
      }
      list.push(line);
    }
  }
  private getBuildSql(list: string[]): string {
    const sb: string[] = [];
    for (const str of list) {
      const s: string = str.trim();
      if (s.startsWith('```') || s.startsWith('~~~')) {
        // 忽略以code block开头的符号
        continue;
      }
      sb.push(str);
    }
    return sb.join(' ');
  }
}
