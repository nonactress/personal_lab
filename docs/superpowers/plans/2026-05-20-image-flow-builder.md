# Image Flow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드 파일 업로드 방식을 스크린샷 기반 flow 캔버스 빌더로 교체하고, 결과 화면을 analytics가 오버레이된 캔버스로 전면 교체.

**Architecture:** 3 Phase — (1) Foundation: 타입/의존성/컨텍스트, (2) Claude design 핸드오프: UI 스켈레톤 컴포넌트 생성, (3) 로직 와이어링 + 백엔드 비전 파이프라인.

**Tech Stack:** React 18 + TypeScript + @xyflow/react + shadcn/ui + Tailwind + FastAPI + Groq vision LLM

---

## 🏗 File Map

### 신규 생성
- `frontend/src/components/screens/CanvasBuilderScreen.tsx` — 이미지 업로드 패널 + React Flow 캔버스
- `frontend/src/components/screens/ResultCanvasScreen.tsx` — 결과 오버레이 캔버스 + 좌측 패널
- `frontend/src/components/result/NodeDetailPanel.tsx` — 선택된 노드의 CoT/이슈/Fix 패널

### 수정
- `frontend/package.json` — `@xyflow/react` 추가
- `frontend/src/types.ts` — `Screen` 타입 변경, `FlowEdge` / `PerScreenResult` / `EdgeDropout` 추가
- `frontend/src/context/AppContext.tsx` — `flowEdges`, `selectedNodeFile` 상태 추가
- `frontend/src/lib/api.ts` — `flow_edges` 전송, `per_screen` / `edge_dropout` 수신
- `frontend/src/App.tsx` — 새 스크린 라우팅
- `src/backend/api.py` — `flow_edges` 수신, `target_url` 제거
- `src/core/m1_analyzer.py` — vision 분석으로 교체
- `src/core/logic.py` — per-screen 파이프라인 + 응답 구조 추가

### 삭제
- `frontend/src/components/screens/SourceScreen.tsx`
- `frontend/src/components/screens/ResultScreen.tsx`
- `frontend/src/components/result/TldrSection.tsx`
- `frontend/src/components/result/IssuesSection.tsx`
- `frontend/src/components/result/FixesSection.tsx`
- `frontend/src/components/result/CodeSection.tsx`

---

## ⚙️ Phase 1: Foundation

### Task 1: @xyflow/react 설치 + 타입 업데이트

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: 의존성 설치**

```bash
cd frontend
npm install @xyflow/react
```

Expected: `node_modules/@xyflow/react` 생성, `package.json`에 추가됨.

- [ ] **Step 2: types.ts 전면 교체**

`frontend/src/types.ts` 전체를 아래로 교체:

```ts
export type Screen        = 'canvas_builder' | 'target_select' | 'progress' | 'result'
export type SourceMode    = 'file'
export type ResultSection = 'tldr' | 'issues' | 'fixes' | 'code'

export interface FlowEdge {
  source: string  // 파일명 (예: "home.png")
  target: string  // 파일명 (예: "product.png")
}

export interface PreviewPersona {
  age: number
  occupation: string
  province: string
  persona?: string
}

export interface FrictionMapItem {
  element: string
  rate: number
  affected_count: number
  total?: number
}

export interface Top3Item {
  line_number?: number
  reason: string
  evidence: string
  severity: number
}

export interface IssuesSummary {
  critical: number
  warning: number
  info: number
}

export interface PerScreenResult {
  think_aloud: string
  issues: Top3Item[]
  fix_prompts: string[]
  friction_rate: number
  risk_level: 'ok' | 'warning' | 'critical'
}

export interface AnalysisResult {
  think_aloud: string
  think_aloud_steps: string[]
  fix_prompts: string[]
  risk_level: 'ok' | 'warning' | 'critical'
  risk_label: string
  top3: Top3Item[]
  developer_assumption: string
  friction_map: FrictionMapItem[]
  total_simulated: number
  abandonment_rate: number
  abandoned: boolean
  dropout_point?: string
  source_code?: string
  preview_html?: string
  issues_summary: IssuesSummary
  // 신규
  per_screen: Record<string, PerScreenResult>     // key = 파일명
  edge_dropout: Record<string, number>            // key = "a.png|b.png"
}

export interface AppContextValue {
  screen: Screen
  setScreen: (s: Screen) => void

  files: File[]
  setFiles: (f: File[]) => void
  flowEdges: FlowEdge[]
  setFlowEdges: (v: FlowEdge[]) => void
  taskDesc: string
  setTaskDesc: (v: string) => void

  selectedNodeFile: string | null
  setSelectedNodeFile: (v: string | null) => void

  selectedAgeGroup: string
  setSelectedAgeGroup: (v: string) => void
  selectedSex: string
  setSelectedSex: (v: string) => void
  selectedEducation: string
  setSelectedEducation: (v: string) => void
  selectedRegion: string
  setSelectedRegion: (v: string) => void
  matchedStrata: string[]
  setMatchedStrata: (v: string[]) => void
  totalCount: number
  setTotalCount: (v: number) => void
  previewPersonas: PreviewPersona[]
  setPreviewPersonas: (v: PreviewPersona[]) => void
  castLoading: boolean
  setCastLoading: (v: boolean) => void

  result: AnalysisResult | null
  setResult: (v: AnalysisResult | null) => void
  liveThought: string
  setLiveThought: (v: string) => void
  error: string
  setError: (v: string) => void

  reset: () => void
}
```

