import WakatimeBinding from './entities/WakatimeBinding.js'
import WakatimeGroupRank from './entities/WakatimeGroupRank.js'
import { getDataSource } from '../../core/database.js'
import { createLogger } from '../../logger.js'
import { In } from 'typeorm'

const logger = createLogger('modules/wakatime')

export type WakatimeStats = {
  username: string
  userId: string
  totalSeconds: number
  totalSecondsIncludingOtherLanguage: number
  dailyAverage: number
  dailyAverageIncludingOtherLanguage: number
  languages: { name: string; totalSeconds: number; percent: number }[]
  editors: { name: string; totalSeconds: number; percent: number }[]
  projects: { name: string; totalSeconds: number; percent: number }[]
  operatingSystems: { name: string; totalSeconds: number; percent: number }[]
  range: { start: string; end: string; text: string }
}

export type WakatimeTodayStats = {
  grandTotal: { totalSeconds: number; text: string }
  languages: { name: string; totalSeconds: number; text: string }[]
  editors: { name: string; totalSeconds: number; text: string }[]
  projects: { name: string; totalSeconds: number; text: string }[]
}

export class WakatimeService {
  private static instance?: WakatimeService

  static getInstance() {
    WakatimeService.instance ??= new WakatimeService()
    return WakatimeService.instance
  }

  private getRepository() {
    return getDataSource().getRepository(WakatimeBinding)
  }

  private getGroupRankRepository() {
    return getDataSource().getRepository(WakatimeGroupRank)
  }

  // 群排行相关方法
  async getGroupRankConfig(groupId: number): Promise<WakatimeGroupRank | null> {
    return await this.getGroupRankRepository().findOne({ where: { groupId } })
  }

  async setGroupRankEnabled(groupId: number, enabled: boolean): Promise<WakatimeGroupRank> {
    const repo = this.getGroupRankRepository()
    let config = await repo.findOne({ where: { groupId } })
    if (!config) {
      config = repo.create({ groupId, enabled })
    } else {
      config.enabled = enabled
    }
    return await repo.save(config)
  }

  async getAllEnabledGroupRanks(): Promise<WakatimeGroupRank[]> {
    return await this.getGroupRankRepository().find({ where: { enabled: true } })
  }

  async getBindingsByUserIds(userIds: number[]): Promise<WakatimeBinding[]> {
    if (userIds.length === 0) return []
    return await this.getRepository().find({ where: { userId: In(userIds) } })
  }

  async fetchTodayForUsers(bindings: WakatimeBinding[]): Promise<{ userId: number; username: string; totalSeconds: number }[]> {
    const results: { userId: number; username: string; totalSeconds: number }[] = []
    
    for (const binding of bindings) {
      try {
        const stats = await this.fetchToday(binding.apiKey)
        results.push({
          userId: binding.userId,
          username: binding.username ?? 'User',
          totalSeconds: stats.grandTotal.totalSeconds
        })
      } catch (error) {
        logger.warn(`获取用户 ${binding.userId} 今日统计失败: ${error}`)
      }
    }
    
    return results.sort((a, b) => b.totalSeconds - a.totalSeconds)
  }

  async bindToken(userId: number, apiKey: string): Promise<WakatimeBinding> {
    const repo = this.getRepository()
    let binding = await repo.findOne({ where: { userId } })
    
    // 验证 token 并获取用户名
    const user = await this.fetchCurrentUser(apiKey)
    
    if (binding) {
      binding.apiKey = apiKey
      binding.username = user.username
    } else {
      binding = repo.create({ userId, apiKey, username: user.username })
    }
    
    return await repo.save(binding)
  }

  async unbindToken(userId: number): Promise<boolean> {
    const repo = this.getRepository()
    const result = await repo.delete({ userId })
    return (result.affected ?? 0) > 0
  }

  async getBinding(userId: number): Promise<WakatimeBinding | null> {
    return await this.getRepository().findOne({ where: { userId } })
  }

  async toggleShowProjects(userId: number): Promise<boolean> {
    const repo = this.getRepository()
    const binding = await repo.findOne({ where: { userId } })
    if (!binding) return false
    binding.showProjects = !binding.showProjects
    await repo.save(binding)
    return binding.showProjects
  }

  private async fetchCurrentUser(apiKey: string): Promise<{ username: string; userId: string }> {
    const response = await fetch('https://wakatime.com/api/v1/users/current', {
      headers: { Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` }
    })
    
    if (!response.ok) {
      throw new Error(`Wakatime API 错误: ${response.status}`)
    }
    
    const data = await response.json() as any
    const user = data.data
    // username 可能为 null，fallback 到 display_name 或 email
    const username = user.username || user.display_name || user.email?.split('@')[0] || 'User'
    return { username, userId: user.id }
  }

  async fetchStats(apiKey: string, range: 'last_7_days' | 'last_30_days' | 'last_6_months' | 'last_year' = 'last_7_days'): Promise<WakatimeStats> {
    const response = await fetch(`https://wakatime.com/api/v1/users/current/stats/${range}`, {
      headers: { Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` }
    })
    
    if (!response.ok) {
      throw new Error(`Wakatime API 错误: ${response.status}`)
    }
    
    const data = await response.json() as any
    const stats = data.data
    
    return {
      username: stats.username,
      userId: stats.user_id,
      totalSeconds: stats.total_seconds ?? 0,
      totalSecondsIncludingOtherLanguage: stats.total_seconds_including_other_language ?? 0,
      dailyAverage: stats.daily_average ?? 0,
      dailyAverageIncludingOtherLanguage: stats.daily_average_including_other_language ?? 0,
      languages: (stats.languages ?? []).slice(0, 5).map((l: any) => ({
        name: l.name,
        totalSeconds: l.total_seconds,
        percent: l.percent
      })),
      editors: (stats.editors ?? []).slice(0, 3).map((e: any) => ({
        name: e.name,
        totalSeconds: e.total_seconds,
        percent: e.percent
      })),
      projects: (stats.projects ?? []).slice(0, 5).map((p: any) => ({
        name: p.name,
        totalSeconds: p.total_seconds,
        percent: p.percent
      })),
      operatingSystems: (stats.operating_systems ?? []).map((o: any) => ({
        name: o.name,
        totalSeconds: o.total_seconds,
        percent: o.percent
      })),
      range: {
        start: stats.start,
        end: stats.end,
        text: stats.human_readable_range ?? range
      }
    }
  }

  async fetchToday(apiKey: string): Promise<WakatimeTodayStats> {
    const response = await fetch('https://wakatime.com/api/v1/users/current/summaries?range=today', {
      headers: { Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}` }
    })
    
    if (!response.ok) {
      throw new Error(`Wakatime API 错误: ${response.status}`)
    }
    
    const data = await response.json() as any
    const summary = data.data?.[0] ?? {}
    
    return {
      grandTotal: {
        totalSeconds: summary.grand_total?.total_seconds ?? 0,
        text: summary.grand_total?.text ?? '0 secs'
      },
      languages: (summary.languages ?? []).slice(0, 5).map((l: any) => ({
        name: l.name,
        totalSeconds: l.total_seconds,
        text: l.text
      })),
      editors: (summary.editors ?? []).slice(0, 3).map((e: any) => ({
        name: e.name,
        totalSeconds: e.total_seconds,
        text: e.text
      })),
      projects: (summary.projects ?? []).slice(0, 5).map((p: any) => ({
        name: p.name,
        totalSeconds: p.total_seconds,
        text: p.text
      }))
    }
  }
}
