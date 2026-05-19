"""
Nemotron-Personas-Korea → data/nemotron_strata.json 빌드
실행: python scripts/build_strata.py
소요: 10~30분 (1회만 실행)
"""
import os
os.environ["USE_TORCH"] = "0"
os.environ["USE_JAX"] = "0"
os.environ["USE_TF"] = "0"

from datasets import load_dataset
import json
from pathlib import Path
from datetime import date

AGE_BUCKETS = [
    ("10~20대", 19, 29),
    ("30대",   30, 39),
    ("40대",   40, 49),
    ("50대",   50, 59),
    ("60대+",  60, 999),
]

EDU_MAP = {
    "초등학교":        "고졸이하",
    "중학교":          "고졸이하",
    "고등학교":        "고졸이하",
    "2~3년제 전문대학": "전문대",
    "4년제 대학교":    "대졸",
    "대학원":          "대학원",
}

def _age_group(age: int) -> str | None:
    for label, lo, hi in AGE_BUCKETS:
        if lo <= age <= hi:
            return label
    return None

def _edu_group(edu: str) -> str:
    return EDU_MAP.get(edu, "고졸이하")

def _hobbies_str(row: dict) -> str:
    h = row.get("hobbies_and_interests_list") or row.get("hobbies_and_interests", "")
    if isinstance(h, list):
        return ", ".join(str(x) for x in h)
    return str(h)

def build_strata():
    ds = load_dataset("nvidia/Nemotron-Personas-Korea", split="train", streaming=True)
    strata: dict = {}
    total = 0

    for row in ds:
        total += 1
        ag = _age_group(row["age"])
        if ag is None:
            continue
        eg = _edu_group(row["education_level"])
        sex = row["sex"]
        key = f"{ag}_{eg}_{sex}"

        if key not in strata:
            strata[key] = {
                "count": 0,
                "keys": {"age_group": ag, "education": eg, "sex": sex},
                "personas": [],
            }

        strata[key]["count"] += 1

        if len(strata[key]["personas"]) < 3:
            strata[key]["personas"].append({
                "age": row["age"],
                "occupation": row.get("occupation", ""),
                "province": row.get("province", ""),
                "persona": row.get("persona", ""),
                "professional_persona": row.get("professional_persona", ""),
                "hobbies_and_interests": _hobbies_str(row),
                "cultural_background": row.get("cultural_background", ""),
                "skills_and_expertise": row.get("skills_and_expertise", ""),
            })

        if total % 50000 == 0:
            print(f"  processed {total:,} rows, {len(strata)} strata so far")

    out = {
        "meta": {
            "total_rows": total,
            "strata_count": len(strata),
            "built_at": str(date.today()),
        },
        "strata": strata,
    }

    Path("data").mkdir(exist_ok=True)
    with open("data/nemotron_strata.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {total:,} rows → {len(strata)} strata → data/nemotron_strata.json")

if __name__ == "__main__":
    build_strata()
