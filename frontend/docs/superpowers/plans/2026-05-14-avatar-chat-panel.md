# 数字人对话面板与配置入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 唤醒后底部弹出对话面板（支持文字输入 + 消息历史），header 设置按钮显眼化

**Architecture:** 新建 `ChatPanel.vue` 组件展示消息气泡 + 文字输入框，通过 `voiceStore.sendText()` 将文字注入现有语音对话流程。`DashboardScreen` 在 wakeup 状态时自动展开面板。Header 设置按钮从文字链接升级为齿轮图标。

**Tech Stack:** Vue 3 (Composition API), TypeScript, Pinia, CSS (no framework)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/stores/voiceStore.ts` | Modify | Add `sendText` action |
| `src/features/voice/useVoiceSocket.ts` | Modify | Add `sendText` method |
| `src/components/business/ChatPanel.vue` | Create | Chat panel component (messages + input) |
| `src/features/dashboard/DashboardScreen.vue` | Modify | Integrate ChatPanel, chatVisible state, settings button |
| `src/styles/dashboard.css` | Modify | Chat panel styles + animations |

---

### Task 1: voiceStore sendText Action

**Files:**
- Modify: `src/stores/voiceStore.ts:1-46`

- [ ] **Step 1: Add `sendText` action to voiceStore**

Add a new `sendText` action that injects a text input event into the event stream and transitions to the `recognizing` state. This reuses the existing `recognizing → thinking → speaking → standby` flow.

```typescript
// In voiceStore.ts, add to actions:
sendText(text: string) {
  if (!text.trim()) return
  this.transcript = text
  this.setState('recognizing')
  this.pushEvent('asr', text)
}
```

- [ ] **Step 2: Add `sendTextInput` to useVoiceSocket**

In `src/features/voice/useVoiceSocket.ts`, add a public method to send text to the WebSocket backend:

```typescript
// In useVoiceSocket.ts, add alongside existing functions (after synthesize):
function sendText(text: string) {
  sendAction('textInput', { text })
}

// Add to return object:
return {
  connect,
  stop,
  manualWakeup,
  cancel,
  synthesize,
  sendText,  // <-- add this
  get connected() {
    return connected
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/stores/voiceStore.ts src/features/voice/useVoiceSocket.ts
git commit -m "feat: add sendText action to voiceStore and useVoiceSocket"
```

---

### Task 2: Create ChatPanel Component

**Files:**
- Create: `src/components/business/ChatPanel.vue`

- [ ] **Step 1: Write ChatPanel component**

Create the complete component with message list and text input:

```vue
<template>
  <div v-show="visible" class="chat-panel" :class="{ 'chat-panel--open': visible }">
    <div class="chat-panel__header">
      <span class="chat-panel__title">对话</span>
      <button class="chat-panel__close" aria-label="关闭对话面板" @click="$emit('close')">
        ✕
      </button>
    </div>

      <div class="chat-panel__messages" ref="messagesRef">
        <template v-for="msg in messages" :key="msg.id">
          <div v-if="msg.role === 'user'" class="chat-panel__bubble chat-panel__bubble--user">
            <span class="chat-panel__bubble-label">你</span>
            <p>{{ msg.text }}</p>
          </div>

          <div v-if="msg.role === 'assistant'" class="chat-panel__bubble chat-panel__bubble--assistant">
            <span class="chat-panel__bubble-label">数字人</span>
            <p>{{ msg.text }}</p>
          </div>

          <div v-if="msg.role === 'status'" class="chat-panel__status" :class="msg.variant">
            {{ msg.text }}
          </div>
        </template>

        <div v-if="messages.length === 0" class="chat-panel__empty">
          等待对话开始
        </div>
      </div>

      <div class="chat-panel__input-area">
        <textarea
          v-model="inputText"
          class="chat-panel__input"
          :disabled="disabled"
          :placeholder="disabled ? '未处于对话状态' : '输入消息，Ctrl+Enter 发送'"
          rows="2"
          @keydown="handleKeydown"
        />
        <button
          class="chat-panel__send"
          :disabled="disabled || !inputText.trim()"
          @click="handleSend"
        >
          发送
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { VoiceEventItem } from '../../features/voice/voiceTypes'

const props = defineProps<{
  visible: boolean
  events: VoiceEventItem[]
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'send', text: string): void
}>()

const inputText = ref('')
const messagesRef = ref<HTMLElement>()

const messages = computed(() => {
  const result: Array<{ id: string; role: 'user' | 'assistant' | 'status'; text: string; variant?: string }> = []

  // events are unshifted (newest first), reverse for chronological
  const chronological = [...props.events].reverse()

  for (const event of chronological) {
    if (event.type === 'asr') {
      result.push({ id: event.id, role: 'user', text: event.text })
    } else if (event.type === 'dialog') {
      result.push({ id: event.id, role: 'assistant', text: event.text })
    } else if (event.type === 'wakeup') {
      result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' })
    } else if (event.type === 'tts') {
      result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' })
    } else if (event.type === 'ready') {
      result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' })
    } else if (event.type === 'standby') {
      result.push({ id: event.id, role: 'status', text: event.text, variant: 'info' })
    } else if (event.type === 'error') {
      result.push({ id: event.id, role: 'status', text: event.text, variant: 'error' })
    }
  }

  return result.slice(-50)
})

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    handleSend()
  }
}

