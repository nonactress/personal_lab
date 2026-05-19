import type { AnalysisResult, PreviewPersona } from '@/types'

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
  if (!res.ok) throw new Error('build-cast')
  return res.json()
}

export interface AnalyzeParams {
  strataKeys: string[]
  task: string
  files?: File[]
  targetUrl?: string
}

export async function analyze(params: AnalyzeParams): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('strata_keys', JSON.stringify(params.strataKeys))
  formData.append('task', params.task || '서비스 탐색하기')
  if (params.targetUrl) {
    formData.append('target_url', params.targetUrl)
  } else if (params.files) {
    for (const file of params.files) formData.append('files', file)
  }
  const res = await fetch('/analyze', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('backend')
  return res.json()
}
