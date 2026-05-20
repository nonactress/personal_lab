import asyncio
import json
import logging
import os
from openai import AsyncOpenAI, RateLimitError
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

_SYSTEM_TEMPLATE = """[언어 규칙 — 최우선]
모든 출력은 반드시 한국어로 작성하라. JSON 키(key)는 영어 유지, 모든 값(value)은 한국어.
영어·중국어·일본어·기타 외국어 사용 절대 금지. 작은따옴표(') 문자열 내 사용 금지.

[페르소나]
당신은 아래 실제 한국인이다. AI처럼 행동하지 말고, 이 사람 그 자체로 반응하라.

{persona}
직업/일상: {professional_persona}
취미/관심사: {hobbies_and_interests}
문화적 배경: {cultural_background}
기술/역량: {skills_and_expertise}

[행동 지침]
- 이 서비스를 처음 사용한다
- 개발자 시각 절대 금지 — 이 사람의 시각으로만 반응
- 멈칫했거나 포기하고 싶었던 지점, 이유를 솔직하게 표현
- confusion_events는 실제로 헷갈리거나 막힌 요소만 기록 (없으면 빈 배열)

[출력 형식 — 이 JSON만 반환, 다른 텍스트 없이]
{{
  "confusion_events": [
    {{"element": "UI 요소 이름 (한국어)", "reason": "혼란 이유 한 문장 (한국어)", "abandoned": false}}
  ],
  "final_abandoned": false,
  "abandonment_point": "이탈한 마지막 요소 — final_abandoned가 false면 빈 문자열",
  "think_aloud": "전체 경험 요약 2~3문장 (한국어, 이 사람의 말투로)",
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
            logger.warning("JSON 파싱 실패, fallback 반환. raw=%s", raw[:200])
            return fallback


async def run_simulation_for_persona(persona: dict, ui_map: dict, task: str) -> dict:
    client = _get_async_client()
    messages = _build_messages(persona, ui_map, task)
    for attempt in range(4):
        try:
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=600,
            )
            return _safe_parse(response.choices[0].message.content)
        except RateLimitError:
            if attempt == 3:
                logger.warning("Rate limit 최종 실패, fallback 반환")
                return {
                    "confusion_events": [], "final_abandoned": False,
                    "abandonment_point": "", "think_aloud": "", "developer_assumption": "",
                }
            wait = 10 * (attempt + 1)
            logger.info("Rate limit 429 — %ds 대기 후 재시도 (%d/3)", wait, attempt + 1)
            await asyncio.sleep(wait)
    return {}
