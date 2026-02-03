import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity({
  name: 'vault_account'
})
export default class VaultAccount {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Column({
    type: 'bigint'
  })
  userId: number

  @Column({
    type: 'bigint',
    nullable: true
  })
  groupId?: number | null

  @Column({
    type: 'bigint',
    default: 0
  })
  balance: number

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date
}

