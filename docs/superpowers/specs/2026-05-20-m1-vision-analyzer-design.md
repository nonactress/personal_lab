# M1 Vision Analyzer — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Branch:** feat/vision-backend

---

## Overview

`m1_analyzer.py`를 코드 파서에서 비전 분석기로 전면 교체.
이미지 스크린샷 1장을 받아 UI 구조를 텍스트로 추출하고, M3 시뮬레이션이 사용할 `ui_map`을 생성.

---

## 변경 요약

| 항목 | 기존 | 변경 |
|------|------|------|
| 입력 | `source_code: str` | `image_bytes: bytes, filename: str` |
| 모델 | `llama-3.3-70b-versatile` (텍스트) | `llama-3.2-11b-vision-preview` (비전) |
| `line_number` | 있음 | **제거** |
| `styling` 필드 | 있음 (Tailwind 클래스명) | **제거** |
| `detected_patterns` | 있음 (클래스명 매칭) | **제거** |
| `generate_preview_html()` | 있음 | **제거** |
| `detect_ui_patterns()` | 있음 | **제거** |
| `screen_summary` | 없음 | **추가** |

---

## 함수 계약

```python
def analyze_image(image_bytes: bytes, filename: str, task: str) -> dict:
    """
    반환:
    {
      "screen_id": "home.png",
      "components": [
        {
          "type": "button|input|form|nav|text|image",
          "label": "사용자가 보는 텍스트",
          "context": "이 요소의 역할 한 줄 설명"
        }
      ],
      "visual_hierarchy": "시각적 위계 문제 한 줄 요약",
      "potential_issues": ["문제1", "문제2"],
      "screen_summary": "화면 전체를 자연어로 설명한 단락 (M3 주요 컨텍스트)"
    }
    """
```

---

## 아키텍처 결정: Option B — screen_summary

### 문제
M1이 이미지를 텍스트로 변환하는 순간 정보 손실 발생.
M3는 원본 이미지를 보지 못하고 M1 텍스트에만 의존.
M1이 UI 요소를 잘못 설명하면 전체 시뮬레이션 오염.

### 검토한 옵션

| 옵션 | 설명 | 신뢰도 | 비용 | MVP |
|------|------|--------|------|-----|
| A | M3에 이미지 직접 전달 (vision × N페르소나) | 높음 | 높음 | 부분적 |
| **B** | M1에 `screen_summary` 추가 (holistic 설명) | 중간 | **없음** | **Yes** |
| C | M1 자체 검증 루프 (재시도) | 중간 | 2x | Yes |

### 선택: B

M1 프롬프트에 `screen_summary` 필드 추가.
M3가 component list는 보조 참고, `screen_summary`를 주 컨텍스트로 사용.
개별 요소 추출 부정확해도 holistic 설명이 시뮬레이션 품질 보호.
추가 LLM 호출 없음.

### 향후 고려 (데드라인 이후)

Option A — M3에 이미지 직접 전달 — 을 비용/품질 트레이드오프 분석 후 도입 검토.
현재 페르소나 수 × 화면 수 = vision 호출 수 폭증 문제로 MVP에서 제외.

---

## 비전 API 호출

```python
import base64

MIME_MAP = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "png": "image/png", "webp": "image/webp"
}

response = client.chat.completions.create(
    model="llama-3.2-11b-vision-preview",
    messages=[
        {"role": "system", "content": M1_SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "image_url",
             "image_url": {"url": f"data:{mime};base64,{b64}"}},
            {"type": "text", "text": f"태스크: {task}"}
        ]}
    ],
    response_format={"type": "json_object"},
    max_tokens=1024,
)
```

---

## M3 호환성

`logic.py` `_build_messages()` 내 `line_number` 참조 제거 필요.
M3 시스템 프롬프트에 `screen_summary` 우선 사용 지시 추가 필요.
→ M1 구현과 함께 logic.py + m3_simulation.py 연동 부분 수정.
