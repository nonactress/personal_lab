# Image Flow Builder — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Deadline:** 2026-05-25 (FIN:NECT 챌린지)

---

## Overview

기존 코드 파일 업로드 방식을 **스크린샷 기반 UX flow 빌더**로 전면 교체.
사용자가 앱 화면 이미지를 업로드하고 Mermaid/ERD처럼 연결해 flow를 구성하면,
AI가 해당 flow를 페르소나 시각으로 시뮬레이션하고 결과를 flow 캔버스 위에 오버레이한다.

---

## Screen Flow

```
[1] Canvas Builder → [2] Target Select → [3] Progress → [4] Result Canvas
```

Target Select / Progress: 변경 없음.

---

## Screen 1: Canvas Builder *(현재 Source 화면 전면 교체)*

### 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [접기 토글 ◀]  좌측 패널          │  캔버스 (메인)        │
│                                   │                      │
│  ┌─ 업로드 존 ─────────────────┐  │  [드래그해서 노드 배치] │
│  │  .png .jpg .webp .zip      │  │                      │
│  └────────────────────────────┘  │  ○ ──→ ○ ──→ ○      │
│                                   │        ↘              │
│  썸네일 리스트                     │         ○             │
│  ┌──┐ home.png                   │                      │
│  └──┘                            │                      │
│  ┌──┐ product.png                │                      │
│  └──┘                            │                      │
│                                   │                      │
│  ─────────────────────────────   │                      │
│  태스크: [결제 완료하기        ]   │                      │
│                                   │                      │
│  [다음 → 페르소나 설정 →]         │                      │
└─────────────────────────────────────────────────────────┘
```

### 좌측 패널 (collapsible)

- 접기/펼치기 토글 버튼 (패널 오른쪽 엣지)
- 접힌 상태: 아이콘 바만 표시 (업로드 아이콘, 파일 수 뱃지)
- **업로드 존**: drag-and-drop, 클릭 선택. 허용 확장자: `.png .jpg .jpeg .webp .zip`
- **썸네일 리스트**: 파일명 + 미리보기 썸네일. 삭제 버튼(✕). 캔버스에 드래그해서 노드로 배치
- **태스크 입력**: 하단 고정. **선택적(optional)**. placeholder "예: 결제 완료하기 / 회원가입하기 (비워두면 전반 탐색)". 비어 있으면 백엔드에 `"서비스 전반 탐색하기"` 전달.
- **CTA**: "다음 → 페르소나 설정" — 활성화 조건: 노드 ≥2 + 연결(edge) ≥1 (태스크 입력 여부 무관)

### 캔버스

- 자유 배치(free canvas): 노드를 아무 위치에나 드롭
- **노드**: 이미지 썸네일(60×44px) + 파일명 라벨. 라벨 더블클릭으로 편집
- **연결 생성**: 노드 엣지 호버 시 연결 핸들 표시 → 드래그해서 다른 노드에 연결
- **분기(branching) 지원**: 하나의 노드에서 여러 화살표 허용 (A → B, A → C)
- **삭제**: 노드/엣지 선택 후 Delete 키 또는 우클릭 메뉴
- 배경: dot grid

### Canvas 라이브러리

React Flow (`@xyflow/react`) — 노드/엣지 커스터마이징, 분기 지원, MIT 라이선스

---

## Screen 4: Result Canvas *(현재 Result 화면 전면 교체)*

### 레이아웃

```
┌──────────────────────────────────────────────────────────┐
│  ← 새 분석          이탈률 71%           ⤓ Export        │  ← 헤더
├────────────────┬─────────────────────────────────────────┤
│                │                                          │
│  좌측 패널     │  결과 캔버스 (우측 메인)                  │
│  (240px)       │                                          │
│                │  ┌──────┐  ──↓43%──→  ┌──────┐         │
│  [화면명]      │  │  홈  │             │상품목록│ ← 선택  │
│  [심각도 뱃지] │  │ ●녹색│             │ ●노랑 │         │
│                │  └──────┘             └──────┘         │
│  Think-aloud   │             ↘↓38%                       │
│  (선택된 노드) │          ┌──────┐  ──↓71%──→ ┌──────┐  │
│                │          │  검색 │             │  결제 │  │
│  Issues        │          └──────┘             │ ●빨강 │  │
│  (해당 화면)   │                               └──────┘  │
│                │                                          │
│  Fix Prompt    │                                          │
│  [복사]        │                                          │
│                │                                          │
└────────────────┴─────────────────────────────────────────┘
```

### 우측 캔버스 (결과 오버레이)

**노드 오버레이 (A+C 방식):**
- 보더 컬러: `#10b981` (ok) · `#f59e0b` (warning) · `#ef4444` (critical)
- 썸네일 위 반투명 컬러 오버레이 (해당 컬러 15~25% opacity)
- 하단 라벨 바: `[화면명] · [마찰률%]` — 배경색 = 심각도 컬러

