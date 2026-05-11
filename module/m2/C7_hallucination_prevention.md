# C7 — 할루시네이션 방지

## 문제

LLM이 근거 없이 행동 파라미터를 생성하면 서비스 신뢰도가 0이 된다.
우리 서비스의 핵심 주장("AI가 더 정확하다")이 무너지는 지점이다.

---

## 방지 레이어 5개

### Layer 1 — 인용 강제

모든 feature 값에 출처가 없으면 생성 불가.

```python
@dataclass
class FeatureValue:
    value: float
    source: str          # 논문 제목 또는 리뷰 출처
    source_year: int
    confidence: float    # 0~1

# 출처 없으면 unknown 처리
FeatureValue(value=None, source=None, confidence=0.0)
```

출력 예시:
```
digital_literacy: 0.2
  └─ 출처: "Digital Literacy Among Korean Elderly" (Kim et al., 2022)
  └─ confidence: 0.82
```

---

### Layer 2 — 일관성 제약 (Constraint Rules)

논리적으로 불가능한 조합을 하드코딩으로 차단:

```python
CONSISTENCY_RULES = [
    # 디지털 고숙련자가 기본 UI 패턴을 모를 수 없음
    Rule(
        condition="digital_literacy > 0.8 AND ui_pattern_familiarity < 0.2",
        action="raise_conflict_error"
    ),
    # 빨리빨리 성향 강하면서 태스크 끝까지 하는 경우 제한
    Rule(
        condition="bballi_bballi > 0.85 AND task_commitment > 0.85",
        action="warn_and_cap_commitment_at_0.6"
    ),
    # 에러 공포 높으면 탐색 성향 낮아짐
    Rule(
        condition="neuroticism > 0.8 AND exploration_style > 0.7",
        action="warn"
    ),
]
```

---

### Layer 3 — 교차 검증

동일 feature를 다른 소스 2개에서 뽑아서 비교:

```python
def cross_validate(feature: str, sources: list[FeatureValue]) -> FeatureValue:
    values = [s.value for s in sources]
    spread = max(values) - min(values)

    if spread > 0.3:
        # 소스 간 차이가 큼 → confidence 낮춤 + 경고
        return FeatureValue(
            value=mean(values),
            confidence=0.4,
            warning="소스 간 값 차이 큼 — 시뮬레이션 결과 참고용으로만 사용"
        )
    return FeatureValue(value=mean(values), confidence=0.85)
```

---

### Layer 4 — 신뢰 구간 표현

점수 하나가 아니라 범위로 표현:

```
digital_literacy:
  값:        0.2
  범위:      0.1 ~ 0.35
  confidence: 0.82 (high) — 출처 3개 일치
  
bballi_bballi:
  값:        0.7
  범위:      0.4 ~ 0.9
  confidence: 0.41 (low) — 출처 1개, 한국 데이터 부족
  경고: "한국 특화 데이터 부족 — 수동 검토 권장"
```

---

### Layer 5 — Unknown을 모르는 것으로 인정

데이터 없으면 중간값(0.5)으로 채우지 않는다.

```python
if confidence < 0.3:
    feature.value = UNKNOWN
    # 시뮬레이션에서 unknown feature는:
    # → "보통 사람" 기본값 사용
    # → 리포트에 "이 feature는 데이터 부족으로 검증되지 않음" 표시
```

리포트 출력 예시:
```
⚠️ 주의: 아래 항목은 데이터 부족으로 기본값 사용됨
  - external_help_tendency (한국 고령층 데이터 없음)
  - info_density_pref (논문 간 상충)
결과 해석 시 이 점을 감안하세요.
```

---

## 미결 질문

- [ ] confidence 임계값을 몇으로 설정할 것인가? (0.3? 0.5?)
- [ ] 개발자에게 "데이터 부족" 경고를 어느 수준에서 보여주는가? (너무 많으면 신뢰도 오히려 떨어짐)
- [ ] 베타 테스터 데이터가 쌓이면 confidence를 자동으로 업데이트하는 파이프라인?
