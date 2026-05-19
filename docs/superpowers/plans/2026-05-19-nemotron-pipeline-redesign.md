# Nemotron Pipeline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nemotron-Personas-Korea 데이터셋 기반으로 파이프라인 전면 교체 — 개발자가 정의한 행동 파라미터 제거, LLM이 Nemotron 원본 텍스트로 자유 시뮬, BlinkDB식 가중 집계로 "N/100명" 마찰 리포트 반환.

**Architecture:** `build_strata.py`로 오프라인 1회 데이터 인덱스 빌드 → `/build-cast`로 demographic 필드 매칭 → `/analyze`에 `strata_keys` 넘기면 async 병렬 시뮬(semaphore 25) → 가중 집계로 friction_map 반환. `m2_persona.py`·`persona_params/` 전면 삭제.

**Tech Stack:** FastAPI async, asyncio.Semaphore, openai(AsyncOpenAI), datasets(HuggingFace streaming), Alpine.js

---

## File Map

| 파일 | 변화 |
|---|---|
| `scripts/build_strata.py` | 신규 — Nemotron 스트리밍 → strata JSON 빌드 |
| `data/nemotron_strata.json` | 신규 — 오프라인 빌드 산출물 |
| `src/core/m3_simulation.py` | 전면 교체 — Nemotron 텍스트 주입 async 시뮬 |
| `src/core/m4_scorer.py` | 수정 — weighted aggregation 추가 |
| `src/core/logic.py` | 전면 교체 — async strata 파이프라인 |
| `src/backend/api.py` | 수정 — `/build-cast` 추가, `/persona-features`·`/generate-cast` 제거, `/analyze` 수정 |
| `src/frontend/app.js` | 수정 — target_select 화면, strata 기반 analyze |
| `src/frontend/index.html` | 수정 — target_select HTML, friction_map 리포트 |
| `src/core/m2_persona.py` | 삭제 |
| `data/persona_params/` | 삭제 |
| `tests/test_m2.py` | 삭제 |
| `tests/test_m4.py` | 수정 — weighted aggregation 테스트 |
| `tests/test_pipeline.py` | 수정 — async pipeline 테스트 |

---

## Task 1: build_strata.py 작성

**Files:**
- Create: `scripts/build_strata.py`

- [ ] **Step 1: 파일 작성**

```python
"""
Nemotron-Personas-Korea → data/nemotron_strata.json 빌드
실행: python scripts/build_strata.py
소요: 10~30분 (1회만 실행)
"""
from datasets import load_dataset
import json
from pathlib import Path
from datetime import date

AGE_BUCKETS = [
    ("10~20대", 19, 29),
    ("30대",   30, 39),
    ("40대",   40, 49),
    ("50대",   50, 59),
    ("60대+",  60, 999),
]

EDU_MAP = {
    "초등학교":        "고졸이하",
    "중학교":          "고졸이하",
    "고등학교":        "고졸이하",
    "2~3년제 전문대학": "전문대",
    "4년제 대학교":    "대졸",
    "대학원":          "대학원",
}

def _age_group(age: int) -> str | None:
    for label, lo, hi in AGE_BUCKETS:
        if lo <= age <= hi:
            return label
    return None

def _edu_group(edu: str) -> str:
    return EDU_MAP.get(edu, "고졸이하")

def _hobbies_str(row: dict) -> str:
    h = row.get("hobbies_and_interests_list") or row.get("hobbies_and_interests", "")
    if isinstance(h, list):
        return ", ".join(str(x) for x in h)
    return str(h)

def build_strata():
    ds = load_dataset("nvidia/Nemotron-Personas-Korea", split="train", streaming=True)
    strata: dict = {}
    total = 0

    for row in ds:
        total += 1
        ag = _age_group(row["age"])
        if ag is None:
            continue
        eg = _edu_group(row["education_level"])
        sex = row["sex"]
        key = f"{ag}_{eg}_{sex}"

        if key not in strata:
            strata[key] = {
                "count": 0,
                "keys": {"age_group": ag, "education": eg, "sex": sex},
                "personas": [],
            }

        strata[key]["count"] += 1

        if len(strata[key]["personas"]) < 3:
            strata[key]["personas"].append({
                "age": row["age"],
                "occupation": row.get("occupation", ""),
                "province": row.get("province", ""),
                "persona": row.get("persona", ""),
                "professional_persona": row.get("professional_persona", ""),
                "hobbies_and_interests": _hobbies_str(row),
                "cultural_background": row.get("cultural_background", ""),
                "skills_and_expertise": row.get("skills_and_expertise", ""),
            })

        if total % 50000 == 0:
            print(f"  processed {total:,} rows, {len(strata)} strata so far")

    out = {
        "meta": {
            "total_rows": total,
            "strata_count": len(strata),
            "built_at": str(date.today()),
        },
        "strata": strata,
    }

    Path("data").mkdir(exist_ok=True)
    with open("data/nemotron_strata.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {total:,} rows → {len(strata)} strata → data/nemotron_strata.json")

if __name__ == "__main__":
    build_strata()
```

- [ ] **Step 2: 스크립트 실행 (10~30분 소요)**

```
python scripts/build_strata.py
```

