import asyncio
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

SAMPLE_PERSONAS = [
    {
        "age": 35, "occupation": "개발자", "province": "서울",
        "sex": "남자", "education_level": "4년제 대학교",
        "persona": "30대 개발자",
        "professional_persona": "스타트업 근무",
        "hobbies_and_interests": "게임, 유튜브",
        "cultural_background": "서울 출신",
        "skills_and_expertise": "Python, React",
    }
]

SAMPLE_FILTER = {
    "age_buckets": ["30대"],
    "sex": "모두",
    "education_levels": ["대졸"],
    "provinces": [],
    "n": 1,
}

FAKE_UI_MAP = {
    "screen_id": "home.png",
    "components": [{"type": "button", "label": "버튼", "context": "CTA"}],
    "visual_hierarchy": "없음",
    "potential_issues": [],
    "screen_summary": "홈 화면. 중앙에 큰 CTA 버튼이 있다.",
}

FAKE_SIM_RESULT = {
    "confusion_events": [{"element": "버튼", "reason": "색이 흐림", "abandoned": False}],
    "final_abandoned": False,
    "abandonment_point": "",
    "think_aloud": "버튼이 눈에 잘 안 띄었다.",
    "developer_assumption": "바로 누를 것이다.",
}

FAKE_SCORER_OUTPUT = {
    "friction_map": [{"element": "버튼", "affected_count": 100, "total": 100, "rate": 1.0}],
    "abandonment_rate": 0.0,
    "total_simulated": 1,
    "risk_level": "ok",
    "per_screen": {"home.png": {"think_aloud": "...", "issues": [], "friction_rate": 0.1, "risk_level": "ok"}},
    "edge_dropout": {},
}


@pytest.mark.asyncio
async def test_run_pipeline_returns_friction_map():
    from src.core.logic import run_pipeline

    images = [{"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10}]

    with patch("src.core.logic.query_count", return_value=100), \
         patch("src.core.logic.query_sample", return_value=SAMPLE_PERSONAS), \
         patch("src.core.logic.analyze_image", return_value=FAKE_UI_MAP), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)), \
         patch("src.core.logic.build_scorer_output_v2", return_value=FAKE_SCORER_OUTPUT):

        result = await run_pipeline(images, [], SAMPLE_FILTER, "서비스 탐색하기")

    assert "friction_map" in result
    assert "abandonment_rate" in result
    assert "total_simulated" in result


@pytest.mark.asyncio
async def test_run_pipeline_raises_on_no_match():
    from src.core.logic import run_pipeline

    images = [{"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10}]

    with patch("src.core.logic.query_count", return_value=0), \
         patch("src.core.logic.query_sample", return_value=[]), \
         patch("src.core.logic.analyze_image", return_value=FAKE_UI_MAP):
        with pytest.raises(ValueError, match="매칭된 페르소나가 없습니다"):
            await run_pipeline(images, [], SAMPLE_FILTER, "서비스 탐색하기")


@pytest.mark.asyncio
async def test_run_pipeline_calls_analyze_image_per_screen():
    from src.core.logic import run_pipeline

    images = [
        {"name": "home.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10},
        {"name": "product.png", "bytes": b"\x89PNG\r\n" + b"\x00" * 10},
    ]

    mock_analyze = MagicMock(return_value=FAKE_UI_MAP)

    with patch("src.core.logic.query_count", return_value=100), \
         patch("src.core.logic.query_sample", return_value=SAMPLE_PERSONAS), \
         patch("src.core.logic.analyze_image", mock_analyze), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)), \
         patch("src.core.logic.build_scorer_output_v2", return_value=FAKE_SCORER_OUTPUT):

        await run_pipeline(images, [], SAMPLE_FILTER, "서비스 탐색하기")

    assert mock_analyze.call_count == 2
