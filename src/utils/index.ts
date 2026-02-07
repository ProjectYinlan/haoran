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

export const getMaskString = (str: string) => {
  if (!str) return str
  if (str.length <= 2) return str[0] + '**'
  return str[0] + '**' + str[str.length - 1]
}

export const getShortNumberString = (number: number) => {
  if (number < 1000) return `${number}`;
  const units = ['', 'K', 'M', 'B', 'T', 'P'];
  let unitIdx = 0;
  let num = number;
  while (num >= 1000 && unitIdx < units.length - 1) {
    num /= 1000;
    unitIdx++;
  }
  const numStr =
    num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace(/\.0$/, '');
  return `${numStr}${units[unitIdx]}`;
}