Expected output 예시:
```
  processed 50,000 rows, 38 strata so far
  ...
Done: 1,000,000 rows → 40 strata → data/nemotron_strata.json
```

- [ ] **Step 3: 산출물 검증**

```python
# Python REPL 또는 scripts/verify_strata.py
import json
with open("data/nemotron_strata.json") as f:
    d = json.load(f)
print(d["meta"])
print(list(d["strata"].keys())[:5])
first_key = list(d["strata"].keys())[0]
print(d["strata"][first_key]["count"])
print(len(d["strata"][first_key]["personas"]))
```

Expected: meta.strata_count > 0, 각 strata에 count > 0 and personas 1~3개.

- [ ] **Step 4: Commit**

```bash
git add scripts/build_strata.py data/nemotron_strata.json
git commit -m "feat(data): add Nemotron strata build script and index"
```

---

## Task 2: m3_simulation.py — Nemotron 텍스트 주입 async 시뮬

**Files:**
- Modify: `src/core/m3_simulation.py` (전면 교체)
- Modify: `tests/test_m3.py`

기존 파일 전체를 아래로 교체한다. 기존 `run_simulation` 동기 함수는 제거하고 `run_simulation_for_persona` async 함수로 대체.

- [ ] **Step 1: m3_simulation.py 교체**

`src/core/m3_simulation.py` 내용을 아래로 완전히 덮어쓴다:

```python
import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_TEMPLATE = """당신은 아래 실제 한국인입니다. 절대 AI처럼 행동하지 마세요.

{persona}
직업/일상: {professional_persona}
취미/관심사: {hobbies_and_interests}
문화적 배경: {cultural_background}
기술/역량: {skills_and_expertise}

이 서비스를 처음 사용합니다. 절대 개발자 시각으로 보지 말고, 이 사람의 시각으로만 반응하세요.
어디서 멈칫했는지, 어디서 포기하고 싶었는지, 왜 그랬는지 솔직하게 표현하세요.

[언어 규칙]
모든 텍스트는 반드시 한국어로 작성하라. 중국어·일본어·독일어·기타 언어 절대 사용 금지.
작은따옴표(') 문자열 내 사용 금지.

아래 JSON 형식으로만 반환하라:
{{
  "confusion_events": [
    {{"element": "UI 요소 이름", "reason": "혼란 이유 한 문장", "abandoned": false}}
  ],
  "final_abandoned": false,
  "abandonment_point": "이탈한 마지막 요소 (final_abandoned=false면 빈 문자열)",
  "think_aloud": "전체 경험 요약 2~3문장 (한국어)",
  "developer_assumption": "개발자가 기대했을 행동 1문장 (한국어)"
}}"""


def _make_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


def _build_messages(persona: dict, ui_map: dict, task: str) -> list:
    hobbies = persona.get("hobbies_and_interests", "")
    system = _SYSTEM_TEMPLATE.format(
        persona=persona.get("persona", ""),
        professional_persona=persona.get("professional_persona", ""),
        hobbies_and_interests=hobbies,
        cultural_background=persona.get("cultural_background", ""),
        skills_and_expertise=persona.get("skills_and_expertise", ""),
    )
    components_desc = "\n".join(
        f"- [{c['type']}] '{c['label']}' (line {c['line_number']}): {c['context']}"
        for c in ui_map.get("components", [])
    )
    user_content = (
        f"태스크: {task}\n\nUI 요소:\n{components_desc}\n\n"
        f"시각적 위계: {ui_map.get('visual_hierarchy', '없음')}\n"
        f"잠재 이슈: {', '.join(ui_map.get('potential_issues', []))}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]


def _safe_parse(raw: str) -> dict:
    fallback = {
        "confusion_events": [],
        "final_abandoned": False,
        "abandonment_point": "",
        "think_aloud": "",
        "developer_assumption": "",
    }
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.encode("utf-8", errors="replace").decode("utf-8")
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return fallback


async def run_simulation_for_persona(persona: dict, ui_map: dict, task: str) -> dict:
    client = _make_async_client()
    messages = _build_messages(persona, ui_map, task)
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=800,
    )
    return _safe_parse(response.choices[0].message.content)
```

- [ ] **Step 2: test_m3.py 업데이트**

`tests/test_m3.py`를 아래로 교체:

