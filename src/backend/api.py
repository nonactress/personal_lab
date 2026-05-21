import io
import json
import os
import zipfile
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

from src.core.logic import run_pipeline
from src.core.db import build_where_clause, query_count, query_sample

load_dotenv()
app = FastAPI(title="PersonaLab API")

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


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
