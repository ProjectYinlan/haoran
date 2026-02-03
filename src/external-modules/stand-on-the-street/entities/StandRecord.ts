import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity({
  name: 'stand_record'
})
@Index(['userId', 'groupId'], { unique: true })
export default class StandRecord {
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
    type: 'bigint',
    default: 0
  })
  score: number

  @Column({
    type: 'integer',
    default: 0
  })
  countFriends: number

  @Column({
    type: 'integer',
    default: 0
  })
  countOthers: number

  @Column({
    type: 'jsonb',
    default: () => "'[]'"
  })
  into: Array<Record<string, any>>

  @Column({
    type: 'jsonb',
    default: () => "'[]'"
  })
  out: Array<Record<string, any>>

  @Column({
    type: 'bigint',
    default: 0
  })
  statsInto: number

  @Column({
    type: 'bigint',
    default: 0
  })
  statsOut: number

  @Column({
    type: 'timestamp',
    nullable: true
  })
  nextTime?: Date | null

  @Column({
    type: 'boolean',
    default: false
  })
  force: boolean

  @Column({
    type: 'boolean',
    nullable: true
  })
  notify?: boolean | null

  @CreateDateColumn({
    type: 'timestamp'
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp'
  })
  updatedAt: Date
}