```python
import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

PERSONA = {
    "persona": "30대 직장인 남성, 앱에 익숙하지 않음",
    "professional_persona": "제조업 근무, 스마트폰 기본 사용",
    "hobbies_and_interests": "등산, 뉴스 읽기",
    "cultural_background": "경북 출신, 보수적 소비 성향",
    "skills_and_expertise": "엑셀 기초, SNS 거의 안 함",
}
UI_MAP = {
    "components": [
        {"type": "button", "label": "회원가입", "line_number": 5, "context": "메인 CTA"},
    ],
    "visual_hierarchy": "CTA 버튼 하단 배치",
    "potential_issues": ["버튼 크기 작음"],
}

def _mock_response(content: str):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp

@pytest.mark.asyncio
async def test_run_simulation_for_persona_returns_dict():
    from src.core.m3_simulation import run_simulation_for_persona

    fake_json = '{"confusion_events":[{"element":"회원가입","reason":"버튼이 잘 안 보임","abandoned":false}],"final_abandoned":false,"abandonment_point":"","think_aloud":"버튼 찾는 데 한참 걸렸다","developer_assumption":"바로 눌릴 것"}'

    with patch("src.core.m3_simulation._make_async_client") as mk:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=_mock_response(fake_json))
        mk.return_value = mock_client

        result = await run_simulation_for_persona(PERSONA, UI_MAP, "회원가입하기")

    assert "confusion_events" in result
    assert isinstance(result["confusion_events"], list)
    assert "final_abandoned" in result
    assert "think_aloud" in result

@pytest.mark.asyncio
async def test_run_simulation_handles_invalid_json():
    from src.core.m3_simulation import run_simulation_for_persona

    with patch("src.core.m3_simulation._make_async_client") as mk:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=_mock_response("not json {{{"))
        mk.return_value = mock_client

        result = await run_simulation_for_persona(PERSONA, UI_MAP, "테스트")

    assert result["confusion_events"] == []
    assert result["final_abandoned"] is False
```

- [ ] **Step 3: pytest-asyncio 설치 확인**

```
pip install pytest-asyncio
```

- [ ] **Step 4: 테스트 실행**

```
pytest tests/test_m3.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/m3_simulation.py tests/test_m3.py
git commit -m "feat(m3): replace param-based simulation with Nemotron text injection async"
```

---

## Task 3: m4_scorer.py — weighted aggregation 추가

**Files:**
- Modify: `src/core/m4_scorer.py`
- Modify: `tests/test_m4.py`

기존 함수들(`get_top3_issues`, `build_scorer_output` 등)은 유지하고 새 함수를 추가한다.

- [ ] **Step 1: m4_scorer.py에 두 함수 추가**

`src/core/m4_scorer.py` 끝(line 141 `build_scorer_output` 함수 닫는 `}` 이후)에 아래를 추가:

```python


def aggregate_friction_map(
    results: list, weights: list
) -> tuple[list, float, int]:
    """
    results: list of simulation dicts (each from run_simulation_for_persona)
    weights: list of floats (strata_count / personas_per_strata)
    Returns: (friction_map, abandonment_rate, total_simulated)
    """
    from collections import defaultdict

    raw_counts: dict = defaultdict(float)
    abandoned_weight = 0.0
    total_weight = sum(weights) if weights else 1.0

    for result, weight in zip(results, weights):
        for event in result.get("confusion_events", []):
            element = event.get("element") or "기타"
            raw_counts[element] += weight
        if result.get("final_abandoned", False):
            abandoned_weight += weight

    scale = 100.0 / total_weight

    friction_map = sorted(
        [
            {
                "element": element,
                "affected_count": round(raw * scale),
                "total": 100,
                "rate": round(raw * scale / 100, 2),
            }
            for element, raw in raw_counts.items()
        ],
        key=lambda x: x["affected_count"],
        reverse=True,
    )

    abandonment_rate = round(abandoned_weight * scale / 100, 2)
    return friction_map, abandonment_rate, len(results)


def build_scorer_output_v2(
    results: list,
    weights: list,
    source_code: str,
    preview_html: str = "",
) -> dict:
    friction_map, abandonment_rate, total_simulated = aggregate_friction_map(
        results, weights
    )

    all_events = []
    for r in results:
        all_events.extend(r.get("confusion_events", []))

    think_aloud = results[0].get("think_aloud", "") if results else ""
    developer_assumption = results[0].get("developer_assumption", "") if results else ""

    abandoned = abandonment_rate >= 0.5

    combined = {
        "confusion_events": [
            {
                "element": e.get("element", ""),
                "reason": e.get("reason", ""),
                "severity": 0.6 if e.get("abandoned") else 0.3,
                "evidence": "",
                "line_number": None,
            }
            for e in all_events
        ],
        "abandoned": abandoned,
        "abandonment_reason": friction_map[0]["element"] if friction_map else "",
        "developer_assumption": developer_assumption,
        "think_aloud": think_aloud,
        "think_aloud_steps": [],
    }

    base = build_scorer_output(combined, source_code, cohort="Nemotron", preview_html=preview_html)
    base.update(
        {
            "friction_map": friction_map,
            "abandonment_rate": abandonment_rate,
            "total_simulated": total_simulated,
        }
    )
    return base
```

- [ ] **Step 2: test_m4.py에 테스트 추가**

`tests/test_m4.py` 끝에 추가:

