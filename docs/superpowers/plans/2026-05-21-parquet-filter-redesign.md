# Parquet 기반 동적 페르소나 필터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nemotron_strata.json 제거, 2GB parquet 로컬 저장 + DuckDB 실시간 쿼리로 인구통계·행동 필터 8개 필드 지원

**Architecture:** `scripts/download_dataset.py`로 HF parquet 1회 다운로드 → `src/core/db.py` DuckDB 싱글톤이 필터 조건 SQL 빌드 → `/build-cast` count+preview, `/analyze` SAMPLE n → M3×n 시뮬레이션. 프론트엔드는 개별 strata 상태 대신 `FilterParams` 단일 객체로 통합.

**Tech Stack:** Python/FastAPI, DuckDB (`duckdb>=0.10`), HuggingFace `datasets`, React/TypeScript

---

## 파일 맵

| 파일 | 동작 |
|------|------|
| `scripts/download_dataset.py` | 신규 — HF parquet 다운로드 |
| `src/core/db.py` | 신규 — DuckDB 싱글톤 + 쿼리 빌더 |
| `src/backend/api.py` | 수정 — FilterRequest, /build-cast, /analyze |
| `src/core/logic.py` | 수정 — strata→DuckDB 교체 |
| `requirements.txt` | 수정 — duckdb 추가 |
| `.gitignore` | 수정 — nemotron_full.parquet 추가 |
| `frontend/src/types.ts` | 수정 — FilterParams, strata 타입 제거 |
| `frontend/src/context/AppContext.tsx` | 수정 — filterParams 단일 객체 |
| `frontend/src/lib/api.ts` | 수정 — BuildCastParams, AnalyzeParams |
| `frontend/src/components/screens/TargetSelectScreen.tsx` | 수정 — 2-step UI |
| `frontend/src/components/screens/ProgressScreen.tsx` | 수정 — 시간 추정 수정 |
| `tests/test_db.py` | 신규 — DuckDB 쿼리 유닛 테스트 |
| `scripts/build_strata.py` | 삭제 |

---

## Task 1: 의존성 + gitignore 업데이트

**Files:**
- Modify: `requirements.txt`
- Modify: `.gitignore`

- [ ] **Step 1: duckdb 추가**

`requirements.txt` 기존 내용 끝에 추가:
```
duckdb>=0.10
```

- [ ] **Step 2: parquet gitignore 추가**

`.gitignore`에 아래 항목 추가 (기존 `nemotron_strata.json` 줄 아래):
```
data/nemotron_full.parquet
data/nemotron_full.parquet.tmp
```

- [ ] **Step 3: duckdb 설치 확인**

```bash
pip install duckdb>=0.10
python -c "import duckdb; print(duckdb.__version__)"
```
Expected: 버전 출력 (예: `0.10.3`)

- [ ] **Step 4: Commit**

```bash
git add requirements.txt .gitignore
git commit -m "chore: add duckdb dependency, gitignore parquet file"
```

---

## Task 2: 다운로드 스크립트

**Files:**
- Create: `scripts/download_dataset.py`

- [ ] **Step 1: 스크립트 작성**

```python
"""
nonactress/Nemotron-Personas-Korea-bucket → data/nemotron_full.parquet
실행: python scripts/download_dataset.py
소요: 수 분 (HF_TOKEN 필요)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
if not token:
    raise SystemExit("HF_TOKEN이 .env에 없습니다.")

Path("data").mkdir(exist_ok=True)
out = Path("data/nemotron_full.parquet")

if out.exists():
    print(f"이미 존재: {out} ({out.stat().st_size / 1e9:.2f} GB)")
    raise SystemExit(0)

print("데이터셋 로드 중…")
from datasets import load_dataset

ds = load_dataset(
    "nonactress/Nemotron-Personas-Korea-bucket",
    split="train",
    token=token,
)
print(f"  행 수: {len(ds):,}")
print("parquet 저장 중…")
ds.to_parquet(str(out))
print(f"완료: {out} ({out.stat().st_size / 1e9:.2f} GB)")
```

- [ ] **Step 2: 스크립트 실행**

```bash
python scripts/download_dataset.py
```

Expected: `완료: data/nemotron_full.parquet (X.XX GB)` 출력. 파일이 `data/` 폴더에 생성됨.

- [ ] **Step 3: Commit**

```bash
git add scripts/download_dataset.py
git commit -m "feat: add download script for Nemotron parquet"
```

---

## Task 3: DuckDB 싱글톤 + 쿼리 빌더

**Files:**
- Create: `src/core/db.py`
- Create: `tests/test_db.py`

- [ ] **Step 1: 테스트 작성**

