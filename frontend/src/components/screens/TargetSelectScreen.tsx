import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { buildCast } from '@/lib/api'

const AGE_GROUPS  = ['10~20대', '30대', '40대', '50대', '60대+']
const SEX_OPTIONS = ['남자', '여자', '모두']
const EDU_OPTIONS = ['고졸이하', '전문대', '대졸', '대학원']
const REGION_OPTIONS = ['수도권', '지방', '모두']

function ChipGroup({ label, required = false, options, value, onChange }: {
  label: string
  required?: boolean
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="mb-5">
      <div className="text-xs font-medium mb-2 text-slate-400">
        {label}{required && <span className="ml-1 text-slate-600">*</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              value === opt
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200',
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
    matchedStrata, setMatchedStrata,
    totalCount, setTotalCount,
    previewPersonas, setPreviewPersonas,
    castLoading, setCastLoading,
    error, setError,
    sourceMode, sourcePort, sourcePath, sourceUrl, files,
    setScreen, setLiveThought, setResultSection,
  } = useApp()

  const targetSelectReady = !!(selectedAgeGroup && selectedSex && selectedEducation)

  const sourceLabel =
    sourceMode === 'localhost' ? `localhost:${sourcePort}${sourcePath ? '/' + sourcePath : ''}`
    : sourceMode === 'url'    ? sourceUrl || 'URL'
    :                           `${files.length}개 파일`

  async function fetchBuildCast(age: string, sex: string, edu: string, region: string) {
    if (!age || !sex || !edu) return
    setCastLoading(true)
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    try {
      const data = await buildCast({ age_group: age, sex, education: edu, region })
      setMatchedStrata(data.matched_strata ?? [])
      setTotalCount(data.total_count ?? 0)
      setPreviewPersonas(data.preview_personas ?? [])
    } catch {
      setError('매칭 중 오류가 발생했어요.')
    } finally {
      setCastLoading(false)
    }
  }

  // Each chip handler passes the new value directly so state update lag doesn't matter
  function onAge(v: string)    { setSelectedAgeGroup(v);    fetchBuildCast(v,                selectedSex,       selectedEducation, selectedRegion) }
  function onSex(v: string)    { setSelectedSex(v);         fetchBuildCast(selectedAgeGroup, v,                 selectedEducation, selectedRegion) }
  function onEdu(v: string)    { setSelectedEducation(v);   fetchBuildCast(selectedAgeGroup, selectedSex,       v,                 selectedRegion) }
  function onRegion(v: string) { setSelectedRegion(v);      fetchBuildCast(selectedAgeGroup, selectedSex,       selectedEducation, v)              }

  function runAnalysis() {
    if (!targetSelectReady || matchedStrata.length === 0) return
    setError('')
    setLiveThought('')
    setResultSection('tldr')
    setScreen('progress')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('source')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">← 뒤로</button>
          <div className="font-mono text-xs tracking-widest uppercase text-blue-500">PersonaLab</div>
          <div className="text-xs font-mono text-slate-600">{sourceLabel}</div>
        </div>

        <h2 className="text-xl font-semibold mb-1 text-slate-100">타겟 사용자 선택</h2>
        <p className="text-sm mb-8 text-slate-500">Nemotron 100만 명 데이터셋에서 해당 조건 페르소나를 매칭합니다.</p>

        <ChipGroup label="나이대" required options={AGE_GROUPS}     value={selectedAgeGroup}  onChange={onAge} />
        <ChipGroup label="성별"   required options={SEX_OPTIONS}    value={selectedSex}        onChange={onSex} />
        <ChipGroup label="학력"   required options={EDU_OPTIONS}    value={selectedEducation}  onChange={onEdu} />
        <ChipGroup label="지역"            options={REGION_OPTIONS} value={selectedRegion}     onChange={onRegion} />

        {targetSelectReady && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/50">
            {castLoading ? (
              <div className="text-sm text-slate-500">매칭 중…</div>
            ) : matchedStrata.length > 0 ? (
              <>
                <div className="text-sm font-medium mb-1 text-slate-100">
                  예상 매칭: <span className="text-blue-400">{totalCount.toLocaleString()}</span>명
                </div>
                <div className="text-xs text-slate-500">
                  strata {matchedStrata.length}개 · 대표 {Math.min(matchedStrata.length * 3, 15)}명 시뮬
                </div>
                {previewPersonas.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {previewPersonas.map((p, i) => (
                      <div key={i} className="text-xs text-slate-400">
                        · {p.age}세 {p.occupation} ({p.province})
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-red-400">해당 조건의 페르소나가 없습니다.</div>
            )}
          </div>
        )}

        {error && <Alert className="mb-4">{error}</Alert>}

        <Button onClick={runAnalysis} disabled={!targetSelectReady || matchedStrata.length === 0} className="w-full">
          시뮬레이션 실행 →
        </Button>
      </div>
    </div>
  )
}
