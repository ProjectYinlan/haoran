import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity({
  name: 'wakatime_group_rank'
})
export default class WakatimeGroupRank {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Column({
    type: 'bigint',
    unique: true
  })
  groupId: number

  @Column({
    type: 'boolean',
    default: false
  })
  enabled: boolean

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date
}
