# PersonaLab — Baseline Alignment

> 이 문서는 구현 전 팀 alignment용. 결정된 항목은 ✅, 미결은 ❓

---

## 1. 서비스 핵심 플로우

```
[입력] URL + 타겟 설명
  ↓
[분석] Playwright 스크린샷 + Vision 모델
  ↓
[페르소나 생성] Qwen + RAG (UX 논문/앱스토어 리뷰)
  ↓
[시뮬레이션] Chain-of-Thought Think-Aloud + 혼란 지수 계산
  ↓
[출력] 리포트 (이탈 위험 Top3 + 액션 아이템)
```

---

## 2. 기술 스택 결정 항목

| 컴포넌트 | 결정 | 상태 |
|---------|------|------|
| 웹 크롤링 | Playwright | ✅ |
| Vision 모델 | Qwen-VL | ✅ |
| LLM (페르소나/시뮬) | Qwen (파인튜닝) | ✅ |
| RAG 데이터 소스 | UX 논문 + 앱스토어 리뷰 | ✅ |
| 백엔드 | FastAPI | ✅ |
| 프론트 | ? | ❓ |
| DB | ? (PostgreSQL 추천) | ❓ |

---

## 3. 페르소나 파라미터 정의

### 기본 (Uxia 수준)
- 나이, 성별, 기술 이해도

### 확장 (차별화)
- **인내심 지수** (0~100): 낮을수록 빨리 이탈
- **멘탈 모델**: 네이버/카카오 익숙 vs 앱스토어 익숙
- **상황 수정자**: 시간 없음 / 첫 방문 / 가격 민감

> ❓ OCEAN 모델 전부 구현할지 vs 핵심 3개만 할지?

---

## 4. 혼란 지수 계산 방식 ✅ B방식 확정

> 근거: UXAgent 논문 (arXiv:2504.09407) Memory Stream 구조 기반

### 신호 추출 구조 (Memory Stream → Confusion Score)

```
Memory Type     추출 신호                    매핑 파라미터
─────────────────────────────────────────────────────────
Observation  →  "버튼을 못 찾겠음"           task_failure
Reflection   →  "헷갈린다", "모르겠다"       hesitation_expressions
Action       →  반복 클릭, 뒤로가기 횟수     wrong_clicks / back_navigation
Wonder       →  좌절·부정 감정 표현          negative_emotion
```

### 혼란 지수 공식

```
Confusion Score (0~100) =
  task_failure          × 40  (완료 실패 or 타임아웃 or "못하겠다" 표현)
+ hesitation_expressions × 20  (한국어 키워드: "헷갈", "모르", "어디", "왜", "뭔데")
+ wrong_clicks           × 15  (최적 경로 대비 초과 클릭 / 동일 요소 반복)
+ negative_emotion       × 15  (좌절·짜증 표현, Wonder 모듈에서 추출)
+ back_navigation        × 10  (불필요한 뒤로가기 횟수)
```

### 한국어 hesitation 키워드셋 (세대별)
- **60대+**: "헷갈려요", "이게 뭐예요", "어떻게 하는 거예요"
- **30~40대**: "모르겠다", "어디 있지", "왜 이래"
- **20대**: "뭔데", "아 몰라", "이상하다"

### 주의사항 (논문 검증)
> UXAgent 신뢰도 63% → confusion score는 **절대 수치가 아닌 Top 3 상대 순위** 로 제공

---

## 5. MVP 범위 (데모용, 2주 목표)

### In Scope ✅
- [ ] URL 입력 → 스크린샷 캡처
- [ ] 타겟 설명 입력
- [ ] 페르소나 1개 생성
- [ ] Think-Aloud 텍스트 출력
- [ ] 혼란 지수 + Top 3 이탈 지점 리포트

### Out of Scope (예선 이후)
- 버전 비교
- 포커스 그룹 시뮬레이션
- 음성 출력

---

## 6. 미결 사항 (같이 결정할 것)

- [ ] Vision 모델 선택 (GPT-4V 유료 vs Qwen-VL 무료)
- [ ] 혼란 지수 계산 방식 (Option A/B/C)
- [ ] 프론트엔드 프레임워크
- [ ] 한국어 특화 RAG 데이터 어디서 수집?
- [ ] 서비스명 최종 결정 (PersonaLab 확정?)
