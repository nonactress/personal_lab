# API + M4 Vision Pipeline — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Branch:** feat/vision-backend

---

## Overview

`api.py`와 `m4_scorer.py`를 이미지 기반 파이프라인에 맞게 업데이트.
`api.py`는 이미지 파일 + flow_edges를 수신하고,
`m4_scorer.py`는 화면별 점수(`per_screen`) + 화살표 이탈률(`edge_dropout`)을 출력한다.

---

## api.py 변경

### POST /analyze 엔드포인트

| 항목 | 기존 | 변경 |
|------|------|------|
| `files[]` | 코드 파일 → UTF-8 decode | 이미지 파일 → raw bytes 유지 |
| `target_url` | 있음 | **제거** |
| `flow_edges` | 없음 | **추가** (Form, JSON string, default `"[]"`) |
| `strata_keys` | 유지 | 유지 |
| `task` | 유지 | 유지 |

### 이미지 추출 로직

```
단일 이미지 파일 (.png/.jpg/.jpeg/.webp):
  → {"name": filename, "bytes": raw_bytes}

zip 파일:
  → 내부에서 이미지 확장자만 추출 (*.png/*.jpg/*.jpeg/*.webp)
  → 각각 {"name": inner_filename, "bytes": raw_bytes}

코드 파일 (.tsx/.html 등):
  → 무시 (skip)
```

### run_pipeline 호출

```python
result = await run_pipeline(images, flow_edges_parsed, keys, task)
```

### 제거 대상

- `_validate_url()` 함수
- `_SSRF_BLOCKED` 상수
- `httpx` import
- `target_url` 파라미터 및 관련 처리 블록

---

## m4_scorer.py 변경

### build_scorer_output_v2 시그니처

```python
def build_scorer_output_v2(
    per_screen_results: dict[str, list[dict]],
    per_screen_weights: dict[str, list[float]],
    flow_edges: list[dict],
) -> dict
```

### 화면별 집계: _score_screen()

각 화면에 대해:

```python
def _score_screen(results: list[dict], weights: list[float]) -> dict:
    # friction_rate: confusion_events 있는 페르소나 비율
    # risk_level: >=0.7 critical, >=0.4 warning, else ok
    # think_aloud: final_abandoned=True 페르소나 우선, 없으면 confusion 가장 많은 페르소나
    # issues: 빈도순 상위 confusion_events 집계 (element 기준 dedup)
```

반환:
```json
{
  "friction_rate": 0.4,
  "risk_level": "warning",
  "think_aloud": "버튼이 잘 안 보였다",
  "issues": [{"element": "버튼", "reason": "색 대비 낮음", "count": 8}],
  "fix_prompts": ["버튼 색상을 더 진하게..."]
}
```

### edge_dropout 계산

```python
abandonment_rates = {
    screen: sum(1 for r in results if r.get("final_abandoned")) / len(results)
    for screen, results in per_screen_results.items()
    if results
}

edge_dropout = {
    f"{e['source']}|{e['target']}": round(abandonment_rates.get(e["source"], 0.0), 2)
    for e in flow_edges
}
```

### fix_prompts — 코드 없는 버전

시스템 프롬프트에서 line number / 코드 컨텍스트 제거.
UI 요소 이름 + 혼란 이유로만 수정 방향 생성.

```
[페르소나 UX 이슈 — {element}]
문제: {reason}

Fix: 구체적인 시각적 수정 방법 1~3문장.
어떤 요소를 어떻게 바꿔야 하는지 명시.
```

### 최상위 backward-compat 필드

모든 화면 결과 합산 → 기존 `friction_map`, `abandonment_rate`, `total_simulated`, `risk_level`, `think_aloud` 유지.

### 최종 출력 구조

```json
{
  "friction_map": [...],
  "abandonment_rate": 0.4,
  "total_simulated": 60,
  "risk_level": "warning",
  "think_aloud": "...",
  "fix_prompts": [...],
  "top3": [...],
  "per_screen": {
    "home.png": {
      "friction_rate": 0.4,
      "risk_level": "warning",
      "think_aloud": "홈화면에서 버튼이 잘 안 보였다",
      "issues": [...],
      "fix_prompts": ["버튼 색상을 더 진하게..."]
    }
  },
  "edge_dropout": {
    "home.png|product.png": 0.4,
    "product.png|checkout.png": 0.7
  }
}
```

---

## 삭제 대상 (m4_scorer.py)

- `_generate_fix_prompt_llm()` — 코드/line_number 의존 버전 교체
- `_generate_fix_prompt_fallback()` — 교체
- `build_scorer_output()` — 단일 결과 버전 (내부 호출 없으므로 제거 가능)
- `source_code` 파라미터 전체

---

## 테스트 대상

| 테스트 | 내용 |
|--------|------|
| `test_api.py` (신규) | `/analyze` 이미지 파일 수신, flow_edges 파싱 |
| `test_m4.py` | `build_scorer_output_v2` 새 시그니처, per_screen + edge_dropout 출력 |
