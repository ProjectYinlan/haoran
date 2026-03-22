export type StandFriendItem = {
  userId: number
  score: number
  avatarUrl: string
}

import { Wallet, Users, Sparkles, Package, Megaphone, ShieldCheck, Crown, Clover, Shield, SprayCan, Pill, CreditCard, AlertTriangle, Coffee, Footprints, Volume2, IterationCw, Gift } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { isUndefined } from 'lodash-es'
import { Tag } from '../../../core/components/Tag.js'
import type { ComponentType, SVGProps } from 'react'

export type ItemEffectDetail = {
  itemName: string
  description: string
}

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

export type StandResultData = {
  avatarUrl: string
  nickname: string
  content: string
  totalScore: number
  totalCount: number
  othersScore: number
  othersCount: number
  friendsScore: number
  friends: StandFriendItem[]
  balance: number
  previousBalance?: number
  balanceIncome?: number
  balanceExpense?: number
  totalVisits: number
  round?: number
  events?: Array<{ name: string; description: string }>
  eventPenalty?: number
  itemEffects?: ItemEffectDetail[]
  planInfo?: {
    tier: string
    dailyUsed: number
    dailyLimit: number
    weeklyUsed: number
    weeklyLimit: number
    sanctioned?: boolean
    expiresAt?: number
    refund?: number
  }
  boomerangReflect?: number
}

export const StandResult = ({
  avatarUrl,
  nickname,
  content,
  totalScore,
  totalCount,
  othersScore,
  othersCount,
  friendsScore,
  friends = [],
  balance,
  previousBalance,
  balanceIncome,
  balanceExpense,
  totalVisits,
  round,
  events: eventList,
  eventPenalty,
  itemEffects,
  planInfo,
  boomerangReflect,
}: StandResultData) => {
  if (!friends || isUndefined(totalScore) || isUndefined(totalCount) || isUndefined(othersScore) || isUndefined(othersCount) || isUndefined(friendsScore) || isUndefined(balance) || isUndefined(totalVisits)) return null;

  const hasIncome = (balanceIncome ?? 0) > 0
  const hasExpense = (balanceExpense ?? 0) > 0

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-3 items-center">
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col flex-1">
          <span className="text-base font-semibold">{nickname}</span>
          {content && <span className="text-sm text-slate-500 whitespace-pre-wrap">{content}</span>}
        </div>
        {round && <div className='flex gap-1 items-center'>连续 <Tag>{round}</Tag> 次</div>}
      </div>

      {eventList && eventList.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex flex-col gap-1">
          {eventList.map((ev, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm font-medium text-amber-800">{ev.name}</span>
              </div>
              {ev.description && <span className="text-xs text-amber-600 pl-5.5">{ev.description}</span>}
            </div>
          ))}
          {eventPenalty !== undefined && eventPenalty > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500 pl-5.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>事件扣除 {getShortNumberString(eventPenalty)} 硬币</span>
            </div>
          )}
        </div>
      )}

      {itemEffects && itemEffects.length > 0 && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-indigo-800">道具效果</span>
          </div>
          {itemEffects.map((ie, idx) => {
            const Icon = itemIconMap[ie.itemName] ?? Package
            return (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-indigo-600 pl-1">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium shrink-0">{ie.itemName}</span>
                <span className="text-indigo-500">{ie.description}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 bg-slate-50">
        <div className="flex justify-between text-sm">
          <span>总计</span>
          <span className="font-medium">{getShortNumberString(totalScore)} 硬币 · {getShortNumberString(totalCount)} 人次</span>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="flex justify-between text-sm">
          <span>路人</span>
          <span className="font-medium">{getShortNumberString(othersScore)} 硬币 · {getShortNumberString(othersCount)} 人次</span>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="flex justify-between text-sm">
          <span>群友</span>
          <span className="font-medium">{getShortNumberString(friendsScore)} 硬币 · {getShortNumberString(friends.length)} 人次</span>
        </div>
        {friends.length > 0 && (
          <div className="grid grid-cols-5 gap-2 pt-2">
            {friends.map(friend => (
              <div key={friend.userId} className="flex flex-col items-center gap-1">
                <img src={friend.avatarUrl} className="w-9 h-9 rounded-full object-cover" />
                <span className="text-xs text-slate-500">{friend.score === 0 ? '白嫖' : getShortNumberString(friend.score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {boomerangReflect && boomerangReflect > 0 && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2 text-xs bg-orange-50 border border-orange-200">
          <IterationCw className="w-3.5 h-3.5 shrink-0 text-orange-500" />
          <span className="font-medium text-orange-600">回旋镖反弹！</span>
          <span className="text-orange-500">你被扣除了 {getShortNumberString(boomerangReflect)} 硬币</span>
        </div>
      )}

      {planInfo && (
        <div className={`rounded-lg px-3 py-2 flex flex-col gap-1 text-xs ${planInfo.sanctioned ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <CreditCard className={`w-3.5 h-3.5 shrink-0 ${planInfo.sanctioned ? 'text-red-500' : 'text-slate-500'}`} />
            <span className={`font-medium ${planInfo.sanctioned ? 'text-red-600' : planInfo.tier === 'max' ? 'text-amber-600' : 'text-indigo-600'}`}>
              {planInfo.tier === 'max' ? 'Plan Max' : 'Plan Pro'}
            </span>
            {planInfo.sanctioned
              ? <span className="text-red-500">已被制裁！{planInfo.refund ? `退款 ${planInfo.refund}` : ''}</span>
              : <span className="text-slate-500">日 {planInfo.dailyUsed}/{planInfo.dailyLimit} · 周 {planInfo.weeklyUsed}/{planInfo.weeklyLimit}</span>
            }
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span>{getShortNumberString(balance)}</span>
          {previousBalance !== undefined && (hasIncome || hasExpense) && (
            <span className="text-xs text-slate-400">
              ({getShortNumberString(previousBalance)}
              {hasIncome && <span className="text-emerald-600"> +{getShortNumberString(balanceIncome!)}</span>}
              {hasExpense && <span className="text-red-500"> -{getShortNumberString(balanceExpense!)}</span>})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{getShortNumberString(totalVisits)}</span>
        </div>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandResult',
  component: StandResult,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    content: '卖铺成功！',
    totalScore: 800,
    totalCount: 5,
    othersScore: 200,
    othersCount: 2,
    friendsScore: 600,
    friends: [
      { userId: 10001, score: 100, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10001&s=100' },
      { userId: 10002, score: 200, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10002&s=100' },
      { userId: 10003, score: 300, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10003&s=100' },
    ],
    balance: 12345,
    previousBalance: 11545,
    balanceIncome: 2100,
    balanceExpense: 1300,
    totalVisits: 42,
    round: 4,
    events: [
      { name: '双倍快乐', description: '今天运气特别好，所有收入翻倍' },
      { name: '老板巡街', description: '老板心情好，额外打赏' },
    ],
    itemEffects: [
      { itemName: '广告牌', description: '收入 800 → 1200 (x1.5)，保底 3 人' },
    ],
  } satisfies StandResultData,
  size: { width: 400, height: 'auto' as const },
}

