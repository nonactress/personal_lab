# Persona Character Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 픽셀 아트 캐릭터를 우측 하단 플로팅 오버레이로 추가 — 페르소나 입력/분석/결과 단계에 따라 표정·외모·애니메이션이 변하고, 마우스를 눈으로 추적한다.

**Architecture:** `PERSONA_SVGS` 상수 객체(8개 SVG 문자열)를 app.js 상단에 정의하고, Alpine.data의 getter `currentPersonaSvg`가 screen + variant + risk_level 조합으로 올바른 SVG를 선택해 `x-html`로 주입한다. 눈동자 추적은 Alpine `init()`에 등록한 `mousemove` 핸들러가 `.pupil-l/.pupil-r` rect 요소의 `style.transform`을 직접 조작한다.

**Tech Stack:** Alpine.js 3.14 (x-html, x-watch, init hook), 인라인 SVG, CSS keyframe animations, Vanilla JS DOM API

---

## File Structure

- Modify: `src/frontend/app.js` — PERSONA_SVGS 상수, Alpine 상태 확장, 메서드 추가
- Modify: `src/frontend/style.css` — 애니메이션 키프레임, 컨테이너 스타일
- Modify: `src/frontend/index.html` — persona 플로팅 컨테이너 div 추가

---

### Task 1: PERSONA_SVGS 상수 정의

**Files:**
- Modify: `src/frontend/app.js` — 파일 맨 위(1번 줄 앞)에 삽입

- [ ] **Step 1: app.js 맨 위에 PERSONA_SVGS 객체 추가**

`src/frontend/app.js` 파일의 첫 번째 줄 `document.addEventListener(...)` 바로 위에 아래 코드를 삽입한다.

