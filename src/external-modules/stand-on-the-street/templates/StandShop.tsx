import { ShoppingBag } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag.js'
import type { StandItem } from '../items.js'

export type StandShopData = {
  items: StandItem[]
}

export const StandShop = ({ items = [] }: StandShopData) => {
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

      <div className="text-xs text-slate-400 text-center">
        使用「购买 道具名 [数量]」购买 · 道具在下次站街时自动生效
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandShop',
  component: StandShop,
  defaultData: {
    items: [
      { id: 'billboard', name: '广告牌', description: '下次站街收入 x1.5', price: 500, phase: 'on_settle' as const, effect: {} },
      { id: 'pepper_spray', name: '防狼喷雾', description: '免疫一次被点名', price: 300, phase: 'on_call_defense' as const, effect: {} },
      { id: 'insurance', name: '保险', description: '若本次收入为 0，赔偿平均收入', price: 200, phase: 'on_settle' as const, effect: {} },
      { id: 'vip_card', name: '贵宾卡', description: '下次站街 CD 减半', price: 800, phase: 'on_settle' as const, effect: {} },
      { id: 'amulet', name: '护身符', description: '免疫一次负面事件', price: 400, phase: 'pre_event' as const, effect: {} },
      { id: 'lucky_clover', name: '幸运草', description: '正面事件概率 x2', price: 300, phase: 'pre_event' as const, effect: {} },
    ],
  } satisfies StandShopData,
  size: { width: 400, height: 'auto' as const },
}
