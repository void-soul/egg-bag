# 更新记录

## 1.7.0

1. 发送验证码短信时，模板 id 由参数传入
2. paasService 增加发送短信的方法
3. SetEx、BaseService 参数验证机制升级

# 1.7.1

1. 修正 LambdaQuery、LambdaQueryMongo 的验证代码
2. LambdaQuery 增加查询单条记录
3. BaseService 的 unique 查询系列方法增加自定义错误提示的功能

# 1.7.2

1. 将 baseService 里的查询方法更语义化
   如:

   | 旧                         | 新                                  |
   | -------------------------- | ----------------------------------- |
   | `querySingelColumnBySql`   | `querySingelRowSingelColumnBySql`   |
   | `querySingelColumnBySqlId` | `querySingelRowSingelColumnBySqlId` |

# 1.7.3

1. 通用 query 语句内置变量支持多级取值,如`workRole.comtype`

# 1.7.4

1. sql 标签中 betweenTag 改 between

# 1.8.8

1. 发送 socket 消息时，通道错误的问题

# 1.9.0

1. 增加 alinode 插件

# 1.10.7

1. 支持 nuxt 注解渲染

> 服务器返回数据时，热重启可能会丢失数据，刷新即可

# 1.14.3

1. 如果不指定调度任务的执行锁，那么执行锁默认使用调度任务的文件名
2. 调度任务执行锁支持放在 `redis` 的 `other` 中
3. `BaseService`的`updataBatch` 的 `where` 可包含 `data` key
4. `BaseService`的`pageQuery` 设置 `limitSelf` = `true` 查询时，也会返回页码了
5. `BaseService`的`LambdaQuery`增加方法`updateColumn`，可更新指定列
6. `SetEx`增加`reset`方法,可选择性重置 set 对象
7. `BaseService`,`BaseMongoService`增加一套方法`Loose`，如`insertTemplateLoose`仅会忽略`null\undefinded`，空字符串还是会插入的
8. `app`下支持`sql-fn`目录，放入`.mu`文件后，可以在任意 sql 中使用,例如 `{{>limit}}`

# 1.14.4

1. 调度任务执行锁优先使用`this.key`

# 1.14.7

1. 升级依赖

# 1.15.0

1. 将 redis 改为非必须配置，但仅限于开发模式

# 1.16.0

1. 增加 config.cacheIO、config.sessiong.devidIO，表示缓存、devid 存放地址

# 1.17.0

1. now.json 支持 按分、小时、天、周、月、年加减时间，并支持时间格式化, 默认 YYYY-MM-DD HH:mm:ss
1. today.json 支持 按分、小时、天、周、月、年加减时间，并支持时间格式化, 默认 YYYY-MM-DD

# 1.17.1

1. app 增加扩展方法：dataConfig, 类似于前端的 filter

# 1.17.5

1. 增加小程序服务端支持

# 1.18.0

1. 增加路由请求防重复提交锁

# 1.19.0

1. 支持同时配置多个小程序
2. 增加企业微信支持
3. 修复小程序 token 很快就过期的问题

# 1.20.0

1. 优化了多小程序、多企业微信应用的配置

# 1.20.2

1. 企业微信发送消息 bug 修复
2. 增加微信小程序解密函数
3. 增加通用 MD5 加密函数

# 1.22.0

1. 项目启动时，读取 `app/sub-sync`、`app/sub-async` 目录，订阅异步、同步消息.目录中文件名就是订阅的消息名称,每个文件导出格式：

```
import {Context} from 'egg-bag';
export default function(this: Context){
  this.service.xxx;
}
```

异步消息发送：

`app.emitSyncRandom(event, ...args)`: 随机找一个线程发送
`app.emitSyncAll(event, ...args)`: 发送给所有线程
`app.emit(event, ...args)`: 发送给本线程

同步消息发送：

> app 中发送时，this 指向的 context 是一个虚拟的上下文，不包含用户会话。如果有需要用户信息，则需要自行 login

> ctx 中发送时，this 指向的 context 会沿用当前上下文

`app.emitASync(event, ...data)`

`ctx.emitASync(event, ...data)`

# 1.23.0

增加微信支付

调用方式：

`app.getWxPay().xxx`

1. 回调代码自动加锁
2. 所有金额不需要单位为分，按元即可

支付回调代码写在：sub-async/\${ appCode }-pay-hook.ts
参数: WxPayHook, 下单时传入的 dataCache
例:

```
import {Context, WxPayHook} from 'egg-bag';
import {MdOrderAdd} from '../enhance/MdOrderEnhance';
export default function (this: Context, order: WxPayHook, cache: MdOrderAdd) {
  this.logger.error(order, cache);
}
```

退款回调代码写在：sub-async/\${ appCode }-ref-hook.ts 参数: WxRefHook

例:

```
import {Context, WxRefHook} from 'egg-bag';
export default function (this: Context, order: WxRefHook) {
  this.logger.error(order);
}
```

# 1.23.16

1. 修复一处打印日志错误

# 1.24.0

