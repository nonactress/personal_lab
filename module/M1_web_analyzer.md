# M1 — Web Analyzer

## 목적

URL을 받아 서비스의 UI 구조를 자동으로 파악한다.
이후 모듈(M2~M4)이 "어떤 화면에 무엇이 있는가"를 알 수 있도록 구조화된 데이터를 넘긴다.

---

## 입출력

| | 내용 |
|--|------|
| **Input** | 서비스 URL, 탐색할 태스크 설명 (예: "회원가입 후 약 추가하기") |
| **Output** | 화면별 스크린샷 + UI 요소 맵 (버튼, 입력창, 텍스트 위치 등) |

---

## 구현 상세

### Step 1 — 자동 탐색 및 스크린샷 (Playwright)

- Playwright로 URL 접속 후 주요 화면을 순서대로 탐색
- 각 화면에서 전체 스크린샷 저장
- 클릭 가능한 요소(버튼, 링크, 입력창) 좌표 및 텍스트 추출

```python
# 핵심 흐름
browser = playwright.chromium.launch()
page = browser.new_page()
page.goto(url)
screenshot = page.screenshot(full_page=True)
elements = page.query_selector_all("button, input, a, [role='button']")
```

### Step 2 — UI 의미 분석 (Vision 모델)

- 스크린샷을 Qwen-VL 또는 GPT-4o Vision에 전달
- 각 화면의 목적, 주요 액션, 잠재적 혼란 요소를 자연어로 추출

```
프롬프트 구조:
"이 화면의 목적은 무엇인가?
 사용자가 취해야 할 주요 액션은 무엇인가?
 처음 보는 사용자가 헷갈릴 수 있는 요소는 무엇인가?"
```

### Step 3 — 구조화 출력

```json
{
  "screen_id": "screen_01",
  "url_path": "/signup",
  "screenshot_path": "screenshots/screen_01.png",
  "purpose": "회원가입 — 이메일과 비밀번호 입력",
  "interactive_elements": [
    {"type": "input", "label": "이메일", "position": [120, 340]},
    {"type": "button", "label": "다음", "position": [180, 520]}
  ],
  "potential_confusion": ["이메일 인증 필요 여부가 명시되지 않음"]
}
```

---

## 사용 오픈소스

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| `playwright` | 브라우저 자동화, 스크린샷 | pip install playwright |
| `Qwen-VL` or `GPT-4o Vision` | 화면 의미 분석 | API 또는 로컬 추론 |

---

## 우리가 직접 구현하는 것

- 탐색 전략 (어떤 순서로 화면을 탐색할지)
- Vision 프롬프트 템플릿
- 출력 JSON 스키마 정의

---

## 다음 모듈로 넘기는 데이터

`List[ScreenData]` — 화면별 스크린샷 경로 + UI 요소 맵 + 잠재 혼란 요소
