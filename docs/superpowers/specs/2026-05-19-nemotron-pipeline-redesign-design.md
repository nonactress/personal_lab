# Nemotron 기반 파이프라인 전면 재설계

**날짜:** 2026-05-19  
**목적:** nvidia/Nemotron-Personas-Korea 데이터셋으로 PersonaLab 파이프라인 전면 교체  
**배경:** 기존 파이프라인은 개발자가 정의한 행동 파라미터(patience, bballi_bballi 등)에 의존 → 결과가 개발자 편향을 재현하는 구조. H1(Developer Bias) 가설 자체를 위반. Nemotron 원본 텍스트를 LLM에 직접 주입해 개발자가 예상 못한 마찰 지점을 발견하는 방식으로 전환.

---

## 핵심 설계 원칙

1. **파라미터 제거** — 행동 파라미터(patience, digital_literacy 등) 전면 폐기. LLM이 Nemotron 원본 텍스트를 읽고 자유롭게 행동.
2. **찾기/시뮬 분리** — 페르소나 찾기는 exact field 필터(sparse), 시뮬레이션은 Nemotron 텍스트 직접 주입.
3. **BlinkDB식 집계** — 100만 명 대신 계층(strata) 대표로 시뮬 후 인원수 가중치로 "N/100명" 산출.

---

## 전체 아키텍처

```
[오프라인 1회 — 개발자 실행]
scripts/build_strata.py
  Nemotron 100만 행 streaming
  → age_group × education × sex 계층화
  → data/nemotron_strata.json

────────────────────────────────────────

[런타임 — 사용자 요청마다]

① 프론트 필드 선택 UI
   나이대 / 성별 / 학력 / 지역(선택) / 직업유형(선택)

② POST /build-cast
   필드 → strata 매칭 → 미리보기 3명 반환

③ POST /analyze
   strata_keys + UI 소스
   → 각 페르소나 Nemotron 텍스트로 LLM 시뮬 (async, semaphore 25)
   → confusion_events 가중 집계
   → friction_map 리포트 반환
```

---

## Section 1: 데이터 레이어

### `data/nemotron_strata.json`

```json
{
  "meta": {
    "total_rows": 1000000,
    "strata_count": 40,
    "built_at": "2026-05-19"
  },
  "strata": {
    "10~20대_대졸_여자": {
      "count": 47823,
      "keys": { "age_group": "10~20대", "education": "대졸", "sex": "여자" },
      "personas": [
        {
          "age": 24,
          "occupation": "마케터",
          "province": "서울",
          "persona": "...",
          "professional_persona": "...",
          "hobbies_and_interests": "...",
          "cultural_background": "...",
          "skills_and_expertise": "..."
        }
      ]
    }
  }
}
```

### 계층 키 조합

| 차원 | 값 | 개수 |
|---|---|---|
| 나이대 | 10~20대 / 30대 / 40대 / 50대 / 60대+ | 5 |
| 학력 | 고졸이하 / 전문대 / 대졸 / 대학원 | 4 |
| 성별 | 남자 / 여자 | 2 |
| **이론 최대** | | **40개** |

나이 범위: 19~29세 → 10~20대 버킷 포함 (데이터셋 최소 나이 19세).

지역 매핑: 수도권 = province in [서울, 경기, 인천], 지방 = 나머지 14개 시도, 모두 = 필터 없음.

### 시뮬에 사용하는 Nemotron 필드 (5개)

| 필드 | 역할 |
|---|---|
| `persona` | 이 사람 전체 요약 |
| `professional_persona` | 디지털/업무 환경 맥락 |
| `hobbies_and_interests` | 익숙한 앱/서비스 |
| `cultural_background` | 한국 문화 맥락 |
| `skills_and_expertise` | 기술 숙련도 |

제외 필드: `sports_persona`, `arts_persona`, `travel_persona`, `culinary_persona`, `family_persona` — UX 시뮬 목적과 거리 멂.

---

## Section 2: API 레이어

### `POST /build-cast` (신규 — 기존 `/generate-cast` 대체)

**Request:**
```json
{
  "age_group": "10~20대",
  "sex": "여자",
  "education": "대졸",
  "region": "수도권",
  "occupation_type": "직장인"
}
```

**Response:**
```json
{
  "matched_strata": ["10~20대_대졸_여자"],
  "total_count": 47823,
  "preview_personas": [
    { "age": 24, "occupation": "마케터", "persona": "..." }
  ]
}
```

### `POST /analyze` (기존 개조)

**Request 변화:**
- `strata_keys: list[str]` 추가
- `persona_desc` 제거

