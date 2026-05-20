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
