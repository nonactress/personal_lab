import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { buildCast } from '@/lib/api'
import type { PreviewPersona } from '@/types'

const AGE_GROUPS     = ['10~20대', '30대', '40대', '50대', '60대+']
const SEX_OPTIONS    = ['남자', '여자', '모두']
const EDU_OPTIONS    = ['고졸이하', '전문대', '대졸', '대학원']
const REGION_OPTIONS = ['수도권', '지방', '모두']

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
          {p.persona && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.persona}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 text-[10px] font-semibold text-brand-600 hover:text-brand-800 px-2 py-1 rounded-md hover:bg-brand-50 transition-colors"
        >
          {open ? '접기' : '프롬프트'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">시뮬레이션 프롬프트 미리보기</div>
          <div className="space-y-2">
            {p.persona && (
              <div>
                <span className="text-[10px] font-semibold text-gray-500">페르소나</span>
                <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{p.persona}</p>
              </div>
            )}
            {p.professional_persona && (
              <div>
                <span className="text-[10px] font-semibold text-gray-500">직업/일상</span>
                <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{p.professional_persona}</p>
              </div>
            )}
            {p.hobbies_and_interests && (
              <div>
                <span className="text-[10px] font-semibold text-gray-500">취미/관심사</span>
                <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{p.hobbies_and_interests}</p>
              </div>
            )}
            {p.cultural_background && (
              <div>
                <span className="text-[10px] font-semibold text-gray-500">문화적 배경</span>
                <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{p.cultural_background}</p>
              </div>
            )}
            {p.skills_and_expertise && (
              <div>
                <span className="text-[10px] font-semibold text-gray-500">기술/역량</span>
                <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{p.skills_and_expertise}</p>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400">M3 시스템 프롬프트 구성</span>
              <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-2 leading-relaxed">
                {`당신은 아래 실제 한국인입니다. 절대 AI처럼 행동하지 마세요.\n\n${promptPreview}\n\n이 서비스를 처음 사용합니다. 이 사람의 시각으로만 반응하세요.`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PillGroup({ label, required = false, options, value, onChange }: {
  label: string
  required?: boolean
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2.5">
        <label className="text-sm font-semibold text-gray-900">{label}</label>
        {required
          ? <span className="text-[10px] font-semibold text-rose-600">필수</span>
          : <span className="text-[10px] text-gray-400">선택</span>
        }
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
              value === opt
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
    selectedAgeGroup, setSelectedAgeGroup,
    selectedSex, setSelectedSex,
    selectedEducation, setSelectedEducation,
    selectedRegion, setSelectedRegion,
    selectedOccupation, setSelectedOccupation,
    matchedStrata, setMatchedStrata,
    totalCount, setTotalCount,
    previewPersonas, setPreviewPersonas,
    castLoading, setCastLoading,
    error, setError,
    files,
    setScreen, setLiveThought, setResultSection,
  } = useApp()

  const targetSelectReady = !!(selectedAgeGroup && selectedSex && selectedEducation)

  async function fetchBuildCast(age: string, sex: string, edu: string, region: string, occupation: string) {
    if (!age || !sex || !edu) return
    setCastLoading(true)
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    try {
      const data = await buildCast({ age_group: age, sex, education: edu, region, occupation: occupation || undefined })
      setMatchedStrata(data.matched_strata ?? [])
      setTotalCount(data.total_count ?? 0)
      setPreviewPersonas(data.preview_personas ?? [])
    } catch {
      setError('매칭 중 오류가 발생했어요.')
    } finally {
      setCastLoading(false)
    }
  }

  function onAge(v: string)        { setSelectedAgeGroup(v);    fetchBuildCast(v,                selectedSex,       selectedEducation, selectedRegion,    selectedOccupation) }
  function onSex(v: string)        { setSelectedSex(v);         fetchBuildCast(selectedAgeGroup, v,                 selectedEducation, selectedRegion,    selectedOccupation) }
  function onEdu(v: string)        { setSelectedEducation(v);   fetchBuildCast(selectedAgeGroup, selectedSex,       v,                 selectedRegion,    selectedOccupation) }
  function onRegion(v: string)     { setSelectedRegion(v);      fetchBuildCast(selectedAgeGroup, selectedSex,       selectedEducation, v,                 selectedOccupation) }
  function onOccupation(v: string) { setSelectedOccupation(v);  fetchBuildCast(selectedAgeGroup, selectedSex,       selectedEducation, selectedRegion,    v)                 }

  function runAnalysis() {
    if (!targetSelectReady || matchedStrata.length === 0) return
    setError('')
    setLiveThought('')
    setResultSection('tldr')
    setScreen('progress')
  }

  const sourceLabel = `${files.length}개 파일`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Top bar */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <button
              onClick={() => setScreen('source')}
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
              {sourceLabel}
            </div>
          </div>

          <div className="p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">타겟 사용자 선택</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Nemotron 100만 명 데이터셋에서 해당 조건의 페르소나를 매칭합니다.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <PillGroup label="나이대" required options={AGE_GROUPS}     value={selectedAgeGroup}  onChange={onAge}    />
              <PillGroup label="성별"   required options={SEX_OPTIONS}    value={selectedSex}        onChange={onSex}    />
              <PillGroup label="학력"   required options={EDU_OPTIONS}    value={selectedEducation}  onChange={onEdu}    />
              <PillGroup label="지역"            options={REGION_OPTIONS} value={selectedRegion}     onChange={onRegion} />
              <div>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <label className="text-sm font-semibold text-gray-900">직업</label>
                  <span className="text-[10px] text-gray-400">선택</span>
                </div>
                <input
                  type="text"
                  placeholder="예: 무직, 사무, 개발자 (부분 검색)"
                  value={selectedOccupation}
                  onChange={e => onOccupation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Match result card */}
            {targetSelectReady && (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 mb-8">
                {castLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
                    매칭 중…
                  </div>
                ) : matchedStrata.length > 0 ? (
                  <>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 mb-3">
                      시뮬레이션 참가자 — {previewPersonas.length}명
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
              <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              onClick={runAnalysis}
              disabled={!targetSelectReady || matchedStrata.length === 0}
              className={[
                'w-full px-5 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition',
                targetSelectReady && matchedStrata.length > 0
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
        </div>
      </div>
    </div>
  )
}
