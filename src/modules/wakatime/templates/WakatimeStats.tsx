import { Tag } from '../../../core/components/Tag.js'
import type { WakatimeStats, WakatimeTodayStats } from '../service.js'

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const ProgressBar = ({ percent, color }: { percent: number; color: string }) => (
  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
  </div>
)

const StatItem = ({ name, value, percent, color }: { name: string; value: string; percent: number; color: string }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-700 font-medium truncate max-w-[120px]">{name}</span>
      <span className="text-slate-500">{value}</span>
    </div>
    <ProgressBar percent={percent} color={color} />
  </div>
)

export type WakatimeStatsCardData = {
  type: 'stats'
  username: string
  stats?: WakatimeStats
  showProjects?: boolean
  avatarUrl?: string
}

export type WakatimeTodayCardData = {
  type: 'today'
  username: string
  stats: WakatimeTodayStats
  showProjects?: boolean
  avatarUrl?: string
}

export type WakatimeCardData = WakatimeStatsCardData | WakatimeTodayCardData

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-500',
  Python: 'bg-green-500',
  Rust: 'bg-orange-500',
  Go: 'bg-cyan-500',
  Java: 'bg-red-500',
  'C++': 'bg-pink-500',
  C: 'bg-slate-500',
  Ruby: 'bg-red-400',
  PHP: 'bg-purple-500',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-violet-500',
  default: 'bg-slate-400'
}

const getLangColor = (name: string) => LANG_COLORS[name] ?? LANG_COLORS.default

export const WakatimeCard = (data: WakatimeCardData) => {
  if (data.type === 'today') {
    return <WakatimeTodayCard {...data} />
  }
  return <WakatimeStatsCard {...data} />
}

const WakatimeStatsCard = ({ username, stats, showProjects = false, avatarUrl }: WakatimeStatsCardData) => {
  const maxLangSeconds = stats ? Math.max(...stats.languages.map(l => l.totalSeconds), 1) : 0

  return stats ? (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{(username || 'U').charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">{username}</span>
            <span className="text-xs text-slate-500">Wakatime Stats</span>
          </div>
        </div>
        <Tag color="primary" theme="solid-light">{stats.range.text}</Tag>
      </div>

      {/* Total Time */}
      <div className="flex items-center justify-center py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-800">{formatTime(stats.totalSeconds)}</span>
          <span className="text-xs text-slate-500">总 Coding 时间</span>
        </div>
        <div className="w-px h-10 bg-slate-200 mx-6" />
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-800">{formatTime(stats.dailyAverage)}</span>
          <span className="text-xs text-slate-500">日均</span>
        </div>
      </div>

      {/* Languages */}
      {stats.languages.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">语言</span>
          <div className="flex flex-col gap-2">
            {stats.languages.map((lang) => (
              <StatItem
                key={lang.name}
                name={lang.name}
                value={formatTime(lang.totalSeconds)}
                percent={(lang.totalSeconds / maxLangSeconds) * 100}
                color={getLangColor(lang.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {showProjects && stats.projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">项目</span>
          <div className="flex flex-wrap gap-1.5">
            {stats.projects.map((project) => (
              <Tag key={project.name} color="secondary" theme="solid-light">
                {project.name} · {formatTime(project.totalSeconds)}
              </Tag>
            ))}
          </div>
        </div>
      )}
      {!showProjects && (
        <div className="flex items-center justify-center py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500">🔒 项目信息已隐藏，发送 waka-public 解除</span>
        </div>
      )}

      {/* Editors & OS */}
      <div className="flex gap-4">
        {stats.editors.length > 0 && (
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">编辑器</span>
            <div className="flex flex-wrap gap-1">
              {stats.editors.map((editor) => (
                <Tag key={editor.name} color="info" theme="solid-light">{editor.name}</Tag>
              ))}
            </div>
          </div>
        )}
        {stats.operatingSystems.length > 0 && (
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">系统</span>
            <div className="flex flex-wrap gap-1">
              {stats.operatingSystems.map((os) => (
                <Tag key={os.name} color="tertiary" theme="solid-light">{os.name}</Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null
}

const WakatimeTodayCard = ({ username, stats, showProjects = false, avatarUrl }: WakatimeTodayCardData) => {
  const maxLangSeconds = Math.max(...stats.languages.map(l => l.totalSeconds), 1)

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{(username || 'U').charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">{username}</span>
            <span className="text-xs text-slate-500">今日 Coding</span>
          </div>
        </div>
        <Tag color="success" theme="solid-light">Today</Tag>
      </div>

      {/* Total Time */}
      <div className="flex items-center justify-center py-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-slate-800">{stats.grandTotal.text}</span>
          <span className="text-xs text-slate-500">今日 Coding 时间</span>
        </div>
      </div>

      {/* Languages */}
      {stats.languages.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">语言</span>
          <div className="flex flex-col gap-2">
            {stats.languages.map((lang) => (
              <StatItem
                key={lang.name}
                name={lang.name}
                value={lang.text}
                percent={(lang.totalSeconds / maxLangSeconds) * 100}
                color={getLangColor(lang.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {showProjects && stats.projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">项目</span>
          <div className="flex flex-wrap gap-1.5">
            {stats.projects.map((project) => (
              <Tag key={project.name} color="secondary" theme="solid-light">
                {project.name} · {project.text}
              </Tag>
            ))}
          </div>
        </div>
      )}
      {!showProjects && (
        <div className="flex items-center justify-center py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500">🔒 项目信息已隐藏，发送 waka-public 解除</span>
        </div>
      )}
    </div>
  )
}

export const preview = {
  title: 'WakatimeStats',
  component: WakatimeCard,
  defaultData: {
    type: 'stats',
    username: 'developer',
    stats: {
      username: 'developer',
      userId: '123',
      totalSeconds: 86400,
      totalSecondsIncludingOtherLanguage: 90000,
      dailyAverage: 14400,
      dailyAverageIncludingOtherLanguage: 15000,
      languages: [
        { name: 'TypeScript', totalSeconds: 36000, percent: 42 },
        { name: 'Python', totalSeconds: 21600, percent: 25 },
        { name: 'Rust', totalSeconds: 14400, percent: 17 },
      ],
      editors: [{ name: 'VS Code', totalSeconds: 86400, percent: 100 }],
      projects: [
        { name: 'my-bot', totalSeconds: 43200, percent: 50 },
        { name: 'api-server', totalSeconds: 21600, percent: 25 },
      ],
      operatingSystems: [{ name: 'Mac', totalSeconds: 86400, percent: 100 }],
      range: { start: '2024-01-01', end: '2024-01-07', text: 'Last 7 Days' }
    }
  } satisfies WakatimeStatsCardData,
  size: { width: 380, height: 'auto' as const },
}
