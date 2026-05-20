# 백엔드 최적화 계획

## 배경

트래픽이 몰릴 때 응답 속도가 느려지는 병목 지점을 분석하고, 우선순위 순서로 최적화 방법을 정리한다.

---

## A. 데이터 로딩

### A-1. 서버 시작 시 strata 사전 파싱

**현재 문제**
`logic.py`의 `_load_strata()`는 첫 번째 요청이 왔을 때 `nemotron_strata.json`을 읽고 파싱한다.
첫 사용자가 파싱 시간(수백ms)을 그대로 응답 지연으로 받는다.

**수정 방향**
FastAPI `startup` 이벤트를 사용해 서버가 켜지는 시점에 미리 파싱해둔다.
이후 모든 요청은 메모리에 올라간 딕셔너리를 즉각 반환한다.

```python
@app.on_event("startup")
async def preload_strata():
    global _STRATA_CACHE
    with open("data/nemotron_strata.json") as f:
        _STRATA_CACHE = json.load(f)
```

---

### A-2. api.py의 strata 캐시 누락 수정

**현재 문제**
`api.py`의 `_load_strata_once()`는 이름과 달리 매 `/build-cast` 요청마다 파일을 열고 파싱한다.
`logic.py`에는 캐시가 있지만 `api.py`에는 없어서 같은 파일을 중복으로 읽는 구조다.

**수정 방향**
`api.py`에도 모듈 수준 캐시 변수를 두고, 첫 호출 이후에는 메모리에서 반환한다.

```python
_STRATA_CACHE_API: dict | None = None

def _load_strata_once() -> dict:
    global _STRATA_CACHE_API
    if _STRATA_CACHE_API is None:
        with open(_STRATA_PATH, encoding="utf-8") as f:
            _STRATA_CACHE_API = json.load(f)
    return _STRATA_CACHE_API
```

---

## B. LLM 호출 줄이기

### B-1. M1 병렬 실행

**현재 문제**
`m1_analyzer.py`의 `analyze_code()`는 내부에서 LLM을 두 번 직렬로 호출한다.
- LLM ①: 코드 → UI 구조 분석
- LLM ②: 코드 → 프리뷰 HTML 생성

두 호출 모두 `source_code`만 있으면 실행 가능하고 서로의 결과를 필요로 하지 않는다.
그런데 지금은 ①이 끝난 후 ②가 시작되므로 총 대기 시간이 두 배가 된다.

**수정 방향**
`asyncio.gather()`로 두 LLM 호출을 동시에 발사한다.
총 소요 시간이 절반으로 줄어든다.

```python
analysis, preview = await asyncio.gather(
    analyze_code_async(source_code, task),
    generate_preview_html_async(source_code),
)
result = analysis
result["preview_html"] = preview
```

---

### B-2. M1 결과 캐싱

**현재 문제**
같은 코드를 올리더라도 strata 조합을 바꿔서 재분석할 때마다 M1(UI 구조 분석 LLM)을 다시 호출한다.
M1은 코드와 task만 보고 UI 구조를 분석하므로 strata가 달라져도 결과가 동일하다.
전체 파이프라인을 캐싱하면 사용자마다 코드가 달라 캐시 히트율이 낮지만,
M1만 캐싱하면 "같은 코드에 다른 페르소나 조합을 테스트"하는 실제 사용 패턴에서 효과가 크다.

**수정 방향**
`(코드 해시 + task)` 조합을 캐시 키로 사용해 M1 결과(ui_map)만 저장한다.
strata를 바꿔 재분석할 때 M1 LLM 2번을 건너뛰고 M3부터 실행한다.

```python
_UI_MAP_CACHE: dict = {}

async def run_pipeline(codebase, strata_keys, task):
    m1_key = hashlib.md5(
        (codebase[0]["content"] + task).encode()
    ).hexdigest()

    if m1_key in _UI_MAP_CACHE:
        ui_map = _UI_MAP_CACHE[m1_key]   # M1 LLM 건너뜀
    else:
        ui_map = analyze_code(codebase[0]["content"], task)
        _UI_MAP_CACHE[m1_key] = ui_map

    # M3, M4는 항상 실행 (strata마다 다른 결과)
    ...
```

같은 코드에 strata를 바꿔 여러 번 분석할수록 캐시 히트율이 높아진다.

---

## C. 네트워크 전송 압축

### C-1. GZip 미들웨어

**현재 문제**
분석 결과 JSON(`friction_map`, `fix_prompts`, `preview_html` 등)은 수십 KB에 달할 수 있다.
현재 HTTP 응답에 압축이 적용되지 않아 네트워크 전송량이 크다.

**수정 방향**
FastAPI 내장 GZip 미들웨어를 추가한다.
1KB 이상의 응답을 자동으로 압축해서 전송하고, 브라우저가 자동으로 압축을 해제한다.
코드 변경 없이 미들웨어 한 줄로 적용된다.

```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

응답 크기에 따라 네트워크 전송량 70~80% 감소 효과를 기대할 수 있다.

---

## D. 클라이언트 관리

### D-1. M4 Groq 클라이언트 싱글턴

**현재 문제**
`m4_scorer.py`의 `_groq_client()`는 호출될 때마다 새 `OpenAI` 객체를 생성한다.
객체 생성 시 HTTP 연결 풀이 초기화되므로, 이전 연결을 재사용하지 못하고 매번 새 연결을 맺는다.
M3(`m3_simulation.py`)는 이미 싱글턴 패턴으로 구현되어 있어 M4만 누락된 상태다.

**수정 방향**
모듈 수준 변수에 클라이언트를 저장하고 첫 호출 이후 재사용한다.

```python
_CLIENT: OpenAI | None = None

def _groq_client() -> OpenAI:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _CLIENT
```

---

## 우선순위 요약

| 항목 | 난이도 | 효과 |
|---|---|---|
| A-2. api.py 캐시 누락 수정 | 낮음 | 중간 |
| C-1. GZip 미들웨어 | 낮음 | 중간 |
| D-1. M4 클라이언트 싱글턴 | 낮음 | 낮음 |
| A-1. 서버 시작 시 사전 파싱 | 낮음 | 중간 |
| B-1. M1 병렬 실행 | 중간 | 높음 |
| B-2. 분석 결과 캐싱 | 중간 | 매우 높음 |