```js
const PERSONA_SVGS = {
  default: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#A78BFA"/>
    <rect x="26" y="10" width="6" height="6" fill="#A78BFA"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="18" y="25" width="8" height="3" fill="#A78BFA"/>
    <rect x="26" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
  </svg>`,

  senior: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1.5"/>
    <rect x="8" y="2" width="28" height="4" fill="#94A3B8"/>
    <rect x="6" y="4" width="4" height="4" fill="#94A3B8"/>
    <rect x="34" y="4" width="4" height="4" fill="#94A3B8"/>
    <rect x="12" y="11" width="6" height="5" fill="#A78BFA"/>
    <rect x="26" y="11" width="6" height="5" fill="#A78BFA"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="10" y="9" width="4" height="1" fill="#64748B" opacity="0.5"/>
    <rect x="30" y="9" width="4" height="1" fill="#64748B" opacity="0.5"/>
    <rect x="14" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="18" y="25" width="8" height="3" fill="#A78BFA"/>
    <rect x="26" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
  </svg>`,

  busy: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#A78BFA"/>
    <rect x="26" y="10" width="6" height="6" fill="#A78BFA"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="18" y="25" width="8" height="3" fill="#A78BFA"/>
    <rect x="26" y="22" width="4" height="3" fill="#A78BFA"/>
    <rect x="34" y="8" width="4" height="6" rx="2" fill="#60A5FA" opacity="0.7"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
  </svg>`,

  thinking: `<svg width="80" height="96" viewBox="0 0 62 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="6" fill="#A78BFA"/>
    <rect x="26" y="12" width="6" height="6" fill="#A78BFA"/>
    <rect x="12" y="14" width="3" height="3" fill="#0F172A"/>
    <rect x="26" y="14" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#7C3AED"/>
    <rect x="18" y="24" width="4" height="3" fill="#7C3AED"/>
    <rect x="22" y="22" width="4" height="3" fill="#7C3AED"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="36" y="28" width="14" height="18" rx="1" fill="#1E3A5F" stroke="#3B82F6" stroke-width="1"/>
    <rect x="38" y="31" width="10" height="2" fill="#3B82F6" opacity="0.6"/>
    <rect x="38" y="35" width="8" height="2" fill="#3B82F6" opacity="0.4"/>
    <rect x="38" y="39" width="9" height="2" fill="#3B82F6" opacity="0.4"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <circle cx="47" cy="11" r="4" fill="#1E293B" stroke="#A78BFA" stroke-width="1"/>
    <text x="45" y="14" font-size="5" fill="#A78BFA" font-family="monospace">?</text>
    <circle cx="43" cy="20" r="2" fill="#A78BFA" opacity="0.4"/>
    <circle cx="45" cy="16" r="1.5" fill="#A78BFA" opacity="0.25"/>
  </svg>`,

  scanning: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#A78BFA"/>
    <rect x="26" y="13" width="6" height="3" fill="#A78BFA"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#7C3AED"/>
    <rect x="18" y="24" width="4" height="3" fill="#7C3AED"/>
    <rect x="22" y="22" width="4" height="3" fill="#7C3AED"/>
    <rect class="scan-line" x="6" y="2" width="32" height="2" fill="#3B82F6" opacity="0.35"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#8B5CF6" stroke-width="1"/>
  </svg>`,

  ok: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#10B981" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="3" fill="#6EE7B7"/>
    <rect x="12" y="10" width="6" height="2" fill="#293548"/>
    <rect x="26" y="12" width="6" height="3" fill="#6EE7B7"/>
    <rect x="26" y="10" width="6" height="2" fill="#293548"/>
    <rect x="14" y="21" width="4" height="3" fill="#6EE7B7"/>
    <rect x="18" y="23" width="8" height="3" fill="#6EE7B7"/>
    <rect x="26" y="21" width="4" height="3" fill="#6EE7B7"/>
    <rect x="10" y="18" width="4" height="2" fill="#F0ABFC" opacity="0.5"/>
    <rect x="30" y="18" width="4" height="2" fill="#F0ABFC" opacity="0.5"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#10B981" stroke-width="1"/>
    <rect x="34" y="30" width="6" height="10" rx="1" fill="#293548" stroke="#10B981" stroke-width="1"/>
    <rect x="34" y="26" width="6" height="6" rx="1" fill="#293548" stroke="#10B981" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#10B981" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#10B981" stroke-width="1"/>
  </svg>`,

  warning: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#F59E0B" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#FCD34D"/>
    <rect x="26" y="10" width="6" height="6" fill="#FCD34D"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="12" y="7" width="6" height="2" fill="#F59E0B"/>
    <rect x="26" y="7" width="6" height="2" fill="#F59E0B"/>
    <rect x="16" y="23" width="12" height="3" fill="#FCD34D"/>
    <rect x="14" y="22" width="4" height="2" fill="#FCD34D"/>
    <rect x="26" y="22" width="4" height="2" fill="#FCD34D"/>
    <rect x="34" y="8" width="4" height="6" rx="2" fill="#60A5FA" opacity="0.7"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#F59E0B" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#F59E0B" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#F59E0B" stroke-width="1"/>
  </svg>`,

  critical: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#293548" stroke="#EF4444" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="6" fill="#FCA5A5"/>
    <rect x="26" y="12" width="6" height="6" fill="#FCA5A5"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="12" y="8" width="3" height="2" fill="#EF4444"/>
    <rect x="15" y="7" width="3" height="2" fill="#EF4444"/>
    <rect x="29" y="7" width="3" height="2" fill="#EF4444"/>
    <rect x="32" y="8" width="3" height="2" fill="#EF4444"/>
    <rect x="16" y="24" width="4" height="2" fill="#FCA5A5"/>
    <rect x="20" y="23" width="4" height="2" fill="#FCA5A5"/>
    <rect x="24" y="24" width="4" height="2" fill="#FCA5A5"/>
    <rect x="12" y="18" width="2" height="6" rx="1" fill="#60A5FA" opacity="0.8"/>
    <rect x="30" y="18" width="2" height="6" rx="1" fill="#60A5FA" opacity="0.8"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#293548" stroke="#EF4444" stroke-width="1"/>
    <rect x="34" y="26" width="6" height="14" rx="1" fill="#293548" stroke="#EF4444" stroke-width="1"/>
    <rect x="34" y="24" width="8" height="6" rx="2" fill="#293548" stroke="#EF4444" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#EF4444" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#293548" stroke="#EF4444" stroke-width="1"/>
  </svg>`,
};
```

- [ ] **Step 2: 브라우저 열어 콘솔 오류 없는지 확인**

`http://localhost:8000` 접속 → F12 콘솔에 오류 없으면 통과.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(widget): add PERSONA_SVGS constant — 8 pixel art character states"
```

---

### Task 2: CSS 애니메이션 & 컨테이너 스타일

**Files:**
- Modify: `src/frontend/style.css` — 파일 맨 끝에 추가

- [ ] **Step 1: style.css 맨 끝에 persona 스타일 블록 추가**

```css
/* ── Persona Widget ──────────────────────── */
@keyframes persona-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-5px); }
}

