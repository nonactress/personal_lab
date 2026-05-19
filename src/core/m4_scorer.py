import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def _groq_client():
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )

_FIX_PROMPT_SYSTEM = """당신은 UX 개선 전문가다. 주어진 UX 이슈를 분석하고 Cursor/Claude 같은 AI IDE에 붙여넣을 수 있는 명확한 Fix Prompt를 한국어로 작성하라.

형식:
[페르소나 UX 이슈 — line {line}]
문제: {reason}
근거: {evidence}

Fix: 구체적인 수정 방법을 1~3문장으로 설명. 어떤 속성을 어떻게 바꿔야 하는지 명시.

규칙:
- 하드코딩된 클래스명 나열 금지
- 이슈 맥락에 맞는 구체적 수정 방향 제시
- 짧고 실행 가능하게"""


def _risk_from_raw_score(score: int) -> tuple:
    if score >= 70:
        return "critical", "출시 위험"
    elif score >= 40:
        return "warning", "개선 권장"
    return "ok", "출시 가능"


def _issues_summary(events: list) -> dict:
    s = {"critical": 0, "warning": 0, "info": 0}
    for e in events:
        sev = e.get("severity", 0)
        if sev > 0.7:
            s["critical"] += 1
        elif sev > 0.4:
            s["warning"] += 1
        else:
            s["info"] += 1
    return s


def get_top3_issues(simulation_result: dict) -> list:
    events = simulation_result.get("confusion_events", [])
    sorted_events = sorted(events, key=lambda e: e.get("severity", 0), reverse=True)
    return sorted_events[:3]


def _generate_fix_prompt_llm(issue: dict, source_code: str, cohort: str) -> str:
    line = issue.get("line_number", "?")
    reason = issue.get("reason", "")
    evidence = issue.get("evidence", "")
    element = issue.get("element", "")

    lines = source_code.split("\n")
    start = max(0, int(line) - 3) if str(line).isdigit() else 0
    end = min(len(lines), int(line) + 2) if str(line).isdigit() else 0
    code_context = "\n".join(f"{start+i+1}: {l}" for i, l in enumerate(lines[start:end]))

    user_content = (
        f"코호트: {cohort}\n"
        f"이슈 요소: {element} (line {line})\n"
        f"문제: {reason}\n"
        f"근거: {evidence}\n\n"
        f"코드 컨텍스트:\n{code_context}"
    )

    client = _groq_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _FIX_PROMPT_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        max_tokens=256,
    )
    return response.choices[0].message.content.strip()


def _generate_fix_prompt_fallback(issue: dict, cohort: str) -> str:
    line = issue.get("line_number", "?")
    reason = issue.get("reason", "")
    evidence = issue.get("evidence", "")
    element = issue.get("element", "")
    return (
        f"[{cohort} UX 이슈 — line {line}]\n"
        f"문제: {reason}\n"
        f"근거: {evidence}\n\n"
        f"Fix: line {line}의 {element} 요소를 수정해줘. "
        f"접근성과 가시성을 높이도록 크기, 색상 대비, 레이블을 개선해줘."
    )


def generate_fix_prompts(simulation_result: dict, source_code: str, cohort: str) -> list:
    top3 = get_top3_issues(simulation_result)
    prompts = []
    for issue in top3:
        try:
            prompt = _generate_fix_prompt_llm(issue, source_code, cohort)
        except Exception:
            prompt = _generate_fix_prompt_fallback(issue, cohort)
        prompts.append(prompt)
    return prompts


def build_scorer_output(simulation_result: dict, source_code: str, cohort: str = "20대_대학생", preview_html: str = "") -> dict:
    events = simulation_result.get("confusion_events", [])
    abandoned = simulation_result.get("abandoned", False)

    critical_count = sum(1 for e in events if e.get("severity", 0) > 0.7)
    warning_count = sum(1 for e in events if 0.4 < e.get("severity", 0) <= 0.7)
    info_count = sum(1 for e in events if e.get("severity", 0) <= 0.4)

    raw_score = (50 if abandoned else 0) + (critical_count * 20) + (warning_count * 10) + (info_count * 3)
    raw_score = min(100, raw_score)

    risk_level, risk_label = _risk_from_raw_score(raw_score)
    if critical_count >= 2:
        risk_level, risk_label = "critical", "출시 위험"

    return {
        "risk_level": risk_level,
        "risk_label": risk_label,
        "issues_summary": _issues_summary(events),
        "abandoned": abandoned,
        "dropout_point": simulation_result.get("abandonment_reason") if abandoned else None,
        "developer_assumption": simulation_result.get("developer_assumption", ""),
        "think_aloud": simulation_result.get("think_aloud", ""),
        "think_aloud_steps": simulation_result.get("think_aloud_steps", []),
        "top3": get_top3_issues(simulation_result),
        "fix_prompts": generate_fix_prompts(simulation_result, source_code, cohort),
        "source_code": source_code,
        "preview_html": preview_html,
    }


def aggregate_friction_map(
    results: list, weights: list
) -> tuple[list, float, int]:
    """
    results: list of simulation dicts (each from run_simulation_for_persona)
    weights: list of floats (strata_count / personas_per_strata)
    Returns: (friction_map, abandonment_rate, total_simulated)
    """
    from collections import defaultdict

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


def build_scorer_output_v2(
    results: list,
    weights: list,
    source_code: str,
    preview_html: str = "",
) -> dict:
    friction_map, abandonment_rate, total_simulated = aggregate_friction_map(
        results, weights
    )

    all_events = []
    for r in results:
        all_events.extend(r.get("confusion_events", []))

    think_aloud = results[0].get("think_aloud", "") if results else ""
    developer_assumption = results[0].get("developer_assumption", "") if results else ""

    abandoned = abandonment_rate >= 0.5

    combined = {
        "confusion_events": [
            {
                "element": e.get("element", ""),
                "reason": e.get("reason", ""),
                "severity": 0.6 if e.get("abandoned") else 0.3,
                "evidence": e.get("evidence", ""),
                "line_number": e.get("line_number"),
            }
            for e in all_events
        ],
        "abandoned": abandoned,
        "abandonment_reason": friction_map[0]["element"] if friction_map else "",
        "developer_assumption": developer_assumption,
        "think_aloud": think_aloud,
        "think_aloud_steps": [],
    }

    base = build_scorer_output(combined, source_code, cohort="Nemotron", preview_html=preview_html)
    base.update(
        {
            "friction_map": friction_map,
            "abandonment_rate": abandonment_rate,
            "total_simulated": total_simulated,
        }
    )
    return base
