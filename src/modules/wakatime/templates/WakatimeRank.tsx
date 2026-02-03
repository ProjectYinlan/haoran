import { Tag } from '../../../core/components/Tag.js'

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export type RankUser = {
  userId: number
  username: string
  totalSeconds: number
  avatarUrl: string
}

export type WakatimeRankData = {
  title: string
  date: string
  users: RankUser[]
}

const getMedalEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

const getMedalColor = (rank: number): 'warning' | 'secondary' | 'danger' | 'light' => {
  if (rank === 1) return 'warning'
  if (rank === 2) return 'secondary'
  if (rank === 3) return 'danger'
  return 'light'
}

export const WakatimeRank = ({ title, date, users }: WakatimeRankData) => {
  const maxSeconds = Math.max(...users.map(u => u.totalSeconds), 1)

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <span className="text-base font-bold text-slate-800">{title}</span>
        </div>
        <Tag color="primary" theme="solid-light">{date}</Tag>
      </div>

      {/* Rank List */}
      {users.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
          暂无数据，快来绑定 Wakatime 吧！
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user, index) => {
            const rank = index + 1
            const percent = (user.totalSeconds / maxSeconds) * 100
            return (
              <div key={user.userId} className="flex items-center gap-2">
                <Tag color={getMedalColor(rank)} theme="solid-light" className="w-8 text-center">
                  {getMedalEmoji(rank)}
                </Tag>
                <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-medium">{user.username}</span>
                    <span className="text-slate-500">{formatTime(user.totalSeconds)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-slate-400' : rank === 3 ? 'bg-orange-400' : 'bg-blue-400'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-slate-400 text-center">
        Coding 时间大王 · 今日统计
      </div>
    </div>
  )
}

export const preview = {
  title: 'WakatimeRank',
  component: WakatimeRank,
  defaultData: {
    title: '开发时间大王',
    date: new Date().toLocaleDateString('zh-CN'),
    users: [
      { userId: 10001, username: 'Alice', totalSeconds: 28800, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10001&s=100' },
      { userId: 10002, username: 'Bob', totalSeconds: 21600, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10002&s=100' },
      { userId: 10003, username: 'Charlie', totalSeconds: 14400, avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10003&s=100' },
    ]
  } satisfies WakatimeRankData,
  size: { width: 380, height: 'auto' as const },
}
