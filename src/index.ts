import 'reflect-metadata'
import { connect } from "./bot.js";
import { createLogger } from './logger.js';
import { createDataSource } from './core/database.js'
import { warmupTemplateRenderer } from './core/playwright.js'
import { configManager } from './config.js'

const logger = createLogger('root');

logger.debug("调试模式")

async function main() {
  try {
    // 初始化数据库
    await createDataSource()

    // 预热模板渲染器，避免首次渲染卡顿
    await warmupTemplateRenderer()

    // 监听配置变更，支持权限热重载
    configManager.startWatcher()

    // 启动机器人
    await connect()
  } catch (error) {
    console.error('应用启动失败:', error)
    process.exit(1)
  }
}

main()