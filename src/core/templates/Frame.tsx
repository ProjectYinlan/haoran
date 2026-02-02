export const Frame = ({ children, fit = false }: { children: React.ReactNode, fit?: boolean }) => {
  return (
    <div className={['flex flex-col gap-2 w-full bg-white p-4 pb-3 font-sans', fit ? 'h-auto' : 'h-full'].join(' ')}>
      {children}
      <span className="text-xs text-slate-500 text-center">Powered by PJYL.</span>
    </div>
  )
}