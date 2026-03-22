import { randomUUID } from 'crypto'
import { In, EntityManager } from 'typeorm'
import { getDataSource } from '../../core/database.js'
import StandRecord from './entities/StandRecord.js'
import StandMerchantOrder from './entities/StandMerchantOrder.js'
import StandInventory from './entities/StandInventory.js'
import StandPlan from './entities/StandPlan.js'
import { BaseScope, BaseScopeType } from '../../typings/Command.js'
import { PLAN_TIERS, type PlanTier, getLast4AM } from './plans.js'

export class StandService {
  private static instance?: StandService

  static getInstance() {
    StandService.instance ??= new StandService()
    return StandService.instance
  }

  private getRecordRepositoryImpl() {
    return getDataSource().getRepository(StandRecord)
  }

  private getMerchantRepository() {
    return getDataSource().getRepository(StandMerchantOrder)
  }

  getRecordRepository() {
    return this.getRecordRepositoryImpl()
  }

  async getRecord(userId: number, groupId: number) {
    return await this.getRecordRepositoryImpl().findOne({
      where: {
        userId,
        groupId,
      }
    })
  }

  async getRecordsByScope(userId: number, scope: BaseScope) {
    const repo = this.getRecordRepositoryImpl()
    if (scope.type === BaseScopeType.GROUP) {
      const record = await repo.findOne({
        where: {
          userId,
          groupId: scope.groupId,
        }
      })
      return record ? [record] : []
    }
    return await repo.find({
      where: {
        userId,
      }
    })
  }

