import { BaseCommand, Module } from "../../core/decorators.js"
import { NCWebsocket, Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { createExternalModuleLogger } from "../../logger.js"

type RepeaterState = {
  content: string
  senders: number[]
}

@Module('repeater')
export default class RepeaterModule extends BaseCommand {
  private readonly states = new Map<number, RepeaterState>()

  private logger = createExternalModuleLogger(this.moduleName)

  initialize() { }

  async onMessage(
    _bot: NCWebsocket,
    message: EnhancedMessage,
    content: string,
  ) {

    if (message.message_type !== 'group') return
    if (message.sender.user_id === message.self_id) return

    const normalized = content.trim()
    if (!normalized) return

    const groupId = message.group_id
    const state = this.states.get(groupId) ?? { content: '', senders: [] }

    if (state.content !== normalized) {
      state.content = normalized
      state.senders = [message.sender.user_id]
      this.states.set(groupId, state)
      return
    }

    const lastSender = state.senders[state.senders.length - 1]
    if (lastSender === message.sender.user_id) {
      state.senders = [message.sender.user_id]
      this.states.set(groupId, state)
      return
    }

    if (state.senders.includes(message.sender.user_id)) {
      state.senders = [message.sender.user_id]
      this.states.set(groupId, state)
      return
    }


    state.senders.push(message.sender.user_id)
    this.states.set(groupId, state)

    if (state.senders.length >= 3) {
      this.logger.debug(`复读触发 groupId=${groupId} content=${normalized}`)
      await message.reply([Structs.text(normalized)])
      this.states.set(groupId, { content: '', senders: [] })
    }
  }
}
