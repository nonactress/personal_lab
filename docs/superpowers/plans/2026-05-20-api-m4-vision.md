# API + M4 Vision Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `m4_scorer.py`를 화면별 점수/edge_dropout 출력으로 재작성하고, `api.py`를 이미지 수신 + flow_edges 파싱으로 업데이트한다.

**Architecture:** `build_scorer_output_v2`가 per_screen_results/per_screen_weights/flow_edges를 받아 화면별 friction_rate·risk_level·think_aloud·issues·fix_prompts와 edge_dropout을 계산한다. think_aloud는 이탈 페르소나 우선, 없으면 confusion 최다 페르소나. api.py는 이미지 bytes를 raw로 수집하고 flow_edges를 JSON Form으로 파싱해 run_pipeline에 전달한다.

**Tech Stack:** Python 3.11+, FastAPI, `openai` SDK (Groq), `pytest`, `fastapi.testclient`

---

## 파일 변경 맵

| 파일 | 액션 | 내용 |
|------|------|------|
| `src/core/m4_scorer.py` | **전면 교체** | 새 시그니처, _score_screen, _pick_think_aloud, _aggregate_issues, _compute_edge_dropout |
| `src/backend/api.py` | **수정** | target_url 제거, 이미지 bytes 수집, flow_edges Form 추가 |
| `tests/test_m4.py` | **수정** | build_scorer_output_v2 테스트 새 시그니처로 교체 + per_screen/edge_dropout 테스트 추가 |
| `tests/test_api.py` | **신규** | /analyze 이미지 수신, flow_edges 파싱 테스트 |

---

## Task 1: test_m4.py — 새 m4 테스트 추가 (실패 먼저)

**Files:**
- Modify: `tests/test_m4.py`

- [ ] **Step 1: 파일 전체를 새 테스트로 교체**

```python
import pytest
from unittest.mock import patch

# ── 유지되는 함수 테스트 ─────────────────────────────────────

from src.core.m4_scorer import get_top3_issues, aggregate_friction_map

SAMPLE_SIMULATION = {
    "think_aloud": "버튼을 못 찾겠어.",
    "confusion_events": [
        {"element": "button#가입", "reason": "버튼 너무 작음", "severity": 0.82, "evidence": ""},
        {"element": "input#email", "reason": "형식 불명확", "severity": 0.55, "evidence": ""},
    ],
    "abandoned": True,
    "abandonment_reason": "버튼 미발견",
}


def test_top3_issues():
    top3 = get_top3_issues(SAMPLE_SIMULATION)
    assert len(top3) <= 3
    assert top3[0]["severity"] >= top3[-1]["severity"]


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


# ── 새 함수 테스트 ────────────────────────────────────────────

from src.core.m4_scorer import build_scorer_output_v2, _score_screen, _pick_think_aloud


def test_build_scorer_output_v2_includes_friction_map():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [{"element": "버튼", "reason": "안 보임", "abandoned": False}],
             "final_abandoned": False, "think_aloud": "어렵다"},
        ]
    }
    per_screen_weights = {"home.png": [100.0]}

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="버튼 크기를 키워주세요."):
        out = build_scorer_output_v2(per_screen_results, per_screen_weights, [])

    assert "friction_map" in out
    assert "abandonment_rate" in out
    assert "total_simulated" in out
    assert out["total_simulated"] == 1
    assert out["friction_map"][0]["element"] == "버튼"
    assert "per_screen" in out
    assert "edge_dropout" in out


def test_build_scorer_output_v2_per_screen_keys():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [{"element": "버튼", "reason": "작음"}],
             "final_abandoned": True, "think_aloud": "포기했다"},
            {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬웠다"},
        ]
    }
    per_screen_weights = {"home.png": [50.0, 50.0]}

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        out = build_scorer_output_v2(per_screen_results, per_screen_weights, [])

    assert "home.png" in out["per_screen"]
    screen = out["per_screen"]["home.png"]
    assert "friction_rate" in screen
    assert "risk_level" in screen
    assert "think_aloud" in screen
    assert "issues" in screen
    assert "fix_prompts" in screen


def test_build_scorer_output_v2_edge_dropout():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [], "final_abandoned": True, "think_aloud": "포기"},
            {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬움"},
        ]
    }
    flow_edges = [{"source": "home.png", "target": "product.png"}]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        out = build_scorer_output_v2(per_screen_results, {"home.png": [50.0, 50.0]}, flow_edges)

    assert "home.png|product.png" in out["edge_dropout"]
    assert out["edge_dropout"]["home.png|product.png"] == 0.5


def test_pick_think_aloud_prefers_abandoned():
    results = [
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬웠다"},
        {"confusion_events": [{"element": "버튼", "reason": "작음"}], "final_abandoned": True, "think_aloud": "포기했다"},
    ]
    assert _pick_think_aloud(results) == "포기했다"


def test_pick_think_aloud_fallback_most_confused():
    results = [
        {"confusion_events": [{"element": "A"}, {"element": "B"}], "final_abandoned": False, "think_aloud": "많이 헤맸다"},
        {"confusion_events": [{"element": "C"}], "final_abandoned": False, "think_aloud": "조금 헤맸다"},
    ]
    assert _pick_think_aloud(results) == "많이 헤맸다"


def test_score_screen_friction_rate():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "작음"}], "final_abandoned": False, "think_aloud": "어렵다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
    ]
    weights = [25.0, 25.0, 25.0, 25.0]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        score = _score_screen(results, weights)

    assert score["friction_rate"] == 0.25
    assert score["risk_level"] == "ok"


def test_score_screen_risk_level_critical():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "안 보임"}], "final_abandoned": True, "think_aloud": "포기"},
        {"confusion_events": [{"element": "폼", "reason": "복잡함"}], "final_abandoned": True, "think_aloud": "포기"},
        {"confusion_events": [{"element": "메뉴", "reason": "숨겨짐"}], "final_abandoned": True, "think_aloud": "포기"},
    ]
    weights = [33.0, 33.0, 34.0]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        score = _score_screen(results, weights)

    assert score["risk_level"] == "critical"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```
