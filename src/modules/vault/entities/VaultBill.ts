import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity({
  name: 'vault_bill'
})
export default class VaultBill {
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
  change: number

  @Column({
    type: 'varchar'
  })
  type: 'income' | 'expense'

  @Column({
    type: 'varchar'
  })
  source: string

  @Column({
    type: 'varchar'
  })
  description: string

  @Column({
    type: 'uuid',
    nullable: true
  })
  merchantOrderId?: string | null

  @Column({
    type: 'jsonb',
    nullable: true
  })
  merchantMeta?: Record<string, unknown> | null

  @CreateDateColumn({
    type: 'timestamp'
  })
  createdAt: Date
}

