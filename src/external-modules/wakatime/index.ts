import { BaseCommand, Command, Module, Permission, Message, Args, Usage, PrivateOnly, GroupOnly, Bot } from "../../core/decorators.js"
import { NCWebsocket, Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { WakatimeService } from "./service.js"
import { WakatimeCard } from "./templates/WakatimeStats.js"
import { WakatimeRank } from "./templates/WakatimeRank.js"
import { renderTemplate } from "../../core/playwright.js"
import { getQQAvatarUrl } from "../../utils/index.js"
import { Cron, CronBot } from "../../core/scheduler.js"
import { createLogger } from "../../logger.js"

const logger = createLogger('modules/wakatime')

@Module('wakatime')
export default class WakatimeModule extends BaseCommand {
  private wakatimeService = WakatimeService.getInstance()

  initialize() {}

  // 每天 18:00 推送群排行
  @Cron('0 18 * * *', 'daily-rank')
  async dailyRankTask(@CronBot() bot: NCWebsocket) {
    const configs = await this.wakatimeService.getAllEnabledGroupRanks()
    for (const config of configs) {
      await this.sendGroupRank(bot, config.groupId)
    }
  }

  private async sendGroupRank(bot: NCWebsocket, groupId: number) {
    try {
      // 获取群成员列表
      const members = await bot.get_group_member_list({ group_id: groupId })
      const memberMap = new Map(members.map(m => [m.user_id, m.nickname || m.card || String(m.user_id)]))
      const memberIds = members.map(m => m.user_id)
      
      // 获取绑定了 wakatime 的成员
      const bindings = await this.wakatimeService.getBindingsByUserIds(memberIds)
      if (bindings.length === 0) {
        return
      }

      // 获取今日统计，使用 QQ 昵称
      const stats = await this.wakatimeService.fetchTodayForUsers(bindings)
      
      // 渲染排行榜
      const today = new Date().toLocaleDateString('zh-CN')
      const image = await renderTemplate(
        WakatimeRank({
          title: '开发时间大王',
          date: today,
          users: stats.map(s => ({
            userId: s.userId,
            username: memberMap.get(s.userId) ?? s.username,
            totalSeconds: s.totalSeconds,
            avatarUrl: getQQAvatarUrl(s.userId, 100)
          }))
        }),
        { width: 380, height: 'auto', minHeight: 200 }
      )

      await bot.send_group_msg({
        group_id: groupId,
        message: [Structs.image(image)]
      })
    } catch (error) {
      logger.error(`发送群 ${groupId} 排行失败: ${error}`)
    }
  }

  @Command('waka-bind', '绑定 Wakatime API Key')
  @Usage('waka-bind <api_key>')
  @Permission('wakatime.bind')
  @PrivateOnly('⚠️ 为保护你的 API Key，请添加机器人好友后私聊使用此命令')
  async handleBind(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const apiKey = args[0]
    if (!apiKey) {
      await message.reply([Structs.text('请提供 Wakatime API Key\n获取地址: https://wakatime.com/settings/api-key')])
      return
    }

    try {
      const binding = await this.wakatimeService.bindToken(message.sender.user_id, apiKey)
      await message.reply([Structs.text(`✅ 绑定成功！\n用户名: ${binding.username}\n\n⚠️ 请撤回包含 Token 的消息以保护隐私`)])
    } catch (error) {
      await message.reply([Structs.text(`❌ 绑定失败: ${error instanceof Error ? error.message : '未知错误'}`)])
    }
  }

  @Command('waka-unbind', '解绑 Wakatime')
  @Permission('wakatime.unbind')
  async handleUnbind(
    @Message() message: EnhancedMessage,
  ) {
    const success = await this.wakatimeService.unbindToken(message.sender.user_id)
    if (success) {
      await message.reply([Structs.text('✅ 已解绑 Wakatime')])
    } else {
      await message.reply([Structs.text('❌ 你还没有绑定 Wakatime')])
    }
  }

  @Command('waka', '查看 Wakatime 统计')
  @Usage('waka [7d|30d|6m|1y]')
  @Permission('wakatime.stats')
  async handleStats(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const binding = await this.wakatimeService.getBinding(message.sender.user_id)
    if (!binding) {
      await message.reply([Structs.text('❌ 请先私聊机器人使用 waka-bind 绑定你的 Wakatime API Key')])
      return
    }

    const rangeMap: Record<string, 'last_7_days' | 'last_30_days' | 'last_6_months' | 'last_year'> = {
      '7d': 'last_7_days',
      '30d': 'last_30_days',
      '6m': 'last_6_months',
      '1y': 'last_year',
    }
    const range = rangeMap[args[0]] ?? 'last_7_days'

    try {
      const stats = await this.wakatimeService.fetchStats(binding.apiKey, range)
      const avatarUrl = getQQAvatarUrl(message.sender.user_id, 100)
      // 使用 QQ 昵称
      const nickname = message.sender.nickname || message.sender.card || binding.username || stats.username
      const image = await renderTemplate(
        WakatimeCard({ type: 'stats', username: nickname, stats, showProjects: binding.showProjects, avatarUrl }),
        { width: 380, height: 'auto', minHeight: 200 }
      )
      await message.reply([Structs.image(image)])
    } catch (error) {
      await message.reply([Structs.text(`❌ 获取统计失败: ${error instanceof Error ? error.message : '未知错误'}`)])
    }
  }

  @Command('waka-today', '查看今日 Wakatime 统计')
  @Permission('wakatime.today')
  async handleToday(
    @Message() message: EnhancedMessage,
  ) {
    const binding = await this.wakatimeService.getBinding(message.sender.user_id)
    if (!binding) {
      await message.reply([Structs.text('❌ 请先私聊机器人使用 waka-bind 绑定你的 Wakatime API Key')])
      return
    }

    try {
      const stats = await this.wakatimeService.fetchToday(binding.apiKey)
      const avatarUrl = getQQAvatarUrl(message.sender.user_id, 100)
      // 使用 QQ 昵称
      const nickname = message.sender.nickname || message.sender.card || binding.username || 'User'
      const image = await renderTemplate(
        WakatimeCard({ type: 'today', username: nickname, stats, showProjects: binding.showProjects, avatarUrl }),
        { width: 380, height: 'auto', minHeight: 160 }
      )
      await message.reply([Structs.image(image)])
    } catch (error) {
      await message.reply([Structs.text(`❌ 获取今日统计失败: ${error instanceof Error ? error.message : '未知错误'}`)])
    }
  }

  @Command('waka-public', '切换项目显示状态')
  @Permission('wakatime.public')
  async handlePublic(
    @Message() message: EnhancedMessage,
  ) {
    const newState = await this.wakatimeService.toggleShowProjects(message.sender.user_id)
    if (newState === false) {
      const binding = await this.wakatimeService.getBinding(message.sender.user_id)
      if (!binding) {
        await message.reply([Structs.text('❌ 请先使用 waka-bind 绑定你的 Wakatime API Key')])
        return
      }
    }
    await message.reply([Structs.text(newState ? '✅ 已开启项目显示' : '✅ 已关闭项目显示')])
  }

  @Command('waka-rank-on', '开启群 Coding 时间大王')
  @Permission('wakatime.rank')
  @GroupOnly('该命令仅限群聊使用')
  async handleRankOn(
    @Message() message: EnhancedMessage,
  ) {
    if (message.message_type !== 'group') return
    
    const groupId = message.group_id
    await this.wakatimeService.setGroupRankEnabled(groupId, true)
    
    await message.reply([Structs.text('✅ 已开启 Coding 时间大王\n每天 18:00 自动推送排行榜')])
  }

  @Command('waka-rank-off', '关闭群 Coding 时间大王')
  @Permission('wakatime.rank')
  @GroupOnly('该命令仅限群聊使用')
  async handleRankOff(
    @Message() message: EnhancedMessage,
  ) {
    if (message.message_type !== 'group') return
    
    const groupId = message.group_id
    await this.wakatimeService.setGroupRankEnabled(groupId, false)
    
    await message.reply([Structs.text('✅ 已关闭 Coding 时间大王')])
  }

  @Command('waka-rank', '立即查看群 Coding 排行')
  @Permission('wakatime.rank')
  @GroupOnly('该命令仅限群聊使用')
  async handleRankNow(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    if (message.message_type !== 'group') return
    await this.sendGroupRank(bot, message.group_id)
  }
}