pytest tests/test_m4.py -v
```

기대: `ImportError` (`_score_screen`, `_pick_think_aloud` 없음) 또는 시그니처 불일치 FAIL

---

## Task 2: m4_scorer.py 전면 교체

**Files:**
- Modify: `src/core/m4_scorer.py`

- [ ] **Step 1: 파일 전체를 새 구현으로 교체**

```python
import json
import os
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


_FIX_PROMPT_SYSTEM = """당신은 UX 개선 전문가다. 주어진 UX 이슈를 분석하고 Cursor/Claude 같은 AI IDE에 붙여넣을 수 있는 명확한 Fix Prompt를 한국어로 작성하라.

형식:
[페르소나 UX 이슈 — {element}]
문제: {reason}

Fix: 구체적인 시각적 수정 방법을 1~3문장으로 설명. 어떤 요소를 어떻게 바꿔야 하는지 명시.

규칙:
- 이슈 맥락에 맞는 구체적 수정 방향 제시
- 짧고 실행 가능하게
- 모든 텍스트는 한국어로"""


def _risk_from_rate(rate: float) -> str:
    if rate >= 0.7:
        return "critical"
    elif rate >= 0.4:
        return "warning"
    return "ok"


def _risk_from_raw_score(score: int) -> tuple:
    if score >= 70:
        return "critical", "출시 위험"
    elif score >= 40:
        return "warning", "개선 권장"
    return "ok", "출시 가능"


def get_top3_issues(simulation_result: dict) -> list:
    events = simulation_result.get("confusion_events", [])
    return sorted(events, key=lambda e: e.get("severity", 0), reverse=True)[:3]


def aggregate_friction_map(
    results: list, weights: list
) -> tuple[list, float, int]:
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


def _pick_think_aloud(results: list) -> str:
    for r in results:
        if r.get("final_abandoned") and r.get("think_aloud"):
            return r["think_aloud"]
    most_confused = max(
        results,
        key=lambda r: len(r.get("confusion_events", [])),
        default=None,
    )
    if most_confused:
        return most_confused.get("think_aloud", "")
    return ""


def _aggregate_issues(results: list) -> list:
    counts: dict = defaultdict(lambda: {"reason": "", "count": 0})
    for r in results:
        for event in r.get("confusion_events", []):
            el = event.get("element") or "기타"
            if not counts[el]["reason"]:
                counts[el]["reason"] = event.get("reason", "")
            counts[el]["count"] += 1
    return sorted(
        [
            {"element": el, "reason": v["reason"], "count": v["count"]}
            for el, v in counts.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]


def _generate_fix_prompt(element: str, reason: str) -> str:
    try:
        client = _groq_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _FIX_PROMPT_SYSTEM},
                {"role": "user", "content": f"이슈 요소: {element}\n문제: {reason}"},
            ],
            max_tokens=256,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return (
            f"[UX 이슈 — {element}]\n"
            f"문제: {reason}\n\n"
            f"Fix: {element} 요소의 접근성과 가시성을 높이도록 크기, 색상 대비, 레이블을 개선해줘."
        )


