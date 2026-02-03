import { NCWebsocket, Structs } from 'node-napcat-ts'
import { EnhancedMessage } from '../typings/Message.js'
import { createLogger } from '../logger.js'

const logger = createLogger('core/context-manager')

export type ContextHandler = (
  bot: NCWebsocket,
  message: EnhancedMessage,
  content: string
) => Promise<void> | void

export type PendingContext = {
  userId: number
  groupId?: number
  handler: ContextHandler
  prompt?: string
  expiresAt: number
  messageId?: number  // 机器人发送的提示消息 ID，用于匹配回复
}

const DEFAULT_TIMEOUT = 60 * 1000  // 默认 60 秒超时

export class ContextManager {
  private static instance?: ContextManager
  private contexts: Map<string, PendingContext> = new Map()

  static getInstance() {
    ContextManager.instance ??= new ContextManager()
    return ContextManager.instance
  }

  private getKey(userId: number, groupId?: number): string {
    return groupId ? `${groupId}:${userId}` : `private:${userId}`
  }

  /**
   * 等待用户输入
   * @param message 原始消息
   * @param handler 收到回复后的处理函数
   * @param options 配置项
   */
  async waitForInput(
    message: EnhancedMessage,
    handler: ContextHandler,
    options?: {
      prompt?: string
      timeout?: number
    }
  ): Promise<number | undefined> {
    const userId = message.sender.user_id
    const groupId = message.message_type === 'group' ? message.group_id : undefined
    const key = this.getKey(userId, groupId)
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT

    // 发送提示消息
    let messageId: number | undefined
    if (options?.prompt) {
      const result = await message.reply([Structs.text(options.prompt)])
      messageId = result.message_id
    }

    // 存储上下文
    this.contexts.set(key, {
      userId,
      groupId,
      handler,
      prompt: options?.prompt,
      expiresAt: Date.now() + timeout,
      messageId
    })

    logger.debug(`创建上下文: ${key}, 超时: ${timeout}ms`)

    // 设置超时清理
    setTimeout(() => {
      const ctx = this.contexts.get(key)
      if (ctx && ctx.expiresAt <= Date.now()) {
        this.contexts.delete(key)
        logger.debug(`上下文超时: ${key}`)
      }
    }, timeout + 100)

    return messageId
  }

  /**
   * 检查消息是否是对上下文的回复
   * @returns 如果是上下文回复返回 true，否则返回 false
   */
  async handleMessage(
    bot: NCWebsocket,
    message: EnhancedMessage
  ): Promise<boolean> {
    const userId = message.sender.user_id
    const groupId = message.message_type === 'group' ? message.group_id : undefined
    const key = this.getKey(userId, groupId)

    const ctx = this.contexts.get(key)
    if (!ctx) return false

    // 检查是否过期
    if (ctx.expiresAt <= Date.now()) {
      this.contexts.delete(key)
      return false
    }

    // 检查是否是回复消息（如果有 messageId）
    if (ctx.messageId) {
      const replySegment = message.message.find(m => m.type === 'reply')
      if (!replySegment || Number(replySegment.data.id) !== ctx.messageId) {
        return false  // 不是回复机器人的消息，不处理
      }
    }

    // 提取文本内容
    const content = message.message
      .filter(m => m.type === 'text')
      .map(m => m.data.text)
      .join('')
      .trim()

    // 清除上下文
    this.contexts.delete(key)
    logger.debug(`处理上下文回复: ${key}`)

    // 执行处理函数
    try {
      await ctx.handler(bot, message, content)
    } catch (error) {
      logger.error({ err: error }, `上下文处理失败: ${key}`)
    }

    return true
  }

  /**
   * 取消等待
   */
  cancel(userId: number, groupId?: number) {
    const key = this.getKey(userId, groupId)
    this.contexts.delete(key)
    logger.debug(`取消上下文: ${key}`)
  }

  /**
   * 检查用户是否有待处理的上下文
   */
  hasPending(userId: number, groupId?: number): boolean {
    const key = this.getKey(userId, groupId)
    const ctx = this.contexts.get(key)
    return ctx !== undefined && ctx.expiresAt > Date.now()
  }
}

// ==================== 装饰器系统 ====================

// 元数据 Keys
const CONTEXT_PARAM_KEY = Symbol('context:param')
const CONTEXT_COLLECT_KEY = Symbol('context:collect')
const CONTEXT_CONFIRM_KEY = Symbol('context:confirm')

/**
 * 场景1: 参数缺失时自动提示输入
 * 当指定的参数位置为空时，自动进入上下文等待用户输入
 */
export type ContextParamConfig = {
  /** 提示消息 */
  prompt: string
  /** 参数索引，默认 0 */
  argIndex?: number
  /** 超时时间(ms)，默认 60s */
  timeout?: number
  /** 验证函数，返回 true 通过，返回字符串为错误提示 */
  validator?: (value: string) => boolean | string
}

export function ContextParam(config: ContextParamConfig) {
  return function (target: any, propertyKey: string) {
    const existing = Reflect.getMetadata(CONTEXT_PARAM_KEY, target, propertyKey) || []
    existing.push(config)
    Reflect.defineMetadata(CONTEXT_PARAM_KEY, existing, target, propertyKey)
  }
}

export function getContextParamConfigs(target: any, propertyKey: string): ContextParamConfig[] {
  return Reflect.getMetadata(CONTEXT_PARAM_KEY, target, propertyKey) || []
}

/**
 * 场景2: 多轮收集，直到特定结束词
 */
export type ContextCollectConfig = {
  /** 结束词 */
  stopWord: string
  /** 初始提示 */
  prompt: string
  /** 每次收集后的提示，可选 */
  continuePrompt?: string
  /** 超时时间(ms)，默认 5 分钟 */
  timeout?: number
  /** 最小收集数量 */
  minCount?: number
  /** 最大收集数量 */
  maxCount?: number
}

export function ContextCollect(config: ContextCollectConfig) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(CONTEXT_COLLECT_KEY, config, target, propertyKey)
  }
}

export function getContextCollectConfig(target: any, propertyKey: string): ContextCollectConfig | undefined {
  return Reflect.getMetadata(CONTEXT_COLLECT_KEY, target, propertyKey)
}

/**
 * 场景3: 确认操作
 */
export type ContextConfirmConfig = {
  /** 确认提示 */
  prompt: string
  /** 确认词，默认 ['Y', 'y', '是', '确认'] */
  confirmWords?: string[]
  /** 取消词，默认 ['N', 'n', '否', '取消'] */
  cancelWords?: string[]
  /** 超时时间(ms)，默认 30s */
  timeout?: number
  /** 取消时的提示 */
  cancelHint?: string
}

export function ContextConfirm(config: ContextConfirmConfig) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(CONTEXT_CONFIRM_KEY, config, target, propertyKey)
  }
}

export function getContextConfirmConfig(target: any, propertyKey: string): ContextConfirmConfig | undefined {
  return Reflect.getMetadata(CONTEXT_CONFIRM_KEY, target, propertyKey)
}
