import { z } from 'zod';
import fs from 'fs';
import yaml from 'js-yaml';
import { createLogger } from './logger.js';

const logger = createLogger('config');

const configSchema = z.object({
  bot: z.object({
    name: z.string().optional(),
  }).optional(),
  ob: z.object({
    protocol: z.enum(['ws', 'wss']),
    host: z.string(),
    port: z.number(),
    baseUrl: z.string().optional(),
    accessToken: z.string().optional(),
    throwPromise: z.boolean().optional(),
    reconnection: z.object({
      enable: z.boolean().optional(),
      attempts: z.number().optional(),
      delay: z.number().optional()
    }).optional()
  }).refine(
    (data) => (data.baseUrl !== undefined) || (data.host !== undefined && data.port !== undefined && data.protocol !== undefined),
    { message: "必须提供 baseUrl 或 (host, port, protocol) 组合" }
  ),
  db: z.object({
    type: z.literal('postgres'),
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    database: z.string(),
    synchronize: z.boolean().optional(),
    logging: z.boolean().optional()
  }).optional(),
  modules: z.any().optional(),
  command: z.object({
    globalPrefix: z.string().optional(),
  }).optional(),
  rbac: z.object({
    owners: z.array(z.number()).optional(),
    botAdmins: z.object({
      global: z.array(z.number()).optional(),
      groups: z.record(z.array(z.number())).optional()
    }).optional(),
    rolePermissions: z.record(z.array(z.string())).optional(),
    roleMembers: z.object({
      global: z.record(z.array(z.number())).optional(),
      groups: z.record(z.record(z.array(z.number()))).optional()
    }).optional(),
    userPermissions: z.object({
      global: z.record(z.array(z.string())).optional(),
      groups: z.record(z.record(z.array(z.string()))).optional()
    }).optional()
  }).optional()
});

const CONFIG_PATH = './config.yaml'
let watchStarted = false

const loadConfigFromFile = () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    logger.error('请先创建 config.yaml');
    throw new Error('config.yaml not found');
  }

  const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const configParsed = yaml.load(configRaw)
  return configSchema.parse(configParsed)
}

export let config = loadConfigFromFile()
export let modulesConfig = (config.modules ?? {}) as Record<string, any>

export const reloadConfig = () => {
  try {
    const nextConfig = loadConfigFromFile()
    config = nextConfig
    modulesConfig = (config.modules ?? {}) as Record<string, any>
    logger.info('配置已重载')
    return true
  } catch (error) {
    logger.error({ err: error }, '配置重载失败')
    return false
  }
}

export const startConfigWatcher = () => {
  if (watchStarted) return
  watchStarted = true

  fs.watchFile(CONFIG_PATH, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return
    logger.info('检测到配置变更，重载中')
    reloadConfig()
  })
}