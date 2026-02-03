import { BaseScope, BaseScopeType } from "../typings/Command.js"
import { EnhancedMessage } from "../typings/Message.js"

export { getQQAvatarUrl } from "./avatar.js"

const parseNumber = (value?: string) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const resolveScope = (message: EnhancedMessage, scopeArg?: string): BaseScope => {
  if (!scopeArg) {
    if (message.message_type === 'group') {
      return { type: BaseScopeType.GROUP, groupId: message.group_id }
    }
    return { type: BaseScopeType.GLOBAL }
  }

  if (['global', 'all', '*'].includes(scopeArg)) {
    return { type: BaseScopeType.GLOBAL }
  }

  const groupId = parseNumber(scopeArg)
  if (groupId !== undefined) {
    return { type: BaseScopeType.GROUP, groupId }
  }

  return { type: BaseScopeType.GLOBAL }
}