export const Frame = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full w-full bg-white p-5 font-sans">
      {children}
    </div>
  )
}