import json
import pytest
from unittest.mock import patch, MagicMock

SAMPLE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # 가짜 PNG bytes

MOCK_VISION_RESPONSE = {
    "screen_id": "home.png",
    "components": [
        {"type": "button", "label": "로그인", "context": "로그인 제출 버튼"},
        {"type": "input", "label": "이메일", "context": "이메일 입력 필드"},
    ],
    "visual_hierarchy": "버튼이 작고 대비가 낮아 눈에 잘 띄지 않음",
    "potential_issues": ["버튼 크기 너무 작음", "낮은 색상 대비"],
    "screen_summary": "로그인 화면. 상단에 로고, 중앙에 이메일/비밀번호 입력 필드 2개, 하단에 로그인 버튼.",
}


def _mock_client(response_dict: dict) -> MagicMock:
    mock = MagicMock()
    mock.chat.completions.create.return_value.choices[0].message.content = json.dumps(
        response_dict
    )
    return mock


def test_analyze_image_returns_required_keys():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert "screen_id" in result
    assert "components" in result
    assert "visual_hierarchy" in result
    assert "potential_issues" in result
    assert "screen_summary" in result
    assert isinstance(result["components"], list)


def test_analyze_image_screen_id_matches_filename():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert result["screen_id"] == "home.png"


def test_analyze_image_no_line_number_in_components():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    for comp in result["components"]:
        assert "line_number" not in comp
        assert "styling" not in comp


def test_analyze_image_screen_summary_nonempty():
    with patch("src.core.m1_analyzer.client", _mock_client(MOCK_VISION_RESPONSE)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    assert len(result["screen_summary"]) > 0


def test_analyze_image_defaults_missing_fields():
    """LLM이 일부 필드를 생략해도 기본값 보장"""
    partial_response = {"components": [{"type": "button", "label": "확인", "context": "확인 버튼"}]}
    with patch("src.core.m1_analyzer.client", _mock_client(partial_response)):
        from src.core.m1_analyzer import analyze_image
        result = analyze_image(SAMPLE_PNG, "checkout.png", "결제하기")

    assert result["screen_id"] == "checkout.png"
    assert result["visual_hierarchy"] == ""
    assert result["potential_issues"] == []
    assert result["screen_summary"] == ""


def test_analyze_image_uses_vision_model():
    mock_client = _mock_client(MOCK_VISION_RESPONSE)
    with patch("src.core.m1_analyzer.client", mock_client):
        from src.core.m1_analyzer import analyze_image
        analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    call_kwargs = mock_client.chat.completions.create.call_args
    assert call_kwargs.kwargs["model"] == "llama-3.2-11b-vision-preview"


def test_analyze_image_sends_base64_image():
    import base64
    mock_client = _mock_client(MOCK_VISION_RESPONSE)
    with patch("src.core.m1_analyzer.client", mock_client):
        from src.core.m1_analyzer import analyze_image
        analyze_image(SAMPLE_PNG, "home.png", "로그인하기")

    messages = mock_client.chat.completions.create.call_args.kwargs["messages"]
    user_msg = messages[-1]
    assert user_msg["role"] == "user"
    content = user_msg["content"]
    image_part = next(p for p in content if p["type"] == "image_url")
    expected_b64 = base64.b64encode(SAMPLE_PNG).decode()
    assert expected_b64 in image_part["image_url"]["url"]
