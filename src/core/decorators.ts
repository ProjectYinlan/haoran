import { NCWebsocket } from 'node-napcat-ts'
import { EnhancedMessage } from '../typings/Message.js'

// 命令处理器类型
type CommandHandler = (ws: NCWebsocket, message: EnhancedMessage, args: string[]) => Promise<void> | void

// 参数元数据键
const PARAM_METADATA_KEY = Symbol('param_metadata')
const USAGE_METADATA_KEY = Symbol('usage_metadata')
const EXAMPLE_METADATA_KEY = Symbol('example_metadata')

// 参数类型
export enum ParamType {
  MESSAGE = 'message',
  BOT = 'bot',
  ARGS = 'args',
  CONTENT = 'content',
  SENDER = 'sender',
  GROUP_ID = 'group_id'
}

// 参数装饰器
export function Param(type: ParamType) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingParameters: { index: number, type: ParamType }[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || []

    existingParameters.push({ index: parameterIndex, type })
    Reflect.defineMetadata(PARAM_METADATA_KEY, existingParameters, target, propertyKey)
  }
}

// 快捷装饰器
export const Message = () => Param(ParamType.MESSAGE)
export const Bot = () => Param(ParamType.BOT)
export const Args = () => Param(ParamType.ARGS)
export const Content = () => Param(ParamType.CONTENT)
export const Sender = () => Param(ParamType.SENDER)
export const GroupId = () => Param(ParamType.GROUP_ID)

// 命令装饰器
export function Command(name: string, description: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor.commands) {
      target.constructor.commands = new Map()
    }

    // 获取参数元数据
    const paramMetadata: { index: number, type: ParamType }[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || []
    const usage: string | undefined = Reflect.getMetadata(USAGE_METADATA_KEY, target, propertyKey)
    const examples: string[] = Reflect.getMetadata(EXAMPLE_METADATA_KEY, target, propertyKey) || []

    // 包装原始方法
    const originalMethod = descriptor.value
    descriptor.value = async function (bot: NCWebsocket, message: EnhancedMessage, args: string[]) {
      const paramValues = new Array(paramMetadata.length)

      // 根据参数类型填充值
      for (const { index, type } of paramMetadata) {
        switch (type) {
          case ParamType.MESSAGE:
            paramValues[index] = message
            break
          case ParamType.BOT:
            paramValues[index] = bot
            break
          case ParamType.ARGS:
            paramValues[index] = args
            break
          case ParamType.CONTENT:
            paramValues[index] = message.message.reduce((text, content) => {
              if (content.type === 'text') {
                return text + content.data.text
              }
              return text
            }, "")
            break
          case ParamType.SENDER:
            paramValues[index] = message.sender
            break
          case ParamType.GROUP_ID:
            paramValues[index] = message.message_type === 'group' ? message.user_id : undefined
            break
        }
      }

      return originalMethod.apply(this, paramValues)
    }

    target.constructor.commands.set(name, {
      handler: descriptor.value,
      description,
      name,
      propertyKey,
      usage,
      examples
    })
  }
}

// 子命令装饰器
export function SubCommand(path: string | string[], description: string = '') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor.commands) {
      target.constructor.commands = new Map()
    }

    const paramMetadata: { index: number, type: ParamType }[] =
      Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey) || []
    const usage: string | undefined = Reflect.getMetadata(USAGE_METADATA_KEY, target, propertyKey)
    const examples: string[] = Reflect.getMetadata(EXAMPLE_METADATA_KEY, target, propertyKey) || []

    const originalMethod = descriptor.value
    descriptor.value = async function (bot: NCWebsocket, message: EnhancedMessage, args: string[]) {
      const paramValues = new Array(paramMetadata.length)

      for (const { index, type } of paramMetadata) {
        switch (type) {
          case ParamType.MESSAGE:
            paramValues[index] = message
            break
          case ParamType.BOT:
            paramValues[index] = bot
            break
          case ParamType.ARGS:
            paramValues[index] = args
            break
          case ParamType.CONTENT:
            paramValues[index] = message.message.reduce((text, content) => {
              if (content.type === 'text') {
                return text + content.data.text
              }
              return text
            }, "")
            break
          case ParamType.SENDER:
            paramValues[index] = message.sender
            break
          case ParamType.GROUP_ID:
            paramValues[index] = message.message_type === 'group' ? message.user_id : undefined
            break
        }
      }

      return originalMethod.apply(this, paramValues)
    }

    const segments = Array.isArray(path)
      ? path
      : path.split(' ')
    const subCommandPath = segments.map((item) => item.trim()).filter(Boolean)
    const subCommandName = subCommandPath.join(' ')

    target.constructor.commands.set(subCommandName, {
      handler: descriptor.value,
      description,
      name: subCommandName,
      propertyKey,
      usage,
      examples,
      isSubCommand: true,
      subCommandPath,
    })
  }
}

// 权限装饰器
export function Permission(permission: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor.permissions) {
      target.constructor.permissions = new Map()
    }
    target.constructor.permissions.set(propertyKey, permission)
  }
}

// 用法装饰器
export function Usage(usage: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(USAGE_METADATA_KEY, usage, target, propertyKey)
  }
}

// 示例装饰器
export function Example(example: string | string[]) {
  return function (target: any, propertyKey: string) {
    const existing: string[] = Reflect.getMetadata(EXAMPLE_METADATA_KEY, target, propertyKey) || []
    const next = Array.isArray(example) ? example : [example]
    Reflect.defineMetadata(EXAMPLE_METADATA_KEY, [...existing, ...next], target, propertyKey)
  }
}

// 私聊限制装饰器
const PRIVATE_ONLY_KEY = Symbol('private_only')
export function PrivateOnly(hint?: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(PRIVATE_ONLY_KEY, hint ?? '该命令仅限私聊使用', target, propertyKey)
  }
}

// 群聊限制装饰器
const GROUP_ONLY_KEY = Symbol('group_only')
export function GroupOnly(hint?: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(GROUP_ONLY_KEY, hint ?? '该命令仅限群聊使用', target, propertyKey)
  }
}

export const getPrivateOnlyHint = (target: any, propertyKey: string): string | undefined => {
  return Reflect.getMetadata(PRIVATE_ONLY_KEY, target, propertyKey)
}

export const getGroupOnlyHint = (target: any, propertyKey: string): string | undefined => {
  return Reflect.getMetadata(GROUP_ONLY_KEY, target, propertyKey)
}

// 模块装饰器
export function Module(name: string) {
  return function (constructor: Function) {
    (constructor as any).moduleName = name
  }
}

// 基础命令类
export abstract class BaseCommand {
  static commands: Map<string, {
    handler: CommandHandler
    description: string
    name: string
    propertyKey: string
    usage?: string
    examples?: string[]
    isSubCommand?: boolean
    subCommandPath?: string[]
  }>
  static permissions: Map<string, string>
  static moduleName: string

  get moduleName(): string {
    return (this.constructor as any).moduleName
  }

  abstract initialize(): void
} 