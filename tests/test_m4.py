import pytest
from src.core.m4_scorer import generate_fix_prompts

SAMPLE_SIMULATION = {
    "think_aloud": "버튼을 못 찾겠어. 그냥 닫아야겠다.",
    "confusion_events": [
        {"element": "button#가입", "line_number": 45, "reason": "버튼 너무 작음",
         "severity": 0.82, "evidence": "Nah(2004): small elements cause hesitation"},
        {"element": "input#email", "line_number": 32, "reason": "placeholder만 있어서 무슨 형식인지 모름",
         "severity": 0.55, "evidence": "Sweller(1988): missing context increases cognitive load"}
    ],
    "abandoned": True,
    "abandonment_reason": "버튼 미발견"
}
SAMPLE_SOURCE = "// App.tsx\nline1\nline2\n..."

@pytest.mark.skip(reason="calculate_confusion_score not in public API")
def test_confusion_score_range():
    pass

@pytest.mark.skip(reason="calculate_confusion_score not in public API")
def test_confusion_score_high_for_abandoned():
    pass

@pytest.mark.skip(reason="calculate_confusion_score not in public API")
def test_confusion_score_zero_events():
    pass

@pytest.mark.skip(reason="requires live Groq API key")
def test_fix_prompts_have_line_numbers():
    pass

@pytest.mark.skip(reason="requires live Groq API key")
def test_fix_prompts_have_evidence():
    pass

def test_top3_issues():
    from src.core.m4_scorer import get_top3_issues
    top3 = get_top3_issues(SAMPLE_SIMULATION)
    assert len(top3) <= 3
    assert top3[0]["severity"] >= top3[-1]["severity"]


from src.core.m4_scorer import aggregate_friction_map, build_scorer_output_v2


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


def test_build_scorer_output_v2_includes_friction_map():
    results = [
        {"confusion_events": [{"element": "버튼", "reason": "안 보임", "abandoned": False}], "final_abandoned": False, "think_aloud": "어렵다", "developer_assumption": "쉽다"},
    ]
    weights = [100.0]
    out = build_scorer_output_v2(results, weights, source_code="<button>버튼</button>")

    assert "friction_map" in out
    assert "abandonment_rate" in out
    assert "total_simulated" in out
    assert out["total_simulated"] == 1
    assert out["friction_map"][0]["element"] == "버튼"
