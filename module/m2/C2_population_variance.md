# C2 — 서비스 분석 기반 Top-K Feature 선정 + 강도 보정

## 핵심 아이디어

타겟 집단의 feature는 서비스 컨텍스트 없이 선정하면 의미가 없다.

```
30대 남성 + 간편결제 앱  →  time_scarcity, trust_in_system 이 핵심
30대 남성 + 독서 앱      →  reading_speed, multitasking_habit 이 핵심
```

**M1이 분석한 서비스 구조 + 타겟 설명을 교차해서**
이 사람이 이 서비스를 쓸 때 가장 결정적인 feature Top-K를 선정한다.

---

## 흐름

```
[M1 출력]                    [사용자 입력]
서비스 구조 분석 결과          "30대 직장인 남성"
  └─ 서비스 유형               │
  └─ 핵심 태스크 목록           │
  └─ UI 복잡도                 │
         │                    │
         └──────────┬──────────┘
                    ▼
           [Feature 교차 선정]
           서비스 요구사항 × 인구통계 분포
           → Top-K 핵심 feature 도출
                    │
                    ▼
           [K개 보정 질문 생성]
           feature별 자연어 질문 + 3개 선택지
                    │
                    ▼
           [PersonaParams 완성]
           보정값 + 나머지 자동 채움
```

---

## Feature 교차 선정 로직

```python
def select_top_k_features(
    service_analysis: ServiceAnalysis,   # M1 출력
    target: str,                         # "30대 직장인 남성"
    k: int = 2
) -> list[Feature]:

    # 1. 서비스가 요구하는 feature 집합
    service_required = extract_service_requirements(service_analysis)
    # 예: 결제 앱 → {trust_in_system, time_scarcity, error_tolerance}
    # 예: 독서 앱 → {reading_speed, distraction_resistance, exploration_style}

    # 2. 이 인구 집단에서 개인차가 큰 feature 집합
    high_variance = get_high_variance_features(target)
    # 예: 30대 남성 → {time_scarcity, performance_orientation, trust_in_system}

    # 3. 교집합 = "이 서비스에서 이 집단의 행동 차이를 만드는" feature
    critical = service_required ∩ high_variance

    # 4. 중요도 순 정렬 후 Top-K 반환
    return sorted(critical, key=lambda f: f.impact_score, reverse=True)[:k]
```

---

## 서비스 유형별 요구 Feature 매핑

M1이 서비스를 분석하면 자동으로 연결:

| 서비스 유형 | 핵심 요구 feature |
|-----------|----------------|
| 결제 / 금융 | trust_in_system, time_scarcity, error_tolerance |
| 의료 / 건강 | reading_comprehension, external_help_tendency, anxiety_level |
| 커머스 | exploration_style, info_density_pref, decision_speed |
| 생산성 / 업무 | performance_orientation, multitasking_habit, learning_curve_tolerance |
| 소셜 / 커뮤니티 | social_validation_need, exploration_style, bballi_bballi |
| 온보딩 복잡 앱 | digital_literacy, patience_threshold, ui_pattern_familiarity |

---

## 예시: "30대 직장인 + 간편결제 앱"

서비스 요구: `{trust_in_system, time_scarcity, error_tolerance}`
30대 남성 고분산: `{time_scarcity, performance_orientation, trust_in_system}`
교집합 Top-2: `time_scarcity`, `trust_in_system`

### 질문 1 — time_scarcity

```
이 앱은 결제 흐름이 핵심인데,
이 사람은 결제할 때 얼마나 여유가 있나요?

  1. 이동 중 / 줄 서면서 쓴다   (한 손, 30초 안에 끝내야 함)
  2. 앉아서 쓰지만 빠르게 끝내고 싶다
  3. 시간 충분히 두고 꼼꼼히 확인하며 쓴다
```

### 질문 2 — trust_in_system

```
이 사람은 처음 보는 결제 앱을 얼마나 신뢰하나요?

  1. 개인정보 요구하면 바로 의심한다
  2. 유명한 앱이면 대체로 믿는 편이다
  3. 공인인증 마크만 있으면 별 의심 없이 진행한다
```

→ 답변 완료 후 PersonaParams 완성:
```
✅ 직접 보정: time_scarcity (0.9), trust_in_system (0.2)
⚙️  자동 추정: digital_literacy (0.72), exploration_style (0.55), ...
```

---

## 예시: "30대 직장인 + 독서 앱" (같은 인구, 다른 서비스)

서비스 요구: `{reading_speed, distraction_resistance, exploration_style}`
30대 남성 고분산: `{time_scarcity, performance_orientation, trust_in_system}`
교집합 Top-2: `time_scarcity`(독서 시간 확보)`, exploration_style`

→ 완전히 다른 질문이 나옴:

```
이 사람은 독서 앱을 언제 주로 사용할 것 같나요?

  1. 출퇴근 지하철에서 짧게    (5~10분, 자주 끊김)
  2. 점심 식사 후 잠깐         (20~30분, 집중 가능)
  3. 취침 전 여유롭게          (1시간 이상, 방해 없음)
```

---

## K 값 결정 원칙

```
교집합 feature 수 1개  →  질문 1개
교집합 feature 수 2~4개 →  질문 2개 (Top-2만)
교집합 feature 수 5개+  →  질문 2개 (영향력 상위 2개만)
질문 없이도 됨          →  서비스-집단 조합이 이미 명확한 경우 자동 완성
```

질문이 2개를 넘으면 개발자 부담 > 정확도 향상. 2개가 상한.

---

## 미결 질문

- [ ] 서비스 유형 분류를 M1이 자동으로 할 수 있는가, 아니면 사전 정의 카테고리에서 매핑인가?
- [ ] 교집합이 비어있을 때 (서비스 요구 feature와 집단 고분산 feature가 겹치지 않을 때) 어떻게 처리하는가?
- [ ] 질문 생성 자체를 LLM에게 맡길 것인가, 아니면 feature별 질문 템플릿을 미리 정의하는가?
