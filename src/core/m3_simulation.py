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

M3_SYSTEM_TEMPLATE = """[관련 연구 근거]
{research_context}

[코호트 행동 제약]
{constraints}

위 연구와 행동 제약을 반드시 반영하여 think-aloud를 생성하라.
한국 사용자 맥락(빨리빨리 문화, 카카오/네이버 멘탈모델)을 반영하라.

아래 JSON 형식으로만 반환하라:
{{
  "think_aloud": "사용자 내부 독백 (2~5문장, 한국어)",
  "confusion_events": [
    {{
      "element": "요소 설명",
      "line_number": 숫자,
      "reason": "혼란 원인",
      "severity": 0.0~1.0,
      "evidence": "관련 논문 인용 (저자 연도: 내용)"
    }}
  ],
  "abandoned": true|false,
  "abandonment_reason": "이탈 이유 (abandoned=true인 경우)"
}}"""

def build_simulation_prompt(constraints: str, research_context: str, ui_map: dict, task: str) -> list:
    system = M3_SYSTEM_TEMPLATE.format(
        research_context=research_context if research_context else "관련 연구 없음",
        constraints=constraints
    )
    components_desc = "\n".join(
        f"- [{c['type']}] '{c['label']}' (line {c['line_number']}): {c['context']}"
        for c in ui_map.get("components", [])
    )
    user_content = f"""태스크: {task}

UI 요소:
{components_desc}

시각적 위계: {ui_map.get('visual_hierarchy', '없음')}
잠재 이슈: {', '.join(ui_map.get('potential_issues', []))}"""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content}
    ]

def run_simulation(ui_map: dict, constraints: str, research_context: str, task: str) -> dict:
    messages = build_simulation_prompt(constraints, research_context, ui_map, task)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
