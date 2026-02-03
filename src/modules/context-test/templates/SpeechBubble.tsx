export type SpeechBubbleData = {
  avatarUrl: string
  nickname: string
  content: string
}

export const SpeechBubble = ({ avatarUrl, nickname, content }: SpeechBubbleData) => {
  return (
    <div className="flex gap-3 p-4 bg-white rounded-xl">
      {/* 头像 */}
      <img
        src={avatarUrl}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />
      
      {/* 对话框 */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-xs text-slate-500 font-medium">{nickname}</span>
        <div className="relative bg-slate-100 rounded-xl rounded-tl-sm px-3 py-2">
          {/* 小三角 */}
          <div className="absolute -left-2 top-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-slate-100" />
          <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  )
}

// 多条消息的聊天历史
export type ChatHistoryData = {
  messages: SpeechBubbleData[]
}

export const ChatHistory = ({ messages }: ChatHistoryData) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-xl">
      <div className="text-xs text-slate-400 text-center mb-2">
        {new Date().toLocaleDateString('zh-CN')} 对话记录
      </div>
      {messages.map((msg, index) => (
        <div key={index} className="flex gap-3">
          <img
            src={msg.avatarUrl}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs text-slate-500 font-medium">{msg.nickname}</span>
            <div className="relative bg-slate-100 rounded-xl rounded-tl-sm px-3 py-2">
              <div className="absolute -left-2 top-2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-slate-100" />
              <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const preview = {
  title: 'ChatHistory',
  component: ChatHistory,
  defaultData: {
    messages: [
      {
        avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
        nickname: '用户A',
        content: '你好！',
      },
      {
        avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10001&s=100',
        nickname: '用户B',
        content: '你好，有什么可以帮助你的吗？',
      },
      {
        avatarUrl: 'http://q1.qlogo.cn/g?b=qq&nk=10000&s=100',
        nickname: '用户A',
        content: '这是一条测试消息\n支持多行内容',
      },
    ]
  } satisfies ChatHistoryData,
  size: { width: 400, height: 'auto' as const },
}