- [ ] **Step 3: 타입 오류 없이 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 오류 있음 — AppContext, api.ts 등 아직 업데이트 전이므로 정상.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/types.ts
git commit -m "feat: add @xyflow/react dep and expand types for flow builder"
```

---

### Task 2: AppContext + api.ts 업데이트

**Files:**
- Modify: `frontend/src/context/AppContext.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: AppContext.tsx 전면 교체**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  AppContextValue, Screen, AnalysisResult, PreviewPersona, FlowEdge,
} from '@/types'

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen]                     = useState<Screen>('canvas_builder')
  const [files, setFiles]                       = useState<File[]>([])
  const [flowEdges, setFlowEdges]               = useState<FlowEdge[]>([])
  const [taskDesc, setTaskDesc]                 = useState('')
  const [selectedNodeFile, setSelectedNodeFile] = useState<string | null>(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedSex, setSelectedSex]           = useState('')
  const [selectedEducation, setSelectedEducation] = useState('')
  const [selectedRegion, setSelectedRegion]     = useState('모두')
  const [matchedStrata, setMatchedStrata]       = useState<string[]>([])
  const [totalCount, setTotalCount]             = useState(0)
  const [previewPersonas, setPreviewPersonas]   = useState<PreviewPersona[]>([])
  const [castLoading, setCastLoading]           = useState(false)
  const [result, setResult]                     = useState<AnalysisResult | null>(null)
  const [liveThought, setLiveThought]           = useState('')
  const [error, setError]                       = useState('')

  function reset() {
    setScreen('canvas_builder')
    setFiles([])
    setFlowEdges([])
    setTaskDesc('')
    setSelectedNodeFile(null)
    setSelectedAgeGroup('')
    setSelectedSex('')
    setSelectedEducation('')
    setSelectedRegion('모두')
    setMatchedStrata([])
    setTotalCount(0)
    setPreviewPersonas([])
    setCastLoading(false)
    setResult(null)
    setLiveThought('')
    setError('')
  }

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      files, setFiles,
      flowEdges, setFlowEdges,
      taskDesc, setTaskDesc,
      selectedNodeFile, setSelectedNodeFile,
      selectedAgeGroup, setSelectedAgeGroup,
      selectedSex, setSelectedSex,
      selectedEducation, setSelectedEducation,
      selectedRegion, setSelectedRegion,
      matchedStrata, setMatchedStrata,
      totalCount, setTotalCount,
      previewPersonas, setPreviewPersonas,
      castLoading, setCastLoading,
      result, setResult,
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
```

- [ ] **Step 2: api.ts 업데이트**

`frontend/src/lib/api.ts` 전체 교체:

```ts
import type { AnalysisResult, PreviewPersona, FlowEdge } from '@/types'

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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || 'build-cast')
  }
  return res.json()
}

export interface AnalyzeParams {
  strataKeys: string[]
  task: string
  files: File[]
  flowEdges: FlowEdge[]
}

export async function analyze(params: AnalyzeParams): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('strata_keys', JSON.stringify(params.strataKeys))
  formData.append('task', params.task || '서비스 전반 탐색하기')
  formData.append('flow_edges', JSON.stringify(params.flowEdges))
  for (const file of params.files) formData.append('files', file)

  const res = await fetch('/analyze', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || 'backend')
  }
  return res.json()
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AppContext.tsx frontend/src/lib/api.ts
git commit -m "feat: update context and api for flow-builder schema"
```

---

## 🎨 Phase 2: Claude Design 핸드오프

> **이 Phase는 Claude Code가 아닌 사용자가 claude.ai에서 진행.**
> 아래 프롬프트를 claude.ai에 붙여넣고 생성된 코드를 지정된 파일 경로에 저장.

---

### Task 3: [CLAUDE DESIGN] CanvasBuilderScreen 스켈레톤 생성

**저장 경로:** `frontend/src/components/screens/CanvasBuilderScreen.tsx`

**claude.ai에 붙여넣을 프롬프트:**

```
React + TypeScript + Tailwind CSS + @xyflow/react를 사용해서 CanvasBuilderScreen 컴포넌트의 UI 스켈레톤을 작성해줘.

