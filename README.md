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

# 1.33.0

1. 方法缓存的key生成方法中，除了方法的原有参数外，还会追加当前 用户对象
2. 方法缓存支持随当前用户session释放
3. 增加`this.app.subSync`、`this.app.subASync`,可以动态订阅 异步、同步事件.
4. 可通过配置`redis.clients`的`sub`以及`redis.conf: notify-keyspace-events "Ex"`,实现订阅过期key释放事件:`this.app.subSync(user|other-key)`
5. `socket`断开时，不再重新登入` socket`监听缓存的`用户session`了,最明显的体验为：手动清空`redis`的`session`,客户端重新请求，发现会话过期，断开`socket`时，`redis`中不会再次出现刚才清掉的`session`了
6. 当用户`session`过期时，会利用订阅机制 清空当时缓存 的 `userid`-`devid`的映射关系.前提是：登录前devid不是自己赋值，而是由bag赋值
7. 修复原 同步消息 通过 context 无法发出的bug
8. 增加`this.ctx.loginByDevid`方法，临时登录一个用户session，且不缓存
9. 增加`this.ctx.emitASyncWithDevid`、`this.app.emitASyncWithDevid`,发布同步消息时,可以附带用户token,这样在消费消息时，可以获取`this.ctx.me`了
10. 支付、退款增加一个参数，传入当前操作的`devid`，以便在处理回调时可以直接获取`this.ctx.me`


# 1.33.4

1. 修复`mongodb`的`update`错误
2. 增加`base-service`的debug日志输出
3. 修复打包`nuxt`配置时，因ts别名导致找不到用户自定义配置的问题
4. 增加`app.emitASyncWithDevid`，可携带用户token进行发送异步消息，此时所有异步消息执行上下文会自动携带用户信息


# 1.33.5
1. 方法缓存的key、clearKey方法都必须定义为箭头函数，不会再传入this（为了提高效率）



# 1.35.0
1. service增加clear方法
2. 增加工作流支持：测试


# 1.36.0

1. 增加流程分流节点
2. 增加流程设计工具: `yarn bag flow [port]` 会启动一个简易http服务,默认端口4000.


# 1.37.0

1. 增加excel导出


# 1.37.5

1. 增加数据库的incr、decr、incrBy、decrBy方法


# 1.37.16

1. 增加 insertOrUpdate 方法


# 1.37.18

1. 编译时支持指定其他tsconfig.json文件