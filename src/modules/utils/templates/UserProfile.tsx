import { Tag } from "../../../core/components/Tag"

export type UserProfileProps = {
  qq: number
  nickname: string
  permissionTag?: string
  permissionTagColor?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
}

export const UserProfile = ({ qq, nickname, permissionTag, permissionTagColor = 'secondary' }: UserProfileProps) => {
  const avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${qq}&s=640`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        <img style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)' }} src={avatarUrl} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{nickname}</span>
            {permissionTag ? (
              <Tag color={permissionTagColor} theme='solid-light'>#{permissionTag}</Tag>
            ) : null}
          </div>
          <Tag color='secondary'>{qq}</Tag>
        </div >
      </div>

      {/* <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Tag color='primary' theme='solid-light'>{qq}</Tag>
          <Tag color='secondary' theme='solid-light'>{qq}</Tag>
          <Tag color='tertiary' theme='solid-light'>{qq}</Tag>
          <Tag color='success' theme='solid-light'>{qq}</Tag>
          <Tag color='danger' theme='solid-light'>{qq}</Tag>
          <Tag color='warning' theme='solid-light'>{qq}</Tag>
          <Tag color='info' theme='solid-light'>{qq}</Tag>
          <Tag color='light' theme='solid-light'>{qq}</Tag>
          <Tag color='dark' theme='solid-light'>{qq}</Tag>

          <Tag color='primary' theme='solid-dark'>{qq}</Tag>
          <Tag color='secondary' theme='solid-dark'>{qq}</Tag>
          <Tag color='tertiary' theme='solid-dark'>{qq}</Tag>
          <Tag color='success' theme='solid-dark'>{qq}</Tag>
          <Tag color='danger' theme='solid-dark'>{qq}</Tag>
          <Tag color='warning' theme='solid-dark'>{qq}</Tag>
          <Tag color='info' theme='solid-dark'>{qq}</Tag>
          <Tag color='light' theme='solid-dark'>{qq}</Tag>
          <Tag color='dark' theme='solid-dark'>{qq}</Tag>
        </div>



        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Tag color='primary' theme='outline-light'>{qq}</Tag>
          <Tag color='secondary' theme='outline-light'>{qq}</Tag>
          <Tag color='tertiary' theme='outline-light'>{qq}</Tag>
          <Tag color='success' theme='outline-light'>{qq}</Tag>
          <Tag color='danger' theme='outline-light'>{qq}</Tag>
          <Tag color='warning' theme='outline-light'>{qq}</Tag>
          <Tag color='info' theme='outline-light'>{qq}</Tag>
          <Tag color='light' theme='outline-light'>{qq}</Tag>
          <Tag color='dark' theme='outline-light'>{qq}</Tag>

          <Tag color='primary' theme='outline-dark'>{qq}</Tag>
          <Tag color='secondary' theme='outline-dark'>{qq}</Tag>
          <Tag color='tertiary' theme='outline-dark'>{qq}</Tag>
          <Tag color='success' theme='outline-dark'>{qq}</Tag>
          <Tag color='danger' theme='outline-dark'>{qq}</Tag>
          <Tag color='warning' theme='outline-dark'>{qq}</Tag>
          <Tag color='info' theme='outline-dark'>{qq}</Tag>
          <Tag color='light' theme='outline-dark'>{qq}</Tag>
          <Tag color='dark' theme='outline-dark'>{qq}</Tag>
        </div>
      </div> */}
    </div>
  )
}