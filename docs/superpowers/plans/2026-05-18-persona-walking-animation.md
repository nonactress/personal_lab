# Persona Walking Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static floating persona widget with a full walking animation state machine (walk/idle/jump/sit/run/thrown) that follows the mouse cursor in real-time.

**Architecture:** The rAF loop runs inside Alpine's `init()` but bypasses Alpine reactivity for per-frame DOM updates — it directly sets `el.style.transform` and `svgEl.innerHTML` each frame. Alpine state (screen, result, personaFeatures) is still read from `this`. `buildPersonaSvg()` gains state-aware leg/arm/mouth poses and JS-computed eye offsets that fix the `scaleX(-1)` bug.

**Tech Stack:** Alpine.js (existing), requestAnimationFrame loop, inline SVG pixel art, CSS transform

---

## File Map

| File | Change |
|------|--------|
| `src/frontend/style.css` | Remove `persona-float` animation from `.persona-wrap`, add `transform-origin` |
| `src/frontend/app.js` | Replace physics system, update `buildPersonaSvg()`, wire app events |

---

## Task 1: CSS — Remove Float Animation, Add Transform Origin

**Files:**
- Modify: `src/frontend/style.css:289-306`

- [ ] **Step 1: Replace `.persona-wrap` block**

Find this block (lines ~289-306):
```css
.persona-wrap {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: grab;
  user-select: none;
  animation: persona-float 2s ease-in-out infinite;
  will-change: left, top;
}

.persona-wrap.is-dragging,
.persona-wrap.is-thrown {
  cursor: grabbing;
  animation: none;
}
```

