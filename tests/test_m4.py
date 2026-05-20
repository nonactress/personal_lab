import pytest
from unittest.mock import patch

# ── 유지되는 함수 테스트 ─────────────────────────────────────

from src.core.m4_scorer import get_top3_issues, aggregate_friction_map

SAMPLE_SIMULATION = {
    "think_aloud": "버튼을 못 찾겠어.",
    "confusion_events": [
        {"element": "button#가입", "reason": "버튼 너무 작음", "severity": 0.82, "evidence": ""},
        {"element": "input#email", "reason": "형식 불명확", "severity": 0.55, "evidence": ""},
    ],
    "abandoned": True,
    "abandonment_reason": "버튼 미발견",
}


def test_top3_issues():
    top3 = get_top3_issues(SAMPLE_SIMULATION)
    assert len(top3) <= 3
    assert top3[0]["severity"] >= top3[-1]["severity"]


def test_aggregate_friction_map_basic():
    results = [
        {"confusion_events": [{"element": "회원가입 버튼", "reason": "안 보임", "abandoned": False}], "final_abandoned": False},
        {"confusion_events": [{"element": "회원가입 버튼", "reason": "작음", "abandoned": True}, {"element": "이메일 인증", "reason": "복잡함", "abandoned": False}], "final_abandoned": True},
    ]
    weights = [50.0, 50.0]
    friction_map, abandonment_rate, total = aggregate_friction_map(results, weights)
    assert total == 2
    assert friction_map[0]["element"] == "회원가입 버튼"
    assert friction_map[0]["affected_count"] == 100
    assert friction_map[1]["element"] == "이메일 인증"
    assert friction_map[1]["affected_count"] == 50
    assert abandonment_rate == 0.5


def test_aggregate_friction_map_empty():
    friction_map, abandonment_rate, total = aggregate_friction_map([], [])
    assert friction_map == []
    assert abandonment_rate == 0.0
    assert total == 0


# ── 새 함수 테스트 ────────────────────────────────────────────

from src.core.m4_scorer import build_scorer_output_v2, _score_screen, _pick_think_aloud


def test_build_scorer_output_v2_includes_friction_map():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [{"element": "버튼", "reason": "안 보임", "abandoned": False}],
             "final_abandoned": False, "think_aloud": "어렵다"},
        ]
    }
    per_screen_weights = {"home.png": [100.0]}

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="버튼 크기를 키워주세요."):
        out = build_scorer_output_v2(per_screen_results, per_screen_weights, [])

    assert "friction_map" in out
    assert "abandonment_rate" in out
    assert "total_simulated" in out
    assert out["total_simulated"] == 1
    assert out["friction_map"][0]["element"] == "버튼"
    assert "per_screen" in out
    assert "edge_dropout" in out


def test_build_scorer_output_v2_per_screen_keys():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [{"element": "버튼", "reason": "작음"}],
             "final_abandoned": True, "think_aloud": "포기했다"},
            {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬웠다"},
        ]
    }
    per_screen_weights = {"home.png": [50.0, 50.0]}

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        out = build_scorer_output_v2(per_screen_results, per_screen_weights, [])

    assert "home.png" in out["per_screen"]
    screen = out["per_screen"]["home.png"]
    assert "friction_rate" in screen
    assert "risk_level" in screen
    assert "think_aloud" in screen
    assert "issues" in screen
    assert "fix_prompts" in screen


def test_build_scorer_output_v2_edge_dropout():
    per_screen_results = {
        "home.png": [
            {"confusion_events": [], "final_abandoned": True, "think_aloud": "포기"},
            {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬움"},
        ]
    }
    flow_edges = [{"source": "home.png", "target": "product.png"}]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        out = build_scorer_output_v2(per_screen_results, {"home.png": [50.0, 50.0]}, flow_edges)

    assert "home.png|product.png" in out["edge_dropout"]
    assert out["edge_dropout"]["home.png|product.png"] == 0.5


def test_pick_think_aloud_prefers_abandoned():
    results = [
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉬웠다"},
        {"confusion_events": [{"element": "버튼", "reason": "작음"}], "final_abandoned": True, "think_aloud": "포기했다"},
    ]
    assert _pick_think_aloud(results) == "포기했다"


def test_pick_think_aloud_fallback_most_confused():
    results = [
        {"confusion_events": [{"element": "A"}, {"element": "B"}], "final_abandoned": False, "think_aloud": "많이 헤맸다"},
        {"confusion_events": [{"element": "C"}], "final_abandoned": False, "think_aloud": "조금 헤맸다"},
    ]
    assert _pick_think_aloud(results) == "많이 헤맸다"


def test_score_screen_friction_rate():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "작음"}], "final_abandoned": False, "think_aloud": "어렵다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
        {"confusion_events": [], "final_abandoned": False, "think_aloud": "쉽다"},
    ]
    weights = [25.0, 25.0, 25.0, 25.0]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        score = _score_screen(results, weights)

    assert score["friction_rate"] == 0.25
    assert score["risk_level"] == "ok"


def test_score_screen_risk_level_critical():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "안 보임"}], "final_abandoned": True, "think_aloud": "포기"},
        {"confusion_events": [{"element": "폼", "reason": "복잡함"}], "final_abandoned": True, "think_aloud": "포기"},
        {"confusion_events": [{"element": "메뉴", "reason": "숨겨짐"}], "final_abandoned": True, "think_aloud": "포기"},
    ]
    weights = [33.0, 33.0, 34.0]

    with patch("src.core.m4_scorer._generate_fix_prompt", return_value="fix"):
        score = _score_screen(results, weights)

    assert score["risk_level"] == "critical"