```python
from src.core.m4_scorer import aggregate_friction_map, build_scorer_output_v2


def test_aggregate_friction_map_basic():
    results = [
        {"confusion_events": [{"element": "회원가입 버튼", "reason": "안 보임", "abandoned": False}], "final_abandoned": False},
        {"confusion_events": [{"element": "회원가입 버튼", "reason": "작음", "abandoned": True}, {"element": "이메일 인증", "reason": "복잡함", "abandoned": False}], "final_abandoned": True},
    ]
    weights = [50.0, 50.0]

    friction_map, abandonment_rate, total = aggregate_friction_map(results, weights)

    assert total == 2
    assert friction_map[0]["element"] == "회원가입 버튼"
    assert friction_map[0]["affected_count"] == 100
    assert friction_map[1]["element"] == "이메일 인증"
    assert friction_map[1]["affected_count"] == 50
    assert abandonment_rate == 0.5


def test_aggregate_friction_map_empty():
    friction_map, abandonment_rate, total = aggregate_friction_map([], [])
    assert friction_map == []
    assert abandonment_rate == 0.0
    assert total == 0


def test_build_scorer_output_v2_includes_friction_map():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "안 보임", "abandoned": False}], "final_abandoned": False, "think_aloud": "어렵다", "developer_assumption": "쉽다"},
    ]
    weights = [100.0]
    out = build_scorer_output_v2(results, weights, source_code="<button>버튼</button>")

    assert "friction_map" in out
    assert "abandonment_rate" in out
    assert "total_simulated" in out
    assert out["total_simulated"] == 1
    assert out["friction_map"][0]["element"] == "버튼"
```

- [ ] **Step 3: 테스트 실행**

```
pytest tests/test_m4.py -v
```

Expected: 기존 테스트 + 새 3개 passed.

- [ ] **Step 4: Commit**

```bash
git add src/core/m4_scorer.py tests/test_m4.py
git commit -m "feat(m4): add weighted aggregation and build_scorer_output_v2"
```

---

## Task 4: logic.py — async strata 파이프라인으로 전면 교체

**Files:**
- Modify: `src/core/logic.py` (전면 교체)
- Modify: `tests/test_pipeline.py`

- [ ] **Step 1: logic.py 교체**

```python
import asyncio
import json
from pathlib import Path

from src.core.m1_analyzer import analyze_code
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2

_STRATA_PATH = Path("data/nemotron_strata.json")


def _load_strata() -> dict:
    with open(_STRATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _match_strata(strata_data: dict, strata_keys: list[str]) -> list[tuple[str, dict]]:
    return [
        (key, strata_data["strata"][key])
        for key in strata_keys
        if key in strata_data["strata"]
    ]


async def _simulate_one(
    persona: dict, ui_map: dict, task: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        return await run_simulation_for_persona(persona, ui_map, task)


async def run_pipeline(
    codebase: list,
    strata_keys: list[str],
    task: str = "서비스 탐색하기",
) -> dict:
    main_file = codebase[0]
    ui_map = analyze_code(main_file["content"], task)

    strata_data = _load_strata()
    matched = _match_strata(strata_data, strata_keys)

    if not matched:
        raise ValueError(f"매칭된 strata 없음: {strata_keys}")

    sem = asyncio.Semaphore(25)
    sim_tasks = []
    weights = []

    for _key, stratum in matched:
        personas = stratum["personas"]
        if not personas:
            continue
        weight = stratum["count"] / len(personas)
        for persona in personas:
            weights.append(weight)
            sim_tasks.append(_simulate_one(persona, ui_map, task, sem))

    results = await asyncio.gather(*sim_tasks)

    return build_scorer_output_v2(
        list(results),
        weights,
        main_file["content"],
        preview_html=ui_map.get("preview_html", ""),
    )
```

- [ ] **Step 2: test_pipeline.py 교체**

```python
import asyncio
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json

SAMPLE_STRATA_DATA = {
    "meta": {"total_rows": 100, "strata_count": 1, "built_at": "2026-05-19"},
    "strata": {
        "30대_대졸_남자": {
            "count": 100,
            "keys": {"age_group": "30대", "education": "대졸", "sex": "남자"},
            "personas": [
                {
                    "age": 35, "occupation": "개발자", "province": "서울",
                    "persona": "30대 개발자",
                    "professional_persona": "스타트업 근무",
                    "hobbies_and_interests": "게임, 유튜브",
                    "cultural_background": "서울 출신",
                    "skills_and_expertise": "Python, React",
                }
            ],
        }
    },
}

FAKE_SIM_RESULT = {
    "confusion_events": [{"element": "버튼", "reason": "색이 흐림", "abandoned": False}],
    "final_abandoned": False,
    "abandonment_point": "",
    "think_aloud": "버튼이 눈에 잘 안 띄었다.",
    "developer_assumption": "바로 누를 것이다.",
}


@pytest.mark.asyncio
async def test_run_pipeline_returns_friction_map():
    from src.core.logic import run_pipeline

    codebase = [{"name": "test.html", "content": "<button>버튼</button>"}]
    strata_keys = ["30대_대졸_남자"]

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_code", return_value={
             "components": [{"type": "button", "label": "버튼", "line_number": 1, "context": "CTA"}],
             "visual_hierarchy": "없음", "potential_issues": [], "detected_patterns": [], "preview_html": ""
         }), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)):

        result = await run_pipeline(codebase, strata_keys, "서비스 탐색하기")

    assert "friction_map" in result
    assert "abandonment_rate" in result
    assert "total_simulated" in result
    assert result["total_simulated"] == 1
    assert result["friction_map"][0]["element"] == "버튼"


@pytest.mark.asyncio
async def test_run_pipeline_raises_on_no_match():
    from src.core.logic import run_pipeline

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA):
        with pytest.raises(ValueError, match="매칭된 strata 없음"):
            await run_pipeline([{"name": "f", "content": ""}], ["없는_키_남자"])
```

- [ ] **Step 3: 테스트 실행**

