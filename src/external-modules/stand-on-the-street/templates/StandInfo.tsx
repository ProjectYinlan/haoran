import { Wallet, Users, User } from 'lucide-react'

export type StandInfoData = {
  avatarUrl: string
  nickname: string
  per: number
  balance: number
  totalCount: number
  friendsCount: number
}

export const StandInfo = ({
  avatarUrl,
  nickname,
  per,
  balance,
  totalCount,
  friendsCount,
}: StandInfoData) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-4 items-center">
        <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover" />
        <div className="flex flex-col gap-1">
          <span className="text-xl font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">人均 {per} 硬币</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 border border-slate-200 py-3">
          <div className="flex flex-col items-center gap-1">
            <Wallet className="w-5 h-5 text-slate-500" />
            <div className="text-base font-semibold">{balance}</div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 py-3">
          <div className="flex flex-col items-center gap-1">
            <Users className="w-5 h-5 text-slate-500" />
            <div className="text-base font-semibold">{totalCount}</div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 py-3">
          <div className="flex flex-col items-center gap-1">
            <User className="w-5 h-5 text-slate-500" />
            <div className="text-base font-semibold">{friendsCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const preview = {
  title: 'StandInfo',
  component: StandInfo,
  defaultData: {
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    nickname: '站街达人',
    per: 120,
    balance: 3400,
    totalCount: 40,
    friendsCount: 22,
  } satisfies StandInfoData,
  size: { width: 400, height: 'auto' as const },
}

