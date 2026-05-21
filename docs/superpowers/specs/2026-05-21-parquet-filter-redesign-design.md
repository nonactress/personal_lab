# Spec: Parquet 기반 동적 페르소나 필터 시스템

**날짜**: 2026-05-21
**상태**: 승인 대기

---

## 배경

현재 `/build-cast`는 사전 빌드된 `nemotron_strata.json` (40 strata × 10 personas)에서 age×edu×sex 조합으로 페르소나를 반환한다. 제약:
- 필터 차원이 3개로 고정 (age_group, education, sex)
- 행동 파라미터 (occupation, hobbies 등) 필터가 10개 샘플 후처리라 대표성 낮음
- strata당 10명 → 통계적 의미 없음 (±31% 오차)

## 목표

- 인구통계 4개 필드 + 행동 4개 필드로 필터 확장
- 전체 1M 행 parquet에서 실시간 쿼리 → 정확한 count + 대표 샘플
- 기본 n=100 시뮬레이션 → ±9.8% 오차 (95% CI)

---

## 데이터 레이어

### 다운로드
```
scripts/download_dataset.py
```
- `nonactress/Nemotron-Personas-Korea-bucket` HuggingFace → `data/nemotron_full.parquet`
- 1회 실행, ~2GB, gitignored
- `.env`의 `HF_TOKEN` 사용

### 쿼리 엔진
```
src/core/db.py   ← DuckDB 싱글톤
```
- 서버 시작 시 lazy init
- 매 쿼리 parquet 직접 읽기 (RAM ~200MB)
- `USING SAMPLE n REPEATABLE(seed)` 로 재현 가능 샘플링

### 삭제 대상
- `data/nemotron_strata.json`
- `scripts/build_strata.py`

---

## API 설계

### FilterRequest (공통 모델)

```python
class FilterRequest(BaseModel):
    # 인구통계 — 필수
    age_buckets: list[str]       # ["10~20대", "30대"]
    sex: str = "모두"            # "남자" | "여자" | "모두"
    education_levels: list[str]  # ["대졸", "대학원"]
    provinces: list[str] = []    # ["서울", "경기"] — 빈 배열=모두

    # 행동 — 선택 (빈 문자열=무시)
    occupation_kw: str = ""
    hobbies_kw: str = ""
    skills_kw: str = ""
    cultural_kw: str = ""

    # 시뮬레이션 규모
    n: int = 100                 # 50 | 100 | 200
```

### Age Bucket SQL 매핑

| 버킷 | age 범위 |
|------|---------|
| 10~20대 | 19 ≤ age ≤ 29 |
| 30대 | 30 ≤ age ≤ 39 |
| 40대 | 40 ≤ age ≤ 49 |
| 50대 | 50 ≤ age ≤ 59 |
| 60대+ | age ≥ 60 |

### POST /build-cast

**Input**: `FilterRequest`
**Output**:
```json
{
  "total_count": 12400,
  "preview_personas": [ /* 3명, 전체 필드 */ ]
}
```
- DuckDB 쿼리 → count + SAMPLE 3 preview

### POST /analyze

**Input**: FormData — `files[]`, `filter_params` (JSON string of FilterRequest), `task`, `flow_edges`, `n`
**Flow**: `FilterRequest` → DuckDB SAMPLE n → M3 × n (async) → M4 집계
- 기존 `strata_keys: list[str]` 파라미터 → `filter_params: str` 로 교체

---

## DuckDB 쿼리 구조

```sql
SELECT
    age, sex, education_level, province,
    occupation, hobbies_and_interests,
    skills_and_expertise, cultural_background,
    persona, professional_persona
FROM 'data/nemotron_full.parquet'
WHERE age BETWEEN :age_lo AND :age_hi   -- age_buckets OR 조합
  AND (:sex = '모두' OR sex = :sex)
  AND education_level IN (:edu_list)
  AND (:provinces_empty OR province IN (:provinces))
  AND (:occ_kw = '' OR occupation ILIKE '%' || :occ_kw || '%')
  AND (:hobbies_kw = '' OR hobbies_and_interests ILIKE '%' || :hobbies_kw || '%')
USING SAMPLE :n ROWS
```

age_buckets가 복수일 경우 각 버킷의 범위를 OR로 결합.

---

## 프론트엔드

### AppContext 변경

```typescript
// 기존 selectedAgeGroup, selectedSex, selectedEducation... 삭제
filterParams: FilterRequest   // 단일 객체로 통합
setFilterParams: (p: FilterRequest) => void
simulationN: 50 | 100 | 200   // 기본 100
```

### TargetSelectScreen — 2-Step UI

**Step 1: 필드 선택**
```
┌─ 인구통계 (필수) ──────────────────┐
│  ✓ 나이구간   ✓ 성별              │
│  ✓ 학력       ✓ 지역              │
└────────────────────────────────────┘
┌─ 행동 파라미터 (선택) ─────────────┐
│  □ 직업 키워드   □ 취미 키워드     │
│  □ 기술 키워드   □ 문화 배경       │
└────────────────────────────────────┘
[다음 →]
```

**Step 2: 값 설정**
- age_buckets: chip multi-select (5개, 복수 선택 가능)
- sex: 3-way toggle (남자 / 여자 / 모두)
- education_levels: chip multi-select (6개)
- provinces: 17개 체크박스 + "수도권 전체" 빠른선택 버튼
- 행동 필드 (선택된 것만): text input with placeholder
- 시뮬레이션 인원: **50** / **100** / **200** 토글 (기본 100)

Step 2 하단: "이 조건의 대상자 N명" 실시간 업데이트 (debounce 500ms)

---

## 삭제 vs 유지

| 항목 | 처리 |
|------|------|
| `data/nemotron_strata.json` | 삭제 |
| `scripts/build_strata.py` | 삭제 |
| `src/backend/api.py` strata 로직 | 삭제 |
| `BuildCastRequest` 모델 | → `FilterRequest` 교체 |
| `strata_keys` form param | → `filter_params` JSON string 교체 |
| `frontend/src/types.ts` strata 타입 | 교체 |
| `frontend/src/context/AppContext.tsx` | filterParams 단일 객체로 통합 |

---

## 통계적 근거

| n | 오차범위 (95% CI) |
|---|---|
| 50 | ±13.9% |
| **100** | **±9.8%** ← 기본값 |
| 200 | ±6.9% |

기본 100명: Groq free tier(30 RPM) 기준 async 처리 ~10초 내 완료.

---

## 의존성 추가

```
duckdb>=0.10
```

`HF_TOKEN` 환경변수 (download_dataset.py 실행 시 필요).