## 레이아웃

전체 min-h-screen, 다크 배경 (#080f1a).

### 좌측 패널 (collapsible)
- 기본 너비: 280px. 접힌 상태: 48px (아이콘 바만)
- 패널 오른쪽 엣지에 접기/펼치기 토글 버튼 (← / →)
- 구성요소 (위→아래):
  1. "PersonaLab" 워드마크 (font-mono, text-xs, blue-500)
  2. 드래그앤드롭 업로드 존 (dashed border, 아이콘 + "스크린샷을 드래그하거나 클릭" 텍스트)
  3. 업로드된 파일 썸네일 리스트 (각 항목: 썸네일 이미지 + 파일명 + ✕ 버튼). 각 항목은 draggable="true" 속성 부여
  4. 구분선
  5. 태스크 입력 (label: "테스트 태스크", placeholder: "예: 결제 완료하기 (비워두면 전반 탐색)")
  6. "다음 → 페르소나 설정" 버튼 (하단 고정, disabled 스타일 포함)

### 우측 캔버스 영역
- flex-1, 배경 #080f1a
- 상단 힌트 텍스트: "이미지를 드래그해서 배치하고 노드를 연결하세요"
- @xyflow/react의 <ReactFlow> 컴포넌트 자리 표시자 (빈 nodes=[], edges=[] props)
- ReactFlow import: `import ReactFlow, { Background, Controls } from '@xyflow/react'`
- '@xyflow/react/dist/style.css' import
- Background variant="dots", 배경색 #080f1a
- Controls 포함

## Props / 상태 (스켈레톤이므로 실제 로직 없이 useState 선언만)
```tsx
const [isPanelOpen, setIsPanelOpen] = useState(true)
const [isDragging, setIsDragging] = useState(false)
const [nodes, setNodes] = useState([])
const [edges, setEdges] = useState([])
```

## 스타일 가이드
- 배경: #080f1a (전체), #0d1a2b (패널)
- 보더: #1e293b (패널 구분선), #334155 (요소)
- 텍스트: slate-100 (주), slate-400 (보조), slate-600 (힌트)
- 액센트: blue-500 (#3b82f6)
- 버튼: bg-blue-600 hover:bg-blue-500, disabled:opacity-40 disabled:cursor-not-allowed

## 중요
- 실제 상태 관리 로직(파일 읽기, 노드 추가 등)은 작성하지 말고 TODO 주석으로 표시
- useApp() 훅은 import하지 말 것 (나중에 연결)
- 컴포넌트 export: `export function CanvasBuilderScreen()`
```

- [ ] **Step 1: 프롬프트 실행 후 생성된 코드를 파일에 저장**

`frontend/src/components/screens/CanvasBuilderScreen.tsx` 에 붙여넣기.

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

타입 오류 있으면 수정. `@xyflow/react` 관련 import 오류는 `npm install` 확인.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/screens/CanvasBuilderScreen.tsx
git commit -m "feat: add CanvasBuilderScreen skeleton from Claude design"
```

---

### Task 4: [CLAUDE DESIGN] ResultCanvasScreen + NodeDetailPanel 스켈레톤 생성

**저장 경로:**
- `frontend/src/components/screens/ResultCanvasScreen.tsx`
- `frontend/src/components/result/NodeDetailPanel.tsx`

**claude.ai에 붙여넣을 프롬프트 (NodeDetailPanel):**

```
React + TypeScript + Tailwind CSS로 NodeDetailPanel 컴포넌트 UI 스켈레톤을 작성해줘.

## 역할
결과 화면 좌측에 고정되는 240px 패널. 캔버스에서 노드(화면)를 클릭하면 해당 화면의 CoT/이슈/Fix를 표시.

## Props 타입 (아직 import 없이 인라인으로 정의)
```tsx
interface Top3Item {
  reason: string
  evidence: string
  severity: number
  line_number?: number
}

interface PerScreenResult {
  think_aloud: string
  issues: Top3Item[]
  fix_prompts: string[]
  friction_rate: number
  risk_level: 'ok' | 'warning' | 'critical'
}

interface NodeDetailPanelProps {
  selectedFile: string | null       // 선택된 노드 파일명
  perScreen: Record<string, PerScreenResult>  // 전체 per_screen 데이터
  totalSimulated: number
  overallRiskLevel: 'ok' | 'warning' | 'critical'
  overallRiskLabel: string
  abandonmentRate: number
  onClose: () => void
}
```

## 미선택 상태 (selectedFile === null)
- PersonaLab 워드마크 (mono, blue-500)
- 전체 리스크 배너 (risk_level에 따라 green/amber/red 배경+보더)
- 전체 이탈률 텍스트
- 시뮬 인원 텍스트
- 안내 문구: "노드를 클릭하면 해당 화면의 상세 분석을 볼 수 있어요"

## 선택 상태 (selectedFile !== null)
섹션 순서:
1. **헤더**: 파일명(화면 이름) + HIGH/MED/LOW 뱃지 + ✕ 닫기 버튼
2. **Think-aloud** (mono label "Think-aloud" + italic 텍스트)
3. **구분선**
4. **Issues** (label "Issues" + 이슈 카드 리스트, severity에 따라 red/amber/blue 보더)
5. **구분선**
6. **Fix Prompt** (label "Fix Prompt" + "복사" 버튼 + readOnly textarea)

## 스타일 가이드
- 패널 배경: #0d1a2b
- 보더: #1e293b (우측 경계)
- 뱃지: HIGH=red-500 bg, MED=amber-500 bg, LOW=blue-500 bg
- 패널 전체 overflow-y: auto, 패딩 px-4 py-5

## 중요
- 실제 복사 로직은 TODO 주석으로
- export: `export function NodeDetailPanel(props: NodeDetailPanelProps)`
```

**claude.ai에 붙여넣을 프롬프트 (ResultCanvasScreen):**

```
React + TypeScript + Tailwind CSS + @xyflow/react로 ResultCanvasScreen 컴포넌트 UI 스켈레톤을 작성해줘.

## 레이아웃
전체 flex min-h-screen.

### 좌측 (NodeDetailPanel 자리)
NodeDetailPanel을 import해서 배치:
```tsx
import { NodeDetailPanel } from '@/components/result/NodeDetailPanel'
```
props는 모두 더미값으로 전달 (selectedFile={null}, perScreen={{}}, 등)

### 우측 메인 (flex-1)
#### 상단 헤더 바 (h-12, border-b #1e293b)
- 좌: "← 새 분석" 버튼 (text-slate-400)
- 중앙: 이탈률 텍스트 "이탈률 --%"
- 우: "⤓ Export" 버튼 (outline variant)

#### 캔버스 영역 (flex-1)
@xyflow/react <ReactFlow> 컴포넌트:
- nodes=[], edges=[] (빈 더미)
- Background variant="dots", 배경 #080f1a
- Controls
- 노드 클릭 핸들러 onNodeClick 자리: `// TODO: onNodeClick`

## 커스텀 노드 타입 (ResultNode)
별도 컴포넌트로 같은 파일 내에 정의:
```tsx
function ResultNode({ data }: { data: { label: string; riskLevel: string; frictionRate: number; imageUrl?: string } }) {
  // risk_level에 따른 보더 컬러: ok=#10b981, warning=#f59e0b, critical=#ef4444
  // 구조: 이미지 썸네일 (또는 빈 회색 박스) + 하단 라벨 바 (화면명 + 마찰률%)
  // 크기: w-[100px] h-[90px]
}
```
nodeTypes={{ resultNode: ResultNode }} 로 ReactFlow에 전달.

## 중요
- 실제 결과 데이터 연결은 TODO 주석으로
- '@xyflow/react/dist/style.css' import 포함
- export: `export function ResultCanvasScreen()`
```

- [ ] **Step 1: 두 파일 저장**

생성된 코드를 각각 저장:
- `frontend/src/components/screens/ResultCanvasScreen.tsx`
- `frontend/src/components/result/NodeDetailPanel.tsx`

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/screens/ResultCanvasScreen.tsx \
        frontend/src/components/result/NodeDetailPanel.tsx
git commit -m "feat: add ResultCanvasScreen and NodeDetailPanel skeletons from Claude design"
```

---

## 🔌 Phase 3: 로직 와이어링

> Claude Code가 스켈레톤에 실제 로직을 연결하는 Phase.
> Phase 2 완료 후 시작.

---

### Task 5: CanvasBuilderScreen 로직 와이어링

**Files:**
- Modify: `frontend/src/components/screens/CanvasBuilderScreen.tsx`

- [ ] **Step 1: useApp + React Flow 콜백 연결**

스켈레톤 파일의 `TODO` 주석 부분을 아래 로직으로 교체:

```tsx
// 파일 상단 import 추가
import { useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { useNodesState, useEdgesState, addEdge, type Connection, type Node, type Edge } from '@xyflow/react'

// 컴포넌트 내부 — useState 선언 아래에 추가
const { files, setFiles, flowEdges, setFlowEdges, taskDesc, setTaskDesc, setSelectedAgeGroup, setSelectedSex, setSelectedEducation, setSelectedRegion, setMatchedStrata, setTotalCount, setPreviewPersonas, setScreen, error, setError } = useApp()

// nodes/edges → React Flow 상태로 교체 (기존 useState 대신)
const [nodes, setNodes, onNodesChange] = useNodesState([])
const [edges, setEdges, onEdgesChange] = useEdgesState([])

// CTA 활성화 조건
const canProceed = nodes.length >= 2 && edges.length >= 1

// 파일 추가
const ALLOWED = ['.png', '.jpg', '.jpeg', '.webp', '.zip']
function addFiles(incoming: File[]) {
  const filtered = incoming.filter(f => ALLOWED.some(ext => f.name.toLowerCase().endsWith(ext)))
  setFiles([...files, ...filtered])
}

// 썸네일 패널에서 캔버스로 드래그 드롭
function handleCanvasDrop(e: React.DragEvent) {
  e.preventDefault()
  const fileName = e.dataTransfer.getData('text/plain')
  const file = files.find(f => f.name === fileName)
  if (!file) return
  const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const position = { x: e.clientX - bounds.left - 50, y: e.clientY - bounds.top - 45 }
  const newNode: Node = {
    id: fileName,
    type: 'imageNode',
    position,
    data: { label: fileName, file },
  }
  setNodes(prev => [...prev, newNode])
}

// 엣지 연결
const onConnect = useCallback((connection: Connection) => {
  setEdges(prev => addEdge(connection, prev))
}, [setEdges])

// flowEdges 동기화 (edges → FlowEdge[])
useCallback(() => {
  setFlowEdges(edges.map(e => ({ source: String(e.source), target: String(e.target) })))
}, [edges, setFlowEdges])

// 다음으로 진행
function proceed() {
  if (!canProceed) return
  setFlowEdges(edges.map(e => ({ source: String(e.source), target: String(e.target) })))
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
```

- [ ] **Step 2: 커스텀 노드 타입 (ImageNode) 추가**

컴포넌트 상단 (export function 밖)에 추가:

```tsx
import type { NodeProps } from '@xyflow/react'

function ImageNode({ data }: NodeProps<{ label: string; file: File }>) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(data.file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [data.file])

  return (
    <div className="w-[100px] rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-800 cursor-grab">
      {url && <img src={url} alt={data.label} className="w-full h-[64px] object-cover" />}
      <div className="px-1 py-0.5 text-[9px] text-slate-400 truncate bg-slate-800">{data.label}</div>
    </div>
  )
}

const nodeTypes = { imageNode: ImageNode }
```

ReactFlow에 `nodeTypes={nodeTypes}` prop 추가, `onConnect={onConnect}`, `onNodesChange={onNodesChange}`, `onEdgesChange={onEdgesChange}` 추가.

캔버스 div에 `onDrop={handleCanvasDrop}` `onDragOver={e => e.preventDefault()}` 추가.

썸네일 리스트 각 항목에 `draggable onDragStart={e => e.dataTransfer.setData('text/plain', file.name)}` 추가.

"다음" 버튼에 `onClick={proceed}` `disabled={!canProceed}` 연결.

- [ ] **Step 3: 확인**

```bash
cd frontend && npm run dev
```

브라우저 `http://localhost:5173` — 스크린샷 업로드, 캔버스에 드래그, 연결 후 "다음" 버튼 활성화 확인.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/screens/CanvasBuilderScreen.tsx
git commit -m "feat: wire CanvasBuilderScreen logic — drag-drop nodes, edge connect, proceed"
```

---

### Task 6: ResultCanvasScreen + NodeDetailPanel 로직 와이어링

**Files:**
- Modify: `frontend/src/components/screens/ResultCanvasScreen.tsx`
- Modify: `frontend/src/components/result/NodeDetailPanel.tsx`

- [ ] **Step 1: ResultCanvasScreen에 useApp + 결과 데이터 연결**

```tsx
// 파일 상단 import 추가
import { useApp } from '@/context/AppContext'
import { useNodesState, useEdgesState, type NodeMouseHandler } from '@xyflow/react'

// 컴포넌트 내부
const { result, reset, selectedNodeFile, setSelectedNodeFile } = useApp()

// result가 없으면 null 반환
if (!result) return null

// 노드 생성 (result.per_screen 기반)
const [nodes] = useNodesState(
  Object.entries(result.per_screen).map(([fileName, data], i) => ({
    id: fileName,
    type: 'resultNode',
    position: { x: 60 + i * 160, y: 100 },
    data: {
      label: fileName.replace(/\.[^.]+$/, ''),
      riskLevel: data.risk_level,
      frictionRate: data.friction_rate,
    },
    draggable: true,
  }))
)

// 엣지 생성 (result.edge_dropout 기반)
const [edges] = useEdgesState(
  Object.entries(result.edge_dropout).map(([key, rate]) => {
    const [source, target] = key.split('|')
    const pct = Math.round(rate * 100)
    const color = rate >= 0.7 ? '#ef4444' : rate >= 0.4 ? '#f59e0b' : '#3b82f6'
    return {
      id: key,
      source,
      target,
      label: `↓${pct}%`,
      style: { stroke: color },
      labelStyle: { fill: color, fontSize: 10 },
    }
  })
)

// 노드 클릭 핸들러
const onNodeClick: NodeMouseHandler = (_, node) => {
  setSelectedNodeFile(String(node.id))
}
```

- [ ] **Step 2: ResultNode 커스텀 컴포넌트 업데이트**

스켈레톤의 ResultNode를 아래로 교체:

```tsx
const RISK_STYLE = {
  ok:       { border: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'rgba(16,185,129,0.85)' },
  warning:  { border: '#f59e0b', bg: 'rgba(245,158,11,0.2)',  label: 'rgba(245,158,11,0.85)' },
  critical: { border: '#ef4444', bg: 'rgba(239,68,68,0.25)',  label: 'rgba(239,68,68,0.85)'  },
}

function ResultNode({ data }: NodeProps<{ label: string; riskLevel: string; frictionRate: number }>) {
  const style = RISK_STYLE[data.riskLevel as keyof typeof RISK_STYLE] ?? RISK_STYLE.ok
  return (
    <div style={{ border: `2px solid ${style.border}`, borderRadius: 8, overflow: 'hidden', width: 100, cursor: 'pointer' }}>
      <div style={{ height: 56, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 64, height: 36, background: '#334155', borderRadius: 3 }} />
      </div>
      <div style={{ background: style.label, padding: '2px 4px', fontSize: 9, color: data.riskLevel === 'warning' ? '#000' : '#fff', textAlign: 'center' }}>
        {data.label} · {Math.round(data.frictionRate * 100)}%
      </div>
    </div>
  )
}
```

- [ ] **Step 3: NodeDetailPanel props 실제 데이터 연결**

ResultCanvasScreen에서 NodeDetailPanel에 실제 props 전달:

```tsx
<NodeDetailPanel
  selectedFile={selectedNodeFile}
  perScreen={result.per_screen}
  totalSimulated={result.total_simulated}
  overallRiskLevel={result.risk_level}
  overallRiskLabel={result.risk_label}
  abandonmentRate={result.abandonment_rate}
  onClose={() => setSelectedNodeFile(null)}
/>
```

- [ ] **Step 4: NodeDetailPanel 복사 로직 추가**

NodeDetailPanel에서 Fix Prompt 복사:

```tsx
const [copied, setCopied] = useState(false)
async function copy() {
  const text = (data?.fix_prompts ?? []).join('\n\n---\n\n')
  await navigator.clipboard.writeText(text)
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

- [ ] **Step 5: 확인**

분석 완료 후 결과 화면에서:
- 노드 클릭 → 좌측 패널에 해당 화면 CoT/이슈/Fix 표시
- 캔버스 빈 영역 클릭 → 패널 초기화
- 화살표에 이탈률 % 표시

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/screens/ResultCanvasScreen.tsx \
        frontend/src/components/result/NodeDetailPanel.tsx
git commit -m "feat: wire ResultCanvasScreen overlays and NodeDetailPanel node selection"
```

---

### Task 7: App.tsx 라우팅 업데이트 + 구 파일 삭제

**Files:**
- Modify: `frontend/src/App.tsx`
- Delete: `frontend/src/components/screens/SourceScreen.tsx`
- Delete: `frontend/src/components/screens/ResultScreen.tsx`
- Delete: `frontend/src/components/result/TldrSection.tsx`
- Delete: `frontend/src/components/result/IssuesSection.tsx`
- Delete: `frontend/src/components/result/FixesSection.tsx`
- Delete: `frontend/src/components/result/CodeSection.tsx`

- [ ] **Step 1: App.tsx 교체**

```tsx
import { useApp } from '@/context/AppContext'
import { CanvasBuilderScreen } from '@/components/screens/CanvasBuilderScreen'
import { TargetSelectScreen }  from '@/components/screens/TargetSelectScreen'
import { ProgressScreen }      from '@/components/screens/ProgressScreen'
import { ResultCanvasScreen }  from '@/components/screens/ResultCanvasScreen'

export function App() {
  const { screen } = useApp()
  return (
    <>
      {screen === 'canvas_builder' && <CanvasBuilderScreen />}
      {screen === 'target_select'  && <TargetSelectScreen />}
      {screen === 'progress'       && <ProgressScreen />}
      {screen === 'result'         && <ResultCanvasScreen />}
    </>
  )
}
```

- [ ] **Step 2: ProgressScreen 업데이트**

`frontend/src/components/screens/ProgressScreen.tsx` 내 `analyze()` 호출 수정:

```tsx
// 기존 targetUrl 로직 제거, 아래로 교체
const result = await analyze({
  strataKeys: matchedStrata,
  task: taskDesc.trim() || '서비스 전반 탐색하기',
  files,
  flowEdges,
})
```

`useApp()`에서 `flowEdges` 추가 destructure:

```tsx
const { files, flowEdges, matchedStrata, taskDesc, ... } = useApp()
```

- [ ] **Step 3: 구 파일 삭제**

```bash
cd frontend/src
rm components/screens/SourceScreen.tsx
rm components/screens/ResultScreen.tsx
rm components/result/TldrSection.tsx
rm components/result/IssuesSection.tsx
rm components/result/FixesSection.tsx
rm components/result/CodeSection.tsx
```

- [ ] **Step 4: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Expected: 오류 없음.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: update routing and remove legacy result/source components"
```

---

## 🐍 Phase 4: 백엔드 업데이트

### Task 8: POST /analyze — 이미지 + flow_edges 수신

**Files:**
- Modify: `src/backend/api.py`

- [ ] **Step 1: analyze 엔드포인트 시그니처 변경**

`api.py`의 `@app.post("/analyze")` 핸들러에서:

```python
# 기존 파라미터 교체
@app.post("/analyze")
async def analyze(
    files: List[UploadFile] = File(...),
    strata_keys: str = Form(...),
    task: str = Form(default="서비스 전반 탐색하기"),
    flow_edges: str = Form(default="[]"),   # JSON string
):
    import json
    edges = json.loads(flow_edges)          # [{"source": "a.png", "target": "b.png"}]
    strata = json.loads(strata_keys)

    # 이미지 파일만 허용
    ALLOWED_IMG = {'.png', '.jpg', '.jpeg', '.webp'}
    for f in files:
        ext = Path(f.filename or '').suffix.lower()
        if ext not in ALLOWED_IMG:
            raise HTTPException(status_code=400, detail=f"이미지 파일만 허용됩니다: {f.filename}")

    # 파일 바이트 읽기
    images: dict[str, bytes] = {}
    for f in files:
        images[f.filename] = await f.read()

    result = await run_pipeline(images=images, flow_edges=edges, strata_keys=strata, task=task)
    return result
```

`target_url` 파라미터 및 관련 localhost 스캔 로직 제거.

- [ ] **Step 2: Commit**

```bash
git add src/backend/api.py
git commit -m "feat: update /analyze to accept images and flow_edges"
```

---

### Task 9: M1 — 코드 파서 → 비전 분석

**Files:**
- Modify: `src/core/m1_analyzer.py`

- [ ] **Step 1: vision 분석 함수 교체**

`m1_analyzer.py`의 메인 분석 함수를 아래로 교체:

```python
import base64
from openai import OpenAI
import os

def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

def analyze_screen(filename: str, image_bytes: bytes) -> dict:
    """단일 스크린샷 → UI 요소 설명 추출"""
    client = _groq_client()
    b64 = base64.b64encode(image_bytes).decode()
    ext = filename.rsplit('.', 1)[-1].lower()
    mime = f"image/{'jpeg' if ext in ('jpg','jpeg') else ext}"

    resp = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"},
                },
                {
                    "type": "text",
                    "text": (
                        "이 UI 스크린샷을 분석해줘. 다음 항목을 JSON으로 반환:\n"
                        "- elements: 주요 UI 요소 목록 (버튼, 입력창, 네비게이션 등)\n"
                        "- potential_issues: 잠재적 UX 문제점 목록\n"
                        "- layout_description: 레이아웃 한 줄 설명\n"
                        "JSON만 반환, 다른 텍스트 없이."
                    ),
                },
            ],
        }],
        max_tokens=512,
    )
    import json
    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {"elements": [], "potential_issues": [], "layout_description": "분석 불가"}


def analyze_images(images: dict[str, bytes]) -> dict[str, dict]:
    """모든 스크린샷 분석. 반환: {filename: analysis_result}"""
    return {name: analyze_screen(name, data) for name, data in images.items()}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/m1_analyzer.py
git commit -m "feat: replace code parser with vision analysis in M1"
```

---

### Task 10: logic.py — per_screen 파이프라인 + 응답 구조

**Files:**
- Modify: `src/core/logic.py`

- [ ] **Step 1: run_pipeline 시그니처 변경**

`logic.py`의 `run_pipeline` 함수를 아래 구조로 교체:

```python
from src.core.m1_analyzer import analyze_images

async def run_pipeline(
    images: dict[str, bytes],
    flow_edges: list[dict],
    strata_keys: list[str],
    task: str,
) -> dict:
    # M1: 각 화면 비전 분석
    screen_analyses = analyze_images(images)

    # 화면 순서 결정 (flow_edges 토폴로지 정렬)
    ordered = _topo_sort(list(images.keys()), flow_edges)

    # M2~M4: 기존 파이프라인 실행 (전체 flow 기준)
    combined_context = "\n\n".join(
        f"[{name}]\n" + str(screen_analyses.get(name, {}))
        for name in ordered
    )
    base_result = await _run_base_pipeline(combined_context, strata_keys, task)

    # per_screen 생성 (각 화면별 M3/M4 실행)
    per_screen = {}
    for name in ordered:
        screen_ctx = str(screen_analyses.get(name, {}))
        per_screen[name] = await _run_screen_pipeline(screen_ctx, strata_keys, task, name)

    # edge_dropout 계산
    edge_dropout = _calc_edge_dropout(per_screen, flow_edges)

    return {
        **base_result,
        "per_screen": per_screen,
        "edge_dropout": edge_dropout,
    }


def _topo_sort(nodes: list[str], edges: list[dict]) -> list[str]:
    """간단한 위상 정렬 (분기 지원)"""
    from collections import defaultdict, deque
    in_degree = defaultdict(int)
    graph = defaultdict(list)
    for e in edges:
        graph[e["source"]].append(e["target"])
        in_degree[e["target"]] += 1
    queue = deque(n for n in nodes if in_degree[n] == 0)
    result = []
    while queue:
        n = queue.popleft()
        result.append(n)
        for neighbor in graph[n]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    # 연결 안 된 노드는 뒤에 추가
    result += [n for n in nodes if n not in result]
    return result


def _calc_edge_dropout(per_screen: dict, edges: list[dict]) -> dict[str, float]:
    """엣지별 이탈률: source 화면 마찰률 기반 추정"""
    result = {}
    for e in edges:
        src = e["source"]
        friction = per_screen.get(src, {}).get("friction_rate", 0.0)
        result[f"{src}|{e['target']}"] = round(friction, 3)
    return result


async def _run_screen_pipeline(
    screen_analysis: dict,
    strata_keys: list[str],
    task: str,
) -> dict:
    """단일 화면 vision 분석 결과 → M3/M4 실행 → per_screen 항목 반환"""
    # vision 분석 결과를 기존 ui_map 포맷으로 변환
    ui_map = {
        "components": [
            {"label": el, "line_number": None, "context": ""}
            for el in screen_analysis.get("elements", [])
        ],
        "layout_description": screen_analysis.get("layout_description", ""),
        "potential_issues": screen_analysis.get("potential_issues", []),
        "preview_html": "",
    }

    strata_data = _load_strata()
    matched = _match_strata(strata_data, strata_keys)
    if not matched:
        return {"think_aloud": "", "issues": [], "fix_prompts": [], "friction_rate": 0.0, "risk_level": "ok"}

    sem = asyncio.Semaphore(10)
    sim_tasks, weights = [], []
    for _key, stratum in matched:
        personas = stratum["personas"]
        if not personas:
            continue
        weight = stratum["count"] / len(personas)
        for persona in personas:
            weights.append(weight)
            sim_tasks.append(_simulate_one(persona, ui_map, task, sem))

    results = list(await asyncio.gather(*sim_tasks))
    scored = build_scorer_output_v2(results, weights, content="", preview_html="")

    return {
        "think_aloud": scored.get("think_aloud", ""),
        "issues": scored.get("top3", []),
        "fix_prompts": scored.get("fix_prompts", []),
        "friction_rate": scored.get("abandonment_rate", 0.0),
        "risk_level": scored.get("risk_level", "ok"),
    }
```

- [ ] **Step 2: 기존 run_pipeline 내부 로직 확인 후 _run_base_pipeline / _run_screen_pipeline 구체화**

```bash
cat src/core/logic.py
```

현재 `run_pipeline` 내부의 M2/M3/M4 호출 순서를 파악해서 `_run_base_pipeline`과 `_run_screen_pipeline`에 적절히 분리.

- [ ] **Step 3: 서버 기동 + 수동 테스트**

```bash
uvicorn src.backend.api:app --reload --port 8000
```

`http://localhost:5173` 에서 스크린샷 2장 업로드 → 연결 → 페르소나 선택 → 분석 실행 → 결과 캔버스에서 노드 클릭 확인.

- [ ] **Step 4: Commit**

```bash
git add src/core/logic.py
git commit -m "feat: add per_screen pipeline and edge_dropout to run_pipeline"
```

---

## ✅ 완료 체크리스트

- [ ] `npm run build` 오류 없음
- [ ] 스크린샷 업로드 → 캔버스 배치 → 연결 동작
- [ ] "다음" 버튼 노드 ≥2 + 엣지 ≥1 조건 동작
- [ ] 태스크 빈 채로 진행 → "서비스 전반 탐색하기" 전달
- [ ] 결과 캔버스: 노드 컬러 오버레이 + 화살표 이탈률 표시
- [ ] 노드 클릭 → 좌측 패널에 해당 화면 CoT/이슈/Fix 표시
- [ ] Fix Prompt 복사 버튼 동작
