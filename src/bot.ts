import { NCWebsocket } from 'node-napcat-ts'
import { configManager } from './config.js'
import { CommandManager } from './core/commandManager.js'
import { ModuleLoader } from './core/moduleLoader.js'
import { Scheduler } from './core/scheduler.js'
import { ContextManager } from './core/contextManager.js'
import { Message, EnhancedMessage } from './typings/Message.js'
import { createLogger } from './logger.js'

const logger = createLogger('bot')

export async function connect() {
  try {
    const bot = new NCWebsocket(configManager.config.ob, false)
    const commandManager = new CommandManager()
    const moduleLoader = ModuleLoader.getInstance(commandManager)
    // 加载所有模块
    moduleLoader.loadModules()

    bot.on('message', async (message: Message) => {
      // 忽略群临时会话
      if (configManager.config.bot?.ignoreGroupPrivate && message.message_type === 'private' && (message as any).sub_type === 'group') {
        return
      }

      // 二次封装 message
      const enhancedMessage: EnhancedMessage = {
        ...message,
        reply: async (replyMessage) => {
          return await bot.send_msg({
            user_id: message.sender.user_id,
            group_id: message.message_type === 'group' ? message.group_id : undefined,
            message: replyMessage
          });
        },
        getQuoteMessage: async () => {
          const quoteMessage = message.message.find(m => m.type === 'reply')
          if (!quoteMessage) return
          const rawQuoteMessage = await bot.get_msg({
            message_id: Number(quoteMessage.data.id)
          })
          return rawQuoteMessage
        }
      };

      // 优先检查上下文回复
      const contextManager = ContextManager.getInstance()
      const isContextReply = await contextManager.handleMessage(bot, enhancedMessage)
      if (isContextReply) return

      // 检查命令前缀
      const globalPrefix = configManager.config.command?.globalPrefix || '.'
      const msg = message.message.reduce((text, content) => {
        if (content.type === 'text') {
          return text + content.data.text
        }
        return text
      }, "")

      if (!msg.startsWith(globalPrefix || '.')) return

      const [command, ...args] = msg
        .slice(globalPrefix.length)
        .trim()
        .split(' ')

      await commandManager.handleCommand(bot, enhancedMessage, command, args)
    })

    await bot.connect()
    logger.info("Onebot 连接成功")

    // 设置 Scheduler 的 bot 实例
    Scheduler.getInstance().setBot(bot)

    logger.info(`登录账号=${(await bot.get_login_info()).user_id}, 好友数=${(await bot.get_friend_list()).length}, 群聊数=${(await bot.get_group_list()).length}`)
  } catch (error) {
    logger.error({ err: error }, "Onebot 连接失败")
    process.exit(1)
  }
}