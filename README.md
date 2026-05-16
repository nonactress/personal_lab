# PersonaLab — UX Linter for Vibe Coders

20대 대학생 코호트 기준 AI UX 실패 예측 도구.  
프론트엔드 코드를 입력하면 Think-Aloud 시뮬레이션과 Cursor/v0용 Fix Prompt를 반환한다.

---

## 요구사항

| 항목 | 버전 |
|------|------|
| Python | 3.11+ |
| OpenAI API 키 | GPT-4o 접근 가능한 키 |

---

## 1단계: 의존성 설치

```bash
pip install -r requirements.txt
```

설치 확인:

```bash
python -c "import openai, gradio, fastapi; print('OK')"
```

---

## 2단계: API 키 설정

프로젝트 루트(`presonal_Lab/`)에 `.env` 파일 생성:

```bash
# Windows PowerShell
copy .env.example .env
```

`.env` 파일을 열고 실제 키 입력:

```
OPENAI_API_KEY=sk-proj-여기에_실제_키_입력
```

> `.env` 파일은 `.gitignore`에 추가 권장 — 절대 커밋하지 말 것.

---

## 3단계: 백엔드 서버 실행

**터미널 1** — 프로젝트 루트에서:

```bash
uvicorn src.backend.api:app --reload --port 8000
```

정상 실행 시 출력:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

서버 동작 확인 (선택):

```bash
curl http://localhost:8000/
# 응답: {"message":"PersonaLab Backend API is running"}
```

---

## 4단계: 프론트엔드 실행

**터미널 2** — 프로젝트 루트에서:

```bash
python src/frontend/ui.py
```

정상 실행 시 출력:

```
Running on local URL:  http://127.0.0.1:7860
```

브라우저에서 `http://localhost:7860` 접속.

---

## 5단계: 데모 실행

### 샘플 코드 준비

아래 TSX 코드를 복사해서 분석에 사용한다:

```tsx
// LoginForm.tsx
export default function LoginForm() {
  return (
    <div className="p-2">
      <h1 className="text-gray-400 text-sm">회원가입</h1>
      <input
        type="email"
        placeholder="이메일"
        className="border text-gray-300 w-full"
      />
      <input
        type="password"
        placeholder="비밀번호"
        className="border text-gray-300 w-full mt-1"
      />
      <div className="mt-4">
        <span className="text-xs text-gray-500">이용약관 동의 필요</span>
        <input type="checkbox" />
      </div>
      <button className="text-xs p-1 mt-2">가입하기</button>
    </div>
  );
}
```

### UI 조작 순서

1. **프론트엔드 코드 업로드**: 위 TSX 파일을 `.tsx` 파일로 저장 후 업로드 (또는 ZIP으로 묶어 업로드)
2. **페르소나 설명**: 입력창에 `20대 대학생` 입력
3. **UX 분석 시작** 버튼 클릭
4. GPT-4o 호출 완료까지 약 10~30초 대기
5. 결과 확인:
   - **혼란 지수**: 0~100 (높을수록 이탈 위험)
   - **이탈 예측 여부**: ⚠️ 또는 ✅
   - **Think-Aloud**: 코호트 대표 사용자 내부 독백
   - **Top3 이슈**: 라인 번호 + 혼란 원인 + 논문 근거
   - **Fix Prompts**: Cursor/v0에 바로 붙여넣을 수정 지시문

---

## 파일 구조

```
presonal_Lab/
├── src/
│   ├── backend/api.py       FastAPI 서버 (포트 8000)
│   ├── core/
│   │   ├── logic.py         M1→M2→M3→M4 파이프라인 오케스트레이터
│   │   ├── m1_analyzer.py   코드 → UIMap JSON (GPT-4o)
│   │   ├── m2_persona.py    20대 대학생 행동 제약 + 연구 청크 선택
│   │   ├── m3_simulation.py Think-Aloud 생성 (GPT-4o)
│   │   └── m4_scorer.py     혼란 지수 + Fix Prompt 생성
│   └── frontend/ui.py       Gradio 대시보드 (포트 7860)
├── data/
│   ├── chunk_registry.py    Pattern-Mapped CAG (43개 연구 청크)
│   └── persona_params/
│       └── 20대_대학생.json 8개 UX 행동 피처 (논문 기반)
├── dong_paper/전처리 논문/   8개 전처리된 UX 논문 (청크 소스)
├── tests/                   27개 유닛 테스트 (LLM mock)
├── .env.example             API 키 템플릿
└── requirements.txt         의존성 목록
```

---

## 테스트 실행

```bash
python -m pytest tests/ -v
```

예상 결과: `27 passed`  
(LLM을 mock하므로 API 키 없이 실행 가능)

---

## 트러블슈팅

### `ModuleNotFoundError: No module named 'src'`

프로젝트 루트(`presonal_Lab/`)에서 실행하지 않은 경우.  
`cd presonal_Lab` 후 재실행.

### `openai.AuthenticationError`

`.env` 파일에 API 키가 없거나 잘못된 키.  
`OPENAI_API_KEY=sk-...` 형식으로 다시 확인.

### `Connection Error: ...` (프론트엔드에서)

백엔드 서버가 실행 중이지 않은 경우.  
터미널 1에서 `uvicorn src.backend.api:app --reload --port 8000` 먼저 실행.

### `JSONDecodeError` (분석 중)

GPT-4o가 잘못된 JSON을 반환한 경우. 분석 버튼을 한 번 더 클릭하면 대부분 해결.

---

## 파이프라인 개요

```
코드 입력 (TSX/JSX)
    ↓
M1 — GPT-4o가 UI 요소 맵 추출 (컴포넌트, 라인 번호, Tailwind 패턴 감지)
    ↓
M2 — 20대 대학생 PersonaParams 로드 + 관련 연구 청크 선택 (Pattern-Mapped CAG)
    │   HOW: 행동 제약 ("3.5초 후 이탈", "instagram 패턴 기준 판단")
    │   WHY: 논문 근거 청크 (Nah 2004, Sweller 1988, 한국 공공데이터 2025...)
    ↓
M3 — GPT-4o가 코호트 대표 Think-Aloud 생성 (연구 근거 + 행동 제약 주입)
    ↓
M4 — 혼란 지수 계산 + 라인 번호 기반 Fix Prompt 생성 (논문 인용 포함)
    ↓
M5 — Gradio 대시보드에 결과 표시
```