`tests/test_db.py`:
```python
import pytest
from src.core.db import build_where_clause, EDU_MAP

def test_edu_map_keys():
    assert "고졸이하" in EDU_MAP
    assert "전문대" in EDU_MAP
    assert "대졸" in EDU_MAP
    assert "대학원" in EDU_MAP

def test_build_where_all_buckets():
    where, params = build_where_clause(
        age_buckets=["10~20대", "30대"],
        sex="모두",
        education_levels=["대졸"],
        provinces=[],
        occupation_kw="",
        hobbies_kw="",
        skills_kw="",
        cultural_kw="",
    )
    assert "age" in where
    assert "education_level" in where
    assert "sex" not in where  # 모두면 조건 없음

def test_build_where_with_sex_and_province():
    where, params = build_where_clause(
        age_buckets=["30대"],
        sex="여자",
        education_levels=["대졸", "대학원"],
        provinces=["서울", "경기"],
        occupation_kw="개발",
        hobbies_kw="",
        skills_kw="",
        cultural_kw="",
    )
    assert "sex" in where
    assert "province" in where
    assert "occupation" in where

def test_build_where_no_age_bucket():
    with pytest.raises(ValueError):
        build_where_clause(
            age_buckets=[],
            sex="모두",
            education_levels=["대졸"],
            provinces=[],
            occupation_kw="",
            hobbies_kw="",
            skills_kw="",
            cultural_kw="",
        )
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pytest tests/test_db.py -v
```
Expected: `ImportError: cannot import name 'build_where_clause' from 'src.core.db'`

- [ ] **Step 3: db.py 구현**

```python
import threading
from pathlib import Path
from typing import Optional
import duckdb

_PARQUET = Path("data/nemotron_full.parquet")
_CONN: Optional[duckdb.DuckDBPyConnection] = None
_LOCK = threading.Lock()

EDU_MAP: dict[str, list[str]] = {
    "고졸이하": ["초등학교", "중학교", "고등학교"],
    "전문대":   ["2~3년제 전문대학"],
    "대졸":     ["4년제 대학교"],
    "대학원":   ["대학원"],
}

AGE_BUCKET_MAP: dict[str, tuple[int, int]] = {
    "10~20대": (19, 29),
    "30대":    (30, 39),
    "40대":    (40, 49),
    "50대":    (50, 59),
    "60대+":   (60, 999),
}


def _conn() -> duckdb.DuckDBPyConnection:
    global _CONN
    if _CONN is None:
        with _LOCK:
            if _CONN is None:
                _CONN = duckdb.connect(database=":memory:", read_only=False)
    return _CONN


def build_where_clause(
    age_buckets: list[str],
    sex: str,
    education_levels: list[str],
    provinces: list[str],
    occupation_kw: str,
    hobbies_kw: str,
    skills_kw: str,
    cultural_kw: str,
) -> tuple[str, list]:
    if not age_buckets:
        raise ValueError("age_buckets는 최소 1개 필요")

    parts: list[str] = []
    params: list = []

    # age buckets — OR 결합
    age_clauses = []
    for bucket in age_buckets:
        lo, hi = AGE_BUCKET_MAP[bucket]
        age_clauses.append(f"(age >= {lo} AND age <= {hi})")
    parts.append(f"({' OR '.join(age_clauses)})")

    # sex
    if sex != "모두":
        parts.append("sex = ?")
        params.append(sex)

    # education
    if education_levels:
        raw_edus: list[str] = []
        for label in education_levels:
            raw_edus.extend(EDU_MAP.get(label, [label]))
        placeholders = ", ".join("?" * len(raw_edus))
        parts.append(f"education_level IN ({placeholders})")
        params.extend(raw_edus)

    # provinces
    if provinces:
        placeholders = ", ".join("?" * len(provinces))
        parts.append(f"province IN ({placeholders})")
        params.extend(provinces)

    # keyword fields — escape single quote, use ILIKE
    def _kw_clause(col: str, kw: str) -> Optional[str]:
        if not kw.strip():
            return None
        safe = kw.strip().replace("'", "''")
        return f"{col} ILIKE '%{safe}%'"

    for clause in [
        _kw_clause("occupation", occupation_kw),
        _kw_clause("CAST(hobbies_and_interests_list AS VARCHAR)", hobbies_kw),
        _kw_clause("skills_and_expertise", skills_kw),
        _kw_clause("cultural_background", cultural_kw),
    ]:
        if clause:
            parts.append(clause)

    return " AND ".join(parts), params


_SELECT_COLS = """
    age, sex, education_level, province,
    occupation, skills_and_expertise, cultural_background,
    persona, professional_persona,
    CAST(hobbies_and_interests_list AS VARCHAR) AS hobbies_and_interests
"""


def query_count(where: str, params: list) -> int:
    if not _PARQUET.exists():
        raise FileNotFoundError(
            f"{_PARQUET} 없음. scripts/download_dataset.py 먼저 실행하세요."
        )
    sql = f"SELECT COUNT(*) FROM '{_PARQUET}' WHERE {where}"
    return _conn().execute(sql, params).fetchone()[0]


def query_sample(where: str, params: list, n: int, total: int) -> list[dict]:
    if not _PARQUET.exists():
        raise FileNotFoundError(
            f"{_PARQUET} 없음. scripts/download_dataset.py 먼저 실행하세요."
        )
    sql = f"SELECT {_SELECT_COLS} FROM '{_PARQUET}' WHERE {where}"
    if total > n:
        sql += f" USING SAMPLE {n} ROWS"
    rows = _conn().execute(sql, params).df().to_dict(orient="records")
    return rows
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pytest tests/test_db.py -v
```
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/db.py tests/test_db.py
git commit -m "feat: DuckDB singleton + SQL query builder with age/edu/province/keyword filters"
```

---

## Task 4: Backend API — FilterRequest + /build-cast

**Files:**
- Modify: `src/backend/api.py`

- [ ] **Step 1: FilterRequest 모델 + /build-cast 교체**

`src/backend/api.py`에서 다음을 교체:

기존:
```python
from pathlib import Path
...
_STRATA_PATH = Path("data/nemotron_strata.json")
_METRO_PROVINCES = {"서울", "경기", "인천"}
...
def _load_strata_once() -> dict:
    ...

