import { Wallet, ShoppingCart, Megaphone, ShieldCheck, Crown, Clover, Shield, SprayCan, Pill, Package, Coffee, Footprints, Volume2, IterationCw, Gift } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag.js'
import type { ComponentType, SVGProps } from 'react'

const itemIconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '广告牌': Megaphone,
  '防狼喷雾': SprayCan,
  '保险': ShieldCheck,
  '贵宾卡': Crown,
  '护身符': Shield,
  '幸运草': Clover,
  '小药丸': Pill,
  '咖啡': Coffee,
  '高跟鞋': Footprints,
  '喇叭': Volume2,
  '回旋镖': IterationCw,
  '红包': Gift,
}

export type StandBuyData = {
  avatarUrl: string
  nickname: string
  itemName: string
  itemDescription: string
  quantity: number
  unitPrice: number
  totalCost: number
  balance: number
  previousBalance: number
  balanceChange: number
  ownedQuantity: number
}

export const StandBuy = ({
  avatarUrl,
  nickname,
  itemName,
  itemDescription,
  quantity,
  unitPrice,
  totalCost,
  balance,
  previousBalance,
  balanceChange,
  ownedQuantity,
}: StandBuyData) => {
  const Icon = itemIconMap[itemName] ?? Package
  const changeSign = balanceChange >= 0 ? '+' : ''
  const changeColor = balanceChange > 0 ? 'text-emerald-600' : balanceChange < 0 ? 'text-red-500' : 'text-slate-400'

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">购买成功</span>
        </div>
        <ShoppingCart className="w-5 h-5 text-slate-400" />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-3 bg-slate-50">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{itemName}</span>
            {quantity > 1 && <Tag>x{quantity}</Tag>}
          </div>
          <span className="text-xs text-slate-500">{itemDescription}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm font-semibold text-red-500">-{getShortNumberString(totalCost)}</span>
          {quantity > 1 && <span className="text-xs text-slate-400">{getShortNumberString(unitPrice)}/个</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span>{getShortNumberString(balance)}</span>
          <span className="text-xs text-slate-400">
            ({getShortNumberString(previousBalance)}{' '}
            <span className={changeColor}>
              {changeSign}{getShortNumberString(balanceChange)}
            </span>)
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Package className="w-3.5 h-3.5" />
          <span>持有 {ownedQuantity}</span>
        </div>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandBuy',
  component: StandBuy,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    itemName: '广告牌',
    itemDescription: '下次站街收入 x1.5，保底 3 人光顾',
    quantity: 2,
    unitPrice: 500,
    totalCost: 1000,
    balance: 11345,
    previousBalance: 12345,
    balanceChange: -1000,
    ownedQuantity: 3,
  } satisfies StandBuyData,
  size: { width: 400, height: 'auto' as const },
}