```
pytest tests/test_pipeline.py -v
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src/core/logic.py tests/test_pipeline.py
git commit -m "feat(logic): async strata-based pipeline replacing parameter system"
```

---

## Task 5: api.py — 엔드포인트 교체

**Files:**
- Modify: `src/backend/api.py` (전면 교체)

`/persona-features`, `/generate-cast` 제거. `/build-cast` 신규. `/analyze`에서 `persona_desc` 제거, `strata_keys` 추가.

- [ ] **Step 1: api.py 교체**

```python
import io
import json
import os
import zipfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import httpx

from src.core.logic import run_pipeline

load_dotenv()
app = FastAPI(title="PersonaLab API")

_STRATA_PATH = Path("data/nemotron_strata.json")
_METRO_PROVINCES = {"서울", "경기", "인천"}


def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


def _load_strata_once() -> dict:
    if not _STRATA_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="strata 데이터가 없습니다. scripts/build_strata.py를 먼저 실행하세요.",
        )
    with open(_STRATA_PATH, encoding="utf-8") as f:
        return json.load(f)


class BuildCastRequest(BaseModel):
    age_group: str
    sex: str
    education: str
    region: str = "모두"
    occupation_type: str = "모두"


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/build-cast")
async def build_cast(req: BuildCastRequest):
    try:
        data = _load_strata_once()
        strata = data["strata"]
        matched_keys = []
        total_count = 0
        preview_personas = []

        for key, stratum in strata.items():
            k = stratum["keys"]
            if k["age_group"] != req.age_group:
                continue
            if k["education"] != req.education:
                continue
            if req.sex != "모두" and k["sex"] != req.sex:
                continue

            count = stratum["count"]
            personas = stratum["personas"]

            if req.region == "수도권" and personas:
                metro = [p for p in personas if p["province"] in _METRO_PROVINCES]
                count = int(count * len(metro) / len(personas)) if metro else 0
            elif req.region == "지방" and personas:
                non_metro = [p for p in personas if p["province"] not in _METRO_PROVINCES]
                count = int(count * len(non_metro) / len(personas)) if non_metro else 0

            if count == 0:
                continue

            matched_keys.append(key)
            total_count += count

            if personas:
                p = personas[0]
                preview_personas.append({
                    "age": p["age"],
                    "occupation": p["occupation"],
                    "province": p["province"],
                    "persona": p["persona"][:120] + "…" if len(p["persona"]) > 120 else p["persona"],
                })

        return {
            "matched_strata": matched_keys,
            "total_count": total_count,
            "preview_personas": preview_personas[:3],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"build-cast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze_endpoint(
    files: Optional[List[UploadFile]] = File(default=None),
    strata_keys: str = Form(...),
    task: str = Form(default="서비스 탐색하기"),
    target_url: Optional[str] = Form(default=None),
):
    try:
        keys: list[str] = json.loads(strata_keys)
        if not keys:
            raise HTTPException(status_code=400, detail="strata_keys가 비어 있습니다.")

        codebase = []

        if target_url:
            if not target_url.startswith(("http://", "https://")):
                target_url = "https://" + target_url
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(target_url)
                codebase.append({"name": target_url, "content": resp.text})
        elif files:
            for file in files:
                content = await file.read()
                if file.filename.endswith(".zip"):
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if not name.endswith("/") and "__MACOSX" not in name:
                                with z.open(name) as f:
                                    try:
                                        codebase.append({"name": name, "content": f.read().decode("utf-8")})
                                    except Exception:
                                        continue
                else:
                    try:
                        codebase.append({"name": file.filename, "content": content.decode("utf-8")})
                    except Exception:
                        continue

        if not codebase:
            raise HTTPException(status_code=400, detail="분석 가능한 소스가 없습니다.")

        result = await run_pipeline(codebase, keys, task)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="src/frontend", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 2: 서버 기동 확인**

```
uvicorn src.backend.api:app --reload --port 8000
```

Expected: `Application startup complete.` — 에러 없이 시작.

- [ ] **Step 3: /health 확인**

```
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit**

```bash
git add src/backend/api.py
git commit -m "feat(api): add /build-cast, remove /generate-cast and /persona-features, update /analyze"
```

---

## Task 6: 프론트엔드 — target_select 화면 + analyze 연결

**Files:**
- Modify: `src/frontend/app.js`
- Modify: `src/frontend/index.html`

`persona_chat` → `target_select` 화면으로 교체. `cast` 화면 제거. `analyze()`가 `strata_keys` JSON으로 전송.

- [ ] **Step 1: app.js 데이터 모델 교체**

`app.js`에서 `Alpine.data('personaApp', () => ({` 블록 내부의 상태 변수 선언 부분(line 315~410 영역)을 찾아 아래처럼 교체한다. `screen: 'source'`부터 `_dragHistory: []`까지의 초기화 부분을 아래로 교체:

