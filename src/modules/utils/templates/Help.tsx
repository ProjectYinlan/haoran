import { Tag } from '../../../core/components/Tag.js'
import { CodeBlock } from '../../../core/components/CodeBlock.js'

export type HelpCommandItem = {
  name: string
  description?: string
  usage?: string
  examples?: string[]
}

export type HelpData = {
  title: string
  scope: 'modules' | 'module' | 'command'
  moduleName?: string
  commandName?: string
  modules?: string[]
  commands?: HelpCommandItem[]
  description?: string
  usage?: string
  examples?: string[]
  footer?: string
}

const SectionTitle = ({ children }: { children: string }) => (
  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
    {children}
  </div>
)

export const Help = ({
  title,
  scope,
  moduleName,
  commandName,
  modules = [],
  commands = [],
  description,
  usage,
  examples = [],
  footer,
}: HelpData) => {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-base font-semibold">{title}</span>
          {moduleName ? (
            <span className="text-xs text-slate-500">模块: {moduleName}</span>
          ) : null}
        </div>
        <Tag color="secondary" theme="solid-light">{scope}</Tag>
      </div>

      {scope === 'modules' ? (
        <div className="flex flex-col gap-2">
          <SectionTitle>模块列表</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {modules.length > 0 ? modules.map((name) => (
              <Tag key={name} color="primary" theme="outline-light">{name}</Tag>
            )) : (
              <span className="text-xs text-slate-400">暂无模块</span>
            )}
          </div>
        </div>
      ) : null}

      {scope === 'command' ? (
        <div className="flex flex-col gap-2">
          <SectionTitle>指令详情</SectionTitle>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
            <div className="grid grid-cols-2 items-center gap-2 justify-between">
              <span className="text-sm font-semibold col-span-1 overflow-wrap-anywhere break-words">{commandName}</span>
              <span className="text-xs text-slate-500 col-span-1 flex justify-end overflow-wrap-anywhere break-words">{description || '无描述'}</span>
            </div>
            <div className="grid grid-cols-12 gap-2 text-xs">
              <span className="text-slate-500 whitespace-nowrap col-span-1">用法</span>
              <CodeBlock color='primary' block className="col-span-11">{usage || '未提供'}</CodeBlock>
              {examples.length > 0 && (
                <>
                  <span className="text-slate-500 whitespace-nowrap col-span-1">示例</span>
                  <div className="flex flex-wrap gap-1 col-span-11">
                    {examples.map((item, index) => (
                      <CodeBlock color="secondary" block key={`${commandName}-${index}`}>{item}</CodeBlock>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {scope === 'module' ? (
        <div className="flex flex-col gap-2">
          <SectionTitle>指令列表</SectionTitle>
          {commands.length > 0 ? (
            <div className="flex flex-col gap-2">
              {commands.map((command) => (
                <div
                  key={command.name}
                  className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
                >
                  <div className="grid grid-cols-2 items-center gap-2 justify-between">
                    <span className="text-sm font-semibold col-span-1 overflow-wrap-anywhere break-words">{command.name}</span>
                    <span className="text-xs text-slate-500 col-span-1 flex justify-end overflow-wrap-anywhere break-words">{command.description || '无描述'}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 text-xs">
                    <span className="text-slate-500 whitespace-nowrap col-span-1">用法</span>
                    <CodeBlock color='primary' block className="col-span-11">{command.usage || '未提供'}</CodeBlock>
                    {command.examples && command.examples.length > 0 && <>
                      <span className="text-slate-500 whitespace-nowrap col-span-1">示例</span>
                      <div className="flex flex-wrap gap-1 col-span-11">
                        {(
                          command.examples.map((item, index) => (
                            <CodeBlock color="secondary" block key={`${command.name}-${index}`}>{item}</CodeBlock>
                          ))
                        )}
                      </div>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400">暂无指令</span>
          )}
        </div>
      ) : null}

      {footer ? (
        <div className="text-xs text-slate-400">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export const preview = {
  title: 'Help',
  component: Help,
  defaultData: {
    title: '指令帮助',
    scope: 'module',
    moduleName: 'utils',
    commands: [
      {
        name: 'help',
        description: '查看指令帮助',
        usage: '.help <module|command>',
        examples: ['.help utils', '.help ping'],
      },
      {
        name: 'ping',
        description: '测试机器人是否在线',
        usage: '.ping ping ping pingpingping ping pingpingping ping pingpingping ping',
        examples: ['.ping ping ping pingpingping ping pingpingping ping pingpingping ping'],
      },
    ],
    footer: '提示: 使用 .help <command> 查看单个指令详情',
  } satisfies HelpData,
  size: {
    width: 420,
    height: 'auto',
    minHeight: 160,
  },
}

