import asyncio
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json

SAMPLE_STRATA_DATA = {
    "meta": {"total_rows": 100, "strata_count": 1, "built_at": "2026-05-19"},
    "strata": {
        "30대_대졸_남자": {
            "count": 100,
            "keys": {"age_group": "30대", "education": "대졸", "sex": "남자"},
            "personas": [
                {
                    "age": 35, "occupation": "개발자", "province": "서울",
                    "persona": "30대 개발자",
                    "professional_persona": "스타트업 근무",
                    "hobbies_and_interests": "게임, 유튜브",
                    "cultural_background": "서울 출신",
                    "skills_and_expertise": "Python, React",
                }
            ],
        }
    },
}

FAKE_SIM_RESULT = {
    "confusion_events": [{"element": "버튼", "reason": "색이 흐림", "abandoned": False}],
    "final_abandoned": False,
    "abandonment_point": "",
    "think_aloud": "버튼이 눈에 잘 안 띄었다.",
    "developer_assumption": "바로 누를 것이다.",
}


@pytest.mark.asyncio
async def test_run_pipeline_returns_friction_map():
    from src.core.logic import run_pipeline

    codebase = [{"name": "test.html", "content": "<button>버튼</button>"}]
    strata_keys = ["30대_대졸_남자"]

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_code", return_value={
             "components": [{"type": "button", "label": "버튼", "line_number": 1, "context": "CTA"}],
             "visual_hierarchy": "없음", "potential_issues": [], "detected_patterns": [], "preview_html": ""
         }), \
         patch("src.core.logic.run_simulation_for_persona", new=AsyncMock(return_value=FAKE_SIM_RESULT)):

        result = await run_pipeline(codebase, strata_keys, "서비스 탐색하기")

    assert "friction_map" in result
    assert "abandonment_rate" in result
    assert "total_simulated" in result
    assert result["total_simulated"] == 1
    assert result["friction_map"][0]["element"] == "버튼"


@pytest.mark.asyncio
async def test_run_pipeline_raises_on_no_match():
    from src.core.logic import run_pipeline

    with patch("src.core.logic._load_strata", return_value=SAMPLE_STRATA_DATA), \
         patch("src.core.logic.analyze_code", return_value={"components": [], "visual_hierarchy": "", "potential_issues": [], "preview_html": ""}):
        with pytest.raises(ValueError, match="매칭된 strata 없음"):
            await run_pipeline([{"name": "f", "content": ""}], ["없는_키_남자"])
