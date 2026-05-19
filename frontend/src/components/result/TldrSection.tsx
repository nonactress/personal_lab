import { useApp } from '@/context/AppContext'
import { Badge } from '@/components/ui/badge'

const RISK = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  ok:       { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
}

export function TldrSection() {
  const { result } = useApp()
  if (!result) return null

  const rc = RISK[result.risk_level] ?? RISK.ok

  const firstSentence = (() => {
    const t = result.think_aloud || ''
    const m = t.match(/^[^.!?]+[.!?]/)
    return m ? m[0] : t.slice(0, 80) + (t.length > 80 ? '…' : '')
  })()

  return (
    <div>
      {/* Risk banner */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl mb-6"
        style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>
        <div className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: rc.color, boxShadow: `0 0 8px ${rc.color}` }} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base" style={{ color: rc.color }}>{result.risk_label}</div>
          <div className="text-xs mt-0.5 text-slate-500">{result.abandoned ? '이탈 예측됨' : '완료 가능'}</div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(result.issues_summary?.critical ?? 0) > 0 && <Badge variant="critical">심각 {result.issues_summary.critical}</Badge>}
          {(result.issues_summary?.warning  ?? 0) > 0 && <Badge variant="warning">경고 {result.issues_summary.warning}</Badge>}
          {(result.issues_summary?.info     ?? 0) > 0 && <Badge variant="info">정보 {result.issues_summary.info}</Badge>}
        </div>
      </div>

      {/* Developer bias gap */}
      {result.developer_assumption && (
        <div className="mb-4">
          <div className="font-mono text-xs tracking-wider uppercase mb-2 text-slate-600">개발자 바이어스 갭</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <div className="text-xs text-slate-500 mb-1">개발자가 예상한 행동</div>
              <p className="text-sm italic text-slate-500">"{result.developer_assumption}"</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-blue-500/15">
              <div className="text-xs text-blue-400 mb-1">실제 페르소나 반응</div>
              <p className="text-sm italic text-slate-300">"{firstSentence}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Think-aloud */}
      <div className="px-4 py-4 rounded-xl bg-slate-800/30 border border-slate-700/30 mb-4">
        <div className="font-mono text-xs mb-2 text-blue-400">페르소나 Think-aloud</div>
        <p className="text-sm leading-relaxed italic text-slate-300">{result.think_aloud}</p>
        {result.dropout_point && (
          <p className="mt-2 text-xs text-red-400">이탈 지점: {result.dropout_point}</p>
        )}
      </div>

      {/* Friction map */}
      {(result.friction_map?.length ?? 0) > 0 && (
        <div className="mb-4">
          <div className="font-mono text-xs tracking-wider uppercase mb-3 text-slate-600">
            주요 마찰 지점
            {result.total_simulated > 0 && (
              <span className="ml-2 normal-case text-slate-700">({result.total_simulated}명 시뮬 기준)</span>
            )}
          </div>
          {result.friction_map.slice(0, 8).map((item, i) => {
            const pct   = Math.round(item.rate * 100)
            const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#60a5fa'
            const bars  = '█'.repeat(Math.round(item.rate * 8))
            return (
              <div key={i} className="mb-2.5">
                <div className="flex justify-between mb-0.5">
                  <span className="text-sm text-slate-300">{i + 1}. {item.element}</span>
                  <span className="text-xs font-mono" style={{ color }}>{item.affected_count}명</span>
                </div>
                <div className="text-xs font-mono" style={{ color, letterSpacing: '-1px' }}>{bars}</div>
              </div>
            )
          })}
          {result.abandonment_rate > 0 && (
            <div className="mt-3 text-sm text-red-400">이탈률: {Math.round(result.abandonment_rate * 100)}%</div>
          )}
        </div>
      )}

      {/* Top issues / Next steps */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-mono uppercase mb-2 text-red-400">Top Issues</div>
          {result.top3.slice(0, 3).map((item, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 mb-2">
              <span className="text-xs font-mono text-slate-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span>{item.reason}</span>
            </div>
          ))}
          {result.top3.length === 0 && <p className="text-sm text-slate-600">감지된 이슈 없음</p>}
        </div>
        <div>
          <div className="text-xs font-mono uppercase mb-2 text-blue-400">Next Steps</div>
          {result.fix_prompts.slice(0, 3).map((prompt, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300 mb-2">
              <span className="text-xs font-mono text-slate-600 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span>{prompt.split('\n')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
