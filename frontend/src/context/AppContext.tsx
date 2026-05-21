import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AppContextValue, Screen, SourceMode, ResultSection,
  AnalysisResult, PreviewPersona, FlowEdge, FilterParams,
} from '@/types'
import { DEFAULT_FILTER_PARAMS } from '@/types'

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen]                   = useState<Screen>('source')
  const [sourceMode, setSourceMode]           = useState<SourceMode>('file')
  const [files, setFiles]                     = useState<File[]>([])
  const [sourcePort, setSourcePort]           = useState('')
  const [sourcePath, setSourcePath]           = useState('')
  const [sourceUrl, setSourceUrl]             = useState('')
  const [taskDesc, setTaskDesc]               = useState('')
  const [flowEdges, setFlowEdges]             = useState<FlowEdge[]>([])
  const [filterParams, setFilterParams]       = useState<FilterParams>(DEFAULT_FILTER_PARAMS)
  const [simulationN, setSimulationN]         = useState<50 | 100 | 200>(100)
  const [totalCount, setTotalCount]           = useState(0)
  const [previewPersonas, setPreviewPersonas] = useState<PreviewPersona[]>([])
  const [castLoading, setCastLoading]         = useState(false)
  const [result, setResult]                   = useState<AnalysisResult | null>(null)
  const [resultSection, setResultSection]     = useState<ResultSection>('tldr')
  const [liveThought, setLiveThought]         = useState('')
  const [error, setError]                     = useState('')

  function reset() {
    setScreen('source')
    setSourceMode('file')
    setFiles([])
    setSourcePort('')
    setSourcePath('')
    setSourceUrl('')
    setTaskDesc('')
    setFlowEdges([])
    setFilterParams(DEFAULT_FILTER_PARAMS)
    setSimulationN(100)
    setTotalCount(0)
    setPreviewPersonas([])
    setCastLoading(false)
    setResult(null)
    setResultSection('tldr')
    setLiveThought('')
    setError('')
  }

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      sourceMode, setSourceMode,
      files, setFiles,
      sourcePort, setSourcePort,
      sourcePath, setSourcePath,
      sourceUrl, setSourceUrl,
      taskDesc, setTaskDesc,
      flowEdges, setFlowEdges,
      filterParams, setFilterParams,
      simulationN, setSimulationN,
      totalCount, setTotalCount,
      previewPersonas, setPreviewPersonas,
      castLoading, setCastLoading,
      result, setResult,
      resultSection, setResultSection,
      liveThought, setLiveThought,
      error, setError,
      reset,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
