import json
from unittest.mock import patch, MagicMock
from src.core.logic import run_pipeline

MOCK_M1 = {
    "components": [{"type": "button", "label": "가입", "line_number": 10,
                    "styling": {"size": "text-xs"}, "context": "가입 버튼"}],
    "visual_hierarchy": "버튼이 작음",
    "potential_issues": ["버튼 너무 작음"],
    "detected_patterns": ["small_button"]
}
MOCK_M3 = {
    "think_aloud": "버튼이 어딨지...",
    "confusion_events": [{"element": "button", "line_number": 10,
                          "reason": "너무 작음", "severity": 0.8,
                          "evidence": "Nah(2004)"}],
    "abandoned": True,
    "abandonment_reason": "버튼 미발견"
}

def test_run_pipeline_returns_required_keys():
    codebase = [{"name": "App.tsx", "content": "export default function App() { return <button>가입</button>; }"}]

    with patch("src.core.logic.analyze_code", return_value=MOCK_M1), \
         patch("src.core.logic.run_simulation", return_value=MOCK_M3):
        result = run_pipeline(codebase, "20대 대학생", "회원가입하기")

    assert "confusion_score" in result
    assert "fix_prompts" in result
    assert "think_aloud" in result
    assert "top3" in result

def test_run_pipeline_score_is_int():
    codebase = [{"name": "App.tsx", "content": "..."}]

    with patch("src.core.logic.analyze_code", return_value=MOCK_M1), \
         patch("src.core.logic.run_simulation", return_value=MOCK_M3):
        result = run_pipeline(codebase, "20대 대학생", "회원가입하기")

    assert isinstance(result["confusion_score"], int)
    assert 0 <= result["confusion_score"] <= 100
