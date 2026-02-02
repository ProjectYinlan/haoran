/// <reference types="vite/client" />
import type { ComponentType } from 'react'

export type TemplatePreview = {
  id: string
  title: string
  component: ComponentType<Record<string, unknown>>
  defaultData?: unknown
}

type PreviewExport = {
  preview?: {
    title?: string
    component?: ComponentType<Record<string, unknown>>
    defaultData?: unknown
  }
  default?: ComponentType<Record<string, unknown>>
  [key: string]: unknown
}

const moduleTemplates = import.meta.glob('../modules/**/templates/*.tsx', { eager: true })
const externalTemplates = import.meta.glob('../external-modules/**/templates/*.tsx', { eager: true })

const getFallbackComponent = (exports: PreviewExport): ComponentType<Record<string, unknown>> | null => {
  if (exports.default && typeof exports.default === 'function') {
    return exports.default
  }
  for (const value of Object.values(exports)) {
    if (typeof value === 'function') {
      return value as ComponentType<Record<string, unknown>>
    }
  }
  return null
}

const getTitleFromPath = (filePath: string) => {
  const parts = filePath.split('/')
  const file = parts[parts.length - 1] || ''
  return file.replace(/\.tsx$/, '')
}

const templateEntries = Object.entries({
  ...moduleTemplates,
  ...externalTemplates,
})

export const templates: TemplatePreview[] = templateEntries.reduce<TemplatePreview[]>((acc, [filePath, rawExports]) => {
  const exports = rawExports as PreviewExport
  const preview = exports.preview
  const component = preview?.component ?? getFallbackComponent(exports)
  if (!component) {
    return acc
  }

  acc.push({
    id: filePath,
    title: preview?.title ?? getTitleFromPath(filePath),
    component,
    defaultData: preview?.defaultData,
  })

  return acc
}, [])

