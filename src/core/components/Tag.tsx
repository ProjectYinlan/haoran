import React from 'react'

type TagProps = {
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  theme?: 'solid-dark' | 'solid-light' | 'outline-dark' | 'outline-light'
}

export const Tag = ({ children, color = 'primary', theme = 'solid-light' }: TagProps) => {
  const palette: Record<string, string> = {
    primary: '#0064fa',
    secondary: '#86909c',
    tertiary: '#6e32c2',
    success: '#00b42a',
    danger: '#f53f3f',
    warning: '#ff9a2e',
    info: '#168cff',
    light: '#f2f3f5',
    dark: '#1d2129',
  }

  const baseColor = palette[color] || palette.primary
  const isSolid = theme.startsWith('solid')
  const isDark = theme.endsWith('dark')

  let backgroundColor = 'transparent'
  let textColor = baseColor
  let borderColor = 'transparent'

  if (isSolid) {
    if (isDark) {
      // solid-dark: 深色背景，白色文字
      backgroundColor = baseColor
      textColor = (color === 'light' || color === 'warning') ? '#1d2129' : '#fff'
      // 针对 dark 的特别处理，避免背景过黑
      if (color === 'dark') {
        backgroundColor = '#2f3542'
      }
    } else {
      // solid-light: 浅色背景，彩色文字
      backgroundColor = `${baseColor}1a` // 10% opacity
      textColor = baseColor
      // 特殊处理 light 和 dark
      if (color === 'light') {
        backgroundColor = '#f2f3f5'
        textColor = '#4e5969'
      }
      if (color === 'dark') {
        backgroundColor = '#e5e6eb'
        textColor = '#1d2129'
      }
    }
  } else {
    // outline 模式
    textColor = baseColor
    borderColor = isDark ? baseColor : `${baseColor}4d` // 100% or 30% opacity

    // 特殊处理 light，使其在白底下可见
    if (color === 'light') {
      textColor = '#4e5969'
      borderColor = isDark ? '#c9cdd4' : '#e5e6eb'
    }
  }

  const style: React.CSSProperties = {
    padding: '2px 4px',
    borderRadius: '4px',
    fontFamily: 'JetBrains Mono, HarmonyOS Sans SC, sans-serif',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    backgroundColor,
    color: textColor,
    border: `1px solid ${borderColor}`,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={style}>{children}</span>
    </div>
  )
}
