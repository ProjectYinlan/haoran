import { BaseCommand, Bot, GroupOnly, Message, Permission, Usage, Args, Module, NoPrefixCommand, RegexCommand, At, ModuleDescription } from "../../core/decorators.js"
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

@Module('stand-on-the-street')
@ModuleDescription('群聊站街玩法：随机/摇人/强制站街，含冷却与排行榜。')
export default class StandOnTheStreetModule extends BaseCommand {
  private vaultService = VaultService.getInstance()
  private standService = StandService.getInstance()

  initialize() {}

  @NoPrefixCommand('站街', '随机站街')
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

  @NoPrefixCommand('强制站街', '强制站街')
  @Usage('强制站街')
  @Permission('stand-on-the-street.work')
  @GroupOnly('该命令仅限群聊使用')
  async handleForce(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
  ) {
    await this.executeStand(message, bot, 'random', true)
  }

  @RegexCommand(/^(站街摇人|炒|超|操)(\s+|$)/, '站街摇人')
  @Usage('站街摇人 @对方')
  @Permission('stand-on-the-street.call')
  @GroupOnly('该命令仅限群聊使用')
  async handleCall(
    @Message() message: EnhancedMessage,
    @Bot() bot: NCWebsocket,
    @At() atList: number[],
  ) {
    await this.executeStand(message, bot, 'call', false, atList)
  }

  @NoPrefixCommand('站街数据', '查看站街数据')
  @Usage('站街数据')
  @Permission('stand-on-the-street.info')
  @GroupOnly('该命令仅限群聊使用')
  async handleInfo(
    @Message() message: EnhancedMessage,
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
    const avatarUrl = getQQAvatarUrl(userId, 100)
    const nickname = message.sender.card || message.sender.nickname || String(userId)

    const image = await renderTemplate(
      StandInfo({
        avatarUrl,
        nickname,
        per,
        balance: Number(account.balance),
        totalCount,
        friendsCount: record.countFriends,
      }),
      { width: 400, height: 'auto', minHeight: 220 }
    )
    await message.reply([Structs.image(image)])
  }

