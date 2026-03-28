import { BaseCommand, Bot, GroupOnly, Message, Permission, Usage, Args, Module, NoPrefixCommand, RegexCommand, At, ModuleDescription, ModuleVersion } from "../../core/decorators.js"
import { NCWebsocket, Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { VaultService } from "../../modules/vault/service.js"
import { resolveScope, getQQAvatarUrl } from "../../utils/index.js"
import { renderTemplate } from "../../core/playwright.js"
import { standTexts, standRankMeta, StandRankType } from "./content.js"
import { standConfig } from "./schema.js"
import { StandService } from "./service.js"
import { StandResult } from "./templates/StandResult.js"
import { StandInfo } from "./templates/StandInfo.js"
import { StandRank } from "./templates/StandRank.js"
import { StandShop } from "./templates/StandShop.js"
import { StandBag } from "./templates/StandBag.js"
import { randomUUID } from "crypto"
import dayjs from "dayjs"
import { sumBy, clamp } from "lodash-es"
import { getDataSource } from "../../core/database.js"
import StandRecord from "./entities/StandRecord.js"
import StandMerchantOrder from "./entities/StandMerchantOrder.js"
import { BaseScope, BaseScopeType } from "../../typings/Command.js"
import { join } from "path"
import { externalModulesPath } from "../../utils/path.js"
import { StandLogic } from "./templates/StandLogic.js"
import { createExternalModuleLogger } from "../../logger.js"
import { configManager } from "../../config.js"
import { readFile } from "fs/promises"
import { rollEvents, type RollEventResult, type EventEffect, defaultEffect } from "./events.js"
import { allItems, allBundles, getBundleItems, getBundleTotalPrice, bundleNameMap, getItemByName, getItemById, parseItemsFromText, type StandItem, type ItemCategory } from "./items.js"
import { getNext4AM, getLast4AM } from "./plans.js"

const randomRange = (min: number, max: number) => {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min)) + min
}

const randomArrayElem = <T,>(list: readonly T[]) => {
  return list[Math.floor(Math.random() * list.length)]
}

const formatTs = (date: Date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const getDayStart = (date: Date) => {
  return dayjs(date).startOf('day').toDate()
}

const pickWeightedUnique = (items: number[], weights: number[], count: number) => {
  const picked: number[] = []
  const pool = items.map((value, index) => ({ value, weight: Math.max(weights[index] ?? 0, 0) }))
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const total = sumBy(pool, (item) => item.weight)
    if (total <= 0) break
    let roll = Math.random() * total
    let selectedIndex = 0
    for (let j = 0; j < pool.length; j += 1) {
      roll -= pool[j].weight
      if (roll <= 0) {
        selectedIndex = j
        break
      }
    }
    const [selected] = pool.splice(selectedIndex, 1)
    picked.push(selected.value)
  }
  return picked
}

type StandMode = 'random' | 'call'
type StandFriend = { qq: number, score: number }
type StandOutcome = {
  intoDetail: {
    ts: number
    score: number
    friends: StandFriend[]
    others: { count: number, score: number }
  }
  outList: Array<{ targetUserId: number, score: number }>
  boomerangReflect?: { targetId: number, amount: number }
  guaranteedVisitorIds?: number[]
}

@Module('stand-on-the-street')
@ModuleDescription('站街')
@ModuleVersion('2.0.0')
export default class StandOnTheStreetModule extends BaseCommand {
  private vaultService = VaultService.getInstance()
  private standService = StandService.getInstance()
  private logger = createExternalModuleLogger(this.moduleName)
  private logicContent = ''

  initialize() {
    const logicFilePath = join(externalModulesPath, this.moduleName, 'docs', 'LOGIC_.md')
    readFile(logicFilePath, 'utf-8').then(content => {
      this.logicContent = content
      this.logger.debug(`逻辑内容初始化完成`)
    }).catch(error => {
      this.logger.error('读取逻辑文件失败: ' + error)
    })
  }

  @RegexCommand(/^站街/, '进行随机站街')
  @Usage('站街 [道具...]')
  @Permission('stand-on-the-street.work')
  @GroupOnly('该命令仅限群聊使用')
  async handleStand(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    const rawText = message.message.filter(s => s.type === 'text').map(s => s.data.text).join('').trim()
    const itemText = rawText.replace(/^站街\s*/, '')
    const parsed = parseItemsFromText(itemText)
    this.logger.debug(`用户${message.sender.user_id} 请求站街, 道具: ${parsed.items.map(i => i.name).join(',')}`)
    await this.executeStand(message, bot, 'random', false, [], parsed.items)
  }

  @RegexCommand(/^(加钱站街|强制站街)/, '付费站街')
  @Usage('加钱站街 [道具...]')
  @Permission('stand-on-the-street.work')
  @GroupOnly('该命令仅限群聊使用')
  async handlePaidStand(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    if (message.message_type !== 'group') return
    const userId = message.sender.user_id
    const groupId = message.group_id
    const scope = resolveScope(message)

    const record = await this.standService.getOrCreateRecord(userId, groupId)
    this.ensureDailyResets(record)

    if (record.paidStandCount >= 1) {
      await message.reply([Structs.text('今天的付费站街次数已用完（每天 1 次）')])
      return
    }

    const PAID_STAND_COST = 1000
    const balance = await this.vaultService.getTotalBalance(userId)
    if (balance < PAID_STAND_COST) {
      await message.reply([Structs.text(`余额不足，需要 ${PAID_STAND_COST}，当前 ${balance}`)])
      return
    }

    await this.vaultService.applyBill({
      userId,
      change: -PAID_STAND_COST,
      type: 'expense',
      source: 'stand-on-the-street',
      description: '加钱站街',
      scope,
    })

    record.paidStandCount += 1
    await this.standService.getRecordRepository().save(record)

    const rawText = message.message.filter(s => s.type === 'text').map(s => s.data.text).join('').trim()
    const itemText = rawText.replace(/^(加钱站街|强制站街)\s*/, '')
    const parsed = parseItemsFromText(itemText)
    this.logger.debug(`用户${userId} 加钱站街, 道具: ${parsed.items.map(i => i.name).join(',')}`)
    await this.executeStand(message, bot, 'random', false, [], parsed.items, { paidStandCost: PAID_STAND_COST, paidStandCount: record.paidStandCount })
  }

  @RegexCommand(/^(炒|超|操)(\s+|$)/, '进行点名站街')
  @Usage('操 @对方 [道具]')
  @Permission('stand-on-the-street.call')
  @GroupOnly('该命令仅限群聊使用')
  async handleCall(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
    @At() atList: number[],
  ) {
    const rawText = message.message.filter(s => s.type === 'text').map(s => s.data.text).join('').trim()
    const itemText = rawText.replace(/^(炒|超|操)\s*/, '')
    const parsed = parseItemsFromText(itemText)
    this.logger.debug(`用户${message.sender.user_id} 请求点名, atList: ${JSON.stringify(atList)}, 道具: ${parsed.items.map(i => i.name).join(',')}`)
    await this.executeStand(message, bot, 'call', false, atList, parsed.items)
  }

