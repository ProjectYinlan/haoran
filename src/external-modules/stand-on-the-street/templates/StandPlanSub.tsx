import { Wallet, CreditCard, CalendarDays, Zap, ArrowRight } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag.js'

export type StandPlanSubData = {
  avatarUrl: string
  nickname: string
  tier: string
  tierName: string
  price: number
  dailyLimit: number
  weeklyLimit: number
  expiresAt: number
  balance: number
  previousBalance: number
}

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const StandPlanSub = ({
  avatarUrl,
  nickname,
  tier,
  tierName,
  price,
  dailyLimit,
  weeklyLimit,
  expiresAt,
  balance,
  previousBalance,
}: StandPlanSubData) => {
  const tierColor = tier === 'max' ? 'text-amber-600' : 'text-indigo-600'
  const tierBg = tier === 'max' ? 'bg-amber-100' : 'bg-indigo-100'

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">订阅成功</span>
        </div>
        <CreditCard className="w-5 h-5 text-slate-400" />
      </div>

      <div className={`rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${tierBg}/30`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${tierBg} flex items-center justify-center shrink-0`}>
            <Zap className={`w-5 h-5 ${tierColor}`} />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className={`text-sm font-bold ${tierColor}`}>{tierName}</span>
            <span className="text-xs text-slate-500">站街订阅计划</span>
          </div>
          <span className="text-sm font-semibold text-red-500">-{getShortNumberString(price)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>日上限 <span className="font-semibold">{dailyLimit}</span> 次</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>周上限 <span className="font-semibold">{weeklyLimit}</span> 次</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowRight className="w-3 h-3" />
          <span>到期时间: {formatDate(expiresAt)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>每次使用有 30% 概率被制裁（封禁 1 天 + 按比例退款 60%）</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Wallet className="w-4 h-4" />
        <span>{getShortNumberString(balance)}</span>
        <span className="text-xs text-slate-400">
          ({getShortNumberString(previousBalance)}{' '}
          <span className="text-red-500">-{getShortNumberString(price)}</span>)
        </span>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandPlanSub',
  component: StandPlanSub,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    tier: 'pro',
    tierName: 'Plan Pro',
    price: 1500,
    dailyLimit: 2,
    weeklyLimit: 10,
    expiresAt: Date.now() + 7 * 86400000,
    balance: 8500,
    previousBalance: 10000,
  } satisfies StandPlanSubData,
  size: { width: 400, height: 'auto' as const },
}