```javascript
    screen: 'source',
    files: [],
    taskDesc: '',
    dragging: false,
    error: '',
    copied: false,
    detailOpen: false,
    statusStep: 0,
    result: null,
    characterState: 'idle',
    personaFeatures: {},
    personaMinimized: false,
    _thinkInterval: null,

    // Source screen
    sourceMode: 'file',
    sourcePort: '',
    sourcePath: '',
    sourceUrl: '',

    // Target select screen
    selectedAgeGroup: '',
    selectedSex: '',
    selectedEducation: '',
    selectedRegion: '모두',
    selectedOccupationType: '모두',
    matchedStrata: [],
    totalCount: 0,
    previewPersonas: [],
    castLoading: false,

    // Result sidebar
    resultSection: 'tldr',
    liveThought: '',

    physX: 100,
    physY: 100,
    _animState: 'walk',
    _facingLeft: false,
    _walkPhase: 0,
    _bobY: 0,
    _scaleX: 1,
    _scaleY: 1,
    _jumpVY: 0,
    _jumpY: 0,
    _jumpPhase: 'none',
    _jumpPhaseTimer: 0,
    _sitProgress: 0,
    _sitTimer: 0,
    _runTimer: 0,
    _eyeOX: 1,
    _eyeOY: 0,
    _eyeTargetX: 1,
    _eyeTargetY: 0,
    _eyeTimer: 0,
    _blinkScale: 1,
    _blinkTimer: 0,
    _mouseX: 0,
    _mouseY: 0,
    _thrownVX: 0,
    _thrownVY: 0,
    _animFrame: null,
    _idleTimer: null,
    _dragOffset: { x: 0, y: 0 },
    _dragHistory: [],
```

- [ ] **Step 2: init() 함수 교체**

`init()` 함수 전체(line 412~442)를 아래로 교체:

```javascript
    init() {
      this.physX = window.innerWidth * 0.8;
      this.physY = window.innerHeight * 0.7;
      this._mouseX = window.innerWidth * 0.5;
      this._mouseY = window.innerHeight * 0.5;

      window.addEventListener('mousemove', (e) => {
        this._mouseX = e.clientX;
        this._mouseY = Math.min(e.clientY, this._maxY() + 39);
      });

      this._startPhysics();
      this._animState = 'walk';
    },
```

- [ ] **Step 3: proceedFromSource 수정**

`proceedFromSource()` 함수 전체를 아래로 교체:

```javascript
    proceedFromSource() {
      if (!this.sourceReady) return;
      this.error = '';
      this.selectedAgeGroup = '';
      this.selectedSex = '';
      this.selectedEducation = '';
      this.selectedRegion = '모두';
      this.selectedOccupationType = '모두';
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      this.screen = 'target_select';
    },
```

- [ ] **Step 4: fetchBuildCast 추가**

`proceedFromSource()` 함수 이후에 아래 추가:

```javascript
    get targetSelectReady() {
      return this.selectedAgeGroup && this.selectedSex && this.selectedEducation;
    },

    async fetchBuildCast() {
      if (!this.targetSelectReady) return;
      this.castLoading = true;
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      try {
        const res = await fetch('/build-cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age_group: this.selectedAgeGroup,
            sex: this.selectedSex,
            education: this.selectedEducation,
            region: this.selectedRegion,
            occupation_type: this.selectedOccupationType,
          }),
        });
        if (!res.ok) throw new Error('build-cast');
        const data = await res.json();
        this.matchedStrata = data.matched_strata || [];
        this.totalCount = data.total_count || 0;
        this.previewPersonas = data.preview_personas || [];
      } catch (_) {
        this.error = '매칭 중 오류가 발생했어요.';
      } finally {
        this.castLoading = false;
      }
    },
```

- [ ] **Step 5: analyze() 함수 교체**

`analyze()` async 함수 내부에서 FormData 구성 부분을 아래로 교체:

기존:
```javascript
        const formData = new FormData();
        formData.append('persona_desc', this.personaDesc.trim() || '20대 대학생');
        formData.append('task', this.taskDesc.trim() || '서비스 탐색하기');
```

신규:
```javascript
        const formData = new FormData();
        formData.append('strata_keys', JSON.stringify(this.matchedStrata));
        formData.append('task', this.taskDesc.trim() || '서비스 탐색하기');
```

`liveThought` 라인도 교체:

기존:
```javascript
      this.liveThought = `${this.personaDesc.split(',')[0] || '페르소나'}이(가) 앱을 살펴보고 있어요…`;
```

신규:
```javascript
      this.liveThought = `${this.totalCount.toLocaleString()}명 규모 페르소나가 앱을 살펴보고 있어요…`;
```

- [ ] **Step 6: steps 배열 교체**

기존 `steps` 배열을 아래로 교체:

```javascript
    steps: [
      { label: '코드 파싱', icon: '📂' },
      { label: '페르소나 매칭', icon: '🧬' },
      { label: 'UX 시뮬레이션', icon: '🔍' },
      { label: '리포트 생성', icon: '📊' },
    ],
```

- [ ] **Step 7: reset() 함수 교체**

`reset()` 함수 내부를 아래로 교체:

