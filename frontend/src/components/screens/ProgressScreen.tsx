import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { analyze } from '@/lib/api'
import type { PreviewPersona } from '@/types'

const STEPS = [
  { label: '이미지 분석',    icon: '🖼️' },
  { label: '페르소나 매칭',  icon: '🧬' },
  { label: 'UX 시뮬레이션', icon: '🔍' },
  { label: '리포트 생성',    icon: '📊' },
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function PersonaFeed({ personas, active }: { personas: PreviewPersona[]; active: boolean }) {
  const [dotCounts, setDotCounts] = useState([3, 2, 3])

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setDotCounts(prev => prev.map(() => Math.floor(Math.random() * 3) + 1))
    }, 800)
    return () => clearInterval(id)
  }, [active])

  if (personas.length === 0) return null

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 max-w-2xl mx-auto mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse flex-shrink-0"></span>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          지금 앱을 살펴보는 중
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {personas.map((p, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-brand-100 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
              {p.persona?.slice(0, 1) ?? p.occupation?.slice(0, 1) ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-900">{p.age}세</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-600 truncate">{p.occupation}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">{p.province}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {Array.from({ length: 3 }).map((_, d) => (
                <span
                  key={d}
                  className={[
                    'w-1.5 h-1.5 rounded-full transition-colors duration-300',
                    d < dotCounts[i % dotCounts.length] ? 'bg-brand-500' : 'bg-brand-200',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
    </svg>
  )
}

export function ProgressScreen() {
  const {
    files, flowEdges,
    matchedStrata, taskDesc, totalCount,
    previewPersonas,
    setResult, setScreen, setError, setLiveThought, liveThought,
  } = useApp()

  const [step, setStep] = useState(1)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function run() {
      setStep(1)
      await sleep(800)
      setStep(2)
      await sleep(600)
      setStep(3)
      setLiveThought(`${totalCount.toLocaleString()}명 규모의 페르소나가 앱을 살펴보고 있어요…`)

      try {
        const result = await analyze({
          strataKeys: matchedStrata,
          task: taskDesc.trim() || '서비스 탐색하기',
          files: files.length > 0 ? files : undefined,
          flowEdges,
        })
        setStep(4)
        await sleep(300)
        setLiveThought('')
        setResult(result)
        setScreen('result')
      } catch (err) {
        setLiveThought('')
        const msg = (err as Error).message ?? ''
        const isNetwork = msg === 'Failed to fetch' || msg.includes('fetch')
        setError(
          isNetwork
            ? '⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)'
            : `⚠️ 분석 중 오류가 발생했어요. ${msg}`
        )
        setScreen('source')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden">
          {/* Browser chrome */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5 bg-gray-50/50">
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <div className="mx-auto px-3 py-0.5 rounded-md bg-white text-[11px] text-gray-500 font-mono border border-gray-200">
              personalab.app/analyze
            </div>
          </div>

          <div className="py-16 px-10">
            <div className="text-center mb-12">
              <div className="font-mono text-sm font-semibold text-brand-700 mb-3">PersonaLab</div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">시뮬레이션 진행 중…</h1>
              <p className="text-gray-500 mt-2 text-sm">
                {totalCount.toLocaleString()}명 규모의 페르소나가 플로우를 살펴보고 있습니다.
              </p>
            </div>

            {/* 4-step indicator */}
            <div className="flex items-center justify-between mb-14 max-w-2xl mx-auto">
              {STEPS.map((s, i) => {
                const done   = step > i + 1
                const active = step === i + 1
                const last   = i === STEPS.length - 1
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-28">
                      <div
                        className={[
                          'w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm transition-all',
                          done   ? 'bg-brand-600 text-white' :
                          active ? 'bg-brand-600 text-white ring-pulse' :
                          'bg-white border-2 border-gray-200 text-gray-400',
                        ].join(' ')}
                      >
                        {done ? <CheckIcon /> : i + 1}
                      </div>
                      <div className="text-center">
                        <div className="text-base">{s.icon}</div>
                        <div className={[
                          'text-[11px] mt-0.5',
                          active ? 'font-bold text-brand-700' :
                          done   ? 'font-semibold text-gray-900' :
                          'font-medium text-gray-400',
                        ].join(' ')}>
                          {s.label}
                        </div>
                      </div>
                    </div>
                    {!last && (
                      <div
                        className="flex-1 h-0.5 -mt-12 mx-1"
                        style={{
                          background: done
                            ? '#4f46e5'
                            : active
                            ? 'linear-gradient(to right, #4f46e5, #e5e7eb)'
                            : '#e5e7eb',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Persona feed */}
            <PersonaFeed personas={previewPersonas} active={step === 3} />

            {/* Bouncing dots */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-600 animate-bounce-stagger"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
