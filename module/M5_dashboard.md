# M5 — Report Dashboard

## 목적

M4의 점수 결과를 개발자가 바로 이해하고 행동할 수 있는
**리포트 대시보드**로 시각화한다.

"이탈 위험 Top 3"와 "개선 액션 아이템"을 핵심으로 보여주고,
버전 간 비교로 개선 여부를 추적할 수 있게 한다.

---

## 입출력

| | 내용 |
|--|------|
| **Input** | `ScoreResult` (M4) + `SimulationResult` (M3) |
| **Output** | 웹 대시보드 UI (로컬 실행 또는 공유 링크) |

---

## 화면 구성

### 섹션 1 — 요약 카드

```
┌─────────────────────────────────────────────┐
│  📊 시뮬레이션 결과          타겟: 60대 어르신  │
│                                              │
│  태스크 완료율    혼란 지수    SUS 점수        │
│      34%           67          33            │
└─────────────────────────────────────────────┘
```

### 섹션 2 — 이탈 위험 지점 Top 3

```
🔴 1위 — 회원가입 화면 (혼란 89)
   [스크린샷 썸네일]
   "이메일 인증이 뭔지는 아는데... 그냥 다음 누르면 안 되나?"
   → 개선: 이메일 인증 단계에 한 줄 설명 추가

🔴 2위 — 약 추가 화면 (혼란 76)
   [스크린샷 썸네일]
   "버튼이 너무 작아서 잘 안 눌려"
   → 개선: 주요 버튼 크기 48px 이상으로 확대
```

### 섹션 3 — 버전 비교 (V1 → V2)

```
              V1      V2      변화
혼란 지수     67  →   45    ▼ -22  ✅
완료율        34% →   58%   ▲ +24% ✅
1위 위험 화면  회원가입 → 약추가  (개선됨)
```

### 섹션 4 — 개선 액션 아이템

LLM이 Think-Aloud에서 자동으로 구체적인 액션을 생성한다.

```
✅ 액션 아이템
1. 회원가입 — 이메일 인증 단계에 한 줄 설명 추가
2. 약 추가 화면 — 주요 버튼 크기 48px 이상으로 확대
3. 알림 설정 — ON/OFF 토글에 텍스트 레이블 명시
```

---

## 구현 상세

### 프레임워크: Gradio (1순위) 또는 Streamlit

Gradio를 우선 선택하는 이유:
- 공유 링크 자동 생성 (`share=True`) — 데모 시 편리
- 코드 100줄 이내로 기본 대시보드 구현 가능
- 이미지(스크린샷) 표시 기본 지원

```python
import gradio as gr

def run_analysis(url, target_description):
    screens = web_analyzer.run(url)           # M1
    persona = persona_engine.run(target_description)  # M2
    simulation = simulation_engine.run(screens, persona)  # M3
    scores = scorer.run(simulation)           # M4
    return format_report(scores, simulation)

demo = gr.Interface(
    fn=run_analysis,
    inputs=[
        gr.Textbox(label="서비스 URL"),
        gr.Textbox(label="타겟 사용자 설명"),
    ],
    outputs=gr.HTML(label="분석 결과")
)
demo.launch(share=True)
```

### 개선 액션 아이템 자동 생성

```
프롬프트:
"아래 Think-Aloud 텍스트와 혼란 지수를 보고,
개발자가 바로 실행할 수 있는 UI 개선 액션을 3개 이내로 작성해.
구체적인 수치나 위치를 포함할 것."
```

---

## 사용 오픈소스

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| `gradio` | 대시보드 UI | pip install gradio |
| `Pillow` | 스크린샷 썸네일 처리 | |
| `pandas` | 버전 비교 테이블 | |

---

## 우리가 직접 구현하는 것

- 리포트 HTML 템플릿 (혼란 지수 색상 코딩, 순위 표시)
- 버전 비교 delta 시각화
- 개선 액션 LLM 프롬프트
- 공유 링크 생성 옵션

---

## 데이터 저장 구조

```
reports/
  {project_id}/
    v1/
      scores.json
      simulation.json
      screenshots/
    v2/
      ...
    comparison.json   ← 버전 간 delta
```
