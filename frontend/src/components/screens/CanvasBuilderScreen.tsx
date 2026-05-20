import { useRef, useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
        'rounded-lg border-2 overflow-hidden bg-slate-900 shadow-lg transition-all',
        selected ? 'border-blue-500' : 'border-slate-700',
      ].join(' ')}
      style={{ width: 120 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
      <img
        src={d.objectUrl}
        alt={d.label}
        style={{ width: 120, height: 88, objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
      <div
        className="px-1.5 py-1 bg-slate-800 border-t border-slate-700"
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <input
            autoFocus
            className="w-full text-xs bg-transparent text-slate-200 outline-none"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={() => { d.label = label; setEditing(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { d.label = label; setEditing(false) }
            }}
          />
        ) : (
          <span className="text-xs text-slate-400 truncate block" title={label}>{label}</span>
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

  // Sync flowEdges to context whenever edges/nodes change
  useEffect(() => {
    const fe = edges.map(e => ({
      source: (nodes.find(n => n.id === e.source)?.data as ImageNodeData | undefined)?.label ?? e.source,
      target: (nodes.find(n => n.id === e.target)?.data as ImageNodeData | undefined)?.label ?? e.target,
    }))
    setFlowEdges(fe)
  }, [edges, nodes, setFlowEdges])

  // Revoke object URLs on unmount
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
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      style: { stroke: '#6366f1', strokeWidth: 2 },
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
      x: e.clientX - bounds.left - 60,
      y: e.clientY - bounds.top - 44,
    }
    const id = `node-${++nodeCounter}`
    const newNode: Node = {
      id,
      type: 'imageNode',
      position,
      data: {
        file,
        objectUrl: objectUrls[filename] ?? '',
        label: filename,
      } as ImageNodeData,
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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Left Panel */}
      <div
        className={[
          'flex flex-col border-r border-slate-800 transition-all duration-200 flex-shrink-0',
          panelOpen ? 'w-72' : 'w-14',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
          {panelOpen && (
            <span className="font-mono text-xs text-blue-500 tracking-widest">PersonaLab</span>
          )}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="text-slate-500 hover:text-slate-300 ml-auto"
          >
            {panelOpen ? '◀' : '▶'}
          </button>
        </div>

        {panelOpen ? (
          <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
            {/* Upload zone */}
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
                'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                dragging ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500',
              ].join(' ')}
            >
              <svg className="mx-auto mb-1 w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <p className="text-xs text-slate-400">이미지 드래그 또는 클릭</p>
              <p className="text-xs text-slate-600 mt-0.5">.png .jpg .webp .zip</p>
            </div>

            {/* Thumbnail list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/personalab-file', file.name)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  {objectUrls[file.name] && (
                    <img
                      src={objectUrls[file.name]}
                      alt={file.name}
                      className="w-10 h-7 object-cover rounded flex-shrink-0 pointer-events-none"
                    />
                  )}
                  <span className="text-xs text-slate-400 truncate flex-1">{file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-slate-600 hover:text-red-400 flex-shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-xs text-slate-600 text-center mt-4">업로드된 파일 없음</p>
              )}
            </div>

            {/* Task input */}
            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs text-slate-500 mb-1">테스트 태스크</label>
              <Input
                value={taskDesc}
                onChange={e => setTaskDesc(e.target.value)}
                placeholder="예: 결제 완료하기"
                className="text-xs"
              />
              <p className="text-xs text-slate-600 mt-1">
                노드 {nodes.length}개 · 연결 {edges.length}개
              </p>
            </div>

            {/* CTA */}
            <Button onClick={proceed} disabled={!canProceed} className="w-full">
              다음 → 페르소나 설정
            </Button>
            {!canProceed && (
              <p className="text-xs text-slate-600 text-center -mt-1">
                노드 2개 이상 + 연결 1개 이상 필요
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-500 hover:text-slate-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </button>
            {files.length > 0 && (
              <span className="text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {files.length}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
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
          className="bg-slate-950"
          deleteKeyCode="Delete"
        >
          <Background color="#334155" gap={20} size={1} />
          <Controls className="!bg-slate-900 !border-slate-700" />
        </ReactFlow>
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-slate-600 text-sm">썸네일을 캔버스로 드래그하세요</p>
              <p className="text-slate-700 text-xs mt-1">노드를 연결해 UX flow를 구성하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
