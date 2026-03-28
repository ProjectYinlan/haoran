import { ShoppingBag, PackageCheck } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag.js'
import type { StandItem } from '../items.js'

export type ShopBundleInfo = {
  name: string
  itemNames: string[]
  totalPrice: number
  serviceFee: number
}

export type StandShopData = {
  items: StandItem[]
  bundles?: ShopBundleInfo[]
}

export const StandShop = ({ items = [], bundles = [] }: StandShopData) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-slate-600" />
        <span className="text-base font-semibold">站街商店</span>
        <Tag color='secondary' theme='solid-dark'>DLC</Tag>
      </div>

      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-slate-500">{item.description}</span>
            </div>
            <Tag>{getShortNumberString(item.price)} 硬币</Tag>
          </div>
        ))}
      </div>

      {bundles.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <PackageCheck className="w-4.5 h-4.5 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">一键套餐</span>
            <span className="text-xs text-slate-400">含 {bundles[0]?.serviceFee ?? 50} 代理费</span>
          </div>
          <div className="flex flex-col gap-2">
            {bundles.map(b => (
              <div key={b.name} className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-indigo-800">{b.name}</span>
                  <span className="text-xs text-indigo-500">{b.itemNames.join(' + ')}</span>
                </div>
                <Tag color="primary">{getShortNumberString(b.totalPrice)} 硬币</Tag>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-xs text-slate-400 text-center">
        「站街 道具名...」即买即用 · 「咖啡」清除CD · 「加钱站街」付费额外站
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandShop',
  component: StandShop,
  defaultData: {
    items: [
      { id: 'billboard', name: '广告牌', description: '收入 x1.5，保底 3 人', price: 500, category: 'active' as const, effect: {}, dailyBuyLimit: 3 },
      { id: 'pepper_spray', name: '防狼喷雾', description: '免疫一次被点名', price: 300, category: 'passive' as const, effect: {}, dailyBuyLimit: 2 },
      { id: 'insurance', name: '保险', description: '零收入赔偿', price: 200, category: 'active' as const, effect: {}, dailyBuyLimit: 3 },
      { id: 'vip_card', name: '贵宾卡', description: 'CD 减半', price: 800, category: 'active' as const, effect: {}, dailyBuyLimit: 2 },
      { id: 'amulet', name: '护身符', description: '免疫负面事件', price: 400, category: 'active' as const, effect: {}, dailyBuyLimit: 3 },
      { id: 'lucky_clover', name: '幸运草', description: '必定正面事件', price: 300, category: 'active' as const, effect: {}, dailyBuyLimit: 2 },
    ],
    bundles: [
      { name: '进攻套餐', itemNames: ['广告牌', '幸运草', '高跟鞋', '喇叭'], totalPrice: 1850, serviceFee: 50 },
      { name: '豪华套餐', itemNames: ['广告牌', '幸运草', '高跟鞋', '喇叭', '保险', '红包'], totalPrice: 2350, serviceFee: 50 },
    ],
  } satisfies StandShopData,
  size: { width: 400, height: 'auto' as const },
}
