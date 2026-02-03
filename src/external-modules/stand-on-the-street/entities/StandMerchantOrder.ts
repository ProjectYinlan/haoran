import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity({
  name: 'stand_merchant_order'
})
export default class StandMerchantOrder {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Index({ unique: true })
  @Column({
    type: 'uuid'
  })
  orderId: string

  @Column({
    type: 'bigint',
    nullable: true
  })
  billId?: number | null

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
    type: 'bigint'
  })
  amount: number

  @Column({
    type: 'varchar'
  })
  sourceType: string

  @Column({
    type: 'varchar'
  })
  targetType: string

  @CreateDateColumn({
    type: 'timestamp'
  })
  createdAt: Date
}