  @NoPrefixCommand('咖啡', '使用咖啡减少CD')
  @Usage('咖啡')
  @Permission('stand-on-the-street.shop')
  @GroupOnly('该命令仅限群聊使用')
  async handleCoffee(
    @Message() message: EnhancedMessage,
  ) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    if (message.message_type !== 'group') return
    const userId = message.sender.user_id
    const groupId = message.group_id
    const scope = resolveScope(message)
    const COFFEE_UNIT_PRICE = 400
    const COFFEE_REDUCE_MS = 2 * 3600000

    const record = await this.standService.getOrCreateRecord(userId, groupId)
    this.ensureDailyResets(record)

    if ((record.dailyPurchases?.['coffee'] ?? 0) >= 1) {
      await message.reply([Structs.text('今天已经喝过咖啡了（每天 1 次）')])
      return
    }
    if (!record.nextTime || record.nextTime.getTime() <= Date.now()) {
      await message.reply([Structs.text('你当前没有 CD，不需要咖啡')])
      return
    }

    const remainingMs = record.nextTime.getTime() - Date.now()
    const dosesNeeded = Math.ceil(remainingMs / COFFEE_REDUCE_MS)
    const balance = await this.vaultService.getTotalBalance(userId)
    const maxAffordable = Math.floor(balance / COFFEE_UNIT_PRICE)

    if (maxAffordable <= 0) {
      await message.reply([Structs.text(`余额不足，至少需要 ${COFFEE_UNIT_PRICE}，当前 ${balance}`)])
      return
    }

    const dosesUsed = Math.min(dosesNeeded, maxAffordable)
    const totalCost = dosesUsed * COFFEE_UNIT_PRICE
    const reducedMs = dosesUsed * COFFEE_REDUCE_MS
    const cdCleared = dosesUsed >= dosesNeeded

    await this.vaultService.applyBill({
      userId,
      change: -totalCost,
      type: 'expense',
      source: 'stand-on-the-street',
      description: `咖啡 x${dosesUsed}`,
      scope,
    })

    if (cdCleared) {
      record.nextTime = null
    } else {
      record.nextTime = new Date(record.nextTime.getTime() - reducedMs)
    }
    record.coffeeDebuff = (record.coffeeDebuff ?? 0) + dosesUsed
    record.coffeeDebuffExpiry = Date.now() + 2 * 24 * 3600000
    record.dailyPurchases = { ...(record.dailyPurchases ?? {}), coffee: 1 }
    await this.standService.getRecordRepository().save(record)

