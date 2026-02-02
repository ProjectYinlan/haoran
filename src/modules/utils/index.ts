import { BaseCommand, Command, Module, Permission, Message, Args, Usage, Example } from '../../core/decorators.js'
import { Structs } from 'node-napcat-ts'
import { EnhancedMessage } from '../../typings/Message.js'
import UtilRecord from './entities/UtilRecord.js'
import { getDataSource } from '../../core/database.js'
import dayjs from 'dayjs'
import { UserProfile } from './templates/UserProfile.js'
import { Help, type HelpData } from './templates/Help.js'
import { renderTemplate } from '../../core/playwright.js'
import { PermissionManager, Role } from '../../core/permissionManager.js'
import { CommandManager } from '../../core/commandManager.js'
import { configManager } from '../../config.js'

const utilRecordRepository = getDataSource().getRepository(UtilRecord)
const permissionManager = new PermissionManager()
const MANAGE_PERMISSION = 'utils.permission.manage'

const parseNumber = (value?: string) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parsePermissions = (value?: string) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const resolveScope = (message: EnhancedMessage, scopeArg?: string) => {
  if (!scopeArg) {
    if (message.message_type === 'group') {
      return { type: 'group' as const, groupId: message.group_id }
    }
    return { type: 'global' as const }
  }

  if (['global', 'all', '*'].includes(scopeArg)) {
    return { type: 'global' as const }
  }

  const groupId = parseNumber(scopeArg)
  if (groupId !== undefined) {
    return { type: 'group' as const, groupId }
  }

  return { type: 'global' as const }
}

const ensureRbacConfig = (configData: Record<string, any>) => {
  configData.rbac ??= {}
  const rbac = configData.rbac
  rbac.rolePermissions ??= {}
  rbac.roleMembers ??= {}
  rbac.roleMembers.global ??= {}
  rbac.roleMembers.groups ??= {}
  rbac.userPermissions ??= {}
  rbac.userPermissions.global ??= {}
  rbac.userPermissions.groups ??= {}
  return rbac
}

const addUnique = <T>(list: T[], value: T) => {
  if (!list.includes(value)) list.push(value)
}

@Module('utils')
export default class ExampleModule extends BaseCommand {
  initialize() {
  }

  @Command('help', '查看指令帮助')
  @Usage('.help <module|command>')
  @Example('.help utils')
  @Example('.help ping')
  async handleHelp(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const commandManager = CommandManager.getInstance()
    if (!commandManager) {
      await message.reply([
        Structs.text('命令管理器未就绪')
      ])
      return
    }

    const prefix = configManager.config.command?.globalPrefix || '.'
    const normalizePrefix = (value: string) => {
      if (value.startsWith(prefix)) return value
      if (value.startsWith('.')) return `${prefix}${value.slice(1)}`
      return `${prefix}${value}`
    }
    const target = (args[0] ?? '').trim()

    if (!target) {
      const modules = commandManager.getModules().sort()
      const data: HelpData = {
        title: '指令帮助',
        scope: 'modules',
        modules,
        footer: `用法: ${prefix}help <module|command>`,
      }
      await message.reply([
        Structs.image(await renderTemplate(Help(data), {
          width: 420,
          height: 'auto',
          minHeight: 160,
        }))
      ])
      return
    }

    const moduleCommands = commandManager.getCommandsByModule(target)
    if (moduleCommands.length > 0) {
      const commands = moduleCommands
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((command) => ({
          name: command.name,
          description: command.description || '无描述',
          usage: command.usage ? normalizePrefix(command.usage) : '未提供',
          examples: command.examples && command.examples.length > 0
            ? command.examples.map((example) => normalizePrefix(example))
            : ['未提供'],
        }))
      const data: HelpData = {
        title: '指令帮助',
        scope: 'module',
        moduleName: target,
        commands,
      }
      await message.reply([
        Structs.image(await renderTemplate(Help(data), {
          width: 420,
          height: 'auto',
          minHeight: 200,
        }))
      ])
      return
    }

    const command = commandManager.getCommandByName(target)
    if (command) {
      const data: HelpData = {
        title: '指令帮助',
        scope: 'command',
        moduleName: command.moduleName,
        commandName: command.name,
        description: command.description || '无描述',
        usage: command.usage ? normalizePrefix(command.usage) : '未提供',
        examples: command.examples && command.examples.length > 0
          ? command.examples.map((example) => normalizePrefix(example))
          : ['未提供'],
      }
      await message.reply([
        Structs.image(await renderTemplate(Help(data), {
          width: 420,
          height: 'auto',
          minHeight: 180,
        }))
      ])
      return
    }

    await message.reply([
      Structs.text('未找到对应模块或指令')
    ])
  }

  @Command('ping', '测试机器人是否在线')
  @Usage('.ping')
  @Permission('utils.ping')
  async handlePing(
    @Message() message: EnhancedMessage,
  ) {
    await utilRecordRepository.save({
      userId: message.sender.user_id,
      groupId: message.sub_type == 'group' ? message.real_id : undefined,
      commandName: 'ping',
      usedAt: new Date()
    })

    await message.reply([
      Structs.text('pong!')
    ])
  }

  @Command('last-ping', '查看最近一次 ping 的时间')
  @Usage('.last-ping')
  @Permission('utils.last-ping')
  async handleLastPing(
    @Message() message: EnhancedMessage,
  ) {
    const lastPing = await utilRecordRepository.findOne({
      where: {
        commandName: 'ping'
      },
      order: {
        usedAt: 'DESC'
      }
    })

    await message.reply([
      Structs.text(lastPing ? `最后一次 ping 在 ${dayjs(lastPing.usedAt).format('YYYY-MM-DD HH:mm:ss')}` : '还没有 ping 过')
    ])
  }

