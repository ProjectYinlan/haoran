# 项目结构与使用说明

本文档说明项目的目录结构、模块开发方式，以及消息回复 `Structs` 的使用方法，并提供相关文档索引指引。

## 目录结构概览

```
/
  config.yaml               # 运行配置
  config.yaml.example       # 配置示例
  docs/
    structs.md              # 本文档
    permission.md           # 权限系统（RBAC）
    template.md             # 模板渲染与预览
  src/
    index.ts                # 入口：初始化数据库并启动机器人
    bot.ts                  # 连接 Onebot，监听消息并派发命令
    config.ts               # 读取/校验 config.yaml
    logger.ts               # 日志
    core/
      decorators.ts         # 命令与参数装饰器
      commandManager.ts     # 命令注册/执行
      moduleLoader.ts       # 模块加载（内置 + 外部）
      database.ts           # 数据库初始化
      permissionManager.ts  # 权限系统（RBAC）
      playwright.ts         # 模板渲染（图片）
    modules/                # 内置模块
      utils/                # 示例：ping/last-ping
      question/             # 示例：LLM 问答
    external-modules/       # 外部模块（同结构，按需拓展）
      example/              # 外部模块示例
    typings/
      Message.ts            # 消息类型增强
```

## 启动流程

1. `src/index.ts` 初始化数据库 `createDataSource()`。
2. `src/bot.ts` 连接 Onebot，监听消息。
3. `ModuleLoader` 从 `src/modules` 与 `src/external-modules` 加载模块。
4. `CommandManager` 注册命令，并在收到命令时分发执行。

## 模块开发方式

模块放在 `src/modules/<模块名>/index.ts` 或 `src/external-modules/<模块名>/index.ts`。

### 基本模板

```ts
import { BaseCommand, Command, Module, Permission, Message, Args, Usage, Example } from '../../core/decorators.js'
import { Structs } from 'node-napcat-ts'
import { EnhancedMessage } from '../../typings/Message.js'

@Module('demo')
export default class DemoModule extends BaseCommand {
  initialize() {}

  @Command('hello', '打招呼')
  @Usage('.hello <昵称>')
  @Example('.hello haoran')
  @Permission('demo.hello')
  async handleHello(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    await message.reply([
      Structs.text(`你好，${message.sender.nickname}！`)
    ])
  }
}
```

说明：
- `@Module('name')` 定义模块名。
- `@ModuleDescription('说明')` 定义模块说明（用于 help 展示玩法/用途）。
- `@Command('命令', '描述')` 定义命令名称（触发方式为 `.命令`）。
- `@NoPrefixCommand('命令', '描述')` 定义**无前缀**命令（直接文本匹配）。
- `@RegexCommand(/正则/, '描述')` 定义**正则命令**（消息全文匹配）。
- `@Usage('用法')` 描述指令用法（用于 help 展示）。
- `@Example('示例')` 描述指令示例（可重复多次，用于 help 展示），当命令用法并没有参数时，不推荐编写示例。
- `@Permission('permission.code')` 为命令添加权限标识，RBAC 会在执行前校验。
- 参数装饰器来自 `decorators.ts`：
  - `@Message()` 完整消息
  - `@Args()` 参数数组（空格分隔）
  - `@Content()` 原始文本内容
  - `@Sender()` 发送者
  - `@GroupId()` 群号
  - `@At()` 被 @ 的用户 ID 列表

全局命令前缀在 `config.yaml` 中可以进行配置，默认为 `.`。无前缀命令与正则命令会在**未以命令前缀开头**时进行匹配。

## help 指令

内置在 `utils` 模块，使用方式：

- `.help` 列出可用模块
- `.help <module>` 列出该模块下所有命令的描述、用法、示例与**命令匹配方式**
- `.help <command>` 显示该命令的描述、用法、示例与所属模块（含无前缀/正则命令的匹配说明）

## Structs 消息构造与回复

项目使用 `node-napcat-ts` 的 `Structs` 构造消息段，并通过 `message.reply` 发送。

常见写法：

```ts
await message.reply([
  Structs.text('pong!')
])
```

`reply` 的参数是 `SendMessageSegment[]`，可组合多个结构体。

## 模板渲染（图片）

模板图片渲染由 `src/core/playwright.ts` 提供，业务模块直接传入组件：

```ts
await message.reply([
  Structs.image(await renderTemplate(YourTemplate({
    // 组件 props
  })))
])
```

渲染过程不会通过 URL 路由或 query 传参，数据通过 props 直接传入组件。

更完整的模板渲染/预览说明见 `docs/template.md`（包含预览入口、模板扫描目录、组件约定与环境变量）。

## 配置与模块配置

配置文件为 `config.yaml`，入口读取在 `src/config.ts`。

模块配置统一放在 `modules` 字段下，示例：

```yaml
modules:
  question:
    enabled: true
    llm:
      baseURL: https://your-llm.example
      apiKey: sk-xxx
      model: gpt-4o-mini
```

模块配置的校验与读取可参考 `src/modules/question/schema.ts`。

## 权限系统（RBAC）

权限管理由 `src/core/permissionManager.ts` 提供，命令可通过 `@Permission('xxx.yyy')` 标注权限标识，执行前会进行 RBAC 校验。

完整规则与配置示例见 `docs/permission.md`（角色定义、匹配规则、默认权限与配置字段）。

## 开发与运行

- 开发模式：`pnpm dev`
- 启动：`pnpm start`

如需新增模块，建议先参考：
- 内置模块：`src/modules/utils`
- 外部模块：`src/external-modules/example`