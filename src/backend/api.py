import io
import json
import os
import zipfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from openai import OpenAI
from dotenv import load_dotenv

from src.core.logic import run_pipeline
from src.core.db import build_where_clause, query_count, query_sample

load_dotenv()
app = FastAPI(title="PersonaLab API")

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

_VALID_SEX = {"모두", "남자", "여자"}
_VALID_AGE_BUCKETS = {"10~20대", "30대", "40대", "50대", "60대+"}
_VALID_EDU_LEVELS = {"고졸이하", "전문대", "대졸", "대학원"}


def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


class FilterRequest(BaseModel):
    age_buckets: list[str]
    sex: str = "모두"
    education_levels: list[str]
    provinces: list[str] = []
    occupation_kw: str = ""
    hobbies_kw: str = ""
    skills_kw: str = ""
    cultural_kw: str = ""
    n: int = 100

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        if v not in _VALID_SEX:
            raise ValueError(f"sex는 {_VALID_SEX} 중 하나여야 합니다. 입력값: {v!r}")
        return v

    @field_validator("age_buckets")
    @classmethod
    def validate_age_buckets(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("age_buckets는 최소 1개 필요")
        invalid = [x for x in v if x not in _VALID_AGE_BUCKETS]
        if invalid:
            raise ValueError(f"유효하지 않은 age_bucket: {invalid}. 허용값: {sorted(_VALID_AGE_BUCKETS)}")
        return v

    @field_validator("education_levels")
    @classmethod
    def validate_education_levels(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("education_levels는 최소 1개 필요")
        invalid = [x for x in v if x not in _VALID_EDU_LEVELS]
        if invalid:
            raise ValueError(f"유효하지 않은 education_level: {invalid}. 허용값: {sorted(_VALID_EDU_LEVELS)}")
        return v


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/build-cast")
async def build_cast(req: FilterRequest):
    try:
        where, params = build_where_clause(
            age_buckets=req.age_buckets,
            sex=req.sex,
            education_levels=req.education_levels,
            provinces=req.provinces,
            occupation_kw=req.occupation_kw,
            hobbies_kw=req.hobbies_kw,
            skills_kw=req.skills_kw,
            cultural_kw=req.cultural_kw,
        )
        total = query_count(where, params)
        preview = query_sample(where, params, n=3, total=total)
        return {
            "total_count": total,
            "preview_personas": preview[:3],
            "simulation_n": req.n,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"build-cast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze_endpoint(
    files: Optional[List[UploadFile]] = File(default=None),
    filter_params: str = Form(...),
    task: str = Form(default="서비스 탐색하기"),
    flow_edges: str = Form(default="[]"),
):
    try:
        try:
            fp: dict = json.loads(filter_params)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="filter_params가 유효한 JSON이 아닙니다.")
        if not fp.get("age_buckets") or not fp.get("education_levels"):
            raise HTTPException(status_code=400, detail="age_buckets, education_levels 필수")

        try:
            edges: list[dict] = json.loads(flow_edges)
        except (json.JSONDecodeError, TypeError):
            edges = []

        images: list[dict] = []
        if files:
            for file in files:
                content = await file.read()
                ext = Path(file.filename).suffix.lower()
                if ext == ".zip":
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if name.endswith("/") or "__MACOSX" in name:
                                continue
                            if Path(name).suffix.lower() in _IMAGE_EXTENSIONS:
                                with z.open(name) as f:
                                    images.append({"name": Path(name).name, "bytes": f.read()})
                elif ext in _IMAGE_EXTENSIONS:
                    images.append({"name": file.filename, "bytes": content})

        if not images:
            raise HTTPException(
                status_code=400,
                detail="분석 가능한 이미지가 없습니다. .png/.jpg/.webp 파일을 업로드하세요.",
            )

        result = await run_pipeline(images, edges, fp, task)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="frontend/dist", html=True, check_dir=False), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
