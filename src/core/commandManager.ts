import { GroupMessage, NCWebsocket, PrivateFriendMessage, PrivateGroupMessage, Structs } from 'node-napcat-ts'
import { BaseCommand } from './decorators.js'
import { EnhancedMessage } from '../typings/Message.js'
import { createLogger } from '../logger.js'
import { PermissionManager } from './permissionManager.js'

const logger = createLogger('core/command-manager')

export class CommandManager {
  private commands: Map<string, { handler: Function, permission: string }> = new Map()
  private modules: BaseCommand[] = []
  private permissionManager = new PermissionManager()

  registerModule(module: BaseCommand) {
    this.modules.push(module)
    const moduleClass = module.constructor as any

    if (moduleClass.commands) {
      for (const [name, command] of moduleClass.commands.entries()) {
        logger.debug(`注册命令: ${name}`)
        const permission = moduleClass.permissions?.get(command.propertyKey) || ''
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

    if (cmd) {
      const roles = this.permissionManager.getRoles(message)
      const source = message.message_type === 'group'
        ? `group:${message.group_id}`
        : `private:${message.sender.user_id}`
      logger.debug(`权限检查: source=${source} user=${message.sender.user_id} roles=${roles.join(',')} required=${cmd.permission || 'none'}`)
      if (cmd.permission && !this.permissionManager.hasPermission(message, cmd.permission)) {
        await message.reply([
          Structs.text("你没有执行此命令的权限")
        ])
        return
      }
      logger.debug(`执行命令: ${command}${args.length ? `参数: ${args.join(' ')}` : ''}`)
      try {
        const startAt = Date.now()
        await cmd.handler(bot, message, args)
        logger.debug(`命令耗时: ${command} ${Date.now() - startAt}ms`)
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