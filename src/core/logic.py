from src.core.m1_analyzer import analyze_code
from src.core.m2_persona import build_m2_output
from src.core.m3_simulation import run_simulation
from src.core.m4_scorer import build_scorer_output

def run_pipeline(codebase: list, persona_desc: str, task: str = "서비스 탐색하기") -> dict:
    main_file = codebase[0]
    ui_map = analyze_code(main_file["content"], task)

    cohort = "20대_대학생"
    constraints, research_context = build_m2_output(
        ui_map.get("detected_patterns", []),
        cohort
    )

    simulation = run_simulation(ui_map, constraints, research_context, task)

    return build_scorer_output(simulation, main_file["content"], cohort)