**화살표 오버레이:**
- 화살표 위에 이탈률 라벨: `↓43%`
- 컬러: 이탈률 ≥70% → red, ≥40% → amber, 이하 → blue

**인터랙션:**
- 노드 클릭 → 좌측 패널 업데이트 (해당 노드 CoT/이슈/Fix 표시)
- 캔버스 빈 영역 클릭 → 패널 초기화 (전체 요약 상태)
- 캔버스는 읽기 전용 (편집 불가)

### 좌측 패널 (240px 고정)

**노드 미선택 상태:**
- PersonaLab 워드마크
- 전체 리스크 배너 (risk_level + risk_label)
- 전체 이탈률 + 시뮬 인원
- "노드를 클릭하면 상세 분석을 볼 수 있어요" 안내

**노드 선택 상태:**
```
[화면명]                [HIGH/MED/LOW 뱃지]

Think-aloud
─────────────────────
"해당 화면에서의 페르소나 발화..."

Issues
─────────────────────
■ [HIGH] 이슈 제목
  근거 텍스트
■ [MED]  이슈 제목
  근거 텍스트

Fix Prompt          [복사]
─────────────────────
AI 생성 fix 텍스트...
```

- 패널 내부 스크롤 가능
- `✕` 버튼: 패널 초기화 (미선택 상태로)

---

## 백엔드 변경 사항

### POST /analyze 변경

| 항목 | 기존 | 변경 |
|------|------|------|
| `files[]` | 코드 파일 (.tsx, .html 등) | 이미지 파일 (.png, .jpg, .webp) |
| `strata_keys` | 유지 | 유지 |
| `task` | 유지 | 유지 |
| `target_url` | localhost/URL | 제거 (이미지 전용으로) |

추가 필드: `flow_edges` — 노드 연결 정보 (JSON)
```json
{
  "flow_edges": [
    { "source": "home.png", "target": "product.png" },
    { "source": "product.png", "target": "checkout.png" },
    { "source": "product.png", "target": "search.png" }
  ]
}
```

### M1 변경: 코드 파서 → 비전 분석

- 기존: HTML/JSX 파싱 → UI 요소 추출
- 변경: 이미지 vision 분석 → UI 요소 설명 추출 (Groq vision 또는 llama-3.2-11b-vision)
- 출력 포맷 동일 유지 (M2 입력 호환)

### 응답 추가 필드

```json
{
  "per_screen": {
    "home.png": {
      "think_aloud": "...",
      "issues": [...],
      "fix_prompts": [...],
      "friction_rate": 0.12,
      "risk_level": "ok"
    },
    "product.png": { ... }
  },
  "edge_dropout": {
    "home.png|product.png": 0.43,
    "product.png|checkout.png": 0.71
  }
}
```

기존 최상위 필드(`think_aloud`, `top3`, `fix_prompts`, `risk_level` 등) 유지 (하위 호환).

---

## 컴포넌트 변경 목록

| 컴포넌트 | 변경 |
|----------|------|
| `SourceScreen.tsx` | **전면 교체** → `CanvasBuilderScreen.tsx` |
| `ResultScreen.tsx` | **전면 교체** → `ResultCanvasScreen.tsx` |
| `TldrSection.tsx` | 제거 (ResultCanvasScreen 좌측 패널로 통합) |
| `IssuesSection.tsx` | 제거 (통합) |
| `FixesSection.tsx` | 제거 (통합) |
| `CodeSection.tsx` | 제거 (이미지 기반이므로 불필요) |
| `TargetSelectScreen.tsx` | 변경 없음 |
| `ProgressScreen.tsx` | 변경 없음 |
| `AppContext.tsx` | `files` 타입 유지, `flow_edges` 상태 추가, `perScreen` result 추가 |
| `types.ts` | `PerScreenResult`, `EdgeDropout` 타입 추가 |
| `api.ts` | `flow_edges` 전송, `per_screen` / `edge_dropout` 수신 |

신규: `frontend/src/components/screens/CanvasBuilderScreen.tsx`
신규: `frontend/src/components/screens/ResultCanvasScreen.tsx`
신규: `frontend/src/components/result/NodeDetailPanel.tsx`

---

## 의존성 추가

```json
"@xyflow/react": "^12.x"
```

---

## Out of Scope (MVP)

- 노드 라벨 애니메이션
- flow export (PNG/SVG)
- 여러 flow 저장/불러오기
- localhost/URL 입력 방식 (이미지로 대체됨)
- 모바일 반응형
