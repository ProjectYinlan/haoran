import { BaseCommand, Command, Module, Permission, Message, Args } from '../../core/decorators.js'
import { Structs } from 'node-napcat-ts'
import { EnhancedMessage } from '../../typings/Message.js'
import UtilRecord from './entities/UtilRecord.js'
import { getDataSource } from '../../core/database.js'
import dayjs from 'dayjs'
import satori from 'satori'
import { UserProfile } from './templates/UserProfile.js'
import fs from 'fs/promises'
import path from 'path'
import { renderTemplate } from '../../core/satori.js'

const utilRecordRepository = getDataSource().getRepository(UtilRecord)

@Module('utils')
export default class ExampleModule extends BaseCommand {
  initialize() {
  }

  @Command('ping', '测试机器人是否在线')
  @Permission('utils.ping')
  async handlePing(
    @Message() message: EnhancedMessage,
  ) {
    await utilRecordRepository.save({
      userId: message.sender.user_id,
      groupId: message.sub_type == 'group' ? message.real_id : undefined,
      commandName: 'ping',
      usedAt: new Date()
    })

    await message.reply([
      Structs.text('pong!')
    ])
  }

  @Command('last-ping', '查看最近一次 ping 的时间')
  @Permission('utils.last-ping')
  async handleLastPing(
    @Message() message: EnhancedMessage,
  ) {
    const lastPing = await utilRecordRepository.findOne({
      where: {
        commandName: 'ping'
      },
      order: {
        usedAt: 'DESC'
      }
    })

    await message.reply([
      Structs.text(lastPing ? `最后一次 ping 在 ${dayjs(lastPing.usedAt).format('YYYY-MM-DD HH:mm:ss')}` : '还没有 ping 过')
    ])
  }

  @Command('whoami', '查看当前用户信息')
  @Permission('utils.whoami')
  async handleWhoami(
    @Message() message: EnhancedMessage,
  ) {
    const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${message.sender.user_id}&s=640`

    await message.reply([
      Structs.image(await renderTemplate(UserProfile({ qq: message.sender.user_id, nickname: message.sender.nickname, avatarUrl })))
    ])
  }
} 