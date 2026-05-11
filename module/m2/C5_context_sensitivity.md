# C5 — 맥락 민감성

## 문제

같은 사람도 상황에 따라 완전히 다르게 행동한다.
고정된 파라미터 세트 하나로는 이를 표현할 수 없다.

---

## 상황이 행동을 바꾸는 예시

```
60대 어르신 + 약 복용 알림 앱

상황 A — 처음 설치할 때
  patience:        높음 (시간 여유 있음)
  exploration:     낮음 (겁남, 조심스러움)
  help_tendency:   높음 (바로 자녀에게 물어봄)

상황 B — 매일 사용할 때 (익숙해진 후)
  patience:        중간
  exploration:     낮음 (익숙한 경로만 사용)
  help_tendency:   낮음 (혼자 해결)

상황 C — 약 먹을 시간이 됐는데 알림이 안 올 때 (급한 상황)
  patience:        거의 0
  exploration:     낮음 (아는 버튼만 누름)
  help_tendency:   매우 높음 (즉시 전화)
```

---

## 구현: 기본값 + 상황 수정자

```python
BasePersona = PersonaParams(...)   # M2가 생성하는 기본 파라미터

ContextModifier = {
    "first_use": {
        "patience_threshold": +0.2,
        "exploration_style": -0.3,
        "external_help_tendency": +0.4,
    },
    "time_pressure": {
        "patience_threshold": -0.5,
        "exploration_style": -0.2,
    },
    "repeated_use": {
        "ui_pattern_familiarity": +0.2,   # 익숙해짐
        "exploration_style": -0.1,
    }
}

def apply_context(base: PersonaParams, context: str) -> PersonaParams:
    modifier = ContextModifier.get(context, {})
    return base.apply(modifier)
```

---

## 어떤 상황을 기본으로 시뮬레이션하는가

개발자가 태스크를 입력할 때 상황도 함께 받음:

```
입력 예시:
  태스크: "회원가입 후 약 추가하기"
  상황: "앱을 처음 설치한 날" ← 자동 추론 or 개발자 선택
```

상황을 명시하지 않으면: **first_use** 를 기본값으로 사용
이유: 최초 경험에서 이탈이 가장 많이 발생

---

## 미결 질문

- [ ] 상황 유형을 몇 가지로 정의할 것인가? (first_use / habitual_use / time_pressure / distracted)
- [ ] 상황 수정자 수치는 어떻게 결정하는가? (연구 기반 vs 경험적 추정)
