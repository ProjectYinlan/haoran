import { GroupMessage, NCWebsocket, PrivateFriendMessage, PrivateGroupMessage, Structs } from 'node-napcat-ts'
import { BaseCommand, getPrivateOnlyHint, getGroupOnlyHint } from './decorators.js'
import { EnhancedMessage } from '../typings/Message.js'
import { createLogger } from '../logger.js'
import { PermissionManager } from './permissionManager.js'

const logger = createLogger('core/command-manager')

type CommandInfo = {
  handler: Function
  permission: string
  name: string
  description: string
  moduleName: string
  usage?: string
  examples?: string[]
  isSubCommand?: boolean
  parentCommand?: string
  subCommandPath?: string[]
  propertyKey: string
  moduleInstance: BaseCommand
}

export class CommandManager {
  private static instance?: CommandManager
  private commands: Map<string, CommandInfo> = new Map()
  private modules: BaseCommand[] = []
  private permissionManager = new PermissionManager()

  constructor() {
    CommandManager.instance ??= this
  }

  static getInstance() {
    return CommandManager.instance
  }

  getCommandList() {
    return Array.from(this.commands.values())
  }

  getModules() {
    return Array.from(new Set(this.getCommandList().map((command) => command.moduleName)))
  }

  getCommandsByModule(moduleName: string) {
    return this.getCommandList().filter((command) => command.moduleName === moduleName)
  }

  getCommandByName(name: string) {
    return this.commands.get(name)
  }

  registerModule(module: BaseCommand) {
    this.modules.push(module)
    const moduleClass = module.constructor as any
    const moduleName = module.moduleName || moduleClass.moduleName || 'unknown'

    if (moduleClass.commands) {
      for (const [name, command] of moduleClass.commands.entries()) {
        const isSubCommand = Boolean(command.isSubCommand)
        const subPath = command.subCommandPath ?? []
        const fullName = isSubCommand
          ? [moduleName, ...subPath].join(' ').trim()
          : name
        logger.debug(`注册命令: ${fullName}`)
        const permission = moduleClass.permissions?.get(command.propertyKey) || ''
        this.commands.set(fullName, {
          handler: command.handler.bind(module),
          permission,
          name: fullName,
          description: command.description || '',
          moduleName,
          usage: command.usage,
          examples: command.examples,
          isSubCommand,
          parentCommand: isSubCommand ? moduleName : undefined,
          subCommandPath: isSubCommand ? subPath : undefined,
          propertyKey: command.propertyKey,
          moduleInstance: module,
        })
      }
    }

    module.initialize()
  }

  private resolveCommand(command: string, args: string[]) {
    const parts = [command, ...args]
    for (let i = parts.length; i >= 1; i -= 1) {
      const name = parts.slice(0, i).join(' ')
      const cmd = this.commands.get(name)
      if (cmd) {
        return { cmd, remainingArgs: parts.slice(i) }
      }
    }
    return null
  }

  async handleCommand(bot: NCWebsocket, message: EnhancedMessage, command: string, args: string[]) {
    const resolved = this.resolveCommand(command, args)
    const cmd = resolved?.cmd
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

      // 检查私聊/群聊限制
      const privateOnlyHint = getPrivateOnlyHint(cmd.moduleInstance, cmd.propertyKey)
      if (privateOnlyHint && message.message_type !== 'private') {
        await message.reply([Structs.text(privateOnlyHint)])
        return
      }
      const groupOnlyHint = getGroupOnlyHint(cmd.moduleInstance, cmd.propertyKey)
      if (groupOnlyHint && message.message_type !== 'group') {
        await message.reply([Structs.text(groupOnlyHint)])
        return
      }

      logger.debug(`执行命令: ${command}${args.length ? `参数: ${args.join(' ')}` : ''}`)
      try {
        const startAt = Date.now()
        const remainingArgs = resolved?.remainingArgs ?? args
        await cmd.handler(bot, message, remainingArgs)
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