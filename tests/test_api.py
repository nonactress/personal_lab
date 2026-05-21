import json
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

FAKE_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20

FAKE_RESULT = {
    "friction_map": [],
    "abandonment_rate": 0.0,
    "total_simulated": 1,
    "risk_level": "ok",
    "think_aloud": "괜찮다",
    "fix_prompts": [],
    "top3": [],
    "per_screen": {},
    "edge_dropout": {},
}

VALID_FILTER = json.dumps({
    "age_buckets": ["30대"],
    "sex": "모두",
    "education_levels": ["대졸"],
    "provinces": [],
    "n": 3,
})


def _make_client():
    from src.backend.api import app
    return TestClient(app, raise_server_exceptions=False)


def test_analyze_accepts_png():
    client = _make_client()
    with patch("src.backend.api.run_pipeline", new=AsyncMock(return_value=FAKE_RESULT)):
        resp = client.post(
            "/analyze",
            data={"filter_params": VALID_FILTER, "task": "탐색하기", "flow_edges": "[]"},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )
    assert resp.status_code == 200
    assert "friction_map" in resp.json()


def test_analyze_rejects_non_image():
    client = _make_client()
    resp = client.post(
        "/analyze",
        data={"filter_params": VALID_FILTER, "task": "탐색하기", "flow_edges": "[]"},
        files={"files": ("code.tsx", b"export default function App() {}", "text/plain")},
    )
    assert resp.status_code == 400


def test_analyze_parses_flow_edges():
    client = _make_client()
    flow_edges_json = json.dumps([{"source": "home.png", "target": "product.png"}])
    captured = {}

    async def fake_pipeline(images, edges, fp, task):
        captured["edges"] = edges
        return FAKE_RESULT

    with patch("src.backend.api.run_pipeline", new=fake_pipeline):
        resp = client.post(
            "/analyze",
            data={"filter_params": VALID_FILTER, "task": "탐색하기", "flow_edges": flow_edges_json},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )

    assert resp.status_code == 200
    assert captured["edges"] == [{"source": "home.png", "target": "product.png"}]


def test_analyze_passes_image_bytes():
    client = _make_client()
    captured = {}

    async def fake_pipeline(images, edges, fp, task):
        captured["images"] = images
        return FAKE_RESULT

    with patch("src.backend.api.run_pipeline", new=fake_pipeline):
        resp = client.post(
            "/analyze",
            data={"filter_params": VALID_FILTER, "task": "탐색하기", "flow_edges": "[]"},
            files={"files": ("home.png", FAKE_PNG, "image/png")},
        )

    assert resp.status_code == 200
    assert captured["images"][0]["name"] == "home.png"
    assert captured["images"][0]["bytes"] == FAKE_PNG


def test_analyze_invalid_filter_params():
    client = _make_client()
    resp = client.post(
        "/analyze",
        data={"filter_params": "not-json", "task": "탐색하기", "flow_edges": "[]"},
        files={"files": ("home.png", FAKE_PNG, "image/png")},
    )
    assert resp.status_code == 400


from src.backend.api import app as _app
_validator_client = TestClient(_app, raise_server_exceptions=False)


def test_build_cast_잘못된_sex_거부():
    res = _validator_client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["대졸"],
        "sex": "외계인",
    })
    assert res.status_code == 422


def test_build_cast_잘못된_age_bucket_거부():
    res = _validator_client.post("/build-cast", json={
        "age_buckets": ["100대"],
        "education_levels": ["대졸"],
    })
    assert res.status_code == 422


def test_build_cast_잘못된_education_level_거부():
    res = _validator_client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["비전공자"],
    })
    assert res.status_code == 422


def test_build_cast_education_levels_빈리스트_거부():
    res = _validator_client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": [],
    })
    assert res.status_code == 422


def test_build_cast_응답에_simulation_n_포함(monkeypatch):
    """build-cast 응답에 선택한 n값이 포함되어야 함"""
    import src.core.db as db_module

    monkeypatch.setattr(db_module, "query_count", lambda w, p: 500)
    monkeypatch.setattr(db_module, "query_sample", lambda w, p, n, total: [
        {"age": 32, "sex": "남자", "occupation": "개발자", "province": "서울",
         "education_level": "4년제 대학교", "persona": "테스트", "professional_persona": "",
         "hobbies_and_interests": "", "skills_and_expertise": "", "cultural_background": ""}
    ] * 3)

    res = _validator_client.post("/build-cast", json={
        "age_buckets": ["30대"],
        "education_levels": ["대졸"],
        "n": 200,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["simulation_n"] == 200
