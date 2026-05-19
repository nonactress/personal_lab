import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'

function sevVariant(sev: number): 'critical' | 'warning' | 'info' {
  return sev > 0.7 ? 'critical' : sev > 0.4 ? 'warning' : 'info'
}

export function IssuesSection() {
  const { result } = useApp()
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  if (!result) return null

  const top3 = result.top3 ?? []
  if (top3.length === 0) return <p className="text-sm text-slate-600">감지된 이슈 없음</p>

  return (
    <div>
      <div className="font-semibold text-base mb-4 text-slate-100">이슈 상세</div>
      <div className="space-y-2">
        {top3.map((item, i) => {
          const variant = sevVariant(item.severity)
          const borderColor = item.severity > 0.7
            ? 'rgba(239,68,68,0.3)'
            : item.severity > 0.4
            ? 'rgba(245,158,11,0.3)'
            : 'rgba(59,130,246,0.3)'
          return (
            <Collapsible key={i} open={openIdx === i} onOpenChange={o => setOpenIdx(o ? i : null)}>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left">
                  <div className="flex items-center gap-2 text-sm text-slate-200 min-w-0">
                    <Badge variant={variant} className="flex-shrink-0">
                      {item.severity > 0.7 ? 'HIGH' : item.severity > 0.4 ? 'MED' : 'LOW'}
                    </Badge>
                    <span className="truncate">line {item.line_number ?? '?'} — {item.reason}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 ml-2 flex-shrink-0">
                    {Math.round(item.severity * 100)}%
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 bg-slate-900/50 text-sm text-slate-400 border-t border-slate-700/50">
                    <b className="text-slate-300">근거</b> — {item.evidence}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
