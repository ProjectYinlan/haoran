import { z } from 'zod'
import { configManager } from '../../config.js'

export const standSchema = z.object({
  enabled: z.boolean().optional(),
  cooldownHours: z.number().optional(),
  forceExtraHours: z.number().optional(),
  richBalanceThreshold: z.number().optional(),
  eventChance: z.number().optional(),
  forceNegativeBoost: z.number().optional(),
  richNegativeBoost: z.number().optional(),
}).optional()

export const standConfig = standSchema.parse(configManager.modulesConfig['stand-on-the-street']) ?? {}
