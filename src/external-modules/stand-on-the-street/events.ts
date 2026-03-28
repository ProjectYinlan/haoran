import { sumBy } from 'lodash-es'

export type EventCategory = 'positive' | 'negative' | 'mixed'

export type EventEffect = {
  incomeMultiplier: number
  friendsCountMultiplier: number
  othersCountMultiplier: number
  cdMultiplier: number
  flatBonus: number
  flatPenalty: number
  /** Override per-person score: if set, each person pays exactly this */
  fixedPersonScore?: number
  /** Override total person count to exactly this value */
  fixedTotalCount?: number
  /** Zero out all income after calculation */
  zeroIncome: boolean
}

export type StandEvent = {
  id: string
  name: string
  description: string
  category: EventCategory
  baseWeight: number
  /** Only available when balance > richBalanceThreshold */
  richOnly?: boolean
  effect: EventEffect | ((ctx: EventContext) => EventEffect)
}

export type EventContext = {
  balance: number
  recentAvg: number
  richBalanceThreshold: number
  force: boolean
}

const defaultEffect: EventEffect = {
  incomeMultiplier: 1,
  friendsCountMultiplier: 1,
  othersCountMultiplier: 1,
  cdMultiplier: 1,
  flatBonus: 0,
  flatPenalty: 0,
  zeroIncome: false,
}

const events: StandEvent[] = [
  {
    id: 'rich_passerby',
    name: '大富翁路过',
    description: '一位神秘的大富翁路过，额外打赏了一笔',
    category: 'positive',
    baseWeight: 10,
    effect: {
      ...defaultEffect,
      flatBonus: Math.floor(Math.random() * 501) + 500,
    },
  },
  {
    id: 'influencer',
    name: '网红效应',
    description: '你突然火了，慕名而来的群友翻倍',
    category: 'positive',
    baseWeight: 8,
    effect: {
      ...defaultEffect,
      friendsCountMultiplier: 2,
    },
  },
  {
    id: 'double_joy',
    name: '双倍快乐',
    description: '今天运气特别好，所有收入翻倍',
    category: 'positive',
    baseWeight: 6,
    effect: {
      ...defaultEffect,
      incomeMultiplier: 2,
    },
  },
  {
    id: 'noble_help',
    name: '贵人相助',
    description: '贵人相助，冷却时间减半',
    category: 'positive',
    baseWeight: 8,
    effect: {
      ...defaultEffect,
      cdMultiplier: 0.5,
    },
  },
  {
    id: 'chengguan',
    name: '城管来了',
    description: '城管突击检查，本次收入全部没收',
    category: 'negative',
    baseWeight: 8,
    effect: {
      ...defaultEffect,
      zeroIncome: true,
    },
  },
  {
    id: 'pengci',
    name: '碰瓷',
    description: '有人碰瓷，被迫赔了一笔钱',
    category: 'negative',
    baseWeight: 10,
    effect: (ctx: EventContext) => ({
      ...defaultEffect,
      flatPenalty: ctx.recentAvg > 0
        ? Math.round(ctx.recentAvg * (0.3 + Math.random() * 0.5))
        : Math.floor(Math.random() * 201) + 100,
    }),
  },
  {
    id: 'heavy_rain',
    name: '暴雨',
    description: '突然下起暴雨，客人数量减半',
    category: 'negative',
    baseWeight: 10,
    effect: {
      ...defaultEffect,
      friendsCountMultiplier: 0.5,
      othersCountMultiplier: 0.5,
    },
  },
  {
    id: 'tax_audit',
    name: '税务稽查',
    description: '税务局盯上了你，余额越高税越重',
    category: 'negative',
    baseWeight: 12,
    richOnly: true,
    effect: (ctx: EventContext) => {
      const ratio = Math.min((ctx.balance - ctx.richBalanceThreshold) / ctx.richBalanceThreshold, 1)
      const taxRate = 0.05 + ratio * 0.15
      const penalty = Math.round(ctx.balance * taxRate)
      return {
        ...defaultEffect,
        flatPenalty: penalty,
      }
    },
  },
  {
    id: 'yangwei_v2',
    name: '杨威2.0',
    description: '杨威再临，冷却时间直接 x3',
    category: 'negative',
    baseWeight: 4,
    effect: {
      ...defaultEffect,
      cdMultiplier: 3,
    },
  },
  {
    id: 'discount_day',
    name: '打折日',
    description: '今日打折，路人蜂拥而至但只愿付 50',
    category: 'mixed',
    baseWeight: 8,
    effect: {
      ...defaultEffect,
      othersCountMultiplier: 3,
      fixedPersonScore: 50,
    },
  },
  {
    id: 'mystery_guest',
    name: '神秘客人',
    description: '只来了 1 位神秘客人，出手阔绑或一毛不拔',
    category: 'mixed',
    baseWeight: 6,
    effect: {
      ...defaultEffect,
      fixedTotalCount: 1,
    },
  },
  {
    id: 'competition',
    name: '同行竞争',
    description: '隔壁也开张了，抢走了大部分客人',
    category: 'negative',
    baseWeight: 8,
    effect: {
      ...defaultEffect,
      incomeMultiplier: 0.3,
    },
  },
  {
    id: 'boss_patrol',
    name: '老板巡街',
    description: '老板亲自巡街，给了奖金还让你早点下班',
    category: 'positive',
    baseWeight: 7,
    effect: (ctx: EventContext) => ({
      ...defaultEffect,
      flatBonus: Math.floor(Math.random() * 601) + 200,
      cdMultiplier: 0.7,
    }),
  },
  {
    id: 'group_buy',
    name: '团购活动',
    description: '群友组团来了，人多但都只付团购价',
    category: 'mixed',
    baseWeight: 7,
    effect: {
      ...defaultEffect,
      friendsCountMultiplier: 3,
      fixedPersonScore: 50,
    },
  },
  {
    id: 'livestream_fail',
    name: '直播翻车',
    description: '直播出了事故，围观路人暴增但没人掏钱',
    category: 'mixed',
    baseWeight: 5,
    effect: {
      ...defaultEffect,
      othersCountMultiplier: 5,
      incomeMultiplier: 0.2,
    },
  },
  {
    id: 'lottery',
    name: '彩票中奖',
    description: '居然中了彩票！奖金是余额的 10%',
    category: 'positive',
    baseWeight: 3,
    effect: (ctx: EventContext) => ({
      ...defaultEffect,
      flatBonus: Math.min(Math.floor(ctx.balance * 0.1), 50000),
    }),
  },
]

