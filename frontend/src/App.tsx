import { useApp } from '@/context/AppContext'
import { CanvasBuilderScreen } from '@/components/screens/CanvasBuilderScreen'
import { TargetSelectScreen }  from '@/components/screens/TargetSelectScreen'
import { ProgressScreen }      from '@/components/screens/ProgressScreen'
import { ResultCanvasScreen }  from '@/components/screens/ResultCanvasScreen'

export function App() {
  const { screen } = useApp()
  return (
    <>
      {screen === 'source'        && <CanvasBuilderScreen />}
      {screen === 'target_select' && <TargetSelectScreen />}
      {screen === 'progress'      && <ProgressScreen />}
      {screen === 'result'        && <ResultCanvasScreen />}
    </>
  )
}
