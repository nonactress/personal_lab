# build-cast 버그 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/build-cast` 엔드포인트 6개 버그 수정 — 나이 범위 오류, DuckDB 스레드 안전성, 입력값 검증 누락, req.n 무시

**Architecture:** `db.py`에서 데이터 레이어 버그 수정, `api.py` `FilterRequest`에 Pydantic validator 추가로 입력 검증을 API 경계에서 처리. DuckDB는 `threading.local()`로 스레드별 독립 연결.

**Tech Stack:** FastAPI, Pydantic v2, DuckDB, pytest

---

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/core/db.py` | AGE_BUCKET_MAP 수정, threading.local 연결 |
| `src/backend/api.py` | FilterRequest Pydantic validator 추가 |
| `tests/test_db.py` | 나이 범위 / 빈 education 테스트 추가 |
| `tests/test_api.py` | validator 테스트 추가 |

---

## Task 1: AGE_BUCKET_MAP "10~20대" 범위 수정

**Files:**
- Modify: `src/core/db.py:17`
- Test: `tests/test_db.py`

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_db.py` 하단에 추가:

```python
def test_age_bucket_10대_포함():
    """10~20대 버킷은 10살부터 포함해야 한다"""
    from src.core.db import AGE_BUCKET_MAP
    lo, hi = AGE_BUCKET_MAP["10~20대"]
    assert lo == 10, f"10대 시작이 {lo}임 — 10이어야 함"
    assert hi == 29
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pytest tests/test_db.py::test_age_bucket_10대_포함 -v
```

Expected: `FAILED — AssertionError: 10대 시작이 19임`

- [ ] **Step 3: db.py 수정**

`src/core/db.py:17` 수정:

```python
AGE_BUCKET_MAP: dict[str, tuple[int, int]] = {
    "10~20대": (10, 29),   # 19 → 10 으로 수정
    "30대":    (30, 39),
    "40대":    (40, 49),
    "50대":    (50, 59),
    "60대+":   (60, 999),
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_db.py -v
```

Expected: 전체 PASSED

- [ ] **Step 5: 커밋**

```bash
git add src/core/db.py tests/test_db.py
git commit -m "fix: 10~20대 나이 범위 19→10으로 수정"
```

---

## Task 2: DuckDB 스레드 안전성 — threading.local 연결

**Files:**
- Modify: `src/core/db.py:1-31`

DuckDB 단일 연결은 멀티스레드 환경에서 경합 발생. `threading.local()`로 스레드별 독립 연결 생성.

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_db.py` 하단에 추가:

```python
import threading

def test_duckdb_concurrent_access():
    """여러 스레드가 동시에 query_count 호출해도 오류 없어야 함"""
    import pytest
    from src.core.db import build_where_clause, query_count
    from pathlib import Path

    if not Path("data/nemotron_full.parquet").exists():
        pytest.skip("parquet 파일 없음")

    where, params = build_where_clause(
        age_buckets=["30대"], sex="모두", education_levels=["대졸"],
        provinces=[], occupation_kw="", hobbies_kw="", skills_kw="", cultural_kw=""
    )

    errors = []
    def worker():
        try:
            query_count(where, params)
        except Exception as e:
            errors.append(str(e))

    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == [], f"동시 접근 오류: {errors}"
```

- [ ] **Step 2: 테스트 실행 (현재 상태 확인)**

```bash
pytest tests/test_db.py::test_duckdb_concurrent_access -v
```

parquet 없으면 skip. 있으면 실패 또는 통과 — 현재 상태 기록.

- [ ] **Step 3: db.py 연결 로직 수정**

`src/core/db.py` 상단부 전체 교체:

```python
import threading
from pathlib import Path
import duckdb

_PARQUET = Path("data/nemotron_full.parquet")
_LOCAL = threading.local()


