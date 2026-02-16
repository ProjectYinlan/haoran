import dayjs from "dayjs"
import classNames from "classnames"

type FrameMeta = {
  botName?: string
  poweredBy?: string
  generatedAt?: Date
  devMode?: boolean
  renderSize?: {
    width: number
    height: number | 'auto'
  }
  className?: string
}

const getGlobalFrameMeta = (): FrameMeta => {
  const meta = (globalThis as any).__TEMPLATE_FRAME_META__
  return meta && typeof meta === 'object' ? meta : {}
}

export const Frame = ({ children, fit = false, meta }: { children: React.ReactNode, fit?: boolean, meta?: FrameMeta }) => {
  const runtimeMeta = { poweredBy: 'ProjectYinlan', ...getGlobalFrameMeta(), ...meta }
  const generatedAt = runtimeMeta.generatedAt ?? new Date()
  const devMode = runtimeMeta.devMode ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
  const renderWidth = runtimeMeta.renderSize?.width ?? 0
  const isCompact = renderWidth > 0 && renderWidth <= 440
  const containerClass = classNames(
    'flex flex-col w-full font-sans bg-white',
    isCompact ? 'gap-1.5 p-3 pb-2' : 'gap-2 p-4 pb-3',
    fit ? 'h-auto' : 'h-full',
    runtimeMeta.className
  )
  const footerClass = isCompact ? 'text-[10px]' : 'text-3xs'
  return (
    <div className={containerClass}>
      {children}
      <div className={`flex flex-col ${footerClass} text-slate-300 text-center`}>
        <span>Powered by {runtimeMeta.poweredBy}.{runtimeMeta.botName && ` Bot: ${runtimeMeta.botName}`}</span>
        <span>
          Generated at {dayjs(generatedAt).format('YYYY-MM-DD HH:mm:ss')}.
          {devMode && ' Dev Mode.'}
        </span>
      </div>
    </div>
  )
}