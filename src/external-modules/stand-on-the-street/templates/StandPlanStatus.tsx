import { Wallet, CreditCard, CalendarDays, Zap, ShieldBan, Clock, AlertTriangle } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag.js'

export type StandPlanStatusData = {
  avatarUrl: string
  nickname: string
  tier: string
  tierName: string
  dailyUsed: number
  dailyLimit: number
  weeklyUsed: number
  weeklyLimit: number
  subscribedAt: number
  expiresAt: number
  bannedUntil: number | null
  isBanned: boolean
  isExpired: boolean
  balance: number
}

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatRemaining = (ms: number) => {
  if (ms <= 0) return '已到期'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}天${h % 24}时`
  if (h > 0) return `${h}时${m}分`
  return `${m}分`
}

export const StandPlanStatus = ({
  avatarUrl,
  nickname,
  tier,
  tierName,
  dailyUsed,
  dailyLimit,
  weeklyUsed,
  weeklyLimit,
  subscribedAt,
  expiresAt,
  bannedUntil,
  isBanned,
  isExpired,
  balance,
}: StandPlanStatusData) => {
  const tierColor = tier === 'max' ? 'text-amber-600' : 'text-indigo-600'
  const tierBg = tier === 'max' ? 'bg-amber-100' : 'bg-indigo-100'
  const now = Date.now()

  let statusTag: { text: string, color: 'success' | 'danger' | 'warning' }
  if (isBanned) {
    statusTag = { text: '已制裁', color: 'danger' }
  } else if (isExpired) {
    statusTag = { text: '已到期', color: 'warning' }
  } else {
    statusTag = { text: '生效中', color: 'success' }
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">Plan 状态</span>
        </div>
        <CreditCard className="w-5 h-5 text-slate-400" />
      </div>

      <div className={`rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${isBanned ? 'bg-red-50/50' : isExpired ? 'bg-slate-50' : `${tierBg}/30`}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${isBanned ? 'bg-red-100' : tierBg} flex items-center justify-center shrink-0`}>
            {isBanned
              ? <ShieldBan className="w-5 h-5 text-red-500" />
              : <Zap className={`w-5 h-5 ${tierColor}`} />
            }
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isBanned ? 'text-red-500' : tierColor}`}>{tierName}</span>
              <Tag color={statusTag.color}>{statusTag.text}</Tag>
            </div>
          </div>
        </div>

        {!isBanned && !isExpired && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/80 border border-slate-100 p-2.5 flex flex-col gap-1">
              <span className="text-xs text-slate-400">今日额度</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-800">{dailyUsed}</span>
                <span className="text-xs text-slate-400">/ {dailyLimit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${Math.min(100, dailyUsed / dailyLimit * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-100 p-2.5 flex flex-col gap-1">
              <span className="text-xs text-slate-400">本周额度</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-800">{weeklyUsed}</span>
                <span className="text-xs text-slate-400">/ {weeklyLimit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, weeklyUsed / weeklyLimit * 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>订阅: {formatDate(subscribedAt)}</span>
          </div>
          {!isBanned && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isExpired
                  ? '已到期'
                  : `到期: ${formatDate(expiresAt)} (${formatRemaining(expiresAt - now)})`
                }
              </span>
            </div>
          )}
          {isBanned && bannedUntil && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-500">
                制裁解除: {formatDate(bannedUntil)} ({formatRemaining(bannedUntil - now)})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Wallet className="w-4 h-4" />
        <span>{getShortNumberString(balance)}</span>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandPlanStatus',
  component: StandPlanStatus,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    tier: 'pro',
    tierName: 'Plan Pro',
    dailyUsed: 1,
    dailyLimit: 2,
    weeklyUsed: 5,
    weeklyLimit: 10,
    subscribedAt: Date.now() - 3 * 86400000,
    expiresAt: Date.now() + 4 * 86400000,
    bannedUntil: null,
    isBanned: false,
    isExpired: false,
    balance: 12345,
  } satisfies StandPlanStatusData,
  size: { width: 400, height: 'auto' as const },
}
