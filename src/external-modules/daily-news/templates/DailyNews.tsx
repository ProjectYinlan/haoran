export type DailyNewsData = {
  score: number
  newsType: string
  length: number
  colorHex: string
  textColor: string
  enchant: string
  statusText: string
  angleText: string
  eggWeightText: string
  publicComment: string
  systemComment: string
  imageUrl?: string
}

const InfoCard = ({ title, value }: { title: string; value: string }) => {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 text-slate-800">
      <div className="text-[11px] text-slate-500">{title}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  )
}

export const DailyNews = ({
  score,
  newsType,
  length,
  colorHex,
  textColor,
  enchant,
  statusText,
  angleText,
  eggWeightText,
  publicComment,
  systemComment,
  imageUrl,
}: DailyNewsData) => {
  const containerClass = "bg-slate-50 text-slate-900"
  const panelClass = "bg-white border-slate-200 text-slate-800"
  const mutedText = "text-slate-500"
  const highlightBg = "bg-slate-100"

  return (
    <div className={`w-full ${containerClass} p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold tracking-wide">Random_News</div>
        <div className="text-2xl font-semibold">
          {score}
          <span className="text-xs ml-1">分</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className={`rounded-xl border p-3 text-center ${panelClass}`}>
          <div className="text-sm font-semibold">您今天拥有的是</div>
          <div className="text-xl mt-1">{newsType}</div>
        </div>

        <div className={`rounded-xl border p-3 ${panelClass}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={mutedText}>颜色</span>
            <span
              className="px-2 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: colorHex, color: textColor }}
            >
              {colorHex}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InfoCard title="附魔" value={enchant} />
          <InfoCard title="长度" value={`${length} CM`} />
          <InfoCard title="角度" value={`${angleText}°`} />
          <InfoCard title="状态" value={statusText} />
          <InfoCard title="蛋蛋重量" value={`${eggWeightText} 克`} />
          <InfoCard title="评分" value={`${score} 分`} />
        </div>

        <div className={`rounded-xl border p-3 ${panelClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">大众点评</span>
            <div className="text-lg font-semibold">
              {score}
              <span className="text-xs ml-1">分</span>
            </div>
          </div>
          <div className={`mt-2 text-xs whitespace-pre-wrap ${mutedText}`}>{publicComment}</div>
        </div>

        <div className={`rounded-xl border p-3 ${panelClass}`}>
          <div className="text-xs font-semibold">系统评价</div>
          <div className={`mt-2 text-xs whitespace-pre-wrap ${mutedText}`}>{systemComment}</div>
        </div>

        {imageUrl && (
          <div className={`rounded-xl border ${highlightBg} p-3 h-[180px]`}>
            <div
              className="w-full h-full rounded-lg bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "contain" }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const preview = {
  title: "DailyNews",
  component: DailyNews,
  defaultData: {
    score: 8.8,
    newsType: "牛子",
    length: 16,
    colorHex: "#FF88AA",
    textColor: "rgb(0,0,0)",
    enchant: "附魔上了耐久Ⅲ的",
    statusText: "勃起/非包茎",
    angleText: "120",
    eggWeightText: "233",
    publicComment: "很棒的牛子，下次还吃",
    systemComment: "哇哦！天生巨根！",
  } satisfies DailyNewsData,
  size: { width: 420, height: 'auto' as const },
}
