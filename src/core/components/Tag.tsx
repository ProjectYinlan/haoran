import React from 'react'
import classNames from 'classnames'

type TagProps = {
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  theme?: 'solid-dark' | 'solid-light' | 'outline-dark' | 'outline-light'
  asChild?: boolean
  className?: string
  fragmentClassName?: string
}

export const Tag = ({
  children,
  color = 'primary',
  theme = 'solid-light',
  asChild = false,
  className: propsClassName,
  fragmentClassName
}: TagProps) => {
  const classMap: Record<
    NonNullable<TagProps['color']>,
    { text: string, bgSolid: string, bgLight: string, border: string, borderLight: string }
  > = {
    primary: {
      text: 'text-blue-600',
      bgSolid: 'bg-blue-600',
      bgLight: 'bg-blue-100',
      border: 'border-blue-600',
      borderLight: 'border-blue-300',
    },
    secondary: {
      text: 'text-slate-600',
      bgSolid: 'bg-slate-600',
      bgLight: 'bg-slate-100',
      border: 'border-slate-600',
      borderLight: 'border-slate-300',
    },
    tertiary: {
      text: 'text-purple-600',
      bgSolid: 'bg-purple-600',
      bgLight: 'bg-purple-100',
      border: 'border-purple-600',
      borderLight: 'border-purple-300',
    },
    success: {
      text: 'text-green-600',
      bgSolid: 'bg-green-600',
      bgLight: 'bg-green-100',
      border: 'border-green-600',
      borderLight: 'border-green-300',
    },
    danger: {
      text: 'text-red-600',
      bgSolid: 'bg-red-600',
      bgLight: 'bg-red-100',
      border: 'border-red-600',
      borderLight: 'border-red-300',
    },
    warning: {
      text: 'text-amber-600',
      bgSolid: 'bg-amber-500',
      bgLight: 'bg-amber-100',
      border: 'border-amber-500',
      borderLight: 'border-amber-300',
    },
    info: {
      text: 'text-sky-600',
      bgSolid: 'bg-sky-600',
      bgLight: 'bg-sky-100',
      border: 'border-sky-600',
      borderLight: 'border-sky-300',
    },
    light: {
      text: 'text-gray-600',
      bgSolid: 'bg-gray-100',
      bgLight: 'bg-gray-100',
      border: 'border-gray-300',
      borderLight: 'border-gray-200',
    },
    dark: {
      text: 'text-gray-900',
      bgSolid: 'bg-gray-800',
      bgLight: 'bg-gray-200',
      border: 'border-gray-800',
      borderLight: 'border-gray-400',
    },
  }
  const isSolid = theme.startsWith('solid')
  const isDark = theme.endsWith('dark')

  const baseClass = classMap[color] || classMap.primary
  let backgroundClass = 'bg-transparent'
  let textClass = baseClass.text
  let borderClass = 'border-transparent'

  if (isSolid) {
    if (isDark) {
      // solid-dark: 深色背景，白色文字
      backgroundClass = baseClass.bgSolid
      textClass = (color === 'light' || color === 'warning') ? 'text-gray-900' : 'text-white'
    } else {
      // solid-light: 浅色背景，彩色文字
      backgroundClass = baseClass.bgLight
      textClass = baseClass.text
    }
  } else {
    // outline 模式
    textClass = baseClass.text
    borderClass = isDark ? baseClass.border : baseClass.borderLight
  }

  const className = classNames([
    'inline-flex items-center justify-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium leading-none font-mixed-code border',
    backgroundClass,
    textClass,
    borderClass,
    propsClassName,
  ])

  return (
    <div className={classNames('flex items-center', fragmentClassName)}>
      {asChild && React.isValidElement(children)
        ? React.cloneElement(children, {
            className: classNames(children.props.className, className)
          })
        : <span className={className}>{children}</span>
      }
    </div>
  )
}
