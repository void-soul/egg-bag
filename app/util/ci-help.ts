import shell = require('shelljs');
import {writeFileSync, existsSync, readdirSync} from 'fs';
import 'tsconfig-paths/register';
class Resource {
  from: string;
  to: string;
  isDir: boolean;
  constructor (from: string, to: string, isDir: boolean) {
    this.from = from;
    this.to = to;
    this.isDir = isDir;
  }
}
const cp = (resources: Resource[]) => {
  for (const res of resources) {
    // tslint:disable-next-line: no-console
    console.log(`[egg-bag] copy resource: ${ res.from } -> ${ res.to }`);
    if (res.isDir) {
      shell.cp('-R', res.from, res.to);
    } else {
      shell.cp(res.from, res.to);
    }
  }
};
export const ci = (serviceDistDir: string, resources?: string[], dirs?: string[], config?: string) => {
  const tasks = [
    // 编译结果
    new Resource(`./${ serviceDistDir }/`, `../${ serviceDistDir }/`, true),
    new Resource('./package.json', `../${ serviceDistDir }/package.json`, false),
    new Resource('./yarn.lock', `../${ serviceDistDir }/yarn.lock`, false),
    new Resource('./tsconfig.json', `../${ serviceDistDir }/tsconfig.json`, false),
    new Resource('./.npmrc', `../${ serviceDistDir }/.npmrc`, false),
    new Resource('./app/sql/', `../${ serviceDistDir }/app/sql/`, true),
    new Resource('./app/sql-fn/', `../${ serviceDistDir }/app/sql-fn/`, true),
    new Resource('./app/public/', `../${ serviceDistDir }/app/public/`, true),
    new Resource('./app/views/', `../${ serviceDistDir }/app/views/`, true),
    new Resource('./app/cert/', `../${ serviceDistDir }/app/cert/`, true),
    new Resource('./app/excel/', `../${ serviceDistDir }/app/excel/`, true)
  ];
  if (resources) {
    for (const res of resources) {
      tasks.push(new Resource(`./${ res }`, `../${ serviceDistDir }/${ res }`, false));
    }
  }
  if (dirs) {
    for (const res of dirs) {
      tasks.push(new Resource(`./${ res }/`, `../${ serviceDistDir }/${ res }/`, true));
    }
  }
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] clear temp history');
  shell.rm('-rf', `./${ serviceDistDir }`);
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] typescipt compile start');
  if (config) {
    shell.exec(`yarn tsc -p ${ config }`);
  } else {
    shell.exec('yarn tsc');
  }

  // tslint:disable-next-line: no-console
  console.log('[egg-bag] typescipt compile finished');
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] clear history');
  // 删除旧文件
  shell.rm('-rf', `../${ serviceDistDir }`);
  // 执行复制任务
  cp(tasks);
  // 生成gitignore
  writeFileSync(`../${ serviceDistDir }/.gitignore`, `
node_modules/
run/
.travis.yml
appveyor.yml
  `);
  // 删除临时目录
  shell.rm('-rf', `./${ serviceDistDir }/`);
  // 工作流读取
  if (existsSync('./app/flow/')) {
    const flows = readdirSync('./app/flow/');
    cp(flows.map(flow => {
      return new Resource(`./app/flow/${ flow }/data.json`, `../${ serviceDistDir }/app/flow/${ flow }/data.json`, false);
    }));
  }
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] finish');
};
