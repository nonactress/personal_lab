import type { AnalysisResult, PreviewPersona, FlowEdge } from '@/types'

export interface BuildCastParams {
  age_group: string
  sex: string
  education: string
  region: string
}

export interface BuildCastResponse {
  matched_strata: string[]
  total_count: number
  preview_personas: PreviewPersona[]
}

export async function buildCast(params: BuildCastParams): Promise<BuildCastResponse> {
  const res = await fetch('/build-cast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || 'build-cast')
  }
  return res.json()
}

export interface AnalyzeParams {
  strataKeys: string[]
  task: string
  files?: File[]
  flowEdges?: FlowEdge[]
}

export async function analyze(params: AnalyzeParams): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('strata_keys', JSON.stringify(params.strataKeys))
  formData.append('task', params.task || '서비스 탐색하기')
  formData.append('flow_edges', JSON.stringify(params.flowEdges ?? []))
  if (params.files) {
    for (const file of params.files) formData.append('files', file)
  }
  const res = await fetch('/analyze', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || 'backend')
  }
  return res.json()
}
