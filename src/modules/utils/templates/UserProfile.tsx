import { Tag } from "../../../core/components/Tag.js"

export type UserProfileData = {
  qq: number
  nickname: string
  permissionTag?: string
  permissionTagColor?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
}

export const UserProfile = ({
  qq,
  nickname,
  permissionTag,
  permissionTagColor = 'secondary',
}: UserProfileData) => {
  const finalQq = qq
  const finalNickname = nickname
  const finalPermissionTag = permissionTag
  const finalPermissionTagColor = permissionTagColor

  const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${finalQq}&s=640`
  return (
    <div className="flex h-full w-full flex-col gap-2.5">
      <div className="flex w-full items-center gap-2.5">
        <img
          className="w-16 h-16 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] object-cover"
          src={avatarUrl}
        />
        <div className="flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold">{finalNickname}</span>
            {finalPermissionTag ? (
              <Tag color={finalPermissionTagColor} theme='solid-light'>#{finalPermissionTag}</Tag>
            ) : null}
          </div>
          <Tag color='secondary'>{finalQq}</Tag>
        </div >
      </div>
    </div>
  )
}

export const preview = {
  title: 'UserProfile',
  component: UserProfile,
  defaultData: {
    qq: 10000,
    nickname: 'QQ',
    permissionTag: 'OWNER',
    permissionTagColor: 'primary',
  } satisfies UserProfileData,
}