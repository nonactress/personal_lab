import { useApp } from '@/context/AppContext'
import { SourceScreen }       from '@/components/screens/SourceScreen'
import { TargetSelectScreen } from '@/components/screens/TargetSelectScreen'
import { ProgressScreen }     from '@/components/screens/ProgressScreen'
import { ResultScreen }       from '@/components/screens/ResultScreen'

export function App() {
  const { screen } = useApp()
  return (
    <>
      {screen === 'source'        && <SourceScreen />}
      {screen === 'target_select' && <TargetSelectScreen />}
      {screen === 'progress'      && <ProgressScreen />}
      {screen === 'result'        && <ResultScreen />}
    </>
  )
}
