import { z } from 'zod'
import { configManager } from '../../config.js'

export const standSchema = z.object({
  enabled: z.boolean().optional(),
  cooldownHours: z.number().optional(),
  forceExtraHours: z.number().optional(),
  forceCommissionRate: z.number().optional(),
  richCommissionRate: z.number().optional(),
  richBalanceThreshold: z.number().optional(),
}).optional()

export const standConfig = standSchema.parse(configManager.modulesConfig['stand-on-the-street']) ?? {}

