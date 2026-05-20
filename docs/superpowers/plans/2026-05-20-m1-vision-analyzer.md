# M1 Vision Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `m1_analyzer.py`를 코드 파서에서 Groq vision 기반 이미지 분석기로 교체하고, `logic.py` / `m3_simulation.py` 연동 부분을 맞춰 수정한다.

**Architecture:** M1이 이미지 bytes를 받아 `llama-3.2-11b-vision-preview`로 UI 구조(components, visual_hierarchy, potential_issues, screen_summary)를 추출한다. `screen_summary`는 M3 시뮬레이션의 주 컨텍스트로 쓰여 M1 부분 실패 시 품질을 보호한다. `line_number`, `styling`, `detected_patterns`, `preview_html` 개념은 완전 제거된다.

**Tech Stack:** Python 3.11+, `openai` SDK (Groq 호환), `llama-3.2-11b-vision-preview`, `pytest`, `pytest-asyncio`

---

## 파일 변경 맵

| 파일 | 액션 | 내용 |
|------|------|------|
| `src/core/m1_analyzer.py` | **전면 교체** | `analyze_image()` 신규, 나머지 전부 제거 |
| `src/core/logic.py` | **수정** | import 교체, `run_pipeline` 시그니처 변경, `_enrich_with_line_numbers` 제거 |
| `src/core/m3_simulation.py` | **수정** | `_build_messages` 에서 `line_number` 제거, `screen_summary` 우선 사용 |
| `tests/test_m1.py` | **전면 교체** | 구버전 테스트 삭제, `analyze_image` 테스트 신규 |
| `tests/test_pipeline.py` | **수정** | mock 시그니처 + 반환값 업데이트 |

---

## Task 1: test_m1.py 재작성 (실패하는 테스트 먼저)

**Files:**
- Modify: `tests/test_m1.py`

- [ ] **Step 1: 파일 전체를 새 테스트로 교체**

```python
import json
import pytest
from unittest.mock import patch, MagicMock

SAMPLE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # 가짜 PNG bytes

MOCK_VISION_RESPONSE = {
    "screen_id": "home.png",
    "components": [
        {"type": "button", "label": "로그인", "context": "로그인 제출 버튼"},
        {"type": "input", "label": "이메일", "context": "이메일 입력 필드"},
    ],
    "visual_hierarchy": "버튼이 작고 대비가 낮아 눈에 잘 띄지 않음",
    "potential_issues": ["버튼 크기 너무 작음", "낮은 색상 대비"],
    "screen_summary": "로그인 화면. 상단에 로고, 중앙에 이메일/비밀번호 입력 필드 2개, 하단에 로그인 버튼.",
}


def _mock_client(response_dict: dict) -> MagicMock:
    mock = MagicMock()
    mock.chat.completions.create.return_value.choices[0].message.content = json.dumps(
        response_dict
    )
    return mock


def test_analyze_image_returns_required_keys():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert "screen_id" in result
    assert "components" in result
    assert "visual_hierarchy" in result
    assert "potential_issues" in result
    assert "screen_summary" in result
    assert isinstance(result["components"], list)


def test_analyze_image_screen_id_matches_filename():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert result["screen_id"] == "home.png"


def test_analyze_image_no_line_number_in_components():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    for comp in result["components"]:
        assert "line_number" not in comp
        assert "styling" not in comp


def test_analyze_image_screen_summary_nonempty():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert len(result["screen_summary"]) > 0


def test_analyze_image_defaults_missing_fields():
    """LLM이 일부 필드를 생략해도 기본값 보장"""
    partial_response = {"components": [{"type": "button", "label": "확인", "context": "확인 버튼"}]}
    with patch("src.core.m1_analyzer.client", _mock_client(partial_response)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "checkout.png", "결제하기")

    assert result["screen_id"] == "checkout.png"
    assert result["visual_hierarchy"] == ""
    assert result["potential_issues"] == []
    assert result["screen_summary"] == ""


def test_analyze_image_uses_vision_model():
    mock_client = _mock_client(MOCK_VISION_RESPONSE)
    with patch("src.core.m1_analyzer.client", mock_client):
        from src.core.m1_analyzer import analyze_image
        analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    call_kwargs = mock_client.chat.completions.create.call_args
    assert call_kwargs.kwargs["model"] == "llama-3.2-11b-vision-preview"


def test_analyze_image_sends_base64_image():
    import base64
    mock_client = _mock_client(MOCK_VISION_RESPONSE)
    with patch("src.core.m1_analyzer.client", mock_client):
        from src.core.m1_analyzer import analyze_image
        analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    messages = mock_client.chat.completions.create.call_args.kwargs["messages"]
    user_msg = messages[-1]
    assert user_msg["role"] == "user"
    content = user_msg["content"]
    image_part = next(p for p in content if p["type"] == "image_url")
    expected_b64 = base64.b64encode(SAMPLE_PNG).decode()
    assert expected_b64 in image_part["image_url"]["url"]
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```
pytest tests/test_m1.py -v
```

기대: `ImportError` 또는 `ModuleNotFoundError` (`analyze_image` 없음)

---

## Task 2: m1_analyzer.py 전면 교체

**Files:**
- Modify: `src/core/m1_analyzer.py`

- [ ] **Step 1: 파일 전체를 새 구현으로 교체**

```python
import base64
import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_MIME_MAP = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

