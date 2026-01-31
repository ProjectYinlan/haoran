# 项目结构与使用说明

本文档说明项目的目录结构、模块开发方式，以及消息回复 `Structs` 的使用方法。

## 目录结构概览

```
/
  config.yaml               # 运行配置
  config.yaml.example       # 配置示例
  docs/
    structs.md              # 本文档
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
import { BaseCommand, Command, Module, Permission, Message, Args } from '../../core/decorators.js'
import { Structs } from 'node-napcat-ts'
import { EnhancedMessage } from '../../typings/Message.js'

@Module('demo')
export default class DemoModule extends BaseCommand {
  initialize() {}

  @Command('hello', '打招呼')
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
- `@Command('命令', '描述')` 定义命令名称（触发方式为 `.命令`）。
- `@Permission('permission.code')` 预留权限字段（目前未启用权限检查）。
- 参数装饰器来自 `decorators.ts`：
  - `@Message()` 完整消息
  - `@Args()` 参数数组（空格分隔）
  - `@Content()` 原始文本内容
  - `@Sender()` 发送者
  - `@GroupId()` 群号

## Structs 消息构造与回复

项目使用 `node-napcat-ts` 的 `Structs` 构造消息段，并通过 `message.reply` 发送。

常见写法：

```ts
await message.reply([
  Structs.text('pong!')
])
```

`reply` 的参数是 `SendMessageSegment[]`，可组合多个结构体。

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

## 开发与运行

- 开发模式：`pnpm dev`
- 启动：`pnpm start`

如需新增模块，建议先参考：
- 内置模块：`src/modules/utils`
- 外部模块：`src/external-modules/example`