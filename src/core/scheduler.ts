import { CronJob } from 'cron'
import { NCWebsocket } from 'node-napcat-ts'
import { createLogger } from '../logger.js'
import { ParamType } from './decorators.js'

const logger = createLogger('core/scheduler')

export type CronHandler = (bot: NCWebsocket) => void | Promise<void>

export type ScheduledTask = {
  id: string
  cron: string
  handler: CronHandler
  job?: CronJob
}

export class Scheduler {
  private static instance?: Scheduler
  private tasks: Map<string, ScheduledTask> = new Map()
  private bot?: NCWebsocket

  static getInstance() {
    Scheduler.instance ??= new Scheduler()
    return Scheduler.instance
  }

  setBot(bot: NCWebsocket) {
    this.bot = bot
  }

  getBot(): NCWebsocket | undefined {
    return this.bot
  }

  register(id: string, cron: string, handler: CronHandler) {
    if (this.tasks.has(id)) {
      logger.warn(`任务 ${id} 已存在，将被覆盖`)
      this.unregister(id)
    }

    const job = new CronJob(cron, async () => {
      if (!this.bot) {
        logger.warn(`定时任务 ${id} 执行失败: Bot 实例未设置`)
        return
      }
      try {
        logger.debug(`执行定时任务: ${id}`)
        await handler(this.bot)
      } catch (error) {
        logger.error({ err: error }, `定时任务执行失败: ${id}`)
      }
    })

    const task: ScheduledTask = { id, cron, handler, job }
    this.tasks.set(id, task)
    job.start()
    logger.info(`注册定时任务: ${id} (${cron})`)
  }

  unregister(id: string) {
    const task = this.tasks.get(id)
    if (task) {
      task.job?.stop()
      this.tasks.delete(id)
      logger.info(`注销定时任务: ${id}`)
    }
  }

  getTask(id: string) {
    return this.tasks.get(id)
  }

  getAllTasks() {
    return Array.from(this.tasks.values())
  }

  stopAll() {
    for (const task of this.tasks.values()) {
      task.job?.stop()
    }
    this.tasks.clear()
    logger.info('已停止所有定时任务')
  }
}

// 定时任务装饰器元数据
const CRON_METADATA_KEY = Symbol('cron_metadata')
const CRON_PARAM_METADATA_KEY = Symbol('cron_param_metadata')

export function Cron(cron: string, id?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // 获取参数元数据
    const paramMetadata: { index: number; type: ParamType }[] =
      Reflect.getMetadata(CRON_PARAM_METADATA_KEY, target, propertyKey) || []

    // 包装原始方法，支持参数注入
    const originalMethod = descriptor.value
    const wrappedHandler = async function (this: any, bot: NCWebsocket) {
      const paramValues = new Array(paramMetadata.length)
      
      for (const { index, type } of paramMetadata) {
        if (type === ParamType.BOT) {
          paramValues[index] = bot
        }
      }
      
      return originalMethod.apply(this, paramValues)
    }

    // 存储 cron 元数据
    const existing: { cron: string; id: string; propertyKey: string; handler: Function }[] =
      Reflect.getMetadata(CRON_METADATA_KEY, target.constructor) || []
    existing.push({ cron, id: id ?? propertyKey, propertyKey, handler: wrappedHandler })
    Reflect.defineMetadata(CRON_METADATA_KEY, existing, target.constructor)
  }
}

// Cron 专用的参数装饰器
export function CronParam(type: ParamType) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingParameters: { index: number; type: ParamType }[] =
      Reflect.getMetadata(CRON_PARAM_METADATA_KEY, target, propertyKey) || []
    existingParameters.push({ index: parameterIndex, type })
    Reflect.defineMetadata(CRON_PARAM_METADATA_KEY, existingParameters, target, propertyKey)
  }
}

// 快捷装饰器
export const CronBot = () => CronParam(ParamType.BOT)

export function getCronMetadata(target: any): { cron: string; id: string; propertyKey: string; handler: Function }[] {
  return Reflect.getMetadata(CRON_METADATA_KEY, target) || []
}