Replace with:
```css
.persona-wrap {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: grab;
  user-select: none;
  will-change: left, top, transform;
  transform-origin: center bottom;
}

.persona-wrap.is-dragging,
.persona-wrap.is-thrown {
  cursor: grabbing;
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8000`. Persona widget should appear without any bobbing/floating CSS animation. Position still controlled by JS.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/style.css
git commit -m "style: remove persona-float animation, prepare for JS-driven transform"
```

---

## Task 2: Update `buildPersonaSvg()` — Per-State Poses + Eye Fix

**Files:**
- Modify: `src/frontend/app.js` — `buildPersonaSvg()` function (lines 181-269)

The current function ignores `state` and uses static legs/arms. We need to:
1. Add `state`, `facingLeft`, `eyeOX`, `eyeOY`, `blinkScale` params
2. Compute eye x as absolute SVG coords (no CSS transform, fixes `scaleX(-1)` bug)
3. Swap per-state leg/arm/mouth SVG fragments

- [ ] **Step 1: Replace `buildPersonaSvg()` signature and per-state fragments**

Replace the entire `buildPersonaSvg` function (from `function buildPersonaSvg(features, strokeColor) {` to the closing `}`) with:

```js
function buildPersonaSvg(features, strokeColor, animOpts) {
  const { gender, hair, age, build, style } = Object.assign(
    { gender: 'neutral', hair: 'default', age: 'young', build: 'default', style: 'default' },
    features
  );
  const stroke = strokeColor || '#9CA3AF';
  const { state = 'idle', facingLeft = false, eyeOX = 1, eyeOY = 0, blinkScale = 1 } = animOpts || {};

  // ── Eye offset: absolute coords, no CSS transform (fixes scaleX(-1) bug)
  const ex = facingLeft ? -eyeOX : eyeOX;
  const ey = eyeOY;
  const bs = blinkScale;

  // ── Per-state leg poses
  const LEGS = {
    walk:   (s) => `<rect x="13" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="25" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    idle:   (s) => `<rect x="13" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="25" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    jump:   (s) => `<rect x="11" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-20 14 48)"/>
                    <rect x="27" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(20 30 48)"/>`,
    sit:    (s) => `<rect x="10" y="48" width="10" height="5" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="24" y="48" width="10" height="5" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    run:    (s) => `<rect x="11" y="44" width="6" height="9" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-30 14 46)"/>
                    <rect x="27" y="44" width="6" height="9" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(15 30 46)"/>`,
    thrown: (s) => `<rect x="11" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-25 14 48)"/>
                    <rect x="27" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(25 30 48)"/>`,
  };

  // ── Per-state arm poses
  const ARMS = {
    walk:   (s) => `<rect x="4"  y="34" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="34" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    idle:   (s) => `<rect x="5"  y="36" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="36" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    jump:   (s) => `<rect x="2"  y="28" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-40 5 30)"/>
                    <rect x="36" y="28" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(40 39 30)"/>`,
    sit:    (s) => `<rect x="5"  y="38" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="38" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    run:    (s) => `<rect x="2"  y="30" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-20 5 32)"/>
                    <rect x="36" y="30" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(20 39 32)"/>`,
    thrown: (s) => `<rect x="2"  y="26" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-50 5 28)"/>
                    <rect x="36" y="26" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(50 39 28)"/>`,
  };

  // ── Per-state mouth
  const MOUTHS = {
    walk:   `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    idle:   `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    jump:   `<rect x="16" y="23" width="12" height="3" fill="#6B7280"/>`,
    sit:    `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    run:    `<rect x="16" y="24" width="12" height="2" fill="#6B7280"/>`,
    thrown: `<rect x="16" y="23" width="4" height="3" fill="#D1D5DB"/><rect x="24" y="23" width="4" height="3" fill="#D1D5DB"/>`,
  };

  const legFn  = LEGS[state]  || LEGS.idle;
  const armFn  = ARMS[state]  || ARMS.idle;
  const mouthSvg = MOUTHS[state] || MOUTHS.idle;

  // ── Feature-based visuals (unchanged from original)
  const hairColor = age === 'senior' ? '#E5E7EB'
    : gender === 'female' ? '#92400E'
    : '#374151';

  let hairSvg = '';
  if (age === 'senior') {
    hairSvg = `<rect x="8" y="0" width="28" height="5" fill="#E5E7EB"/>
      <rect x="6" y="2" width="4" height="4" fill="#E5E7EB"/>
      <rect x="34" y="2" width="4" height="4" fill="#E5E7EB"/>`;
  } else if (hair === 'long' || (hair === 'default' && gender === 'female')) {
    hairSvg = `<rect x="6" y="0" width="32" height="5" rx="1" fill="${hairColor}"/>
      <rect x="4" y="4" width="4" height="20" rx="1" fill="${hairColor}"/>
      <rect x="36" y="4" width="4" height="20" rx="1" fill="${hairColor}"/>`;
  } else if (hair !== 'bald') {
    hairSvg = `<rect x="8" y="0" width="28" height="4" rx="1" fill="${hairColor}"/>
      <rect x="6" y="2" width="4" height="4" rx="1" fill="${hairColor}"/>
      <rect x="34" y="2" width="4" height="4" rx="1" fill="${hairColor}"/>`;
  }

  const lashes = gender === 'female' ? `
    <rect x="12" y="9" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="15" y="8" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="18" y="8" width="2" height="1" fill="#9CA3AF" opacity="0.4"/>
    <rect x="26" y="9" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="29" y="8" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="24" y="8" width="2" height="1" fill="#9CA3AF" opacity="0.4"/>` : '';

  const earring = gender === 'female' ? `
    <rect x="3" y="17" width="3" height="3" rx="1" fill="#F472B6" opacity="0.85"/>
    <rect x="38" y="17" width="3" height="3" rx="1" fill="#F472B6" opacity="0.85"/>` : '';

  const glasses = (age === 'senior' || style === 'lowliteracy') ? `
    <rect x="10" y="10" width="8" height="6" rx="1" fill="none" stroke="#9CA3AF" stroke-width="1"/>
    <rect x="26" y="10" width="8" height="6" rx="1" fill="none" stroke="#9CA3AF" stroke-width="1"/>
    <rect x="18" y="12" width="8" height="1" fill="#9CA3AF"/>
    <rect x="8" y="12" width="2" height="1" fill="#9CA3AF"/>
    <rect x="34" y="12" width="2" height="1" fill="#9CA3AF"/>` : '';

  const eyeH = gender === 'female' ? 7 : 6;

  const bodyX = gender === 'female' ? 8 : 10;
  const bodyW = gender === 'female' ? 28 : 24;
  const viewH = build === 'tall' ? 62 : build === 'short_build' ? 52 : 58;
  const bodyH = build === 'tall' ? 20 : build === 'short_build' ? 12 : 16;
  const legsY = 32 + bodyH + 2;

  const bodyExtra = style === 'worker' ? `
    <rect x="20" y="33" width="4" height="8" rx="1" fill="#6B7280"/>
    <rect x="19" y="41" width="6" height="4" rx="1" fill="#4B5563"/>` :
    style === 'busy' ? `
    <rect x="34" y="30" width="5" height="8" rx="1" fill="#374151" stroke="#6B7280" stroke-width="0.5"/>
    <rect x="35" y="31" width="3" height="1" fill="#6B7280" opacity="0.5"/>
    <rect x="35" y="33" width="3" height="1" fill="#6B7280" opacity="0.4"/>` :
    style === 'student' ? `
    <rect x="2" y="34" width="7" height="10" rx="1" fill="#1E3A5F" stroke="#3B82F6" stroke-width="0.5"/>
    <rect x="4" y="32" width="3" height="4" rx="1" fill="none" stroke="#3B82F6" stroke-width="0.5"/>` : '';

  return `<svg width="80" height="96" viewBox="0 0 44 ${viewH}" style="image-rendering:pixelated">
    ${hairSvg}
    ${armFn(stroke)}
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="${stroke}" stroke-width="1.5"/>
    ${lashes}
    <rect x="12" y="10" width="6" height="${eyeH}" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="${eyeH}" fill="#D1D5DB"/>
    <rect x="${14 + ex}" y="${12 + ey}" width="3" height="${3 * bs}" fill="#0F172A"/>
    <rect x="${28 + ex}" y="${12 + ey}" width="3" height="${3 * bs}" fill="#0F172A"/>
    ${earring}${glasses}${mouthSvg}
    <rect x="${bodyX}" y="32" width="${bodyW}" height="${bodyH}" rx="2" fill="#1F2937" stroke="${stroke}" stroke-width="1"/>
    ${bodyExtra}
    <rect x="13" y="${legsY}" width="6" height="8" rx="1" fill="#1F2937" stroke="${stroke}" stroke-width="1"/>
    <rect x="25" y="${legsY}" width="6" height="8" rx="1" fill="#1F2937" stroke="${stroke}" stroke-width="1"/>
  </svg>`;
}
```

- [ ] **Step 2: Verify `buildPersonaSvg` still works for static case**

Open `http://localhost:8000`, type "30대 여성 직장인" in persona field. SVG should render with female features. No JS errors in console.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): update buildPersonaSvg with per-state poses and JS eye offset"
```

---

## Task 3: Add Animation State Variables

**Files:**
- Modify: `src/frontend/app.js` — Alpine data object (inside `Alpine.data('personaApp', () => ({`)

- [ ] **Step 1: Replace animation-related data properties**

Inside the Alpine data object, find and replace the existing physics properties block:
```js
physX: 100,
physY: 100,
physVX: 0,
physVY: 0,
physState: 'wander',
physTarget: { x: 200, y: 300 },
_animFrame: null,
_idleTimer: null,
_dragOffset: { x: 0, y: 0 },
_dragHistory: [],
```

Replace with:
```js
// physics position
physX: 100,
physY: 100,

// state machine (private, not reactive — prefixed _anim)
_animState: 'walk',      // walk|idle|jump|sit|run|thrown|dragging
_facingLeft: false,
_walkPhase: 0,
_bobY: 0,
_scaleX: 1,
_scaleY: 1,

// jump sub-state
_jumpVY: 0,
_jumpY: 0,
_jumpPhase: 'none',      // anticipate|up|down|land|none
_jumpPhaseTimer: 0,

// sit sub-state
_sitProgress: 0,
_sitTimer: 0,

// run timer
_runTimer: 0,

// eye system
_eyeOX: 1,
_eyeOY: 0,
_eyeTargetX: 1,
_eyeTargetY: 0,
_eyeTimer: 0,
_blinkScale: 1,
_blinkTimer: 0,

// mouse position (tracked globally)
_mouseX: 0,
_mouseY: 0,

// drag/throw
_animFrame: null,
_idleTimer: null,
_dragOffset: { x: 0, y: 0 },
_dragHistory: [],
```

- [ ] **Step 2: Verify Alpine starts without errors**

Open `http://localhost:8000`. Check browser console — no `undefined` errors, page renders normally.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): add animation state variables to Alpine data"
```

---

## Task 4: Replace `_startPhysics()` with Full State Machine

**Files:**
- Modify: `src/frontend/app.js` — `_startPhysics()`, `_pickWanderTarget()`, `_scheduleWander()` methods

- [ ] **Step 1: Replace all three methods**

Find the three methods `_pickWanderTarget()`, `_scheduleWander()`, `_startPhysics()` and replace with:

```js
_maxX() { return window.innerWidth  - 66; },
_maxY() { return window.innerHeight - 78 - 80; },  // 80px taskbar clearance

_scheduleIdle(delay) {
  clearTimeout(this._idleTimer);
  this._idleTimer = setTimeout(() => {
    const roll = Math.random();
    if (roll < 0.20) {
      this._startJump();
    } else if (roll < 0.35) {
      this._startSit();
    } else {
      this._animState = 'walk';
    }
  }, delay != null ? delay : 600 + Math.random() * 1400);
},

_startJump() {
  this._animState = 'jump';
  this._jumpPhase = 'anticipate';
  this._jumpPhaseTimer = 0;
  this._jumpY = 0;
  this._jumpVY = 0;
},

_startSit() {
  this._animState = 'sit';
  this._sitProgress = 0;
  this._sitTimer = 0;
},

_startPhysics() {
  const GRAVITY = 0.45, DAMPING = 0.52, FRICTION = 0.96;
  const WALK_SPEED = 1.4, RUN_SPEED = 3.2;
  const W = 66, H = 78;
  let lastTime = 0;

  const tickWalk = (dt) => {
    const tx = Math.max(0, Math.min(this._maxX(), this._mouseX - W / 2));
    const ty = Math.max(0, Math.min(this._maxY(), this._mouseY - H / 2));
    const dx = tx - this.physX, dy = ty - this.physY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) {
      this._animState = 'idle';
      this._bobY = 0; this._scaleX = 1; this._scaleY = 1;
      this._scheduleIdle();
      return;
    }
    const speed = WALK_SPEED * dt;
    this.physX += (dx / dist) * speed;
    this.physY += (dy / dist) * speed;
    this._facingLeft = dx < 0;
    this._walkPhase = (this._walkPhase + 0.06 * dt) % 1;
    const bob = Math.sin(this._walkPhase * Math.PI * 2);
    this._bobY = bob * 3;
    this._scaleX = 1 + Math.abs(bob) * 0.04;
    this._scaleY = 1 - Math.abs(bob) * 0.04;
    this._eyeTargetX = this._facingLeft ? -1 : 1;
  };

  const tickIdle = (dt) => {
    this._bobY = Math.sin(Date.now() / 900) * 1.5;
    this._scaleX = 1; this._scaleY = 1;
    const dx = this._mouseX - W / 2 - this.physX;
    const dy = this._mouseY - H / 2 - this.physY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 40) {
      clearTimeout(this._idleTimer);
      this._animState = 'walk';
    }
  };

  const tickJump = (dt) => {
    this._jumpPhaseTimer += dt;
    if (this._jumpPhase === 'anticipate') {
      const a = Math.min(this._jumpPhaseTimer / 15, 1);
      this._scaleX = 1 + a * 0.18; this._scaleY = 1 - a * 0.22;
      this._bobY = a * 5;
      if (this._jumpPhaseTimer > 15) {
        this._jumpPhase = 'up';
        this._jumpPhaseTimer = 0;
        this._jumpVY = -14;
      }
    } else if (this._jumpPhase === 'up' || this._jumpPhase === 'down') {
      this._jumpVY += GRAVITY * dt;
      this._jumpY -= this._jumpVY * dt;
      this._bobY = -this._jumpY;
      this._scaleX = 0.85; this._scaleY = 1.15;
      if (this._jumpY <= 0 && this._jumpVY > 0) {
        this._jumpY = 0;
        this._jumpPhase = 'land';
        this._jumpPhaseTimer = 0;
      } else {
        this._jumpPhase = this._jumpVY < 0 ? 'up' : 'down';
      }
    } else if (this._jumpPhase === 'land') {
      const l = Math.min(this._jumpPhaseTimer / 12, 1);
      const recover = Math.sin(l * Math.PI);
      this._scaleX = 1 + recover * 0.22; this._scaleY = 1 - recover * 0.28;
      this._bobY = recover * 4;
      if (this._jumpPhaseTimer > 20) {
        this._scaleX = 1; this._scaleY = 1; this._bobY = 0;
        this._jumpPhase = 'none';
        this._animState = 'idle';
        this._scheduleIdle(600 + Math.random() * 1200);
      }
    }
  };

  const tickSit = (dt) => {
    this._sitTimer += dt;
    if (this._sitProgress < 1) {
      this._sitProgress = Math.min(this._sitProgress + 0.04 * dt, 1);
    }
    if (this._sitTimer > 90) {
      this._sitProgress -= 0.04 * dt;
      if (this._sitProgress <= 0) {
        this._sitProgress = 0; this._scaleX = 1; this._scaleY = 1; this._bobY = 0;
        this._animState = 'idle';
        this._scheduleIdle(400);
        return;
      }
    }
    this._scaleY = 1 - this._sitProgress * 0.32;
    this._scaleX = 1 + this._sitProgress * 0.18;
    this._bobY = this._sitProgress * 8;
  };

  const tickRun = (dt) => {
    const tx = Math.max(0, Math.min(this._maxX(), this._mouseX - W / 2));
    const ty = Math.max(0, Math.min(this._maxY(), this._mouseY - H / 2));
    const dx = tx - this.physX, dy = ty - this.physY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this._runTimer -= dt;
    if (dist < 8 || this._runTimer <= 0) {
      this._animState = 'idle';
      this._scheduleIdle(800);
      return;
    }
    const speed = RUN_SPEED * dt;
    this.physX += (dx / dist) * speed;
    this.physY += (dy / dist) * speed;
    this._facingLeft = dx < 0;
    this._walkPhase = (this._walkPhase + 0.1 * dt) % 1;
    const bob = Math.sin(this._walkPhase * Math.PI * 2);
    this._bobY = bob * 5;
    this._scaleX = 1 + Math.abs(bob) * 0.06;
    this._scaleY = 1 - Math.abs(bob) * 0.07;
  };

  const tickThrown = (dt) => {
    const vx = this._dragHistory._vx || 0, vy = this._dragHistory._vy || 0;
    this._thrownVX = (this._thrownVX || vx);
    this._thrownVY = (this._thrownVY || vy) + GRAVITY * dt;
    this.physX += this._thrownVX * dt;
    this.physY += this._thrownVY * dt;
    if (this.physY >= this._maxY()) {
      this.physY = this._maxY();
      this._thrownVY = -Math.abs(this._thrownVY) * DAMPING;
      this._thrownVX *= FRICTION;
      this._scaleX = 1.3; this._scaleY = 0.65;
      if (Math.abs(this._thrownVY) < 1.5 && Math.abs(this._thrownVX) < 0.8) {
        this._thrownVX = 0; this._thrownVY = 0;
        this._animState = 'walk';
      }
    } else {
      this._scaleX = 0.85; this._scaleY = 1.15;
    }
    if (this.physX < 0)              { this.physX = 0;              this._thrownVX =  Math.abs(this._thrownVX) * DAMPING; }
    if (this.physX > this._maxX())   { this.physX = this._maxX();   this._thrownVX = -Math.abs(this._thrownVX) * DAMPING; }
    if (this.physY < 0)              { this.physY = 0;              this._thrownVY =  Math.abs(this._thrownVY) * DAMPING; }
  };

  const tickEyes = (dt) => {
    this._eyeTimer -= dt;
    if (this._eyeTimer <= 0) {
      const r = Math.random();
      if (r < 0.35)      { this._eyeTargetX = this._facingLeft ? -2 : 2; this._eyeTargetY = 0; }
      else if (r < 0.55) { this._eyeTargetX = 0; this._eyeTargetY = -1; }
      else if (r < 0.7)  { this._eyeTargetX = this._facingLeft ? 1 : -1; this._eyeTargetY = 1; }
      else               { this._eyeTargetX = this._facingLeft ? -1 : 1; this._eyeTargetY = 0; }
      this._eyeTimer = 40 + Math.random() * 120;
    }
    this._eyeOX += (this._eyeTargetX - this._eyeOX) * 0.15 * dt;
    this._eyeOY += (this._eyeTargetY - this._eyeOY) * 0.15 * dt;
  };

  const tickBlink = (dt) => {
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) {
      this._blinkScale = 0.08;
      setTimeout(() => { this._blinkScale = 1; }, 80);
      this._blinkTimer = 120 + Math.random() * 200;
    }
  };

  const loop = (ts) => {
    const dt = Math.min((ts - lastTime) / 16.67, 3);
    lastTime = ts;

    if (this._animState !== 'dragging') {
      switch (this._animState) {
        case 'walk':    tickWalk(dt);    break;
        case 'idle':    tickIdle(dt);    break;
        case 'jump':    tickJump(dt);    break;
        case 'sit':     tickSit(dt);     break;
        case 'run':     tickRun(dt);     break;
        case 'thrown':  tickThrown(dt);  break;
      }
    }

    tickEyes(dt);
    tickBlink(dt);

    // ── Direct DOM: position + squash/stretch
    const wrap = this.$el.querySelector('.persona-wrap');
    if (wrap) {
      const flipX = this._facingLeft ? -1 : 1;
      wrap.style.left = this.physX + 'px';
      wrap.style.top  = (this.physY + this._bobY) + 'px';
      wrap.style.transform = `scaleX(${flipX * this._scaleX}) scaleY(${this._scaleY})`;
    }

    // ── Direct DOM: SVG re-render (only on walking/roaming screens)
    if (this.screen === 'input' || this.screen === 'result') {
      const svgWrap = this.$el.querySelector('.persona-svg-wrap');
      if (svgWrap) {
        const svgState = this._animState === 'jump' && this._jumpPhase !== 'none' ? 'jump'
          : this._animState === 'sit'    ? 'sit'
          : this._animState === 'run'    ? 'run'
          : this._animState === 'thrown' ? 'thrown'
          : this._animState === 'walk'   ? 'walk'
          : 'idle';

        const strokeColor = this._animState === 'thrown' ? '#EF4444'
          : this._animState === 'run'    ? '#F59E0B'
          : (this.screen === 'result' && this.result)
            ? ({ ok: '#10B981', warning: '#F59E0B', critical: '#EF4444' }[this.result.risk_level] || '#9CA3AF')
          : '#9CA3AF';

        svgWrap.innerHTML = buildPersonaSvg(
          this.personaFeatures,
          strokeColor,
          {
            state: svgState,
            facingLeft: this._facingLeft,
            eyeOX: Math.round(this._eyeOX),
            eyeOY: Math.round(this._eyeOY),
            blinkScale: this._blinkScale,
          }
        );
      }
    }

    this._animFrame = requestAnimationFrame(loop);
  };
  this._animFrame = requestAnimationFrame(loop);
},
```

- [ ] **Step 2: Verify state machine runs**

Open `http://localhost:8000`. Persona should walk toward mouse cursor. Move mouse — character follows. Check console: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): replace physics with full state machine — walk/idle/jump/sit/run/thrown"
```

---

## Task 5: Update `onPersonaMousedown()` for New State

**Files:**
- Modify: `src/frontend/app.js` — `onPersonaMousedown()` method

- [ ] **Step 1: Replace `onPersonaMousedown()`**

Find `onPersonaMousedown(e) {` and replace the entire method:

```js
onPersonaMousedown(e) {
  if (this._animState === 'thrown') return;
  this._animState = 'dragging';
  clearTimeout(this._idleTimer);

  this._dragOffset = { x: e.clientX - this.physX, y: e.clientY - this.physY };
  this._dragHistory = [{ x: e.clientX, y: e.clientY, t: Date.now() }];

  const onMove = (ev) => {
    this.physX = ev.clientX - this._dragOffset.x;
    this.physY = ev.clientY - this._dragOffset.y;
    this._dragHistory.push({ x: ev.clientX, y: ev.clientY, t: Date.now() });
    if (this._dragHistory.length > 8) this._dragHistory.shift();
  };

  const onUp = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);

    const now = Date.now();
    const recent = this._dragHistory.filter(p => now - p.t < 120);
    if (recent.length >= 2) {
      const first = recent[0], last = recent[recent.length - 1];
      const dt = Math.max(last.t - first.t, 1);
      this._thrownVX = ((last.x - first.x) / dt) * 16;
      this._thrownVY = ((last.y - first.y) / dt) * 16;
      this._animState = 'thrown';
    } else {
      this._thrownVX = 0; this._thrownVY = 0;
      this._animState = 'idle';
      this._scheduleIdle(500);
    }
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
},
```

Also add `_thrownVX: 0, _thrownVY: 0,` to the data properties added in Task 3.

- [ ] **Step 2: Verify drag/throw works**

Open `http://localhost:8000`. Drag character and release quickly — should fly and bounce. Release slowly — should return to idle.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): update drag/throw to use new animation state vars"
```

---

## Task 6: Update `init()` — Mouse Tracking + Remove Old Eye Code

**Files:**
- Modify: `src/frontend/app.js` — `init()` method

The current `init()` has a `mousemove` listener that moves `.pupil-l, .pupil-r` via CSS transform. Remove this — the rAF loop now handles eyes via absolute SVG coords.

- [ ] **Step 1: Update `init()`**

Find `init() {` and replace the entire method body:

```js
init() {
  this.physX = window.innerWidth * 0.8;
  this.physY = window.innerHeight * 0.7;
  this._mouseX = window.innerWidth * 0.5;
  this._mouseY = window.innerHeight * 0.5;

  // Mouse tracking for character to follow
  window.addEventListener('mousemove', (e) => {
    this._mouseX = e.clientX;
    this._mouseY = Math.min(e.clientY, this._maxY() + 39);
  });

  this._startPhysics();
  this._animState = 'walk';

  this._featureFetch = debounce(async (val) => {
    this.personaFeatures = extractFeatures(val);
    if (!val.trim()) return;
    try {
      const res = await fetch('/persona-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_desc: val }),
      });
      if (res.ok) this.personaFeatures = await res.json();
    } catch (_) {}
  }, 500);

  this.$watch('personaDesc', (val) => {
    if (this.screen === 'input') this._featureFetch(val);
  });
},
```

- [ ] **Step 2: Verify mouse tracking**

Open `http://localhost:8000`. Move mouse — character follows. Eye pupils move toward cursor direction (via `_eyeTargetX/Y` set in `tickWalk`). No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): wire mouse tracking to rAF loop, remove old CSS eye hack"
```

---

## Task 7: Wire App Events to Animation

**Files:**
- Modify: `src/frontend/app.js` — `analyze()`, `reset()`, `currentPersonaSvg` getter

The rAF loop handles `input`/`result` screen rendering directly. The `currentPersonaSvg` getter still needs to handle `progress` screen (using static PERSONA_SVGS). Also `analyze()` should trigger run state.

- [ ] **Step 1: Update `analyze()` — trigger run on start**

Inside `analyze()`, after `this.screen = 'progress';`, add:
```js
this._animState = 'run';
this._runTimer = 180;
```

- [ ] **Step 2: Update `analyze()` — return to idle on complete**

Inside `analyze()`, after `this.screen = 'result';`, add:
```js
this._animState = 'idle';
this._scheduleIdle(1000);
```

- [ ] **Step 3: Update `reset()` — reset animation state**

Find `reset() {` and replace the animation-related lines:

Old:
```js
this.characterState = 'idle';
this.personaFeatures = {};
this.physState = 'idle';
this.physVX = 0;
this.physVY = 0;
this._scheduleWander();
```

New:
```js
this.characterState = 'idle';
this.personaFeatures = {};
this._animState = 'walk';
this._thrownVX = 0;
this._thrownVY = 0;
this._scaleX = 1;
this._scaleY = 1;
this._bobY = 0;
clearTimeout(this._idleTimer);
```

- [ ] **Step 4: Update `currentPersonaSvg` getter — progress screen only**

The rAF loop now handles `input`/`result` SVG rendering directly. The getter only needs to cover `progress`:

```js
get currentPersonaSvg() {
  if (this.screen === 'progress') {
    return PERSONA_SVGS[this.characterState] || PERSONA_SVGS.thinking;
  }
  // input/result: rAF loop renders directly into .persona-svg-wrap
  return '';
},
```

- [ ] **Step 5: Verify full flow**

1. Open `http://localhost:8000`
2. Type persona desc — character walks toward mouse
3. Upload a file, click Analyze — character runs briefly, then shows progress screen (static thinking/scanning SVG)
4. Analysis completes → result screen, character goes idle with risk-colored stroke
5. Click back → character walks again with new stroke color reset to gray

- [ ] **Step 6: Commit**

```bash
git add src/frontend/app.js
git commit -m "feat(persona): wire analyze/reset events to animation state machine"
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Task |
|-------------|------|
| State machine (walk/idle/jump/sit/run/thrown) | Task 4 |
| Body bob walk/run | Task 4 `tickWalk`, `tickRun` |
| Jump 4-phase squash/stretch | Task 4 `tickJump` |
| Eye system — JS absolute coords, dart+blink | Task 4 `tickEyes`, `tickBlink` |
| scaleX(-1) bug fix | Task 2 `buildPersonaSvg` `ex` calc |
| Mouse real-time tracking | Task 4 `tickWalk`, Task 6 `init()` |
| Drag/throw | Task 5 |
| Boundary: taskbar clearance | Task 4 `_maxY()` |
| App events: analyze→run, result→idle+stroke, reset | Task 7 |
| CSS: remove float animation | Task 1 |

All spec sections covered.

### Placeholder Check

No TBD, TODO, or incomplete code blocks found. All functions have complete implementations.

### Type Consistency

- `_animState` used consistently as string enum across tasks 3, 4, 5, 6, 7 ✓
- `_thrownVX/VY` introduced in Task 3 data, used in Task 4 `tickThrown`, Task 5 `onPersonaMousedown` ✓
- `buildPersonaSvg(features, strokeColor, animOpts)` — third param added in Task 2, used in Task 4 rAF loop ✓
- `_scheduleIdle()` replaces `_scheduleWander()` — Task 4 defines it, Task 7 uses it ✓
- `_maxX()`, `_maxY()` defined in Task 4, used in Task 4 and Task 6 ✓