def _conn() -> duckdb.DuckDBPyConnection:
    if not hasattr(_LOCAL, "conn") or _LOCAL.conn is None:
        _LOCAL.conn = duckdb.connect(database=":memory:", read_only=False)
    return _LOCAL.conn
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_db.py -v
```

Expected: 전체 PASSED

- [ ] **Step 5: 커밋**

```bash
git add src/core/db.py
git commit -m "fix: DuckDB 연결을 threading.local로 스레드별 격리"
```

---

## Task 3: education_levels 빈 리스트 → 400 에러

**Files:**
- Modify: `src/core/db.py` (build_where_clause)
- Test: `tests/test_db.py`

현재 `education_levels=[]` 전달 시 조건 없이 전체 학력 검색. 명시적 에러 필요.

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_db.py` 하단에 추가:

```python
def test_build_where_education_levels_빈리스트_거부():
    """education_levels 빈 리스트는 ValueError 발생해야 함"""
    with pytest.raises(ValueError, match="education_levels"):
        build_where_clause(
            age_buckets=["30대"],
            sex="모두",
            education_levels=[],
            provinces=[],
            occupation_kw="", hobbies_kw="", skills_kw="", cultural_kw=""
        )
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pytest tests/test_db.py::test_build_where_education_levels_빈리스트_거부 -v
```

Expected: `FAILED — did not raise`

- [ ] **Step 3: build_where_clause에 검증 추가**

`src/core/db.py` `build_where_clause` 함수 안 `if not age_buckets:` 바로 아래에 추가:

```python
    if not age_buckets:
        raise ValueError("age_buckets는 최소 1개 필요")
    if not education_levels:
        raise ValueError("education_levels는 최소 1개 필요")
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_db.py -v
```

Expected: 전체 PASSED

- [ ] **Step 5: 커밋**

```bash
git add src/core/db.py tests/test_db.py
git commit -m "fix: education_levels 빈 리스트 전달 시 ValueError 발생"
```

---

## Task 4: 잘못된 education_levels / sex 값 → 명시적 에러

**Files:**
- Modify: `src/backend/api.py` (FilterRequest)
- Test: `tests/test_api.py`

잘못된 값이 오면 0건 반환하는 무음 실패 대신 422 에러로 즉시 차단.

- [ ] **Step 1: 기존 test_api.py 확인**

```bash
cat tests/test_api.py
```

내용 확인 후 아래 테스트를 기존 파일 하단에 추가.

- [ ] **Step 2: 실패 테스트 작성**

`tests/test_api.py` 하단에 추가:

