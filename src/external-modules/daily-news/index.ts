import { BaseCommand, Module, ModuleDescription, ModuleVersion, NoPrefixCommand, Alias, Message } from "../../core/decorators.js"
import { Structs } from "node-napcat-ts"
import { EnhancedMessage } from "../../typings/Message.js"
import { renderTemplate } from "../../core/playwright.js"
import { createExternalModuleLogger } from "../../logger.js"
import { DailyNews, type DailyNewsData } from "./templates/DailyNews.js"
import dayjs from "dayjs"

// const HUSBANDS_URL = "https://blog.suchenawa.com/SuricPlugins/husbands.json"
// const HUSBAND_IMAGE_BASE = "https://blog.suchenawa.com/SuricPlugins/husband/"

const EVALUATE_TEMPLATES_0 = [
  "哪来的兽人，怎么会这么长！",
  "哇哦！天生巨根！",
  "FK ME,pls!",
  "顶，，顶到胃了！",
  "是打了激素嘛！",
]

const EVALUATE_TEMPLATES_1 = ["还是蛮长的", "还不错欸"]
const EVALUATE_TEMPLATES_2 = ["到了平均水准捏"]
const EVALUATE_TEMPLATES_3 = ["好短！"]
const EVALUATE_TEMPLATES_4 = ["看来你不擅长应对女人", "原来男性也能是飞机场", "像是被嘬掉了一样！"]
const EVALUATE_TEMPLATES_5 = [
  "看来你的种族是龙，牛至他缩进去缝缝里去了欸！",
  "牛至！牛至他缩进去了欸！",
  "我焯！黑洞0！",
  "您就是李军？",
  "你的逼逼，会出水欸！",
  "逼逼，🐏鼠了！",
]

const COMMENT_TEMPLATES_0 = ["很棒的牛子，下次还吃", "这根太大了，有点受不了"]
const COMMENT_TEMPLATES_1 = ["这个大小不错的"]
const COMMENT_TEMPLATES_2 = ["默认评价：很棒的牛子，下次还吃"]
const COMMENT_TEMPLATES_3 = ["默认评价：很棒的牛子，下次还吃"]
const COMMENT_TEMPLATES_4 = ["牛子? 什么牛子，我怎么没看到", "牛牛，牛牛他离家出走辣！"]
const COMMENT_TEMPLATES_5 = ["这个腔不错的", "好，，，好腔！", "不错的龙缝！"]
const BFDZDP_TEMPLATES = ["在电影院做的很开心"]
const BFPJ_TEMPLATES = ["你好，白峰", "你想吃一份巨无霸套餐和一份大热狗套餐吗"]

const ENCHANT_LIST = [
  "附魔上了消失诅咒",
  "附魔上了经*修补",
  "附魔上了火焰附加",
  "附魔上了耐久",
  "附魔上了荆棘",
  "附魔上了力量",
]
const ENCHANT_LEVELS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"]

const PRIVILEGED_LARGE = 1306542338
const PRIVILEGED_SMALL = 2970290021

// type HusbandPayload = {
//   urlpath?: string[]
//   picNum?: number
// }