```javascript
    reset() {
      this.stopThinking();
      this.characterState = 'idle';
      this.personaFeatures = {};
      this._animState = 'walk';
      this._thrownVX = 0;
      this._thrownVY = 0;
      this._scaleX = 1;
      this._scaleY = 1;
      this._bobY = 0;
      clearTimeout(this._idleTimer);
      this.screen = 'source';
      this.result = null;
      this.files = [];
      this.error = '';
      this.taskDesc = '';
      this.sourceMode = 'file';
      this.sourcePort = '';
      this.sourcePath = '';
      this.sourceUrl = '';
      this.selectedAgeGroup = '';
      this.selectedSex = '';
      this.selectedEducation = '';
      this.selectedRegion = '모두';
      this.selectedOccupationType = '모두';
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      this.liveThought = '';
      this.resultSection = 'tldr';
    },
```

- [ ] **Step 8: buildFrictionBars 메서드 추가**

`buildIssueCards()` 함수 직후에 아래 추가:

```javascript
    buildFrictionBars() {
      const fm = this.result?.friction_map || [];
      if (!fm.length) return '<p class="no-issues">마찰 지점 없음</p>';
      const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return fm.slice(0, 8).map((item, i) => {
        const pct = Math.round(item.rate * 100);
        const bars = '█'.repeat(Math.round(item.rate * 8));
        const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#60a5fa';
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#CBD5E1;font-size:13px">${i+1}. ${esc(item.element)}</span>
            <span style="color:${color};font-size:12px;font-family:monospace">${item.affected_count}명</span>
          </div>
          <div style="font-size:11px;color:${color};letter-spacing:-1px">${bars}</div>
        </div>`;
      }).join('');
    },
```

- [ ] **Step 9: Commit (app.js만)**

```bash
git add src/frontend/app.js
git commit -m "feat(frontend): replace persona chat/cast with target_select demographic UI"
```

---

## Task 7: index.html — target_select 화면 + friction map 리포트

**Files:**
- Modify: `src/frontend/index.html`

- [ ] **Step 1: persona_chat 화면 교체**

`index.html`에서 `<!-- ═══ PERSONA CHAT SCREEN -->` 블록 전체(line 142~200)를 아래 `target_select` 화면으로 교체:

```html
  <!-- ═══════════════════════════════════════ TARGET SELECT SCREEN -->
  <div x-show="screen === 'target_select'"
       x-transition:enter="transition ease-out duration-300"
       x-transition:enter-start="opacity-0 translate-y-1"
       x-transition:enter-end="opacity-100 translate-y-0"
       x-transition:leave="transition ease-in duration-150"
       x-transition:leave-start="opacity-100"
       x-transition:leave-end="opacity-0"
       class="min-h-screen flex flex-col items-center justify-center px-4 py-16">

    <div class="w-full max-w-xl">
      <div class="flex items-center justify-between mb-6">
        <button @click="screen = 'source'" class="btn-nav-back">← 뒤로</button>
        <div class="font-mono text-xs tracking-widest uppercase" style="color:#3B82F6">PersonaLab</div>
        <div class="text-xs font-mono" style="color:#374151" x-text="sourceLabel"></div>
      </div>

      <h2 class="text-xl font-semibold mb-1" style="color:#F1F5F9">타겟 사용자 선택</h2>
      <p class="text-sm mb-8" style="color:#64748B">Nemotron 100만 명 데이터셋에서 해당 조건 페르소나를 매칭합니다.</p>

      <!-- 나이대 -->
      <div class="mb-5">
        <div class="text-xs font-medium mb-2" style="color:#94A3B8">나이대 *</div>
        <div class="flex flex-wrap gap-2">
          <template x-for="g in ['10~20대','30대','40대','50대','60대+']">
            <button @click="selectedAgeGroup = g; fetchBuildCast()"
                    :class="selectedAgeGroup === g ? 'field-chip active' : 'field-chip'"
                    x-text="g"></button>
          </template>
        </div>
      </div>

      <!-- 성별 -->
      <div class="mb-5">
        <div class="text-xs font-medium mb-2" style="color:#94A3B8">성별 *</div>
        <div class="flex flex-wrap gap-2">
          <template x-for="g in ['남자','여자','모두']">
            <button @click="selectedSex = g; fetchBuildCast()"
                    :class="selectedSex === g ? 'field-chip active' : 'field-chip'"
                    x-text="g"></button>
          </template>
        </div>
      </div>

      <!-- 학력 -->
      <div class="mb-5">
        <div class="text-xs font-medium mb-2" style="color:#94A3B8">학력 *</div>
        <div class="flex flex-wrap gap-2">
          <template x-for="g in ['고졸이하','전문대','대졸','대학원']">
            <button @click="selectedEducation = g; fetchBuildCast()"
                    :class="selectedEducation === g ? 'field-chip active' : 'field-chip'"
                    x-text="g"></button>
          </template>
        </div>
      </div>

      <!-- 지역 (선택) -->
      <div class="mb-5">
        <div class="text-xs font-medium mb-2" style="color:#94A3B8">지역 <span style="color:#475569">(선택)</span></div>
        <div class="flex flex-wrap gap-2">
          <template x-for="g in ['수도권','지방','모두']">
            <button @click="selectedRegion = g; fetchBuildCast()"
                    :class="selectedRegion === g ? 'field-chip active' : 'field-chip'"
                    x-text="g"></button>
          </template>
        </div>
      </div>

      <!-- 예상 매칭 -->
      <div x-show="targetSelectReady" class="mb-6 px-4 py-3 rounded-xl"
           style="background:#1E293B;border:1px solid rgba(148,163,184,0.12)">
        <div x-show="castLoading" class="text-sm" style="color:#64748B">매칭 중…</div>
        <div x-show="!castLoading && matchedStrata.length > 0">
          <div class="text-sm font-medium mb-1" style="color:#F1F5F9">
            예상 매칭: <span style="color:#60a5fa" x-text="totalCount.toLocaleString()"></span>명
          </div>
          <div class="text-xs" style="color:#64748B"
               x-text="`strata ${matchedStrata.length}개 · 대표 ${Math.min(matchedStrata.length * 3, 15)}명 시뮬`"></div>
          <div x-show="previewPersonas.length" class="mt-2 space-y-1">
            <template x-for="(p, i) in previewPersonas" :key="i">
              <div class="text-xs" style="color:#94A3B8"
                   x-text="`· ${p.age}세 ${p.occupation} (${p.province})`"></div>
            </template>
          </div>
        </div>
        <div x-show="!castLoading && matchedStrata.length === 0" class="text-sm" style="color:#f87171">
          해당 조건의 페르소나가 없습니다.
        </div>
      </div>

      <div x-show="error" x-text="error"
           class="mb-4 px-4 py-3 rounded-xl text-sm"
           style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);color:#f87171"></div>

      <button @click="analyze()"
              :disabled="!targetSelectReady || matchedStrata.length === 0"
              class="btn-primary w-full"
              :style="(!targetSelectReady || matchedStrata.length === 0) ? 'opacity:0.45;cursor:not-allowed' : ''">
        시뮬레이션 실행 →
      </button>
    </div>
  </div>