    const newBalance = await this.vaultService.getTotalBalance(userId)
    const debuffLevel = record.coffeeDebuff
    const cdStatus = cdCleared
      ? 'CD 已清除，可以站街了'
      : `CD 减少 ${dosesUsed * 2}h，下次站街: ${formatTs(record.nextTime!)}`
    await message.reply([Structs.text(`☕ 咖啡 x${dosesUsed}！${cdStatus}\n花费 ${totalCost}，余额 ${newBalance}\n咖啡副作用 Lv.${debuffLevel}（负面事件 +${Math.round(debuffLevel * 15)}%）`)])
    this.logger.debug(`用户${userId} 使用咖啡 x${dosesUsed}, cost=${totalCost}, cleared=${cdCleared}, debuff=${debuffLevel}`)
  }

  @NoPrefixCommand('站街数据', '查询站街数据')
  @Usage('站街数据')
  @Permission('stand-on-the-street.info')
  @GroupOnly('该命令仅限群聊使用')
  async handleInfo(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    this.logger.debug(`用户${message.sender.user_id} 查询站街数据`)
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      this.logger.warn(`查询站街数据: 站街模块未开启`)
      return
    }
    if (message.message_type !== 'group') return
    const groupId = message.group_id
    const userId = message.sender.user_id
    const record = await this.standService.getRecord(userId, groupId)
    if (!record || (record.into ?? []).length === 0) {
      await message.reply([Structs.text('您还没有站过街')])
      this.logger.debug(`查询站街数据: 用户${userId} 没有站过街`)
      return
    }

    const totalCount = record.countFriends + record.countOthers
    const per = totalCount > 0 ? Math.ceil(Number(record.statsInto) / totalCount) : 0
    const account = await this.vaultService.getOrCreateAccount(userId, resolveScope(message))
    const globalBalance = await this.vaultService.getTotalBalance(userId)
    const globalRecords = await this.standService.getRecordsByScope(userId, { type: BaseScopeType.GLOBAL })
    const globalFriendsCount = globalRecords.reduce((acc, item) => acc + Number(item.countFriends), 0)
    const globalTotalCount = globalRecords.reduce((acc, item) => acc + Number(item.countFriends) + Number(item.countOthers), 0)
    const globalStatsInto = globalRecords.reduce((acc, item) => acc + Number(item.statsInto), 0)
    const globalPer = globalTotalCount > 0 ? Math.ceil(globalStatsInto / globalTotalCount) : 0
    let groupName = String(groupId)
    try {
      const groupInfo = await bot.get_group_info({ group_id: groupId })
      groupName = groupInfo.group_name
    } catch (error) {
      this.logger.warn(`查询站街数据获取群名失败: ${error}`)
    }

    const avatarUrl = getQQAvatarUrl(userId, 100)
    const nickname = message.sender.card || message.sender.nickname || String(userId)
    const info = StandInfo({
      avatarUrl,
      nickname,
      groupInfo: {
        name: groupName,
        id: groupId,
      },
      group: {
        per,
        balance: Number(account.balance),
        totalCount,
        friendsCount: record.countFriends,
      },
      global: {
        per: globalPer,
        balance: Number(globalBalance),
        totalCount: globalTotalCount,
        friendsCount: globalFriendsCount,
      }
    })
    this.logger.debug(`用户${userId} 站街分组数据`)
    if (!info) return

    const image = await renderTemplate(
      info,
      { width: 400, height: 'auto', minHeight: 220 }
    )
    await message.reply([Structs.image(image)])
    this.logger.debug(`用户${userId} 站街数据图片已生成并发送`)
  }

  @RegexCommand(/^(站街人气榜|站街赚钱榜|站街赔钱榜|站街贞洁榜|站街常客榜)$/, '查询站街排行榜')
  @Usage(['站街人气榜', '站街赔钱榜', '站街贞洁榜', '站街常客榜', '站街赚钱榜'])
  @Permission('stand-on-the-street.rank')
  @GroupOnly('该命令仅限群聊使用')
  async handleRank(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    this.logger.debug(`用户${message.sender.user_id} 请求排行榜`)
    const content = message.message
      .filter(segment => segment.type === 'text')
      .map(segment => segment.data.text)
      .join('')
      .trim()
    const map: Record<string, StandRankType> = {
      '站街人气榜': 'count',
      '站街赚钱榜': 'make_score',
      '站街赔钱榜': 'lose_score',
      '站街贞洁榜': 'good_boi',
      '站街常客榜': 'bad_boi',
    }
    const type = map[content]
    if (!type) {
      this.logger.warn(`排行榜请求类型未识别: [${content}]`)
      return
    }
    this.logger.debug(`排行榜类型: ${type}`)
    await this.sendRank(message, bot, type)
  }

  @NoPrefixCommand('站街逻辑', '查看站街逻辑')
  @Usage('站街逻辑')
  @Permission('stand-on-the-street.logic')
  @GroupOnly('该命令仅限群聊使用')
  async handleLogic(
    @Message() message: EnhancedMessage,
  ) {
    this.logger.debug(`用户${message.sender.user_id} 请求查看站街逻辑`)
    if (!this.logicContent) {
      await message.reply([Structs.text('内部错误，请联系管理员')])
      this.logger.warn(`逻辑查看失败，内容未加载`)
      return
    }
    const logic = StandLogic({ content: this.logicContent })
    if (!logic) return
    const image = await renderTemplate(logic, { width: 400, height: 'auto' })
    await message.reply([Structs.image(image)])
    this.logger.debug(`逻辑图片已生成并发送`)
  }

  @NoPrefixCommand('站街商店', '查看站街道具商店')
  @Usage('站街商店')
  @Permission('stand-on-the-street.shop')
  @GroupOnly('该命令仅限群聊使用')
  async handleShop(
    @Message() message: EnhancedMessage,
  ) {
    this.logger.debug(`用户${message.sender.user_id} 查看商店`)
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    const bundleInfos = allBundles.map(b => ({
      name: b.name,
      itemNames: getBundleItems(b).map(i => i.name),
      totalPrice: getBundleTotalPrice(b),
      serviceFee: b.serviceFee,
    }))
    const shopEl = StandShop({ items: allItems, bundles: bundleInfos })
    if (!shopEl) return
    const image = await renderTemplate(shopEl, { width: 400, height: 'auto' })
    await message.reply([Structs.image(image)])
  }

  @NoPrefixCommand('背包', '查看站街状态')
  @Usage('背包')
  @Permission('stand-on-the-street.shop')
  @GroupOnly('该命令仅限群聊使用')
  async handleBag(
    @Message() message: EnhancedMessage,
  ) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    if (message.message_type !== 'group') return
    const userId = message.sender.user_id
    const groupId = message.group_id
    const record = await this.standService.getOrCreateRecord(userId, groupId)
    this.ensureDailyResets(record)

    const equipped = (record.equippedItems ?? [])
      .map(id => getItemById(id))
      .filter(Boolean) as StandItem[]
    const nickname = message.sender.card || message.sender.nickname || String(userId)
    const bagEl = StandBag({
      nickname,
      avatarUrl: getQQAvatarUrl(userId, 100),
      items: [],
      equippedItems: equipped.map(i => ({ name: i.name, description: i.description })),
      coffeeDebuff: (record.coffeeDebuff ?? 0) > 0 && Date.now() < (record.coffeeDebuffExpiry ?? 0) ? record.coffeeDebuff : 0,
      paidStandUsed: record.paidStandCount >= 1,
      coffeeUsed: (record.dailyPurchases?.['coffee'] ?? 0) >= 1,
    })
    if (!bagEl) return
    const image = await renderTemplate(bagEl, { width: 400, height: 'auto', minHeight: 200 })
    await message.reply([Structs.image(image)])
  }

  private getRecentAvg(record: StandRecord) {
    const recentScores = (record.into ?? []).slice(-5).map(item => Number(item.score) || 0).filter(Boolean)
    if (recentScores.length === 0) return 0
    return recentScores.reduce((acc, curr) => acc + curr, 0) / recentScores.length
  }

  private ensureDailyResets(record: StandRecord) {
    const last4AM = getLast4AM()
    if ((record.lastPaidReset ?? 0) < last4AM) {
      record.paidStandCount = 0
      record.lastPaidReset = last4AM
    }
    if ((record.lastPurchaseReset ?? 0) < last4AM) {
      record.dailyPurchases = {}
      record.lastPurchaseReset = last4AM
    }
  }

  private getRecentPerCapitaAvg(record: StandRecord) {
    const recentList = (record.into ?? []).slice(-5)
    const perCapita = recentList.map(item => {
      const friendsCount = Array.isArray(item?.friends) ? item.friends.length : 0
      const othersCount = Number(item?.others?.count) || 0
      const total = friendsCount + othersCount
      if (total <= 0) return 0
      return Number(item.score) / total
    }).filter(value => value > 0)
    if (perCapita.length === 0) return 0
    return perCapita.reduce((acc, curr) => acc + curr, 0) / perCapita.length
  }

  private rollWeightedStep(stepCount: number, baseWeight: number, highWeightBoost: number) {
    const weights = Array.from({ length: stepCount }, (_, index) => {
      let weight = 1
      if (index > 0) weight += baseWeight
      if (index === stepCount - 1) weight += highWeightBoost
      return weight
    })
    const total = sumBy(weights, weight => weight)
    let roll = Math.random() * total
    this.logger.debug(`rollWeightedStep: stepCount=${stepCount}, weights=${JSON.stringify(weights)}, total=${total}, roll初始=${roll}`)
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i]
      if (roll <= 0) {
        this.logger.debug(`rollWeightedStep 命中 index=${i}`)
        return i
      }
    }
    this.logger.debug(`rollWeightedStep 命中末尾 index=${stepCount - 1}`)
    return stepCount - 1
  }

  private async resolveCooldown(
    message: EnhancedMessage,
    record: StandRecord,
    ts: number,
    force: boolean,
  ) {
    if (record.nextTime && record.nextTime.getTime() > ts) {
      this.logger.debug(`CD中 nextTime=${formatTs(record.nextTime)} ts=${ts} force=${force}`)
      if (!force) {
        return { canProceed: false, force }
      }
      if (record.force) {
        const nextTime = formatTs(record.nextTime)
        await message.reply([Structs.text(`${randomArrayElem(standTexts.tooMany)}\n请在下次时间到达后使用普通站街\n下次时间为：${nextTime}`)])
        return { canProceed: false, force }
      }
    }

    if (record.nextTime && record.nextTime.getTime() <= ts) {
      this.logger.debug(`CD已到 nextTime=${formatTs(record.nextTime)} ts=${ts}，force复位`)
      return { canProceed: true, force: false }
    }
    this.logger.debug(`CD通过，可站街 force=${force}`)
    return { canProceed: true, force }
  }

  private async buildRandomOutcome(
    bot: NCWebsocket,
    groupId: number,
    userId: number,
    ts: number,
    dayTs: number,
    scope: BaseScope,
    basePayWeight: number,
    highPayBaseWeight: number,
    allowEmpty: boolean,
    eventEffect: EventEffect,
    minTotalCount: number = 0,
    itemOthersMultiplier: number = 1,
  ): Promise<StandOutcome> {
    this.logger.debug(`生成随机站街收益 groupId=${groupId} userId=${userId}`)
    const members = await bot.get_group_member_list({ group_id: groupId })
    this.logger.debug(`群成员 userIds: ${JSON.stringify(members.map(m => m.user_id))}`)
    const memberIds = members.map(m => m.user_id)

    if (eventEffect.fixedTotalCount !== undefined) {
      const score = this.rollWeightedStep(21, basePayWeight, highPayBaseWeight) * 50
      this.logger.debug(`神秘客人模式 score=${score}`)
      return {
        intoDetail: {
          ts,
          score,
          friends: [],
          others: { count: 1, score },
        },
        outList: [],
      }
    }

    const totalCountMax = randomRange(0, 30)
    const friendsCountMax = memberIds.length >= 20 ? 19 : Math.max(memberIds.length - 1, 0)
    let friendsCount = friendsCountMax > 0 ? randomRange(0, friendsCountMax) : 0
    friendsCount = Math.max(0, Math.round(friendsCount * eventEffect.friendsCountMultiplier))
    const othersCountMax = friendsCount > totalCountMax ? 0 : totalCountMax - friendsCount
    let othersCount = othersCountMax > 0 ? randomRange(0, othersCountMax) : 0
    othersCount = Math.min(50, Math.max(0, Math.round(othersCount * eventEffect.othersCountMultiplier * itemOthersMultiplier)))

    const candidateIds = memberIds.filter(id => id !== userId)
    const records = await this.standService.getRecordsByUserIds(candidateIds, groupId)
    const balances = await this.vaultService.getBalancesByUserIds(candidateIds, scope)

    const fiveHoursAgo = ts - 5 * 3600000
    const candidates = records.filter(recordItem => {
      const balance = balances.get(Number(recordItem.userId)) ?? 0
      if (balance <= 0) return false
      const recentOut = (recordItem.out ?? []).filter((item: any) => item.ts && item.ts >= fiveHoursAgo).length
      return recentOut < 2
    }).map(item => Number(item.userId))

    friendsCount = Math.min(friendsCount, candidates.length)
    if (!allowEmpty && friendsCount + othersCount === 0) {
      othersCount = 1
      this.logger.debug(`最近 3 次已出现无人光顾，本次强制至少 1 人次`)
    }
    if (minTotalCount > 0 && friendsCount + othersCount < minTotalCount) {
      const deficit = minTotalCount - friendsCount - othersCount
      othersCount += deficit
      this.logger.debug(`广告牌保底人数生效，补充路人 ${deficit} 人，总计 ${friendsCount + othersCount} 人`)
    }
    const candidateBalances = candidates.map(id => balances.get(id) ?? 0)
    const maxBalance = Math.max(...candidateBalances, 1)
    const weights = candidateBalances.map(balance => {
      const normalized = clamp(balance / maxBalance, 0, 1)
      return 1 + normalized * 4
    })
    const userRecord = await this.standService.getRecord(userId, groupId)
    const lastInto = (userRecord?.into ?? []).slice(-1)[0] as any
    const guaranteedVisitors: number[] = (lastInto?.guaranteedVisitors ?? []).filter(
      (id: number) => candidateIds.includes(id) && id !== userId
    )
    if (guaranteedVisitors.length > 0) {
      friendsCount = Math.max(friendsCount, guaranteedVisitors.length)
      this.logger.debug(`红包保底群友: ${JSON.stringify(guaranteedVisitors)}`)
    }

    const remainingSlots = Math.max(0, friendsCount - guaranteedVisitors.length)
    const remainingCandidates = candidates.filter(id => !guaranteedVisitors.includes(id))
    const remainingBalances = remainingCandidates.map(id => balances.get(id) ?? 0)
    const remainingMaxBalance = Math.max(...remainingBalances, 1)
    const remainingWeights = remainingBalances.map(balance => {
      const normalized = clamp(balance / remainingMaxBalance, 0, 1)
      return 1 + normalized * 4
    })

    this.logger.debug(`参与候选人: ${JSON.stringify(candidates)} 权重: ${JSON.stringify(weights)} 拟抽取${friendsCount}人 (保底${guaranteedVisitors.length})`)
    const randomPicked = pickWeightedUnique(remainingCandidates, remainingWeights, remainingSlots)
    const picked = [...guaranteedVisitors, ...randomPicked]
    this.logger.debug(`被抽中好友: ${JSON.stringify(picked)}`)
    const friends: StandFriend[] = []
    let friendsScore = 0
    const outList: Array<{ targetUserId: number, score: number }> = []
    let whiteCount = 0

    const rollScore = (stepCount: number) => {
      if (eventEffect.fixedPersonScore !== undefined) return eventEffect.fixedPersonScore
      const step = this.rollWeightedStep(stepCount, basePayWeight, highPayBaseWeight + whiteCount)
      if (step === 0) whiteCount += 1
      return step * 50
    }

    picked.forEach(friendId => {
      const isGuaranteed = guaranteedVisitors.includes(friendId)
      const score = isGuaranteed ? 0 : rollScore(6)
      this.logger.debug(`好友${friendId} 收益: ${score}${isGuaranteed ? ' (红包白嫖)' : ''}`)
      friendsScore += score
      friends.push({ qq: friendId, score })
      if (score > 0) outList.push({ targetUserId: friendId, score })
    })

    let othersScore = 0
    for (let i = 0; i < othersCount; i += 1) {
      const s = rollScore(5)
      this.logger.debug(`路人第${i}次 收益: ${s}`)
      othersScore += s
    }

    this.logger.debug(`随机站街结果: friendsScore=${friendsScore} othersScore=${othersScore} friends=${JSON.stringify(friends)} othersCount=${othersCount}`)
    return {
      intoDetail: {
        ts,
        score: friendsScore + othersScore,
        others: {
          count: othersCount,
          score: othersScore,
        },
        friends,
      },
      outList,
      guaranteedVisitorIds: guaranteedVisitors.length > 0 ? guaranteedVisitors : undefined,
    }
  }

  private async buildCallOutcome(
    message: EnhancedMessage,
    atList: number[],
    groupId: number,
    userId: number,
    ts: number,
    dayTs: number,
    scope: BaseScope,
    basePayWeight: number,
    highPayBaseWeight: number,
  ): Promise<StandOutcome | null> {
    this.logger.debug(`点名站街 groupId=${groupId} atList=${JSON.stringify(atList)} userId=${userId}`)
    if (atList.length === 0) {
      await message.reply([Structs.text('您没有选择摇人对象。')])
      this.logger.warn(`点名失败: 未选择对象`)
      return null
    }
    if (atList.length > 1) {
      await message.reply([Structs.text('一次只能光临一人哦。')])
      this.logger.warn(`点名失败: 同时光临多人`)
      return null
    }
    const targetId = atList[0]

    const targetRecord_ = await this.standService.getRecord(targetId, groupId)
    const targetEquipped = targetRecord_?.equippedItems ?? []
    if (targetEquipped.includes('pepper_spray')) {
      const updatedEquipped = targetEquipped.filter((id: string) => id !== 'pepper_spray')
      if (targetRecord_) {
        targetRecord_.equippedItems = updatedEquipped
        await this.standService.getRecordRepository().save(targetRecord_)
      }
      await message.reply([Structs.text(`对方使用了「防狼喷雾」，你被喷了一脸！点名失败。`)])
      this.logger.debug(`点名被防狼喷雾挡住 targetId=${targetId}`)
      return null
    }

    const targetRecord = await this.standService.getRecord(targetId, groupId)
    if (!targetRecord) {
      await message.reply([Structs.text('他还没站过街。')])
      this.logger.warn(`点名失败: 目标用户${targetId}无记录`)
      return null
    }
    const targetBalanceMap = await this.vaultService.getBalancesByUserIds([targetId], scope)
    const targetBalance = targetBalanceMap.get(targetId) ?? 0
    if (targetBalance <= 0) {
      await message.reply([Structs.text('他已经没钱了。')])
      this.logger.warn(`点名失败: 目标用户${targetId}余额不足`)
      return null
    }
    const devMode = configManager.config.devMode === true
    const fiveHoursAgo = ts - 5 * 3600000
    const recentOut = (targetRecord.out ?? []).filter((item: any) => item.ts && item.ts >= fiveHoursAgo).length
    if (!devMode && recentOut >= 2) {
      await message.reply([Structs.text(`他最近已经被榨${recentOut}次了，牛牛已经累了`)])
      this.logger.warn(`点名失败: 目标用户${targetId} 近5h已被榨 ${recentOut}`)
      return null
    }

    const step = this.rollWeightedStep(12, basePayWeight, highPayBaseWeight)
    const score = step * 50
    this.logger.debug(`点名模式 targetId=${targetId} step=${step} score=${score}`)

    let boomerangReflect: StandOutcome['boomerangReflect'] = undefined
    if (targetEquipped.includes('boomerang')) {
      const updatedEquipped = (targetRecord_?.equippedItems ?? []).filter((id: string) => id !== 'boomerang')
      if (targetRecord_) {
        targetRecord_.equippedItems = updatedEquipped
        await this.standService.getRecordRepository().save(targetRecord_)
      }
      boomerangReflect = { targetId, amount: score }
      this.logger.debug(`回旋镖生效 targetId=${targetId} reflect=${score}`)
    }

    return {
      outList: [{ targetUserId: targetId, score }],
      intoDetail: {
        ts,
        score,
        friends: [{ qq: targetId, score }],
        others: { count: 0, score: 0 },
      },
      boomerangReflect,
    }
  }

  private async executeStand(
    message: EnhancedMessage,
    bot: NCWebsocket,
    type: StandMode,
    force: boolean,
    atList: number[] = [],
    inlineItems: StandItem[] = [],
    paidStandInfo?: { paidStandCost: number, paidStandCount: number },
  ) {
    const result = await this.executeStandOnce(message, bot, type, force, atList, inlineItems, paidStandInfo)
    if (!result) return
    const resultEl = StandResult(result.standResultData)
    if (!resultEl) {
      this.logger.warn(`StandResult 渲染失败, 渲染 data: ${JSON.stringify(result.standResultData)}`)
      return
    }
    const image = await renderTemplate(resultEl, { width: 400, height: 'auto', minHeight: 260 })
    await message.reply([Structs.image(image)])
    this.logger.debug(`站街结果已生成图片并发送 userId=${message.sender.user_id} totalScore=${result.standResultData.totalScore}`)
  }

  private async executeStandOnce(
    message: EnhancedMessage,
    bot: NCWebsocket,
    type: StandMode,
    force: boolean,
    atList: number[] = [],
    inlineItems: StandItem[] = [],
    paidStandInfo?: { paidStandCost: number, paidStandCount: number },
  ) {
    this.logger.debug(`执行站街 type=${type} userId=${message.sender.user_id} force=${force} items=${inlineItems.map(i => i.name).join(',')} atList=${JSON.stringify(atList)}`)
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      this.logger.warn(`执行站街: 站街模块未开启`)
      return
    }
    if (message.message_type !== 'group') return

    const userId = message.sender.user_id
    const groupId = message.group_id
    const scope = resolveScope(message)
    const now = new Date()
    const ts = now.getTime()
    const dayTs = getLast4AM(ts)

    const record = await this.standService.getOrCreateRecord(userId, groupId)
    this.ensureDailyResets(record)

    if (type === 'call') {
      const dailyCalls = record.dailyPurchases?.['_call_count'] ?? 0
      if (dailyCalls >= 2 && configManager.config.devMode !== true) {
        await message.reply([Structs.text('今天的点名次数已用完（每天 2 次）')])
        this.logger.debug(`点名中断: 今日已用 ${dailyCalls}/2`)
        return
      }
    }

    this.logger.debug(`当前用户历史状态: ${JSON.stringify({
      score: record.score,
      countFriends: record.countFriends,
      countOthers: record.countOthers,
      statsInto: record.statsInto,
      cd: record.nextTime ? formatTs(record.nextTime) : null,
      coffeeDebuff: record.coffeeDebuff ?? 0,
    })}`)

    const isPaidStand = !!paidStandInfo
    const cooldownResult = await this.resolveCooldown(message, record, ts, force)
    if (!cooldownResult.canProceed && !isPaidStand) {
      if (configManager.config.devMode === true) {
        this.logger.debug(`devMode 放行`)
      } else {
        const nextTime = record.nextTime ? formatTs(record.nextTime) : '未知'
        this.ensureDailyResets(record)
        const paidAvail = record.paidStandCount < 1
        const coffeeAvail = (record.dailyPurchases?.['coffee'] ?? 0) < 1
        const remainMs = record.nextTime ? record.nextTime.getTime() - Date.now() : 0
        const coffeeDoses = remainMs > 0 ? Math.ceil(remainMs / (2 * 3600000)) : 0
        const coffeeCost = coffeeDoses * 400
        const hints: string[] = []
        if (paidAvail) hints.push('「加钱站街」(1000)')
        if (coffeeAvail && coffeeDoses > 0) hints.push(`「咖啡」(${coffeeCost}, ${coffeeDoses}杯)`)
        const hintStr = hints.length > 0
          ? `\n可用: ${hints.join(' / ')}`
          : ''
        await message.reply([Structs.text(`${randomArrayElem(standTexts.many)}\n下次站街: ${nextTime}${hintStr}`)])
        this.logger.debug(`站街中断: CD未到`)
        return
      }
    }
    force = cooldownResult.force

    const validItems = inlineItems.filter(i => {
      if (i.category === 'instant') return false
      if (type === 'call' && i.category === 'active') return false
      if (type === 'random' && i.category === 'call') return false
      return true
    })

    let itemCost = 0
    const dailyLimitErrors: string[] = []
    for (const item of validItems) {
      const todayUsed = record.dailyPurchases?.[item.id] ?? 0
      if (todayUsed >= item.dailyBuyLimit) {
        dailyLimitErrors.push(`${item.name}（今日已用 ${todayUsed}/${item.dailyBuyLimit}）`)
        continue
      }
      itemCost += item.price
    }
    const usableItems = validItems.filter(i => {
      const todayUsed = record.dailyPurchases?.[i.id] ?? 0
      return todayUsed < i.dailyBuyLimit
    })

    if (dailyLimitErrors.length > 0) {
      this.logger.debug(`道具日限制: ${dailyLimitErrors.join(', ')}`)
    }

    if (itemCost > 0) {
      const balance = await this.vaultService.getTotalBalance(userId)
      if (balance < itemCost) {
        await message.reply([Structs.text(`道具费用不足，需要 ${itemCost}，当前 ${balance}`)])
        return
      }
      await this.vaultService.applyBill({
        userId,
        change: -itemCost,
        type: 'expense',
        source: 'stand-on-the-street',
        description: `站街道具 ${usableItems.map(i => i.name).join('+')}`,
        scope,
      })
      for (const item of usableItems) {
        record.dailyPurchases = {
          ...(record.dailyPurchases ?? {}),
          [item.id]: (record.dailyPurchases?.[item.id] ?? 0) + 1,
        }
      }
    }

    const passiveItems = usableItems.filter(i => i.category === 'passive')
    if (passiveItems.length > 0) {
      record.equippedItems = passiveItems.map(i => i.id)
      this.logger.debug(`装备被动道具: ${passiveItems.map(i => i.name).join(',')}`)
    }
    await this.standService.getRecordRepository().save(record)

    const cooldownHours = standConfig?.cooldownHours ?? 12
    const forceExtraHours = standConfig?.forceExtraHours ?? 18
    const richBalanceThreshold = standConfig?.richBalanceThreshold ?? 20000
    const eventChance = standConfig?.eventChance ?? 0.6
    const forceNegativeBoost = standConfig?.forceNegativeBoost ?? 0.75
    const richNegativeBoost = standConfig?.richNegativeBoost ?? 0.5

    const recentAvg = this.getRecentAvg(record)
    const recentInto = (record.into ?? []).slice(-3)
    const recentEmptyCount = recentInto.filter(item => {
      const friendsCount = Array.isArray(item?.friends) ? item.friends.length : 0
      const othersCount = Number(item?.others?.count) || 0
      return friendsCount + othersCount === 0
    }).length
    const allowEmpty = recentEmptyCount < 1
    const recentPerCapitaAvg = this.getRecentPerCapitaAvg(record)
    const lowAvgBoost = recentPerCapitaAvg < 100
      ? (100 - recentPerCapitaAvg) / 100 / 2
      : 0
    const basePayWeight = 1 + lowAvgBoost
    const highPayBaseWeight = 1

    const account = await this.vaultService.getOrCreateAccount(userId, scope)
    const originalBalance = Number(account.balance)
    let latestBalance = originalBalance

    const hasAmulet = usableItems.some(i => i.effect.amulet)
    const hasLuckyClover = usableItems.some(i => i.effect.luckyClover)
    const billboardItem = usableItems.find(i => i.id === 'billboard')
    const hasBillboard = !!billboardItem
    const hasInsurance = usableItems.some(i => i.effect.insurance)
    const hasVipCard = usableItems.some(i => i.effect.cdMultiplier && i.effect.cdMultiplier < 1)
    const itemEffectDetails: Array<{ itemName: string, description: string }> = []

    if (usableItems.length > 0) {
      itemEffectDetails.push({ itemName: '道具', description: `${usableItems.map(i => i.name).join(' + ')}（-${itemCost}）` })
    }

    const eventsResult = type === 'random'
      ? rollEvents({
          balance: latestBalance,
          recentAvg,
          richBalanceThreshold,
          force,
          eventChance,
          forceNegativeBoost,
          richNegativeBoost,
          hasLuckyClover,
          hasAmulet,
          coffeeDebuff: (record.coffeeDebuff ?? 0) > 0 && Date.now() < (record.coffeeDebuffExpiry ?? 0) ? record.coffeeDebuff : 0,
        })
      : { results: [], mergedEffect: { ...defaultEffect } }

    const eventEffect: EventEffect = eventsResult.mergedEffect
    const eventResults = eventsResult.results
    const eventNames = eventResults.map(r => r.event.name)

    this.logger.debug(`事件结果: ${eventNames.length > 0 ? eventNames.join(' + ') : '无事件'}, effect=${JSON.stringify(eventEffect)}`)
    this.logger.debug(`权重计算: recentAvg=${recentAvg}, recentPerCapitaAvg=${recentPerCapitaAvg}, lowAvgBoost=${lowAvgBoost}, basePayWeight=${basePayWeight}, highPayBaseWeight=${highPayBaseWeight}`)

    let outcome: StandOutcome | null = null

    const minTotalCount = hasBillboard ? (billboardItem!.effect.minTotalCount ?? 0) : 0
    const megaphoneItem = usableItems.find(i => i.effect.othersCountMultiplier)
    const itemOthersMultiplier = megaphoneItem?.effect.othersCountMultiplier ?? 1
    const redEnvelopeItem = usableItems.find(i => i.effect.redEnvelope)

    if (type === 'random') {
      outcome = await this.buildRandomOutcome(
        bot,
        groupId,
        userId,
        ts,
        dayTs,
        scope,
        basePayWeight,
        highPayBaseWeight,
        allowEmpty,
        eventEffect,
        minTotalCount,
        itemOthersMultiplier,
      )
    } else {
      outcome = await this.buildCallOutcome(
        message,
        atList,
        groupId,
        userId,
        ts,
        dayTs,
        scope,
        basePayWeight,
        highPayBaseWeight,
      )
    }

    if (!outcome) {
      this.logger.debug(`没有可用 outcome，站街终止。`)
      return
    }

    if (type === 'call') {
      record.dailyPurchases = {
        ...(record.dailyPurchases ?? {}),
        _call_count: (record.dailyPurchases?.['_call_count'] ?? 0) + 1,
      }
      await this.standService.getRecordRepository().save(record)
    }

    let { intoDetail, outList } = outcome

    const pillItem = usableItems.find(i => i.effect.callExtraRounds)
    let callRoundScores: number[] | null = null
    if (type === 'call' && pillItem && outcome) {
      const [minExtra, maxExtra] = pillItem.effect.callExtraRounds!
      const extraRounds = minExtra + Math.floor(Math.random() * (maxExtra - minExtra + 1))
      callRoundScores = [intoDetail.score]
      for (let i = 0; i < extraRounds; i++) {
        const step = this.rollWeightedStep(12, basePayWeight, highPayBaseWeight)
        const roundScore = step * 50
        callRoundScores.push(roundScore)
        intoDetail.score += roundScore
        if (intoDetail.friends[0]) intoDetail.friends[0].score += roundScore
        if (outList[0]) outList[0].score += roundScore
      }
      const totalRounds = 1 + extraRounds
      const roundsStr = callRoundScores.map(s => String(s)).join(' + ')
      itemEffectDetails.push({
        itemName: '小药丸',
        description: `连续 ${totalRounds} 次 (${roundsStr} = ${intoDetail.score})`,
      })
      this.logger.debug(`小药丸生效 ${totalRounds} 次: ${roundsStr} = ${intoDetail.score}`)
    }

    let boomerangAmount = 0
    if (outcome.boomerangReflect) {
      boomerangAmount = outcome.boomerangReflect.amount
      await this.vaultService.applyBill({
        userId,
        change: -boomerangAmount,
        type: 'expense',
        source: 'stand-on-the-street',
        description: '站街 - 回旋镖反弹',
        scope,
        allowNegative: true,
      })
      itemEffectDetails.push({ itemName: '回旋镖', description: `对方反弹了 ${boomerangAmount} 硬币！` })
      this.logger.debug(`回旋镖反弹 ${boomerangAmount} 给 caller ${userId}`)
    }

    const rawTotalScore = intoDetail.score
    let finalScore = rawTotalScore
    finalScore = Math.round(finalScore * eventEffect.incomeMultiplier)
    finalScore += eventEffect.flatBonus
    if (eventEffect.zeroIncome) finalScore = 0

    if (hasInsurance && finalScore === 0 && recentAvg > 0) {
      finalScore = Math.round(recentAvg)
      itemEffectDetails.push({ itemName: '保险', description: `零收入赔偿 → ${finalScore} 硬币` })
      this.logger.debug(`保险生效，赔偿平均收入 ${finalScore}`)
    }

    if (hasBillboard && billboardItem) {
      const scoreBefore = finalScore
      const multiplier = billboardItem.effect.incomeMultiplier ?? 1
      finalScore = Math.round(finalScore * multiplier)
      const parts = [`收入 ${scoreBefore} → ${finalScore} (x${multiplier})`]
      if (minTotalCount > 0) parts.push(`保底 ${minTotalCount} 人`)
      itemEffectDetails.push({ itemName: '广告牌', description: parts.join('，') })
      this.logger.debug(`广告牌生效，收入 ${scoreBefore} → ${finalScore} (x${multiplier})，保底${minTotalCount}人`)
    }

    if (megaphoneItem && type === 'random') {
      itemEffectDetails.push({ itemName: '喇叭', description: `路人数量 x${itemOthersMultiplier}` })
      this.logger.debug(`喇叭生效，路人数量 x${itemOthersMultiplier}`)
    }

    const highHeelsItem = usableItems.find(i => i.id === 'high_heels')
    if (highHeelsItem && type === 'random') {
      const scoreBefore = finalScore
      const mult = highHeelsItem.effect.incomeMultiplier ?? 2
      finalScore = Math.round(finalScore * mult)
      itemEffectDetails.push({ itemName: '高跟鞋', description: `收入 ${scoreBefore} → ${finalScore} (x${mult})，CD x1.5` })
      this.logger.debug(`高跟鞋生效，收入 x${mult}`)
    }

    let redEnvelopeCost = 0
    if (redEnvelopeItem && type === 'random' && intoDetail.friends.length > 0) {
      const perFriend = redEnvelopeItem.effect.redEnvelope ?? 50
      const prevGuaranteed = new Set(outcome?.guaranteedVisitorIds ?? [])
      const newFriends = intoDetail.friends.filter((f: StandFriend) => !prevGuaranteed.has(f.qq))
      if (newFriends.length > 0) {
        redEnvelopeCost = perFriend * newFriends.length
        await this.vaultService.applyBill({
          userId,
          change: -redEnvelopeCost,
          type: 'expense',
          source: 'stand-on-the-street',
          description: `站街红包 x${newFriends.length}`,
          scope,
          allowNegative: true,
        })
        const guaranteedIds = newFriends.map((f: StandFriend) => f.qq)
        ;(intoDetail as any).guaranteedVisitors = guaranteedIds
        itemEffectDetails.push({ itemName: '红包', description: `给 ${newFriends.length} 位新群友发了 ${perFriend}（共 ${redEnvelopeCost}），他们下次必来` })
        this.logger.debug(`红包生效，发了 ${redEnvelopeCost} 给 ${guaranteedIds.length} 新人（排除 ${prevGuaranteed.size} 旧保底）`)
      } else {
        itemEffectDetails.push({ itemName: '红包', description: '没有新群友可发红包（全是保底白嫖客）' })
      }
    }

    const displayRatio = rawTotalScore > 0 ? finalScore / rawTotalScore : 0
    const displayOthersScore = Math.round(intoDetail.others.score * displayRatio)
    const displayFriendsScore = finalScore - displayOthersScore
    const displayFriends = (intoDetail.friends ?? []).map((f: StandFriend) => ({
      ...f,
      score: rawTotalScore > 0 ? Math.round(f.score * displayRatio) : f.score,
    }))

    intoDetail = { ...intoDetail, score: finalScore }

    let cdMultiplier = eventEffect.cdMultiplier
    if (hasVipCard) {
      const vipItem = usableItems.find(i => i.effect.cdMultiplier && i.effect.cdMultiplier < 1)
      if (vipItem) {
        const cdBefore = cdMultiplier
        cdMultiplier *= (vipItem.effect.cdMultiplier ?? 1)
        const cdHoursBefore = Math.round((standConfig?.cooldownHours ?? 12) * cdBefore * 10) / 10
        const cdHoursAfter = Math.round((standConfig?.cooldownHours ?? 12) * cdMultiplier * 10) / 10
        itemEffectDetails.push({ itemName: '贵宾卡', description: `CD ${cdHoursBefore}h → ${cdHoursAfter}h` })
        this.logger.debug(`贵宾卡生效，CD乘以 ${vipItem.effect.cdMultiplier}`)
      }
    }
    if (highHeelsItem && type === 'random') {
      cdMultiplier *= (highHeelsItem.effect.cdMultiplier ?? 1.5)
    }

    let eventPenalty = eventEffect.flatPenalty
    const totalCount = intoDetail.others.count + outList.length
    const per = totalCount > 0 ? Math.ceil(intoDetail.score / totalCount) : 0
    this.logger.debug(`站街收益 outcome: score=${intoDetail.score}, outList=${JSON.stringify(outList)} totalPer=${per}`)

    if ((record.coffeeDebuff ?? 0) > 0 && Date.now() >= (record.coffeeDebuffExpiry ?? 0)) {
      record.coffeeDebuff = 0
      record.coffeeDebuffExpiry = 0
      await this.standService.getRecordRepository().save(record)
      this.logger.debug(`咖啡debuff已过期，已清除`)
    }

    let incomeAccountBalance = latestBalance - boomerangAmount - redEnvelopeCost
    let eventPenaltyApplied = 0
    await getDataSource().transaction(async manager => {
      const recordRepo = manager.getRepository(StandRecord)
      const merchantRepo = manager.getRepository(StandMerchantOrder)
      const getOrCreateRecordWithRepo = async (targetUserId: number) => {
        let targetRecord = await recordRepo.findOne({
          where: {
            userId: targetUserId,
            groupId,
          }
        })
        if (!targetRecord) {
          targetRecord = recordRepo.create({
            userId: targetUserId,
            groupId,
            score: 0,
            countFriends: 0,
            countOthers: 0,
            into: [],
            out: [],
            statsInto: 0,
            statsOut: 0,
            force: false,
            notify: null,
          })
          targetRecord = await recordRepo.save(targetRecord)
          this.logger.debug(`初始化目标记录 userId=${targetUserId} groupId=${groupId}`)
        }
        return targetRecord
      }

      if (eventPenalty > 0) {
        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId,
          change: -eventPenalty,
          type: 'expense',
          source: 'stand-on-the-street',
          description: `站街事件 - ${eventNames.join(' + ')}`,
          scope,
          merchantOrderId,
          merchantMeta: { type: 'event_penalty', eventIds: eventResults.map(r => r.event.id), groupId },
          allowNegative: true,
          manager,
        })
        if (billResult.ok) {
          eventPenaltyApplied = eventPenalty
          latestBalance = Number(billResult.account.balance)
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId,
            groupId,
            amount: eventPenalty,
            sourceType: 'stand_event_penalty',
            targetType: 'stand',
          }))
          this.logger.debug(`用户${userId} 事件惩罚扣除 ${eventPenalty}, 新余额${latestBalance}`)
        }
      }

      record.score = Number(record.score) + intoDetail.score
      record.countFriends += Array.isArray(intoDetail.friends) ? intoDetail.friends.length : 0
      record.countOthers += intoDetail.others.count
      record.statsInto = Number(record.statsInto) + intoDetail.score
      record.into = [...(record.into ?? []), intoDetail]
      const baseCd = cooldownHours * 60 * 60 * 1000
      const finalCd = Math.round(baseCd * cdMultiplier)
      record.nextTime = configManager.config.devMode === true
        ? null
        : new Date(ts + finalCd)
      record.force = force
      await recordRepo.save(record)
      this.logger.debug(`站街记录已更新 userId=${userId} groupId=${groupId} cd=${finalCd}ms`)

      if (intoDetail.score !== 0) {
        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId,
          change: intoDetail.score,
          type: 'income',
          source: 'stand-on-the-street',
          description: '站街 - 收入',
          scope,
          merchantOrderId,
          merchantMeta: { type: 'stand_income', groupId, mode: type },
          manager,
        })
        if (billResult.ok) {
          incomeAccountBalance = Number(billResult.account.balance)
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId,
            groupId,
            amount: intoDetail.score,
            sourceType: type === 'random' ? 'stand_random_income' : 'stand_call_income',
            targetType: 'user',
          }))
          this.logger.debug(`用户${userId} 获得收入 ${intoDetail.score}，新余额${incomeAccountBalance}`)
        } else {
          this.logger.warn(`用户${userId} 收入到账失败`)
        }
      }

      if (eventEffect.flatBonus > 0) {
        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId,
          change: eventEffect.flatBonus,
          type: 'income',
          source: 'stand-on-the-street',
          description: `站街事件 - ${eventNames.join(' + ')}`,
          scope,
          merchantOrderId,
          merchantMeta: { type: 'event_bonus', eventIds: eventResults.map(r => r.event.id), groupId },
          manager,
        })
        if (billResult.ok) {
          incomeAccountBalance = Number(billResult.account.balance)
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId,
            groupId,
            amount: eventEffect.flatBonus,
            sourceType: 'stand_event_bonus',
            targetType: 'user',
          }))
          this.logger.debug(`用户${userId} 事件奖励 ${eventEffect.flatBonus}`)
        }
      }

      for (const item of outList) {
        const targetId = item.targetUserId
        const targetBalance = await this.vaultService.getTotalBalance(targetId)
        if (targetBalance <= 0) {
          this.logger.debug(`用户${targetId} 余额<=0，白嫖跳过扣款`)
          const targetRecord = await getOrCreateRecordWithRepo(targetId)
          targetRecord.out = [...(targetRecord.out ?? []), { qq: userId, score: 0, ts }]
          await recordRepo.save(targetRecord)
          continue
        }
        const targetRecord = await getOrCreateRecordWithRepo(targetId)
        targetRecord.score = Number(targetRecord.score) - item.score
        targetRecord.statsOut = Number(targetRecord.statsOut) + item.score
        targetRecord.out = [...(targetRecord.out ?? []), { qq: userId, score: item.score, ts }]
        await recordRepo.save(targetRecord)
        this.logger.debug(`用户${targetId} 站街支出扣除: ${item.score}`)

        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId: targetId,
          change: -item.score,
          type: 'expense',
          source: 'stand-on-the-street',
          description: '站街 - 支出',
          scope,
          merchantOrderId,
          merchantMeta: { type: 'stand_expense', groupId, fromUserId: userId },
          allowNegative: false,
          manager,
        })
        if (billResult.ok) {
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId: targetId,
            groupId,
            amount: item.score,
            sourceType: 'user',
            targetType: 'stand_expense',
          }))
          this.logger.debug(`用户${targetId} 扣款成功 ${item.score}`)
        } else {
          this.logger.warn(`用户${targetId} 扣款失败（余额不足）`)
        }
      }
    })

    const balanceIncome = intoDetail.score + eventEffect.flatBonus
    let balanceExpense = eventPenaltyApplied + boomerangAmount + redEnvelopeCost + itemCost + (paidStandInfo?.paidStandCost ?? 0)

    const standResultData = {
      avatarUrl: getQQAvatarUrl(userId, 100),
      nickname: message.sender.card || message.sender.nickname || String(userId),
      content: '',
      totalScore: intoDetail.score,
      totalCount,
      othersScore: displayOthersScore,
      othersCount: intoDetail.others.count,
      friendsScore: displayFriendsScore,
      friends: displayFriends.map((friend: StandFriend) => ({
        userId: friend.qq,
        score: friend.score,
        avatarUrl: getQQAvatarUrl(friend.qq, 100),
      })),
      balance: incomeAccountBalance,
      previousBalance: originalBalance,
      balanceIncome,
      balanceExpense,
      totalVisits: record.countFriends + record.countOthers,
      events: eventResults.map(r => ({ name: r.event.name, description: r.event.description })),
      eventPenalty: eventPenaltyApplied > 0 ? eventPenaltyApplied : undefined,
      itemEffects: itemEffectDetails.length > 0 ? itemEffectDetails : undefined,
      paidStandInfo: paidStandInfo ? { cost: paidStandInfo.paidStandCost, count: paidStandInfo.paidStandCount } : undefined,
      boomerangReflect: boomerangAmount > 0 ? boomerangAmount : undefined,
    }
    return {
      standResultData,
      totalCount,
      record,
    }
  }

  private async sendRank(message: EnhancedMessage, bot: NCWebsocket, type: StandRankType) {
    this.logger.debug(`查询排行榜 type=${type}`)
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      this.logger.warn(`查询排行榜: 站街模块未开启`)
      return
    }
    if (message.message_type !== 'group') return
    const groupId = message.group_id
    const meta = standRankMeta[type]
    const records = await this.standService.getRecordRepository().find({
      where: {
        groupId,
      }
    })
    this.logger.debug(`排行榜当前记录数: ${records.length}`)
    const items = records.map(record => {
      const totalCount = record.countFriends + record.countOthers
      let number = 0
      if (type === 'count') {
        number = totalCount
      } else if (type === 'make_score') {
        number = totalCount > 0 ? Math.ceil(Number(record.statsInto) / totalCount) : 0
      } else if (type === 'lose_score') {
        number = totalCount > 0 ? Math.ceil(Number(record.statsInto) / totalCount) : 0
      } else if (type === 'good_boi') {
        number = (record.out ?? []).length
      } else if (type === 'bad_boi') {
        number = (record.out ?? []).length
      }
      return {
        userId: Number(record.userId),
        number,
      }
    })

    const sorted = items
      .filter(item => item.number !== 0 || type === 'good_boi' || type === 'bad_boi' || type === 'count')
      .sort((a, b) => {
        if (type === 'lose_score' || type === 'good_boi') {
          return a.number - b.number
        }
        return b.number - a.number
      })
      .slice(0, 5)

    this.logger.debug(`排行榜前5: ${JSON.stringify(sorted)}`)

    const members = await bot.get_group_member_list({ group_id: groupId })
    const memberMap = new Map(members.map(member => [member.user_id, member.card || member.nickname || String(member.user_id)]))

    const itemsWithMeta = sorted.map((item, index) => ({
      userId: item.userId,
      nickname: memberMap.get(item.userId) ?? String(item.userId),
      title: meta.title[index],
      number: item.number,
      unit: meta.unit,
      avatarUrl: getQQAvatarUrl(item.userId, 100),
    }))

    let groupName = String(groupId)
    try {
      const groupInfo = await bot.get_group_info({ group_id: groupId })
      groupName = groupInfo.group_name
    } catch (error) {
      this.logger.warn(`查询排行榜获取群名失败: ${error}`)
    }

    const rank = StandRank({
      groupInfo: {
        name: groupName,
        id: groupId,
      },
      title: meta.name,
      items: itemsWithMeta,
    })

    if (!rank) {
      this.logger.warn(`排行榜模板渲染失败`)
      return
    }

    const image = await renderTemplate(
      rank,
      { width: 400, height: 'auto', minHeight: 260 }
    )
    await message.reply([Structs.image(image)])
    this.logger.debug(`群${groupId} 排行榜图片生成并发送 type=${type}`)
  }
}
