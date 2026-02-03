import { GroupMessage, NCWebsocket, PrivateFriendMessage, PrivateGroupMessage, Structs } from 'node-napcat-ts'
import { BaseCommand, getPrivateOnlyHint, getGroupOnlyHint, getCommandOptions } from './decorators.js'
import { EnhancedMessage } from '../typings/Message.js'
import { createLogger } from '../logger.js'
import { PermissionManager } from './permissionManager.js'
import { 
  ContextManager, 
  getContextParamConfigs, 
  getContextCollectConfig,
  getContextConfirmConfig
} from './contextManager.js'

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
  noPrefix?: boolean
  regex?: RegExp
}

// 存储收集中的消息
const collectingSessions: Map<string, string[]> = new Map()

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
    const modules = new Map<string, { name: string, description?: string }>()
    for (const command of this.getCommandList()) {
      if (!modules.has(command.moduleName)) {
        modules.set(command.moduleName, {
          name: command.moduleName,
          description: (command.moduleInstance.constructor as any).moduleDescription,
        })
      }
    }
    return Array.from(modules.values())
  }

  getModuleInfo(moduleName: string) {
    const modules = this.getModules()
    return modules.find((item) => item.name === moduleName)
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
        const commandOptions = getCommandOptions(module, command.propertyKey)
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
          noPrefix: commandOptions.noPrefix,
          regex: commandOptions.regex,
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
        if (cmd.noPrefix || cmd.regex) {
          continue
        }
        return { cmd, remainingArgs: parts.slice(i) }
      }
    }
    return null
  }

  private matchNoPrefixCommand(content: string) {
    const trimmed = content.trim()
    const candidates = Array.from(this.commands.values())
      .filter(cmd => cmd.noPrefix)
      .sort((a, b) => b.name.length - a.name.length)
    for (const cmd of candidates) {
      if (trimmed === cmd.name) {
        return { cmd, remainingArgs: [] as string[] }
      }
      if (trimmed.startsWith(`${cmd.name} `)) {
        const remaining = trimmed.slice(cmd.name.length).trim()
        const args = remaining.length ? remaining.split(' ') : []
        return { cmd, remainingArgs: args }
      }
    }
    return null
  }

  private matchRegexCommand(content: string) {
    const candidates = Array.from(this.commands.values()).filter(cmd => cmd.regex)
    for (const cmd of candidates) {
      cmd.regex!.lastIndex = 0
      const match = cmd.regex!.exec(content)
      if (match) {
        return { cmd, remainingArgs: match.slice(1) }
      }
    }
    return null
  }

  async handlePlainMessage(bot: NCWebsocket, message: EnhancedMessage, content: string) {
    const resolved = this.matchNoPrefixCommand(content) ?? this.matchRegexCommand(content)
    const cmd = resolved?.cmd
    if (!cmd) return

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

    const remainingArgs = resolved?.remainingArgs ?? []

    try {
      const startAt = Date.now()
      await cmd.handler(bot, message, remainingArgs)
      logger.debug(`命令耗时: ${cmd.name} ${Date.now() - startAt}ms`)
    } catch (error) {
      logger.error('命令执行错误: ')
      logger.error(error)
      await message.reply([
        Structs.text("命令执行出错")
      ])
    }
  }

  private getSessionKey(userId: number, groupId?: number): string {
    return groupId ? `${groupId}:${userId}` : `private:${userId}`
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
      
      const remainingArgs = resolved?.remainingArgs ?? args

      // 处理 @ContextParam 装饰器
      const contextParamConfigs = getContextParamConfigs(cmd.moduleInstance, cmd.propertyKey)
      for (const config of contextParamConfigs) {
        const argIndex = config.argIndex ?? 0
        if (!remainingArgs[argIndex]) {
          // 参数缺失，进入上下文等待
          const contextManager = ContextManager.getInstance()
          await contextManager.waitForInput(
            message,
            async (bot, replyMessage, content) => {
              // 验证输入
              if (config.validator) {
                const result = config.validator(content)
                if (result !== true) {
                  const errorMsg = typeof result === 'string' ? result : '输入无效'
                  await replyMessage.reply([Structs.text(`❌ ${errorMsg}`)])
                  return
                }
              }
              // 填充参数并重新执行
              const newArgs = [...remainingArgs]
              newArgs[argIndex] = content
              await cmd.handler(bot, replyMessage, newArgs)
            },
            { prompt: config.prompt, timeout: config.timeout }
          )
          return
        }
      }

      // 处理 @ContextCollect 装饰器
      const collectConfig = getContextCollectConfig(cmd.moduleInstance, cmd.propertyKey)
      if (collectConfig) {
        const userId = message.sender.user_id
        const groupId = message.message_type === 'group' ? message.group_id : undefined
        const sessionKey = this.getSessionKey(userId, groupId)
        
        // 初始化收集会话
        collectingSessions.set(sessionKey, [])
        
        const contextManager = ContextManager.getInstance()
        
        const collectNext = async (msg: EnhancedMessage, isFirst: boolean) => {
          await contextManager.waitForInput(
            msg,
            async (bot, replyMessage, content) => {
              const messages = collectingSessions.get(sessionKey) || []
              
              // 检查是否结束
              if (content === collectConfig.stopWord) {
                collectingSessions.delete(sessionKey)
                
                // 检查最小数量
                if (collectConfig.minCount && messages.length < collectConfig.minCount) {
                  await replyMessage.reply([Structs.text(`❌ 至少需要 ${collectConfig.minCount} 条消息`)])
                  return
                }
                
                // 执行命令，注入收集到的消息
                await cmd.handler(bot, replyMessage, remainingArgs, messages)
                return
              }
              
              if (!content) {
                await replyMessage.reply([Structs.text(`❌ 内容不能为空，发送 ${collectConfig.stopWord} 结束`)])
                await collectNext(replyMessage, false)
                return
              }
              
              // 添加消息
              messages.push(content)
              collectingSessions.set(sessionKey, messages)
              
              // 检查最大数量
              if (collectConfig.maxCount && messages.length >= collectConfig.maxCount) {
                collectingSessions.delete(sessionKey)
                await replyMessage.reply([Structs.text(`✅ 已达到最大数量 ${collectConfig.maxCount}，自动结束`)])
                await cmd.handler(bot, replyMessage, remainingArgs, messages)
                return
              }
              
              // 继续收集
              if (collectConfig.continuePrompt) {
                await replyMessage.reply([Structs.text(collectConfig.continuePrompt.replace('{count}', String(messages.length)))])
              }
              await collectNext(replyMessage, false)
            },
            { 
              prompt: isFirst ? collectConfig.prompt : undefined, 
              timeout: collectConfig.timeout ?? 300000 
            }
          )
        }
        
        await collectNext(message, true)
        return
      }

      // 处理 @ContextConfirm 装饰器
      const confirmConfig = getContextConfirmConfig(cmd.moduleInstance, cmd.propertyKey)
      if (confirmConfig) {
        const contextManager = ContextManager.getInstance()
        const confirmWords = confirmConfig.confirmWords ?? ['Y', 'y', '是', '确认']
        const cancelWords = confirmConfig.cancelWords ?? ['N', 'n', '否', '取消']
        
        await contextManager.waitForInput(
          message,
          async (bot, replyMessage, content) => {
            if (confirmWords.includes(content)) {
              await cmd.handler(bot, replyMessage, remainingArgs)
            } else if (cancelWords.includes(content)) {
              const hint = confirmConfig.cancelHint ?? '已取消操作'
              await replyMessage.reply([Structs.text(hint)])
            } else {
              await replyMessage.reply([Structs.text(`❌ 请回复 ${confirmWords[0]} 确认或 ${cancelWords[0]} 取消`)])
            }
          },
          { prompt: confirmConfig.prompt, timeout: confirmConfig.timeout ?? 30000 }
        )
        return
      }

      try {
        const startAt = Date.now()
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