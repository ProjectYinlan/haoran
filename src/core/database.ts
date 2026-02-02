import { DataSource, DataSourceOptions } from 'typeorm'
import { join } from 'path'
import { readdir } from 'fs/promises'
import { createLogger } from '../logger.js'
import { configManager } from '../config.js'
import { modulesPath, externalModulesPath } from '../utils/path.js'

const logger = createLogger('core/database')

// 获取所有模块的实体和迁移文件
const getModuleEntities = async () => {
  const entities: any[] = []
  const migrations: any[] = []

  // 递归查找所有实体和迁移文件
  const findFiles = async (path: string) => {
    const items = await readdir(path, { withFileTypes: true })
    for (const item of items) {
      if (item.isDirectory()) {
        if (item.name === 'entities') {
          const entityFiles = await readdir(join(path, item.name))
          for (const file of entityFiles) {
            if (file.endsWith('.ts') || file.endsWith('.js')) {
              logger.debug(`检测到实体文件: ${file}`)
              const entityPath = `file://${join(path, item.name, file)}`
              try {
                const entity = await import(entityPath)
                if (entity.default) {
                  entities.push(entity.default)
                }
              } catch (error) {
                logger.error({ err: error }, `加载实体文件失败: ${entityPath}`)
                throw error
              }
            }
          }
        } else if (item.name === 'migrations') {
          const migrationFiles = await readdir(join(path, item.name))
          for (const file of migrationFiles) {
            if (file.endsWith('.ts') || file.endsWith('.js')) {
              logger.debug(`检测到迁移文件: ${file}`)
              const migrationPath = `file://${join(path, item.name, file)}`
              try {
                const migration = await import(migrationPath)
                if (migration.default) {
                  migrations.push(migration.default)
                }
              } catch (error) {
                logger.error({ err: error }, `加载迁移文件失败: ${migrationPath}`)
                throw error
              }
            }
          }
        } else {
          await findFiles(join(path, item.name))
        }
      }
    }
  }

  await findFiles(modulesPath)
  await findFiles(externalModulesPath)

  return { entities, migrations }
}

let dataSource: DataSource | null = null

export const createDataSource = async () => {
  const { entities, migrations } = await getModuleEntities()

  logger.info(`加载 ${entities.length} 个实体`)

  dataSource = new DataSource({
    type: 'postgres',
    database: configManager.config.db?.database,
    host: configManager.config.db?.host,
    port: configManager.config.db?.port,
    username: configManager.config.db?.username,
    password: configManager.config.db?.password,
    entities,
    migrations,
    synchronize: configManager.config.db?.synchronize,
    logging: process.env.LOG_LEVEL === 'DEBUG',
  })

  try {
    await dataSource.initialize()
    logger.info('数据库连接成功')
    return dataSource
  } catch (error) {
    logger.error({ err: error }, '数据库连接失败')
    throw error
  }
}

export const getDataSource = () => {
  if (!dataSource) {
    throw new Error('数据库未初始化')
  }
  return dataSource
}
