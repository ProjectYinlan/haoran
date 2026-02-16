import React from 'react'
import classNames from 'classnames'
import { Info } from 'lucide-react'

export type TipProps = {
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  icon?: React.ReactNode
  className?: string
}

export const Tip = ({
  children,
  color = 'info',
  icon,
  className,
}: TipProps) => {
  const classMap: Record<
    NonNullable<TipProps['color']>,
    { text: string, bg: string, border: string, icon: string }
  > = {
    primary: {
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
    },
    secondary: {
      text: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: 'text-slate-600',
    },
    tertiary: {
      text: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
    },
    success: {
      text: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
    },
    danger: {
      text: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
    },
    warning: {
      text: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
    },
    info: {
      text: 'text-sky-700',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      icon: 'text-sky-600',
    },
    light: {
      text: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-500',
    },
    dark: {
      text: 'text-gray-900',
      bg: 'bg-gray-200',
      border: 'border-gray-300',
      icon: 'text-gray-700',
    },
  }

  const baseClass = classMap[color] || classMap.info
  const iconNode = icon
    ? (React.isValidElement(icon)
        ? React.cloneElement(icon, {
            className: classNames(icon.props.className, 'h-4 w-4', baseClass.icon),
          })
        : icon
      )
    : <Info className={classNames('h-4 w-4', baseClass.icon)} />

  const containerClassName = classNames(
    'flex w-full items-start gap-2 rounded-md border border-l-4 px-3 py-2 text-sm',
    baseClass.text,
    baseClass.bg,
    baseClass.border,
    className,
  )

  return (
    <div className={containerClassName}>
      <span className="mt-0.5 shrink-0">{iconNode}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
