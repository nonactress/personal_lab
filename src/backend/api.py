import io
import zipfile
from typing import List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from src.core.logic import run_pipeline

app = FastAPI(title="PersonaLab API")

@app.get("/")
def read_root():
    return {"message": "PersonaLab Backend API is running"}

@app.post("/analyze")
async def analyze_code(
    files: List[UploadFile] = File(...),
    persona_desc: str = Form(...)
):
    try:
        codebase = []
        
        for file in files:
            content = await file.read()
            
            # ZIP 파일 처리
            if file.filename.endswith(".zip"):
                with zipfile.ZipFile(io.BytesIO(content)) as z:
                    for name in z.namelist():
                        if not name.endswith("/") and "__MACOSX" not in name:
                            with z.open(name) as f:
                                try:
                                    codebase.append({
                                        "name": name,
                                        "content": f.read().decode("utf-8")
                                    })
                                except:
                                    continue # 텍스트 파일이 아닌 경우 무시
            else:
                # 단일 파일 처리
                try:
                    codebase.append({
                        "name": file.filename,
                        "content": content.decode("utf-8")
                    })
                except:
                    continue

        if not codebase:
            raise HTTPException(status_code=400, detail="분석 가능한 코드가 없습니다.")

        result = run_pipeline(codebase, persona_desc)
        return result

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