def _score_screen(results: list, weights: list) -> dict:
    if not results:
        return {
            "friction_rate": 0.0,
            "risk_level": "ok",
            "think_aloud": "",
            "issues": [],
            "fix_prompts": [],
        }

    total_weight = sum(weights) or 1.0
    confused_weight = sum(
        w for r, w in zip(results, weights) if r.get("confusion_events")
    )
    friction_rate = round(confused_weight / total_weight, 2)

    issues = _aggregate_issues(results)
    fix_prompts = [
        _generate_fix_prompt(iss["element"], iss["reason"]) for iss in issues[:3]
    ]

    return {
        "friction_rate": friction_rate,
        "risk_level": _risk_from_rate(friction_rate),
        "think_aloud": _pick_think_aloud(results),
        "issues": issues,
        "fix_prompts": fix_prompts,
    }


def build_scorer_output_v2(
    per_screen_results: dict,
    per_screen_weights: dict,
    flow_edges: list,
) -> dict:
    per_screen = {
        screen: _score_screen(results, per_screen_weights.get(screen, []))
        for screen, results in per_screen_results.items()
    }

    abandonment_rates = {
        screen: sum(1 for r in results if r.get("final_abandoned")) / len(results)
        for screen, results in per_screen_results.items()
        if results
    }
    edge_dropout = {
        f"{e['source']}|{e['target']}": round(
            abandonment_rates.get(e["source"], 0.0), 2
        )
        for e in flow_edges
    }

    all_results = [r for results in per_screen_results.values() for r in results]
    all_weights = [w for weights in per_screen_weights.values() for w in weights]
    friction_map, abandonment_rate, total_simulated = aggregate_friction_map(
        all_results, all_weights
    )

    worst_rate = max(
        (s["friction_rate"] for s in per_screen.values()), default=0.0
    )
    risk_level = _risk_from_rate(worst_rate)

    think_aloud = next(
        (
            s["think_aloud"]
            for s in sorted(
                per_screen.values(), key=lambda x: x["friction_rate"], reverse=True
            )
            if s["think_aloud"]
        ),
        "",
    )

    seen: set = set()
    all_fixes: list = []
    for s in per_screen.values():
        for fp in s["fix_prompts"]:
            if fp not in seen:
                seen.add(fp)
                all_fixes.append(fp)

    return {
        "friction_map": friction_map,
        "abandonment_rate": abandonment_rate,
        "total_simulated": total_simulated,
        "risk_level": risk_level,
        "think_aloud": think_aloud,
        "fix_prompts": all_fixes[:3],
        "top3": [],
        "per_screen": per_screen,
        "edge_dropout": edge_dropout,
    }
```

- [ ] **Step 2: M4 테스트 실행 — 통과 확인**

```
pytest tests/test_m4.py -v
```

기대: 전부 PASS (skip 제외)

---

## Task 3: test_api.py 신규 작성 (실패 먼저)

**Files:**
- Create: `tests/test_api.py`

- [ ] **Step 1: 파일 생성**

```python
import json
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20

FAKE_RESULT = {
    "friction_map": [],
    "abandonment_rate": 0.0,
    "total_simulated": 1,
    "risk_level": "ok",
    "think_aloud": "괜찮다",
    "fix_prompts": [],
    "top3": [],
    "per_screen": {},
    "edge_dropout": {},
}


def _make_client():
    from src.backend.api import app
    return TestClient(app, raise_server_exceptions=False)


def test_analyze_accepts_png():
    client = _make_client()
    with patch("src.backend.api.run_pipeline", new=AsyncMock(return_value=FAKE_RESULT)):
        resp = client.post(
            "/analyze",
            data={"strata_keys": '["30대_대졸_남자"]', "task": "탐색하기", "flow_edges": "[]"},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )
    assert resp.status_code == 200
    assert "friction_map" in resp.json()


def test_analyze_rejects_non_image():
    client = _make_client()
    resp = client.post(
        "/analyze",
        data={"strata_keys": '["30대_대졸_남자"]', "task": "탐색하기", "flow_edges": "[]"},
        files={"files": ("code.tsx", b"export default function App() {}", "text/plain")},
    )
    assert resp.status_code == 400


