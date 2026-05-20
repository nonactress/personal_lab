import os
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


_FIX_PROMPT_SYSTEM = """당신은 UX 개선 전문가다. 주어진 UX 이슈를 분석하고 Cursor/Claude 같은 AI IDE에 붙여넣을 수 있는 명확한 Fix Prompt를 한국어로 작성하라.

형식:
[페르소나 UX 이슈 — {element}]
문제: {reason}

Fix: 구체적인 시각적 수정 방법을 1~3문장으로 설명. 어떤 요소를 어떻게 바꿔야 하는지 명시.

규칙:
- 이슈 맥락에 맞는 구체적 수정 방향 제시
- 짧고 실행 가능하게
- 모든 텍스트는 한국어로"""


def _risk_from_rate(rate: float) -> str:
    if rate >= 0.7:
        return "critical"
    elif rate >= 0.4:
        return "warning"
    return "ok"


def _risk_from_raw_score(score: int) -> tuple:
    if score >= 70:
        return "critical", "출시 위험"
    elif score >= 40:
        return "warning", "개선 권장"
    return "ok", "출시 가능"


def get_top3_issues(simulation_result: dict) -> list:
    events = simulation_result.get("confusion_events", [])
    return sorted(events, key=lambda e: e.get("severity", 0), reverse=True)[:3]


def aggregate_friction_map(
    results: list, weights: list
) -> tuple[list, float, int]:
    raw_counts: dict = defaultdict(float)
    abandoned_weight = 0.0
    total_weight = sum(weights) if weights else 1.0

    for result, weight in zip(results, weights):
        for event in result.get("confusion_events", []):
            element = event.get("element") or "기타"
            raw_counts[element] += weight
        if result.get("final_abandoned", False):
            abandoned_weight += weight

    scale = 100.0 / total_weight

    friction_map = sorted(
        [
            {
                "element": element,
                "affected_count": round(raw * scale),
                "total": 100,
                "rate": round(raw * scale / 100, 2),
            }
            for element, raw in raw_counts.items()
        ],
        key=lambda x: x["affected_count"],
        reverse=True,
    )

    abandonment_rate = round(abandoned_weight * scale / 100, 2)
    return friction_map, abandonment_rate, len(results)


def _pick_think_aloud(results: list) -> str:
    for r in results:
        if r.get("final_abandoned") and r.get("think_aloud"):
            return r["think_aloud"]
    most_confused = max(
        results,
        key=lambda r: len(r.get("confusion_events", [])),
        default=None,
    )
    if most_confused:
        return most_confused.get("think_aloud", "")
    return ""


def _aggregate_issues(results: list) -> list:
    counts: dict = defaultdict(lambda: {"reason": "", "count": 0})
    for r in results:
        for event in r.get("confusion_events", []):
            el = event.get("element") or "기타"
            if not counts[el]["reason"]:
                counts[el]["reason"] = event.get("reason", "")
            counts[el]["count"] += 1
    return sorted(
        [
            {"element": el, "reason": v["reason"], "count": v["count"]}
            for el, v in counts.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]


def _generate_fix_prompt(element: str, reason: str) -> str:
    try:
        client = _groq_client()
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _FIX_PROMPT_SYSTEM},
                {"role": "user", "content": f"이슈 요소: {element}\n문제: {reason}"},
            ],
            max_tokens=256,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return (
            f"[UX 이슈 — {element}]\n"
            f"문제: {reason}\n\n"
            f"Fix: {element} 요소의 접근성과 가시성을 높이도록 크기, 색상 대비, 레이블을 개선해줘."
        )


def _score_screen(results: list, weights: list) -> dict:
    if not results:
        return {
            "friction_rate": 0.0,
            "risk_level": "ok",
            "think_aloud": "",
            "issues": [],
            "fix_prompts": [],
        }

    total_weight = sum(weights) or 1.0
    confused_weight = sum(
        w for r, w in zip(results, weights) if r.get("confusion_events")
    )
    friction_rate = round(confused_weight / total_weight, 2)

    issues = _aggregate_issues(results)
    fix_prompts = [
        _generate_fix_prompt(iss["element"], iss["reason"]) for iss in issues[:3]
    ]

    return {
        "friction_rate": friction_rate,
        "risk_level": _risk_from_rate(friction_rate),
        "think_aloud": _pick_think_aloud(results),
        "issues": issues,
        "fix_prompts": fix_prompts,
    }


def build_scorer_output_v2(
    per_screen_results: dict,
    per_screen_weights: dict,
    flow_edges: list,
) -> dict:
    per_screen = {
        screen: _score_screen(results, per_screen_weights.get(screen, []))
        for screen, results in per_screen_results.items()
    }

    abandonment_rates = {
        screen: sum(1 for r in results if r.get("final_abandoned")) / len(results)
        for screen, results in per_screen_results.items()
        if results
    }
    edge_dropout = {
        f"{e['source']}|{e['target']}": round(
            abandonment_rates.get(e["source"], 0.0), 2
        )
        for e in flow_edges
    }

    all_results = [r for results in per_screen_results.values() for r in results]
    all_weights = [w for weights in per_screen_weights.values() for w in weights]
    friction_map, abandonment_rate, total_simulated = aggregate_friction_map(
        all_results, all_weights
    )

    worst_rate = max(
        (s["friction_rate"] for s in per_screen.values()), default=0.0
    )
    risk_level = _risk_from_rate(worst_rate)

    think_aloud = next(
        (
            s["think_aloud"]
            for s in sorted(
                per_screen.values(), key=lambda x: x["friction_rate"], reverse=True
            )
            if s["think_aloud"]
        ),
        "",
    )

    seen: set = set()
    all_fixes: list = []
    for s in per_screen.values():
        for fp in s["fix_prompts"]:
            if fp not in seen:
                seen.add(fp)
                all_fixes.append(fp)

    return {
        "friction_map": friction_map,
        "abandonment_rate": abandonment_rate,
        "total_simulated": total_simulated,
        "risk_level": risk_level,
        "think_aloud": think_aloud,
        "fix_prompts": all_fixes[:3],
        "top3": [],
        "per_screen": per_screen,
        "edge_dropout": edge_dropout,
    }
