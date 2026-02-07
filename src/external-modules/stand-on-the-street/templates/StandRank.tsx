import { Tag } from "../../../core/components/Tag"
import { getMaskString, getShortNumberString } from "../../../utils"

export type StandRankItem = {
  userId: number
  nickname: string
  title?: string
  number: number
  unit: string
  avatarUrl: string
}

export type StandRankData = {
  groupInfo: {
    name: string
    id: number
  }
  title: string
  items: StandRankItem[]
}

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export const StandRank = ({ groupInfo, title, items = [] }: StandRankData) => {
  if (!groupInfo) return null;
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="flex items-center gap-1"><span className="text-base font-semibold">{getMaskString(groupInfo.name)}</span> <Tag color='secondary'>{getMaskString(groupInfo.id.toString())}</Tag></span>
          <span className="text-sm text-slate-500">{title}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">暂无数据</div>
        ) : items.map((item, index) => (
          <div key={item.userId} className="flex items-center gap-3">
            <div className="w-8 text-center text-sm text-slate-500">{getMedal(index + 1)}</div>
            <img src={item.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <div className="text-sm font-medium">{item.nickname}</div>
              {item.title && <div className="text-xs text-slate-400">{item.title}</div>}
            </div>
            <div className="text-sm font-semibold">{getShortNumberString(item.number)} {item.unit}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export const preview = {
  title: 'StandRank',
  component: StandRank,
  defaultData: {
    groupInfo: {
      name: '站街研究院',
      id: 10001,
    },
    title: '站街人气榜',
    items: [
      { userId: 10001, nickname: 'Alice', number: 120, unit: '人次', avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10001&s=100', title: '最受欢迎β' },
      { userId: 10002, nickname: 'Bob', number: 100, unit: '人次', avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10002&s=100' },
      { userId: 10003, nickname: 'Charlie', number: 80, unit: '人次', avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10003&s=100' },
    ],
  } satisfies StandRankData,
  size: { width: 400, height: 'auto' as const },
}