export function resolveEffect(event: StandEvent, ctx: EventContext): EventEffect {
  if (typeof event.effect === 'function') {
    return event.effect(ctx)
  }
  if (event.id === 'rich_passerby') {
    return {
      ...defaultEffect,
      flatBonus: Math.floor(Math.random() * 501) + 500,
    }
  }
  return event.effect
}

export type RollEventResult = {
  event: StandEvent
  effect: EventEffect
}

export type RollEventsResult = {
  results: RollEventResult[]
  mergedEffect: EventEffect
}

export function mergeEffects(effects: EventEffect[]): EventEffect {
  if (effects.length === 0) return { ...defaultEffect }
  if (effects.length === 1) return effects[0]
  return {
    incomeMultiplier: effects.reduce((acc, e) => acc * e.incomeMultiplier, 1),
    friendsCountMultiplier: effects.reduce((acc, e) => acc * e.friendsCountMultiplier, 1),
    othersCountMultiplier: effects.reduce((acc, e) => acc * e.othersCountMultiplier, 1),
    cdMultiplier: effects.reduce((acc, e) => acc * e.cdMultiplier, 1),
    flatBonus: sumBy(effects, e => e.flatBonus),
    flatPenalty: sumBy(effects, e => e.flatPenalty),
    fixedPersonScore: effects.find(e => e.fixedPersonScore !== undefined)?.fixedPersonScore,
    fixedTotalCount: effects.find(e => e.fixedTotalCount !== undefined)?.fixedTotalCount,
    zeroIncome: effects.some(e => e.zeroIncome),
  }
}

const EXTRA_EVENT_CHANCE = 0.3

function pickOneEvent(
  available: StandEvent[],
  negativeBoost: number,
  ctx: EventContext,
  hasAmulet: boolean,
  excludeIds: Set<string>,
): RollEventResult | null {
  const pool = available.filter(e => !excludeIds.has(e.id))
  const weighted = pool.map(e => {
    let weight = e.baseWeight
    if (e.category === 'negative') weight *= (1 + negativeBoost)
    return { event: e, weight }
  })
  const total = sumBy(weighted, w => w.weight)
  if (total <= 0) return null

  let roll = Math.random() * total
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) {
      if (item.event.category === 'negative' && hasAmulet) return null
      return { event: item.event, effect: resolveEffect(item.event, ctx) }
    }
  }
  return null
}

export function rollEvents(ctx: EventContext & {
  eventChance: number
  forceNegativeBoost: number
  richNegativeBoost: number
  hasLuckyClover: boolean
  hasAmulet: boolean
  coffeeDebuff?: number
  paidStandNegativeBoost?: number
}): RollEventsResult {
  const empty: RollEventsResult = { results: [], mergedEffect: { ...defaultEffect } }
  const isRich = ctx.balance > ctx.richBalanceThreshold

  if (ctx.hasLuckyClover) {
    const positiveEvents = events.filter(e => e.category === 'positive')
    if (positiveEvents.length === 0) return empty
    const totalWeight = sumBy(positiveEvents, e => e.baseWeight)
    let roll = Math.random() * totalWeight
    for (const e of positiveEvents) {
      roll -= e.baseWeight
      if (roll <= 0) {
        const r = { event: e, effect: resolveEffect(e, ctx) }
        return { results: [r], mergedEffect: r.effect }
      }
    }
    const fallback = positiveEvents[0]
    const r = { event: fallback, effect: resolveEffect(fallback, ctx) }
    return { results: [r], mergedEffect: r.effect }
  }

  if (Math.random() > ctx.eventChance) return empty

  let negativeBoost = (ctx.coffeeDebuff ?? 0) * 0.15 + (ctx.paidStandNegativeBoost ?? 0)
  if (ctx.force) negativeBoost += ctx.forceNegativeBoost
  if (isRich) negativeBoost += ctx.richNegativeBoost

  const available = events.filter(e => {
    if (e.richOnly && !isRich) return false
    return true
  })

  const first = pickOneEvent(available, negativeBoost, ctx, ctx.hasAmulet, new Set())
  if (!first) return empty

  const results: RollEventResult[] = [first]

  const extraChance = Math.min(EXTRA_EVENT_CHANCE + (ctx.coffeeDebuff ?? 0) * 0.2, 0.95)
  if (Math.random() < extraChance) {
    const second = pickOneEvent(available, negativeBoost, ctx, ctx.hasAmulet, new Set([first.event.id]))
    if (second) results.push(second)
  }

  return { results, mergedEffect: mergeEffects(results.map(r => r.effect)) }
}

export { events as allEvents, defaultEffect }
