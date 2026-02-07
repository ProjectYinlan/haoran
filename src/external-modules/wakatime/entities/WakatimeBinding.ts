import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity({
  name: 'wakatime_binding'
})
export default class WakatimeBinding {
  @PrimaryGeneratedColumn({
    type: 'bigint'
  })
  id: number

  @Column({
    type: 'bigint',
    unique: true
  })
  userId: number

  @Column({
    type: 'varchar',
    length: 255
  })
  apiKey: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  username?: string | null

  @Column({
    type: 'boolean',
    default: false
  })
  showProjects: boolean

  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date
}
