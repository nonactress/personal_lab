# M4 — Scorer

## 목적

M3의 Think-Aloud 텍스트와 시뮬레이션 이벤트를 받아
화면별 **혼란 지수(Confusion Index)**와 전체 **태스크 완료율**을 계산한다.

숫자로 바꿔줘야 개발자가 버전 간 비교를 할 수 있고,
어떤 화면이 제일 문제인지 우선순위를 줄 수 있다.

---

## 입출력

| | 내용 |
|--|------|
| **Input** | `SimulationResult` (M3) |
| **Output** | 화면별 혼란 지수 (0~100) + 전체 태스크 완료율 + 이탈 위험 순위 |

---

## 혼란 지수 계산 방식

두 가지 신호를 결합한다.

### 신호 1 — 규칙 기반 (빠름)

Think-Aloud 텍스트에서 혼란 키워드를 감지한다.

```python
CONFUSION_SIGNALS = {
    "high":   ["모르겠", "어디", "안 눌려", "뭐지", "왜", "안 되"],
    "medium": ["그냥", "일단", "혹시", "아마"],
    "low":    ["음", "잠깐", "다시"]
}

def rule_score(think_aloud: str) -> float:
    score = 0
    for keyword in CONFUSION_SIGNALS["high"]:
        if keyword in think_aloud:
            score += 20
    for keyword in CONFUSION_SIGNALS["medium"]:
        if keyword in think_aloud:
            score += 8
    return min(score, 100)
```

### 신호 2 — LLM 기반 (정확함)

LLM에게 Think-Aloud를 주고 혼란 수준을 0~100으로 평가하게 한다.

```
프롬프트:
"아래 사용자 독백을 읽고, 이 사용자가 이 화면에서 느끼는
혼란의 수준을 0~100으로 평가해줘.
0 = 전혀 혼란 없음, 100 = 포기 직전.
숫자 하나만 답해."
```

### 최종 혼란 지수

```python
confusion_index = rule_score * 0.4 + llm_score * 0.6
```

규칙 기반으로 속도를 확보하고, LLM으로 정확도를 보완한다.

---

## 전체 메트릭 계산

```python
ScoreResult = {
    # 태스크 완료율
    "task_completion_rate": 0.34,  # 완료 화면 / 전체 화면

    # 전체 평균 혼란 지수
    "avg_confusion_index": 67,

    # 화면별 점수
    "screen_scores": [
        {"screen_id": "screen_01", "confusion_index": 89, "label": "회원가입"},
        {"screen_id": "screen_02", "confusion_index": 76, "label": "약 추가"},
    ],

    # 이탈 위험 상위 3개 (자동 정렬)
    "top_risk_screens": ["screen_01", "screen_02", "screen_03"]
}
```

---

## SUS 점수 연동 (선택)

표준 UX 지표인 SUS(System Usability Scale)를 혼란 지수에서 역산한다.
학술 신뢰도를 높이기 위해 리포트에 병기한다.

```python
# 혼란 지수 → SUS 점수 근사 (선형 변환)
sus_score = 100 - avg_confusion_index
```

---

## 사용 오픈소스

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| `transformers` (선택) | 감성 분석으로 혼란 감지 보조 | 없어도 동작 |
| `Qwen2.5` / `GPT-4o` | LLM 기반 스코어링 | M3과 동일 모델 재사용 |

별도 무거운 의존성 없이 100줄 이내로 구현 가능하다.

---

## 우리가 직접 구현하는 것

- `CONFUSION_SIGNALS` 한국어 키워드 사전
- 규칙 기반 + LLM 혼합 스코어링 로직
- 버전 간 점수 비교 함수 (V1 → V2 delta 계산)

---

## 다음 모듈로 넘기는 데이터

`ScoreResult` 딕셔너리 — M5 Dashboard가 시각화에 사용
