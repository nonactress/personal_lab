import { useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
  ok:       '#10b981',
  warning:  '#f59e0b',
  critical: '#ef4444',
}

const RISK_BG: Record<string, string> = {
  ok:       'rgba(16,185,129,0.15)',
  warning:  'rgba(245,158,11,0.20)',
  critical: 'rgba(239,68,68,0.20)',
}

const RISK_RING: Record<string, string> = {
  ok:       'rgba(16,185,129,0.25)',
  warning:  'rgba(245,158,11,0.25)',
  critical: 'rgba(239,68,68,0.25)',
}

interface ResultNodeData extends Record<string, unknown> {
  label: string
  objectUrl: string
  screenData?: PerScreenResult
  onThumbnailClick?: (name: string) => void
}

function ResultNode({ data, selected }: NodeProps) {
  const d = data as ResultNodeData
  const risk = d.screenData?.risk_level ?? 'ok'
  const frictionPct = Math.round((d.screenData?.friction_rate ?? 0) * 100)
  const border = RISK_BORDER[risk]
  const issueCount = d.screenData?.issues?.length ?? 0

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{
        width: 180,
        border: `2px solid ${border}`,
        boxShadow: selected
          ? `0 0 0 4px ${RISK_RING[risk]}, 0 8px 24px -8px rgb(0 0 0 / 0.12)`
          : '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        background: 'white',
      }}
    >
      <Handle type="target" position={Position.Left}   className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Right}  className="!opacity-0 !pointer-events-none" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!opacity-0 !pointer-events-none" />

      {/* Thumbnail + overlay */}
      <div
        className="relative group"
        style={{ height: 120, cursor: 'zoom-in' }}
        onClick={() => d.onThumbnailClick?.(d.label)}
      >
        {d.objectUrl ? (
          <img
            src={d.objectUrl}
            alt={d.label}
            style={{ width: 180, height: 120, objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
        ) : (
          <div className="ss-stripe bg-gray-100 w-full h-full flex items-center justify-center">
            <span className="font-mono text-[10px] text-gray-500">{d.label}</span>
          </div>
        )}
        {/* Color tint overlay */}
        <div className="absolute inset-0" style={{ backgroundColor: RISK_BG[risk] }} />
        {/* Hover zoom hint */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <span className="text-white text-[10px] font-medium bg-black/50 px-2 py-1 rounded">🔍 확대</span>
        </div>
        {/* Severity dot */}
        <span
          className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white shadow"
          style={{ backgroundColor: border }}
        />
        {issueCount > 0 && (
          <span
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white shadow-sm"
            style={{ color: border }}
          >
            {issueCount}건
          </span>
        )}
        {selected && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white shadow-sm"
            style={{ color: border }}
          >
            SELECTED
          </span>
        )}
      </div>

      {/* Label bar */}
      <div
        className="px-2.5 py-1.5 flex items-center justify-between text-white"
        style={{ backgroundColor: border }}
      >
        <span className="font-mono text-[11px] truncate font-medium flex-1">{d.label}</span>
        <span className="text-[10px] font-bold tabular-nums ml-1">{frictionPct}%</span>
      </div>
    </div>
  )
}

function dotColor(count: number) {
  if (count >= 40) return '#ef4444'
  if (count >= 15) return '#f59e0b'
  return '#3b82f6'
}

function dotSize(count: number) {
  return 8 + Math.min(count / 3, 14)
}

