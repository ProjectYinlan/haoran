import { BaseCommand, Command, Module, Permission, Message, Args, Usage } from "../../core/decorators.js"
import { Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { VaultService } from "./service.js"
import { resolveScope } from "../../utils/index.js"
import { BaseScopeType } from "../../typings/Command.js"

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
} 

