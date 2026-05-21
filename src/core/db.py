import threading
from pathlib import Path
from typing import Optional
import duckdb

_PARQUET = Path("data/nemotron_full.parquet")
_CONN: Optional[duckdb.DuckDBPyConnection] = None
_LOCK = threading.Lock()

EDU_MAP: dict[str, list[str]] = {
    "고졸이하": ["초등학교", "중학교", "고등학교"],
    "전문대":   ["2~3년제 전문대학"],
    "대졸":     ["4년제 대학교"],
    "대학원":   ["대학원"],
}

AGE_BUCKET_MAP: dict[str, tuple[int, int]] = {
    "10~20대": (19, 29),
    "30대":    (30, 39),
    "40대":    (40, 49),
    "50대":    (50, 59),
    "60대+":   (60, 999),
}


def _conn() -> duckdb.DuckDBPyConnection:
    global _CONN
    if _CONN is None:
        with _LOCK:
            if _CONN is None:
                _CONN = duckdb.connect(database=":memory:", read_only=False)
    return _CONN


def build_where_clause(
    age_buckets: list[str],
    sex: str,
    education_levels: list[str],
    provinces: list[str],
    occupation_kw: str,
    hobbies_kw: str,
    skills_kw: str,
    cultural_kw: str,
) -> tuple[str, list]:
    if not age_buckets:
        raise ValueError("age_buckets는 최소 1개 필요")

    parts: list[str] = []
    params: list = []

    age_clauses = []
    for bucket in age_buckets:
        lo, hi = AGE_BUCKET_MAP[bucket]
        age_clauses.append(f"(age >= {lo} AND age <= {hi})")
    parts.append(f"({' OR '.join(age_clauses)})")

    if sex != "모두":
        parts.append("sex = ?")
        params.append(sex)

    if education_levels:
        raw_edus: list[str] = []
        for label in education_levels:
            raw_edus.extend(EDU_MAP.get(label, [label]))
        placeholders = ", ".join("?" * len(raw_edus))
        parts.append(f"education_level IN ({placeholders})")
        params.extend(raw_edus)

    if provinces:
        placeholders = ", ".join("?" * len(provinces))
        parts.append(f"province IN ({placeholders})")
        params.extend(provinces)

    def _kw_clause(col: str, kw: str) -> Optional[str]:
        if not kw.strip():
            return None
        safe = kw.strip().replace("'", "''")
        return f"{col} ILIKE '%{safe}%'"

    for clause in [
        _kw_clause("occupation", occupation_kw),
        _kw_clause("CAST(hobbies_and_interests_list AS VARCHAR)", hobbies_kw),
        _kw_clause("skills_and_expertise", skills_kw),
        _kw_clause("cultural_background", cultural_kw),
    ]:
        if clause:
            parts.append(clause)

    return " AND ".join(parts), params


_SELECT_COLS = """
    age, sex, education_level, province,
    occupation, skills_and_expertise, cultural_background,
    persona, professional_persona,
    CAST(hobbies_and_interests_list AS VARCHAR) AS hobbies_and_interests
"""


def query_count(where: str, params: list) -> int:
    if not _PARQUET.exists():
        raise FileNotFoundError(
            f"{_PARQUET} 없음. scripts/download_dataset.py 먼저 실행하세요."
        )
    sql = f"SELECT COUNT(*) FROM '{_PARQUET}' WHERE {where}"
    return _conn().execute(sql, params).fetchone()[0]


def query_sample(where: str, params: list, n: int, total: int) -> list[dict]:
    if not _PARQUET.exists():
        raise FileNotFoundError(
            f"{_PARQUET} 없음. scripts/download_dataset.py 먼저 실행하세요."
        )
    sql = f"SELECT {_SELECT_COLS} FROM '{_PARQUET}' WHERE {where}"
    if total > n:
        sql += f" USING SAMPLE {n} ROWS"
    rows = _conn().execute(sql, params).df().to_dict(orient="records")
    return rows
