import asyncio
import json
from pathlib import Path

from src.core.m1_analyzer import analyze_code
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2

_STRATA_PATH = Path("data/nemotron_strata.json")
_STRATA_CACHE: dict | None = None


def _load_strata() -> dict:
    global _STRATA_CACHE
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


def _enrich_with_line_numbers(results: list, components: list) -> list:
    def _find(element_name: str) -> tuple:
        el = element_name.lower()
        for c in components:
            label = (c.get("label") or "").lower()
            if label and (label in el or el in label):
                return c.get("line_number"), c.get("context", "")
        el_words = set(el.split())
        for c in components:
            label = (c.get("label") or "").lower()
            if el_words & set(label.split()):
                return c.get("line_number"), c.get("context", "")
        return None, ""

    for result in results:
        for event in result.get("confusion_events", []):
            if not event.get("line_number"):
                ln, ctx = _find(event.get("element", ""))
                event["line_number"] = ln
                if not event.get("evidence") and ctx:
                    event["evidence"] = ctx
    return results


async def _simulate_one(
    persona: dict, ui_map: dict, task: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        return await run_simulation_for_persona(persona, ui_map, task)


async def run_pipeline(
    codebase: list,
    strata_keys: list[str],
    task: str = "서비스 탐색하기",
) -> dict:
    main_file = codebase[0]
    ui_map = analyze_code(main_file["content"], task)

    strata_data = _load_strata()
    matched = _match_strata(strata_data, strata_keys)

    if not matched:
        raise ValueError(f"매칭된 strata 없음: {strata_keys}")

    sem = asyncio.Semaphore(25)
    sim_tasks = []
    weights = []

    for _key, stratum in matched:
        personas = stratum["personas"]
        if not personas:
            continue
        weight = stratum["count"] / len(personas)
        for persona in personas:
            weights.append(weight)
            sim_tasks.append(_simulate_one(persona, ui_map, task, sem))

    raw = await asyncio.gather(*sim_tasks, return_exceptions=True)
    pairs = [(r, w) for r, w in zip(raw, weights) if not isinstance(r, Exception)]
    if not pairs:
        raise ValueError("모든 시뮬레이션이 실패했습니다.")
    results, weights = zip(*pairs)
    results = list(results)
    weights = list(weights)
    results = _enrich_with_line_numbers(results, ui_map.get("components", []))

    return build_scorer_output_v2(
        list(results),
        weights,
        main_file["content"],
        preview_html=ui_map.get("preview_html", ""),
    )
