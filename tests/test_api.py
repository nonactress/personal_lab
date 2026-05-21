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
