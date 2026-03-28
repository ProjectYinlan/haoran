import { Backpack, Shield, Coffee, Zap } from 'lucide-react'
import { Tag } from '../../../core/components/Tag.js'

export type StandBagItem = {
  name: string
  description: string
  quantity: number
}

export type EquippedItemInfo = {
  name: string
  description: string
}

export type StandBagData = {
  nickname: string
  avatarUrl: string
  items: StandBagItem[]
  equippedItems?: EquippedItemInfo[]
  coffeeDebuff?: number
  paidStandUsed?: boolean
  coffeeUsed?: boolean
}

export const StandBag = ({ nickname, avatarUrl, items = [], equippedItems = [], coffeeDebuff = 0, paidStandUsed = false, coffeeUsed = false }: StandBagData) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-xs text-slate-500">站街状态</span>
        </div>
        <Backpack className="w-5 h-5 text-slate-400" />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 bg-slate-50">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium">装备栏</span>
        </div>
        {equippedItems.length === 0 ? (
          <div className="text-xs text-slate-400">未装备防御道具（站街时指定防狼喷雾/回旋镖即可装备）</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {equippedItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="font-medium text-indigo-700">{item.name}</span>
                <span className="text-slate-500">{item.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 bg-slate-50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">今日状态</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Tag color={paidStandUsed ? 'secondary' : 'primary'}>
            加钱站街 {paidStandUsed ? '已用' : '可用'}
          </Tag>
          <Tag color={coffeeUsed ? 'secondary' : 'primary'}>
            咖啡 {coffeeUsed ? '已用' : '可用'}
          </Tag>
          {coffeeDebuff > 0 && (
            <Tag color="danger">
              咖啡副作用 Lv.{coffeeDebuff}（负面+{Math.round(coffeeDebuff * 15)}%）
            </Tag>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-slate-500">{item.description}</span>
              </div>
              <Tag>x{item.quantity}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const preview = {
  title: 'StandBag',
  component: StandBag,
  defaultData: {
    nickname: '站街达人',
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    items: [],
    equippedItems: [
      { name: '防狼喷雾', description: '免疫一次被点名' },
      { name: '回旋镖', description: '被操时反弹同等金额给对方' },
    ],
    coffeeDebuff: 2,
    paidStandUsed: false,
    coffeeUsed: true,
  } satisfies StandBagData,
  size: { width: 400, height: 'auto' as const },
}
