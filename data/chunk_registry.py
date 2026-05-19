import json
import re
from pathlib import Path

BASE = Path(__file__).parent.parent / "rag_sources" / "전처리 논문"

def _load_chunks_from_file(path: Path, prefix: str) -> dict:
    """_rag_processed.md 파일에서 # CHUNK N 섹션을 추출한다."""
    text = path.read_text(encoding="utf-8")
    chunks = {}
    parts = re.split(r"(?=# CHUNK \d+)", text)
    for part in parts:
        match = re.match(r"# CHUNK (\d+)", part)
        if match:
            chunk_num = match.group(1)
            key = f"{prefix}_ch{chunk_num}"
            chunks[key] = part.strip()
    return chunks

def _build_registry() -> dict:
    registry = {}
    sources = [
        (BASE / "patience" / "nah_rag_processed.md",           "nah"),
        (BASE / "cognitive_load" / "sweller_rag_processed.md",  "sweller"),
        (BASE / "cognitive_load" / "miller_rag_processed.md",   "miller"),
        (BASE / "tech_literacy" / "hargittai_rag_processed.md", "hargittai"),
        (BASE / "mental model" / "norman_rag_processed.md",     "norman"),
        (BASE / "불안 신뢰 논문" / "mcknight_trust_processed.md","mcknight"),
        (BASE / "탐색행동논문" / "information_seeking_processed.md", "marchionini"),
        (BASE / "대한민국 공공데이터" / "internet_usage_stats_processed.md", "korean"),
    ]
    for path, prefix in sources:
        if path.exists():
            registry.update(_load_chunks_from_file(path, prefix))
    return registry

CHUNK_REGISTRY: dict = _build_registry()

PATTERN_TO_CHUNKS: dict = {
    "small_button":           ["nah_ch1", "korean_ch1"],
    "low_contrast":           ["nah_ch1", "sweller_ch3"],
    "multi_step_form":        ["sweller_ch3", "nah_ch4", "korean_ch1"],
    "hamburger_menu":         ["norman_ch2", "marchionini_ch5"],
    "email_verification":     ["mcknight_ch4", "korean_ch2"],
    "loading_no_feedback":    ["nah_ch2", "nah_ch5"],
    "no_error_guidance":      ["norman_ch3", "sweller_ch5"],
    "trust_signal_missing":   ["mcknight_ch4", "mcknight_ch2", "korean_ch3"],
    "complex_navigation":     ["marchionini_ch3", "norman_ch3"],
    "payment_flow":           ["mcknight_ch5", "korean_ch4"],
    "onboarding_text_heavy":  ["sweller_ch4", "hargittai_ch3"],
}

def load_persona_params(cohort: str) -> dict:
    path = Path(__file__).parent / "persona_params" / f"{cohort}.json"
    return json.loads(path.read_text(encoding="utf-8"))

def get_relevant_chunks(ui_patterns: list) -> str:
    chunk_ids = set()
    for pattern in ui_patterns:
        chunk_ids.update(PATTERN_TO_CHUNKS.get(pattern, []))
    chunks = [CHUNK_REGISTRY[cid] for cid in chunk_ids if cid in CHUNK_REGISTRY]
    return "\n\n---\n\n".join(chunks)
