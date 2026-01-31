import { DataSource, DataSourceOptions } from 'typeorm'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readdir } from 'fs/promises'
import { createLogger } from '../logger.js'
import { config } from '../config.js'

const logger = createLogger('core/database')

// 获取所有模块的实体和迁移文件
const getModuleEntities = async () => {
  const baseDir = dirname(fileURLToPath(import.meta.url))
  const modulesPath = join(baseDir, '../modules')
  const externalModulesPath = join(baseDir, '../external-modules')

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
              const entity = await import(`file://${join(path, item.name, file)}`)
              if (entity.default) {
                entities.push(entity.default)
              }
            }
          }
        } else if (item.name === 'migrations') {
          const migrationFiles = await readdir(join(path, item.name))
          for (const file of migrationFiles) {
            if (file.endsWith('.ts') || file.endsWith('.js')) {
              logger.debug(`检测到迁移文件: ${file}`)
              const migration = await import(`file://${join(path, item.name, file)}`)
              if (migration.default) {
                migrations.push(migration.default)
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
    database: config.db?.database,
    host: config.db?.host,
    port: config.db?.port,
    username: config.db?.username,
    password: config.db?.password,
    entities,
    migrations,
    synchronize: config.db?.synchronize,
    logging: process.env.LOG_LEVEL === 'DEBUG',
  })

  try {
    await dataSource.initialize()
    logger.info('数据库连接成功')
    return dataSource
  } catch (error) {
    logger.error('数据库连接失败:', error)
    throw error
  }
}

export const getDataSource = () => {
  if (!dataSource) {
    throw new Error('数据库未初始化')
  }
  return dataSource
}
