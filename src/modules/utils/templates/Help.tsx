import { Tag } from '../../../core/components/Tag.js'
import { CodeBlock } from '../../../core/components/CodeBlock.js'
import classNames from 'classnames'

export type HelpCommandItem = {
  name: string
  description?: string
  usage?: string | string[]
  examples?: string[]
  matchers?: string[]
  aliases?: string[]
  isRegex?: boolean
  isSubCommand?: boolean
  parentCommand?: string
  subCommandPath?: string[]
}

export type HelpData = {
  title: string
  scope: 'modules' | 'module' | 'command'
  moduleName?: string
  moduleDescription?: string
  commandName?: string
  modules?: Array<{ name: string, description?: string }>
  commands?: HelpCommandItem[]
  description?: string
  usage?: string | string[]
  examples?: string[]
  matchers?: string[]
  aliases?: string[]
  footer?: string
  isRegex?: boolean
  isSubCommand?: boolean
  parentCommand?: string
  subCommandPath?: string[]
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
  moduleDescription,
  commandName,
  modules = [],
  commands = [],
  description,
  usage,
  examples = [],
  matchers = [],
  aliases = [],
  footer,
  isSubCommand,
  parentCommand,
  subCommandPath = [],
  isRegex,
}: HelpData) => {
  const displayCommandName = isRegex ? '复杂指令，请查看用法' : commandName
  const displayUsage = usage || '未提供'
  const renderUsageBlocks = (value: string | string[]) => {
    const items = Array.isArray(value) ? value : [value]
    const normalized = items.length > 0 ? items : ['未提供']
    return (
      <div className="col-span-11 flex flex-wrap gap-1">
        {normalized.map((item, index) => (
          <CodeBlock color="primary" key={`usage-${index}`}>{item}</CodeBlock>
        ))}
      </div>
    )
  }
  const renderAliasBlocks = (value: string[]) => {
    if (!value || value.length === 0) return null
    return (
      <div className="col-span-11 flex flex-wrap gap-1">
        {value.map((item, index) => (
          <CodeBlock color="secondary" key={`alias-${index}`}>{item}</CodeBlock>
        ))}
      </div>
    )
  }
  const renderCommandLabel = (command: HelpCommandItem) => {
    if (command.isRegex) return '复杂指令，请查看用法'
    if (command.isSubCommand && command.parentCommand && command.subCommandPath && command.subCommandPath.length > 0) {
      return `${command.parentCommand} ${command.subCommandPath.join(' ')}`
    }
    return command.name
  }

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
          <div className="flex flex-col gap-2">
            {modules.length > 0 ? modules.map((module) => (
              <div key={module.name} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <Tag color="primary" theme="outline-light">{module.name}</Tag>
                <span className="text-xs text-slate-500">{module.description || '暂无说明'}</span>
              </div>
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
              <span className={classNames("text-sm font-semibold col-span-1 overflow-wrap-anywhere break-words", {
                "text-slate-500": isRegex,
              })}>{displayCommandName}</span>
              <span className="text-xs text-slate-500 col-span-1 flex justify-end overflow-wrap-anywhere break-words">{description || '无描述'}</span>
            </div>
            <div className="grid grid-cols-12 gap-2 text-xs">
              {isSubCommand && parentCommand && subCommandPath.length > 0 && (
                <>
                  <span className="text-slate-500 whitespace-nowrap col-span-1">父命令</span>
                  <CodeBlock color='secondary' block className="col-span-11">{parentCommand}</CodeBlock>
                  <span className="text-slate-500 whitespace-nowrap col-span-1">子命令</span>
                  <CodeBlock color='secondary' block className="col-span-11">{subCommandPath.join(' ')}</CodeBlock>
                </>
              )}
              {aliases.length > 0 && (
                <>
                  <span className="text-slate-500 whitespace-nowrap col-span-1">别名</span>
                  {renderAliasBlocks(aliases)}
                </>
              )}
              <span className="text-slate-500 whitespace-nowrap col-span-1">用法</span>
              {renderUsageBlocks(displayUsage)}
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
              {!isRegex && matchers.length > 0 && (
                <>
                  <span className="text-slate-500 whitespace-nowrap col-span-1">匹配</span>
                  <div className="flex flex-wrap gap-1 col-span-11">
                    {matchers.map((item) => (
                      <CodeBlock color="secondary" block key={`${commandName}-${item}`}>{item}</CodeBlock>
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
          {moduleDescription ? (
            <div className="text-xs text-slate-500">{moduleDescription}</div>
          ) : null}
          {commands.length > 0 ? (
            <div className="flex flex-col gap-2">
              {commands.map((command) => (
                <div
                  key={command.name}
                  className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 pt-1"
                >
                  <div className="grid grid-cols-2 items-center gap-2 justify-between">
                    <span className={classNames("text-sm font-semibold col-span-1 overflow-wrap-anywhere break-words", {
                      "text-slate-500": command.isRegex,
                    })}>{renderCommandLabel(command)}</span>
                    <span className="text-xs text-slate-500 col-span-1 flex justify-end overflow-wrap-anywhere break-words">{command.description || '无描述'}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 text-xs">
                    {command.aliases && command.aliases.length > 0 && (
                      <>
                        <span className="text-slate-500 whitespace-nowrap col-span-1">别名</span>
                        {renderAliasBlocks(command.aliases)}
                      </>
                    )}
                    <span className="text-slate-500 whitespace-nowrap col-span-1">用法</span>
                    {renderUsageBlocks(command.usage || '未提供')}
                    {!command.isRegex && command.matchers && command.matchers.length > 0 && (
                      <>
                        <span className="text-slate-500 whitespace-nowrap col-span-1">匹配</span>
                        <div className="flex flex-wrap gap-1 col-span-11">
                          {command.matchers.map((item) => (
                            <CodeBlock color="secondary" block key={`${command.name}-${item}`}>{item}</CodeBlock>
                          ))}
                        </div>
                      </>
                    )}
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