  async getOrCreateRecord(userId: number, groupId: number) {
    const repo = this.getRecordRepositoryImpl()
    let record = await repo.findOne({
      where: {
        userId,
        groupId,
      }
    })
    if (!record) {
      record = repo.create({
        userId,
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
      record = await repo.save(record)
    }
    return record
  }

  async updateNotify(userId: number, groupId: number, status: boolean) {
    const repo = this.getRecordRepositoryImpl()
    const record = await this.getOrCreateRecord(userId, groupId)
    record.notify = status
    return await repo.save(record)
  }

  async getNotifyStatus(userId: number, groupId: number) {
    const repo = this.getRecordRepositoryImpl()
    const record = await this.getOrCreateRecord(userId, groupId)
    if (record.notify === null || typeof record.notify === 'undefined') {
      record.notify = true
      await repo.save(record)
      return -1
    }
    return record.notify ? 1 : 0
  }

  async createMerchantOrder(params: {
    orderId?: string
    billId?: number | null
    userId: number
    groupId?: number | null
    amount: number
    sourceType: string
    targetType: string
  }) {
    const repo = this.getMerchantRepository()
    const order = repo.create({
      orderId: params.orderId ?? randomUUID(),
      billId: params.billId ?? null,
      userId: params.userId,
      groupId: params.groupId ?? null,
      amount: params.amount,
      sourceType: params.sourceType,
      targetType: params.targetType,
    })
    return await repo.save(order)
  }

  async getRecordsByUserIds(userIds: number[], groupId: number) {
    if (userIds.length === 0) return []
    return await this.getRecordRepositoryImpl().find({
      where: {
        userId: In(userIds),
        groupId,
      }
    })
  }

  private getInventoryRepository(manager?: EntityManager) {
    if (manager) return manager.getRepository(StandInventory)
    return getDataSource().getRepository(StandInventory)
  }

  async getInventory(userId: number, groupId: number) {
    return await this.getInventoryRepository().find({
      where: { userId, groupId },
    })
  }

  async getInventoryItem(userId: number, groupId: number, itemId: string, manager?: EntityManager) {
    return await this.getInventoryRepository(manager).findOne({
      where: { userId, groupId, itemId },
    })
  }

  async addInventoryItem(userId: number, groupId: number, itemId: string, quantity: number, manager?: EntityManager) {
    const repo = this.getInventoryRepository(manager)
    let record = await repo.findOne({ where: { userId, groupId, itemId } })
    if (record) {
      record.quantity += quantity
    } else {
      record = repo.create({ userId, groupId, itemId, quantity })
    }
    return await repo.save(record)
  }

  async consumeInventoryItem(userId: number, groupId: number, itemId: string, quantity = 1, manager?: EntityManager) {
    const repo = this.getInventoryRepository(manager)
    const record = await repo.findOne({ where: { userId, groupId, itemId } })
    if (!record || record.quantity < quantity) return false
    record.quantity -= quantity
    if (record.quantity <= 0) {
      await repo.remove(record)
    } else {
      await repo.save(record)
    }
    return true
  }

  private getPlanRepository(manager?: EntityManager) {
    if (manager) return manager.getRepository(StandPlan)
    return getDataSource().getRepository(StandPlan)
  }

  async getPlan(userId: number, groupId: number): Promise<StandPlan | null> {
    return await this.getPlanRepository().findOne({ where: { userId, groupId } })
  }

  async getActivePlan(userId: number, groupId: number): Promise<StandPlan | null> {
    const plan = await this.getPlan(userId, groupId)
    if (!plan) return null
    const now = Date.now()
    if (plan.bannedUntil && now < plan.bannedUntil) return null
    if (now >= plan.expiresAt) return null
    await this.ensurePlanResets(plan)
    return plan
  }

  async ensurePlanResets(plan: StandPlan) {
    const last4AM = getLast4AM()
    if (plan.lastDailyReset < last4AM) {
      plan.dailyUsed = 0
      plan.lastDailyReset = last4AM
      await this.getPlanRepository().save(plan)
    }
  }

  async subscribePlan(userId: number, groupId: number, tier: PlanTier): Promise<{ ok: true, plan: StandPlan } | { ok: false, reason: string }> {
    const repo = this.getPlanRepository()
    const existing = await repo.findOne({ where: { userId, groupId } })
    const now = Date.now()
    const tierDef = PLAN_TIERS[tier]

    if (existing) {
      if (existing.bannedUntil && now < existing.bannedUntil) {
        const remainMs = existing.bannedUntil - now
        const remainH = Math.ceil(remainMs / 3600000)
        return { ok: false, reason: `制裁冷却中，${remainH} 小时后可重新订阅` }
      }
      if (now < existing.expiresAt && !existing.bannedUntil) {
        return { ok: false, reason: `已有 ${PLAN_TIERS[existing.tier as PlanTier]?.name ?? existing.tier} 订阅中，到期后可更换` }
      }
    }

    const plan = existing ?? repo.create({ userId, groupId })
    plan.tier = tier
    plan.dailyUsed = 0
    plan.weeklyUsed = 0
    plan.weeklyLimit = tierDef.weeklyLimit
    plan.subscribedAt = now
    plan.expiresAt = now + tierDef.durationDays * 86400000
    plan.lastDailyReset = getLast4AM()
    plan.bannedUntil = null
    const saved = await repo.save(plan)
    return { ok: true, plan: saved }
  }

  async unsubscribePlan(userId: number, groupId: number): Promise<{ ok: true, refund: number } | { ok: false, reason: string }> {
    const repo = this.getPlanRepository()
    const plan = await repo.findOne({ where: { userId, groupId } })
    if (!plan) return { ok: false, reason: '没有订阅中的 Plan' }
    const now = Date.now()
    if (plan.bannedUntil && now < plan.bannedUntil) {
      return { ok: false, reason: '已被制裁，无法退订' }
    }
    if (now >= plan.expiresAt) {
      await repo.remove(plan)
      return { ok: false, reason: 'Plan 已到期' }
    }
    const tierDef = PLAN_TIERS[plan.tier as PlanTier]
    const remainingWeekly = Math.max(0, plan.weeklyLimit - plan.weeklyUsed)
    const refund = Math.floor((remainingWeekly / plan.weeklyLimit) * (tierDef?.price ?? 0) * 0.6)
    await repo.remove(plan)
    return { ok: true, refund }
  }

  async incrementPlanUsage(userId: number, groupId: number) {
    const repo = this.getPlanRepository()
    const plan = await repo.findOne({ where: { userId, groupId } })
    if (!plan) return
    this.ensurePlanResets(plan)
    plan.dailyUsed += 1
    plan.weeklyUsed += 1
    await repo.save(plan)
  }

  async sanctionPlan(userId: number, groupId: number, refund: number) {
    const repo = this.getPlanRepository()
    const plan = await repo.findOne({ where: { userId, groupId } })
    if (!plan) return
    const tierDef = PLAN_TIERS[plan.tier as PlanTier]
    plan.bannedUntil = Date.now() + (tierDef?.banDurationMs ?? 86400000)
    plan.expiresAt = 0
    await repo.save(plan)
    return refund
  }
}