watch(
  () => props.events.length,
  async () => {
    await nextTick()
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  }
)
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/business/ChatPanel.vue
git commit -m "feat: add ChatPanel component for text-based conversation"
```

---

### Task 3: ChatPanel CSS Styles

**Files:**
- Modify: `src/styles/dashboard.css` (append before `@media (prefers-reduced-motion)` block, around line 900)

- [ ] **Step 1: Add ChatPanel styles**

Append these styles to `dashboard.css` before the `@media (prefers-reduced-motion)` block:

```css
/* ChatPanel */
.chat-panel {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: 10;
  width: min(640px, 90vw);
  max-height: 50vh;
  transform: translateX(-50%) translateY(100%);
  border: 1px solid rgba(86, 240, 255, 0.24);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: rgba(7, 10, 15, 0.92);
  backdrop-filter: blur(20px);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.chat-panel--open {
  transform: translateX(-50%) translateY(0);
}

.chat-panel-enter-active {
  transition: transform 300ms ease-out;
}

.chat-panel-leave-active {
  transition: transform 250ms ease-in;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  transform: translateX(-50%) translateY(100%);
}

.chat-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(219, 231, 255, 0.1);
}

.chat-panel__title {
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.chat-panel__close {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 4px;
  color: var(--color-muted);
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  transition: color 150ms, background 150ms;
}

.chat-panel__close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.chat-panel__messages {
  overflow-y: auto;
  padding: 12px 14px;
  display: grid;
  gap: 10px;
  min-height: 0;
  max-height: 30vh;
  scroll-behavior: smooth;
}

.chat-panel__bubble {
  position: relative;
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 10px;
  animation: bubbleIn 150ms ease-out;
}

@keyframes bubbleIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-panel__bubble--user {
  justify-self: end;
  border: 1px solid rgba(86, 240, 255, 0.28);
  background: rgba(86, 240, 255, 0.1);
}

.chat-panel__bubble--assistant {
  justify-self: start;
  border: 1px solid rgba(247, 200, 115, 0.2);
  background: rgba(247, 200, 115, 0.06);
}

.chat-panel__bubble p {
  margin: 0;
  color: #ffffff;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-panel__bubble-label {
  display: block;
  margin-bottom: 4px;
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
}

.chat-panel__status {
  justify-self: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  text-align: center;
}

.chat-panel__status.info {
  color: var(--color-muted);
  background: rgba(255, 255, 255, 0.04);
}

.chat-panel__status.error {
  color: var(--color-danger);
  background: rgba(255, 107, 130, 0.1);
}

.chat-panel__empty {
  display: grid;
  place-items: center;
  min-height: 80px;
  color: var(--color-muted);
  font-size: 13px;
}

.chat-panel__input-area {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid rgba(219, 231, 255, 0.1);
  background: rgba(7, 10, 15, 0.6);
}

.chat-panel__input {
  flex: 1;
  resize: none;
  border: 1px solid rgba(219, 231, 255, 0.16);
  border-radius: 8px;
  padding: 8px 12px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
  font-size: 14px;
  line-height: 1.4;
  font-family: inherit;
  caret-color: #ffffff;
  transition: border-color 150ms;
}

.chat-panel__input:focus {
  outline: none;
  border-color: rgba(86, 240, 255, 0.5);
}

.chat-panel__input::placeholder {
  color: rgba(219, 231, 255, 0.4);
}

.chat-panel__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-panel__send {
  min-width: 56px;
  padding: 0 16px;
  border: 1px solid rgba(86, 240, 255, 0.4);
  border-radius: 8px;
  color: #ffffff;
  background: linear-gradient(135deg, rgba(86, 240, 255, 0.2), rgba(247, 200, 115, 0.1));
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  align-self: flex-end;
}

.chat-panel__send:hover:not(:disabled) {
  border-color: rgba(86, 240, 255, 0.7);
  background: linear-gradient(135deg, rgba(86, 240, 255, 0.3), rgba(247, 200, 115, 0.16));
}

.chat-panel__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/dashboard.css
git commit -m "feat: add ChatPanel styles and animations"
```

---

### Task 4: Integrate ChatPanel into DashboardScreen

**Files:**
- Modify: `src/features/dashboard/DashboardScreen.vue`

- [ ] **Step 1: Add ChatPanel import and chatVisible state**

In the `<script setup>` section, add the import after existing imports:

```typescript
import ChatPanel from '../../components/business/ChatPanel.vue'
```

After `const dashboardScale = ref(1)`, add:

```typescript
const chatVisible = ref(false)
```

- [ ] **Step 2: Add chatVisible watch for auto show/hide**

After the `signalSteps` computed block, add a watcher that automatically shows/hides the chat panel based on voice state:

```typescript
import { watch } from 'vue'

// Auto show/hide chat panel based on voice state
watch(
  () => voice.state,
  (newState) => {
    if (newState === 'wakeup' || newState === 'recognizing' || newState === 'thinking' || newState === 'speaking') {
      chatVisible.value = true
    } else if (newState === 'idle' || newState === 'stopped') {
      chatVisible.value = false
    }
  }
)
```

- [ ] **Step 3: Add handleChatSend function**

Add a function to handle text input from ChatPanel. Place it after `simulateWakeup`:

```typescript
function handleChatSend(text: string) {
  // Inject text into the voice event stream
  voice.sendText(text)
  // Send to WebSocket backend for processing
  voiceSocket?.sendText(text)
}
```

- [ ] **Step 4: Add ChatPanel to template**

In the template, add the ChatPanel component after the `</section>` that closes `signal-strip` and before the closing `</div>` of `dashboard-canvas`. The structure should be:

```vue
    <section class="signal-strip" aria-label="AI 执行链路">
      <article v-for="step in signalSteps" :key="step.key" class="signal-step" :class="`signal-step--${step.state}`">
        <span>{{ step.label }}</span>
        <strong>{{ step.detail }}</strong>
      </article>
    </section>

    <ChatPanel
      :visible="chatVisible"
      :events="voice.events"
      :disabled="!voice.serviceOnline"
      @close="chatVisible = false"
      @send="handleChatSend"
    />

    </div>
  </main>
```

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardScreen.vue
git commit -m "feat: integrate ChatPanel into dashboard with auto-show on wakeup"
```

---

### Task 5: Settings Button in Header

**Files:**
- Modify: `src/features/dashboard/DashboardScreen.vue` (template section, header)

- [ ] **Step 1: Replace commented-out RouterLink with settings button**

In the `<nav class="screen-actions">` section, replace the commented-out line:

```vue
<!-- <RouterLink to="/config" class="screen-link">配置中心</RouterLink> -->
```

With an actual visible settings button:

```vue
<RouterLink to="/config" class="screen-link" aria-label="配置中心">
  <svg class="settings-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
  设置
</RouterLink>
```

- [ ] **Step 2: Add settings button styles**

In `dashboard.css`, find the `.screen-link` style block (or add if not present) and add/replace:

```css
.screen-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 6px 14px;
  border: 1px solid rgba(219, 231, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.07);
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 160ms, background 160ms;
}

.screen-link:hover {
  border-color: rgba(247, 200, 115, 0.5);
  background: rgba(247, 200, 115, 0.1);
}

.settings-icon {
  color: var(--color-cyan);
  transition: transform 300ms ease;
}

.screen-link:hover .settings-icon {
  transform: rotate(45deg);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/DashboardScreen.vue src/styles/dashboard.css
git commit -m "feat: add visible settings button to dashboard header"
```

---

### Task 6: Verify Build

- [ ] **Step 1: Run build to verify**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 2: If build fails, fix and re-build**

Common issues:
- Missing import statements
- Type mismatches in `sendText` parameters
- Template syntax errors

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors"
```
