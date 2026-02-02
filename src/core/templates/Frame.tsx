import dayjs from "dayjs"

type FrameMeta = {
  botName?: string
  poweredBy?: string
  generatedAt?: Date
  devMode?: boolean
}

const getGlobalFrameMeta = (): FrameMeta => {
  const meta = (globalThis as any).__TEMPLATE_FRAME_META__
  return meta && typeof meta === 'object' ? meta : {}
}

export const Frame = ({ children, fit = false, meta }: { children: React.ReactNode, fit?: boolean, meta?: FrameMeta }) => {
  const runtimeMeta = { poweredBy: 'ProjectYinlan', ...getGlobalFrameMeta(), ...meta }
  const generatedAt = runtimeMeta.generatedAt ?? new Date()
  const devMode = runtimeMeta.devMode ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
  return (
    <div className={['flex flex-col gap-2 w-full bg-white p-4 pb-3 font-sans', fit ? 'h-auto' : 'h-full'].join(' ')}>
      {children}
      <div className="flex flex-col text-2xs text-slate-500 text-center">
        <span>Powered by {runtimeMeta.poweredBy}.{runtimeMeta.botName && ` Bot: ${runtimeMeta.botName}`}</span>
        <span>
          Generated at {dayjs(generatedAt).format('YYYY-MM-DD HH:mm:ss')}.
          {devMode && ' Dev Mode.'}
        </span>

      </div>
    </div>
  )
}