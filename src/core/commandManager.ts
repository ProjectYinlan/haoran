import { GroupMessage, NCWebsocket, PrivateFriendMessage, PrivateGroupMessage, Structs } from 'node-napcat-ts'
import { BaseCommand } from './decorators.js'
import { EnhancedMessage } from '../typings/Message.js'
import { createLogger } from '../logger.js'

const logger = createLogger('core/command-manager')

export class CommandManager {
  private commands: Map<string, { handler: Function, permission: string }> = new Map()
  private modules: BaseCommand[] = []

  registerModule(module: BaseCommand) {
    this.modules.push(module)
    const moduleClass = module.constructor as any

    if (moduleClass.commands) {
      for (const [name, command] of moduleClass.commands.entries()) {
        logger.debug(`注册命令: ${name}`)
        const permission = moduleClass.permissions?.get(command.handler.name) || ''
        this.commands.set(name, {
          handler: command.handler.bind(module),
          permission
        })
      }
    }

    module.initialize()
  }

  async handleCommand(bot: NCWebsocket, message: EnhancedMessage, command: string, args: string[]) {
    const cmd = this.commands.get(command)
    if (!cmd) {
      await message.reply([
        Structs.text("未知命令")
      ])
    }

    // TODO: 实现权限检查
    // if (cmd.permission && !await this.checkPermission(message.author.id, cmd.permission)) {
    //     await ws.sendMessage(message.channel_id, '你没有执行此命令的权限')
    //     return
    // }
    if (cmd) {
      logger.debug(`执行命令: ${command}${args.length ? `参数: ${args.join(' ')}` : ''}`)
      try {
        await cmd.handler(bot, message, args)
      } catch (error) {
        logger.error('命令执行错误: ')
        logger.error(error)
        await message.reply([
          Structs.text("命令执行出错")
        ])
      }
    }
  }
}