class BuildCastRequest(BaseModel):
    age_group: str
    sex: str
    education: str
    region: str = "모두"
    occupation: str = "모두"

@app.post("/build-cast")
async def build_cast(req: BuildCastRequest):
    ...
```

신규 (전체 교체):
```python
from src.core.db import build_where_clause, query_count, query_sample

class FilterRequest(BaseModel):
    age_buckets: list[str]
    sex: str = "모두"
    education_levels: list[str]
    provinces: list[str] = []
    occupation_kw: str = ""
    hobbies_kw: str = ""
    skills_kw: str = ""
    cultural_kw: str = ""
    n: int = 100

@app.post("/build-cast")
async def build_cast(req: FilterRequest):
    try:
        where, params = build_where_clause(
            age_buckets=req.age_buckets,
            sex=req.sex,
            education_levels=req.education_levels,
            provinces=req.provinces,
            occupation_kw=req.occupation_kw,
            hobbies_kw=req.hobbies_kw,
            skills_kw=req.skills_kw,
            cultural_kw=req.cultural_kw,
        )
        total = query_count(where, params)
        preview = query_sample(where, params, n=3, total=total)
        return {
            "total_count": total,
            "preview_personas": preview[:3],
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"build-cast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

`_STRATA_PATH`, `_METRO_PROVINCES`, `_load_strata_once` 함수 삭제.

- [ ] **Step 2: 서버 기동 + 수동 테스트**

```bash
uvicorn src.backend.api:app --reload --port 8000
```

별도 터미널:
```bash
curl -s -X POST http://localhost:8000/build-cast \
  -H "Content-Type: application/json" \
  -d '{"age_buckets":["30대"],"sex":"여자","education_levels":["대졸"],"provinces":["서울"]}' | python -m json.tool
```
Expected: `total_count` > 0, `preview_personas` 3개 이하.

- [ ] **Step 3: Commit**

```bash
git add src/backend/api.py
git commit -m "feat: replace BuildCastRequest with FilterRequest + DuckDB /build-cast"
```

---

## Task 5: Logic 파이프라인 — strata → DuckDB

**Files:**
- Modify: `src/core/logic.py`

- [ ] **Step 1: logic.py 전체 교체**

```python
import asyncio
import json
from src.core.m1_analyzer import analyze_image
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2
from src.core.db import build_where_clause, query_count, query_sample


async def _simulate_one(
    persona: dict, ui_map: dict, task: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        return await run_simulation_for_persona(persona, ui_map, task)


async def run_pipeline(
    images: list[dict],
    flow_edges: list[dict],
    filter_params: dict,
    task: str = "서비스 탐색하기",
) -> dict:
    """
    images: [{"name": "home.png", "bytes": b"..."}]
    flow_edges: [{"source": "home.png", "target": "product.png"}]
    filter_params: FilterRequest dict
    """
    n = filter_params.get("n", 100)

    where, params = build_where_clause(
        age_buckets=filter_params["age_buckets"],
        sex=filter_params.get("sex", "모두"),
        education_levels=filter_params["education_levels"],
        provinces=filter_params.get("provinces", []),
        occupation_kw=filter_params.get("occupation_kw", ""),
        hobbies_kw=filter_params.get("hobbies_kw", ""),
        skills_kw=filter_params.get("skills_kw", ""),
        cultural_kw=filter_params.get("cultural_kw", ""),
    )
    total = query_count(where, params)
    if total == 0:
        raise ValueError("매칭된 페르소나가 없습니다. 필터 조건을 넓혀주세요.")

    personas = query_sample(where, params, n=n, total=total)

    ui_maps = {
        img["name"]: analyze_image(img["bytes"], img["name"], task)
        for img in images
    }

    sem = asyncio.Semaphore(3)
    all_tasks: list = []
    screen_ranges: dict[str, tuple[int, int]] = {}
    screen_weights: dict[str, list[float]] = {name: [] for name in ui_maps}
    offset = 0

    for screen_name, ui_map in ui_maps.items():
        screen_tasks = []
        for persona in personas:
            screen_weights[screen_name].append(1.0)
            screen_tasks.append(_simulate_one(persona, ui_map, task, sem))
        screen_ranges[screen_name] = (offset, offset + len(screen_tasks))
        all_tasks.extend(screen_tasks)
        offset += len(screen_tasks)

    all_results = list(await asyncio.gather(*all_tasks))

    per_screen_results = {
        name: all_results[start:end]
        for name, (start, end) in screen_ranges.items()
    }

    return build_scorer_output_v2(
        per_screen_results=per_screen_results,
        per_screen_weights=screen_weights,
        flow_edges=flow_edges,
    )
```

- [ ] **Step 2: Commit**

```bash
git add src/core/logic.py
git commit -m "feat: replace strata loading with DuckDB query in run_pipeline"
```

---

## Task 6: Backend API — /analyze 업데이트

**Files:**
- Modify: `src/backend/api.py`

- [ ] **Step 1: /analyze 파라미터 교체**

`src/backend/api.py`의 `/analyze` 엔드포인트:

기존:
```python
strata_keys: str = Form(...),
```
신규:
```python
filter_params: str = Form(...),
```

기존:
```python
keys: list[str] = json.loads(strata_keys)
...
result = await run_pipeline(images, edges, keys, task)
```
신규:
```python
try:
    fp: dict = json.loads(filter_params)
except (json.JSONDecodeError, TypeError):
    raise HTTPException(status_code=400, detail="filter_params가 유효한 JSON이 아닙니다.")
if not fp.get("age_buckets") or not fp.get("education_levels"):
    raise HTTPException(status_code=400, detail="age_buckets, education_levels 필수")

result = await run_pipeline(images, edges, fp, task)
```

`run_pipeline` import 시그니처 변경 없음 (logic.py 이미 수정됨).

- [ ] **Step 2: 엔드투엔드 수동 테스트**

```bash
curl -s -X POST http://localhost:8000/analyze \
  -F 'filter_params={"age_buckets":["30대"],"sex":"여자","education_levels":["대졸"],"n":3}' \
  -F 'task=서비스 탐색하기' \
  -F 'files=@sample_test_ui/1.png' | python -m json.tool
```
Expected: `risk_level`, `top3`, `friction_map` 포함 JSON 응답.

- [ ] **Step 3: Commit**

```bash
git add src/backend/api.py
git commit -m "feat: update /analyze to accept filter_params JSON instead of strata_keys"
```

---

## Task 7: Frontend 타입 + AppContext

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/context/AppContext.tsx`

- [ ] **Step 1: types.ts 업데이트**

`frontend/src/types.ts`에서 `AppContextValue` 내 strata 관련 항목 교체:

삭제:
```typescript
selectedAgeGroup: string
setSelectedAgeGroup: (v: string) => void
selectedSex: string
setSelectedSex: (v: string) => void
selectedEducation: string
setSelectedEducation: (v: string) => void
selectedRegion: string
setSelectedRegion: (v: string) => void
selectedOccupation: string
setSelectedOccupation: (v: string) => void
matchedStrata: string[]
setMatchedStrata: (v: string[]) => void
```

추가 (동일 위치):
```typescript
filterParams: FilterParams
setFilterParams: (v: FilterParams) => void
simulationN: 50 | 100 | 200
setSimulationN: (v: 50 | 100 | 200) => void
```

파일 상단에 타입 추가:
```typescript
export interface FilterParams {
  age_buckets: string[]
  sex: string
  education_levels: string[]
  provinces: string[]
  occupation_kw: string
  hobbies_kw: string
  skills_kw: string
  cultural_kw: string
}

export const DEFAULT_FILTER_PARAMS: FilterParams = {
  age_buckets: [],
  sex: '모두',
  education_levels: [],
  provinces: [],
  occupation_kw: '',
  hobbies_kw: '',
  skills_kw: '',
  cultural_kw: '',
}
```

- [ ] **Step 2: AppContext.tsx 업데이트**

`frontend/src/context/AppContext.tsx`:

import 추가:
```typescript
import type { FilterParams } from '@/types'
import { DEFAULT_FILTER_PARAMS } from '@/types'
```

상태 교체 (기존 selectedAgeGroup 등 5개 + matchedStrata 삭제):
```typescript
const [filterParams, setFilterParams] = useState<FilterParams>(DEFAULT_FILTER_PARAMS)
const [simulationN, setSimulationN]   = useState<50 | 100 | 200>(100)
```

`reset()` 함수에서 기존 선택 항목 삭제, 추가:
```typescript
setFilterParams(DEFAULT_FILTER_PARAMS)
setSimulationN(100)
setMatchedStrata([]) // matchedStrata 제거 후 이 줄도 삭제
```
→ `matchedStrata` 관련 state + reset 줄 모두 삭제.

Provider value에서 구 항목 삭제, 신규 추가:
```typescript
filterParams, setFilterParams,
simulationN, setSimulationN,
```

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음 (또는 TargetSelectScreen/ProgressScreen 관련 에러만 — 다음 Task에서 수정)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/context/AppContext.tsx
git commit -m "feat: replace per-field strata state with FilterParams in AppContext"
```

---

## Task 8: Frontend API lib 업데이트

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: api.ts 전체 교체**

```typescript
import type { AnalysisResult, PreviewPersona, FlowEdge, FilterParams } from '@/types'

export interface BuildCastResponse {
  total_count: number
  preview_personas: PreviewPersona[]
}

export async function buildCast(params: FilterParams): Promise<BuildCastResponse> {
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
  filterParams: FilterParams
  n: 50 | 100 | 200
  task: string
  files?: File[]
  flowEdges?: FlowEdge[]
}

export async function analyze(params: AnalyzeParams): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('filter_params', JSON.stringify({ ...params.filterParams, n: params.n }))
  formData.append('task', params.task || '서비스 탐색하기')
  formData.append('flow_edges', JSON.stringify(params.flowEdges ?? []))
  if (params.files) {
    for (const file of params.files) formData.append('files', file)
  }
  const res = await fetch('/analyze', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail || 'backend')
  }
  return res.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update api.ts — FilterParams for buildCast, filter_params for analyze"
```

---

## Task 9: TargetSelectScreen — 2-Step UI

**Files:**
- Modify: `frontend/src/components/screens/TargetSelectScreen.tsx`

- [ ] **Step 1: 전체 교체**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { buildCast } from '@/lib/api'
import type { PreviewPersona, FilterParams } from '@/types'

const AGE_BUCKETS     = ['10~20대', '30대', '40대', '50대', '60대+']
const SEX_OPTIONS     = ['모두', '남자', '여자']
const EDU_OPTIONS     = ['고졸이하', '전문대', '대졸', '대학원']
const PROVINCE_LIST   = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
const METRO           = ['서울', '경기', '인천']
const BEHAVIOR_FIELDS = [
  { key: 'occupation_kw',  label: '직업',    placeholder: '예: 개발자, 교사, 무직' },
  { key: 'hobbies_kw',     label: '취미',    placeholder: '예: 독서, 게임, 운동' },
  { key: 'skills_kw',      label: '기술',    placeholder: '예: 엑셀, 코딩, 디자인' },
  { key: 'cultural_kw',    label: '문화배경', placeholder: '예: 수도권 출신, 농촌' },
] as const

const AVATAR_COLORS = [
  'bg-violet-100 border-violet-200 text-violet-700',
  'bg-emerald-100 border-emerald-200 text-emerald-700',
  'bg-amber-100 border-amber-200 text-amber-700',
]

function PersonaSpecCard({ persona: p, index }: { persona: PreviewPersona; index: number }) {
  const [open, setOpen] = useState(false)
  const avatarClass = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const promptPreview = [
    p.persona,
    p.professional_persona ? `직업/일상: ${p.professional_persona}` : '',
    p.hobbies_and_interests ? `취미: ${p.hobbies_and_interests}` : '',
  ].filter(Boolean).join('\n\n')

  return (
    <div className="bg-white rounded-xl border border-brand-100 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarClass}`}>
          {p.persona?.slice(0, 1) ?? p.occupation?.slice(0, 1) ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{p.age}세</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-700">{p.occupation}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{p.province}</span>
          </div>
          {p.persona && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.persona}</p>}
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 text-[10px] font-semibold text-brand-600 hover:text-brand-800 px-2 py-1 rounded-md hover:bg-brand-50 transition-colors"
        >
          {open ? '접기' : '프롬프트'}
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">시뮬레이션 프롬프트 미리보기</div>
          {p.persona && <div><span className="text-[10px] font-semibold text-gray-500">페르소나</span><p className="text-xs text-gray-700 mt-0.5">{p.persona}</p></div>}
          {p.professional_persona && <div><span className="text-[10px] font-semibold text-gray-500">직업/일상</span><p className="text-xs text-gray-700 mt-0.5">{p.professional_persona}</p></div>}
          {p.hobbies_and_interests && <div><span className="text-[10px] font-semibold text-gray-500">취미/관심사</span><p className="text-xs text-gray-700 mt-0.5">{p.hobbies_and_interests}</p></div>}
          {p.cultural_background && <div><span className="text-[10px] font-semibold text-gray-500">문화적 배경</span><p className="text-xs text-gray-700 mt-0.5">{p.cultural_background}</p></div>}
          {p.skills_and_expertise && <div><span className="text-[10px] font-semibold text-gray-500">기술/역량</span><p className="text-xs text-gray-700 mt-0.5">{p.skills_and_expertise}</p></div>}
          <div className="pt-2 border-t border-gray-200">
            <span className="text-[10px] font-semibold text-gray-400">M3 시스템 프롬프트 구성</span>
            <pre className="text-[10px] text-gray-500 mt-1 whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-2 leading-relaxed">
              {`당신은 아래 실제 한국인입니다.\n\n${promptPreview}\n\n이 서비스를 처음 사용합니다.`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ChipGroup({ label, required = false, options, selected, onToggle }: {
  label: string
  required?: boolean
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2.5">
        <label className="text-sm font-semibold text-gray-900">{label}</label>
        {required
          ? <span className="text-[10px] font-semibold text-rose-600">필수</span>
          : <span className="text-[10px] text-gray-400">선택</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={[
              'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
              selected.includes(opt)
                ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TargetSelectScreen() {
  const {
    filterParams, setFilterParams,
    simulationN, setSimulationN,
    totalCount, setTotalCount,
    previewPersonas, setPreviewPersonas,
    castLoading, setCastLoading,
    error, setError,
    files,
    setScreen, setLiveThought, setResultSection,
  } = useApp()

  const [step, setStep] = useState<1 | 2>(1)
  const [activeBehavior, setActiveBehavior] = useState<Set<string>>(new Set())

  const isReady = filterParams.age_buckets.length > 0 && filterParams.education_levels.length > 0

  const fetchCast = useCallback(async (fp: FilterParams) => {
    if (fp.age_buckets.length === 0 || fp.education_levels.length === 0) return
    setCastLoading(true)
    setTotalCount(0)
    setPreviewPersonas([])
    try {
      const data = await buildCast(fp)
      setTotalCount(data.total_count ?? 0)
      setPreviewPersonas(data.preview_personas ?? [])
    } catch {
      setError('매칭 중 오류가 발생했어요.')
    } finally {
      setCastLoading(false)
    }
  }, [setCastLoading, setTotalCount, setPreviewPersonas, setError])

  // debounced fetch on filterParams change
  useEffect(() => {
    if (!isReady) return
    const id = setTimeout(() => fetchCast(filterParams), 500)
    return () => clearTimeout(id)
  }, [filterParams, isReady, fetchCast])

  function toggleMulti(field: 'age_buckets' | 'education_levels' | 'provinces', val: string) {
    setFilterParams({
      ...filterParams,
      [field]: filterParams[field].includes(val)
        ? filterParams[field].filter(v => v !== val)
        : [...filterParams[field], val],
    })
  }

  function toggleBehavior(key: string) {
    setActiveBehavior(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setFilterParams({ ...filterParams, [key]: '' })
      } else {
        next.add(key)
      }
      return next
    })
  }

  function runAnalysis() {
    if (!isReady || totalCount === 0) return
    setError('')
    setLiveThought('')
    setResultSection('tldr')
    setScreen('progress')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden mb-8">
          {/* Top bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <button
              onClick={() => step === 2 ? setStep(1) : setScreen('source')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
              </svg>
              뒤로
            </button>
            <div className="flex-1 text-center">
              <span className="font-mono text-xs font-semibold text-brand-700">PersonaLab</span>
            </div>
            <div className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {files.length}개 파일
            </div>
          </div>

          <div className="p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">타겟 사용자 선택</h1>
              <p className="text-gray-500 mt-2 text-sm">
                {step === 1 ? '분석에 사용할 조건 항목을 선택하세요' : '각 항목의 값을 설정하세요'}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8 justify-center">
              {[1, 2].map(s => (
                <div key={s} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${step === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {s}. {s === 1 ? '항목 선택' : '값 설정'}
                </div>
              ))}
            </div>

            {/* Step 1 — 필드 선택 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">인구통계 — 필수</div>
                  <div className="grid grid-cols-2 gap-3">
                    {['나이구간', '성별', '학력', '지역'].map(label => (
                      <div key={label} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-50 border border-brand-200">
                        <span className="w-4 h-4 rounded bg-brand-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-brand-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">행동 파라미터 — 선택</div>
                  <div className="grid grid-cols-2 gap-3">
                    {BEHAVIOR_FIELDS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => toggleBehavior(f.key)}
                        className={[
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-left',
                          activeBehavior.has(f.key)
                            ? 'bg-brand-50 border-brand-200'
                            : 'bg-white border-gray-200 hover:border-gray-300',
                        ].join(' ')}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${activeBehavior.has(f.key) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                          {activeBehavior.has(f.key) && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm font-medium ${activeBehavior.has(f.key) ? 'text-brand-700' : 'text-gray-700'}`}>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full px-5 py-3.5 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 flex items-center justify-center gap-2 transition"
                >
                  다음
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Step 2 — 값 설정 */}
            {step === 2 && (
              <div className="space-y-6">
                <ChipGroup
                  label="나이구간" required
                  options={AGE_BUCKETS}
                  selected={filterParams.age_buckets}
                  onToggle={v => toggleMulti('age_buckets', v)}
                />

                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">성별</label>
                    <span className="text-[10px] font-semibold text-rose-600">필수</span>
                  </div>
                  <div className="flex gap-2">
                    {SEX_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setFilterParams({ ...filterParams, sex: opt })}
                        className={[
                          'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          filterParams.sex === opt
                            ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <ChipGroup
                  label="학력" required
                  options={EDU_OPTIONS}
                  selected={filterParams.education_levels}
                  onToggle={v => toggleMulti('education_levels', v)}
                />

                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">지역</label>
                    <span className="text-[10px] text-gray-400">선택 — 미선택 시 전국</span>
                  </div>
                  <div className="mb-2">
                    <button
                      onClick={() => {
                        const hasMetro = METRO.every(p => filterParams.provinces.includes(p))
                        setFilterParams({
                          ...filterParams,
                          provinces: hasMetro
                            ? filterParams.provinces.filter(p => !METRO.includes(p))
                            : [...new Set([...filterParams.provinces, ...METRO])],
                        })
                      }}
                      className="px-3 py-1 rounded-full text-xs font-semibold border border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                    >
                      수도권 전체
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PROVINCE_LIST.map(pv => (
                      <button
                        key={pv}
                        onClick={() => toggleMulti('provinces', pv)}
                        className={[
                          'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                          filterParams.provinces.includes(pv)
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {pv}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 행동 필드 (선택된 것만) */}
                {BEHAVIOR_FIELDS.filter(f => activeBehavior.has(f.key)).map(f => (
                  <div key={f.key}>
                    <div className="flex items-baseline gap-2 mb-2.5">
                      <label className="text-sm font-semibold text-gray-900">{f.label} 키워드</label>
                      <span className="text-[10px] text-gray-400">선택</span>
                    </div>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={(filterParams as Record<string, string>)[f.key] ?? ''}
                      onChange={e => setFilterParams({ ...filterParams, [f.key]: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}

                {/* 시뮬레이션 인원 */}
                <div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <label className="text-sm font-semibold text-gray-900">시뮬레이션 인원</label>
                    <span className="text-[10px] text-gray-400">많을수록 통계 정확도 향상</span>
                  </div>
                  <div className="flex gap-2">
                    {([50, 100, 200] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => setSimulationN(n)}
                        className={[
                          'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          simulationN === n
                            ? 'border-2 border-brand-600 bg-brand-600 text-white font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                        ].join(' ')}
                      >
                        {n}명 {n === 100 && <span className="text-[10px] opacity-70">기본</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {simulationN === 50 ? '±13.9% 오차 · ~2분' : simulationN === 100 ? '±9.8% 오차 · ~3~4분' : '±6.9% 오차 · ~6~7분'} (Groq 기준)
                  </p>
                </div>

                {/* Match result */}
                {isReady && (
                  <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
                    {castLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
                        매칭 중…
                      </div>
                    ) : totalCount > 0 ? (
                      <>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 mb-3">
                          시뮬레이션 참가자 — {previewPersonas.length}명 미리보기 (전체 {totalCount.toLocaleString()}명)
                        </div>
                        <div className="flex flex-col gap-3">
                          {previewPersonas.map((p, i) => (
                            <PersonaSpecCard key={i} persona={p} index={i} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-rose-600 font-medium">해당 조건의 페르소나가 없습니다.</div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={runAnalysis}
                  disabled={!isReady || totalCount === 0}
                  className={[
                    'w-full px-5 py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition',
                    isReady && totalCount > 0
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  시뮬레이션 실행
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음 또는 ProgressScreen 관련 에러만

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/screens/TargetSelectScreen.tsx
git commit -m "feat: TargetSelectScreen 2-step UI with FilterParams and behavior field toggles"
```

---

## Task 10: ProgressScreen — 시간 추정 수정

**Files:**
- Modify: `frontend/src/components/screens/ProgressScreen.tsx`

- [ ] **Step 1: `estimateTotalSeconds` 수정 + analyze 호출 수정**

`ProgressScreen.tsx`에서 다음 교체:

기존:
```typescript
const {
  files, flowEdges,
  matchedStrata, taskDesc, totalCount,
  previewPersonas,
  ...
} = useApp()
...
const estimatedTotal = estimateTotalSeconds(files.length, matchedStrata.length)
```

신규:
```typescript
const {
  files, flowEdges,
  filterParams, simulationN, taskDesc, totalCount,
  previewPersonas,
  ...
} = useApp()
...
const estimatedTotal = estimateTotalSeconds(files.length, simulationN)
```

기존 함수:
```typescript
function estimateTotalSeconds(fileCount: number, strataCount: number): number {
  const m1 = fileCount * 5
  const m3 = strataCount * fileCount * 2
  const m4 = 15
  return Math.max(30, m1 + m3 + m4)
}
```

신규:
```typescript
function estimateTotalSeconds(fileCount: number, n: number): number {
  const m1 = fileCount * 5
  // 30 RPM → batch size 30, ~60s per batch
  const m3 = Math.ceil(n / 30) * 60 * fileCount
  const m4 = 15
  return Math.max(60, m1 + m3 + m4)
}
```

`analyze` 호출 부분 교체:

기존:
```typescript
const result = await analyze({
  strataKeys: matchedStrata,
  task: taskDesc.trim() || '서비스 탐색하기',
  files: files.length > 0 ? files : undefined,
  flowEdges,
})
```

신규:
```typescript
const result = await analyze({
  filterParams,
  n: simulationN,
  task: taskDesc.trim() || '서비스 탐색하기',
  files: files.length > 0 ? files : undefined,
  flowEdges,
})
```

- [ ] **Step 2: TypeScript 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/screens/ProgressScreen.tsx
git commit -m "feat: update ProgressScreen time estimate for n-based simulation + filterParams"
```

---

## Task 11: 프론트엔드 빌드 + 정리

**Files:**
- Delete: `scripts/build_strata.py`

- [ ] **Step 1: 프론트엔드 빌드**

```bash
cd frontend && npm run build
```
Expected: `dist/` 생성, 에러 없음

- [ ] **Step 2: 서버 기동 후 전체 플로우 확인**

```bash
uvicorn src.backend.api:app --reload --port 8000
```

브라우저 `http://localhost:8000` → Source 선택 → Target 선택 (Step 1 → Step 2) → 필터 설정 → "대상자 N명" 확인 → 시뮬레이션 실행 → 결과 확인.

- [ ] **Step 3: build_strata.py 삭제**

```bash
git rm scripts/build_strata.py
```

- [ ] **Step 4: 최종 Commit**

```bash
git add frontend/dist
git commit -m "feat: complete parquet-based dynamic filter — remove strata, add DuckDB pipeline"
```

---

## Self-Review

**Spec coverage 체크:**

| Spec 요구사항 | Task |
|---|---|
| download_dataset.py | Task 2 |
| DuckDB 싱글톤 | Task 3 |
| FilterRequest 모델 | Task 4 |
| /build-cast 교체 | Task 4 |
| logic.py strata→DuckDB | Task 5 |
| /analyze filter_params | Task 6 |
| types.ts FilterParams | Task 7 |
| AppContext 통합 | Task 7 |
| api.ts 교체 | Task 8 |
| 2-Step UI | Task 9 |
| ProgressScreen 시간 수정 | Task 10 |
| build_strata.py 삭제 | Task 11 |
| SAMPLE 엣지케이스 guard | Task 3 (query_sample) |
| Groq 시간 정직 표시 | Task 9 (오차+시간 안내), Task 10 (estimateTotalSeconds) |

**타입 일관성:**
- `FilterParams` 타입: types.ts에서 정의, api.ts/AppContext/TargetSelectScreen 모두 동일 참조
- `query_sample` 반환 dict 키: `hobbies_and_interests` (AS alias), M3 `_build_messages`가 `persona.get("hobbies_and_interests", "")` 사용 — 일치
- `simulationN` 타입: `50 | 100 | 200` — AnalyzeParams.n과 일치
