export const Frame = ({ children }: { children: React.ReactNode }) => {
  return (
    <div style={{ display: 'flex', backgroundColor: '#fff', width: '100%', height: '100%', padding: '20px', fontFamily: 'HarmonyOS Sans SC' }}>
      {children}
    </div>
  )
}