@keyframes persona-wiggle {
  0%, 100% { transform: translateY(var(--float-y, 0px)) rotate(0deg); }
  25%       { transform: translateY(var(--float-y, 0px)) rotate(-4deg); }
  75%       { transform: translateY(var(--float-y, 0px)) rotate(4deg); }
}

@keyframes persona-appear {
  0%   { opacity: 0; transform: scale(0.75); }
  70%  { transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes scan-line-move {
  0%   { transform: translateY(0px); opacity: 0.4; }
  50%  { opacity: 0.7; }
  100% { transform: translateY(26px); opacity: 0; }
}

.persona-wrap {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  animation: persona-float 2s ease-in-out infinite;
}

.persona-wrap:hover {
  animation: persona-wiggle 0.35s ease-in-out 2,
             persona-float 2s ease-in-out infinite 0.7s;
}

.persona-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: #475569;
  letter-spacing: 0.04em;
  text-align: center;
  max-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(15, 23, 42, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.persona-svg-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  transition: border-color 0.3s;
}

.persona-svg-wrap svg {
  animation: persona-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  display: block;
}

.persona-svg-wrap .scan-line {
  animation: scan-line-move 1s ease-in-out infinite;
}

.persona-minimized-btn {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 50;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.15);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.persona-minimized-btn:hover {
  background: rgba(30, 41, 59, 0.9);
}
```

- [ ] **Step 2: 수동 검증**

`http://localhost:8000` 새로고침 → 우측 하단에 캐릭터 컨테이너 영역이 보여야 함 (아직 HTML 없으므로 스타일만 확인).

- [ ] **Step 3: Commit**

```bash
git add src/frontend/style.css
git commit -m "feat(widget): add persona widget CSS — float, appear, scan-line animations"
```

---

### Task 3: Alpine 상태·메서드·getter 확장

**Files:**
- Modify: `src/frontend/app.js` — Alpine.data 객체 내부에 추가

- [ ] **Step 1: Alpine 상태 프로퍼티 추가**

`app.js`의 `Alpine.data('personaApp', () => ({` 블록 안, `screen: 'input',` 바로 아래에 추가:

```js
    characterState: 'idle',
    personaVariant: 'default',
    personaMinimized: false,
    _thinkInterval: null,
```

- [ ] **Step 2: `init()` 메서드 추가**

`steps: [...]` 배열 정의 바로 아래, `handleFiles(e)` 앞에 추가:

```js
    init() {
      this.$watch('personaDesc', (val) => {
        if (this.screen === 'input') {
          this.personaVariant = this.getPersonaVariant(val);
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (this.screen !== 'input') return;
        const wrap = this.$el.querySelector('.persona-svg-wrap');
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const dist = 2.5;
        const ox = +(Math.cos(angle) * dist).toFixed(1);
        const oy = +(Math.sin(angle) * dist).toFixed(1);
        wrap.querySelectorAll('.pupil-l, .pupil-r').forEach(p => {
          p.style.transform = `translate(${ox}px, ${oy}px)`;
        });
      });
    },
```

- [ ] **Step 3: `getPersonaVariant()`, `startThinking()`, `stopThinking()` 추가**

`removeFile(i)` 메서드 바로 뒤에 추가:

```js
    getPersonaVariant(desc) {
      if (/50대|중년|장년/.test(desc)) return 'senior';
      if (/바쁜|직장인|프리랜서/.test(desc)) return 'busy';
      return 'default';
    },

    startThinking() {
      this.characterState = 'thinking';
      this._thinkInterval = setInterval(() => {
        this.characterState = this.characterState === 'thinking' ? 'scanning' : 'thinking';
      }, 1500);
    },

    stopThinking() {
      clearInterval(this._thinkInterval);
      this._thinkInterval = null;
    },
```

- [ ] **Step 4: `currentPersonaSvg`, `personaLabel` getter 추가**

`riskConfig` getter 바로 앞에 추가:

```js
    get currentPersonaSvg() {
      if (this.screen === 'result' && this.result) {
        return PERSONA_SVGS[this.result.risk_level] || PERSONA_SVGS.default;
      }
      if (this.screen === 'progress') {
        return PERSONA_SVGS[this.characterState] || PERSONA_SVGS.thinking;
      }
      return PERSONA_SVGS[this.personaVariant] || PERSONA_SVGS.default;
    },

    get personaLabel() {
      if (this.screen === 'progress') return '분석 중...';
      if (this.screen === 'result' && this.result) {
        return this.result.risk_label || '분석 완료';
      }
      if (!this.personaDesc.trim()) return '페르소나 대기 중';
      return this.personaDesc.trim().split(/\s+/).slice(0, 4).join(' ');
    },
```

- [ ] **Step 5: 브라우저 콘솔에서 getter 동작 확인**

`http://localhost:8000` → F12 콘솔에서 실행:
```js
document.querySelector('[x-data]').__x.$data.currentPersonaSvg.slice(0, 30)
```
Expected: `"<svg width="80" height="96" vi..."`

- [ ] **Step 6: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(widget): add Alpine state, init(), getters, thinking interval"
```

---

### Task 4: analyze() / reset() 연결

**Files:**
- Modify: `src/frontend/app.js` — 기존 `analyze()` 와 `reset()` 수정

- [ ] **Step 1: `analyze()` 시작 부분에 캐릭터 상태 설정 추가**

기존 `analyze()` 내부에서 `this.screen = 'progress';` 바로 위에 추가:

```js
      this.personaVariant = this.getPersonaVariant(this.personaDesc);
```

그리고 `this.screen = 'progress';` 바로 아래에 추가:

```js
      this.startThinking();
```

- [ ] **Step 2: 성공 분기에 `stopThinking()` 추가**

`this.result = await response.json();` 바로 위에 추가:

```js
        this.stopThinking();
```

- [ ] **Step 3: 오류 분기에 `stopThinking()` 추가**

`catch (err) {` 블록 맨 첫 줄에 추가:

```js
        this.stopThinking();
```

수정 후 `analyze()` 전체 구조 확인:

```js
    async analyze() {
      if (!this.files.length) {
        this.error = '파일을 업로드해주세요.';
        return;
      }
      this.error = '';
      this.personaVariant = this.getPersonaVariant(this.personaDesc); // ← 추가
      this.screen = 'progress';
      this.startThinking();                                             // ← 추가
      this.statusStep = 1;

      await sleep(800);
      this.statusStep = 2;
      await sleep(600);
      this.statusStep = 3;

      try {
        const formData = new FormData();
        formData.append('persona_desc', this.personaDesc.trim() || '20대 대학생');
        for (const file of this.files) {
          formData.append('files', file);
        }

        const response = await fetch('/analyze', {
          method: 'POST',
          body: formData,
        });

        this.statusStep = 4;
        await sleep(300);

        if (!response.ok) {
          throw new Error('backend');
        }

        this.stopThinking();                                            // ← 추가
        this.result = await response.json();
        this.detailOpen = false;
        this.screen = 'result';

      } catch (err) {
        this.stopThinking();                                            // ← 추가
        this.screen = 'input';
        this.error = err.message === 'backend'
          ? '⚠️ 분석 중 오류가 발생했어요. 파일 형식을 확인하거나 잠시 후 다시 시도해주세요.'
          : '⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)';
      }
    },
```

- [ ] **Step 4: `reset()` 에 정리 로직 추가**

기존 `reset()` 을 아래로 교체:

```js
    reset() {
      this.stopThinking();
      this.characterState = 'idle';
      this.personaVariant = 'default';
      this.screen = 'input';
      this.result = null;
      this.files = [];
      this.error = '';
      this.personaDesc = '';
    },
```

- [ ] **Step 5: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(widget): wire character state to analyze/reset lifecycle"
```

---

### Task 5: HTML 플로팅 컨테이너 추가

**Files:**
- Modify: `src/frontend/index.html` — `</body>` 바로 위에 삽입

- [ ] **Step 1: persona 플로팅 div 추가**

`src/frontend/index.html` 의 `</body>` 바로 위에 삽입:

```html
  <!-- ═══════════════════════════════════════ PERSONA WIDGET -->
  <div class="persona-wrap"
       x-show="!personaMinimized"
       x-transition:leave="transition ease-in duration-150"
       x-transition:leave-start="opacity-100 scale-100"
       x-transition:leave-end="opacity-0 scale-75"
       @click="personaMinimized = true"
       title="클릭하여 숨기기">
    <div class="persona-label" x-text="personaLabel"></div>
    <div class="persona-svg-wrap" x-html="currentPersonaSvg"></div>
  </div>

  <button class="persona-minimized-btn"
          x-show="personaMinimized"
          x-transition:enter="transition ease-out duration-150"
          x-transition:enter-start="opacity-0 scale-75"
          x-transition:enter-end="opacity-100 scale-100"
          @click="personaMinimized = false"
          title="캐릭터 보기">
    🎭
  </button>
```

- [ ] **Step 2: 수동 검증 — 입력 화면**

1. `http://localhost:8000` 접속
2. 우측 하단에 픽셀 캐릭터 보임 ✓
3. 마우스 화면 좌우로 움직임 → 눈동자 따라옴 ✓
4. 페르소나 입력란에 "50대 직장인" 입력 → 캐릭터 흰머리로 변경 ✓
5. "바쁜 프리랜서" 입력 → 땀방울 표시 ✓
6. 캐릭터 클릭 → 숨김 (🎭 버튼 표시) ✓
7. 🎭 버튼 클릭 → 캐릭터 다시 보임 ✓

- [ ] **Step 3: 수동 검증 — 분석 화면**

1. 파일 업로드 후 "UX 분석 시작" 클릭
2. 로딩 화면에서 캐릭터가 파일 들고 고민하는 포즈로 전환 ✓
3. 1.5초마다 thinking ↔ scanning 포즈 교대 ✓
4. scanning 포즈에서 스캔 라인 애니메이션 보임 ✓

- [ ] **Step 4: 수동 검증 — 결과 화면**

1. 분석 완료 후 결과 화면
2. `risk_level: 'critical'` → 눈물 캐릭터 + 빨간 border ✓
3. `risk_level: 'warning'` → 걱정 캐릭터 + 노란 border ✓
4. `risk_level: 'ok'` → 웃는 캐릭터 + 초록 border ✓
5. 캐릭터 등장 시 바운스 애니메이션 ✓
6. "새로운 분석 시작" 클릭 → 기본 캐릭터로 복귀 ✓

- [ ] **Step 5: Commit**

```bash
git add src/frontend/index.html
git commit -m "feat(widget): add persona floating overlay HTML — pixel art character widget complete"
```

---

## Self-Review

**Spec 커버리지:**
- idle float 애니메이션 → Task 2 CSS ✓
- 마우스 눈동자 추적 → Task 3 init() ✓
- 페르소나 키워드 변형 (50대/바쁜) → Task 3 getPersonaVariant() + $watch ✓
- thinking ↔ scanning 교대 → Task 3 startThinking() + Task 4 ✓
- 결과 risk_level 표정 → Task 3 currentPersonaSvg getter ✓
- 상태 전환 바운스 애니메이션 → Task 2 persona-appear keyframe ✓
- 클릭 최소화/복원 → Task 5 HTML ✓
- 캐릭터 hover wiggle → Task 2 CSS ✓

**플레이스홀더:** 없음 ✓

**타입 일관성:**
- `PERSONA_SVGS` 키: `default, senior, busy, thinking, scanning, ok, warning, critical`
- `currentPersonaSvg` getter에서 접근하는 키: `result.risk_level` (`ok/warning/critical`) + `characterState` (`thinking/scanning`) + `personaVariant` (`default/senior/busy`) → 모두 일치 ✓
- `startThinking()` / `stopThinking()` 이름 → Task 3, 4 모두 일치 ✓
- `.pupil-l` / `.pupil-r` 클래스 → Task 1 SVG + Task 3 querySelector 일치 ✓
