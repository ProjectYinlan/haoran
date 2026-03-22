import { Backpack } from 'lucide-react'
import { Tag } from '../../../core/components/Tag.js'

export type StandBagItem = {
  name: string
  description: string
  quantity: number
}

export type StandBagData = {
  nickname: string
  avatarUrl: string
  items: StandBagItem[]
}

export const StandBag = ({ nickname, avatarUrl, items = [] }: StandBagData) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-xs text-slate-500">的背包</span>
        </div>
        <Backpack className="w-5 h-5 text-slate-400" />
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-6">背包空空如也</div>
      ) : (
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
    items: [
      { name: '广告牌', description: '下次站街收入 x1.5', quantity: 2 },
      { name: '护身符', description: '免疫一次负面事件', quantity: 1 },
      { name: '保险', description: '若本次收入为 0，赔偿平均收入', quantity: 3 },
    ],
  } satisfies StandBagData,
  size: { width: 400, height: 'auto' as const },
}
