import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity({
  name: 'stand_inventory'
})
@Index(['userId', 'groupId', 'itemId'], { unique: true })
export default class StandInventory {
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
    type: 'varchar'
  })
  itemId: string

  @Column({
    type: 'integer',
    default: 0
  })
  quantity: number

  @CreateDateColumn({
    type: 'timestamp'
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp'
  })
  updatedAt: Date
}
