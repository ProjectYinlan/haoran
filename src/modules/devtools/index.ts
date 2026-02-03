import { BaseCommand, Module, Permission, Message, Usage, SubCommand } from "../../core/decorators.js"
import { Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"

@Module('devtools')
export default class DevtoolsModule extends BaseCommand {
  initialize() {
  }
  @SubCommand('message-info', '查看该消息的元信息')
  @Usage('message-info')
  @Permission('devtools.message-info')
  async handleMessageInfo(
    @Message() message: EnhancedMessage,
  ) {
    await message.reply([
      Structs.text(`raw: ${JSON.stringify(message.raw_message)}
message: ${JSON.stringify(message.message)}
`)
    ])
  }
}

