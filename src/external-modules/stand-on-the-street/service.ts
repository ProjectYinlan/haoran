import { randomUUID } from 'crypto'
import { In } from 'typeorm'
import { getDataSource } from '../../core/database.js'
import StandRecord from './entities/StandRecord.js'
import StandMerchantOrder from './entities/StandMerchantOrder.js'

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
}

