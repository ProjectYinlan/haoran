import { Tag } from '../../../core/components/Tag.js'

export type VaultBillItem = {
  label: string
  amount: string
  type: 'income' | 'expense'
}

export type VaultBillData = {
  title: string
  scopeLabel: string
  userName: string
  userId: number
  avatarUrl: string
  items?: VaultBillItem[]
}

export const VaultBill = ({ title, scopeLabel, userName, userId, avatarUrl, items = [] }: VaultBillData) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-slate-200 text-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
          <div className="flex flex-col">
            <span className="text-base font-semibold">{userName}</span>
            <Tag color="secondary" theme="solid-light">{userId}</Tag>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold">{title}</span>
          <Tag color="secondary" theme="solid-light">{scopeLabel}</Tag>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">暂无流水</div>
        ) : items.map((item, index) => (
          <div key={`${index}-${item.label}`} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <Tag color={item.type === 'income' ? 'success' : 'danger'} theme="solid-light">
              {item.amount}
            </Tag>
          </div>
        ))}
      </div>
    </div>
  )
}

export const preview = {
  title: 'VaultBill',
  component: VaultBill,
  defaultData: {
    title: '余额流水',
    scopeLabel: '全局',
    userName: '测试用户',
    userId: 10000,
    avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
    items: [
      { label: '2026-02-03 10:00:00 站街 - 收入', amount: '+300', type: 'income' },
      { label: '2026-02-03 09:40:00 站街 - 支出', amount: '-150', type: 'expense' },
    ],
  } satisfies VaultBillData,
  size: { width: 420, height: 'auto' as const },
}