```

- [ ] **Step 2: CAST 화면 제거**

`index.html`에서 `<!-- ═══ CAST SCREEN -->` 블록 전체(line 203~263)를 삭제.

- [ ] **Step 3: result TL;DR 섹션에 friction map 추가**

result 화면의 TL;DR 섹션(`<!-- TL;DR SECTION -->`) 내부, `insight-row-2col` div 이후에 아래 추가:

```html
        <!-- Friction Map -->
        <div x-show="result?.friction_map?.length" class="mt-4">
          <div class="font-mono text-xs tracking-wider uppercase mb-3" style="color:#475569">
            주요 마찰 지점
            <span x-show="result?.total_simulated" class="ml-2 normal-case" style="color:#374151"
                  x-text="`(${result?.total_simulated}명 시뮬 기준)`"></span>
          </div>
          <div x-html="buildFrictionBars()"></div>
          <div x-show="result?.abandonment_rate > 0" class="mt-3 text-sm"
               style="color:#f87171"
               x-text="`이탈률: ${Math.round((result?.abandonment_rate || 0) * 100)}%`"></div>
        </div>
```

- [ ] **Step 4: style.css에 field-chip 스타일 추가**

`src/frontend/style.css` 끝에 추가:

```css
.field-chip {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #1E293B;
  color: #94A3B8;
  cursor: pointer;
  transition: all 0.15s;
}
.field-chip:hover {
  border-color: rgba(96, 165, 250, 0.4);
  color: #CBD5E1;
}
.field-chip.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.5);
  color: #60a5fa;
}
```

- [ ] **Step 5: 브라우저 확인**

서버 기동 후 `http://localhost:8000` 접속:
1. Source 화면 → 파일 업로드 → 다음 클릭
2. target_select 화면: 나이대·성별·학력 선택 → "예상 매칭: N명" 표시 확인
3. "시뮬레이션 실행 →" 클릭 → progress 화면 → result 화면
4. result 화면에서 friction_map 바 차트 확인

- [ ] **Step 6: Commit**

```bash
git add src/frontend/index.html src/frontend/style.css
git commit -m "feat(frontend): target_select screen with demographic chips and friction map report"
```

---

## Task 8: 삭제 + 테스트 정리

**Files:**
- Delete: `src/core/m2_persona.py`
- Delete: `data/persona_params/` (디렉토리 전체)
- Delete: `tests/test_m2.py`
- Modify: CLAUDE.md 아키텍처 섹션

- [ ] **Step 1: m2_persona.py 삭제**

```bash
git rm src/core/m2_persona.py
```

- [ ] **Step 2: persona_params 디렉토리 삭제**

```bash
git rm -r data/persona_params/
```

- [ ] **Step 3: test_m2.py 삭제**

```bash
git rm tests/test_m2.py
```

- [ ] **Step 4: 전체 테스트 실행**

```
pytest tests/ -v --ignore=tests/test_chunk_registry.py
```

Expected: test_m1, test_m3, test_m4, test_pipeline 모두 passed. (test_chunk_registry는 chunk_registry가 여전히 존재하므로 통과할 수 있음)

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove m2_persona, persona_params, test_m2 — parameter system fully retired"
```

---

## 구현 후 통합 검증

- [ ] `python scripts/build_strata.py` 완료 후 `data/nemotron_strata.json` 존재 확인
- [ ] `uvicorn src.backend.api:app --reload --port 8000` 에러 없이 시작
- [ ] 브라우저에서 전체 플로우 (source → target_select → analyze → result + friction_map) 확인
- [ ] `pytest tests/ -v` all passed