  @Command('whoami', '查看当前用户信息')
  @Usage('.whoami')
  @Permission('utils.whoami')
  async handleWhoami(
    @Message() message: EnhancedMessage,
  ) {
    const roles = permissionManager.getRoles(message)
    const primaryRole = roles.includes(Role.Owner)
      ? Role.Owner
      : roles.includes(Role.BotAdmin)
        ? Role.BotAdmin
        : roles.includes(Role.GroupAdmin)
          ? Role.GroupAdmin
          : undefined
    const roleTagMap: Record<Exclude<Role, Role.Member>, { label: string, color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' }> = {
      [Role.Owner]: { label: 'OWNER', color: 'danger' },
      [Role.BotAdmin]: { label: 'BOT_ADMIN', color: 'primary' },
      [Role.GroupAdmin]: { label: 'GROUP_ADMIN', color: 'warning' },
    }
    const roleTag = primaryRole ? roleTagMap[primaryRole] : undefined

    await message.reply([
      Structs.image(await renderTemplate(UserProfile({
        qq: message.sender.user_id,
        nickname: message.sender.nickname,
        permissionTag: roleTag?.label,
        permissionTagColor: roleTag?.color,
      }), {
        width: 250,
        height: 100
      }))
    ])
  }

  @Command('perm-grant-user', '给指定用户赋予权限')
  @Usage('.perm-grant-user <userId> <perm1,perm2> [groupId|global]')
  @Example('.perm-grant-user 123456 utils.ping')
  @Example('.perm-grant-user 123456 utils.ping,utils.whoami 987654')
  @Permission(MANAGE_PERMISSION)
  async handleGrantUserPermission(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const userId = parseNumber(args[0])
    const permissions = parsePermissions(args[1])
    if (!userId || permissions.length === 0) {
      await message.reply([
        Structs.text('用法: .perm-grant-user <userId> <perm1,perm2> [groupId|global]')
      ])
      return
    }

    const scope = resolveScope(message, args[2])
    const configData = configManager.readConfigRaw()
    const rbac = ensureRbacConfig(configData)

    if (scope.type === 'global') {
      const target = (rbac.userPermissions.global[String(userId)] ??= [])
      for (const permission of permissions) addUnique(target, permission)
    } else {
      const groupKey = String(scope.groupId)
      rbac.userPermissions.groups[groupKey] ??= {}
      const groupUsers = rbac.userPermissions.groups[groupKey]
      const target = (groupUsers[String(userId)] ??= [])
      for (const permission of permissions) addUnique(target, permission)
    }

    configManager.saveConfigRaw(configData)
    configManager.reload()

    await message.reply([
      Structs.text('权限已更新')
    ])
  }

  @Command('perm-grant-role', '给指定角色赋予权限')
  @Usage('.perm-grant-role <role> <perm1,perm2>')
  @Example('.perm-grant-role botAdmin utils.ping,utils.whoami')
  @Permission(MANAGE_PERMISSION)
  async handleGrantRolePermission(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const role = (args[0] ?? '').trim()
    const permissions = parsePermissions(args[1])
    if (!role || permissions.length === 0) {
      await message.reply([
        Structs.text('用法: .perm-grant-role <role> <perm1,perm2>')
      ])
      return
    }

    const configData = configManager.readConfigRaw()
    const rbac = ensureRbacConfig(configData)
    const target = (rbac.rolePermissions[role] ??= [])
    for (const permission of permissions) addUnique(target, permission)

    configManager.saveConfigRaw(configData)
    configManager.reload()

    await message.reply([
      Structs.text('角色权限已更新')
    ])
  }

  @Command('role-create', '创建自定义角色')
  @Usage('.role-create <role> [perm1,perm2]')
  @Example('.role-create moderator utils.ping')
  @Permission(MANAGE_PERMISSION)
  async handleCreateRole(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const role = (args[0] ?? '').trim()
    const permissions = parsePermissions(args[1])
    if (!role) {
      await message.reply([
        Structs.text('用法: .role-create <role> [perm1,perm2]')
      ])
      return
    }

    const configData = configManager.readConfigRaw()
    const rbac = ensureRbacConfig(configData)
    rbac.rolePermissions[role] ??= []
    for (const permission of permissions) addUnique(rbac.rolePermissions[role], permission)

    configManager.saveConfigRaw(configData)
    configManager.reload()

    await message.reply([
      Structs.text('角色已创建')
    ])
  }

  @Command('role-add', '将用户加入角色')
  @Usage('.role-add <role> <userId> [groupId|global]')
  @Example('.role-add moderator 123456')
  @Example('.role-add moderator 123456 987654')
  @Permission(MANAGE_PERMISSION)
  async handleAddRoleMember(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
  ) {
    const role = (args[0] ?? '').trim()
    const userId = parseNumber(args[1])
    if (!role || !userId) {
      await message.reply([
        Structs.text('用法: .role-add <role> <userId> [groupId|global]')
      ])
      return
    }

    const scope = resolveScope(message, args[2])
    const configData = configManager.readConfigRaw()
    const rbac = ensureRbacConfig(configData)
    rbac.rolePermissions[role] ??= []

    if (scope.type === 'global') {
      const target = (rbac.roleMembers.global[role] ??= [])
      addUnique(target, userId)
    } else {
      const groupKey = String(scope.groupId)
      rbac.roleMembers.groups[groupKey] ??= {}
      const groupRoles = rbac.roleMembers.groups[groupKey]
      const target = (groupRoles[role] ??= [])
      addUnique(target, userId)
    }

    configManager.saveConfigRaw(configData)
    configManager.reload()

    await message.reply([
      Structs.text('角色成员已更新')
    ])
  }
} 