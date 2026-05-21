import pytest
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