  @RegexCommand(/^(站街人气榜|站街赚钱榜|站街赔钱榜|站街乖宝宝榜|站街坏宝宝榜)$/, '站街排行榜')
  @Usage('站街人气榜 | 站街赚钱榜 | 站街赔钱榜 | 站街乖宝宝榜 | 站街坏宝宝榜')
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
      '站街乖宝宝榜': 'good_boi',
      '站街坏宝宝榜': 'bad_boi',
    }
    const type = map[content]
    if (!type) return
    await this.sendRank(message, bot, type)
  }

  private async executeStand(
    message: EnhancedMessage,
    bot: NCWebsocket,
    type: 'random' | 'call',
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

    const devMode = standConfig?.devMode === true
    if (!devMode && record.nextTime && record.nextTime.getTime() > ts) {
      if (!force) {
        const nextTime = formatTs(record.nextTime)
        await message.reply([Structs.text(`${randomArrayElem(standTexts.many)}\n下次时间为：${nextTime}`)])
        return
      }
      if (record.force) {
        const nextTime = formatTs(record.nextTime)
        await message.reply([Structs.text(`${randomArrayElem(standTexts.tooMany)}\n请在下次时间到达后使用普通站街\n下次时间为：${nextTime}`)])
        return
      }
    }

    if (record.nextTime && record.nextTime.getTime() <= ts) {
      force = false
    }

    let msgContent = ''
    const cooldownHours = standConfig?.cooldownHours ?? 12
    const forceExtraHours = standConfig?.forceExtraHours ?? 18
    const forceCommissionRate = standConfig?.forceCommissionRate ?? 0.5
    const richCommissionRate = standConfig?.richCommissionRate ?? 0.2
    const richBalanceThreshold = standConfig?.richBalanceThreshold ?? 20000

    const recentScores = (record.into ?? []).slice(-5).map(item => Number(item.score) || 0).filter(Boolean)
    const recentAvg = recentScores.length > 0
      ? recentScores.reduce((acc, curr) => acc + curr, 0) / recentScores.length
      : 0

    const account = await this.vaultService.getOrCreateAccount(userId, scope)
    let latestBalance = Number(account.balance)

    const richCommission = latestBalance > richBalanceThreshold && recentAvg > 0
      ? Math.round(recentAvg * richCommissionRate)
      : 0

    let canForce = false
    const forceCommission = force && recentAvg > 0
      ? Math.round(recentAvg * forceCommissionRate)
      : 0
    if (force) {
      canForce = Math.random() < 0.3
      if (canForce) {
        msgContent += '\n恭喜您，获得杨威Buff，站街CD加18小时'
      }
    }

    let intoDetail: any = {}
    const outList: Array<{ targetUserId: number, score: number }> = []

    if (type === 'random') {
      const members = await bot.get_group_member_list({ group_id: groupId })
      const memberIds = members.map(m => m.user_id)
      const totalCountMax = randomRange(0, 30)
      const friendsCountMax = memberIds.length >= 20 ? 19 : Math.max(memberIds.length - 1, 0)
      let friendsCount = friendsCountMax > 0 ? randomRange(0, friendsCountMax) : 0
      const othersCountMax = friendsCount > totalCountMax ? 0 : totalCountMax - friendsCount
      const othersCount = othersCountMax > 0 ? randomRange(0, othersCountMax) : 0
      const othersScore = randomRange(0, 5) * othersCount * 50

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
      const weights = candidateBalances.map(balance => {
        const normalized = clamp(balance / maxBalance, 0, 1)
        return 1 + (1 - normalized) * 4
      })
      const picked = pickWeightedUnique(candidates, weights, friendsCount)
      const friends: Array<{ qq: number, score: number }> = []
      let friendsScore = 0

      picked.forEach(friendId => {
        const score = randomRange(0, 6) * 50
        friendsScore += score
        friends.push({ qq: friendId, score })
        outList.push({ targetUserId: friendId, score })
      })

      intoDetail = {
        ts,
        score: friendsScore + othersScore,
        others: {
          count: othersCount,
          score: othersScore,
        },
        friends,
      }
    } else {
      if (atList.length === 0) {
        await message.reply([Structs.text('您没有选择摇人对象。')])
        return
      }
      if (atList.length > 1) {
        await message.reply([Structs.text('一次只能光临一人哦。')])
        return
      }
      const targetId = atList[0]
      const targetRecord = await this.standService.getRecord(targetId, groupId)
      if (!targetRecord) {
        await message.reply([Structs.text('他还没站过街。')])
        return
      }
      const targetBalanceMap = await this.vaultService.getBalancesByUserIds([targetId], scope)
      const targetBalance = targetBalanceMap.get(targetId) ?? 0
      if (targetBalance <= 0) {
        await message.reply([Structs.text('他已经没钱了。')])
        return
      }
      const dayOut = (targetRecord.out ?? []).filter((item: any) => item.ts && item.ts >= dayTs).length
      if (dayOut >= 2) {
        await message.reply([Structs.text(`他今天已经被榨${dayOut}次了，牛牛已经累了`)])
        return
      }
      const score = randomRange(0, 12) * 50
      outList.push({ targetUserId: targetId, score })
      intoDetail = {
        ts,
        score,
        friends: [{ qq: targetId, score }],
        others: { count: 0, score: 0 },
      }
    }

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
      record.nextTime = devMode
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
    const image = await renderTemplate(
      StandResult({
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
      }),
      { width: 400, height: 'auto', minHeight: 260 }
    )

    await message.reply([
      Structs.image(image),
    ])

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

    const image = await renderTemplate(
      StandRank({
        groupName,
        title: meta.name,
        items: itemsWithMeta,
      }),
      { width: 400, height: 'auto', minHeight: 260 }
    )
    await message.reply([Structs.image(image)])
  }
}