import { useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
  type NodeProps,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useApp } from '@/context/AppContext'
import { NodeDetailPanel } from '@/components/result/NodeDetailPanel'
import type { PerScreenResult } from '@/types'

const RISK_BORDER: Record<string, string> = {
  ok: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
}

const RISK_BG: Record<string, string> = {
  ok: 'rgba(16,185,129,0.15)',
  warning: 'rgba(245,158,11,0.15)',
  critical: 'rgba(239,68,68,0.15)',
}

interface ResultNodeData extends Record<string, unknown> {
  label: string
  objectUrl: string
  screenData?: PerScreenResult
}

function ResultNode({ data, selected }: NodeProps) {
  const d = data as ResultNodeData
  const risk = d.screenData?.risk_level ?? 'ok'
  const frictionPct = Math.round((d.screenData?.friction_rate ?? 0) * 100)

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg transition-all"
      style={{
        width: 130,
        border: `2px solid ${RISK_BORDER[risk]}`,
        boxShadow: selected ? `0 0 0 3px ${RISK_BORDER[risk]}40` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <div className="relative">
        <img
          src={d.objectUrl}
          alt={d.label}
          style={{ width: 130, height: 96, objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ backgroundColor: RISK_BG[risk] }} />
      </div>
      <div
        className="px-1.5 py-1 text-xs font-medium text-white truncate"
        style={{ backgroundColor: RISK_BORDER[risk] }}
      >
        {d.label} · {frictionPct}%
      </div>
    </div>
  )
}

function DropoutEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as { dropout?: number }
  const dropout = edgeData.dropout ?? 0
  const pct = Math.round(dropout * 100)

  const color =
    dropout >= 0.7 ? '#ef4444' :
    dropout >= 0.4 ? '#f59e0b' :
    '#6366f1'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: color, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className={[
            'px-1.5 py-0.5 rounded text-xs font-semibold text-white',
            dropout >= 0.7 ? 'bg-red-500' :
            dropout >= 0.4 ? 'bg-amber-500' :
            'bg-indigo-500',
          ].join(' ')}
        >
          ↓{pct}%
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { resultNode: ResultNode }
const edgeTypes = { dropoutEdge: DropoutEdge }

export function ResultCanvasScreen() {
  const { result, reset, files, flowEdges } = useApp()
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null)
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({})

  const perScreen = result?.per_screen ?? {}
  const edgeDropout = result?.edge_dropout ?? {}

  useEffect(() => {
    const map: Record<string, string> = {}
    files.forEach(f => { map[f.name] = URL.createObjectURL(f) })
    setObjectUrls(map)
    return () => { Object.values(map).forEach(URL.revokeObjectURL) }
  }, [files])

  const nodes: Node[] = useMemo(() => {
    return files.map((f, i) => ({
      id: f.name,
      type: 'resultNode',
      position: { x: i * 220 + 40, y: 100 },
      data: {
        label: f.name,
        objectUrl: objectUrls[f.name] ?? '',
        screenData: perScreen[f.name],
      } as ResultNodeData,
      selectable: true,
      draggable: false,
    }))
  }, [files, objectUrls, perScreen])

  const edges: Edge[] = useMemo(() => {
    return flowEdges.map((fe, i) => {
      const key = `${fe.source}|${fe.target}`
      return {
        id: `e-${i}`,
        source: fe.source,
        target: fe.target,
        type: 'dropoutEdge',
        data: { dropout: edgeDropout[key] ?? 0 },
        markerEnd: { type: MarkerType.ArrowClosed },
      }
    })
  }, [flowEdges, edgeDropout])

  function onNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedScreen(node.id)
  }

  function onPaneClick() {
    setSelectedScreen(null)
  }

  async function exportResult() {
    const text = JSON.stringify({ per_screen: perScreen, edge_dropout: edgeDropout }, null, 2)
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 flex-shrink-0">
        <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          ← 새 분석
        </button>
        <div className="text-sm font-semibold text-slate-300">
          이탈률 {Math.round((result?.abandonment_rate ?? 0) * 100)}%
          <span className="ml-2 text-xs text-slate-500 font-normal">
            ({result?.total_simulated ?? 0}명 시뮬)
          </span>
        </div>
        <button
          onClick={exportResult}
          className="text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-3 py-1"
        >
          ⤓ Export
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-60 flex-shrink-0 border-r border-slate-800 overflow-y-auto">
          <NodeDetailPanel
            selectedScreen={selectedScreen}
            perScreen={perScreen}
            result={result}
            onClose={() => setSelectedScreen(null)}
          />
        </div>

        {/* Result canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            className="bg-slate-950"
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls className="!bg-slate-900 !border-slate-700" />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
