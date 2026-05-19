# Persona Walking Animation — Design Spec

**Date:** 2026-05-18  
**Branch:** feat/ux-audit-quick-wins  
**Scope:** `src/frontend/app.js`, `src/frontend/style.css`

---

## 1. Goal

Replace the current static/floating persona widget with a fully animated character that:
- Roams freely following the mouse cursor in real-time
- Expresses state through exaggerated Disney-style squash/stretch
- Can be grabbed and thrown with physics
- Reacts to app events (analyze start, result ready, reset)

---

## 2. State Machine

```
         ┌──────────────┐
         │    walk      │◄──── mouse moves 40px+ away
         │  (mouse追従) │
         └──────┬───────┘
                │ dist < 8px
                ▼
         ┌──────────────┐
         │    idle      │──── 20% → jump
         │  (sway)      │──── 15% → sit
         └──────────────┘──── 65% → walk (새 마우스 위치)
                
         jump: anticipate → up → down → land → idle
         sit:  compress → hold 1.5s → recover → idle
         run:  R키 트리거, 빠른 마우스 추적
         thrown: 드래그 던지기, 중력+바운스 → walk
         dragging: mousedown 중
```

---

## 3. Animation Sub-systems

### 3.1 Body Bob (walk/run)
- `walkPhase += 0.06 * dt` per frame
- `bobY = sin(phase * 2π) * 3` (run: `* 5`)
- `scaleX = 1 + |bob| * 0.04`, `scaleY = 1 - |bob| * 0.04`
- `transform-origin`: bottom center

### 3.2 Jump (4-phase squash/stretch)
| Phase | Duration | scaleX | scaleY | bobY |
|-------|----------|--------|--------|------|
| anticipate | 15 frames | 1.18 | 0.78 | +5 |
| up/down | physics | 0.85 | 1.15 | -jumpY |
| land | 20 frames | 1.22 | 0.72 | +4 |
| recover | → idle | 1.0 | 1.0 | 0 |

### 3.3 Sit
- `sitProgress` 0→1 over ~25 frames: `scaleY = 1 - progress * 0.32`, `scaleX = 1 + progress * 0.18`
- Hold ~90 frames, reverse to recover

### 3.4 Eye System (scaleX(-1) bug fix)
- JS tracks `facingLeft` boolean
- `eyeOX` is **absolute** SVG offset, not relative translate
- `svgChar()` receives `eyeOX` directly: `x="${14 + eyeOX}"` — no CSS transform on eyes
- Random dart: every 40–160 frames, new `eyeTargetX/Y`; lerp `eyeOX += (target - eyeOX) * 0.15 * dt`
- Blink: every 120–320 frames, `blinkScale = 0.08` for 80ms

### 3.5 Throw Physics
- `mousedown` → record `dragHistory` (last 8 points)
- `mouseup` → compute velocity from last 120ms: `vx = Δx/Δt * 16`
- `thrown` state: `vy += GRAVITY * dt`, bounce on `maxY()` with `DAMPING = 0.52`
- Landing: `|vy| < 1.5 && |vx| < 0.8` → transition to `walk`

---

## 4. Physics Constants

```js
GRAVITY    = 0.45
DAMPING    = 0.52   // bounce energy retention
FRICTION   = 0.96   // horizontal decay per frame
WALK_SPEED = 1.4    // px per normalized frame
RUN_SPEED  = 3.2
```

---

## 5. Boundary Constraints

- `maxX() = innerWidth - W`  (W=66px)
- `maxY() = innerHeight - H - 80`  (H=78px, 80px taskbar clearance)
- Mouse Y clamped: `Math.min(mouseY, maxY() + H * 0.5)`

---

## 6. SVG Render

`buildPersonaSvg({ state, facingLeft, stroke, eyeOX, eyeOY, blinkScale })` — same structure as demo `svgChar()`. Leg/arm/mouth poses differ per state. Stroke color:
- default: `#9CA3AF`
- thrown: `#EF4444`  
- run: `#F59E0B`
- analyzing (app state): risk-based color from existing `strokeColor` getter

---

## 7. App Integration Points

| App Event | Animation Trigger |
|-----------|------------------|
| `analyze()` called | state → `run` (rushes to analyze position) |
| Analysis complete | state → `idle`, stroke color → risk color |
| `reset()` called | state → `walk`, stroke → default |
| `personaDesc` changes | SVG re-renders with new `personaFeatures` |

---

## 8. CSS Changes

`.persona-wrap`:
- Remove `bottom/right` fixed positioning
- Add `position: fixed`, `left/top` driven by JS (`physX`, `physY`)
- `cursor: grab` → `.is-dragging { cursor: grabbing }`
- `will-change: left, top, transform`
- Remove old walk/float CSS animations

---

## 9. Future Directions (Post-MVP)

### F1: Prompt-triggered Anchor Mode
- On `personaDesc` input → persona walks to right edge, scales up (~1.5x), displays feature breakdown
- Idle timeout (~10s no input) → shrinks back, resumes free roam with current features intact
- Loop: roam → anchor (input) → display features → roam

### F2: DOM Element Collision / Ride Interaction
- Detect bounding boxes of key UI components (cards, buttons, result panels)
- Persona can "climb" or "sit on" elements using `getBoundingClientRect()`
- State: `climbing`, `riding` — character snaps to top edge of element
- Triggers: when persona walks near element boundary within threshold (~20px)
