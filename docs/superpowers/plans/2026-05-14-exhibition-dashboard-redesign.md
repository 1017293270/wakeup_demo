# Exhibition Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Vue voice wakeup dashboard into an exhibition-grade Live2D AI command screen.

**Architecture:** Keep the existing Vue/Vite/Pinia voice flow intact and refactor only the dashboard presentation layer. The Live2D component remains the real digital-human renderer, while the dashboard shell adds state-aware staging, traceability panels, and presentation-grade copy.

**Tech Stack:** Vue 3 SFCs, TypeScript, Vite, Pinia, ECharts, Pixi.js, `untitled-pixi-live2d-engine/cubism`, CSS custom properties.

---

## File Structure

- Modify `D:\wakeup_demo\frontend\src\features\dashboard\DashboardScreen.vue`
  - Recompose the screen into top bar, left intelligence rail, center Live2D stage, right traceability rail, and bottom execution chain.
  - Replace corrupted Chinese copy in the page and event handlers.
  - Preserve existing microphone, WebSocket, store, and chart data wiring.

- Modify `D:\wakeup_demo\frontend\src\components\business\Live2DAvatar.vue`
  - Preserve real Live2D loading and state sync.
  - Improve fallback copy and add semantic stage layers for CSS.

- Modify `D:\wakeup_demo\frontend\src\components\business\WakeStatusPanel.vue`
  - Replace corrupted state copy.
  - Add state metadata classes that the exhibition stage can style.

- Modify `D:\wakeup_demo\frontend\src\components\business\VoiceEventStream.vue`
  - Improve readable empty and event states.
  - Preserve incoming event shape.

- Modify `D:\wakeup_demo\frontend\src\features\dashboard\components\KpiGrid.vue`
  - Improve markup for large-screen KPI hierarchy.

- Modify `D:\wakeup_demo\frontend\src\features\dashboard\mockDashboardData.ts`
  - Replace corrupted Chinese labels and values.

- Modify `D:\wakeup_demo\frontend\src\styles\dashboard.css`
  - Rebuild the exhibition visual system, responsive layout, motion, focus, and reduced-motion handling.

- Modify `D:\wakeup_demo\frontend\src\styles\theme.css`
  - Add/adjust global tokens and focus/button/link polish without breaking the config page.

## Task 1: Fix Demo Data And Display Copy

**Files:**
- Modify: `D:\wakeup_demo\frontend\src\features\dashboard\mockDashboardData.ts`
- Modify: `D:\wakeup_demo\frontend\src\components\business\WakeStatusPanel.vue`
- Modify: `D:\wakeup_demo\frontend\src\components\business\VoiceEventStream.vue`

- [ ] **Step 1: Replace corrupted dashboard mock labels**

Use these labels:

```ts
export const kpis = [
  { label: '今日唤醒次数', value: '2,324', delta: '+12.4%', trend: 'up' },
  { label: '有效对话数', value: '1,876', delta: '+8.1%', trend: 'up' },
  { label: 'ASR 准确率', value: '95.3%', delta: '+2.6%', trend: 'up' },
  { label: '平均响应时长', value: '1.28s', delta: '-5.4%', trend: 'down' }
]
```

- [ ] **Step 2: Replace wake state text**

Use a typed state map in `WakeStatusPanel.vue` with clear Chinese copy for `idle`, `requesting_permission`, `connecting`, `listening`, `wakeup`, `recognizing`, `thinking`, `speaking`, `error`, and `stopped`.

- [ ] **Step 3: Improve event empty state**

Set the empty event text to `等待语音链路事件` and preserve the current `events` prop.

- [ ] **Step 4: Run type check through build**

Run: `npm run build`

Expected: build succeeds or reports only the existing large chunk warning.

## Task 2: Recompose Dashboard Screen

**Files:**
- Modify: `D:\wakeup_demo\frontend\src\features\dashboard\DashboardScreen.vue`

- [ ] **Step 1: Replace the old three-column template**

Implement this structure:

```vue
<main class="dashboard-screen" :class="`dashboard-screen--${voice.state}`">
  <div class="screen-bg" aria-hidden="true" />
  <div class="screen-vignette" aria-hidden="true" />
  <header class="screen-header">...</header>
  <section class="command-layout">...</section>
  <section class="signal-strip" aria-label="AI 执行链路">...</section>
</main>
```

- [ ] **Step 2: Keep operational controls**

