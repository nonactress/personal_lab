export type Screen        = 'source' | 'target_select' | 'progress' | 'result'
export type SourceMode    = 'file' | 'localhost' | 'url'
export type ResultSection = 'tldr' | 'issues' | 'fixes' | 'code'

export interface FlowEdge {
  source: string
  target: string
}

export interface PerScreenIssue {
  element: string
  reason: string
  count: number
}

export interface PerScreenResult {
  friction_rate: number
  risk_level: 'ok' | 'warning' | 'critical'
  think_aloud: string
  issues: PerScreenIssue[]
  fix_prompts: string[]
}

export type EdgeDropout = Record<string, number>

export interface PreviewPersona {
  age: number
  occupation: string
  province: string
  persona?: string
}

export interface FrictionMapItem {
  element: string
  rate: number
  affected_count: number
  total?: number
}

export interface Top3Item {
  line_number?: number
  reason: string
  evidence: string
  severity: number
}

export interface IssuesSummary {
  critical: number
  warning: number
  info: number
}

export interface AnalysisResult {
  think_aloud: string
  think_aloud_steps: string[]
  fix_prompts: string[]
  risk_level: 'ok' | 'warning' | 'critical'
  risk_label: string
  top3: Top3Item[]
  developer_assumption: string
  friction_map: FrictionMapItem[]
  total_simulated: number
  abandonment_rate: number
  abandoned: boolean
  dropout_point?: string
  source_code?: string
  preview_html?: string
  issues_summary: IssuesSummary
  per_screen?: Record<string, PerScreenResult>
  edge_dropout?: EdgeDropout
}

export interface AppContextValue {
  screen: Screen
  setScreen: (s: Screen) => void

  sourceMode: SourceMode
  setSourceMode: (m: SourceMode) => void
  files: File[]
  setFiles: (f: File[]) => void
  sourcePort: string
  setSourcePort: (v: string) => void
  sourcePath: string
  setSourcePath: (v: string) => void
  sourceUrl: string
  setSourceUrl: (v: string) => void
  taskDesc: string
  setTaskDesc: (v: string) => void

  flowEdges: FlowEdge[]
  setFlowEdges: (v: FlowEdge[]) => void

  selectedAgeGroup: string
  setSelectedAgeGroup: (v: string) => void
  selectedSex: string
  setSelectedSex: (v: string) => void
  selectedEducation: string
  setSelectedEducation: (v: string) => void
  selectedRegion: string
  setSelectedRegion: (v: string) => void
  matchedStrata: string[]
  setMatchedStrata: (v: string[]) => void
  totalCount: number
  setTotalCount: (v: number) => void
  previewPersonas: PreviewPersona[]
  setPreviewPersonas: (v: PreviewPersona[]) => void
  castLoading: boolean
  setCastLoading: (v: boolean) => void

  result: AnalysisResult | null
  setResult: (v: AnalysisResult | null) => void
  resultSection: ResultSection
  setResultSection: (v: ResultSection) => void
  liveThought: string
  setLiveThought: (v: string) => void
  error: string
  setError: (v: string) => void

  reset: () => void
}
