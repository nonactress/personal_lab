# M2 — Persona Engine

## 목적

개발자가 입력한 타겟 설명("60대 어르신", "20대 직장인")을 받아
해당 집단의 실제 행동 패턴을 반영한 **행동 파라미터 세트**를 생성한다.

이것이 PersonaLab의 핵심 차별화 지점이다.
기존 서비스(Uxia, GPT 직접 활용)는 인구통계만 넘기지만,
우리는 행동 심리 기반의 수치 파라미터로 변환한다.

---

## 입출력

| | 내용 |
|--|------|
| **Input** | 타겟 설명 자연어 (예: "스마트폰에 익숙하지 않은 60대 어르신") |
| **Output** | `PersonaParams` — 행동 파라미터 딕셔너리 |

---

## 행동 파라미터 스키마 (PersonaParams)

```python
PersonaParams = {
    # 기술 이해도 (0=완전 비숙련, 1=전문가)
    "digital_literacy": 0.2,

    # 인내심 — 낮을수록 빨리 이탈
    "patience_threshold": 0.3,

    # 텍스트 읽기 속도 및 정보 처리량
    "reading_speed": 0.4,

    # 오류 발생 시 재시도 횟수
    "retry_tendency": 0.5,

    # Big Five (OCEAN) 중 UX 관련 항목
    "ocean": {
        "openness": 0.3,           # 새로운 UI 패턴 수용도
        "conscientiousness": 0.7,  # 절차 준수 성향
        "neuroticism": 0.6,        # 실수에 대한 불안감
    },

    # 한국 사용자 특화
    "korean_context": {
        "bballi_bballi": 0.8,      # 빨리빨리 문화 — 높을수록 기다림 짧음
        "info_density_pref": 0.6,  # 정보 밀도 선호 (높을수록 많은 정보 선호)
        "authority_trust": 0.7,    # 공식 기관 UI 패턴 신뢰도
    },

    # 상황 수정자 (선택적)
    "context_modifiers": {
        "time_pressure": 0.0,      # 급한 상황 여부
        "distraction_level": 0.3,  # 주의 분산 정도
    }
}
```

---

## 구현 상세

### Step 1 — RAG 기반 파라미터 추출

UX 연구 논문 + 앱스토어 리뷰 데이터를 벡터DB에 저장하고,
타겟 설명이 들어오면 관련 행동 패턴 데이터를 검색한다.

```
[타겟 설명] → RAG 검색 → 관련 UX 연구 스니펫 →
Qwen에게 "이 집단의 행동 파라미터를 수치로 변환해줘" → PersonaParams
```

RAG 데이터 구성:
- UX 연구 논문 발췌 (디지털 리터러시 측정 연구, OCEAN-기술수용 연구)
- 국내 앱스토어 리뷰 (연령대별 불만 패턴)
- Nielsen Norman Group 공개 리포트

### Step 2 — Qwen 파인튜닝 (차별화 핵심)

입력: 타겟 설명 자연어
출력: PersonaParams JSON

학습 데이터:
- 공개 UX 연구에서 집단별 행동 수치 추출
- Think-Aloud 데이터와 행동 파라미터 역추론

파인튜닝 없이도 동작하는 RAG 버전을 먼저 만들고,
베타 테스터 데이터가 쌓이면 파인튜닝으로 정확도 향상.

### Step 3 — 파라미터 검증 및 정규화

- 모든 값 0~1 범위로 정규화
- 충돌하는 파라미터 조합 감지 (예: digital_literacy=0.9 + patience_threshold=0.1)
- 불확실한 항목은 해당 집단의 평균값으로 채움

---

## 사용 오픈소스

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| `LlamaIndex` | RAG 파이프라인 | pip install llama-index |
| `ChromaDB` | 벡터 DB | 로컬 실행 가능 |
| `Qwen2.5` | 파라미터 생성 LLM | 파인튜닝 대상 |

---

## 우리가 직접 구현하는 것

- `PersonaParams` 스키마 정의 (이게 논문 기여이자 서비스 핵심)
- 한국 사용자 특화 파라미터 (`korean_context`)
- RAG용 UX 연구 데이터 수집 및 청킹 전략
- 파라미터 검증 로직

---

## 다음 모듈로 넘기는 데이터

`PersonaParams` 딕셔너리 — M3 Simulation Engine이 프롬프트 생성에 사용