Keep `startListening`, `stopListening`, and `simulateWakeup`; use readable labels:

```ts
const startLabel = computed(() => {
  if (starting.value) return '启动中'
  return voice.state === 'listening' ? '监听中' : '开启监听'
})
```

- [ ] **Step 3: Add execution-chain data**

Create a computed `signalSteps` based on `voice.state`, using step keys `wakeup`, `asr`, `dialog`, `tts`, `standby`. Active and done states should derive from current `VoiceState`.

- [ ] **Step 4: Replace corrupted gateway messages**

Examples:

```ts
voice.pushEvent('ready', '语音服务已就绪')
voice.pushEvent('wakeup', `唤醒成功：${wakeWord}`)
voice.setError('语音服务连接已断开')
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: build succeeds or reports only large chunk warnings.

## Task 3: Preserve And Stage Live2D

**Files:**
- Modify: `D:\wakeup_demo\frontend\src\components\business\Live2DAvatar.vue`

- [ ] **Step 1: Preserve real Live2D renderer**

Do not remove:

```ts
const { Application } = await import('pixi.js')
const { configureCubismSDK, Live2DModel } = await import('untitled-pixi-live2d-engine/cubism')
model = await Live2DModel.from('/robot/robot.model3.json')
```

- [ ] **Step 2: Improve fallback text**

Use:

```ts
throw new Error('Live2D Cubism Core 未加载，请将 live2dcubismcore.min.js 放到 frontend/public/')
```

and fallback message:

```ts
loadMessage.value = error instanceof Error ? error.message : 'Live2D 加载失败'
```

- [ ] **Step 3: Add visual stage hooks**

Keep the canvas and add decorative, aria-hidden elements around it:

```vue
<div class="voice-orbit voice-orbit--outer" aria-hidden="true" />
<div class="voice-orbit voice-orbit--middle" aria-hidden="true" />
<div class="voice-orbit voice-orbit--inner" aria-hidden="true" />
<div class="voice-wave-lane" aria-hidden="true" />
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: build succeeds or reports only large chunk warnings.

## Task 4: Build Exhibition Visual System

**Files:**
- Modify: `D:\wakeup_demo\frontend\src\styles\dashboard.css`
- Modify: `D:\wakeup_demo\frontend\src\styles\theme.css`
- Modify as needed: `D:\wakeup_demo\frontend\src\features\dashboard\components\KpiGrid.vue`

- [ ] **Step 1: Add design tokens**

Use tokens for:

```css
--color-gold: #f7c873;
--color-cyan: #56f0ff;
--color-emerald: #7cffc8;
--color-danger: #ff6b82;
--color-panel: rgba(8, 14, 24, 0.74);
```

- [ ] **Step 2: Implement command layout**

Desktop grid:

```css
.command-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.86fr) minmax(520px, 1.5fr) minmax(280px, 0.86fr);
}
```

- [ ] **Step 3: Implement center stage**

The Live2D stage must be largest visual element, with stable aspect ratio and no text overlap.

- [ ] **Step 4: Implement reduced motion**

Add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: build succeeds or reports only large chunk warnings.

## Task 5: Browser Verification

**Files:**
- No source changes unless verification reveals visual or runtime problems.

- [ ] **Step 1: Start local dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite serves the app at a local URL.

- [ ] **Step 2: Desktop check**

Open the app in the browser at desktop size and verify:

- Live2D canvas or fallback is visible.
- Center stage is dominant.
- Text does not overlap.
- Charts render.
- Controls are visible and focusable.

- [ ] **Step 3: Narrow viewport check**

Verify:

- Rails stack cleanly.
- Controls wrap without overflow.
- Live2D stage remains usable.

- [ ] **Step 4: Final build**

Run: `npm run build`

Expected: build succeeds or reports only large chunk warnings.

## Self-Review

Spec coverage:

- Exhibition visual direction: Task 2 and Task 4.
- Live2D hard requirement: Task 3.
- AI-native states: Task 1, Task 2, and Task 4.
- Traceability rail and signal strip: Task 2 and Task 4.
- Responsive behavior and reduced motion: Task 4 and Task 5.
- Verification: Task 5.

Placeholder scan:

- No TBD or TODO placeholders are intentionally left.

Type consistency:

- Existing `VoiceState`, `VoiceEventItem`, Pinia store, and ECharts options remain the source contracts.