1. 优化登入时只允许登录一次的处理
2. 可以通过配置 socket 中的回调`dickUser`来决定新登录用户是否提掉原有用户
3. 增加默认 socket.emit 的路由 `/login` `/logout`，用于登入、登出 socket 房间

# 1.25.0

1. 增加 BaseContent 的方法缓存
2. 增加一些注释

# 1.26.0

增加方法缓存注解，适用于 context 类（controller、service、ctx）的 public、private 方法。有 3 个参数：

`key` : 方法，结果返回值作为缓存 key,参数同方法的参数。可以用来清空缓存
`clearKey` : 方法，结果返回值作为缓存清除 key,参数同方法的参数。可以用来批量清空缓存
`autoClearTime`: 自动清空缓存的时间，单位分钟

举例：

```
  @ContextMethodCache({
    key: (pdid: number) => `pd-detail-${ pdid }`,
    clearKey: (pdid: number) => [`pd-${ pdid }`]
  })
  async test(pdid: number){

  }
```

# 1.27.0

增加建议工作流配置。


## 路径 `app/flow`

实现接口 `FlowAction`,必须声明 `flowConfig`,如:

例如文件名为 `order-create.ts`

```
export default class implements FlowAction{
  flowConfig = [
    // 访问方式=2/3/order-create
    {flowCode: '2', nodeCode: '3'}
  ];
  ...
}
```

### 入口

这个流程访问的入口是 `/do-flow/${flow}/${node}/order-create.json` ，
需要传入参数 `bizParam`、`flowParam`,其中`bizParam` 是业务参数，`flowParam`是流程参数，目前只有 remark 一个属性

## 代码调用

> app 中调用时，this 指向的 context 是一个虚拟的上下文，不包含用户会话。如果有需要用户信息，则需要自行 login

> ctx 中调用时，this 指向的 context 会沿用当前上下文

`app.doFlow('${flow}/${node}/${action}', flowParam, bizParam)`

`ctx.doFlow('${flow}/${node}/${action}', flowParam, bizParam)`

## 操作过滤器

使用注解

```
// 流程操作过滤配置,进行操作时，顺序：beforeAll>before>extendInit>toNode>执行操作>after>afterAll,是按照声明文件的顺序来的 */
export const FlowActionFilter: (config: {
  before?: Array<{
    flowCode?: string | string[];
    nodeCode?: string | string[];
    alias?: string | string[];

    /** 发生异常才进行调用? */
    exception?: boolean;
    /** 先扩展dataFlow，然后再调用handler */
    dataFlow?: {[key: string]: any};
    /** 先扩展dataFlow，然后再调用handler */
    handler?: Array<(this: FlowContext<P, F, R>) => Promise<void>> | (this: FlowContext<P, F, R>) => Promise<void>;
  }>;
  after?: Array<{
    flowCode?: string | string[];
    nodeCode?: string | string[];
    alias?: string | string[];

    /** 发生异常才进行调用? */
    exception?: boolean;
    /** 先扩展dataFlow，然后再调用handler */
    dataFlow?: {[key: string]: any};
    /** 先扩展dataFlow，然后再调用handler */
    handler?: Array<(this: FlowContext<P, F, R>) => Promise<void>> | (this: FlowContext<P, F, R>) => Promise<void>;
  }>;
}) => Decorator;
```

# 1.28.0

增加脚本 sql 库

读取目录 `sql-script`,例如

`msOrder.ts`

```
export function selectList(this:Context, param1, param2){
  return `select * from ...`;
}
```

使用方式和 mu 是一样的


# 1.30.0

增加导出interface: DbConnection,以后:
```
this.transction(async conn => {
  ...
  // conn 类型是 DbConnection，不再是any了
});
```

# 1.31.0

`app/sql-script`目录中格式如下:

`mdOrder.ts`

``` javascript
import {SqlScript, Context} from 'egg-bag';

// 直接返回sql语句，用于查询 mysql
export const queryList: SqlScript = function () {
  return 'SELECT * FROM md_order';
};

// 直接返回sql语句，用于查询 mysql
export const queryList: SqlScript = function (this: Context, param: {[k:string]:any}) {
  // 依然支持两种参数，1：直接拼接，2：:参数名
  return `SELECT * FROM md_order WHERE userid = '${this.me.userid}' AND id = '${param.id}' AND time < :time`;
};

// 直接返回mongoFilter对象，用于查询 mongo
export const queryList: SqlScript = function<MdOrder> (this: Context) {
  return {
      query: {[P in keyof T]?: L[P] | FilterQuery<T>};
      options: {
        limit?: number;
        skip?: number;
        sort?: {[P in keyof T]: 1 | -1};
        projection?: {[P in keyof T]: 1};
      };
      tableName: string;
  }
};
```


# 1.32.0

支持ts的路径别名了

`tsconfig.json`

```
{
  "compilerOptions": {
    "paths": {
      "app/*": ["app/*"]
    }
  }
}
```

在项目中：

```javascript
import initDataFlow from 'app/flow-help/init-data-flow';
```