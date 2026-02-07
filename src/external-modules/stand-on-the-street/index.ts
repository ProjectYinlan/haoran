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
import { createLogger } from "../../logger.js"
import { readFile } from "fs/promises"

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
}

@Module('stand-on-the-street')
@ModuleDescription('站街')
@ModuleVersion('1.1.1')
export default class StandOnTheStreetModule extends BaseCommand {
  private vaultService = VaultService.getInstance()
  private standService = StandService.getInstance()
  private logger = createLogger('external-modules/' + this.moduleName)
  private logicContent = ''

  initialize() {
    this.logger = createLogger('external-modules/' + this.moduleName)
    const logicFilePath = join(externalModulesPath, this.moduleName, 'docs', 'LOGIC_.md')
    readFile(logicFilePath, 'utf-8').then(content => {
      this.logicContent = content
    }).catch(error => {
      this.logger.error('读取逻辑文件失败: ' + error)
    })
  }

  @NoPrefixCommand('站街', '进行随机站街')
  @Usage('站街 [--force/-f]')
  @Permission('stand-on-the-street.work')
  @GroupOnly('该命令仅限群聊使用')
  async handleStand(
    @Message() message: EnhancedMessage,
    @Args() args: string[],
    @Bot() bot: NCWebsocket,
  ) {
    const force = args.includes('--force') || args.includes('-f')
    await this.executeStand(message, bot, 'random', force)
  }

  @NoPrefixCommand('强制站街', '进行强制站街')
  @Usage('强制站街')
  @Permission('stand-on-the-street.work')
  @GroupOnly('该命令仅限群聊使用')
  async handleForce(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    await this.executeStand(message, bot, 'random', true)
  }

  @RegexCommand(/^(炒|超|操)(\s+|$)/, '进行点名站街')
  @Usage('操 @对方')
  @Permission('stand-on-the-street.call')
  @GroupOnly('该命令仅限群聊使用')
  async handleCall(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
    @At() atList: number[],
  ) {
    await this.executeStand(message, bot, 'call', false, atList)
  }

