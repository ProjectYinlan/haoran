import { z } from 'zod';
import fs from 'fs';
import yaml from 'js-yaml';
import { createLogger } from './logger.js';

const logger = createLogger('config');

const configSchema = z.object({
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
  }).optional()
});

if (!fs.existsSync('./config.yaml')) {
  logger.error('请先创建 config.yaml');
  throw new Error('config.yaml not found');
}

const configRaw = fs.readFileSync('./config.yaml', 'utf-8');
const configParsed = yaml.load(configRaw);

export const config = configSchema.parse(configParsed);

export const modulesConfig = (config.modules ?? {}) as Record<string, any>;