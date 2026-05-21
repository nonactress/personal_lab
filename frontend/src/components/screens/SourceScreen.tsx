import { useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import type { SourceMode } from '@/types'

const ALLOWED_EXTS = ['.tsx', '.jsx', '.html', '.vue', '.js', '.ts', '.zip']

export function SourceScreen() {
  const {
    sourceMode, setSourceMode,
    files, setFiles,
    sourcePort, setSourcePort,
    sourcePath, setSourcePath,
    sourceUrl, setSourceUrl,
    taskDesc, setTaskDesc,
    error, setError,
    setTotalCount, setPreviewPersonas,
    setScreen,
  } = useApp()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const sourceReady =
    (sourceMode === 'file' && files.length > 0) ||
    (sourceMode === 'localhost' && sourcePort.trim().length > 0) ||
    (sourceMode === 'url' && sourceUrl.trim().length > 0)

  function addFiles(incoming: File[]) {
    const filtered = incoming.filter(f =>
      ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    setFiles([...files, ...filtered])
  }

  function removeFile(i: number) {
    setFiles(files.filter((_, idx) => idx !== i))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function proceed() {
    if (!sourceReady) return
    setError('')
    setTotalCount(0)
    setPreviewPersonas([])
    setScreen('target_select')
  }

  const chips: { mode: SourceMode; label: string }[] = [
    { mode: 'file',      label: '📄 파일 업로드' },
    { mode: 'localhost', label: '⌘ localhost' },
    { mode: 'url',       label: '🔗 URL' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">

        <div className="text-center mb-10">
          <div className="font-mono text-xs tracking-widest uppercase mb-4 text-blue-500">PersonaLab</div>
          <h1 className="text-3xl font-bold mb-2 text-slate-100">What should I look at?</h1>
          <p className="text-sm text-slate-500">Drop a file, paste a URL, or pick a localhost server.</p>
        </div>

        {error && <Alert className="mb-4">{error}</Alert>}

        {/* Mode chips */}
        <div className="flex gap-2 mb-4">
          {chips.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setSourceMode(mode)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                sourceMode === mode
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* File mode */}
        {sourceMode === 'file' && (
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tsx,.jsx,.html,.vue,.js,.ts,.zip"
              onChange={e => addFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={[
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500',
              ].join(' ')}
            >
              <svg className="mx-auto mb-3 w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <p className="text-sm font-medium text-slate-300 mb-1">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-slate-500">.tsx · .jsx · .html · .vue · .js · .ts · .zip</p>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50">
                    <span className="font-mono text-xs text-slate-400 truncate">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-slate-300 ml-2 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Localhost mode */}
        {sourceMode === 'localhost' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-400">localhost 포트</label>
            <div className="flex gap-2 items-center">
              <span className="font-mono text-sm text-slate-500 flex-shrink-0">localhost:</span>
              <Input value={sourcePort} onChange={e => setSourcePort(e.target.value)} placeholder="5173" className="w-24 font-mono" />
              <span className="text-xs text-slate-500 flex-shrink-0">/</span>
              <Input value={sourcePath} onChange={e => setSourcePath(e.target.value)} placeholder="(선택) checkout" className="flex-1 font-mono" />
            </div>
            <p className="text-xs mt-2 text-slate-600">공통 포트: 3000 · 3001 · 5173 · 5174 · 8080 · 4200</p>
          </div>
        )}

        {/* URL mode */}
        {sourceMode === 'url' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-slate-400">URL</label>
            <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://your-service.com" />
          </div>
        )}

        {/* Task */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1.5 text-slate-400">
            테스트 태스크
            <span className="ml-2 text-xs font-normal text-slate-500">유저가 수행할 목표</span>
          </label>
          <Input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="예: 회원가입하기 / 상품 장바구니에 담기 / 결제 완료하기" />
        </div>

        <Button onClick={proceed} disabled={!sourceReady}>
          다음 → 페르소나 설정
        </Button>
      </div>
    </div>
  )
}
