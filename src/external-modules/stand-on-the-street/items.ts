export type ItemEffect = {
  incomeMultiplier?: number
  cdMultiplier?: number
  blockCall?: boolean
  insurance?: boolean
  amulet?: boolean
  luckyClover?: boolean
  minTotalCount?: number
  callExtraRounds?: [number, number]
  othersCountMultiplier?: number
  reflectCall?: boolean
  redEnvelope?: number
  cdReduceMs?: number
}

export type ItemCategory = 'active' | 'call' | 'passive' | 'instant'

export type StandItem = {
  id: string
  name: string
  description: string
  price: number
  category: ItemCategory
  effect: ItemEffect
  dailyBuyLimit: number
}

export const allItems: StandItem[] = [
  {
    id: 'billboard',
    name: '广告牌',
    description: '收入 x1.5，保底 3 人光顾',
    price: 500,
    category: 'active',
    effect: { incomeMultiplier: 1.5, minTotalCount: 3 },
    dailyBuyLimit: 3,
  },
  {
    id: 'pepper_spray',
    name: '防狼喷雾',
    description: '免疫一次被点名',
    price: 300,
    category: 'passive',
    effect: { blockCall: true },
    dailyBuyLimit: 2,
  },
  {
    id: 'insurance',
    name: '保险',
    description: '若本次收入为 0，赔偿平均收入',
    price: 200,
    category: 'active',
    effect: { insurance: true },
    dailyBuyLimit: 3,
  },
  {
    id: 'vip_card',
    name: '贵宾卡',
    description: 'CD 减半',
    price: 800,
    category: 'active',
    effect: { cdMultiplier: 0.5 },
    dailyBuyLimit: 2,
  },
  {
    id: 'amulet',
    name: '护身符',
    description: '免疫一次负面事件',
    price: 400,
    category: 'active',
    effect: { amulet: true },
    dailyBuyLimit: 3,
  },
  {
    id: 'lucky_clover',
    name: '幸运草',
    description: '必定触发正面事件',
    price: 300,
    category: 'active',
    effect: { luckyClover: true },
    dailyBuyLimit: 2,
  },
  {
    id: 'pill',
    name: '小药丸',
    description: '操可连续触发 2-3 次',
    price: 600,
    category: 'call',
    effect: { callExtraRounds: [1, 2] },
    dailyBuyLimit: 2,
  },
  {
    id: 'coffee',
    name: '咖啡',
    description: '立即减少 2 小时 CD',
    price: 400,
    category: 'instant',
    effect: { cdReduceMs: 2 * 3600000 },
    dailyBuyLimit: 3,
  },
  {
    id: 'high_heels',
    name: '高跟鞋',
    description: '收入 x2，但 CD x1.5',
    price: 600,
    category: 'active',
    effect: { incomeMultiplier: 2, cdMultiplier: 1.5 },
    dailyBuyLimit: 2,
  },
  {
    id: 'megaphone',
    name: '喇叭',
    description: '路人数量 x2',
    price: 400,
    category: 'active',
    effect: { othersCountMultiplier: 2 },
    dailyBuyLimit: 3,
  },
  {
    id: 'boomerang',
    name: '回旋镖',
    description: '被操时反弹同等金额给对方',
    price: 700,
    category: 'passive',
    effect: { reflectCall: true },
    dailyBuyLimit: 2,
  },
  {
    id: 'red_envelope',
    name: '红包',
    description: '给每位新群友发 50，他们下次必来',
    price: 300,
    category: 'active',
    effect: { redEnvelope: 50 },
    dailyBuyLimit: 2,
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
    itemIds: ['billboard', 'lucky_clover', 'high_heels', 'megaphone'],
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

const allNames = [
  ...allItems.map(i => i.name),
  ...allBundles.map(b => b.name),
].sort((a, b) => b.length - a.length)

export type ParsedItems = {
  items: StandItem[]
  bundles: StandBundle[]
  unknown: string[]
}

export function parseItemsFromText(text: string): ParsedItems {
  const items: StandItem[] = []
  const bundles: StandBundle[] = []
  const unknown: string[] = []
  let remaining = text.replace(/\s+/g, '')

  while (remaining.length > 0) {
    let matched = false
    for (const name of allNames) {
      if (remaining.startsWith(name)) {
        const item = itemNameMap.get(name)
        if (item) {
          if (!items.some(i => i.id === item.id)) items.push(item)
        } else {
          const bundle = bundleNameMap.get(name)
          if (bundle && !bundles.some(b => b.id === bundle.id)) bundles.push(bundle)
        }
        remaining = remaining.slice(name.length)
        matched = true
        break
      }
    }
    if (!matched) {
      unknown.push(remaining[0])
      remaining = remaining.slice(1)
    }
  }

  for (const bundle of bundles) {
    for (const item of getBundleItems(bundle)) {
      if (!items.some(i => i.id === item.id)) items.push(item)
    }
  }

  return { items, bundles, unknown }
}
