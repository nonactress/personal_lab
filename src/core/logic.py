import asyncio

from src.core.m1_analyzer import analyze_image
from src.core.m3_simulation import run_simulation_for_persona
from src.core.m4_scorer import build_scorer_output_v2
from src.core.db import build_where_clause, query_count, query_sample


async def _simulate_one(
    persona: dict, ui_map: dict, task: str, sem: asyncio.Semaphore
) -> dict:
    async with sem:
        return await run_simulation_for_persona(persona, ui_map, task)


async def run_pipeline(
    images: list[dict],
    flow_edges: list[dict],
    filter_params: dict,
    task: str = "서비스 탐색하기",
) -> dict:
    """
    images: [{"name": "home.png", "bytes": b"..."}]
    flow_edges: [{"source": "home.png", "target": "product.png"}]
    filter_params: FilterRequest dict
    """
    n = filter_params.get("n", 100)

    where, params = build_where_clause(
        age_buckets=filter_params["age_buckets"],
        sex=filter_params.get("sex", "모두"),
        education_levels=filter_params["education_levels"],
        provinces=filter_params.get("provinces", []),
        occupation_kw=filter_params.get("occupation_kw", ""),
        hobbies_kw=filter_params.get("hobbies_kw", ""),
        skills_kw=filter_params.get("skills_kw", ""),
        cultural_kw=filter_params.get("cultural_kw", ""),
    )
    total = query_count(where, params)
    if total == 0:
        raise ValueError("매칭된 페르소나가 없습니다. 필터 조건을 넓혀주세요.")

    personas = query_sample(where, params, n=n, total=total)

    ui_maps = {
        img["name"]: analyze_image(img["bytes"], img["name"], task)
        for img in images
    }

    sem = asyncio.Semaphore(3)
    all_tasks: list = []
    screen_ranges: dict[str, tuple[int, int]] = {}
    screen_weights: dict[str, list[float]] = {name: [] for name in ui_maps}
    offset = 0

    for screen_name, ui_map in ui_maps.items():
        screen_tasks = []
        for persona in personas:
            screen_weights[screen_name].append(1.0)
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
        ui_maps=ui_maps,
    )
