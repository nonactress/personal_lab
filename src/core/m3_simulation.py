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


_async_client: AsyncOpenAI | None = None


def _get_async_client() -> AsyncOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _async_client


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
    client = _get_async_client()
    messages = _build_messages(persona, ui_map, task)
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=800,
        timeout=30,
    )
    return _safe_parse(response.choices[0].message.content)