```python
from fastapi.testclient import TestClient
from src.backend.api import app

client = TestClient(app)


def test_build_cast_잘못된_sex_거부():
    """sex 필드는 모두/남자/여자 만 허용"""
    res = client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["대졸"],
        "sex": "외계인",
    })
    assert res.status_code == 422


def test_build_cast_잘못된_age_bucket_거부():
    """AGE_BUCKET_MAP에 없는 값 → 422"""
    res = client.post("/build-cast", json={
        "age_buckets": ["100대"],
        "education_levels": ["대졸"],
    })
    assert res.status_code == 422


def test_build_cast_잘못된_education_level_거부():
    """EDU_MAP에 없는 학력 값 → 422"""
    res = client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["비전공자"],
    })
    assert res.status_code == 422


def test_build_cast_education_levels_빈리스트_거부():
    """education_levels 빈 리스트 → 422"""
    res = client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": [],
    })
    assert res.status_code == 422
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

```bash
pytest tests/test_api.py -v -k "잘못된"
```

Expected: 여러 FAILED

- [ ] **Step 4: FilterRequest에 Pydantic validator 추가**

`src/backend/api.py` 상단 import에 `field_validator` 추가:

```python
from pydantic import BaseModel, field_validator
```

`FilterRequest` 클래스 전체를 아래로 교체:

```python
_VALID_SEX = {"모두", "남자", "여자"}
_VALID_AGE_BUCKETS = {"10~20대", "30대", "40대", "50대", "60대+"}
_VALID_EDU_LEVELS = {"고졸이하", "전문대", "대졸", "대학원"}


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

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        if v not in _VALID_SEX:
            raise ValueError(f"sex는 {_VALID_SEX} 중 하나여야 합니다. 입력값: {v!r}")
        return v

    @field_validator("age_buckets")
    @classmethod
    def validate_age_buckets(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("age_buckets는 최소 1개 필요")
        invalid = [x for x in v if x not in _VALID_AGE_BUCKETS]
        if invalid:
            raise ValueError(f"유효하지 않은 age_bucket: {invalid}. 허용값: {sorted(_VALID_AGE_BUCKETS)}")
        return v

    @field_validator("education_levels")
    @classmethod
    def validate_education_levels(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("education_levels는 최소 1개 필요")
        invalid = [x for x in v if x not in _VALID_EDU_LEVELS]
        if invalid:
            raise ValueError(f"유효하지 않은 education_level: {invalid}. 허용값: {sorted(_VALID_EDU_LEVELS)}")
        return v
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest tests/test_api.py -v
```

Expected: 전체 PASSED

- [ ] **Step 6: 커밋**

```bash
git add src/backend/api.py tests/test_api.py
git commit -m "fix: FilterRequest에 sex/age_buckets/education_levels 입력값 검증 추가"
```

---

## Task 5: FilterRequest.n 실제 반영

**Files:**
- Modify: `src/backend/api.py` (build_cast 핸들러)
- Test: `tests/test_api.py`

`/build-cast`의 preview는 항상 3명 고정이 맞음. 문제는 `n` 필드가 `FilterRequest`에 있지만 전혀 사용되지 않아 혼란 유발. `n`을 response에 포함시켜 클라이언트가 선택한 시뮬레이션 인원이 반영됐음을 확인 가능하게 함.

- [ ] **Step 1: 실패 테스트 작성**

`tests/test_api.py` 하단에 추가:

```python
def test_build_cast_응답에_n_포함(monkeypatch):
    """build-cast 응답에 선택한 n값이 포함되어야 함"""
    import src.core.db as db_module

    monkeypatch.setattr(db_module, "query_count", lambda w, p: 500)
    monkeypatch.setattr(db_module, "query_sample", lambda w, p, n, total: [
        {"age": 32, "sex": "남자", "occupation": "개발자", "province": "서울",
         "education_level": "4년제 대학교", "persona": "테스트", "professional_persona": "",
         "hobbies_and_interests": "", "skills_and_expertise": "", "cultural_background": ""}
    ] * min(n, 3))

    res = client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["대졸"],
        "n": 200,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["simulation_n"] == 200
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pytest tests/test_api.py::test_build_cast_응답에_n_포함 -v
```

Expected: `FAILED — KeyError: simulation_n`

- [ ] **Step 3: build_cast 핸들러 수정**

`src/backend/api.py` `build_cast` 함수의 return 블록 수정:

```python
        return {
            "total_count": total,
            "preview_personas": preview[:3],
            "simulation_n": req.n,
        }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_api.py -v
```

Expected: 전체 PASSED

- [ ] **Step 5: 전체 테스트 실행**

```bash
pytest tests/ -v
```

Expected: 전체 PASSED (parquet 없는 테스트는 skip)

- [ ] **Step 6: 커밋**

```bash
git add src/backend/api.py tests/test_api.py
git commit -m "fix: build-cast 응답에 simulation_n 포함, req.n 반영"
```

---

## 완료 검증

```bash
pytest tests/test_db.py tests/test_api.py -v
```

| 검증 항목 | 테스트 |
|----------|--------|
| 10~20대 범위 (10, 29) | `test_age_bucket_10대_포함` |
| 동시 DuckDB 접근 | `test_duckdb_concurrent_access` |
| education_levels 빈 리스트 → 에러 | `test_build_where_education_levels_빈리스트_거부` |
| 잘못된 sex 값 → 422 | `test_build_cast_잘못된_sex_거부` |
| 잘못된 age_bucket → 422 | `test_build_cast_잘못된_age_bucket_거부` |
| 잘못된 education_level → 422 | `test_build_cast_잘못된_education_level_거부` |
| simulation_n 응답 반영 | `test_build_cast_응답에_n_포함` |
