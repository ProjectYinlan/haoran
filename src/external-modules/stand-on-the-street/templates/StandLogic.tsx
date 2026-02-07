export type StandLogicData = {
  content: string
}

const renderInlineCode = (text: string) => {
  const parts = text.split(/`([^`]+)`/g)
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <code key={`code-${index}`} className="bg-slate-100 px-1 rounded">{part}</code>
    }
    return part
  })
}

const renderMarkdownBlocks = (content: string) => {
  const lines = content.split(/\r?\n/)
  const nodes: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: Array<{ text: string; level: number }> = []

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    const items = listItems.map((item, index) => (
      <li
        key={`${listType}-${index}`}
        className="text-sm leading-6 text-slate-700"
        style={item.level > 0 ? { marginLeft: item.level * 12 } : undefined}
      >
        {renderInlineCode(item.text)}
      </li>
    ))
    nodes.push(
      listType === 'ul'
        ? <ul key={`ul-${nodes.length}`} className="list-disc list-outside pl-5">{items}</ul>
        : <ol key={`ol-${nodes.length}`} className="list-decimal list-outside pl-5">{items}</ol>
    )
    listType = null
    listItems = []
  }

  const flushCode = () => {
    if (!inCodeBlock) return
    const code = codeLines.join('\n')
    nodes.push(
      <pre key={`code-${nodes.length}`} className="bg-slate-100 px-1 rounded whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    )
    codeLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine ?? ''
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false
        flushCode()
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.trim() === '') {
      flushList()
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      const text = headingMatch[2] ?? ''
      if (level <= 1) {
        nodes.push(
          <h1 key={`h1-${nodes.length}`} className="text-xl font-bold mt-2 mb-1">
            {renderInlineCode(text)}
          </h1>
        )
      } else {
        nodes.push(
          <h2 key={`h2-${nodes.length}`} className="text-lg font-semibold mt-2 mb-1">
            {renderInlineCode(text)}
          </h2>
        )
      }
      continue
    }

    const ulMatch = line.match(/^(\s*)-\s+(.*)$/)
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      const indent = ulMatch[1] ?? ''
      const level = Math.floor(indent.replace(/\t/g, '  ').length / 2)
      listItems.push({ text: ulMatch[2] ?? '', level })
      continue
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (olMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      const indent = olMatch[1] ?? ''
      const level = Math.floor(indent.replace(/\t/g, '  ').length / 2)
      listItems.push({ text: olMatch[2] ?? '', level })
      continue
    }

    flushList()
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-sm leading-6 text-slate-700">
        {renderInlineCode(line)}
      </p>
    )
  }

  flushList()
  if (inCodeBlock) {
    flushCode()
  }

  return nodes
}

export const StandLogic = ({ content }: StandLogicData) => {
  if (!content) return null;
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-2">站街逻辑说明</h1>
      {renderMarkdownBlocks(content)}
    </div>
  )
}

export const preview = {
  title: 'StandLogic',
  component: StandLogic,
  defaultData: {
    content: `# 基本限制
- 存在 \`冷却时间\`：未到下次时间且不是 \`强制站街\` 会直接提示 \`下次时间\`。
- 若已使用过 \`强制站街\`，在 \`下次时间\` 之前无法再次强制。

# 收入与手续费
- 会根据最近 \`5\` 次收入计算 \`平均收入\`。
- 会根据最近 \`5\` 次站街的 \`人均金额\` 计算权重：低于 \`100\` 时，按 \`差值 / 100 / 2\` 追加到 \`基础权重\`。
- 若余额高于 \`富豪阈值\`，会收取 \`富豪手续费\`（按 \`平均收入 * 富豪费率\` 计算）。
- \`强制站街\` 会收取 \`强制手续费\`（按 \`平均收入 * 强制费率\` 计算）。
- \`强制站街\` 有 \`30%\` 概率触发 \`杨威Buff\`，使 \`冷却时间\` 额外延长 \`强制加时小时数\`。
- 付款金额采用加权随机：存在 \`基础权重\` 与 \`高额支付权重\`。
- \`白嫖\` 每出现一次，\`高额支付权重\` 追加一次。

# 随机模式
- 先随机得到 \`总人数上限\`，再拆分为 \`群友数\` 与 \`路人数\`。
- 候选 \`群友\` 需要满足：
  - 余额 \`> 0\`
  - 当天被榨次数 \`< 2\`
- 从候选中按权重抽取 \`群友\`：余额越多，权重越高，越容易被选中。
- \`群友\` 每人得分为 \`0~5 * 50\`。
- \`路人\` 每人次独立计算得分：\`0~4 * 50\`。

# 点名模式
- 一次只能 \`点名 1 人\`，否则会提示。
- 目标必须满足：
  - 对方已站过街
  - 余额 \`> 0\`
  - 当天被榨次数 \`< 2\`
- 得分为 \`0~11 * 50\`。

`,
  } satisfies StandLogicData,
  size: { width: 400, height: 'auto' as const },
}

