import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { TldrSection } from '@/components/result/TldrSection'
import { IssuesSection } from '@/components/result/IssuesSection'
import { FixesSection } from '@/components/result/FixesSection'
import { CodeSection } from '@/components/result/CodeSection'
import type { ResultSection } from '@/types'

const NAV: { value: ResultSection; icon: string; label: string }[] = [
  { value: 'tldr',   icon: '📋', label: 'TL;DR' },
  { value: 'issues', icon: '⚠️', label: 'Issues' },
  { value: 'fixes',  icon: '🔧', label: 'Fixes' },
  { value: 'code',   icon: '💻', label: 'Code' },
]

export function ResultScreen() {
  const { result, reset, resultSection, setResultSection } = useApp()
  const [copied, setCopied] = useState(false)

  async function copyAll() {
    const text = (result?.fix_prompts ?? []).join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-44 flex-shrink-0 border-r border-slate-800 flex flex-col items-start py-6 px-3 gap-1">
        <div
          className="font-mono text-xs text-blue-500 mb-6 self-center"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', letterSpacing: '0.1em' }}
        >
          PersonaLab
        </div>
        {NAV.map(tab => (
          <button
            key={tab.value}
            onClick={() => setResultSection(tab.value)}
            className={[
              'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              resultSection === tab.value
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
            ].join(' ')}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto px-8 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← 새 분석
          </button>
          <Button variant="outline" size="sm" onClick={copyAll}>
            {copied ? '✓ 복사됨' : '⤓ Export'}
          </Button>
        </div>

        {resultSection === 'tldr'   && <TldrSection />}
        {resultSection === 'issues' && <IssuesSection />}
        {resultSection === 'fixes'  && <FixesSection />}
        {resultSection === 'code'   && <CodeSection />}

        <Button variant="ghost" className="w-full mt-8" onClick={reset}>
          새로운 분석 시작
        </Button>
      </div>
    </div>
  )
}
