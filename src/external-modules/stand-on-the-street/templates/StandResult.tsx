export type StandFriendItem = {
  userId: number
  score: number
  avatarUrl: string
}

import { Wallet, Users } from 'lucide-react'
import { getShortNumberString } from '../../../utils/index.js'
import { isUndefined } from 'lodash-es'
import { Tag } from '../../../core/components/Tag.js'

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
  totalVisits: number
  round?: number
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
  totalVisits,
  round,
}: StandResultData) => {
  if (!friends || isUndefined(totalScore) || isUndefined(totalCount) || isUndefined(othersScore) || isUndefined(othersCount) || isUndefined(friendsScore) || isUndefined(balance) || isUndefined(totalVisits)) return null;
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

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span>{getShortNumberString(balance)}</span>
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
    totalVisits: 42,
    round: 4
  } satisfies StandResultData,
  size: { width: 400, height: 'auto' as const },
}

