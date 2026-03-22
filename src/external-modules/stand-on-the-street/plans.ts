import dayjs from 'dayjs'

export const PLAN_TIERS = {
  pro: {
    name: 'Plan Pro',
    price: 1500,
    dailyLimit: 2,
    weeklyLimit: 10,
    sanctionChance: 0.3,
    durationDays: 7,
    banDurationMs: 24 * 60 * 60 * 1000,
  },
  max: {
    name: 'Plan Max',
    price: 2500,
    dailyLimit: 3,
    weeklyLimit: 15,
    sanctionChance: 0.3,
    durationDays: 7,
    banDurationMs: 24 * 60 * 60 * 1000,
  },
} as const

export type PlanTier = keyof typeof PLAN_TIERS

export function getNext4AM(from?: number): Date {
  const now = from ? dayjs(from) : dayjs()
  const today4AM = now.startOf('day').add(4, 'hour')
  if (now.isBefore(today4AM)) return today4AM.toDate()
  return today4AM.add(1, 'day').toDate()
}

export function getLast4AM(from?: number): number {
  const now = from ? dayjs(from) : dayjs()
  const today4AM = now.startOf('day').add(4, 'hour')
  if (now.isBefore(today4AM)) return today4AM.subtract(1, 'day').valueOf()
  return today4AM.valueOf()
}
