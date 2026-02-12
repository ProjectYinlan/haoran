import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export type ContextEventStatus = 'pending' | 'approved' | 'rejected' | 'ignored'
export type ContextEventType = 'friend_request' | 'group_invite'

@Entity({
  name: 'util_context_event'
})
export default class ContextEvent {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Column({
    type: 'text',
  })
  eventType: ContextEventType

  @Column({
    type: 'text',
    default: 'pending',
  })
  status: ContextEventStatus

  @Column({
    type: 'bigint'
  })
  requesterId: number

  @Column({
    type: 'bigint',
    nullable: true
  })
  groupId?: number

  @Column({
    type: 'text'
  })
  flag: string

  @Column({
    type: 'text',
    nullable: true
  })
  comment?: string

  @Column({
    type: 'bigint',
    nullable: true
  })
  notifyMessageId?: number

  @Column({
    type: 'bigint',
    nullable: true
  })
  operatorId?: number

  @Column({
    type: 'timestamp',
    nullable: true
  })
  handledAt?: Date

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date
}
