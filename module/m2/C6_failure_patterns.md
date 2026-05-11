# C6 — 실패 패턴 (평균이 아닌 막히는 지점)

## 문제

평균 행동을 흉내내는 것은 개발자에게 별로 유용하지 않다.
개발자가 진짜 필요한 건 **어디서, 왜 막히는가**다.

---

## 평균 행동 vs 실패 패턴 차이

```
평균 행동 (현재 설계):
  "60대는 버튼을 천천히 찾는다"
  → 시뮬레이션: 모든 버튼을 조금 느리게 클릭

실패 패턴 (우리가 원하는 것):
  "60대는 버튼이 하단에 있으면 스크롤해야 한다는 걸 모른다"
  "60대는 팝업의 X 버튼을 못 찾는다"
  "60대는 '나중에' 버튼을 눌렀을 때 저장됐는지 모른다"
  → 시뮬레이션: 특정 UI 패턴에서 구체적인 실패 행동 발생
```

---

## 실패 패턴 카탈로그 구조

UI 패턴 × 집단 × 실패 확률 매핑:

```python
FAILURE_PATTERNS = {
    "scroll_to_find_button": {
        "60대_저리터러시": 0.75,   # 75% 확률로 못 찾음
        "20대_일반":       0.05,
        "40대_직장인":     0.15,
    },
    "close_popup_x_button": {
        "60대_저리터러시": 0.6,
        "20대_일반":       0.02,
    },
    "hamburger_menu_recognition": {
        "60대_저리터러시": 0.8,
        "20대_일반":       0.05,
    },
    "email_verification_understanding": {
        "60대_저리터러시": 0.7,
        "20대_일반":       0.1,
    },
    "swipe_gesture_discovery": {
        "60대_저리터러시": 0.85,
        "20대_일반":       0.08,
    }
}
```

---

## 실패 패턴 소스

카탈로그를 어떻게 구축하는가:

```
1. UX 논문에서 집단별 실패 확률 수치 추출
2. 앱스토어 리뷰에서 반복 불만 패턴 → 실패 패턴으로 코딩
3. 베타 Think-Aloud에서 실제 막히는 지점 수집
4. Nielsen Norman Group 공개 연구 활용
```

---

## M3 시뮬레이션과 연결

M3가 화면을 분석할 때, 해당 화면의 UI 패턴을 감지하고
페르소나의 실패 패턴 확률을 적용:

```python
def simulate_screen(screen: ScreenData, persona: PersonaParams) -> ThinkAloud:
    detected_patterns = detect_ui_patterns(screen)  # M1 결과 활용

    for pattern in detected_patterns:
        failure_prob = FAILURE_PATTERNS.get(pattern, {}).get(persona.group, 0.1)
        if random() < failure_prob:
            # 실패 Think-Aloud 생성
            return generate_failure_thinkaloud(pattern, persona)
```

---

## 미결 질문

- [ ] 실패 패턴 카탈로그의 초기 버전을 어떻게 빠르게 구축하는가?
- [ ] UI 패턴을 M1(Vision 모델)이 자동으로 감지할 수 있는가? (햄버거 메뉴, 팝업 X버튼 등)
- [ ] 실패 확률 수치의 출처를 어떻게 확보하는가?
