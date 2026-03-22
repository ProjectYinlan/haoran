import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity({
  name: 'stand_plan'
})
@Index(['userId', 'groupId'], { unique: true })
export default class StandPlan {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Column({
    type: 'bigint'
  })
  userId: number

  @Column({
    type: 'bigint'
  })
  groupId: number

  @Column({
    type: 'varchar',
    length: 16
  })
  tier: string

  @Column({
    type: 'integer',
    default: 0
  })
  dailyUsed: number

  @Column({
    type: 'integer',
    default: 0
  })
  weeklyUsed: number

  @Column({
    type: 'integer',
    default: 0
  })
  weeklyLimit: number

  @Column({
    type: 'bigint'
  })
  subscribedAt: number

  @Column({
    type: 'bigint'
  })
  expiresAt: number

  @Column({
    type: 'bigint',
    default: 0
  })
  lastDailyReset: number

  @Column({
    type: 'bigint',
    nullable: true
  })
  bannedUntil: number | null

  @CreateDateColumn({
    type: 'timestamp'
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp'
  })
  updatedAt: Date
}
