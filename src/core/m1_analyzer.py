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

M1_SYSTEM_PROMPT = """[언어 규칙 — 최우선]
모든 출력 텍스트는 반드시 한국어로 작성하라.
영어·중국어·일본어 등 한국어 외 언어 사용 금지. JSON 키(key)는 영어 유지, 값(value)은 한국어.

[역할]
스크린샷 이미지를 분석하여 한국어 사용자가 시각적으로 인지할 UI 구조를 JSON으로 반환하라.

[출력 형식 — 이 JSON만 반환, 다른 텍스트 없이]
{
  "screen_id": "파일명 그대로",
  "components": [
    {
      "type": "button|input|form|nav|text|image",
      "label": "사용자가 보는 텍스트 (한국어)",
      "context": "이 요소의 역할 한 줄 설명 (한국어)",
      "bbox": [x_pct, y_pct, w_pct, h_pct]
    }
  ],
  "visual_hierarchy": "시각적 위계 문제 한 줄 요약 (한국어)",
  "potential_issues": ["한국어 문제1", "한국어 문제2"],
  "screen_summary": "화면 전체를 한국어로 설명한 단락. 레이아웃·주요 요소·시각적 특징·사용자가 첫눈에 인식할 내용 포함."
}

[bbox 규칙]
- bbox는 이미지 전체 크기 대비 퍼센트: [왼쪽_x, 위쪽_y, 너비, 높이] (각 값 0~100 범위 숫자)
- 예: 이미지 가로 중앙 상단 버튼이면 [35, 5, 30, 8]
- 모든 component에 bbox 필수. 추정이 어려우면 가장 근접한 값 사용

[규칙]
- JSON 외 다른 텍스트(마크다운 코드펜스 포함) 출력 금지
- screen_summary 필수. 비워두지 말 것
- line_number, styling 필드 출력 금지
- 모든 값(value)은 한국어"""


def _make_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


try:
    client = _make_client()
except Exception:
    client = None


def _get_client() -> OpenAI:
    if client is None:
        raise RuntimeError("Groq 클라이언트 미초기화. GROQ_API_KEY를 확인하세요.")
    return client


def analyze_image(image_bytes: bytes, filename: str, task: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower()
    mime = _MIME_MAP.get(ext, "image/png")
    b64 = base64.b64encode(image_bytes).decode()

    response = _get_client().chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
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
        max_tokens=1024,
    )
    raw = (response.choices[0].message.content or "").strip()
    # Strip markdown code fences: ```json ... ``` or ``` ... ```
    if raw.startswith("```"):
        first_newline = raw.find("\n")
        last_fence = raw.rfind("```")
        if first_newline != -1 and last_fence > first_newline:
            raw = raw[first_newline + 1:last_fence].strip()
    # Fallback: find first { to last }
    if not raw.startswith("{"):
        brace_start = raw.find("{")
        brace_end = raw.rfind("}")
        if brace_start != -1 and brace_end != -1:
            raw = raw[brace_start:brace_end + 1]
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {}
    result.setdefault("screen_id", filename)
    result.setdefault("components", [])
    result.setdefault("visual_hierarchy", "")
    result.setdefault("potential_issues", [])
    result.setdefault("screen_summary", "")
    return result
