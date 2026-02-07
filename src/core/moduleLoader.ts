import { BaseCommand } from './decorators.js'
import { CommandManager } from './commandManager.js'
import { Scheduler, getCronMetadata } from './scheduler.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdir } from 'fs/promises'
import { createLogger } from '../logger.js'

const logger = createLogger('core/module-loader')

export class ModuleLoader {
  private static instance: ModuleLoader
  private commandManager: CommandManager
  private modulesPath: string
  private externalModulesPath: string
  private loadedModules: Set<string> = new Set()

  private constructor(commandManager: CommandManager) {
    this.commandManager = commandManager
    const baseDir = dirname(fileURLToPath(import.meta.url))
    this.modulesPath = join(baseDir, '../modules')
    this.externalModulesPath = join(baseDir, '../external-modules')
  }

  private registerCronTasks(module: BaseCommand) {
    const scheduler = Scheduler.getInstance()
    const cronMetadata = getCronMetadata(module.constructor)
    for (const { cron, id, handler } of cronMetadata) {
      const boundHandler = handler.bind(module)
      const taskId = `${module.moduleName}.${id}`
      scheduler.register(taskId, cron, boundHandler)
    }
  }

  static getInstance(commandManager: CommandManager): ModuleLoader {
    if (!ModuleLoader.instance) {
      ModuleLoader.instance = new ModuleLoader(commandManager)
    }
    return ModuleLoader.instance
  }

  async loadModules() {
    try {
      // 加载内置模块
      const internalModules = await this.loadModulesFromPath(this.modulesPath)
      logger.info(`内部模块 ${internalModules.length} 个`)
      for (const module of internalModules) {
        logger.info('加载内部模块: ' + module.moduleName || 'unknown')
        this.commandManager.registerModule(module)
        this.registerCronTasks(module)
      }

      // 加载外部模块
      const externalModules = await this.loadModulesFromPath(this.externalModulesPath)
      logger.info(`外部模块 ${externalModules.length} 个`)
      for (const module of externalModules) {
        logger.info('加载外部模块: ' + module.moduleName || 'unknown')
        this.commandManager.registerModule(module)
        this.registerCronTasks(module)
      }
    } catch (error) {
      logger.error('加载模块时出错: ')
      logger.error(error)
    }
  }

  private async loadModulesFromPath(path: string): Promise<BaseCommand[]> {
    const modules: BaseCommand[] = []
    try {
      const items = await readdir(path, { withFileTypes: true })
      for (const item of items) {
        if (item.isDirectory()) {
          // 如果是文件夹，尝试加载其中的 index.js
          try {
            const modulePath = `file://${join(path, item.name, 'index.js')}`
            if (this.loadedModules.has(modulePath)) {
              continue
            }
            const module = await import(modulePath)
            if (module.default) {
              const instance = new module.default()
              if (instance instanceof BaseCommand) {
                this.loadedModules.add(modulePath)
                modules.push(instance)
              }
            }
          } catch (error) {
            logger.error(`加载模块文件夹 ${item.name} 时出错:`)
            logger.error(error)
          }
        } else if (item.isFile() && item.name.endsWith('.js')) {
          // 如果是单个 js 文件，保持原有逻辑
          try {
            const modulePath = `file://${join(path, item.name)}`
            if (this.loadedModules.has(modulePath)) {
              continue
            }
            const module = await import(modulePath)
            if (module.default) {
              const instance = new module.default()
              if (instance instanceof BaseCommand) {
                this.loadedModules.add(modulePath)
                modules.push(instance)
              }
            }
          } catch (error) {
            logger.error(`加载模块 ${item.name} 时出错:`)
            logger.error(error)
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`读取模块目录 ${path} 时出错:`)
        logger.error(error)
      }
    }
    return modules
  }
}