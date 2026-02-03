# 上下文管理器

支持多轮对话的上下文管理系统，通过装饰器简化常见的交互场景。

## 快速开始

```typescript
import { BaseCommand, Command, Module, Message, Args, Collected, ContextParam, ContextCollect, ContextConfirm } from "../../core/decorators.js"

@Module('my-module')
export default class MyModule extends BaseCommand {
  initialize() {}

  // 参数缺失时自动提示
  @Command('bind', '绑定 token')
  @ContextParam({ prompt: '请输入你的 token：', argIndex: 0 })
  async handleBind(@Message() msg, @Args() args: string[]) {
    // args[0] 保证有值
  }

  // 多轮收集
  @Command('note', '记录笔记')
  @ContextCollect({ stopWord: '#done', prompt: '请输入内容，发送 #done 结束' })
  async handleNote(@Message() msg, @Collected() items: string[]) {
    // items 是收集到的所有内容
  }

  // 确认操作
  @Command('delete', '删除数据')
  @ContextConfirm({ prompt: '确定删除吗？回复 Y 确认' })
  async handleDelete(@Message() msg) {
    // 只有确认后才执行
  }
}
```

## 装饰器

### @ContextParam

参数缺失时自动提示用户输入。

```typescript
@ContextParam({
  prompt: string,           // 提示消息
  argIndex?: number,        // 参数索引，默认 0
  timeout?: number,         // 超时(ms)，默认 60s
  validator?: (value: string) => boolean | string  // 验证函数
})
```

示例：

```typescript
@Command('set-name', '设置名称')
@ContextParam({ 
  prompt: '请输入名称：',
  argIndex: 0,
  validator: (v) => v.length >= 2 || '名称至少 2 个字符'
})
async handleSetName(@Message() msg, @Args() args: string[]) {
  await msg.reply([Structs.text(`✅ 名称已设置为: ${args[0]}`)])
}
```

### @ContextCollect

多轮收集消息，直到用户发送结束词。

```typescript
@ContextCollect({
  stopWord: string,         // 结束词
  prompt: string,           // 初始提示
  continuePrompt?: string,  // 每次收集后的提示，{count} 会替换为数量
  timeout?: number,         // 超时(ms)，默认 5 分钟
  minCount?: number,        // 最小收集数量
  maxCount?: number         // 最大收集数量
})
```

使用 `@Collected()` 装饰器注入收集到的消息数组：

```typescript
@Command('todo', '添加待办')
@ContextCollect({
  stopWord: '#done',
  prompt: '📝 请输入待办事项，发送 #done 结束：',
  continuePrompt: '✅ 已添加第 {count} 条',
  minCount: 1,
  maxCount: 10
})
async handleTodo(@Message() msg, @Collected() items: string[]) {
  await msg.reply([Structs.text(`已添加 ${items.length} 条待办`)])
}
```

### @ContextConfirm

确认操作，用户确认后才执行。

```typescript
@ContextConfirm({
  prompt: string,           // 确认提示
  confirmWords?: string[],  // 确认词，默认 ['Y', 'y', '是', '确认']
  cancelWords?: string[],   // 取消词，默认 ['N', 'n', '否', '取消']
  timeout?: number,         // 超时(ms)，默认 30s
  cancelHint?: string       // 取消时的提示
})
```

示例：

```typescript
@Command('reset', '重置数据')
@ContextConfirm({
  prompt: '⚠️ 此操作不可恢复，确定重置吗？回复 Y 确认',
  cancelHint: '❌ 已取消重置'
})
async handleReset(@Message() msg) {
  // 重置逻辑
  await msg.reply([Structs.text('✅ 数据已重置')])
}
```

## SubCommand 支持

上下文装饰器同样适用于子命令：

```typescript
@Module('config')
export default class ConfigModule extends BaseCommand {
  initialize() {}

  @SubCommand('set', '设置配置')
  @ContextParam({ prompt: '请输入配置值：', argIndex: 0 })
  async handleSet(@Message() msg, @Args() args: string[]) {
    // .config set 或 .config set <value>
  }

  @SubCommand('import', '导入配置')
  @ContextCollect({ stopWord: '#end', prompt: '请输入配置项，#end 结束' })
  async handleImport(@Message() msg, @Collected() items: string[]) {
    // .config import
  }

  @SubCommand('reset', '重置配置')
  @ContextConfirm({ prompt: '确定重置？回复 Y 确认' })
  async handleReset(@Message() msg) {
    // .config reset
  }
}
```

## 手动使用 ContextManager

对于更复杂的场景，可以直接使用 ContextManager：

```typescript
import { ContextManager } from "../../core/contextManager.js"

@Command('wizard', '向导')
async handleWizard(@Message() msg, @Bot() bot: NCWebsocket) {
  const ctx = ContextManager.getInstance()
  
  await ctx.waitForInput(
    msg,
    async (bot, replyMsg, content) => {
      // 处理用户回复
      if (content === 'cancel') {
        await replyMsg.reply([Structs.text('已取消')])
        return
      }
      
      // 继续下一步
      await ctx.waitForInput(
        replyMsg,
        async (bot, msg2, content2) => {
          await msg2.reply([Structs.text(`步骤1: ${content}, 步骤2: ${content2}`)])
        },
        { prompt: '请输入第二步内容：' }
      )
    },
    { prompt: '请输入第一步内容（输入 cancel 取消）：', timeout: 120000 }
  )
}
```

## ContextManager API

```typescript
import { ContextManager } from "../../core/contextManager.js"

const ctx = ContextManager.getInstance()

// 等待用户输入
await ctx.waitForInput(
  message,                    // 原始消息
  handler,                    // 回调函数 (bot, replyMessage, content) => void
  { prompt?, timeout? }       // 配置项
)

// 取消等待
ctx.cancel(userId, groupId?)

// 检查是否有待处理的上下文
ctx.hasPending(userId, groupId?)
```

## 工作原理

1. 用户发送命令，触发上下文装饰器
2. 机器人发送提示消息并记录 `messageId`
3. 用户回复该消息时，`bot.ts` 中的消息处理优先检查上下文
4. 匹配到上下文后执行对应的 handler，不走命令解析

关键点：
- 上下文通过**回复消息**触发，不是普通消息
- 每个用户在每个群/私聊中只能有一个待处理的上下文
- 超时后上下文自动清理

## 注意事项

1. 上下文基于回复消息匹配，用户必须回复机器人的提示消息
2. 同一用户同一场景只能有一个活跃的上下文
3. 超时后上下文自动失效
4. `@Collected()` 只在 `@ContextCollect` 场景下有值
5. 验证失败时会提示错误但不会重新进入上下文
