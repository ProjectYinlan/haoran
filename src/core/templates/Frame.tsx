export const Frame = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex bg-white w-full h-full p-4">
      {children}
    </div>
  )
}