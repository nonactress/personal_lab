import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { buildCast } from '@/lib/api'
import type { PreviewPersona, FilterParams } from '@/types'

const AGE_BUCKETS     = ['10~20대', '30대', '40대', '50대', '60대+']
const SEX_OPTIONS     = ['모두', '남자', '여자']
const EDU_OPTIONS     = ['고졸이하', '전문대', '대졸', '대학원']
const PROVINCE_LIST   = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
const METRO           = ['서울', '경기', '인천']
const BEHAVIOR_FIELDS = [
  { key: 'occupation_kw',  label: '직업',    placeholder: '예: 개발자, 교사, 무직' },
  { key: 'hobbies_kw',     label: '취미',    placeholder: '예: 독서, 게임, 운동' },
  { key: 'skills_kw',      label: '기술',    placeholder: '예: 엑셀, 코딩, 디자인' },
  { key: 'cultural_kw',    label: '문화배경', placeholder: '예: 수도권 출신, 농촌' },
] as const

const AVATAR_COLORS = [
  'bg-violet-100 border-violet-200 text-violet-700',
  'bg-emerald-100 border-emerald-200 text-emerald-700',
  'bg-amber-100 border-amber-200 text-amber-700',
]

function PersonaSpecCard({ persona: p, index }: { persona: PreviewPersona; index: number }) {
  const [open, setOpen] = useState(false)
  const avatarClass = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const promptPreview = [
    p.persona,
    p.professional_persona ? `직업/일상: ${p.professional_persona}` : '',
    p.hobbies_and_interests ? `취미: ${p.hobbies_and_interests}` : '',
  ].filter(Boolean).join('\n\n')

  return (
    <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarClass}`}>
          {p.persona?.slice(0, 1) ?? p.occupation?.slice(0, 1) ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{p.age}세</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-700">{p.occupation}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{p.province}</span>
          </div>
          {p.persona && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.persona}</p>}
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 text-[10px] font-semibold text-brand-600 hover:text-brand-800 px-2 py-1 rounded-md hover:bg-brand-50 transition-colors"
        >
          {open ? '접기' : '프롬프트'}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">시뮬레이션 프롬프트 미리보기</div>
          {p.persona && <div><span className="text-[10px] font-semibold text-gray-500">페르소나</span><p className="text-xs text-gray-700 mt-0.5">{p.persona}</p></div>}
          {p.professional_persona && <div><span className="text-[10px] font-semibold text-gray-500">직업/일상</span><p className="text-xs text-gray-700 mt-0.5">{p.professional_persona}</p></div>}
          {p.hobbies_and_interests && <div><span className="text-[10px] font-semibold text-gray-500">취미/관심사</span><p className="text-xs text-gray-700 mt-0.5">{p.hobbies_and_interests}</p></div>}
          {p.cultural_background && <div><span className="text-[10px] font-semibold text-gray-500">문화적 배경</span><p className="text-xs text-gray-700 mt-0.5">{p.cultural_background}</p></div>}
          {p.skills_and_expertise && <div><span className="text-[10px] font-semibold text-gray-500">기술/역량</span><p className="text-xs text-gray-700 mt-0.5">{p.skills_and_expertise}</p></div>}
          <div className="pt-2 border-t border-gray-200">
            <span className="text-[10px] font-semibold text-gray-400">M3 시스템 프롬프트 구성</span>
            <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-2 leading-relaxed">
              {`당신은 아래 실제 한국인입니다.\n\n${promptPreview}\n\n이 서비스를 처음 사용합니다.`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ChipGroup({ label, required = false, options, selected, onToggle }: {
  label: string
  required?: boolean
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2.5">
        <label className="text-sm font-semibold text-gray-900">{label}</label>
        {required
          ? <span className="text-[10px] font-semibold text-rose-600">필수</span>
          : <span className="text-[10px] text-gray-400">선택</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
              selected.includes(opt)
                ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TargetSelectScreen() {
  const {
    filterParams, setFilterParams,
    simulationN, setSimulationN,
    totalCount, setTotalCount,
    previewPersonas, setPreviewPersonas,
    castLoading, setCastLoading,
    error, setError,
    files,
    setScreen, setLiveThought, setResultSection,
  } = useApp()

  const [step, setStep] = useState<1 | 2>(1)
  const [activeBehavior, setActiveBehavior] = useState<Set<string>>(new Set())

  const isReady = filterParams.age_buckets.length > 0 && filterParams.education_levels.length > 0

  const fetchCast = useCallback(async (fp: FilterParams) => {
    if (fp.age_buckets.length === 0 || fp.education_levels.length === 0) return
    setCastLoading(true)
    setTotalCount(0)
    setPreviewPersonas([])
    try {
      const data = await buildCast(fp)
      setTotalCount(data.total_count ?? 0)
      setPreviewPersonas(data.preview_personas ?? [])
    } catch {
      setError('매칭 중 오류가 발생했어요.')
    } finally {
      setCastLoading(false)
    }
  }, [setCastLoading, setTotalCount, setPreviewPersonas, setError])

  useEffect(() => {
    if (!isReady) return
    const id = setTimeout(() => fetchCast(filterParams), 500)
    return () => clearTimeout(id)
  }, [filterParams, isReady, fetchCast])

  function toggleMulti(field: 'age_buckets' | 'education_levels' | 'provinces', val: string) {
    setFilterParams({
      ...filterParams,
      [field]: filterParams[field].includes(val)
        ? filterParams[field].filter(v => v !== val)
        : [...filterParams[field], val],
    })
  }

  function toggleBehavior(key: string) {
    setActiveBehavior(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setFilterParams({ ...filterParams, [key]: '' })
      } else {
        next.add(key)
      }
      return next
    })
  }

  function runAnalysis() {
    if (!isReady || totalCount === 0) return
    setError('')
    setLiveThought('')
    setResultSection('tldr')
    setScreen('progress')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden mb-8">
          {/* Top bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <button
              onClick={() => step === 2 ? setStep(1) : setScreen('source')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
              </svg>
              뒤로
            </button>
            <div className="flex-1 text-center">
              <span className="font-mono text-xs font-semibold text-brand-700">PersonaLab</span>
            </div>
            <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {files.length}개 파일
            </div>
          </div>

          <div className="p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">타겟 사용자 선택</h1>
              <p className="text-gray-500 mt-2 text-sm">
                {step === 1 ? '분석에 사용할 조건 항목을 선택하세요' : '각 항목의 값을 설정하세요'}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8 justify-center">
              {([1, 2] as const).map(s => (
                <div key={s} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${step === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s}. {s === 1 ? '항목 선택' : '값 설정'}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">인구통계 — 필수</div>
                  <div className="grid grid-cols-2 gap-3">
                    {['나이구간', '성별', '학력', '지역'].map(label => (
                      <div key={label} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-50 border border-brand-200">
                        <span className="w-4 h-4 rounded bg-brand-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-brand-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">행동 파라미터 — 선택</div>
                  <div className="grid grid-cols-2 gap-3">
                    {BEHAVIOR_FIELDS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => toggleBehavior(f.key)}
                        className={[
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-left',
                          activeBehavior.has(f.key)
                            ? 'bg-brand-50 border-brand-200'
                            : 'bg-white border-gray-200 hover:border-gray-300',
                        ].join(' ')}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${activeBehavior.has(f.key) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                          {activeBehavior.has(f.key) && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm font-medium ${activeBehavior.has(f.key) ? 'text-brand-700' : 'text-gray-700'}`}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full px-5 py-3.5 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 flex items-center justify-center gap-2 transition"
                >
                  다음
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <ChipGroup
                  label="나이구간" required
                  options={AGE_BUCKETS}
                  selected={filterParams.age_buckets}
                  onToggle={v => toggleMulti('age_buckets', v)}
                />

                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">성별</label>
                    <span className="text-[10px] font-semibold text-rose-600">필수</span>
                  </div>
                  <div className="flex gap-2">
                    {SEX_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFilterParams({ ...filterParams, sex: opt })}
                        className={[
                          'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          filterParams.sex === opt
                            ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <ChipGroup
                  label="학력" required
                  options={EDU_OPTIONS}
                  selected={filterParams.education_levels}
                  onToggle={v => toggleMulti('education_levels', v)}
                />

                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">지역</label>
                    <span className="text-[10px] text-gray-400">선택 — 미선택 시 전국</span>
                  </div>
                  <div className="mb-2">
                    <button
                      onClick={() => {
                        const hasMetro = METRO.every(p => filterParams.provinces.includes(p))
                        setFilterParams({
                          ...filterParams,
                          provinces: hasMetro
                            ? filterParams.provinces.filter(p => !METRO.includes(p))
                            : [...new Set([...filterParams.provinces, ...METRO])],
                        })
                      }}
                      className="px-3 py-1 rounded-full text-xs font-semibold border border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                    >
                      수도권 전체
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PROVINCE_LIST.map(pv => (
                      <button
                        key={pv}
                        onClick={() => toggleMulti('provinces', pv)}
                        className={[
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          filterParams.provinces.includes(pv)
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {pv}
                      </button>
                    ))}
                  </div>
                </div>

                {BEHAVIOR_FIELDS.filter(f => activeBehavior.has(f.key)).map(f => (
                  <div key={f.key}>
                    <div className="flex items-baseline gap-2 mb-2.5">
                      <label className="text-sm font-semibold text-gray-900">{f.label} 키워드</label>
                      <span className="text-[10px] text-gray-400">선택</span>
                    </div>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={(filterParams as unknown as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setFilterParams({ ...filterParams, [f.key]: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}

                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">시뮬레이션 인원</label>
                    <span className="text-[10px] text-gray-400">많을수록 통계 정확도 향상</span>
                  </div>
                  <div className="flex gap-2">
                    {([50, 100, 200] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => setSimulationN(n)}
                        className={[
                          'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          simulationN === n
                            ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {n}명{n === 100 ? ' (기본)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {simulationN === 50 ? '±13.9% 오차 · ~2분' : simulationN === 100 ? '±9.8% 오차 · ~3~4분' : '±6.9% 오차 · ~6~7분'} (Groq free tier 기준)
                  </p>
                </div>

                {isReady && (
                  <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
                    {castLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
                        매칭 중…
                      </div>
                    ) : totalCount > 0 ? (
                      <>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 mb-3">
                          시뮬레이션 참가자 — {previewPersonas.length}명 미리보기 (전체 {totalCount.toLocaleString()}명)
                        </div>
                        <div className="flex flex-col gap-3">
                          {previewPersonas.map((p, i) => (
                            <PersonaSpecCard key={i} persona={p} index={i} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-rose-600 font-medium">해당 조건의 페르소나가 없습니다.</div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={runAnalysis}
                  disabled={!isReady || totalCount === 0}
                  className={[
                    'w-full px-5 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition',
                    isReady && totalCount > 0
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  시뮬레이션 실행
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
