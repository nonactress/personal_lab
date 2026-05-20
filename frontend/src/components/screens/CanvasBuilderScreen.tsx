import { useRef, useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useApp } from '@/context/AppContext'

const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.zip']

interface ImageNodeData extends Record<string, unknown> {
  file: File
  objectUrl: string
  label: string
}

function ImageNode({ data, selected }: NodeProps) {
  const d = data as ImageNodeData
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(d.label)

  return (
    <div
      className={[
        'rounded-xl bg-white overflow-hidden transition-all',
        selected
          ? 'border-2 border-brand-500 shadow-pop ring-4 ring-brand-100'
          : 'border border-gray-300 shadow-card hover:shadow-pop hover:border-gray-400',
      ].join(' ')}
      style={{ width: 140 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-white !shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-white !shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-brand-500 !border-2 !border-white !shadow-sm"
      />

      {d.objectUrl ? (
        <img
          src={d.objectUrl}
          alt={d.label}
          style={{ width: 140, height: 88, objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      ) : (
        <div
          className="ss-stripe bg-gray-100 flex items-center justify-center"
          style={{ width: 140, height: 88 }}
        >
          <span className="font-mono text-[10px] text-gray-500">{label.split('.')[0]}</span>
        </div>
      )}

      <div
        className={[
          'px-2.5 py-1.5 border-t flex items-center gap-1.5',
          selected ? 'border-brand-100 bg-brand-50/50' : 'border-gray-200',
        ].join(' ')}
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <input
            autoFocus
            className="w-full text-[11px] font-mono bg-transparent text-gray-900 outline-none"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={() => { d.label = label; setEditing(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { d.label = label; setEditing(false) }
            }}
          />
        ) : (
          <>
            <span className="font-mono text-[11px] text-gray-900 truncate flex-1">{label}</span>
            {selected && (
              <span className="text-[9px] font-semibold uppercase text-brand-700 flex-shrink-0">selected</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { imageNode: ImageNode }
let nodeCounter = 0

export function CanvasBuilderScreen() {
  const {
    files, setFiles,
    taskDesc, setTaskDesc,
    setFlowEdges,
    setScreen,
    setSelectedAgeGroup, setSelectedSex, setSelectedEducation,
    setSelectedRegion, setMatchedStrata, setTotalCount, setPreviewPersonas,
    setError,
  } = useApp()

  const [panelOpen, setPanelOpen] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // track which filenames are placed as nodes
  const placedFiles = new Set(nodes.map(n => (n.data as ImageNodeData).file.name))

  useEffect(() => {
    const fe = edges.map(e => ({
      source: (nodes.find(n => n.id === e.source)?.data as ImageNodeData | undefined)?.label ?? e.source,
      target: (nodes.find(n => n.id === e.target)?.data as ImageNodeData | undefined)?.label ?? e.target,
    }))
    setFlowEdges(fe)
  }, [edges, nodes, setFlowEdges])

  useEffect(() => {
    return () => { Object.values(objectUrls).forEach(URL.revokeObjectURL) }
  }, [objectUrls])

  function addFiles(incoming: File[]) {
    const filtered = incoming.filter(f =>
      ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    const newUrls: Record<string, string> = {}
    filtered.forEach(f => { newUrls[f.name] = URL.createObjectURL(f) })
    setObjectUrls(prev => ({ ...prev, ...newUrls }))
    setFiles([...files, ...filtered])
  }

  function removeFile(i: number) {
    const removed = files[i]
    const url = objectUrls[removed.name]
    if (url) URL.revokeObjectURL(url)
    setObjectUrls(prev => { const n = { ...prev }; delete n[removed.name]; return n })
    setFiles(files.filter((_, idx) => idx !== i))
    setNodes(prev => prev.filter(n => (n.data as ImageNodeData).file.name !== removed.name))
  }

  const onConnect = useCallback((connection: Connection) => {
    setEdges(prev => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      style: { stroke: '#6b7280', strokeWidth: 1.75 },
    }, prev))
  }, [setEdges])

  function handleUploadDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function onCanvasDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const filename = e.dataTransfer.getData('application/personalab-file')
    if (!filename) return
    const file = files.find(f => f.name === filename)
    if (!file) return
    const bounds = reactFlowWrapper.current?.getBoundingClientRect()
    if (!bounds) return
    const position = {
      x: e.clientX - bounds.left - 70,
      y: e.clientY - bounds.top - 44,
    }
    const id = `node-${++nodeCounter}`
    const newNode: Node = {
      id,
      type: 'imageNode',
      position,
      data: { file, objectUrl: objectUrls[filename] ?? '', label: filename } as ImageNodeData,
    }
    setNodes(prev => [...prev, newNode])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      setNodes(prev => prev.filter(n => !n.selected))
      setEdges(prev => prev.filter(ed => !ed.selected))
    }
  }

  const canProceed = nodes.length >= 2 && edges.length >= 1

  function proceed() {
    if (!canProceed) return
    setError('')
    setSelectedAgeGroup('')
    setSelectedSex('')
    setSelectedEducation('')
    setSelectedRegion('모두')
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    setScreen('target_select')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Panel */}
      <aside
        className={[
          'flex flex-col border-r border-gray-200 bg-white transition-all duration-200 flex-shrink-0',
          panelOpen ? 'w-[320px]' : 'w-14',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          {panelOpen && (
            <>
              <span className="font-mono text-xs font-semibold text-brand-700">PersonaLab</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                canvas builder
              </span>
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center"
            title={panelOpen ? '패널 접기' : '패널 펼치기'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {panelOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
              }
            </svg>
          </button>
        </div>

        {panelOpen ? (
          <>
            {/* Upload zone */}
            <div className="p-4 border-b border-gray-100">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.zip"
                onChange={e => addFiles(Array.from(e.target.files || []))}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleUploadDrop}
                className={[
                  'rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition',
                  dragging
                    ? 'border-brand-400 bg-brand-50/30'
                    : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/30',
                ].join(' ')}
              >
                <svg className="w-7 h-7 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V21"/>
                </svg>
                <div className="text-xs font-medium text-gray-900">
                  스크린샷을 드래그하거나{' '}
                  <span className="text-brand-600 underline">선택</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1.5 font-mono">.png · .jpg · .webp · .zip</div>
              </div>
            </div>

            {/* Thumbnail list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">업로드된 화면</span>
                <span className="text-[10px] text-gray-400 font-mono">{files.length} / 20</span>
              </div>

              {files.length === 0 ? (
                <p className="text-xs text-gray-400 text-center mt-6">업로드된 파일 없음</p>
              ) : (
                <div className="space-y-1.5">
                  {files.map((file, i) => {
                    const placed = placedFiles.has(file.name)
                    return (
                      <div
                        key={i}
                        className={[
                          'group flex items-center gap-2.5 p-1.5 pr-2 rounded-lg border bg-white cursor-grab active:cursor-grabbing transition',
                          placed
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-brand-300 bg-brand-50/30 ring-1 ring-brand-100 hover:border-brand-400',
                        ].join(' ')}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('application/personalab-file', file.name)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                      >
                        {objectUrls[file.name] ? (
                          <img
                            src={objectUrls[file.name]}
                            alt={file.name}
                            className="w-12 h-9 object-cover rounded flex-shrink-0 ring-1 ring-gray-200 pointer-events-none"
                          />
                        ) : (
                          <div className="w-12 h-9 rounded ss-stripe bg-gray-100 flex-shrink-0 ring-1 ring-gray-200 flex items-center justify-center">
                            <span className="text-[8px] font-mono text-gray-500">{file.name.split('.')[0].slice(0,4)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate font-mono">{file.name}</div>
                          {placed ? (
                            <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500"></span> 배치됨
                            </div>
                          ) : (
                            <div className="text-[10px] text-brand-700 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-brand-500"></span> 드래그해서 배치
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="w-5 h-5 rounded text-gray-300 group-hover:text-gray-500 hover:bg-gray-100 flex items-center justify-center text-xs flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">💡 사용법</div>
                  <ul className="text-[10px] text-gray-600 space-y-0.5 leading-relaxed">
                    <li>· 썸네일을 캔버스로 드래그</li>
                    <li>· 노드 가장자리 핸들로 연결</li>
                    <li>· 한 노드에서 여러 갈래 분기 가능</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom: task + CTA */}
            <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
              <div>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <label className="text-xs font-semibold text-gray-900">태스크</label>
                  <span className="text-[10px] text-gray-400">선택</span>
                </div>
                <input
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="결제 완료 / 회원가입 (비워두면 전반 탐색)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <button
                onClick={proceed}
                disabled={!canProceed}
                className={[
                  'w-full px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition',
                  canProceed
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                다음 — 페르소나 설정
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </button>
              <div className="text-[10px] text-gray-400 text-center">
                노드 <span className="font-semibold text-gray-600">{nodes.length}</span>
                {' · '}연결 <span className="font-semibold text-gray-600">{edges.length}</span>
                {!canProceed && nodes.length < 2 && (
                  <span className="ml-1 text-gray-400">· 노드 2개 이상 필요</span>
                )}
                {!canProceed && nodes.length >= 2 && edges.length < 1 && (
                  <span className="ml-1 text-gray-400">· 연결 1개 이상 필요</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V21"/>
              </svg>
            </button>
            {files.length > 0 && (
              <span className="text-[10px] font-semibold bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {files.length}
              </span>
            )}
          </div>
        )}
      </aside>

      {/* Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative dot-grid"
        onDrop={onCanvasDrop}
        onDragOver={e => e.preventDefault()}
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          style={{ background: 'transparent' }}
        >
          <Background variant={BackgroundVariant.Dots} color="#d4d4d8" gap={18} size={1} />
          <Controls />
        </ReactFlow>

        {/* Keyboard hint */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white shadow-card border border-gray-200 text-[10px] font-mono text-gray-500 pointer-events-none">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px]">⌫</kbd>
          <span>선택 후 삭제</span>
        </div>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-gray-400 text-sm font-medium">썸네일을 캔버스로 드래그하세요</p>
              <p className="text-gray-300 text-xs mt-1">노드를 연결해 UX flow를 구성하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
