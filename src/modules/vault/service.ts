import VaultAccount from './entities/VaultAccount.js'
import { getDataSource } from '../../core/database.js'
import { BaseScope, BaseScopeType } from '../../typings/Command.js'

export class VaultService {
  private static instance?: VaultService

  static getInstance() {
    VaultService.instance ??= new VaultService()
    return VaultService.instance
  }

  private getRepository() {
    return getDataSource().getRepository(VaultAccount)
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
}