  @NoPrefixCommand('站街数据', '查询站街数据')
  @Usage('站街数据')
  @Permission('stand-on-the-street.info')
  @GroupOnly('该命令仅限群聊使用')
  async handleInfo(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    if (message.message_type !== 'group') return
    const groupId = message.group_id
    const userId = message.sender.user_id
    const record = await this.standService.getRecord(userId, groupId)
    if (!record || (record.into ?? []).length === 0) {
      await message.reply([Structs.text('您还没有站过街')])
      return
    }

    const totalCount = record.countFriends + record.countOthers
    const per = totalCount > 0 ? Math.ceil(Number(record.statsInto) / totalCount) : 0
    const account = await this.vaultService.getOrCreateAccount(userId, resolveScope(message))
    const globalAccount = await this.vaultService.getOrCreateAccount(userId, { type: BaseScopeType.GLOBAL })
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
        balance: Number(globalAccount.balance),
        totalCount: globalTotalCount,
        friendsCount: globalFriendsCount,
      }
    })
    if (!info) return

    const image = await renderTemplate(
      info,
      { width: 400, height: 'auto', minHeight: 220 }
    )
    await message.reply([Structs.image(image)])
  }

  @RegexCommand(/^(站街人气榜|站街赚钱榜|站街赔钱榜|站街贞洁榜|站街常客榜)$/, '查询站街排行榜')
  @Usage(['站街人气榜', '站街赔钱榜', '站街贞洁榜', '站街常客榜', '站街赚钱榜'])
  @Permission('stand-on-the-street.rank')
  @GroupOnly('该命令仅限群聊使用')
  async handleRank(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
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
    if (!type) return
    await this.sendRank(message, bot, type)
  }

  @NoPrefixCommand('站街逻辑', '查看站街逻辑')
  @Usage('站街逻辑')
  @Permission('stand-on-the-street.logic')
  @GroupOnly('该命令仅限群聊使用')
  async handleLogic(
    @Message() message: EnhancedMessage,
  ) {
    if (!this.logicContent) {
      await message.reply([Structs.text('内部错误，请联系管理员')])
      return
    }
    const logic = StandLogic({ content: this.logicContent })
    if (!logic) return
    const image = await renderTemplate(logic, { width: 400, height: 'auto' })
    await message.reply([Structs.image(image)])

  }

  private getRecentAvg(record: StandRecord) {
    const recentScores = (record.into ?? []).slice(-5).map(item => Number(item.score) || 0).filter(Boolean)
    if (recentScores.length === 0) return 0
    return recentScores.reduce((acc, curr) => acc + curr, 0) / recentScores.length
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
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i]
      if (roll <= 0) return i
    }
    return stepCount - 1
  }

  private async resolveCooldown(
    message: EnhancedMessage,
    record: StandRecord,
    ts: number,
    force: boolean,
  ) {
    const devMode = standConfig?.devMode === true
    if (!devMode && record.nextTime && record.nextTime.getTime() > ts) {
      if (!force) {
        const nextTime = formatTs(record.nextTime)
        await message.reply([Structs.text(`${randomArrayElem(standTexts.many)}\n下次时间为：${nextTime}`)])
        return { canProceed: false, force }
      }
      if (record.force) {
        const nextTime = formatTs(record.nextTime)
        await message.reply([Structs.text(`${randomArrayElem(standTexts.tooMany)}\n请在下次时间到达后使用普通站街\n下次时间为：${nextTime}`)])
        return { canProceed: false, force }
      }
    }

    if (record.nextTime && record.nextTime.getTime() <= ts) {
      return { canProceed: true, force: false }
    }
    return { canProceed: true, force }
  }

  private buildForceState(force: boolean) {
    let msgContent = ''
    let canForce = false
    if (force) {
      // 强制模式触发加时 Buff 概率
      canForce = Math.random() < 0.3
      if (canForce) {
        msgContent += '\n恭喜您，获得杨威Buff，站街CD加18小时'
      }
    }
    return { canForce, msgContent }
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
  ): Promise<StandOutcome> {
    const members = await bot.get_group_member_list({ group_id: groupId })
    const memberIds = members.map(m => m.user_id)
    // 随机生成本次“群友/路人”数量上限
    const totalCountMax = randomRange(0, 30)
    const friendsCountMax = memberIds.length >= 20 ? 19 : Math.max(memberIds.length - 1, 0)
    let friendsCount = friendsCountMax > 0 ? randomRange(0, friendsCountMax) : 0
    const othersCountMax = friendsCount > totalCountMax ? 0 : totalCountMax - friendsCount
    const othersCount = othersCountMax > 0 ? randomRange(0, othersCountMax) : 0

    // 过滤候选人：有余额且当天被榨少于 2 次
    const candidateIds = memberIds.filter(id => id !== userId)
    const records = await this.standService.getRecordsByUserIds(candidateIds, groupId)
    const balances = await this.vaultService.getBalancesByUserIds(candidateIds, scope)

    const candidates = records.filter(recordItem => {
      const balance = balances.get(Number(recordItem.userId)) ?? 0
      if (balance <= 0) return false
      const dayOut = (recordItem.out ?? []).filter((item: any) => item.ts && item.ts >= dayTs).length
      return dayOut < 2
    }).map(item => Number(item.userId))

    friendsCount = Math.min(friendsCount, candidates.length)
    const candidateBalances = candidates.map(id => balances.get(id) ?? 0)
    const maxBalance = Math.max(...candidateBalances, 1)
    // 余额越多权重越高
    const weights = candidateBalances.map(balance => {
      const normalized = clamp(balance / maxBalance, 0, 1)
      return 1 + normalized * 4
    })
    const picked = pickWeightedUnique(candidates, weights, friendsCount)
    const friends: StandFriend[] = []
    let friendsScore = 0
    const outList: Array<{ targetUserId: number, score: number }> = []
    let whiteCount = 0

    const rollScore = (stepCount: number) => {
      // 白嫖出现次数会提升高额支付权重
      const step = this.rollWeightedStep(stepCount, basePayWeight, highPayBaseWeight + whiteCount)
      if (step === 0) whiteCount += 1
      return step * 50
    }

    picked.forEach(friendId => {
      // 群友收益按随机分段计算
      const score = rollScore(6)
      friendsScore += score
      friends.push({ qq: friendId, score })
      outList.push({ targetUserId: friendId, score })
    })

    let othersScore = 0
    for (let i = 0; i < othersCount; i += 1) {
      // 路人每人次独立计算付款金额
      othersScore += rollScore(5)
    }

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
    }
  }

  private async buildCallOutcome(
    message: EnhancedMessage,
    atList: number[],
    groupId: number,
    ts: number,
    dayTs: number,
    scope: BaseScope,
    basePayWeight: number,
    highPayBaseWeight: number,
  ): Promise<StandOutcome | null> {
    if (atList.length === 0) {
      await message.reply([Structs.text('您没有选择摇人对象。')])
      return null
    }
    if (atList.length > 1) {
      await message.reply([Structs.text('一次只能光临一人哦。')])
      return null
    }
    const targetId = atList[0]
    const targetRecord = await this.standService.getRecord(targetId, groupId)
    if (!targetRecord) {
      await message.reply([Structs.text('他还没站过街。')])
      return null
    }
    const targetBalanceMap = await this.vaultService.getBalancesByUserIds([targetId], scope)
    const targetBalance = targetBalanceMap.get(targetId) ?? 0
    if (targetBalance <= 0) {
      await message.reply([Structs.text('他已经没钱了。')])
      return null
    }
    const dayOut = (targetRecord.out ?? []).filter((item: any) => item.ts && item.ts >= dayTs).length
    if (dayOut >= 2) {
      await message.reply([Structs.text(`他今天已经被榨${dayOut}次了，牛牛已经累了`)])
      return null
    }

    // 点名模式收益按随机分段计算
    const step = this.rollWeightedStep(12, basePayWeight, highPayBaseWeight)
    const score = step * 50
    return {
      outList: [{ targetUserId: targetId, score }],
      intoDetail: {
        ts,
        score,
        friends: [{ qq: targetId, score }],
        others: { count: 0, score: 0 },
      },
    }
  }

  private async executeStand(
    message: EnhancedMessage,
    bot: NCWebsocket,
    type: StandMode,
    force: boolean,
    atList: number[] = [],
  ) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
      return
    }
    if (message.message_type !== 'group') return

    const userId = message.sender.user_id
    const groupId = message.group_id
    const scope = resolveScope(message)
    const now = new Date()
    const ts = now.getTime()
    const dayTs = getDayStart(now).getTime()

    const record = await this.standService.getOrCreateRecord(userId, groupId)

    const cooldownResult = await this.resolveCooldown(message, record, ts, force)
    if (!cooldownResult.canProceed) return
    force = cooldownResult.force

    let msgContent = ''
    const cooldownHours = standConfig?.cooldownHours ?? 12
    const forceExtraHours = standConfig?.forceExtraHours ?? 18
    const forceCommissionRate = standConfig?.forceCommissionRate ?? 0.5
    const richCommissionRate = standConfig?.richCommissionRate ?? 0.2
    const richBalanceThreshold = standConfig?.richBalanceThreshold ?? 20000

    // 近 5 次平均收益
    const recentAvg = this.getRecentAvg(record)
    // 近 5 次站街人均金额与低收入补偿权重
    const recentPerCapitaAvg = this.getRecentPerCapitaAvg(record)
    const lowAvgBoost = recentPerCapitaAvg < 100
      ? (100 - recentPerCapitaAvg) / 100 / 2
      : 0
    // 总体付款基础权重（低于 100 时额外增加）
    const basePayWeight = 1 + lowAvgBoost
    // 高额支付基础权重
    const highPayBaseWeight = 1

    const account = await this.vaultService.getOrCreateAccount(userId, scope)
    let latestBalance = Number(account.balance)

    // 富豪手续费
    const richCommission = latestBalance > richBalanceThreshold && recentAvg > 0
      ? Math.round(recentAvg * richCommissionRate)
      : 0

    // 强制手续费
    const forceCommission = force && recentAvg > 0
      ? Math.round(recentAvg * forceCommissionRate)
      : 0
    const forceState = this.buildForceState(force)
    const canForce = forceState.canForce
    msgContent += forceState.msgContent

    let outcome: StandOutcome | null = null

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
      )
    } else {
      outcome = await this.buildCallOutcome(
        message,
        atList,
        groupId,
        ts,
        dayTs,
        scope,
        basePayWeight,
        highPayBaseWeight,
      )
    }
    if (!outcome) return
    const { intoDetail, outList } = outcome

    // 平均收益与文案选择
    const totalCount = intoDetail.others.count + outList.length
    const per = totalCount > 0 ? Math.ceil(intoDetail.score / totalCount) : 0
    const content = (per === 0 || Number.isNaN(per))
      ? randomArrayElem(standTexts.succeed.none)
      : randomArrayElem(standTexts.succeed.normal)

    let incomeAccountBalance = latestBalance
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
        }
        return targetRecord
      }

      if (richCommission > 0) {
        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId,
          change: -richCommission,
          type: 'expense',
          source: 'stand-on-the-street',
          description: '站街 - 富豪手续费',
          scope,
          merchantOrderId,
          merchantMeta: { type: 'rich_fee', groupId },
          allowNegative: true,
          manager,
        })
        if (billResult.ok) {
          latestBalance = Number(billResult.account.balance)
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId,
            groupId,
            amount: richCommission,
            sourceType: 'stand_rich_fee',
            targetType: 'stand',
          }))
        }
        msgContent += `\n已扣除富豪手续费 ${richCommission}，余额为 ${latestBalance}`
      }

      if (forceCommission > 0) {
        const merchantOrderId = randomUUID()
        const billResult = await this.vaultService.applyBill({
          userId,
          change: -forceCommission,
          type: 'expense',
          source: 'stand-on-the-street',
          description: '站街 - 强制手续费',
          scope,
          merchantOrderId,
          merchantMeta: { type: 'force_fee', groupId },
          allowNegative: true,
          manager,
        })
        if (billResult.ok) {
          latestBalance = Number(billResult.account.balance)
          await merchantRepo.save(merchantRepo.create({
            orderId: merchantOrderId,
            billId: billResult.bill.id,
            userId,
            groupId,
            amount: forceCommission,
            sourceType: 'stand_force_fee',
            targetType: 'stand',
          }))
        }
        msgContent += `\n已扣除强制站街手续费 ${forceCommission}，余额为 ${latestBalance}`
      }

      record.score = Number(record.score) + intoDetail.score
      record.countFriends += Array.isArray(intoDetail.friends) ? intoDetail.friends.length : 0
      record.countOthers += intoDetail.others.count
      record.statsInto = Number(record.statsInto) + intoDetail.score
      record.into = [...(record.into ?? []), intoDetail]
      record.nextTime = standConfig?.devMode === true
        ? null
        : new Date(ts + cooldownHours * 60 * 60 * 1000 + (canForce ? forceExtraHours * 60 * 60 * 1000 : 0))
      record.force = canForce
      await recordRepo.save(record)

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
        }
      }

      for (const item of outList) {
        const targetId = item.targetUserId
        const targetRecord = await getOrCreateRecordWithRepo(targetId)
        targetRecord.score = Number(targetRecord.score) - item.score
        targetRecord.statsOut = Number(targetRecord.statsOut) + item.score
        targetRecord.out = [...(targetRecord.out ?? []), { qq: userId, score: item.score, ts }]
        await recordRepo.save(targetRecord)

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
          allowNegative: true,
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
        }
      }
    })

    const friendsList = Array.isArray(intoDetail.friends) ? intoDetail.friends : []
    const result = StandResult({
      avatarUrl: getQQAvatarUrl(userId, 100),
      nickname: message.sender.card || message.sender.nickname || String(userId),
      content: `${content}${msgContent}`,
      totalScore: intoDetail.score,
      totalCount,
      othersScore: intoDetail.others.score,
      othersCount: intoDetail.others.count,
      friendsScore: intoDetail.score - intoDetail.others.score,
      friends: friendsList.map((friend: any) => ({
        userId: friend.qq,
        score: friend.score,
        avatarUrl: getQQAvatarUrl(friend.qq, 100),
      })),
      balance: incomeAccountBalance,
      totalVisits: record.countFriends + record.countOthers,
    })
    if (!result) return
    const image = await renderTemplate(result, { width: 400, height: 'auto', minHeight: 260 })
    await message.reply([Structs.image(image)])
  }

  private async sendRank(message: EnhancedMessage, bot: NCWebsocket, type: StandRankType) {
    if (standConfig?.enabled === false) {
      await message.reply([Structs.text('站街模块未开启')])
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
    }

    const rank = StandRank({
      groupInfo: {
        name: groupName,
        id: groupId,
      },
      title: meta.name,
      items: itemsWithMeta,
    })

    if (!rank) return

    const image = await renderTemplate(
      rank,
      { width: 400, height: 'auto', minHeight: 260 }
    )
    await message.reply([Structs.image(image)])
  }
}