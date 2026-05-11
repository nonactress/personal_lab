# M2 Persona Engine — 전체 구조

## 핵심 질문

> "타겟 설명에서 정확한 행동 프로파일을 어떻게 뽑아내는가?"

우리 서비스의 가치는 **타겟 인구를 얼마나 잘 카피하느냐**에 달려 있다.
개발자가 숫자를 조절하는 게 아니라, 시스템이 타겟을 분석해서 행동 파라미터를 만들어줘야 한다.

---

## 파이프라인 요약

```
타겟 설명 ("스마트폰 익숙하지 않은 60대 어르신")
    ↓
[C1] 다중 소스 RAG 검색
    ↓
[C2] 인구 내 분산 추정
    ↓
[C3] 시간적 유효성 필터
    ↓
[C4] 한국 문화 맥락 보정
    ↓
[C5] 태스크 상황 수정자 적용
    ↓
[C6] 실패 패턴 추출
    ↓
[C7] 할루시네이션 방지 검증
    ↓
PersonaParams (인용 + confidence + unknown 명시)
```

---

## 파일 목록

| 파일 | 내용 |
|------|------|
| [C1_data_sources.md](C1_data_sources.md) | 어떤 소스에서 행동 데이터를 가져오는가 |
| [C2_population_variance.md](C2_population_variance.md) | 같은 타겟 안의 분산을 어떻게 다루는가 |
| [C3_temporal_validity.md](C3_temporal_validity.md) | 오래된 데이터를 어떻게 걸러내는가 |
| [C4_korean_context.md](C4_korean_context.md) | 한국 특수성을 어떻게 반영하는가 |
| [C5_context_sensitivity.md](C5_context_sensitivity.md) | 상황에 따라 달라지는 행동을 어떻게 표현하는가 |
| [C6_failure_patterns.md](C6_failure_patterns.md) | 평균이 아닌 실패 패턴을 어떻게 추출하는가 |
| [C7_hallucination_prevention.md](C7_hallucination_prevention.md) | 잘못된 값 생성을 어떻게 구조적으로 막는가 |

---

## 코멘트 방법

각 조건에 코멘트하고 싶으면:
```
@module/m2/C1_data_sources.md 이 부분에서 ...
```