function ScreenZoomModal({
  screenName,
  objectUrl,
  screenData,
  onClose,
}: {
  screenName: string
  objectUrl: string
  screenData?: PerScreenResult
  onClose: () => void
}) {
  const issues = screenData?.issues ?? []
  const positions = screenData?.element_positions ?? {}
  const totalAffected = issues.reduce((sum, iss) => sum + iss.count, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{screenName}</span>
            {totalAffected > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {totalAffected}명 이슈 감지
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Screenshot with dot overlay */}
          <div className="relative w-full">
            <img
              src={objectUrl}
              alt={screenName}
              className="w-full rounded-lg border border-gray-200 block"
            />
            {issues.map((iss) => {
              const pos = positions[iss.element]
              if (!pos) return null
              const [x, y, w, h] = pos
              const cx = x + w / 2
              const cy = y + h / 2
              const size = dotSize(iss.count)
              const color = dotColor(iss.count)
              return (
                <div
                  key={iss.element}
                  title={`${iss.element}: ${iss.reason} (${iss.count}명)`}
                  style={{
                    position: 'absolute',
                    left: `${cx}%`,
                    top: `${cy}%`,
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid white',
                    boxShadow: `0 0 0 2px ${color}66, 0 2px 6px rgba(0,0,0,0.3)`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'default',
                    zIndex: 10,
                  }}
                />
              )
            })}
          </div>

          {/* Issue list */}
          {issues.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">이슈 목록</div>
              {issues.map((iss) => {
                const color = dotColor(iss.count)
                const hasPos = !!positions[iss.element]
                return (
                  <div
                    key={iss.element}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800">{iss.element}</span>
                        <span className="text-[10px] tabular-nums text-gray-500 bg-gray-200 px-1.5 rounded">{iss.count}명</span>
                        {!hasPos && (
                          <span className="text-[9px] text-gray-400 italic">위치 미감지</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{iss.reason}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {issues.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">이 화면에서 감지된 이슈 없음</div>
          )}
        </div>
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
    '#3b82f6'

  const borderColor =
    dropout >= 0.7 ? '#fca5a5' :
    dropout >= 0.4 ? '#fcd34d' :
    '#93c5fd'

  const textColor =
    dropout >= 0.7 ? '#b91c1c' :
    dropout >= 0.4 ? '#92400e' :
    '#1e40af'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 2.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
            borderColor,
            color: textColor,
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border shadow-sm"
        >
          <span style={{ color: textColor, fontSize: 10 }}>↓</span>
          <span style={{ color: textColor, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
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
  const [zoomScreen, setZoomScreen] = useState<string | null>(null)

  const perScreen = result?.per_screen ?? {}
  const edgeDropout = result?.edge_dropout ?? {}
  const abandonmentPct = Math.round((result?.abandonment_rate ?? 0) * 100)
  const overallRisk = result?.risk_level ?? 'ok'

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
      position: { x: i * 260 + 60, y: 120 },
      data: {
        label: f.name,
        objectUrl: objectUrls[f.name] ?? '',
        screenData: perScreen[f.name],
        onThumbnailClick: (name: string) => setZoomScreen(name),
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
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
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

  const riskPillStyle =
    overallRisk === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-700' :
    overallRisk === 'warning'  ? 'bg-amber-50 border-amber-200 text-amber-700' :
    'bg-emerald-50 border-emerald-200 text-emerald-700'

  const riskDotStyle =
    overallRisk === 'critical' ? 'bg-rose-500' :
    overallRisk === 'warning'  ? 'bg-amber-500' :
    'bg-emerald-500'

  const zoomScreenData = zoomScreen ? perScreen[zoomScreen] : undefined
  const zoomObjectUrl = zoomScreen ? (objectUrls[zoomScreen] ?? '') : ''

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {zoomScreen && (
        <ScreenZoomModal
          screenName={zoomScreen}
          objectUrl={zoomObjectUrl}
          screenData={zoomScreenData}
          onClose={() => setZoomScreen(null)}
        />
      )}
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 bg-white">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
          </svg>
          새 분석
        </button>

        <div className="h-5 w-px bg-gray-200"></div>

        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="font-mono text-gray-500">
            {'분석 완료'}
          </span>
          <span className="text-gray-300">·</span>
          <span className="font-mono text-gray-500">
            {files.length} screens · {flowEdges.length} edges
          </span>
        </div>

        <div className="flex-1"></div>

        {/* Overall friction pill */}
        <div className={['inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border whitespace-nowrap', riskPillStyle].join(' ')}>
          <span className={['w-1.5 h-1.5 rounded-full', riskDotStyle].join(' ')}></span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">최종 이탈률</span>
          <span className="text-sm font-bold tabular-nums">{abandonmentPct}%</span>
        </div>

        <button
          onClick={exportResult}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 border border-gray-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800">
          Share
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <NodeDetailPanel
            selectedScreen={selectedScreen}
            perScreen={perScreen}
            result={result}
            onClose={() => setSelectedScreen(null)}
          />
        </aside>

        {/* Result canvas */}
        <div className="flex-1 relative dot-grid">
          {/* Hint */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white shadow-card border border-gray-200 text-[10px] text-gray-500 font-mono whitespace-nowrap pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span>썸네일 클릭 → 확대+오버레이 / 라벨 클릭 → 좌측 패널</span>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-30 rounded-lg bg-white/95 backdrop-blur shadow-card border border-gray-200 px-3 py-2 pointer-events-none">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Severity</div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                <span className="text-gray-700">ok</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
                <span className="text-gray-700">warning</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                <span className="text-gray-700">critical</span>
              </span>
            </div>
          </div>

          {/* Summary chip */}
          <div className="absolute bottom-3 right-3 z-30 rounded-lg bg-white/95 backdrop-blur shadow-card border border-gray-200 px-3 py-2 flex items-center gap-3 pointer-events-none">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">시뮬</div>
              <div className="text-xs font-bold tabular-nums text-gray-900">
                {(result?.total_simulated ?? 0).toLocaleString()}명
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200"></div>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">strata</div>
              <div className="text-xs font-bold tabular-nums text-gray-900">
                {result?.total_simulated ? Math.max(1, Math.round(result.total_simulated / 450)) : '—'}
              </div>
            </div>
          </div>

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
            style={{ background: 'transparent' }}
          >
            <Background variant={BackgroundVariant.Dots} color="#d4d4d8" gap={18} size={1} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