def test_analyze_parses_flow_edges():
    client = _make_client()
    flow_edges_json = json.dumps([{"source": "home.png", "target": "product.png"}])
    captured = {}

    async def fake_pipeline(images, edges, keys, task):
        captured["edges"] = edges
        return FAKE_RESULT

    with patch("src.backend.api.run_pipeline", new=fake_pipeline):
        resp = client.post(
            "/analyze",
            data={"strata_keys": '["30대_대졸_남자"]', "task": "탐색하기", "flow_edges": flow_edges_json},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )

    assert resp.status_code == 200
    assert captured["edges"] == [{"source": "home.png", "target": "product.png"}]


def test_analyze_passes_image_bytes():
    client = _make_client()
    captured = {}

    async def fake_pipeline(images, edges, keys, task):
        captured["images"] = images
        return FAKE_RESULT

    with patch("src.backend.api.run_pipeline", new=fake_pipeline):
        resp = client.post(
            "/analyze",
            data={"strata_keys": '["30대_대졸_남자"]', "task": "탐색하기", "flow_edges": "[]"},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )

    assert resp.status_code == 200
    assert captured["images"][0]["name"] == "home.png"
    assert captured["images"][0]["bytes"] == FAKE_PNG


def test_analyze_invalid_strata_keys():
    client = _make_client()
    resp = client.post(
        "/analyze",
        data={"strata_keys": "not-json", "task": "탐색하기", "flow_edges": "[]"},
        files={"files": ("home.png", FAKE_PNG, "image/png")},
    )
    assert resp.status_code == 400
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```
pytest tests/test_api.py -v
```

기대: `test_analyze_rejects_non_image` FAIL (api.py 아직 이미지 필터링 없음), 나머지 FAIL or ERROR

---

## Task 4: api.py 수정

**Files:**
- Modify: `src/backend/api.py`

- [ ] **Step 1: 파일 전체를 새 구현으로 교체**

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

from src.core.logic import run_pipeline

load_dotenv()
app = FastAPI(title="PersonaLab API")

_STRATA_PATH = Path("data/nemotron_strata.json")
_METRO_PROVINCES = {"서울", "경기", "인천"}
_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


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
    flow_edges: str = Form(default="[]"),
):
    try:
        try:
            keys: list[str] = json.loads(strata_keys)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="strata_keys가 유효한 JSON 형식이 아닙니다.")
        if not keys:
            raise HTTPException(status_code=400, detail="strata_keys가 비어 있습니다.")

        try:
            edges: list[dict] = json.loads(flow_edges)
        except (json.JSONDecodeError, TypeError):
            edges = []

        images: list[dict] = []
        if files:
            for file in files:
                content = await file.read()
                ext = Path(file.filename).suffix.lower()
                if ext == ".zip":
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if name.endswith("/") or "__MACOSX" in name:
                                continue
                            if Path(name).suffix.lower() in _IMAGE_EXTENSIONS:
                                with z.open(name) as f:
                                    images.append({"name": Path(name).name, "bytes": f.read()})
                elif ext in _IMAGE_EXTENSIONS:
                    images.append({"name": file.filename, "bytes": content})

        if not images:
            raise HTTPException(
                status_code=400,
                detail="분석 가능한 이미지가 없습니다. .png/.jpg/.webp 파일을 업로드하세요.",
            )

        result = await run_pipeline(images, edges, keys, task)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="frontend/dist", html=True, check_dir=False), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 2: API 테스트 실행 — 통과 확인**

```
pytest tests/test_api.py -v
```

기대: 5개 PASS

---

## Task 5: 전체 테스트 + 커밋

- [ ] **Step 1: 전체 테스트 실행**

```
pytest tests/ -v
```

기대:
- `test_m1.py`: 7 PASS
- `test_m3.py`: 2 PASS
- `test_m4.py`: 9 PASS (skip 제외)
- `test_pipeline.py`: 3 PASS
- `test_api.py`: 5 PASS
- `test_chunk_registry.py`: 기존과 동일 (2 FAIL은 persona_params 파일 없음 — 무관)

- [ ] **Step 2: 커밋**

```bash
git add src/core/m4_scorer.py src/backend/api.py \
        tests/test_m4.py tests/test_api.py \
        docs/superpowers/specs/2026-05-20-api-m4-vision-design.md \
        docs/superpowers/plans/2026-05-20-api-m4-vision.md
git commit -m "feat(m4,api): per_screen scoring + edge_dropout + image upload

- build_scorer_output_v2: new signature (per_screen_results, per_screen_weights, flow_edges)
- _score_screen: friction_rate, risk_level, think_aloud, issues, fix_prompts per screen
- _pick_think_aloud: abandoned persona first, fallback to most confused
- edge_dropout: source screen abandonment_rate per flow edge
- api.py: image bytes collection, flow_edges Form, target_url removed"
```
