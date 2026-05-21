import pytest
import threading as _threading
from src.core.db import build_where_clause, EDU_MAP


def test_edu_map_keys():
    assert "고졸이하" in EDU_MAP
    assert "전문대" in EDU_MAP
    assert "대졸" in EDU_MAP
    assert "대학원" in EDU_MAP


def test_build_where_all_buckets():
    where, params = build_where_clause(
        age_buckets=["10~20대", "30대"],
        sex="모두",
        education_levels=["대졸"],
        provinces=[],
        occupation_kw="",
        hobbies_kw="",
        skills_kw="",
        cultural_kw="",
    )
    assert "age" in where
    assert "education_level" in where
    assert "sex" not in where


def test_build_where_with_sex_and_province():
    where, params = build_where_clause(
        age_buckets=["30대"],
        sex="여자",
        education_levels=["대졸", "대학원"],
        provinces=["서울", "경기"],
        occupation_kw="개발",
        hobbies_kw="",
        skills_kw="",
        cultural_kw="",
    )
    assert "sex" in where
    assert "province" in where
    assert "occupation" in where


def test_build_where_no_age_bucket():
    with pytest.raises(ValueError):
        build_where_clause(
            age_buckets=[],
            sex="모두",
            education_levels=["대졸"],
            provinces=[],
            occupation_kw="",
            hobbies_kw="",
            skills_kw="",
            cultural_kw="",
        )


def test_age_bucket_10대_포함():
    """10~20대 버킷은 10살부터 포함해야 한다"""
    from src.core.db import AGE_BUCKET_MAP
    lo, hi = AGE_BUCKET_MAP["10~20대"]
    assert lo == 10, f"10대 시작이 {lo}임 — 10이어야 함"
    assert hi == 29


def test_duckdb_concurrent_access():
    """여러 스레드가 동시에 query_count 호출해도 오류 없어야 함"""
    from src.core.db import build_where_clause, query_count
    from pathlib import Path

    if not Path("data/nemotron_full.parquet").exists():
        pytest.skip("parquet 파일 없음")

    where, params = build_where_clause(
        age_buckets=["30대"], sex="모두", education_levels=["대졸"],
        provinces=[], occupation_kw="", hobbies_kw="", skills_kw="", cultural_kw=""
    )

    barrier = _threading.Barrier(10)
    errors = []
    def worker():
        barrier.wait()  # all threads start simultaneously
        try:
            query_count(where, params)
        except Exception as e:
            errors.append(str(e))

    threads = [_threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == [], f"동시 접근 오류: {errors}"


def test_build_where_education_levels_빈리스트_거부():
    """education_levels 빈 리스트는 ValueError 발생해야 함"""
    with pytest.raises(ValueError, match="education_levels"):
        build_where_clause(
            age_buckets=["30대"],
            sex="모두",
            education_levels=[],
            provinces=[],
            occupation_kw="", hobbies_kw="", skills_kw="", cultural_kw=""
        )
