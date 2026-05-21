# Exhibition Dashboard Redesign

Date: 2026-05-14

## Goal

Redesign the current voice wakeup dashboard into an exhibition-grade AI command screen for leadership demos. The screen should feel memorable at first glance, while still proving that the voice wakeup system is real, live, traceable, and recoverable.

The approved direction is:

- Primary visual: **Voice Stargate** - a central Live2D digital human surrounded by voice energy rings, orbital status layers, and large hero metrics.
- Information model: **Traceable Command Fabric** - wakeup, ASR, dialog, TTS, standby, and error events remain visible as a clear AI execution chain.

## Current Assessment

The existing dashboard works technically, but it feels like a generic three-column monitoring template.

Main issues:

- The visual hierarchy is flat: panels, charts, controls, and center avatar compete instead of forming one primary focus.
- The screen uses a common dark blue/cyan card-grid style, which does not meet the global anti-template design standard.
- Chinese text in several Vue and data files appears encoding-corrupted, reducing demo credibility.
- AI lifecycle states exist in code, but the UI does not make each state distinct enough for an exhibition setting.
- Live2D is present, but the surrounding composition does not make it feel like the star of the screen.

## Audience

The target audience is exhibition and leadership presentation viewers.

Design implications:

- The page must read clearly from a distance.
- The center visual should create immediate impact.
- Data should support the narrative rather than look like a back-office report.
- Failure, disconnected, and permission states must remain visible and credible.

## Visual Direction

The redesigned screen will use a cinematic AI command-center style:

- Deep dark background with subtle technical texture and depth.
- Electric cyan for live voice signal and active AI processing.
- Warm gold for leadership-level highlights and hero metrics.
- Amber/red only for warning and error semantics.
- Layered glass surfaces, orbital dividers, and thin technical lines instead of uniform cards.
- Stable full-screen composition optimized for 16:9 exhibition displays, with responsive fallback for smaller screens.

The page must avoid:

- Generic dashboard card grids.
- Decorative one-note blue/purple gradients.
- Visual effects that obscure data or make text hard to read.
- Replacing the Live2D digital human with a static illustration.

## Live2D Requirement

The digital human must continue to use the existing Live2D implementation.

Current implementation details to preserve:

- Component: `frontend/src/components/business/Live2DAvatar.vue`
- Runtime: Pixi.js plus `untitled-pixi-live2d-engine/cubism`
- Model asset: `/robot/robot.model3.json`
- Cubism core loading from local `/live2dcubismcore.min.js` first, then CDN fallback
- Visual fallback only when the Live2D runtime or model fails to load

The redesign may enhance the Live2D shell with:

- Larger stage-like placement.
- Voice orbital rings tied to `VoiceState`.
- State-specific glow, pulse, and energy-lane effects.
- A clearer fallback message when Live2D cannot load.

The redesign must not fake the digital human with a static mascot when Live2D is available.

## Layout

The new layout keeps one primary focus:

1. Top command bar
   - Product title and live system status.
   - Current time.
   - Service connection badge.
   - Configuration entry.

2. Center stage
   - Live2D digital human.
   - Voice stargate rings.
   - Current AI state headline.
   - Transcript and answer region.
   - Start, stop, and simulate controls.

3. Left intelligence rail
   - Hero KPI cluster.
   - 24-hour wakeup/dialog trend.
   - Latency proof points.

4. Right traceability rail
   - Wake word distribution.
   - Model quality indicators.
   - Real-time event chain.

5. Bottom signal strip
   - Compact execution chain for wakeup -> ASR -> dialog -> TTS -> standby.
   - Error and disconnected states should visually interrupt this chain.

## AI-Native State Model

The UI must represent these states distinctly:

- `idle`: waiting for user action.
- `requesting_permission`: microphone permission request in progress.
- `connecting`: voice socket connection in progress.
- `listening`: active listening and wake word detection.
- `wakeup`: wake word hit, ready for user command.
- `recognizing`: speech-to-text in progress.
- `thinking`: dialog backend or AI response generation in progress.
- `speaking`: TTS or digital human response output.
- `error`: normalized error with retry path.
- `stopped`: microphone and socket stopped.

Each state should include:

- A visible label.
- A short human-readable detail.
- A distinct visual treatment on the center stage.
- Controls that reflect allowed actions.

## Component Changes

Expected implementation scope:

- `DashboardScreen.vue`
  - Recompose the page into exhibition-stage, intelligence rail, traceability rail, and signal strip sections.
  - Replace corrupted Chinese display text with clear Chinese copy.
  - Keep existing voice socket, microphone, store, and mock data wiring.

- `Live2DAvatar.vue`
  - Preserve Live2D loading and state sync.
  - Improve fallback copy and surrounding shell hooks.
  - Keep runtime failure non-fatal.

- `WakeStatusPanel.vue`
  - Replace corrupted Chinese copy.
  - Make state content presentation-grade and tied to the exhibition stage.

- `VoiceEventStream.vue`
  - Improve empty state and event-chain readability.
  - Preserve live event data.

- `KpiGrid.vue`
  - Make KPI hierarchy suitable for large-screen distance viewing.

- `mockDashboardData.ts`
  - Replace corrupted Chinese labels.
  - Keep values realistic for the demo.

- `dashboard.css` and `theme.css`
  - Build the new visual system with tokens, responsive constraints, motion, focus states, and reduced-motion handling.

## Interaction And Safety

The page must preserve operational controls:

- Start listening.
- Stop listening.
- Simulate wakeup.
- Navigate to configuration.

Safety expectations:

- Stop must remain available during active listening or generation.
- Start must be disabled while startup is already in progress.
- Error states must reveal a safe retry path without exposing sensitive implementation details.
- No new destructive or external side-effect actions are introduced.

## Responsive Behavior

Primary target:

- 16:9 large display, 1920 x 1080 or similar.

Required fallback:

- At narrower widths, rails stack below the center stage.
- Text must not overlap controls.
- Charts must keep stable dimensions.
- Center Live2D stage must remain visible and not collapse into unusable proportions.

## Motion

Motion should clarify AI state:

- Listening: subtle scanning orbit.
- Wakeup: quick energetic pulse.
- Recognizing: waveform lane becomes active.
- Thinking: slower rotating trace/ring motion.
- Speaking: mouth parameter remains Live2D-driven where supported, with synchronized stage glow.
- Error: motion calms down and warning accent becomes visible.

Motion must respect `prefers-reduced-motion`.

## Testing And Verification

Required verification:

- `npm run build`
- Browser check on the local Vite app at desktop size.
- Browser check at a mobile/narrow viewport.
- Visual inspection for no text overlap, no blank Live2D stage, readable charts, and accessible focus states.

Residual risk:

- Live2D runtime depends on WebGL/Cubism support and model compatibility. If unavailable, the fallback must render clearly and explain the missing runtime/model state.

## Out Of Scope

- Backend voice gateway changes.
- New real analytics APIs.
- Replacing the Live2D model asset.
- Changing the configuration page beyond shared token compatibility.
- Adding authentication or permissions beyond existing app behavior.
