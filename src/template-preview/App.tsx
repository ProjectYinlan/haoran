import React, { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Frame } from '../core/templates/Frame.js'
import { templates } from './templateRegistry.js'

export const App = () => {
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '')
  const [sizeById, setSizeById] = useState<Record<string, { width: number, height: number, autoWidth: boolean, autoHeight: boolean }>>(() => {
    const entries = templates.map(template => {
      const size = template.size
      const autoHeight = size?.height === 'auto'
      const width = size?.width ?? 320
      const height = autoHeight ? (size?.minHeight ?? 180) : (size?.height ?? 180)
      return [template.id, { width, height, autoWidth: false, autoHeight }]
    })
    return Object.fromEntries(entries)
  })
  const [jsonById, setJsonById] = useState<Record<string, string>>(() => {
    const entries = templates.map(template => {
      const defaultData = template.defaultData ?? {}
      return [template.id, JSON.stringify(defaultData, null, 2)]
    })
    return Object.fromEntries(entries)
  })
  const [appliedJsonById, setAppliedJsonById] = useState<Record<string, string>>(() => {
    const entries = templates.map(template => {
      const defaultData = template.defaultData ?? {}
      return [template.id, JSON.stringify(defaultData, null, 2)]
    })
    return Object.fromEntries(entries)
  })
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [hasValid, setHasValid] = useState(true)
  const [parsedData, setParsedData] = useState<Record<string, unknown>>({})
  const previewRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)
  const selectedTemplate = templates.find(template => template.id === selectedId) ?? templates[0]
  const jsonText = selectedTemplate ? (jsonById[selectedTemplate.id] ?? '') : ''
  const appliedJsonText = selectedTemplate ? (appliedJsonById[selectedTemplate.id] ?? '') : ''
  const previewSize = selectedTemplate?.size
  const currentSize = selectedTemplate ? sizeById[selectedTemplate.id] : undefined
  const width = currentSize?.width ?? previewSize?.width ?? 320
  const heightSetting = currentSize?.height ?? (previewSize?.height === 'auto' ? (previewSize?.minHeight ?? 180) : (previewSize?.height ?? 180))
  const minWidth = previewSize?.width ?? 160
  const minHeight = previewSize?.minHeight ?? 80
  const maxHeight = previewSize?.maxHeight
  const autoWidth = currentSize?.autoWidth ?? false
  const autoHeight = currentSize?.autoHeight ?? previewSize?.height === 'auto'
  const resolvedWidth = useMemo(() => {
    if (!autoWidth) {
      return width
    }
    if (measuredWidth === null) {
      return minWidth
    }
    return Math.max(measuredWidth, minWidth)
  }, [autoWidth, width, measuredWidth, minWidth])
  const resolvedHeight = useMemo(() => {
    if (!autoHeight) {
      return heightSetting
    }
    if (measuredHeight === null) {
      return minHeight
    }
    if (maxHeight) {
      return Math.min(Math.max(measuredHeight, minHeight), maxHeight)
    }
    return Math.max(measuredHeight, minHeight)
  }, [autoHeight, heightSetting, measuredHeight, minHeight, maxHeight])

  useEffect(() => {
    if (!selectedTemplate) {
      return
    }
    try {
      const data = JSON.parse(appliedJsonText) as Record<string, unknown>
      setJsonError(null)
      setHasValid(true)
      setParsedData(data)
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON 解析失败')
      setHasValid(false)
    }
  }, [appliedJsonText, selectedTemplate])

  useEffect(() => {
    if (!autoHeight && !autoWidth) {
      setMeasuredHeight(null)
      setMeasuredWidth(null)
      return
    }
    const el = previewRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      if (autoHeight) {
        setMeasuredHeight(Math.ceil(entry.contentRect.height))
      }
      if (autoWidth) {
        setMeasuredWidth(Math.ceil(entry.contentRect.width))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoHeight, autoWidth, selectedTemplate?.id, appliedJsonText])

  useEffect(() => {
    const el = editorContainerRef.current
    if (!el || !editorRef.current || typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => editorRef.current?.layout())
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [selectedTemplate?.id])

  const updateSize = (patch: Partial<{ width: number, height: number, autoWidth: boolean, autoHeight: boolean }>) => {
    if (!selectedTemplate) {
      return
    }
    setSizeById(prev => ({
      ...prev,
      [selectedTemplate.id]: {
        width: width,
        height: heightSetting as number,
        autoWidth,
        autoHeight,
        ...patch,
      },
    }))
  }

  const handleApply = () => {
    if (!selectedTemplate) {
      return
    }
    setAppliedJsonById(prev => ({
      ...prev,
      [selectedTemplate.id]: jsonText,
    }))
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 text-slate-800">
      <div className="mb-4 text-sm text-slate-500">
        编辑 JSON 后点击应用按钮刷新预览
      </div>
      {selectedTemplate ? (
        <div className="flex gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>预览尺寸: {resolvedWidth}px × {resolvedHeight}px{autoWidth || autoHeight ? ' (auto)' : ''}</span>
              <div className="flex items-center gap-1">
                <span>宽</span>
                <input
                  className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700"
                  type="number"
                  min={1}
                  value={resolvedWidth}
                  disabled={autoWidth}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (Number.isFinite(next) && next > 0) {
                      updateSize({ width: next })
                    }
                  }}
                />
              </div>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={autoWidth}
                  onChange={(event) => {
                    updateSize({ autoWidth: event.target.checked })
                  }}
                />
                <span>auto 宽</span>
              </label>
              <div className="flex items-center gap-1">
                <span>高</span>
                <input
                  className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700"
                  type="number"
                  min={1}
                  value={autoHeight ? (minHeight ?? 1) : resolvedHeight}
                  disabled={autoHeight}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    if (Number.isFinite(next) && next > 0) {
                      updateSize({ height: next })
                    }
                  }}
                />
              </div>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={autoHeight}
                  onChange={(event) => {
                    updateSize({ autoHeight: event.target.checked })
                  }}
                />
                <span>auto 高</span>
              </label>
            </div>
            <div
              className={['shadow-md bg-white', autoWidth ? 'self-start inline-block' : ''].join(' ')}
              style={{ width: autoWidth ? 'max-content' : resolvedWidth, height: resolvedHeight }}
            >
              <div ref={previewRef}>
                <Frame fit>
              <selectedTemplate.component {...(hasValid ? parsedData : {})} />
            </Frame>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
              <span>{hasValid ? 'JSON 已应用' : 'JSON 无效，预览保留上一次数据'}</span>
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.title}</option>
                ))}
              </select>
              <button
                className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                onClick={handleApply}
                type="button"
              >
                应用
              </button>
            </div>
            <div ref={editorContainerRef} className="overflow-hidden rounded border border-slate-200">
              <Editor
                height="360px"
                defaultLanguage="json"
                value={jsonText}
                onMount={(editor) => {
                  editorRef.current = editor
                  editor.layout()
                }}
                onChange={(value) => {
                  const nextValue = value ?? ''
                  if (!selectedTemplate) {
                    return
                  }
                  setJsonById(prev => ({
                    ...prev,
                    [selectedTemplate.id]: nextValue,
                  }))
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            {jsonError ? (
              <div className="mt-2 text-xs text-red-500">{jsonError}</div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">未发现可预览的模板</div>
      )}
    </div>
  )
}

