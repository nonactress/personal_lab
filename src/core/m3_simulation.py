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

[언어 규칙]
모든 텍스트는 반드시 한국어로 작성하라. 중국어·일본어·독일어·기타 언어 절대 사용 금지.
혼란 → 혼란 (중국어 混乱 금지). 작은따옴표(') 문자열 내 사용 금지 — 큰따옴표(") 필요 시 \" 이스케이프 사용.
저자명과 연도는 영문 유지 (예: "Nah (2004): 피드백 없으면 2초 후 이탈").

아래 JSON 형식으로만 반환하라:
{{
  "think_aloud": "사용자 내부 독백 요약 (2~3문장, 한국어) — 전체 흐름 요약",
  "think_aloud_steps": [
    {{
      "step": 1,
      "element": "현재 보고 있는 UI 요소",
      "thought": "이 요소를 보고 드는 생각 (한국어, 1~2문장)",
      "action": "했거나 하려는 행동 (예: 클릭 시도, 스크롤, 포기)",
      "friction": true
    }}
  ],
  "developer_assumption": "이 UI를 만든 개발자가 기대했을 사용자 행동 (1문장, 한국어)",
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

def _repair_json(raw: str) -> dict:
    """Last-resort: extract fields from broken JSON using string search."""
    import re
    result = {
        "think_aloud": "",
        "think_aloud_steps": [],
        "developer_assumption": "",
        "confusion_events": [],
        "abandoned": False,
        "abandonment_reason": "",
    }
    # Extract think_aloud (first quoted value after the key)
    m = re.search(r'"think_aloud"\s*:\s*"(.*?)"(?:\s*,|\s*\n)', raw, re.DOTALL)
    if m:
        result["think_aloud"] = m.group(1).replace("\\n", " ").strip()
    m = re.search(r'"developer_assumption"\s*:\s*"(.*?)"', raw, re.DOTALL)
    if m:
        result["developer_assumption"] = m.group(1).strip()
    m = re.search(r'"abandoned"\s*:\s*(true|false)', raw)
    if m:
        result["abandoned"] = m.group(1) == "true"
    return result


def run_simulation(ui_map: dict, constraints: str, research_context: str, task: str) -> dict:
    messages = build_simulation_prompt(constraints, research_context, ui_map, task)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=1800,
    )
    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Strip control chars outside strings and retry
        cleaned = raw.encode("utf-8", errors="replace").decode("utf-8")
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return _repair_json(cleaned)
