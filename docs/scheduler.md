# 定时任务调度器

基于 `cron` 库实现的定时任务系统，支持通过装饰器声明式定义定时任务。

## 快速开始

在模块中使用 `@Cron` 装饰器标记方法为定时任务，使用 `@CronBot()` 注入 bot 实例：

```typescript
import { BaseCommand, Module } from "../../core/decorators.js"
import { Cron, CronBot } from "../../core/scheduler.js"
import { NCWebsocket, Structs } from "node-napcat-ts"

@Module('my-module')
export default class MyModule extends BaseCommand {
  initialize() {}

  @Cron('0 9 * * *')  // 每天 9:00
  async dailyReport(@CronBot() bot: NCWebsocket) {
    await bot.send_group_msg({
      group_id: 123456,
      message: [Structs.text('早上好！')]
    })
  }

  @Cron('*/5 * * * *', 'health-check')  // 每 5 分钟，自定义 ID
  async checkHealth(@CronBot() bot: NCWebsocket) {
    // 执行健康检查
  }
}
```

## Cron 表达式

支持标准 cron 表达式（5 位）和扩展表达式（6 位，含秒）：

### 5 位表达式（分钟级）

```
┌───────────── 分钟 (0-59)
│ ┌───────────── 小时 (0-23)
│ │ ┌───────────── 日 (1-31)
│ │ │ ┌───────────── 月 (1-12)
│ │ │ │ ┌───────────── 星期 (0-7, 0 和 7 都是周日)
│ │ │ │ │
* * * * *
```

### 6 位表达式（秒级）

```
┌───────────── 秒 (0-59)
│ ┌───────────── 分钟 (0-59)
│ │ ┌───────────── 小时 (0-23)
│ │ │ ┌───────────── 日 (1-31)
│ │ │ │ ┌───────────── 月 (1-12)
│ │ │ │ │ ┌───────────── 星期 (0-7)
│ │ │ │ │ │
* * * * * *
```

### 常用表达式

| 表达式 | 说明 |
|--------|------|
| `* * * * *` | 每分钟 |
| `*/5 * * * *` | 每 5 分钟 |
| `0 * * * *` | 每小时整点 |
| `0 9 * * *` | 每天 9:00 |
| `0 9 * * 1` | 每周一 9:00 |
| `0 0 1 * *` | 每月 1 号 0:00 |
| `*/30 * * * * *` | 每 30 秒（6 位） |
| `0 */10 * * * *` | 每 10 分钟整（6 位） |

## 装饰器

### @Cron(expression, id?)

标记方法为定时任务。

- `expression`: Cron 表达式
- `id`: 可选，任务 ID（默认使用方法名）

任务 ID 格式为 `模块名.id`，如 `my-module.health-check`。

### @CronBot()

参数装饰器，注入 bot 实例。

```typescript
@Cron('0 18 * * *')
async task(@CronBot() bot: NCWebsocket) {
  await bot.send_group_msg({ ... })
}
```

## 使用场景

### 场景 1: 静态定时任务

```typescript
@Cron('0 * * * *', 'hourly-report')
async hourlyTask(@CronBot() bot: NCWebsocket) {
  await bot.send_group_msg({
    group_id: 123456,
    message: [Structs.text(`🕐 整点报时: ${new Date().getHours()}:00`)]
  })
}

@Cron('0 9 * * *', 'morning-greeting')
async morningGreeting(@CronBot() bot: NCWebsocket) {
  await bot.send_group_msg({
    group_id: 123456,
    message: [Structs.text('☀️ 早上好！')]
  })
}
```

### 场景 2: 动态注册任务

```typescript
import { Scheduler } from "../../core/scheduler.js"

@Command('schedule-add', '添加定时任务')
async handleAdd(
  @Message() message: EnhancedMessage,
  @Args() args: string[],
) {
  const taskId = args[0]
  const cron = args.slice(1).join(' ')
  
  const scheduler = Scheduler.getInstance()
  scheduler.register(`my-module.${taskId}`, cron, async (bot) => {
    await message.reply([Structs.text(`⏰ 任务 [${taskId}] 触发`)])
  })
}

@Command('schedule-remove', '移除定时任务')
async handleRemove(@Args() args: string[]) {
  Scheduler.getInstance().unregister(`my-module.${args[0]}`)
}
```

### 场景 3: 群订阅推送

```typescript
const subscribedGroups = new Set<number>()

@Cron('0 9 * * *')
async dailyPush(@CronBot() bot: NCWebsocket) {
  for (const groupId of subscribedGroups) {
    await bot.send_group_msg({
      group_id: groupId,
      message: [Structs.text('📢 每日推送')]
    }).catch(() => {})
  }
}

@Command('subscribe', '订阅推送')
async handleSubscribe(@Message() message: EnhancedMessage) {
  if (message.message_type === 'group') {
    subscribedGroups.add(message.group_id)
  }
}
```

## Scheduler API

```typescript
import { Scheduler } from "../../core/scheduler.js"

const scheduler = Scheduler.getInstance()

// 注册任务（回调接收 bot 参数）
scheduler.register('task-id', '* * * * *', async (bot) => {
  await bot.send_group_msg({ ... })
})

// 注销任务
scheduler.unregister('task-id')

// 获取任务
const task = scheduler.getTask('task-id')
task?.job?.nextDate()  // 下次执行时间

// 获取所有任务
scheduler.getAllTasks()

// 获取 bot 实例
scheduler.getBot()

// 停止所有任务
scheduler.stopAll()
```

## 注意事项

1. 定时任务在模块加载时自动注册
2. 任务执行错误会被捕获并记录日志，不会影响后续执行
3. 同一 ID 的任务重复注册会覆盖之前的任务
4. 使用 6 位表达式可实现秒级调度
5. Bot 实例在连接成功后自动设置到 Scheduler
