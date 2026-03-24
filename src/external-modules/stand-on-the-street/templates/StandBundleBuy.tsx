import { Wallet, PackageCheck, Megaphone, ShieldCheck, Crown, Clover, Shield, SprayCan, Pill, Package, Coffee, Footprints, Volume2, IterationCw, Gift } from 'lucide-react'
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

export type BundleItemInfo = {
  name: string
  price: number
}

export type StandBundleBuyData = {
  avatarUrl: string
  nickname: string
  bundleName: string
  items: BundleItemInfo[]
  serviceFee: number
  totalCost: number
  balance: number
  previousBalance: number
}

export const StandBundleBuy = ({
  avatarUrl,
  nickname,
  bundleName,
  items,
  serviceFee,
  totalCost,
  balance,
  previousBalance,
}: StandBundleBuyData) => {
  const balanceChange = balance - previousBalance

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">一键购买成功</span>
        </div>
        <PackageCheck className="w-5 h-5 text-slate-400" />
      </div>

      <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 bg-slate-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{bundleName}</span>
          <span className="text-sm font-semibold text-red-500">-{getShortNumberString(totalCost)}</span>
        </div>
        <div className="h-px bg-slate-200" />
        {items.map((item, idx) => {
          const Icon = itemIconMap[item.name] ?? Package
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-slate-700">{item.name}</span>
              </div>
              <span className="text-slate-400">{getShortNumberString(item.price)}</span>
            </div>
          )
        })}
        <div className="h-px bg-slate-200" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">代理费</span>
          <span className="text-slate-400">{getShortNumberString(serviceFee)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span>{getShortNumberString(balance)}</span>
          <span className="text-xs text-slate-400">
            ({getShortNumberString(previousBalance)}{' '}
            <span className="text-red-500">{getShortNumberString(balanceChange)}</span>)
          </span>
        </div>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandBundleBuy',
  component: StandBundleBuy,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    bundleName: '豪华套餐',
    items: [
      { name: '广告牌', price: 500 },
      { name: '幸运草', price: 300 },
      { name: '高跟鞋', price: 600 },
      { name: '喇叭', price: 400 },
      { name: '保险', price: 200 },
      { name: '红包', price: 300 },
    ],
    serviceFee: 50,
    totalCost: 2350,
    balance: 9995,
    previousBalance: 12345,
  } satisfies StandBundleBuyData,
  size: { width: 400, height: 'auto' as const },
}
