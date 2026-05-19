# PersonaLab — Claude 작업 가이드

## 프로젝트 컨텍스트

PersonaLab은 개발자가 타겟 사용자의 행동 패턴을 AI로 시뮬레이션하는 서비스다.
FIN:NECT 챌린지 2026 (마감 2026.05.25) 제출용 프로젝트다.

핵심 가설 5개:
- H1: Developer Bias — 개발자는 타겟 사용자 행동을 잘못 예측한다
- H2: 행동 파라미터 (디지털 리터러시, OCEAN, 인내심)가 UX 성과를 예측한다
- H3: AI Think-Aloud 생성이 실제 사용자 발화를 근사할 수 있다
- H4: Vision 기반 자동 분석이 실제 UX 마찰 지점과 상관된다
- H5: 개인 개발자는 리소스 부족으로 UX 검증을 체계적으로 건너뛴다

---

## 논문 PDF를 첨부하면 자동으로 할 일

사용자가 PDF 파일을 첨부하거나 "이 논문 읽어줘 / 분석해줘 / 정리해줘"라고 하면
아래 순서를 자동으로 실행한다. 별도 지시 없어도 이 워크플로우를 따른다.

### STEP 1 — 3분 스크리닝

다음 항목을 한국어로 출력한다:

1. **핵심 주장 한 줄** (논문 없는 내용 추가 금지)
2. **연구 방법** (실험 / 설문 / 메타분석 / 시스템 구현 중 택1 + 간단 설명)
3. **주요 수치 결과** (숫자 위주, 없으면 "수치 결과 없음")
4. **한계점** (논문이 직접 언급한 것만)
5. **PersonaLab 인용 가능성** (H1~H5 중 어느 가설을 지지하는지, 없으면 "해당 없음")

스크리닝 결과 마지막에 판정을 출력한다:
- ✅ 인용 가능 — H? 지지
- ⚠️ 참고만 — 직접 인용은 어렵지만 배경 이해에 유용
- ❌ 제외 — 관련성 낮음

### STEP 2 — 인용용 요약 (✅인 경우만)

스크리닝에서 ✅ 판정이 나오면 자동으로 이어서 출력한다:

- 인용할 수 있는 원문 문장 1~3개 (영어 그대로)
- 각 문장의 한국어 번역
- 출처 표기: 저자, 연도, 학회/저널명

### STEP 3 — reference_paper.md 업데이트 제안

스크리닝과 인용 요약이 끝나면, reference_paper.md의 "논문 리뷰 기록" 섹션에
추가할 마크다운 블록을 아래 형식으로 출력한다.
(실제 파일 수정은 사용자 확인 후 진행한다)

```
### 📄 [논문 제목]

| 항목 | 내용 |
|------|------|
| 저자 / 연도 | |
| 학회 / 저널 | |
| 읽은 날짜 | 오늘 날짜 |
| 스크리닝 결과 | ✅/⚠️/❌ |

**핵심 주장 한 줄**
> [내용]

**연구 방법**
[내용]

**주요 수치 결과**
- [내용]

**PersonaLab 인용 포인트**
- 가설: H?
- 원문: "[영어 원문]"
- 번역: "[한국어 번역]"
- 출처 표기: 저자, 연도, 학회명

**한계점**
[내용]
```

---

## 실행 명령어

```bash
# 서버 기동
uvicorn src.backend.api:app --reload --port 8000

# 테스트
pytest tests/ -v
```

환경변수 필수:
```
GROQ_API_KEY=...  # Groq API (llama-3.3-70b-versatile)
```

---

## 아키텍처

```
파일 업로드 + persona_desc + task
    ↓
M1 (m1_analyzer.py)   — 코드 → UI 맵 + 패턴 감지
    ↓
M2 (m2_persona.py)    — persona_desc + 패턴 → 행동 제약 + 연구 컨텍스트
    ↓
M3 (m3_simulation.py) — think_aloud + think_aloud_steps[] + confusion_events
    ↓
M4 (m4_scorer.py)     — risk_level + fix_prompts (LLM 생성) + top3
```

**data/ 레이어:**
- `chunk_registry.py` — 논문 청크 저장소 (Nah, Sweller, Miller 등 8개 연구)
- `persona_params/` — 코호트별 행동 파라미터 JSON (patience, bballi_bballi 등)

## 기술 스택

- Backend: FastAPI + Groq (llama-3.3-70b-versatile)
- Frontend: Alpine.js + Tailwind CDN (정적 파일로 FastAPI가 서빙)
- 프론트 진입점: `src/frontend/index.html` + `app.js` + `style.css`

## 현재 API 스펙

`POST /analyze` — FormData: `files[]`, `persona_desc`, `task` (기본값: "서비스 탐색하기")
응답 필드: `think_aloud`, `think_aloud_steps[]`, `fix_prompts[]`, `risk_level`, `top3`, `developer_assumption`

`POST /persona-features` — JSON: `{ persona_desc }` → 위젯용 외형 특징 추출

---

## 일반 규칙

- 모든 응답은 한국어로 한다
- 논문에 없는 내용을 추가하거나 추측하지 않는다. 확인할 수 없으면 "논문에서 확인 불가"로 표시한다
- 인용 문장은 반드시 PDF 원문에서 찾은 것만 사용한다
- 응답은 간결하게 — 불필요한 서론이나 마무리 멘트 생략
