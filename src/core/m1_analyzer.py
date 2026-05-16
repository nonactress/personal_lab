import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def _make_client():
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

try:
    client = _make_client()
except Exception:
    client = None  # will be patched in tests or fail at call time

M1_SYSTEM_PROMPT = """프론트엔드 코드를 분석하여 사용자가 시각적으로 인지할 UI 구조를 JSON으로 반환하라.

반드시 아래 형식으로 반환하라:
{
  "components": [
    {
      "type": "button|input|form|nav|text|image",
      "label": "사용자가 보는 텍스트",
      "line_number": 숫자,
      "styling": {"color": "클래스명", "size": "클래스명"},
      "context": "이 요소의 역할 한 줄 설명"
    }
  ],
  "visual_hierarchy": "시각적 위계 문제 한 줄 요약",
  "potential_issues": ["문제1", "문제2"]
}"""

def detect_ui_patterns(components: list, potential_issues: list) -> list:
    """컴포넌트 분석 결과에서 PATTERN_TO_CHUNKS 키와 매칭되는 패턴을 감지한다."""
    patterns = []
    for comp in components:
        size = comp.get("styling", {}).get("size", "")
        color = comp.get("styling", {}).get("color", "")
        if comp["type"] == "button" and any(s in size for s in ["text-xs", "text-sm", "p-1", "p-2"]):
            patterns.append("small_button")
        if any(c in color for c in ["gray-2", "gray-3", "gray-4"]):
            patterns.append("low_contrast")
        if comp["type"] == "form":
            patterns.append("multi_step_form")

    for issue in potential_issues:
        issue_lower = issue.lower()
        if "대비" in issue_lower or "contrast" in issue_lower:
            if "low_contrast" not in patterns:
                patterns.append("low_contrast")
        if "로딩" in issue_lower or "loading" in issue_lower:
            patterns.append("loading_no_feedback")
        if "오류" in issue_lower or "error" in issue_lower:
            patterns.append("no_error_guidance")
        if "신뢰" in issue_lower or "trust" in issue_lower:
            patterns.append("trust_signal_missing")

    return list(set(patterns))

def analyze_code(source_code: str, task: str) -> dict:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": M1_SYSTEM_PROMPT},
            {"role": "user", "content": f"태스크: {task}\n\n코드:\n{source_code}"}
        ],
        response_format={"type": "json_object"}
    )
    result = json.loads(response.choices[0].message.content)
    result["detected_patterns"] = detect_ui_patterns(
        result.get("components", []),
        result.get("potential_issues", [])
    )
    return result
