import { randomUUID } from 'crypto'
import { In, EntityManager } from 'typeorm'
import dayjs from 'dayjs'
import { createLogger } from '../../logger.js'
import VaultAccount from './entities/VaultAccount.js'
import VaultBill from './entities/VaultBill.js'
import { getDataSource } from '../../core/database.js'
import { BaseScope, BaseScopeType } from '../../typings/Command.js'

export class VaultService {
  private static instance?: VaultService
  private logger = createLogger('modules/vault')

  static getInstance() {
    VaultService.instance ??= new VaultService()
    return VaultService.instance
  }

  private getRepository() {
    return getDataSource().getRepository(VaultAccount)
  }

  private getBillRepository() {
    return getDataSource().getRepository(VaultBill)
  }

  async getOrCreateAccount(userId: number, scope?: BaseScope) {
    const groupId = scope?.type === BaseScopeType.GROUP ? scope.groupId : undefined;
    const repo = this.getRepository()
    let account = await repo.findOne({
      where: {
        userId,
        groupId,
      }
    })
    if (!account) {
      account = repo.create({
        userId,
        groupId,
        balance: 0,
      })
      account = await repo.save(account)
    }
    return account
  }

  async addBalance(userId: number, amount: number, scope?: BaseScope) {
    const account = await this.getOrCreateAccount(userId, scope)
    account.balance = Number(account.balance) + amount
    return await this.getRepository().save(account)
  }

  async getBalancesByUserIds(userIds: number[], scope?: BaseScope) {
    if (userIds.length === 0) return new Map<number, number>()
    const groupId = scope?.type === BaseScopeType.GROUP ? scope.groupId : undefined
    const accounts = await this.getRepository().find({
      where: {
        userId: In(userIds),
        groupId,
      }
    })
    return new Map(accounts.map(account => [Number(account.userId), Number(account.balance)]))
  }

  async deductBalance(userId: number, amount: number, scope?: BaseScope) {
    const account = await this.getOrCreateAccount(userId, scope)
    if (Number(account.balance) < amount) {
      return { ok: false as const, account }
    }
    account.balance = Number(account.balance) - amount
    const saved = await this.getRepository().save(account)
    return { ok: true as const, account: saved }
  }

  async setBalance(userId: number, amount: number, scope?: BaseScope) {
    const account = await this.getOrCreateAccount(userId, scope)
    account.balance = amount
    return await this.getRepository().save(account)
  }

  async applyBill(params: {
    userId: number
    change: number
    type: 'income' | 'expense'
    source: string
    description: string
    scope?: BaseScope
    merchantOrderId?: string
    merchantMeta?: Record<string, unknown>
    allowNegative?: boolean
    manager?: EntityManager
  }) {
    const groupId = params.scope?.type === BaseScopeType.GROUP ? params.scope.groupId : undefined
    const runner = async (manager: EntityManager) => {
      const accountRepo = manager.getRepository(VaultAccount)
      const billRepo = manager.getRepository(VaultBill)

      let account = await accountRepo.findOne({
        where: {
          userId: params.userId,
          groupId,
        }
      })
      if (!account) {
        account = accountRepo.create({
          userId: params.userId,
          groupId,
          balance: 0,
        })
        account = await accountRepo.save(account)
      }

      const nextBalance = Number(account.balance) + params.change
      if (params.type === 'expense' && nextBalance < 0 && !params.allowNegative) {
        return { ok: false as const, account }
      }

      account.balance = nextBalance
      const savedAccount = await accountRepo.save(account)

      const bill = billRepo.create({
        orderId: randomUUID(),
        userId: params.userId,
        groupId,
        change: params.change,
        type: params.type,
        source: params.source,
        description: params.description,
        merchantOrderId: params.merchantOrderId ?? null,
        merchantMeta: params.merchantMeta ?? null,
      })
      const savedBill = await billRepo.save(bill)

      return {
        ok: true as const,
        account: savedAccount,
        bill: savedBill,
      }
    }

    if (params.manager) {
      return await runner(params.manager)
    }

    return await getDataSource().transaction(async manager => {
      return await runner(manager)
    })
  }

  async listBills(params: {
    userId: number
    scope?: BaseScope
    limit?: number
  }) {
    const groupId = params.scope?.type === BaseScopeType.GROUP ? params.scope.groupId : undefined
    const repo = this.getBillRepository()
    return await repo.find({
      where: {
        userId: params.userId,
        groupId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: params.limit ?? 10,
    })
  }

  formatBillsForPrint(bills: VaultBill[]) {
    if (bills.length === 0) {
      return ['暂无流水']
    }
    return bills.map((bill, index) => {
      const time = dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm:ss')
      const sign = bill.type === 'income' ? '+' : '-'
      return `${index + 1}. ${time} ${sign}${Math.abs(Number(bill.change))} ${bill.description}`
    })
  }

  logBills(bills: VaultBill[]) {
    const lines = this.formatBillsForPrint(bills)
    for (const line of lines) {
      this.logger.info(line)
    }
  }
}

