import logging
import os
import time
from collections import defaultdict
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _groq_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _client


_FIX_PROMPT_SYSTEM = """[언어 규칙 — 최우선]
모든 출력은 반드시 한국어로 작성하라. 영어·외국어 사용 금지.

[역할]
UX 개선 전문가. 주어진 UX 이슈를 분석하고 Cursor/Claude 같은 AI IDE에 붙여넣을 수 있는 실행 가능한 Fix Prompt를 한국어로 작성하라.

[출력 형식]
[페르소나 UX 이슈 — <요소명>]
문제: <이슈 한 문장>

Fix: <구체적인 시각적 수정 방법 1~3문장. 어떤 요소를 어떻게 바꿔야 하는지 명시.>

[규칙]
- 이슈 맥락에 맞는 구체적 수정 방향만 제시
- 짧고 실행 가능하게
- 모든 텍스트는 한국어"""


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
    client = _groq_client()
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": _FIX_PROMPT_SYSTEM},
                    {"role": "user", "content": f"이슈 요소: {element}\n문제: {reason}"},
                ],
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except RateLimitError:
            if attempt == 2:
                break
            wait = 10 * (attempt + 1)
            logger.info("Fix prompt rate limit — %ds 대기 후 재시도", wait)
            time.sleep(wait)
        except Exception:
            break
    return (
        f"[UX 이슈 — {element}]\n"
        f"문제: {reason}\n\n"
        f"Fix: {element} 요소의 접근성과 가시성을 높이도록 크기, 색상 대비, 레이블을 개선해줘."
    )


def _score_screen(results: list, weights: list, ui_map: dict | None = None) -> dict:
    if not results:
        return {
            "friction_rate": 0.0,
            "risk_level": "ok",
            "think_aloud": "",
            "issues": [],
            "fix_prompts": [],
            "element_positions": {},
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

    element_positions: dict = {}
    if ui_map:
        for comp in ui_map.get("components", []):
            label = comp.get("label")
            bbox = comp.get("bbox")
            if label and bbox and len(bbox) == 4:
                element_positions[label] = bbox

    return {
        "friction_rate": friction_rate,
        "risk_level": _risk_from_rate(friction_rate),
        "think_aloud": _pick_think_aloud(results),
        "issues": issues,
        "fix_prompts": fix_prompts,
        "element_positions": element_positions,
    }


def build_scorer_output_v2(
    per_screen_results: dict,
    per_screen_weights: dict,
    flow_edges: list,
    ui_maps: dict | None = None,
) -> dict:
    per_screen = {
        screen: _score_screen(
            results,
            per_screen_weights.get(screen, []),
            ui_maps.get(screen) if ui_maps else None,
        )
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

    # top3: 전체 스크린 이슈 합산 → 빈도 기반 severity 계산
    all_issue_counts: dict = defaultdict(lambda: {"reason": "", "count": 0})
    for s in per_screen.values():
        for iss in s.get("issues", []):
            el = iss["element"]
            if not all_issue_counts[el]["reason"]:
                all_issue_counts[el]["reason"] = iss["reason"]
            all_issue_counts[el]["count"] += iss["count"]

    max_count = max((v["count"] for v in all_issue_counts.values()), default=1)
    top3 = sorted(
        [
            {
                "reason": v["reason"],
                "evidence": f"{el} 요소에서 {v['count']}명이 혼란",
                "severity": round(v["count"] / max_count, 2),
            }
            for el, v in all_issue_counts.items()
        ],
        key=lambda x: x["severity"],
        reverse=True,
    )[:3]

    # issues_summary: per_screen risk_level 집계
    issues_summary = {"critical": 0, "warning": 0, "info": 0}
    for s in per_screen.values():
        rl = s.get("risk_level", "ok")
        if rl == "critical":
            issues_summary["critical"] += 1
        elif rl == "warning":
            issues_summary["warning"] += 1
        else:
            issues_summary["info"] += 1

    # developer_assumption: 가장 혼란스러운 결과에서 추출
    developer_assumption = next(
        (
            r.get("developer_assumption", "")
            for r in sorted(
                all_results,
                key=lambda r: len(r.get("confusion_events", [])),
                reverse=True,
            )
            if r.get("developer_assumption")
        ),
        "",
    )

    # dropout_point: 이탈한 첫 번째 결과의 abandonment_point
    dropout_point = next(
        (
            r.get("abandonment_point", "")
            for r in all_results
            if r.get("final_abandoned") and r.get("abandonment_point")
        ),
        "",
    )

    risk_labels = {"critical": "출시 위험", "warning": "개선 권장", "ok": "출시 가능"}

    return {
        "friction_map": friction_map,
        "abandonment_rate": abandonment_rate,
        "total_simulated": total_simulated,
        "risk_level": risk_level,
        "risk_label": risk_labels.get(risk_level, "출시 가능"),
        "think_aloud": think_aloud,
        "fix_prompts": all_fixes[:3],
        "top3": top3,
        "developer_assumption": developer_assumption,
        "abandoned": abandonment_rate >= 0.5,
        "dropout_point": dropout_point,
        "issues_summary": issues_summary,
        "per_screen": per_screen,
        "edge_dropout": edge_dropout,
    }
