export type ItemEffect = {
  /** Multiplier on final income */
  incomeMultiplier?: number
  /** Multiplier on CD duration */
  cdMultiplier?: number
  /** If true, blocks being targeted by call mode once */
  blockCall?: boolean
  /** If true, insures against zero-income (pays recentAvg) */
  insurance?: boolean
  /** If true, blocks one negative event */
  amulet?: boolean
  /** If true, guarantees a positive event */
  luckyClover?: boolean
  /** Guarantee minimum total customer count */
  minTotalCount?: number
  /** Extra call rounds [min, max] for 操 command */
  callExtraRounds?: [number, number]
  /** Multiplier on passerby count */
  othersCountMultiplier?: number
  /** Reflect call damage back to caller */
  reflectCall?: boolean
  /** Pay each visiting friend, guarantee they visit next time */
  redEnvelope?: number
  /** Instantly reduce CD by this many ms on purchase */
  cdReduceMs?: number
}

export type ItemPhase = 'pre_event' | 'post_event' | 'on_settle' | 'on_call_defense' | 'instant'

export type StandItem = {
  id: string
  name: string
  description: string
  price: number
  phase: ItemPhase
  effect: ItemEffect
}

export const allItems: StandItem[] = [
  {
    id: 'billboard',
    name: '广告牌',
    description: '下次站街收入 x1.5，保底 3 人光顾',
    price: 500,
    phase: 'on_settle',
    effect: { incomeMultiplier: 1.5, minTotalCount: 3 },
  },
  {
    id: 'pepper_spray',
    name: '防狼喷雾',
    description: '免疫一次被点名',
    price: 300,
    phase: 'on_call_defense',
    effect: { blockCall: true },
  },
  {
    id: 'insurance',
    name: '保险',
    description: '若本次收入为 0，赔偿平均收入',
    price: 200,
    phase: 'on_settle',
    effect: { insurance: true },
  },
  {
    id: 'vip_card',
    name: '贵宾卡',
    description: '下次站街 CD 减半',
    price: 800,
    phase: 'on_settle',
    effect: { cdMultiplier: 0.5 },
  },
  {
    id: 'amulet',
    name: '护身符',
    description: '免疫一次负面事件',
    price: 400,
    phase: 'pre_event',
    effect: { amulet: true },
  },
  {
    id: 'lucky_clover',
    name: '幸运草',
    description: '下次站街必定触发正面事件',
    price: 300,
    phase: 'pre_event',
    effect: { luckyClover: true },
  },
  {
    id: 'pill',
    name: '小药丸',
    description: '下次操可连续触发 2-3 次',
    price: 600,
    phase: 'on_settle',
    effect: { callExtraRounds: [1, 2] },
  },
  {
    id: 'coffee',
    name: '咖啡',
    description: '购买后立即减少 2 小时 CD',
    price: 400,
    phase: 'instant',
    effect: { cdReduceMs: 2 * 3600000 },
  },
  {
    id: 'high_heels',
    name: '高跟鞋',
    description: '下次站街收入 x2，但 CD x1.5',
    price: 600,
    phase: 'on_settle',
    effect: { incomeMultiplier: 2, cdMultiplier: 1.5 },
  },
  {
    id: 'megaphone',
    name: '喇叭',
    description: '下次站街路人数量 x2',
    price: 400,
    phase: 'on_settle',
    effect: { othersCountMultiplier: 2 },
  },
  {
    id: 'boomerang',
    name: '回旋镖',
    description: '被操时反弹同等金额给对方',
    price: 700,
    phase: 'on_call_defense',
    effect: { reflectCall: true },
  },
  {
    id: 'red_envelope',
    name: '红包',
    description: '下次站街给每位群友发 50，他们下次必来',
    price: 300,
    phase: 'on_settle',
    effect: { redEnvelope: 50 },
  },
]

export const itemMap = new Map(allItems.map(item => [item.id, item]))
export const itemNameMap = new Map(allItems.map(item => [item.name, item]))

export function getItemById(id: string): StandItem | undefined {
  return itemMap.get(id)
}

export function getItemByName(name: string): StandItem | undefined {
  return itemNameMap.get(name)
}

export type StandBundle = {
  id: string
  name: string
  itemIds: string[]
  serviceFee: number
}

export const allBundles: StandBundle[] = [
  {
    id: 'bundle_1',
    name: '进攻套餐',
    itemIds: ['billboard', 'lucky_clover', 'high_heels', 'megaphone'],
    serviceFee: 50,
  },
  {
    id: 'bundle_2',
    name: '豪华套餐',
    itemIds: ['billboard', 'lucky_clover', 'high_heels', 'megaphone', 'insurance', 'red_envelope'],
    serviceFee: 50,
  },
]

export function getBundleItems(bundle: StandBundle): StandItem[] {
  return bundle.itemIds.map(id => itemMap.get(id)!).filter(Boolean)
}

export function getBundleTotalPrice(bundle: StandBundle): number {
  return getBundleItems(bundle).reduce((sum, item) => sum + item.price, 0) + bundle.serviceFee
}

export const bundleNameMap = new Map(allBundles.map(b => [b.name, b]))
