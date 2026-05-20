import { useState } from 'react'
import type { AnalysisResult, PerScreenResult } from '@/types'

interface Props {
  selectedScreen: string | null
  perScreen: Record<string, PerScreenResult>
  result: AnalysisResult | null
  onClose: () => void
}

const RISK_LABELS: Record<string, string> = {
  ok: 'LOW',
  warning: 'MED',
  critical: 'HIGH',
}

const RISK_COLORS: Record<string, string> = {
  ok: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export function NodeDetailPanel({ selectedScreen, perScreen, result, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const screenData = selectedScreen ? perScreen[selectedScreen] : null

  async function copyFix() {
    const text = screenData?.fix_prompts.join('\n\n') ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (!selectedScreen || !screenData) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="font-mono text-xs text-blue-500 tracking-widest mb-2">PersonaLab</div>

        {result && (
          <>
            <div className={[
              'rounded-lg border px-3 py-2',
              RISK_COLORS[result.risk_level],
            ].join(' ')}>
              <div className="text-xs font-medium">{RISK_LABELS[result.risk_level]} RISK</div>
              <div className="text-lg font-bold mt-0.5">
                {Math.round(result.abandonment_rate * 100)}% 이탈
              </div>
            </div>
            <div className="text-xs text-slate-500">
              시뮬레이션 {result.total_simulated}명
            </div>
          </>
        )}

        <p className="text-xs text-slate-600 mt-2">
          노드를 클릭하면 상세 분석을 볼 수 있어요
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-200 truncate max-w-[160px]" title={selectedScreen}>
            {selectedScreen}
          </div>
          <span className={[
            'text-xs font-medium border rounded px-1.5 py-0.5 mt-1 inline-block',
            RISK_COLORS[screenData.risk_level],
          ].join(' ')}>
            {RISK_LABELS[screenData.risk_level]}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-xs ml-2">✕</button>
      </div>

      {/* Think-aloud */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">Think-aloud</div>
        <div className="h-px bg-slate-800 mb-2" />
        <p className="text-xs text-slate-300 leading-relaxed italic">
          "{screenData.think_aloud}"
        </p>
      </div>

      {/* Issues */}
      {screenData.issues.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1.5">Issues</div>
          <div className="h-px bg-slate-800 mb-2" />
          <div className="space-y-2">
            {screenData.issues.map((issue, i) => (
              <div key={i} className="bg-slate-900 rounded p-2 border border-slate-800">
                <div className="text-xs font-medium text-slate-200">{issue.element}</div>
                <div className="text-xs text-slate-500 mt-0.5">{issue.reason}</div>
                {issue.count > 1 && (
                  <div className="text-xs text-slate-600 mt-0.5">× {issue.count}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix Prompt */}
      {screenData.fix_prompts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-slate-500 uppercase tracking-widest">Fix Prompt</div>
            <button
              onClick={copyFix}
              className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-0.5"
            >
              {copied ? '✓ 복사됨' : '복사'}
            </button>
          </div>
          <div className="h-px bg-slate-800 mb-2" />
          <div className="space-y-1.5">
            {screenData.fix_prompts.map((fp, i) => (
              <p key={i} className="text-xs text-slate-400 leading-relaxed">{fp}</p>
            ))}
          </div>
        </div>
      )}

      {/* Friction rate */}
      <div className="mt-auto pt-3 border-t border-slate-800">
        <div className="flex justify-between text-xs text-slate-600">
          <span>마찰률</span>
          <span>{Math.round(screenData.friction_rate * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
