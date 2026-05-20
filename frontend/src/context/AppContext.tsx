import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AppContextValue, Screen, SourceMode, ResultSection,
  AnalysisResult, PreviewPersona, FlowEdge,
} from '@/types'

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
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedSex, setSelectedSex]         = useState('')
  const [selectedEducation, setSelectedEducation] = useState('')
  const [selectedRegion, setSelectedRegion]   = useState('모두')
  const [matchedStrata, setMatchedStrata]     = useState<string[]>([])
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
    setSelectedAgeGroup('')
    setSelectedSex('')
    setSelectedEducation('')
    setSelectedRegion('모두')
    setMatchedStrata([])
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
      selectedAgeGroup, setSelectedAgeGroup,
      selectedSex, setSelectedSex,
      selectedEducation, setSelectedEducation,
      selectedRegion, setSelectedRegion,
      matchedStrata, setMatchedStrata,
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
