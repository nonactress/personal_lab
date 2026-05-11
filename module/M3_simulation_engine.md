# M3 — Simulation Engine

## 목적

M1의 UI 구조 데이터와 M2의 행동 파라미터를 결합해서
타겟 사용자가 실제로 서비스를 탐색하는 과정을 시뮬레이션한다.

출력은 **Think-Aloud 텍스트** — "이 버튼이 뭔지 모르겠는데... 그냥 눌러볼까?"
형태의 내부 독백으로, 혼란이 발생한 지점과 이유를 드러낸다.

---

## 입출력

| | 내용 |
|--|------|
| **Input** | `List[ScreenData]` (M1) + `PersonaParams` (M2) + 수행할 태스크 |
| **Output** | 화면별 Think-Aloud 텍스트 + 혼란 이벤트 목록 |

---

## 구현 상세

### 전략: UXAgent 오픈소스 포크

UXAgent (arXiv 2504.09407)는 LLM 기반 UX 시뮬레이션 프레임워크다.
이를 그대로 쓰지 않고, **행동 파라미터 주입 레이어**를 추가해서 포크한다.

UXAgent 기본 흐름:
```
화면 스크린샷 → LLM → "다음에 뭘 클릭할지" 결정 → 반복
```

우리가 추가하는 것:
```
화면 스크린샷 + PersonaParams → 파라미터 기반 프롬프트 생성
→ LLM → Think-Aloud + 혼란 판단 → 반복
```

### Step 1 — 파라미터 기반 동적 프롬프트 생성

PersonaParams를 자연어 컨텍스트로 변환해서 시스템 프롬프트에 주입한다.

```python
def build_persona_prompt(params: PersonaParams) -> str:
    return f"""
당신은 지금 처음 보는 앱을 사용하는 사람입니다.

특성:
- 디지털 기기 이해도: {'낮음' if params['digital_literacy'] < 0.4 else '보통'}
- 인내심: {'쉽게 포기함' if params['patience_threshold'] < 0.4 else '보통'}
- 빨리빨리 성향: {'강함' if params['korean_context']['bballi_bballi'] > 0.6 else '보통'}

각 화면에서:
1. 지금 무엇을 해야 할지 이해했는가?
2. 어떤 요소가 혼란스러운가?
3. 지금 어떤 생각을 하고 있는가? (내부 독백 형식으로)
4. 계속 진행할 것인가, 이탈할 것인가?
    """
```

### Step 2 — Think-Aloud 생성 (Chain-of-Thought)

화면별로 LLM이 페르소나 입장에서 내부 독백을 생성한다.

```
출력 형식:
{
  "screen_id": "screen_01",
  "think_aloud": "이메일을 넣으라고 하는데... 인증은 뭐지? 그냥 넘어가면 안 되나?",
  "action_taken": "다음 버튼 클릭",
  "confusion_triggered": true,
  "confusion_reason": "이메일 인증 필요 여부 불명확"
}
```

### Step 3 — 이탈 판단 로직

인내심 파라미터(`patience_threshold`)를 소진하는 방식으로 이탈을 결정한다.

```python
patience = params["patience_threshold"]  # 예: 0.3

for screen in screens:
    confusion_level = scorer.get_confusion(think_aloud)
    patience -= confusion_level * 0.1

    if patience <= 0:
        return SimulationResult(status="abandoned", at_screen=screen.id)
```

---

## 사용 오픈소스

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| **UXAgent** (포크) | 기본 시뮬레이션 프레임워크 | arXiv 2504.09407, GitHub 오픈소스 |
| `Qwen2.5` / `GPT-4o` | Think-Aloud 생성 LLM | |
| `LangChain` | 멀티턴 프롬프트 관리 | |

---

## 우리가 직접 구현하는 것

- 파라미터 → 자연어 컨텍스트 변환 함수
- 인내심 소진 기반 이탈 판단 로직
- 한국어 Think-Aloud 프롬프트 템플릿
- UXAgent 포크 — 파라미터 주입 레이어

---

## 다음 모듈로 넘기는 데이터

```python
SimulationResult = {
    "task_completed": False,
    "abandoned_at": "screen_02",
    "screens": [
        {
            "screen_id": "screen_01",
            "think_aloud": "...",
            "confusion_triggered": True,
            "confusion_reason": "..."
        },
        ...
    ]
}
```
