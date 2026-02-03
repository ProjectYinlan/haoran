import React from 'react'
import { Tag } from './Tag.js'

type CodeBlockProps = {
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'
  block?: boolean
  className?: string
}

export const CodeBlock = ({
  children,
  color = 'secondary',
  block = false,
  className,
}: CodeBlockProps) => {

  if (block) {
    return (
      <Tag
        theme='outline-light'
        color={color}
        asChild
        fragmentClassName={className}
        className=""
      >
        <pre className="!whitespace-pre-wrap !break-words">{children}</pre>
      </Tag>
    )
  }

  return (
    <Tag theme='outline-light' color={color} fragmentClassName={className}>
      {children}
    </Tag>
  )
}
