/**
 * 获取 QQ 头像 URL
 * @param qq QQ 号码
 * @param size 头像尺寸 (40, 100, 140, 640)
 */
export const getQQAvatarUrl = (qq: number | string, size: 40 | 100 | 140 | 640 = 100): string => {
  return `http://q1.qlogo.cn/g?b=qq&nk=${qq}&s=${size}`
}
