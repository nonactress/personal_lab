import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { analyze } from '@/lib/api'

const STEPS = [
  { label: '코드 파싱',        icon: '📂' },
  { label: '페르소나 매칭',    icon: '🧬' },
  { label: 'UX 시뮬레이션',   icon: '🔍' },
  { label: '리포트 생성',      icon: '📊' },
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export function ProgressScreen() {
  const {
    files, sourceMode, sourcePort, sourcePath, sourceUrl,
    matchedStrata, taskDesc, totalCount,
    setResult, setScreen, setError, setLiveThought, liveThought,
  } = useApp()

  const [statusStep, setStatusStep] = useState(1)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function run() {
      setStatusStep(1)
      await sleep(800)
      setStatusStep(2)
      await sleep(600)
      setStatusStep(3)
      setLiveThought(`${totalCount.toLocaleString()}명 규모 페르소나가 앱을 살펴보고 있어요…`)

      const targetUrl =
        sourceMode === 'localhost'
          ? `http://localhost:${sourcePort}${sourcePath ? '/' + sourcePath.replace(/^\//, '') : ''}`
          : sourceMode === 'url' ? sourceUrl : undefined

      try {
        const result = await analyze({
          strataKeys: matchedStrata,
          task: taskDesc.trim() || '서비스 탐색하기',
          files: sourceMode === 'file' ? files : undefined,
          targetUrl,
        })
        setStatusStep(4)
        await sleep(300)
        setLiveThought('')
        setResult(result)
        setScreen('result')
      } catch (err) {
        setLiveThought('')
        setError(
          (err as Error).message === 'backend'
            ? '⚠️ 분석 중 오류가 발생했어요. 파일 형식을 확인하거나 잠시 후 다시 시도해주세요.'
            : '⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)'
        )
        setScreen('source')
      }
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-xs tracking-widest uppercase mb-12 text-blue-500">PersonaLab</div>

        <div className="flex items-end justify-center mb-10">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs border transition-colors',
                  statusStep > i + 1  ? 'border-blue-500 bg-blue-500/20 text-blue-400' :
                  statusStep === i + 1 ? 'border-blue-400 bg-blue-500/10 text-blue-400 animate-pulse' :
                  'border-slate-700 text-slate-600',
                ].join(' ')}>
                  {statusStep > i + 1 ? '✓' : i + 1}
                </div>
                <div className="text-xs whitespace-nowrap text-slate-600">
                  {step.icon} {step.label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={[
                  'w-8 h-px mb-5 mx-1',
                  statusStep > i + 1 ? 'bg-blue-500/40' : 'bg-slate-700',
                ].join(' ')} />
              )}
            </div>
          ))}
        </div>

        {liveThought && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left">
            <div className="font-mono text-xs mb-1 text-blue-400">페르소나 실시간 반응</div>
            <p className="text-xs italic text-slate-400">{liveThought}</p>
          </div>
        )}

        <div className="flex justify-center gap-1.5">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
              style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
