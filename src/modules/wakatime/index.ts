import { BaseCommand, Command, Module, Permission, Message, Args, Usage, Example, PrivateOnly } from "../../core/decorators.js"
import { Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { WakatimeService } from "./service.js"
import { WakatimeCard } from "./templates/WakatimeStats.js"
import { renderTemplate } from "../../core/playwright.js"
import { getQQAvatarUrl } from "../../utils/index.js"

@Module('wakatime')
export default class WakatimeModule extends BaseCommand {
  private wakatimeService = WakatimeService.getInstance()

  initialize() {}

  @Command('waka-bind', '绑定 Wakatime API Key')
  @Usage('waka-bind <api_key>')
  @Example('waka-bind waka_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
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
  @Example(['waka', 'waka 30d'])
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
      const image = await renderTemplate(
        WakatimeCard({ type: 'stats', username: binding.username ?? stats.username, stats, showProjects: binding.showProjects, avatarUrl }),
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
      const image = await renderTemplate(
        WakatimeCard({ type: 'today', username: binding.username ?? 'User', stats, showProjects: binding.showProjects, avatarUrl }),
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
}
