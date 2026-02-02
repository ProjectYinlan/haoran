import React, { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Frame } from '../core/templates/Frame.js'
import { templates } from './templateRegistry.js'

export const App = () => {
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '')
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
  const selectedTemplate = templates.find(template => template.id === selectedId) ?? templates[0]
  const jsonText = selectedTemplate ? (jsonById[selectedTemplate.id] ?? '') : ''
  const appliedJsonText = selectedTemplate ? (appliedJsonById[selectedTemplate.id] ?? '') : ''

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
          <div className="w-[320px] h-[180px] shadow-md bg-white">
            <Frame>
              <selectedTemplate.component {...(hasValid ? parsedData : {})} />
            </Frame>
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
            <div className="overflow-hidden rounded border border-slate-200">
              <Editor
                height="360px"
                defaultLanguage="json"
                value={jsonText}
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

