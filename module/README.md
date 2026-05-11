# PersonaLab — 모듈 구조

## 전체 파이프라인

```
[개발자 입력]
  URL + 타겟 설명 ("60대 어르신 약 알림 앱")
        │
        ▼
┌─────────────────┐
│  M1 Web Analyzer │  Playwright + Qwen-VL
│  URL → UI 구조맵 │
└────────┬────────┘
         │ ScreenData[]
         ▼
┌──────────────────┐
│  M2 Persona Engine│  RAG + Qwen (파인튜닝 핵심)
│  설명 → 행동파라미터│
└────────┬─────────┘
         │ PersonaParams
         ▼
┌────────────────────┐
│  M3 Simulation     │  UXAgent 포크 + 파라미터 주입
│  Engine            │
│  → Think-Aloud 생성│
└────────┬───────────┘
         │ SimulationResult
         ▼
┌──────────────┐
│  M4 Scorer   │  규칙 기반 + LLM 혼합
│  → 혼란 지수  │
└──────┬───────┘
       │ ScoreResult
       ▼
┌─────────────────┐
│  M5 Dashboard   │  Gradio
│  → 리포트 출력   │
└─────────────────┘
```

---

## 모듈 요약

| 모듈 | 역할 | 핵심 오픈소스 | 직접 구현 범위 |
|------|------|------------|-------------|
| [M1 Web Analyzer](M1_web_analyzer.md) | URL → UI 구조 파악 | Playwright, Qwen-VL | 탐색 전략, Vision 프롬프트 |
| [M2 Persona Engine](M2_persona_engine.md) | 타겟 설명 → 행동 파라미터 | LlamaIndex, ChromaDB, Qwen | **PersonaParams 스키마**, 한국 맥락 파라미터 |
| [M3 Simulation Engine](M3_simulation_engine.md) | UI + 파라미터 → Think-Aloud | UXAgent (포크) | 파라미터 주입 레이어, 이탈 판단 로직 |
| [M4 Scorer](M4_scorer.md) | Think-Aloud → 혼란 지수 | (경량 자체 구현) | 한국어 혼란 키워드 사전, 스코어 계산 |
| [M5 Dashboard](M5_dashboard.md) | 리포트 시각화 | Gradio | 리포트 템플릿, 버전 비교 UI |

---

## 차별화 포인트가 있는 모듈

- **M2**: `PersonaParams` — 인구통계가 아닌 행동 심리 수치로 변환 (논문 기여)
- **M3**: UXAgent 포크에 파라미터 주입 — 기존 시뮬레이터와 결정적 차이
- **M4**: 한국어 혼란 신호 사전 — 한국 사용자 특화

---

## 구현 순서 (데모까지 2주)

```
Week 1
  Day 1-2: M1 파이프라인 연결
  Day 3-4: M2 PersonaParams 스키마 + RAG 구축
  Day 5-7: M3 UXAgent 포크 + 파라미터 주입

Week 2
  Day 8-9:   M4 스코어러
  Day 10-12: M5 Gradio 대시보드
  Day 13-14: 데모 시나리오 완성
```
