import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

PERSONA = {
    "persona": "30대 직장인 남성, 앱에 익숙하지 않음",
    "professional_persona": "제조업 근무, 스마트폰 기본 사용",
    "hobbies_and_interests": "등산, 뉴스 읽기",
    "cultural_background": "경북 출신, 보수적 소비 성향",
    "skills_and_expertise": "엑셀 기초, SNS 거의 안 함",
}
UI_MAP = {
    "components": [
        {"type": "button", "label": "회원가입", "line_number": 5, "context": "메인 CTA"},
    ],
    "visual_hierarchy": "CTA 버튼 하단 배치",
    "potential_issues": ["버튼 크기 작음"],
}

def _mock_response(content: str):
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp

@pytest.mark.asyncio
async def test_run_simulation_for_persona_returns_dict():
    from src.core.m3_simulation import run_simulation_for_persona

    fake_json = '{"confusion_events":[{"element":"회원가입","reason":"버튼이 잘 안 보임","abandoned":false}],"final_abandoned":false,"abandonment_point":"","think_aloud":"버튼 찾는 데 한참 걸렸다","developer_assumption":"바로 눌릴 것"}'

    with patch("src.core.m3_simulation._make_async_client") as mk:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=_mock_response(fake_json))
        mk.return_value = mock_client

        result = await run_simulation_for_persona(PERSONA, UI_MAP, "회원가입하기")

    assert "confusion_events" in result
    assert isinstance(result["confusion_events"], list)
    assert "final_abandoned" in result
    assert "think_aloud" in result

@pytest.mark.asyncio
async def test_run_simulation_handles_invalid_json():
    from src.core.m3_simulation import run_simulation_for_persona

    with patch("src.core.m3_simulation._make_async_client") as mk:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=_mock_response("not json {{{"))
        mk.return_value = mock_client

        result = await run_simulation_for_persona(PERSONA, UI_MAP, "테스트")

    assert result["confusion_events"] == []
    assert result["final_abandoned"] is False