M1_SYSTEM_PROMPT = """스크린샷 이미지를 분석하여 사용자가 시각적으로 인지할 UI 구조를 JSON으로 반환하라.

반드시 아래 형식으로 반환하라:
{
  "screen_id": "파일명",
  "components": [
    {
      "type": "button|input|form|nav|text|image",
      "label": "사용자가 보는 텍스트",
      "context": "이 요소의 역할 한 줄 설명"
    }
  ],
  "visual_hierarchy": "시각적 위계 문제 한 줄 요약",
  "potential_issues": ["문제1", "문제2"],
  "screen_summary": "화면 전체를 자연어로 설명한 단락. 레이아웃, 주요 요소, 시각적 특징, 사용자가 첫 눈에 인식할 내용을 포함."
}

규칙:
- line_number, styling 필드 출력 금지
- screen_summary는 반드시 포함. 비워두지 말 것
- 모든 텍스트는 한국어로"""


def _make_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


try:
    client = _make_client()
except Exception:
    client = None


def analyze_image(image_bytes: bytes, filename: str, task: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower()
    mime = _MIME_MAP.get(ext, "image/png")
    b64 = base64.b64encode(image_bytes).decode()

    response = client.chat.completions.create(
        model="llama-3.2-11b-vision-preview",
        messages=[
            {"role": "system", "content": M1_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                    {"type": "text", "text": f"태스크: {task}\n화면명: {filename}"},
                ],
            },
        ],
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    result = json.loads(response.choices[0].message.content)
    result.setdefault("screen_id", filename)
    result.setdefault("components", [])
    result.setdefault("visual_hierarchy", "")
    result.setdefault("potential_issues", [])
    result.setdefault("screen_summary", "")
    return result
```

- [ ] **Step 2: M1 테스트 실행 — 통과 확인**

```
pytest tests/test_m1.py -v
```

기대: 6개 PASS

---

## Task 3: m3_simulation.py — screen_summary 우선 컨텍스트

**Files:**
- Modify: `src/core/m3_simulation.py:48-69`

- [ ] **Step 1: `_build_messages` 함수 교체**

기존:
```python
def _build_messages(persona: dict, ui_map: dict, task: str) -> list:
    ...
    components_desc = "\n".join(
        f"- [{c['type']}] '{c['label']}' (line {c['line_number']}): {c['context']}"
        for c in ui_map.get("components", [])
    )
    user_content = (
        f"태스크: {task}\n\nUI 요소:\n{components_desc}\n\n"
        f"시각적 위계: {ui_map.get('visual_hierarchy', '없음')}\n"
        f"잠재 이슈: {', '.join(ui_map.get('potential_issues', []))}"
    )
```

교체:
```python
def _build_messages(persona: dict, ui_map: dict, task: str) -> list:
    hobbies = persona.get("hobbies_and_interests", "")
    system = _SYSTEM_TEMPLATE.format(
        persona=persona.get("persona", ""),
        professional_persona=persona.get("professional_persona", ""),
        hobbies_and_interests=hobbies,
        cultural_background=persona.get("cultural_background", ""),
        skills_and_expertise=persona.get("skills_and_expertise", ""),
    )
    screen_summary = ui_map.get("screen_summary", "")
    components_desc = "\n".join(
        f"- [{c['type']}] '{c['label']}': {c['context']}"
        for c in ui_map.get("components", [])
    )
    user_content = (
        f"태스크: {task}\n\n"
        f"화면 설명:\n{screen_summary}\n\n"
        f"UI 요소:\n{components_desc}\n\n"
        f"시각적 위계: {ui_map.get('visual_hierarchy', '없음')}\n"
        f"잠재 이슈: {', '.join(ui_map.get('potential_issues', []))}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
```

- [ ] **Step 2: M3 기존 테스트 확인**

```
pytest tests/test_m3.py -v
```

기대: 전부 PASS (line_number 없는 ui_map 받아도 동작)

---

## Task 4: logic.py — analyze_image 연동, 시그니처 변경

**Files:**
- Modify: `src/core/logic.py`

- [ ] **Step 1: 파일 전체를 새 구현으로 교체**

```python
import asyncio
import json
from pathlib import Path

from src.core.m1_analyzer import analyze_image
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2

_STRATA_PATH = Path("data/nemotron_strata.json")
_STRATA_CACHE: dict | None = None


def _load_strata() -> dict:
    global _STRATA_CACHE
    if _STRATA_CACHE is None:
        with open(_STRATA_PATH, encoding="utf-8") as f:
            _STRATA_CACHE = json.load(f)
    return _STRATA_CACHE


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
    images: list[dict],
    flow_edges: list[dict],
    strata_keys: list[str],
    task: str = "서비스 탐색하기",
) -> dict:
    """
    images: [{"name": "home.png", "bytes": b"..."}]
    flow_edges: [{"source": "home.png", "target": "product.png"}]
    """
    ui_maps = {
        img["name"]: analyze_image(img["bytes"], img["name"], task)
        for img in images
    }

    strata_data = _load_strata()
    matched = _match_strata(strata_data, strata_keys)
    if not matched:
        raise ValueError(f"매칭된 strata 없음: {strata_keys}")

    sem = asyncio.Semaphore(25)

    all_tasks: list = []
    screen_ranges: dict[str, tuple[int, int]] = {}
    screen_weights: dict[str, list[float]] = {name: [] for name in ui_maps}
    offset = 0

    for screen_name, ui_map in ui_maps.items():
        screen_tasks = []
        for _key, stratum in matched:
            personas = stratum["personas"]
            if not personas:
                continue
            weight = stratum["count"] / len(personas)
            for persona in personas:
                screen_weights[screen_name].append(weight)
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

---

## Task 5: test_pipeline.py 업데이트

**Files:**
- Modify: `tests/test_pipeline.py`

- [ ] **Step 1: 파일 전체를 새 테스트로 교체**

```python
import asyncio
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

SAMPLE_STRATA_DATA = {
    "meta": {"total_rows": 100, "strata_count": 1, "built_at": "2026-05-20"},
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

FAKE_UI_MAP = {
    "screen_id": "home.png",
    "components": [{"type": "button", "label": "버튼", "context": "CTA"}],
    "visual_hierarchy": "없음",
    "potential_issues": [],
    "screen_summary": "홈 화면. 중앙에 큰 CTA 버튼이 있다.",
}

FAKE_SIM_RESULT = {
    "confusion_events": [{"element": "버튼", "reason": "색이 흐림", "abandoned": False}],
    "final_abandoned": False,
    "abandonment_point": "",
    "think_aloud": "버튼이 눈에 잘 안 띄었다.",
    "developer_assumption": "바로 누를 것이다.",
}

FAKE_SCORER_OUTPUT = {
    "friction_map": [{"element": "버튼", "affected_count": 100, "total": 100, "rate": 1.0}],
    "abandonment_rate": 0.0,
    "total_simulated": 1,
    "risk_level": "ok",
    "per_screen": {"home.png": {"think_aloud": "...", "issues": [], "friction_rate": 0.1, "risk_level": "ok"}},
    "edge_dropout": {},
}


@pytest.mark.asyncio
async def test_run_pipeline_returns_friction_map():
    from src.core.logic import run_pipeline

    images = [{"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10}]
    flow_edges = []

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_image", return_value=FAKE_UI_MAP), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)), \
         patch("src.core.logic.build_scorer_output_v2", return_value=FAKE_SCORER_OUTPUT):

        result = await run_pipeline(images, flow_edges, ["30대_대졸_남자"], "서비스 탐색하기")

    assert "friction_map" in result
    assert "abandonment_rate" in result
    assert "total_simulated" in result


@pytest.mark.asyncio
async def test_run_pipeline_raises_on_no_match():
    from src.core.logic import run_pipeline

    images = [{"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10}]

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_image", return_value=FAKE_UI_MAP):
        with pytest.raises(ValueError, match="매칭된 strata 없음"):
            await run_pipeline(images, [], ["없는_키_남자"], "서비스 탐색하기")


@pytest.mark.asyncio
async def test_run_pipeline_calls_analyze_image_per_screen():
    from src.core.logic import run_pipeline

    images = [
        {"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10},
        {"name": "product.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10},
    ]

    mock_analyze = MagicMock(return_value=FAKE_UI_MAP)

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_image", mock_analyze), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)), \
         patch("src.core.logic.build_scorer_output_v2", return_value=FAKE_SCORER_OUTPUT):

        await run_pipeline(images, [], ["30대_대졸_남자"], "서비스 탐색하기")

    assert mock_analyze.call_count == 2
```

- [ ] **Step 2: 파이프라인 전체 테스트 실행**

```
pytest tests/test_m1.py tests/test_m3.py tests/test_pipeline.py -v
```

기대: 전부 PASS

---

## Task 6: 전체 테스트 + 커밋

- [ ] **Step 1: 전체 테스트 실행**

```
pytest tests/ -v
```

기대: `test_m1.py` (6개), `test_m3.py`, `test_pipeline.py` (3개) 전부 PASS.
`test_chunk_registry.py`, `test_m4.py` 도 기존과 동일하게 PASS.

- [ ] **Step 2: 커밋**

```bash
git add src/core/m1_analyzer.py src/core/logic.py src/core/m3_simulation.py \
        tests/test_m1.py tests/test_pipeline.py \
        docs/superpowers/specs/2026-05-20-m1-vision-analyzer-design.md \
        docs/superpowers/plans/2026-05-20-m1-vision-analyzer.md
git commit -m "feat(m1): replace code parser with Groq vision analyzer

- analyze_image() replaces analyze_code() — uses llama-3.2-11b-vision-preview
- adds screen_summary field as primary M3 context (Option B resilience)
- removes line_number, styling, detected_patterns, preview_html
- logic.py: new run_pipeline signature (images + flow_edges)
- m3_simulation.py: screen_summary as primary user content"
```