**Response 추가 필드:**
```json
{
  "friction_map": [
    { "element": "회원가입 버튼", "affected_count": 73, "total": 100, "rate": 0.73 }
  ],
  "abandonment_rate": 0.45,
  "total_simulated": 100
}
```

### 엔드포인트 변화 요약

| 엔드포인트 | 변화 |
|---|---|
| `POST /generate-cast` | 제거 |
| `POST /persona-features` | 제거 |
| `POST /build-cast` | 신규 |
| `POST /analyze` | `strata_keys` 추가, `persona_desc` 제거 |
| `GET /health` | 유지 |

---

## Section 3: 시뮬레이션 + 집계 로직

### LLM 시뮬레이션 프롬프트

```
당신은 아래 실제 한국인입니다. 절대 AI처럼 행동하지 마세요.

{persona}
직업/일상: {professional_persona}
취미/관심사: {hobbies_and_interests}
문화적 배경: {cultural_background}
기술/역량: {skills_and_expertise}

이 서비스를 처음 사용합니다. 태스크: {task}

어디서 멈칫했는지, 어디서 포기하고 싶었는지, 왜 그랬는지 솔직하게 표현하세요.

JSON:
{
  "confusion_events": [
    {"element": "UI 요소", "reason": "이유", "abandoned": true/false}
  ],
  "final_abandoned": true/false,
  "abandonment_point": "마지막 요소"
}
```

### 병렬 실행

- `asyncio.Semaphore(25)` — Groq free tier 30 RPM 안전 마진
- 스타트라 대표 3명 × 매칭 스타트라 수 → 총 9~15 LLM 호출
- 예상 소요: 5~10초

### 가중 집계

```python
# 각 페르소나 결과에 strata count 가중치 적용
# 정규화 → "100명 중 N명" 스케일
friction_map[element] += strata_count / personas_per_strata
scale = 100 / total_weight
affected_count = round(raw_count * scale)
```

---

## Section 4: 모듈 변화

| 파일 | 변화 |
|---|---|
| `data/nemotron_strata.json` | 신규 |
| `scripts/build_strata.py` | 신규 |
| `src/core/m2_persona.py` | 삭제 |
| `data/persona_params/` | 삭제 |
| `src/core/m3_simulation.py` | 프롬프트 Nemotron 텍스트 주입으로 교체 |
| `src/core/m4_scorer.py` | 가중 집계 로직 추가 |
| `src/core/logic.py` | strata 기반 병렬 실행으로 전면 교체 |
| `src/backend/api.py` | `/build-cast` 신규, `/persona-features` 제거, `/analyze` 개조 |
| `src/frontend/app.js` | 필드 선택 UI, 집계 리포트 추가 |

---

## Section 5: 프론트엔드 플로우

### 기존 → 신규

```
기존: 소스 입력 → 텍스트 페르소나 입력 → Cast 4명 생성 → 분석
신규: 소스 입력 → 필드 선택 UI → 매칭 미리보기 → 분석 → 집계 리포트
```

### 타겟 선택 UI

```
나이대:    [10~20대] [30대] [40대] [50대] [60대+]
성별:      [남자] [여자] [모두]
학력:      [고졸이하] [전문대] [대졸] [대학원]
지역:      [수도권] [지방] [모두]       (선택)
직업유형:  [직장인] [학생] [자영업] [주부] [은퇴]  (선택)

→ 예상 매칭: 47,823명
```

### 집계 리포트 UI

```
100명이 테스트한 결과
이탈률: 45%

주요 마찰 지점
1. 회원가입 버튼    73명  ████████
2. 이메일 인증      61명  ██████
3. 결제 정보 입력   45명  █████

대표 think-aloud (3명 샘플)
```

---

## 오프라인 인덱스 빌드 스크립트

`scripts/build_strata.py` 흐름:

```
Nemotron streaming (전체 순회)
    ↓
age_group + education + sex 키 생성
    ↓
각 버킷 count 증가 + 대표 3명 수집 (먼저 채워지면 스킵)
    ↓
data/nemotron_strata.json 저장
```

예상 실행 시간: 스트리밍 속도에 따라 10~30분 (1회만 실행).

---

## 구현 순서

1. `scripts/build_strata.py` 작성 + 실행 → `data/nemotron_strata.json` 생성
2. `src/core/logic.py` strata 기반으로 전면 교체
3. `src/core/m3_simulation.py` 프롬프트 교체
4. `src/core/m4_scorer.py` 가중 집계 추가
5. `src/backend/api.py` 엔드포인트 교체
6. `src/frontend/app.js` + `index.html` UI 교체
7. `src/core/m2_persona.py` + `data/persona_params/` 삭제
