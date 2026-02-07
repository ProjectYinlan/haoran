import { Wallet, Users, User } from 'lucide-react'
import { getMaskString, getShortNumberString } from '../../../utils/index.js'
import { Tag } from '../../../core/components/Tag'

export type StandInfoBaseData = {
  per: number
  balance: number
  totalCount: number
  friendsCount: number
}

export type StandInfoData = {
  avatarUrl: string
  nickname: string
  groupInfo: {
    name: string;
    id: number;
  },
  group: StandInfoBaseData
  global: StandInfoBaseData
}

export const StandInfo = ({
  avatarUrl,
  nickname,
  groupInfo,
  group,
  global,
}: StandInfoData) => {
  if (!group || !global || !groupInfo) return null;
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex gap-4 items-center">
        <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover" />
        <div className="flex flex-col gap-1">
          <span className="text-xl font-semibold">{nickname}</span>
          <span className="text-sm text-slate-500">本群人均 {getShortNumberString(group.per)} 硬币<br />全局人均 {getShortNumberString(global.per)} 硬币</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 items-center">
        <div className="col-span-2 flex gap-1">
          <span className='text-sm font-bold'>{getMaskString(groupInfo.name)}</span>
          <Tag color='secondary' theme='solid-dark'>{getMaskString(groupInfo.id.toString())}</Tag>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <Wallet className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(group.balance)}</span>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <Users className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(group.totalCount)}</span>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <User className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(group.friendsCount)}</span>
        </div>
        <div className="col-span-2 flex gap-1">
          <span className='text-sm font-bold'>全局</span>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <Wallet className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(global.balance)}</span>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <Users className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(global.totalCount)}</span>
        </div>
        <div className="col-span-1 flex items-center justify-center gap-1">
          <User className="text-slate-500 size-4" />
          <span className="text-sm font-semibold">{getShortNumberString(global.friendsCount)}</span>
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
    groupInfo: {
      name: '测试群',
      id: 1234567890,
    },
    group: {
      per: 120,
      balance: 3400,
      totalCount: 40,
      friendsCount: 22,
    },
    global: {
      per: 120,
      balance: 3400,
      totalCount: 40,
      friendsCount: 22,
    }
  } satisfies StandInfoData,
  size: { width: 400, height: 'auto' as const },
}

