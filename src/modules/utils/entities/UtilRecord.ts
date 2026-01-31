import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity({
  name: 'util_record'
})
export default class UtilRecord {
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
  groupId?: number

  @Column({
    type: 'text',
  })
  commandName: string

  @CreateDateColumn({
    type: 'timestamp',
  })
  usedAt: Date
} 