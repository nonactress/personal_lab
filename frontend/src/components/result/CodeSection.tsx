import { useApp } from '@/context/AppContext'
import { Badge } from '@/components/ui/badge'

export function CodeSection() {
  const { result } = useApp()
  if (!result) return null

  const source = result.source_code ?? ''
  if (!source) return <p className="text-sm text-slate-600">소스 코드 없음</p>

  const issueMap = new Map(
    (result.top3 ?? []).filter(i => i.line_number).map(i => [i.line_number!, i])
  )

  return (
    <div>
      <div className="font-semibold text-base mb-4 text-slate-100">코드 이슈 · UI 미리보기</div>
      <div className="rounded-xl overflow-hidden border border-slate-700/50">
        <div className="px-4 py-2 font-mono text-xs bg-slate-800 border-b border-slate-700/50 text-slate-500">
          소스 코드 — 이슈 라인 하이라이트
        </div>
        <div className="overflow-auto max-h-96 bg-slate-900">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {source.split('\n').map((line, i) => {
                const n     = i + 1
                const issue = issueMap.get(n)
                const sev   = issue?.severity ?? 0
                const rowBg = issue
                  ? sev > 0.7 ? '#3d1515' : sev > 0.4 ? '#3d2b0a' : '#1a2d3d'
                  : 'transparent'
                return (
                  <tr key={n} style={{ background: rowBg }}>
                    <td className="text-right px-3 py-0.5 text-slate-600 select-none w-10 align-top">{n}</td>
                    <td className="px-3 py-0.5 text-slate-300 whitespace-pre align-top">{line}</td>
                    <td className="px-2 py-0.5 align-top">
                      {issue && (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Badge variant={sev > 0.7 ? 'critical' : sev > 0.4 ? 'warning' : 'info'}>
                            {sev > 0.7 ? 'HIGH' : sev > 0.4 ? 'MED' : 'LOW'}
                          </Badge>
                          <span className="text-slate-400">{issue.reason}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {result.preview_html && (
        <div className="rounded-xl overflow-hidden mt-4 border border-slate-700/50">
          <div className="px-4 py-2 font-mono text-xs bg-slate-800 border-b border-slate-700/50 text-slate-500">
            UI 미리보기 (375px 기준)
          </div>
          <iframe
            srcDoc={result.preview_html}
            className="w-full border-none block bg-white"
            style={{ height: 520 }}
            title="UI Preview"
          />
        </div>
      )}
    </div>
  )
}
