import {Nuxt, Builder, Generator} from 'nuxt';
import shell = require('shelljs');
import {writeFileSync, readFileSync, existsSync, readdirSync} from 'fs';
import {merge} from 'lodash';
import {join} from 'path';
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
export const nuxtDefaultConfig = (srcDir: string, rootDir: string, dev: boolean) => {
  return {
    build: {
      analyze: !dev,
      babel: {
        presets({isServer}) {
          return [
            [
              require.resolve('@nuxt/babel-preset-app'),
              {
                targets: isServer ? {node: 'current'} : {ie: '11'},
                corejs: {version: 2}
              }
            ]
          ];
        }
      },
      extractCSS: true,
      devtools: dev,
      hotMiddleware: {
        overlay: true,
        reload: true,
        noInfo: true,
        autoConnect: true
      }
    },
    mode: 'universal',
    modern: false,
    srcDir,
    rootDir,
    dev,
    render: {
      ssr: true
    },
    vue: {
      config: {
        productionTip: false,
        devtools: false
      }
    }
  };
};
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
export const ci = async (serviceDistDir: string, resources?: string[], dirs?: string[]) => {
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
    new Resource('./app/cert/', `../${ serviceDistDir }/app/cert/`, true)
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
  const dir = process.cwd();
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] clear temp history');
  shell.rm('-rf', `./${ serviceDistDir }`);
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] typescipt compile start');
  shell.exec('yarn tsc');
  // tslint:disable-next-line: no-console
  console.log('[egg-bag] typescipt compile finished');


  const defaultConfig = readFileSync(join(dir, `./${ serviceDistDir }/config/config.default.js`), {encoding: 'utf-8'});
  const prodConfig = readFileSync(join(dir, `./${ serviceDistDir }/config/config.prod.js`), {encoding: 'utf-8'});
  writeFileSync(join(dir, `./${ serviceDistDir }/config/config.default.temp.js`), defaultConfig.replace(/"app\//g, '"../app/'), {encoding: 'utf-8'});
  writeFileSync(join(dir, `./${ serviceDistDir }/config/config.prod.temp.js`), prodConfig.replace(/"app\//g, '"../app/'), {encoding: 'utf-8'});

  const configDefault = require(join(dir, `./${ serviceDistDir }/config/config.default.temp.js`)).default({}).nuxt;
  const configProd = require(join(dir, `./${ serviceDistDir }/config/config.prod.temp.js`)).default({}).nuxt;

  if (configDefault || configProd) {
    // tslint:disable-next-line: no-console
    console.log('[egg-bag] found nuxt config, start compile');
    const nuxt = new Nuxt(merge({}, nuxtDefaultConfig('./app/nuxt', './', false), configDefault, configProd));
    const builder = new Builder(nuxt);
    try {
      await nuxt.ready();
      const generator = new Generator(nuxt, builder);
      await generator.generate();
      shell.mkdir(`./${ serviceDistDir }/.nuxt/`);
      // nuxt输出
      tasks.unshift(new Resource('./.nuxt/dist/', `./${ serviceDistDir }/.nuxt/dist/`, true));
      // tslint:disable-next-line: no-console
      console.log('[egg-bag] build nuxt success');
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(`[egg-bag] build nuxt error ${ error }`);
      process.exit(1);
    }
  }
  shell.rm('-rf', join(dir, `./${ serviceDistDir }/config/config.default.temp.js`));
  shell.rm('-rf', join(dir, `./${ serviceDistDir }/config/config.prod.temp.js`));
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
