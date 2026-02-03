import { BaseCommand, Module, Command, Permission, Message, Args } from "../../core/decorators.js"
import { Scheduler } from "../../core/scheduler.js"
import { createLogger } from "../../logger.js"
import { EnhancedMessage } from "../../typings/Message.js"
import { Structs } from "node-napcat-ts"

const logger = createLogger('modules/scheduler-test')

@Module('cron-test')
export default class SchedulerTestModule extends BaseCommand {
  private testTaskReply?: (msg: any) => Promise<any>

  initialize() {}

  @Command('crontest', '测试定时任务')
  @Permission('scheduler-test.crontest')
  async handleCronTest(
    @Message() message: EnhancedMessage,
    @Args() args: string[]
  ) {
    const cron = args.join(' ')
    if (!cron) {
      await message.reply([Structs.text('请提供 cron 表达式\n例如: crontest */10 * * * * *')])
      return
    }

    const scheduler = Scheduler.getInstance()
    const taskId = 'scheduler-test.user-test'

    // 如果已有任务先停止
    scheduler.unregister(taskId)

    // 保存回复方法
    this.testTaskReply = message.reply.bind(message)

    try {
      scheduler.register(taskId, cron, async () => {
        const now = new Date()
        const nextRun = scheduler.getTask(taskId)?.job?.nextDate()
        await this.testTaskReply?.([
          Structs.text(`⏰ 定时任务触发\n当前: ${now.toLocaleString()}\n下次: ${nextRun?.toLocaleString() ?? '-'}`)
        ])
      })

      const nextRun = scheduler.getTask(taskId)?.job?.nextDate()
      await message.reply([Structs.text(`✅ 定时任务已启动\nCron: ${cron}\n下次执行: ${nextRun?.toLocaleString() ?? '-'}\n\n发送 cronstop 停止`)])
    } catch (error) {
      await message.reply([Structs.text(`❌ Cron 表达式无效: ${error instanceof Error ? error.message : '未知错误'}`)])
    }
  }

  @Command('cronstop', '停止测试定时任务')
  @Permission('scheduler-test.cronstop')
  async handleCronStop(@Message() message: EnhancedMessage) {
    const scheduler = Scheduler.getInstance()
    const taskId = 'scheduler-test.user-test'
    
    if (scheduler.getTask(taskId)) {
      scheduler.unregister(taskId)
      this.testTaskReply = undefined
      await message.reply([Structs.text('✅ 定时任务已停止')])
    } else {
      await message.reply([Structs.text('❌ 没有正在运行的测试任务')])
    }
  }
}
