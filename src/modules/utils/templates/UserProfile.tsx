export type UserProfileProps = {
  qq: number
  nickname: string
  avatarUrl: string
}

export const UserProfile = ({ qq, nickname, avatarUrl }: UserProfileProps) => {
  return (
    <div className="flex justify-center gap-2">
      <img className="w-[64px] h-[64px] rounded-full" src={avatarUrl} />
      <div className="flex flex-col gap-1">
        <span className="text-lg text-bold">{nickname}</span>
        <span>{qq}</span>
      </div>
    </div>
  )
}