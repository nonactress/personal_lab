# Persona Character Widget — Design Spec

**Date:** 2026-05-17  
**Scope:** `src/frontend/` (index.html, style.css, app.js 수정)  
**Goal:** 픽셀 아트 캐릭터가 화면 우측 하단에 플로팅으로 존재하며, 페르소나 입력/분석 상태/결과 위험도에 따라 외모·표정·애니메이션이 변한다.

---

## 1. 캐릭터 스펙

- **기술:** 인라인 SVG (`viewBox="0 0 44 52"`, `image-rendering:pixelated`)
- **크기:** 렌더 80×96px (CSS scale), viewBox 44×52px
- **색상 팔레트:**
  - 보라 계열 (기본): stroke `#8B5CF6`, fill `#A78BFA`
  - 초록 (ok): `#10B981` / `#6EE7B7`
  - 노랑 (warning): `#F59E0B` / `#FCD34D`
  - 빨강 (critical): `#EF4444` / `#FCA5A5`
  - 몸통 배경: `#293548`

---

## 2. 위치 & 컨테이너

```
position: fixed
bottom: 28px
right: 28px
z-index: 50
```

- 흰 배경 없음. 반투명 컨테이너 (`background: rgba(15,23,42,0.7)`, `backdrop-filter: blur(8px)`)
- 캐릭터 위 2줄: 페르소나 이름 태그 (소형 `font-mono text-xs`)
- 클릭 시 축소/확대 토글 (minimized → 아이콘만)

---

## 3. 화면별 상태

### 3-1. 입력 화면 (`screen === 'input'`)

| 상태 | 트리거 | 시각 효과 |
|------|--------|-----------|
| **idle** | 기본 | 위아래 부유 (translateY ±4px, 2s ease-in-out infinite) |
| **cursor-tracking** | mousemove 이벤트 | 눈동자가 마우스 방향으로 ±3px 이동 |
| **persona-50s** | `personaDesc` 에 "50대" 포함 | 흰머리 픽셀 레이어 추가, 눈 1px 작아짐 |
| **persona-20s** | `personaDesc` 에 "20대" 포함 | 기본 외모 유지 |
| **persona-busy** | "바쁜" 포함 | idle 상태에 땀방울 픽셀 추가 |
| **hover** | 캐릭터에 마우스 올림 | 좌우 흔들기 (wiggle: ±3deg, 0.3s) |

키워드 매칭 로직 (app.js):
```js
function getPersonaVariant(desc) {
  if (/50대|중년|장년/.test(desc)) return 'senior';
  if (/20대|대학생|청년/.test(desc)) return 'young';
  if (/바쁜|직장인|프리랜서/.test(desc)) return 'busy';
  return 'default';
}
```

### 3-2. 분석 화면 (`screen === 'progress'`)

상태 `thinking` ↔ `scanning` 을 1500ms 간격으로 교대:

| 상태 | 시각 효과 |
|------|-----------|
| **thinking** | 눈이 좌하단 응시, 오른손에 파일 문서 SVG, 말풍선 `?` 펄스 |
| **scanning** | 오른쪽 눈 반-깜빡임, 수평 스캔 라인 (translateY 위→아래 1s loop) |

- 마우스 트래킹 비활성화 (집중 모드)
- idle float 유지

### 3-3. 결과 화면 (`screen === 'result'`)

`result.risk_level` 값에 따라 즉시 전환:

| risk_level | 표정 | 추가 요소 |
|-----------|------|-----------|
| `ok` | 눈 호 모양 `^▽^`, 큰 미소, 볼 홍조 | 오른팔 엄지척 포즈 |
| `warning` | 찌푸린 눈썹, 일자 입 | 오른쪽 땀방울 픽셀 |
| `critical` | 눈물, 뒤집힌 눈썹, 찡그린 입 | 왼팔로 얼굴 가리기 (face-palm) |

전환 애니메이션: 0.4s fade (opacity 0→1) + 작은 바운스 (scale 0.8→1.05→1.0)

---

## 4. 인터랙션 상세

### 눈동자 마우스 추적
```js
document.addEventListener('mousemove', (e) => {
  if (screen !== 'input') return;
  const rect = characterEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
  const dist = 3; // px
  const ox = Math.cos(angle) * dist;
  const oy = Math.sin(angle) * dist;
  // SVG 눈동자 두 개의 transform 업데이트
});
```

눈동자는 `<rect>` 의 `x`/`y` 속성을 직접 수정 (SVG DOM API).

### Idle Float
```css
@keyframes persona-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
}
.persona-container { animation: persona-float 2s ease-in-out infinite; }
```

### Wiggle on Hover
```css
@keyframes persona-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(-3deg); }
  75%       { transform: rotate(3deg); }
}
.persona-container:hover { animation: persona-wiggle 0.3s ease-in-out 2, persona-float 2s ease-in-out infinite; }
```

### Thinking Toggle (분석 중)
```js
let thinkInterval;
function startThinking() {
  let t = true;
  thinkInterval = setInterval(() => {
    characterState = t ? 'thinking' : 'scanning';
    t = !t;
  }, 1500);
}
function stopThinking() { clearInterval(thinkInterval); }
```

---

## 5. SVG 컴포넌트 구조

모든 캐릭터 상태는 `app.js` 안에 SVG 문자열 상수로 정의:

```js
const PERSONA_SVGS = {
  default:   `<svg ...>...</svg>`,
  senior:    `<svg ...>...</svg>`,  // 흰머리 레이어 추가
  busy:      `<svg ...>...</svg>`,  // 땀방울 추가
  thinking:  `<svg ...>...</svg>`,
  scanning:  `<svg ...>...</svg>`,
  ok:        `<svg ...>...</svg>`,
  warning:   `<svg ...>...</svg>`,
  critical:  `<svg ...>...</svg>`,
};
```

Alpine.js의 `x-html` 로 컨테이너에 주입:
```html
<div class="persona-svg-wrap" x-html="currentPersonaSvg"></div>
```

`currentPersonaSvg` 는 Alpine computed getter로 현재 screen + variant + result.risk_level 조합에서 결정.

---

## 6. 파일 변경 범위

| 파일 | 변경 |
|------|------|
| `src/frontend/index.html` | persona 컨테이너 div 추가 (fixed 포지션) |
| `src/frontend/style.css` | persona 애니메이션 키프레임, 컨테이너 스타일 |
| `src/frontend/app.js` | SVG 상수 객체, mousemove 핸들러, thinking 인터벌, currentPersonaSvg getter, getPersonaVariant() |

신규 파일 없음. 백엔드 변경 없음.

---

## 7. 미포함 (별도 이슈)

- 모바일 대응 (플로팅 오버레이는 데스크탑 전용)
- 캐릭터 클릭 시 말풍선 팝업 (think-aloud 미리보기)
- 캐릭터 커스터마이징 (색상 테마 변경)
