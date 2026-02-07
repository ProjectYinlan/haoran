export const standTexts = {
  succeed: {
    normal: [
      '卖铺成功！',
      '开张成功！',
    ],
    none: [
      '啧啧啧，好惨啊~',
      '赔钱货！',
    ],
  },
  many: [
    '小心β烂掉！',
    'Your β access timed out.',
    '该β目前无法处理此请求',
    'This β is currently unable to handle this request.',
    '您的β访问超时了！请稍后再试。',
    '心急吃不了热肠肠。',
  ],
  tooMany: [
    '？β烂了',
    '您已经杨威了。',
    '善意提示：强制使用可能造成不可逆转的损伤。',
  ],
} as const

export const standRankMeta = {
  count: {
    name: '站街人气榜',
    unit: '人次',
    title: ['最受欢迎β'],
  },
  make_score: {
    name: '站街赚钱榜',
    unit: '硬币',
    title: ['金β！'],
  },
  lose_score: {
    name: '站街赔钱榜',
    unit: '硬币',
    title: ['赔钱货！'],
  },
  good_boi: {
    name: '站街贞洁榜',
    unit: '次',
    title: ['贞洁永存'],
  },
  bad_boi: {
    name: '站街常客榜',
    unit: '次',
    title: ['可能是*牛'],
  },
} as const

export type StandRankType = keyof typeof standRankMeta

