import { BaseCommand, Command, Module, Permission, Message, Args, Usage, Bot } from "../../core/decorators.js"
import { NCWebsocket, Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { VaultService } from "./service.js"
import { resolveScope } from "../../utils/index.js"
import { BaseScopeType } from "../../typings/Command.js"
import { renderTemplate } from "../../core/playwright.js"
import { VaultBill } from "./templates/VaultBill.js"
import dayjs from "dayjs"
import { getQQAvatarUrl } from "../../utils/index.js"

/**
 * 全局基础经济模块
 */
@Module('vault')
export default class VaultModule extends BaseCommand {
  private vaultService = VaultService.getInstance()

  initialize() {
  }

  @Command('wallet', '查看余额')
  @Usage('wallet [global|<groupId>]')
  @Permission('vault.balance')
  async handleBalance(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const scope = resolveScope(message, args[0])
    const account = await this.vaultService.getOrCreateAccount(message.sender.user_id, scope)
    const label = scope.type === BaseScopeType.GROUP ? `群` : '全局'
    await message.reply([
      Structs.text(`${label}余额: ${account.balance}`)
    ])
  }

  @Command('wallet-bill', '查看账户流水')
  @Usage('wallet-bill [count] [global|<groupId>]')
  @Permission('vault.bill')
  async handleBills(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
    @Bot() bot: NCWebsocket,
  ) {
    const count = Number(args[0])
    const limit = Number.isFinite(count) ? Math.min(Math.max(count, 1), 20) : 10
    const scope = resolveScope(message, args[1])
    const bills = await this.vaultService.listBills({
      userId: message.sender.user_id,
      scope,
      limit,
    })
    const label = scope.type === BaseScopeType.GROUP ? `群` : '全局'
    const lines = this.vaultService.formatBillsForPrint(bills)
    this.vaultService.logBills(bills)
    let scopeLabel = label
    if (scope.type === BaseScopeType.GROUP && scope.groupId) {
      try {
        const groupInfo = await bot.get_group_info({ group_id: scope.groupId })
        const name = groupInfo.group_name || String(scope.groupId)
        if (name.length >= 2) {
          scopeLabel = `${name[0]}***${name[name.length - 1]}`
        } else {
          scopeLabel = `${name}***`
        }
      } catch (error) {
        scopeLabel = `${scope.groupId}`
      }
    }
    const items = bills.map((bill, index) => {
      const time = dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm:ss')
      const sign = bill.type === 'income' ? '+' : '-'
      const amount = `${sign}${Math.abs(Number(bill.change))}`
      return {
        label: `${index + 1}. ${time} ${bill.description}`,
        amount,
        type: bill.type,
      }
    })
    const image = await renderTemplate(
      VaultBill({
        title: `${label}流水`,
        scopeLabel,
        userName: message.sender.card || message.sender.nickname || String(message.sender.user_id),
        userId: message.sender.user_id,
        avatarUrl: getQQAvatarUrl(message.sender.user_id, 100),
        items,
      }),
      { width: 420, height: 'auto', minHeight: 200 }
    )
    await message.reply([Structs.image(image)])
  }
} 

