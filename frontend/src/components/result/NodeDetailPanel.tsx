import { useState } from 'react'
import type { AnalysisResult, PerScreenResult } from '@/types'

interface Props {
  selectedScreen: string | null
  perScreen: Record<string, PerScreenResult>
  result: AnalysisResult | null
  onClose: () => void
}

const RISK_LABEL: Record<string, string> = {
  ok: 'LOW',
  warning: 'MED',
  critical: 'HIGH',
}

const RISK_BORDER_COLOR: Record<string, string> = {
  ok: 'border-emerald-200 bg-emerald-50/50',
  warning: 'border-amber-200 bg-amber-50/50',
  critical: 'border-rose-200 bg-rose-50/50',
}

const RISK_TEXT: Record<string, string> = {
  ok: 'text-emerald-700',
  warning: 'text-amber-700',
  critical: 'text-rose-700',
}

const RISK_BADGE: Record<string, string> = {
  ok:       'bg-emerald-100 text-emerald-700',
  warning:  'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-700',
}

const RISK_HEADER_BG: Record<string, string> = {
  ok:       'bg-emerald-50/50',
  warning:  'bg-amber-50/50',
  critical: 'bg-rose-50/50',
}

const RISK_DOT: Record<string, string> = {
  ok:       'bg-emerald-500',
  warning:  'bg-amber-500',
  critical: 'bg-rose-500',
}

function issueBadge(index: number): string {
  if (index === 0) return 'bg-rose-100 text-rose-700'
  if (index <= 2)  return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-700'
}

function issueBadgeLabel(index: number): string {
  if (index === 0) return 'HIGH'
  if (index <= 2)  return 'MED'
  return 'LOW'
}

function issueBorder(index: number): string {
  if (index === 0) return 'border-rose-200 bg-rose-50/50'
  if (index <= 2)  return 'border-amber-200 bg-amber-50/40'
  return 'border-gray-200 bg-gray-50/50'
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

  // Default (no selection)
  if (!selectedScreen || !screenData) {
    const risk = result?.risk_level ?? 'ok'
    return (
      <div className="flex flex-col p-4 h-full">
        <div className="font-mono text-xs font-semibold text-brand-700 mb-4">PersonaLab</div>

        {result && (
          <>
            <div className={['rounded-2xl border p-3 mb-3', RISK_BORDER_COLOR[risk]].join(' ')}>
              <div className="flex items-center gap-2 mb-1">
                <span className={['w-2 h-2 rounded-full', RISK_DOT[risk]].join(' ')}></span>
                <span className={['text-[10px] font-bold uppercase tracking-wider', RISK_TEXT[risk]].join(' ')}>
                  {risk === 'critical' ? 'High Risk' : risk === 'warning' ? 'Med Risk' : 'Low Risk'}
                </span>
              </div>
              <div className="text-sm text-gray-700">이탈 예측</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg bg-white border border-gray-200 p-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">최종 이탈</div>
                <div className={['text-lg font-bold tabular-nums', RISK_TEXT[risk]].join(' ')}>
                  {Math.round(result.abandonment_rate * 100)}%
                </div>
              </div>
              <div className="rounded-lg bg-white border border-gray-200 p-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">시뮬 인원</div>
                <div className="text-lg font-bold tabular-nums text-gray-900">
                  {result.total_simulated.toLocaleString()}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="rounded-lg bg-white border border-dashed border-gray-300 p-3 text-center mt-auto">
          <div className="text-[11px] text-gray-500 leading-relaxed">
            노드를 클릭하면<br/>상세 분석을 볼 수 있어요
          </div>
        </div>
      </div>
    )
  }

  const risk = screenData.risk_level
  const frictionPct = Math.round(screenData.friction_rate * 100)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Selected header */}
      <div className={['px-4 py-3.5 border-b border-gray-100', RISK_HEADER_BG[risk]].join(' ')}>
        <div className="flex items-center gap-2 mb-1">
          <span className={['w-2 h-2 rounded-full', RISK_DOT[risk]].join(' ')}></span>
          <span className={['text-[10px] font-semibold uppercase tracking-wider', RISK_TEXT[risk]].join(' ')}>
            선택된 화면
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="w-5 h-5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center text-xs"
            title="선택 해제"
          >
            ✕
          </button>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <div className="font-mono text-sm font-bold text-gray-900 truncate flex-1" title={selectedScreen}>
            {selectedScreen}
          </div>
          <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ring-inset', RISK_BADGE[risk],
            risk === 'ok' ? 'ring-emerald-200' : risk === 'warning' ? 'ring-amber-200' : 'ring-rose-200'
          ].join(' ')}>
            {RISK_LABEL[risk]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px]">
          <span className="text-gray-500">마찰률</span>
          <span className={['font-bold tabular-nums', RISK_TEXT[risk]].join(' ')}>{frictionPct}%</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Think-aloud */}
        {screenData.think_aloud && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Think-aloud</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>
            <p className="text-[11.5px] italic text-gray-800 leading-relaxed">
              "{screenData.think_aloud}"
            </p>
          </div>
        )}

        {/* Issues */}
        {screenData.issues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Issues</span>
              <span className="text-[10px] font-mono text-gray-400">{screenData.issues.length}</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>
            <div className="space-y-2">
              {screenData.issues.map((issue, i) => (
                <div key={i} className={['rounded-lg border p-2.5', issueBorder(i)].join(' ')}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={['text-[9px] font-bold px-1.5 py-0.5 rounded', issueBadge(i)].join(' ')}>
                      {issueBadgeLabel(i)}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-900 truncate">{issue.element}</span>
                  </div>
                  <div className="text-[10.5px] text-gray-600 leading-snug">{issue.reason}</div>
                  {issue.count > 1 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">× {issue.count}회</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fix Prompt */}
        {screenData.fix_prompts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">Fix Prompt</span>
              <div className="flex-1 h-px bg-gray-100"></div>
              <button
                onClick={copyFix}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-2.5 font-mono text-[10.5px] text-gray-700 leading-relaxed space-y-2">
              {screenData.fix_prompts.map((fp, i) => (
                <p key={i}>{fp}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
