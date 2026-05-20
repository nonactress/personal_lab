import asyncio
import json
import threading
from pathlib import Path

from src.core.m1_analyzer import analyze_image
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2

_STRATA_PATH = Path("data/nemotron_strata.json")
_STRATA_CACHE: dict | None = None
_STRATA_LOCK = threading.Lock()


def _load_strata() -> dict:
    global _STRATA_CACHE
    if _STRATA_CACHE is None:
        with _STRATA_LOCK:
            if _STRATA_CACHE is None:
                with open(_STRATA_PATH, encoding="utf-8") as f:
                    _STRATA_CACHE = json.load(f)
    return _STRATA_CACHE


def _match_strata(strata_data: dict, strata_keys: list[str]) -> list[tuple[str, dict]]:
    return [
        (key, strata_data["strata"][key])
        for key in strata_keys
        if key in strata_data["strata"]
    ]


async def _simulate_one(
    persona: dict, ui_map: dict, task: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        return await run_simulation_for_persona(persona, ui_map, task)


async def run_pipeline(
    images: list[dict],
    flow_edges: list[dict],
    strata_keys: list[str],
    task: str = "서비스 탐색하기",
) -> dict:
    """
    images: [{"name": "home.png", "bytes": b"..."}]
    flow_edges: [{"source": "home.png", "target": "product.png"}]
    """
    ui_maps = {
        img["name"]: analyze_image(img["bytes"], img["name"], task)
        for img in images
    }

    strata_data = _load_strata()
    matched = _match_strata(strata_data, strata_keys)
    if not matched:
        raise ValueError(f"매칭된 strata 없음: {strata_keys}")

    sem = asyncio.Semaphore(3)

    all_tasks: list = []
    screen_ranges: dict[str, tuple[int, int]] = {}
    screen_weights: dict[str, list[float]] = {name: [] for name in ui_maps}
    offset = 0

    for screen_name, ui_map in ui_maps.items():
        screen_tasks = []
        for _key, stratum in matched:
            personas = stratum["personas"]
            if not personas:
                continue
            weight = stratum["count"] / len(personas)
            for persona in personas:
                screen_weights[screen_name].append(weight)
                screen_tasks.append(_simulate_one(persona, ui_map, task, sem))
        screen_ranges[screen_name] = (offset, offset + len(screen_tasks))
        all_tasks.extend(screen_tasks)
        offset += len(screen_tasks)

    all_results = list(await asyncio.gather(*all_tasks))

    per_screen_results = {
        name: all_results[start:end]
        for name, (start, end) in screen_ranges.items()
    }

    return build_scorer_output_v2(
        per_screen_results=per_screen_results,
        per_screen_weights=screen_weights,
        flow_edges=flow_edges,
    )
