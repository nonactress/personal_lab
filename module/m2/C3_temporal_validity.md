# C3 — 시간적 유효성

## 문제

디지털 행동은 빠르게 변한다.
오래된 데이터로 feature를 채우면 현실과 다른 페르소나가 나온다.

```
2019년 연구: "60대의 70%가 모바일 뱅킹 불신"
2024년 현실: 코로나 이후 60대 앱 사용 급증, 카카오뱅크 60대 가입자 3배

→ 2019년 데이터로 2026년 60대를 시뮬레이션하면 틀림
```

---

## C1·C2 변경 이후 달라진 점

### C1 (데이터 소스 재설계) 반영

공공 데이터가 1순위 소스가 되면서 시간적 유효성 관리가 훨씬 용이해졌다.

| 소스 | 갱신 주기 | 시간적 유효성 |
|------|---------|------------|
| 디지털정보격차 실태조사 | 매년 | ✅ 항상 최신 유지 가능 |
| 한국미디어패널조사 | 매년 | ✅ 항상 최신 유지 가능 |
| 인터넷이용실태조사 | 매년 | ✅ 항상 최신 유지 가능 |
| UX 연구 논문 | 불규칙 | ⚠️ 연도 가중치 필요 |
| 커뮤니티 데이터 | 실시간 | ✅ 크롤링 시점 = 현재 |

→ 공공 데이터 기반 feature는 연간 업데이트로 자동 최신화 가능.
→ 시간적 유효성 문제는 주로 **UX 논문에서 뽑은 feature**에 집중.

### C2 (Top-K Feature 선정) 반영

feature를 "서비스 요구 × 인구 고분산"의 교집합으로 선정하기 때문에
**시간적 유효성이 낮은 feature가 Top-K에 포함되지 않도록 필터링**이 필요하다.

```python
def select_top_k_features(...) -> list[Feature]:
    critical = service_required ∩ high_variance_features

    # 시간적 유효성 필터 추가
    # confidence가 임계값 미만이면 Top-K 후보에서 제외
    valid = [f for f in critical if f.temporal_confidence >= 0.4]

    return sorted(valid, key=lambda f: f.impact_score, reverse=True)[:k]
```

유효성 낮은 feature가 Top-K에서 빠지면 → 질문 수가 줄거나 다른 feature로 대체됨.

---

## Feature별 시간 민감도 분류

feature마다 얼마나 빨리 낡는지가 다르다.

### 시간 민감 (매년 데이터 갱신 필요)

디지털 환경 변화에 직접적으로 영향받는 feature:

| Feature | 이유 |
|---------|------|
| `digital_literacy` | 스마트폰 보급률, 앱 사용 경험 매년 증가 |
| `ui_pattern_familiarity` | 카카오·네이버 UI 트렌드가 빠르게 바뀜 |
| `trust_in_system` | 사기/보이스피싱 사건 등 사회적 사건에 영향 |
| `bballi_bballi` | 서비스 속도 기대치는 인프라 발전에 따라 상승 |

→ **공공 데이터(매년 갱신)로 커버 가능**

### 시간 불변 (5년 이상 된 데이터도 유효)

기술 변화와 무관한 인지·심리 패턴:

| Feature | 이유 |
|---------|------|
| `working_memory` | 인지 용량 한계는 생물학적으로 안정적 |
| `error_anxiety` | 실수에 대한 정서 반응 패턴 |
| `reading_comprehension` | 텍스트 처리 방식 |
| `external_help_tendency` | 도움 요청 성향 (문화적으로 안정) |
| `bballi_bballi` (문화 레이어) | 빨리빨리 문화 자체는 수십 년 단위로 변함 |

→ 오래된 UX 논문도 이 feature에는 유효하게 사용 가능

---

## 소스별 시간 가중치 계산

```python
from datetime import datetime

def temporal_weight(source_type: str, published_year: int) -> float:
    age = datetime.now().year - published_year

    # 공공 데이터는 매년 갱신 → 감쇠 느림
    if source_type == "public_data_government":
        if age <= 1: return 1.0
        if age <= 2: return 0.9
        return 0.7   # 3년 이상이면 최신 버전으로 교체 권고

    # UX 논문 — 디지털 행동 관련
    if source_type in ("ux_paper_controlled", "ux_paper_survey"):
        if age <= 2:  return 1.0
        if age <= 4:  return 0.8
        if age <= 6:  return 0.55
        if age <= 9:  return 0.3
        return 0.1

    # 커뮤니티 데이터 — 크롤링 시점이 현재이므로 항상 최신
    if source_type == "community_text":
        return 1.0 if age == 0 else 0.6

# 시간 불변 feature는 감쇠 완화 적용
def feature_adjusted_weight(feature: str, base_weight: float) -> float:
    TIME_INVARIANT = {"working_memory", "error_anxiety", "reading_comprehension"}
    if feature in TIME_INVARIANT:
        return min(1.0, base_weight * 1.4)   # 감쇠 완화
    return base_weight
```

---

## 유효성 임계값 미달 시 처리

```
feature temporal_confidence < 0.4 인 경우:

1. Top-K 선정 후보에서 제외 (C2 필터)
2. 자동 채움 시에도 "낮은 신뢰도" 표시
3. 리포트에 경고 출력:

   ⚠️  digital_literacy 데이터가 오래됨 (출처: 2020년)
       최신 디지털정보격차 실태조사로 업데이트를 권장합니다.
```

절대 금지: 신뢰도 낮은 feature를 자동으로 중간값(0.5)으로 채우는 것
→ 틀린 값이 경고 없는 빈값보다 위험하다 (C7 원칙과 동일)

---

## 운영 관점: 자동 갱신 파이프라인

공공 데이터는 매년 발행되므로 갱신 파이프라인 구성 가능:

```
매년 1월 (데이터 발행 시점)
  → 디지털정보격차 실태조사 신규 버전 감지
  → 관련 feature 값 자동 업데이트
  → temporal_confidence 리셋
  → 변화량이 큰 feature 관리자 알림
```

---

## 미결 질문

- [ ] 공공 데이터 신규 버전 발행을 자동 감지하는 방법? (RSS, data.go.kr API)
- [ ] 같은 feature에 대해 최신 공공 데이터와 오래된 논문이 충돌할 때 어떻게 결합하는가?
- [ ] 시간 불변 feature 목록은 수동으로 정의하는가, 아니면 feature 변화율로 자동 분류하는가?
