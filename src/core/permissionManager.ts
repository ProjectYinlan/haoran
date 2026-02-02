import { config } from '../config.js'
import { EnhancedMessage } from '../typings/Message.js'

export enum Role {
  Owner = 'owner',
  GroupAdmin = 'group_admin',
  BotAdmin = 'bot_admin',
  Member = 'member'
}

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.Owner]: ['*'],
  [Role.BotAdmin]: ['*'],
  [Role.GroupAdmin]: ['utils.*', 'question.*'],
  [Role.Member]: []
}

const matchPermission = (rule: string, permission: string): boolean => {
  if (rule === '*') return true
  if (rule.endsWith('.*')) {
    const prefix = rule.slice(0, -2)
    return permission === prefix || permission.startsWith(`${prefix}.`)
  }
  return rule === permission
}

export class PermissionManager {
  private rolePermissions: Record<Role, string[]>

  constructor() {
    const overrides = config.rbac?.rolePermissions ?? {}
    this.rolePermissions = {
      [Role.Owner]: overrides.owner ?? DEFAULT_ROLE_PERMISSIONS[Role.Owner],
      [Role.BotAdmin]: overrides.bot_admin ?? DEFAULT_ROLE_PERMISSIONS[Role.BotAdmin],
      [Role.GroupAdmin]: overrides.group_admin ?? DEFAULT_ROLE_PERMISSIONS[Role.GroupAdmin],
      [Role.Member]: overrides.member ?? DEFAULT_ROLE_PERMISSIONS[Role.Member]
    }
  }

  private isOwner(userId: number): boolean {
    return (config.rbac?.owners ?? []).includes(userId)
  }

  private isBotAdmin(userId: number, groupId?: number): boolean {
    const botAdmins = config.rbac?.botAdmins
    if (!botAdmins) return false

    if (botAdmins.global?.includes(userId)) return true
    if (groupId !== undefined) {
      const groupAdmins = botAdmins.groups?.[String(groupId)] ?? []
      return groupAdmins.includes(userId)
    }
    return false
  }

  private isGroupAdmin(message: EnhancedMessage): boolean {
    if (message.message_type !== 'group') return false
    const role = (message as any).sender?.role
    return role === 'owner' || role === 'admin'
  }

  getRoles(message: EnhancedMessage): Role[] {
    const roles = new Set<Role>()
    const userId = message.sender.user_id
    const groupId = message.message_type === 'group' ? message.group_id : undefined

    if (this.isOwner(userId)) roles.add(Role.Owner)
    if (this.isBotAdmin(userId, groupId)) roles.add(Role.BotAdmin)
    if (this.isGroupAdmin(message)) roles.add(Role.GroupAdmin)
    if (roles.size === 0) roles.add(Role.Member)

    return Array.from(roles)
  }

  hasPermission(message: EnhancedMessage, permission: string): boolean {
    const roles = this.getRoles(message)
    for (const role of roles) {
      const rules = this.rolePermissions[role] ?? []
      if (rules.some(rule => matchPermission(rule, permission))) {
        return true
      }
    }
    return false
  }
}

