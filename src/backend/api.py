import io
import ipaddress
import json
import os
import socket
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import httpx

from src.core.logic import run_pipeline, _load_strata

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _load_strata()
    except Exception:
        pass
    yield


app = FastAPI(title="PersonaLab API", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)

_STRATA_PATH = Path("data/nemotron_strata.json")
_METRO_PROVINCES = {"서울", "경기", "인천"}
_STRATA_CACHE_API: dict | None = None


_SSRF_BLOCKED = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
)


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="URL은 http/https만 허용됩니다.")
    host = parsed.hostname or ""
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(host))
        if any(ip in net for net in _SSRF_BLOCKED):
            raise HTTPException(status_code=400, detail="내부 네트워크 접근은 허용되지 않습니다.")
    except socket.gaierror:
        raise HTTPException(status_code=400, detail=f"호스트를 확인할 수 없습니다: {host}")
    return url


def _groq_client() -> OpenAI:
    return OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )


def _load_strata_once() -> dict:
    global _STRATA_CACHE_API
    if _STRATA_CACHE_API is None:
        if not _STRATA_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="strata 데이터가 없습니다. scripts/build_strata.py를 먼저 실행하세요.",
            )
        with open(_STRATA_PATH, encoding="utf-8") as f:
            _STRATA_CACHE_API = json.load(f)
    return _STRATA_CACHE_API


class BuildCastRequest(BaseModel):
    age_group: str
    sex: str
    education: str
    region: str = "모두"


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/build-cast")
async def build_cast(req: BuildCastRequest):
    try:
        data = _load_strata_once()
        strata = data["strata"]
        matched_keys = []
        total_count = 0
        preview_personas = []

        for key, stratum in strata.items():
            k = stratum["keys"]
            if k["age_group"] != req.age_group:
                continue
            if k["education"] != req.education:
                continue
            if req.sex != "모두" and k["sex"] != req.sex:
                continue

            count = stratum["count"]
            personas = stratum["personas"]

            if req.region == "수도권" and personas:
                metro = [p for p in personas if p["province"] in _METRO_PROVINCES]
                count = int(count * len(metro) / len(personas)) if metro else 0
            elif req.region == "지방" and personas:
                non_metro = [p for p in personas if p["province"] not in _METRO_PROVINCES]
                count = int(count * len(non_metro) / len(personas)) if non_metro else 0

            if count == 0:
                continue

            matched_keys.append(key)
            total_count += count

            if personas:
                p = personas[0]
                preview_personas.append({
                    "age": p["age"],
                    "occupation": p["occupation"],
                    "province": p["province"],
                    "persona": p["persona"][:120] + "…" if len(p["persona"]) > 120 else p["persona"],
                })

        return {
            "matched_strata": matched_keys,
            "total_count": total_count,
            "preview_personas": preview_personas[:3],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"build-cast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze_endpoint(
    files: Optional[List[UploadFile]] = File(default=None),
    strata_keys: str = Form(...),
    task: str = Form(default="서비스 탐색하기"),
    target_url: Optional[str] = Form(default=None),
):
    try:
        try:
            keys: list[str] = json.loads(strata_keys)
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="strata_keys가 유효한 JSON 형식이 아닙니다.")
        if not keys:
            raise HTTPException(status_code=400, detail="strata_keys가 비어 있습니다.")

        codebase = []

        if target_url:
            if not target_url.startswith(("http://", "https://")):
                target_url = "https://" + target_url
            _validate_url(target_url)
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(target_url)
                codebase.append({"name": target_url, "content": resp.text})
        elif files:
            for file in files:
                content = await file.read()
                if file.filename.endswith(".zip"):
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if not name.endswith("/") and "__MACOSX" not in name:
                                with z.open(name) as f:
                                    try:
                                        codebase.append({"name": name, "content": f.read().decode("utf-8")})
                                    except Exception:
                                        continue
                else:
                    try:
                        codebase.append({"name": file.filename, "content": content.decode("utf-8")})
                    except Exception:
                        continue

        if not codebase:
            raise HTTPException(status_code=400, detail="분석 가능한 소스가 없습니다.")

        result = await run_pipeline(codebase, keys, task)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
