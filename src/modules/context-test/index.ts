import { BaseCommand, Command, SubCommand, Module, Permission, Message, Bot, Args, Collected, ContextParam, ContextCollect, ContextConfirm } from "../../core/decorators.js"
import { NCWebsocket, Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { renderTemplate } from "../../core/playwright.js"
import { getQQAvatarUrl } from "../../utils/index.js"
import { ChatHistory } from "./templates/SpeechBubble.js"

@Module('ctx')
export default class ContextTestModule extends BaseCommand {
  initialize() {}

  // 场景1: 参数缺失时自动提示
  @Command('echo', '复读消息')
  @Permission('context-test.echo')
  @ContextParam({ 
    prompt: '💬 请输入要复读的内容：',
    argIndex: 0 
  })
  async handleEcho(
    @Message() message: EnhancedMessage,
    @Args() args: string[]
  ) {
    await message.reply([Structs.text(`🔊 ${args[0]}`)])
  }

  // 场景2: 多轮收集
  @Command('say', '多轮对话收集')
  @Permission('context-test.say')
  @ContextCollect({
    stopWord: '#stop',
    prompt: '💬 开始多轮对话收集！\n请回复消息输入内容，发送 #stop 结束并生成图片：',
    continuePrompt: '✅ 已记录第 {count} 条，继续输入或发送 #stop 结束',
    timeout: 300000,
    minCount: 1,
  })
  async handleSay(
    @Message() message: EnhancedMessage,
    @Collected() collected: string[]
  ) {
    const nickname = message.sender.nickname || message.sender.card || String(message.sender.user_id)
    const avatarUrl = getQQAvatarUrl(message.sender.user_id, 100)

    const messages = collected.map(content => ({
      avatarUrl,
      nickname,
      content
    }))

    const image = await renderTemplate(
      ChatHistory({ messages }),
      { width: 400, height: 'auto', minHeight: 100 }
    )

    await message.reply([Structs.image(image)])
  }

  // 场景3: 确认操作
  @Command('test-confirm', '测试确认')
  @Permission('context-test.confirm')
  @ContextConfirm({
    prompt: '⚠️ 确定要执行此操作吗？回复 Y 确认，N 取消',
    cancelHint: '❌ 已取消操作'
  })
  async handleConfirm(
    @Message() message: EnhancedMessage,
  ) {
    await message.reply([Structs.text('✅ 操作已执行！')])
  }

  // 场景4: 带验证的参数
  @Command('set-age', '设置年龄')
  @Permission('context-test.age')
  @ContextParam({
    prompt: '请输入你的年龄（1-150）：',
    argIndex: 0,
    validator: (value) => {
      const age = parseInt(value)
      if (isNaN(age)) return '请输入数字'
      if (age < 1 || age > 150) return '年龄必须在 1-150 之间'
      return true
    }
  })
  async handleSetAge(
    @Message() message: EnhancedMessage,
    @Args() args: string[]
  ) {
    await message.reply([Structs.text(`✅ 已设置年龄为 ${args[0]} 岁`)])
  }

  // ========== SubCommand 测试 ==========

  // .ctx test - 基础子命令
  @SubCommand('test', '子命令测试')
  @Permission('context-test.sub')
  async handleSubTest(
    @Message() message: EnhancedMessage,
  ) {
    await message.reply([Structs.text('✅ SubCommand 基础测试通过！')])
  }

  // .ctx param <text> - 子命令 + ContextParam
  @SubCommand('param', '子命令参数测试')
  @Permission('context-test.sub')
  @ContextParam({
    prompt: '💬 请输入参数：',
    argIndex: 0
  })
  async handleSubParam(
    @Message() message: EnhancedMessage,
    @Args() args: string[]
  ) {
    await message.reply([Structs.text(`✅ SubCommand 参数: ${args[0]}`)])
  }

  // .ctx collect - 子命令 + ContextCollect
  @SubCommand('collect', '子命令收集测试')
  @Permission('context-test.sub')
  @ContextCollect({
    stopWord: '#done',
    prompt: '📝 子命令收集模式，发送 #done 结束：',
    continuePrompt: '✅ 第 {count} 条',
    minCount: 1
  })
  async handleSubCollect(
    @Message() message: EnhancedMessage,
    @Collected() collected: string[]
  ) {
    await message.reply([Structs.text(`✅ 收集到 ${collected.length} 条:\n${collected.map((c, i) => `${i + 1}. ${c}`).join('\n')}`)])
  }

  // .ctx confirm - 子命令 + ContextConfirm
  @SubCommand('confirm', '子命令确认测试')
  @Permission('context-test.sub')
  @ContextConfirm({
    prompt: '⚠️ 子命令确认测试，回复 Y 确认：',
    cancelHint: '❌ 子命令已取消'
  })
  async handleSubConfirm(
    @Message() message: EnhancedMessage,
  ) {
    await message.reply([Structs.text('✅ SubCommand 确认通过！')])
  }
}