const hashStringToSeed = (value: string) => {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => {
  let t = seed
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const randomIntInclusive = (rng: () => number, min: number, max: number) => {
  if (max <= min) return min
  return Math.floor(rng() * (max - min + 1)) + min
}

const randomChoice = <T,>(rng: () => number, items: readonly T[]) => {
  if (items.length === 0) return null
  return items[Math.floor(rng() * items.length)]
}

@Module("daily-news")
@ModuleDescription("每日随机牛子")
@ModuleVersion("2.3.4")
export default class DailyNewsModule extends BaseCommand {
  private logger = createExternalModuleLogger(this.moduleName)
  // private husbandList: string[] = []
  // private husbandPicNum?: number

  initialize() {
    // HUSBAND 相关逻辑暂时关闭
    // void this.refreshHusbands()
  }

  /*
  @Cron("0 * * * *")
  async refreshSchedule() {
    await this.refreshHusbands()
  }

  private async refreshHusbands() {
    try {
      const response = await fetch(HUSBANDS_URL, { method: "GET" })
      if (!response.ok) {
        this.logger.warn(`husbands.json 获取失败: ${response.status}`)
        return
      }
      const data = (await response.json()) as HusbandPayload
      const nextList = Array.isArray(data.urlpath) ? data.urlpath.map(String).filter(Boolean) : []
      if (nextList.length > 0) {
        this.husbandList = nextList
      }
      if (typeof data.picNum === "number" && Number.isFinite(data.picNum)) {
        this.husbandPicNum = Math.max(0, Math.floor(data.picNum))
      }
      this.logger.debug(`资源文件更新成功: list=${this.husbandList.length} picNum=${this.husbandPicNum ?? 0}`)
    } catch (error) {
      this.logger.warn(`资源文件更新失败: ${error}`)
    }
  }

  private getHusbandImage(rng: () => number) {
    if (this.husbandList.length > 0) {
      const selected = randomChoice(rng, this.husbandList) ?? ""
      if (selected.startsWith("http://") || selected.startsWith("https://")) {
        return selected
      }
      if (/^\d+$/.test(selected)) {
        return `${HUSBAND_IMAGE_BASE}${selected}.png`
      }
      return `${HUSBAND_IMAGE_BASE}${selected}`
    }
    if (this.husbandPicNum && this.husbandPicNum > 0) {
      const idx = randomIntInclusive(rng, 1, this.husbandPicNum)
      return `${HUSBAND_IMAGE_BASE}${idx}.png`
    }
    return `${HUSBAND_IMAGE_BASE}1.png`
  }
  */

  private buildDailyData(userId: number): DailyNewsData {
    const seed = hashStringToSeed(`${dayjs().format("YYYYMMDD")}${userId}`)
    const rng = mulberry32(seed)

    let newsLength = 0
    if (userId === PRIVILEGED_LARGE) {
      newsLength = randomIntInclusive(rng, 18, 30)
    } else if (userId === PRIVILEGED_SMALL) {
      newsLength = randomIntInclusive(rng, -30, 0)
    } else {
      newsLength = randomIntInclusive(rng, -10, 30)
    }

    let newsType = "如履平地"
    let bokiStatus = "未知"
    let phimosisStatus = "未知"
    let eggWeight: number | null = null
    let angle: number | null = null
    let systemComment = ""
    let publicComment = ""
    let newsScore = 0

    if (newsLength > 0) {
      newsType = "牛子"
      const isBoki = randomIntInclusive(rng, 0, 1) === 1
      bokiStatus = isBoki ? "勃起" : "软掉"
      angle = isBoki ? randomIntInclusive(rng, 90, 180) : randomIntInclusive(rng, 0, 90)

      const phimosis = randomIntInclusive(rng, 0, 2)
      phimosisStatus = phimosis === 0 ? "包茎" : phimosis === 1 ? "半包茎" : "非包茎"
      eggWeight = randomIntInclusive(rng, 50, 500)

      if (newsLength > 20) {
        systemComment = randomChoice(rng, EVALUATE_TEMPLATES_0) ?? ""
        publicComment = randomChoice(rng, COMMENT_TEMPLATES_0) ?? ""
        newsScore = randomIntInclusive(rng, 60, 100)
      } else if (newsLength > 15) {
        systemComment = randomChoice(rng, EVALUATE_TEMPLATES_1) ?? ""
        publicComment = randomChoice(rng, COMMENT_TEMPLATES_1) ?? ""
        newsScore = randomIntInclusive(rng, 40, 80)
      } else if (newsLength > 6) {
        systemComment = randomChoice(rng, EVALUATE_TEMPLATES_2) ?? ""
        publicComment = randomChoice(rng, COMMENT_TEMPLATES_2) ?? ""
        newsScore = randomIntInclusive(rng, 30, 60)
      } else if (newsLength >= 3) {
        systemComment = randomChoice(rng, BFPJ_TEMPLATES) ?? ""
        publicComment = randomChoice(rng, BFDZDP_TEMPLATES) ?? ""
        newsScore = randomIntInclusive(rng, 20, 30)
      } else {
        systemComment = randomChoice(rng, EVALUATE_TEMPLATES_3) ?? ""
        publicComment = randomChoice(rng, COMMENT_TEMPLATES_3) ?? ""
        newsScore = randomIntInclusive(rng, 0, 20)
      }
    } else if (newsLength < 0) {
      newsType = "泄殖腔"
      systemComment = randomChoice(rng, EVALUATE_TEMPLATES_5) ?? ""
      publicComment = randomChoice(rng, COMMENT_TEMPLATES_5) ?? ""
      newsScore = randomIntInclusive(rng, 0, 100)
    } else {
      newsType = "如履平地"
      systemComment = randomChoice(rng, EVALUATE_TEMPLATES_4) ?? ""
      publicComment = randomChoice(rng, COMMENT_TEMPLATES_4) ?? ""
      newsScore = 0
    }

    let enchant = "None"
    if (randomIntInclusive(rng, 0, 4) === 0) {
      const enchantIndex = randomIntInclusive(rng, 0, ENCHANT_LIST.length - 1)
      const baseEnchant = ENCHANT_LIST[enchantIndex] ?? ""
      let finalEnchant = baseEnchant
      if (enchantIndex < 2) {
        finalEnchant = baseEnchant
      } else if (enchantIndex === 2) {
        finalEnchant = `${baseEnchant}${ENCHANT_LEVELS[randomIntInclusive(rng, 0, 1)]}`
      } else if (enchantIndex < 5) {
        finalEnchant = `${baseEnchant}${ENCHANT_LEVELS[randomIntInclusive(rng, 0, 2)]}`
      } else {
        finalEnchant = `${baseEnchant}${ENCHANT_LEVELS[randomIntInclusive(rng, 0, 4)]}`
      }
      enchant = `${finalEnchant}的`
    }

    const cr = randomIntInclusive(rng, 0, 255)
    const cg = randomIntInclusive(rng, 0, 255)
    const cb = randomIntInclusive(rng, 0, 255)
    const textColor = cr + cg + cb > 382 ? "rgb(0,0,0)" : "rgb(255,255,255)"
    const hexColor = `#${[cr, cg, cb].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`

    // const imageUrl = this.getHusbandImage(rng)
    const imageUrl = ""

    return {
      score: Number((newsScore / 10).toFixed(1)),
      newsType,
      length: newsLength,
      colorHex: hexColor,
      textColor,
      enchant,
      statusText: `${bokiStatus}/${phimosisStatus}`,
      angleText: angle === null ? "未知" : String(angle),
      eggWeightText: eggWeight === null ? "未知" : String(eggWeight),
      publicComment,
      systemComment,
      imageUrl,
    }
  }

  @NoPrefixCommand("今日牛子", "生成每日牛子图")
  @Alias(["随机牛子", "我几把呢"])
  async handleDailyNews(@Message() message: EnhancedMessage) {
    try {
      const data = this.buildDailyData(message.sender.user_id)
      const image = await renderTemplate(DailyNews(data), { width: 420, height: 'auto', minHeight: 560, frameClassName: '!bg-slate-50' })
      await message.reply([Structs.image(image)])
    } catch (error) {
      this.logger.warn(`生成牛子图片失败: ${error}`)
      await message.reply([Structs.text("生成失败，请稍后再试")])
    }
  }

  @NoPrefixCommand("你几把呢", "查询特殊回复")
  @Alias(["Null几把呢"])
  async handleNull(@Message() message: EnhancedMessage) {
    await message.reply([Structs.text("你几把消失了")])
  }

  @NoPrefixCommand("我想拥有bb", "开发中")
  @Alias(["我想拥有逼逼"])
  async handleBB(@Message() message: EnhancedMessage) {
    await message.reply([Structs.text("你先别急，我还没写")])
  }
}
