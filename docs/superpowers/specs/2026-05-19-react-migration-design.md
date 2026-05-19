# React Migration Design — PersonaLab Frontend

**Date:** 2026-05-19  
**Deadline:** 2026-05-25 (FIN:NECT 챌린지)  
**Status:** Approved

---

## 목표

Alpine.js + 단일 HTML 파일 스택을 React + TypeScript + Vite + shadcn/ui + Tailwind로 교체. 장기 유지보수성 향상. 백엔드(FastAPI) API 스펙 변경 없음.

---

## 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite |
| UI 컴포넌트 | shadcn/ui + Tailwind CSS |
| 상태 관리 | useState + Context API |
| 페르소나 위젯 | 완전 제거 (물리 엔진 포함) |
| FastAPI 서빙 | `frontend/dist/` 서빙으로 경로 변경 |
| 배포 형태 | `uvicorn` 단일 실행 유지 |

---

## 디렉터리 구조

```
repo root/
├── frontend/                        ← Vite 프로젝트 (신규)
│   ├── src/
│   │   ├── components/
│   │   │   ├── screens/
│   │   │   │   ├── SourceScreen.tsx
│   │   │   │   ├── TargetSelectScreen.tsx
│   │   │   │   ├── ProgressScreen.tsx
│   │   │   │   └── ResultScreen.tsx
│   │   │   └── result/
│   │   │       ├── TldrSection.tsx
│   │   │       ├── IssuesSection.tsx
│   │   │       ├── FixesSection.tsx
│   │   │       └── CodeSection.tsx
│   │   ├── context/
│   │   │   └── AppContext.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src/
│   ├── backend/
│   │   └── api.py                   ← StaticFiles 경로 1줄 수정
│   └── frontend/                    ← 기존 파일 (마이그레이션 후 삭제 가능)
└── ...
```

---

## 화면 구성 (4개 screen)

### SourceScreen
- 소스 모드 선택: 파일 업로드 / localhost / URL
- 파일 드래그앤드롭 (`.tsx .jsx .html .vue .js .ts .zip`)
- 테스트 태스크 입력
- "다음 → 페르소나 설정" 버튼 (소스 미선택 시 disabled)

### TargetSelectScreen
- 나이대 / 성별 / 학력 / 지역 칩 선택
- 칩 선택 시 `/build-cast` 자동 호출 → 예상 매칭 인원 표시
- "시뮬레이션 실행" 버튼 (필수 항목 미선택 시 disabled)

### ProgressScreen
- 4단계 스텝 인디케이터 (코드 파싱 → 페르소나 매칭 → UX 시뮬레이션 → 리포트 생성)
- 실시간 liveThought 텍스트

### ResultScreen
- 사이드바 탭: TL;DR / Issues / Fixes / Code
- TL;DR: 리스크 배너 + 개발자 바이어스 갭 + think-aloud + 마찰지점 바 + Top Issues / Next Steps
- Issues: 이슈 카드 (심각도별 색상, 근거 포함)
- Fixes: fix_prompts textarea + 복사 버튼
- Code: 소스코드 라인 하이라이트 + UI 미리보기 iframe

---

## 상태 관리

`AppContext`가 전역 상태 소유:

```ts
type Screen = 'source' | 'target_select' | 'progress' | 'result'

interface AppState {
  screen: Screen
  // source
  sourceMode: 'file' | 'localhost' | 'url'
  files: File[]
  sourcePort: string
  sourcePath: string
  sourceUrl: string
  taskDesc: string
  // target_select
  selectedAgeGroup: string
  selectedSex: string
  selectedEducation: string
  selectedRegion: string
  matchedStrata: string[]
  totalCount: number
  previewPersonas: PreviewPersona[]
  castLoading: boolean
  // result
  result: AnalysisResult | null
  resultSection: 'tldr' | 'issues' | 'fixes' | 'code'
  liveThought: string
  error: string
}
```

각 화면 컴포넌트는 context에서 필요한 슬라이스만 구독. 로컬 UI 상태(hover, copied 등)는 컴포넌트 내 `useState`.

---

## API 레이어 (`lib/api.ts`)

```ts
// POST /build-cast
buildCast(params: BuildCastParams): Promise<BuildCastResponse>

// POST /analyze (FormData)
analyze(params: AnalyzeParams): Promise<AnalysisResult>
```

현재 API 엔드포인트 및 요청/응답 스펙 변경 없음.

---

## shadcn/ui 컴포넌트 매핑

| 현재 구현 | shadcn/ui |
|-----------|-----------|
| 커스텀 버튼 (`.btn-primary`, `.btn-ghost`) | `Button` (variant: default, ghost, outline) |
| 텍스트 입력 (`.textarea-persona`) | `Input` |
| result 사이드바 탭 | `Tabs` + `TabsList` + `TabsContent` |
| 심각도 뱃지 (`[HIGH]`, `[MED]`, `[LOW]`) | `Badge` |
| fix_prompts 영역 | `Textarea` |
| 이슈 카드 (`<details>`) | `Card` + `Collapsible` |
| 에러 배너 | `Alert` |

---

## 빌드 파이프라인

### 개발 환경

```bash
# 터미널 1 — FastAPI 백엔드
uvicorn src.backend.api:app --reload --port 8000

# 터미널 2 — Vite 개발 서버
cd frontend && npm run dev   # http://localhost:5173
```

Vite 프록시 설정 (`vite.config.ts`):
```ts
server: {
  proxy: {
    '/analyze':    'http://localhost:8000',
    '/build-cast': 'http://localhost:8000',
  }
}
```

### 제출용 빌드

```bash
cd frontend && npm run build
# → frontend/dist/ 생성
uvicorn src.backend.api:app --port 8000  # FastAPI가 dist/ 서빙
```

### FastAPI 변경 (`src/backend/api.py` line 160)

```python
# 변경 전
app.mount("/", StaticFiles(directory="src/frontend", html=True), name="frontend")

# 변경 후
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

---

## 폰트 / 스타일

- 현재: Google Fonts CDN (Inter, JetBrains Mono)
- 변경 후: Tailwind `fontFamily` 설정 유지, CDN → `index.html` `<link>` 태그로 동일하게 유지
- 다크 테마 컬러 팔레트 (`#0F172A`, `#1E293B`, `#F1F5F9` 등) → Tailwind config `extend.colors`로 이전

---

## 제거 범위

- `src/frontend/index.html` — 마이그레이션 후 삭제
- `src/frontend/app.js` — 마이그레이션 후 삭제 (물리 엔진 코드 포함)
- `src/frontend/style.css` — 마이그레이션 후 삭제
- `src/frontend/ui.py` — 구 Gradio UI 레거시, 완전 미사용 → 삭제

---

## 검증 체크리스트

- [ ] `tsc --noEmit` 타입 에러 없음
- [ ] SourceScreen: 파일 업로드 / localhost / URL 세 모드 동작
- [ ] TargetSelectScreen: 칩 선택 → `/build-cast` 호출 → 매칭 수 표시
- [ ] ProgressScreen: 스텝 인디케이터 순서대로 진행
- [ ] ResultScreen: 4개 탭 전환 + 데이터 정상 렌더링
- [ ] Export(복사) 버튼 동작
- [ ] 에러 상태 (백엔드 미실행 시 에러 배너 표시)
- [ ] `npm run build` → `frontend/dist/` 생성 → FastAPI 서빙 확인
