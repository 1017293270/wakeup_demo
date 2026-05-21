<template>
  <div
    v-if="visible"
    class="floating-chat-dialog"
    :class="{
      'floating-chat-dialog--recording': isRecording,
      'floating-chat-dialog--canceling': isCanceling,
      'floating-chat-dialog--expanded': expanded
    }"
    :style="dialogStyle"
    @mousedown="startDrag"
    @touchstart.passive="startDragTouch"
  >
    <div class="floating-chat-dialog__header">
      <div class="floating-chat-dialog__header-left">
        <span class="floating-chat-dialog__status-dot" :class="online ? 'floating-chat-dialog__statusdot--online' : 'floating-chat-dialog__statusdot--offline'" />
        <span class="floating-chat-dialog__title">AI 对话</span>
      </div>
      <div class="floating-chat-dialog__header-actions">
        <button class="floating-chat-dialog__btn" @click.stop="$emit('expand')" :title="expanded ? '收起' : '放大'">
          <svg v-if="!expanded" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 8 4 4 8 4"/><polyline points="20 16 20 20 16 20"/><line x1="4" y1="4" x2="9" y2="9"/><line x1="20" y1="20" x2="15" y2="15"/></svg>
        </button>
        <button class="floating-chat-dialog__btn" @click.stop="$emit('minimize')" title="最小化">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="floating-chat-dialog__btn" @click.stop="$emit('close')" title="关闭">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="floating-chat-dialog__messages" ref="messagesRef">
      <div v-for="msg in messages" :key="msg.id" class="floating-chat-dialog__msg" :class="`floating-chat-dialog__msg--${msg.role}`">
        <span>{{ msg.text }}</span>
      </div>
      <div v-if="isThinking" class="floating-chat-dialog__msg floating-chat-dialog__msg--assistant">
        <span class="floating-chat-dialog__thinking">
          <span class="floating-chat-dialog__dot" />
          <span class="floating-chat-dialog__dot" />
          <span class="floating-chat-dialog__dot" />
        </span>
      </div>
    </div>


    <!-- Voice input mode -->
    <div v-if="inputMode === 'voice'" class="floating-chat-dialog__voice-area">
      <!-- 上滑取消提示区域 -->
      <Transition name="cancel-zone">
        <div v-if="isRecording" class="floating-chat-dialog__cancel-zone" :class="{ 'floating-chat-dialog__cancel-zone--active': isCanceling }">
          <svg class="floating-chat-dialog__cancel-arrow" :class="{ 'floating-chat-dialog__cancelarrow--active': isCanceling }" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
          <span class="floating-chat-dialog__cancel-hint">{{ isCanceling ? '松开取消' : '上滑取消' }}</span>
        </div>
      </Transition>
      <div class="floating-chat-dialog__ptt-row">
        <button class="floating-chat-dialog__switch-btn" @click.stop="inputMode = 'text'" title="切换文字输入">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h8"/><path d="M8 16h6"/></svg>
        </button>
        <button
          class="floating-chat-dialog__ptt-btn"
          :class="{
            'floating-chat-dialog__ptt-btn--recording': isRecording,
            'floating-chat-dialog__ptt-btn--cancel': isCanceling
          }"
          :disabled="disabled"
          @mousedown.prevent="startRecord"
          @touchstart.prevent="startRecordTouch"
        >
          <!-- Idle: mic icon + text -->
          <template v-if="!isRecording">
            <span class="floating-chat-dialog__ptt-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </span>
            <span>按住说话</span>
          </template>
          <!-- Recording, cancel zone: show 松开取消 -->
          <template v-else-if="isCanceling">
            <span class="floating-chat-dialog__cancel-text">松开取消</span>
          </template>
          <!-- Recording, normal: volume bars -->
          <template v-else>
            <span
              v-for="i in 5"
              :key="i"
              class="floating-chat-dialog__volume-bar"
              :style="{ height: getBarHeight(i) + 'px', animationDelay: (i * 0.08) + 's' }"
            />
          </template>
        </button>
      </div>
    </div>

    <!-- Text input mode -->
    <div v-if="inputMode === 'text'" class="floating-chat-dialog__input-row">
      <button class="floating-chat-dialog__switch-btn" @click.stop="inputMode = 'voice'" title="切换语音输入">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <textarea
        v-model="inputText"
        class="floating-chat-dialog__input"
        placeholder="输入消息，Enter 发送..."
        :disabled="disabled"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      />
      <button class="floating-chat-dialog__send" :disabled="disabled || !inputText.trim()" @click="handleSend">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'status'
  text: string
}

const props = defineProps<{
  visible: boolean
  online: boolean
  disabled: boolean
  messages: Message[]
  isThinking: boolean
  expanded: boolean
  volumeLevel: number
}>()

const emit = defineEmits<{
  close: []
  minimize: []
  expand: []
  send: [text: string]
  'record-start': []
  'record-stop': []
  'record-cancel': []
}>()

const inputText = ref('')
const messagesRef = ref<HTMLElement | null>(null)
const isRecording = ref(false)
const inputMode = ref<'voice' | 'text'>('voice')

// Drag state
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const position = ref({ x: 0, y: 0 })

// Cancel gesture state
const isCanceling = ref(false)
const recordStartY = ref(0)
const recordCurrentY = ref(0)
const CANCEL_THRESHOLD = 60
const cancelProgress = computed(() => {
  if (!isRecording.value) return 0
  const dy = recordStartY.value - recordCurrentY.value
  return Math.min(1, Math.max(0, dy / CANCEL_THRESHOLD))
})

const dialogStyle = computed(() => {
  if (props.expanded) {
    return {} // CSS handles expanded position
  }
  if (position.value.x === 0 && position.value.y === 0) {
    return { bottom: '60px', right: '20px' }
  }
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    bottom: 'auto',
    right: 'auto'
  }
})

function getBarHeight(index: number): number {
  const base = 8
  const voiceBoost = props.volumeLevel * 24
  return Math.max(4, Math.min(28, base + voiceBoost))
}

function startDrag(e: MouseEvent) {
  if (isRecording.value) return
  if ((e.target as HTMLElement).closest('.floating-chat-dialog__header-actions')) return
  dragging.value = true
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dragOffset.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }

  const onMove = (ev: MouseEvent) => {
    position.value = { x: ev.clientX - dragOffset.value.x, y: ev.clientY - dragOffset.value.y }
  }
  const onUp = () => {
    dragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function startDragTouch(e: TouchEvent) {
  if (isRecording.value) return
  if ((e.target as HTMLElement).closest('.floating-chat-dialog__header-actions')) return
  const touch = e.touches[0]
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dragOffset.value = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }

  const onMove = (ev: TouchEvent) => {
    const t = ev.touches[0]
    position.value = { x: t.clientX - dragOffset.value.x, y: t.clientY - dragOffset.value.y }
  }
  const onEnd = () => {
    dragging.value = false
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }
  document.addEventListener('touchmove', onMove, { passive: true })
  document.addEventListener('touchend', onEnd)
}

function autoResize() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
}

// ---- Push-to-talk with cancel gesture ----

let _recordCleanup: (() => void) | null = null

function startRecord(e: MouseEvent) {
  if (props.disabled) return
  isRecording.value = true
  isCanceling.value = false
  recordStartY.value = e.clientY
  recordCurrentY.value = e.clientY
  emit('record-start')
  bindRecordTracking('mouse')
}

function startRecordTouch(e: TouchEvent) {
  if (props.disabled) return
  isRecording.value = true
  isCanceling.value = false
  recordStartY.value = e.touches[0].clientY
  recordCurrentY.value = e.touches[0].clientY
  emit('record-start')
  bindRecordTracking('touch')
}

function bindRecordTracking(kind: 'mouse' | 'touch') {
  unbindRecordTracking()

  if (kind === 'mouse') {
    const onMove = (ev: MouseEvent) => {
      if (!isRecording.value) return
      recordCurrentY.value = ev.clientY
      const dy = recordStartY.value - ev.clientY
      isCanceling.value = dy > CANCEL_THRESHOLD
    }
    const onUp = () => {
      unbindRecordTracking()
      finishRecord()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    _recordCleanup = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  } else {
    const onMove = (ev: TouchEvent) => {
      if (!isRecording.value) return
      recordCurrentY.value = ev.touches[0].clientY
      const dy = recordStartY.value - ev.touches[0].clientY
      isCanceling.value = dy > CANCEL_THRESHOLD
    }
    const onEnd = () => {
      unbindRecordTracking()
      finishRecord()
    }
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    _recordCleanup = () => {
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }
}

function unbindRecordTracking() {
  if (_recordCleanup) {
    _recordCleanup()
    _recordCleanup = null
  }
}

function finishRecord() {
  if (!isRecording.value) return
  const shouldCancel = isCanceling.value
  isRecording.value = false
  isCanceling.value = false
  if (shouldCancel) {
    emit('record-cancel')
  } else {
    emit('record-stop')
  }
}

watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
})
</script>

<style scoped>
.floating-chat-dialog {
  position: absolute;
  width: 380px;
  max-height: 480px;
  background: #111827;
  border: 1px solid #334155;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
  cursor: grab;
  transition: box-shadow 0.15s ease;
}

.floating-chat-dialog--recording {
  cursor: default;
}

.floating-chat-dialog--canceling .floating-chat-dialog__ptt-btn {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #ef4444 !important;
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.4) !important;
}

.floating-chat-dialog--expanded {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 20px;
  right: auto;
  width: 460px;
  max-height: none;
}

.floating-chat-dialog--expanded .floating-chat-dialog__messages {
  min-height: 0;
  max-height: none;
  flex: 1;
}

.floating-chat-dialog:not(.floating-chat-dialog--recording):active {
  cursor: grabbing;
}

.floating-chat-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #1e3a5f, #111827);
  border-bottom: 1px solid #1e293b;
  user-select: none;
}

.floating-chat-dialog__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.floating-chat-dialog__statusdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.floating-chat-dialog__statusdot--online {
  background: #059669;
  box-shadow: 0 0 6px #059669;
}

.floating-chat-dialog__statusdot--offline {
  background: #64748b;
}

.floating-chat-dialog__title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.floating-chat-dialog__header-actions {
  display: flex;
  gap: 4px;
}

.floating-chat-dialog__btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.1s ease, background 0.1s ease;
}

.floating-chat-dialog__btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}

.floating-chat-dialog__messages {
  flex: 1;
  min-height: 160px;
  max-height: 280px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #0f172a;
}

.floating-chat-dialog__msg {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  max-width: 85%;
  word-break: break-word;
}

.floating-chat-dialog__msg--user {
  align-self: flex-end;
  background: #3b82f6;
  color: #fff;
  border-radius: 12px 12px 2px 12px;
}

.floating-chat-dialog__msg--assistant {
  align-self: flex-start;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 12px 12px 12px 2px;
}

.floating-chat-dialog__msg--status {
  align-self: center;
  background: rgba(100, 116, 139, 0.15);
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
}

.floating-chat-dialog__thinking {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
}

.floating-chat-dialog__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  animation: thinking-pulse 1.2s ease-in-out infinite;
}

.floating-chat-dialog__dot:nth-child(2) { animation-delay: 0.2s; }
.floating-chat-dialog__dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ---- Switch Button ---- */

.floating-chat-dialog__switch-btn {
  background: none;
  border: 1px solid #334155;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.floating-chat-dialog__switch-btn:hover {
  color: #93c5fd;
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

/* ---- Voice Area ---- */

.floating-chat-dialog__voice-area {
  position: relative;
}

/* ---- Cancel Zone (上滑取消提示) ---- */

.floating-chat-dialog__cancel-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0 2px;
  color: #64748b;
  transition: color 0.2s ease, transform 0.2s ease;
}

.floating-chat-dialog__cancel-zone--active {
  color: #ef4444;
  transform: scale(1.08);
}

.floating-chat-dialog__cancel-arrow {
  transition: transform 0.2s ease, stroke 0.2s ease;
}

.floating-chat-dialog__cancel-arrow--active {
  animation: arrow-bounce 0.5s ease-in-out infinite alternate;
}

@keyframes arrow-bounce {
  0% { transform: translateY(0); }
  100% { transform: translateY(-6px); }
}

.floating-chat-dialog__cancel-hint {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Transition for cancel zone appearing */
.cancel-zone-enter-active,
.cancel-zone-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: bottom center;
}
.cancel-zone-enter-from,
.cancel-zone-leave-to {
  opacity: 0;
  transform: scaleY(0.8) translateY(4px);
}

.floating-chat-dialog__volume-bar {
  width: 3px;
  min-height: 6px;
  background: #fca5a5;
  border-radius: 2px;
  animation: bar-dance 0.5s ease-in-out infinite alternate;
}

@keyframes bar-dance {
  0% { transform: scaleY(0.3); }
  100% { transform: scaleY(1); }
}

.floating-chat-dialog__cancel-text {
  font-size: 15px;
  font-weight: 600;
  color: #fca5a5;
  white-space: nowrap;
}

/* ---- PTT Button ---- */

.floating-chat-dialog__ptt-row {
  display: flex;
  justify-content: center;
  padding: 8px 14px 12px;
}

.floating-chat-dialog__ptt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  border: 2px solid #3b82f6;
  border-radius: 24px;
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition: all 0.15s ease;
}

.floating-chat-dialog__ptt-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  border-color: #60a5fa;
}

.floating-chat-dialog__ptt-btn:active:not(:disabled),
.floating-chat-dialog__ptt-btn--recording {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);
}

.floating-chat-dialog__ptt-btn--recording {
  animation: ptt-pulse 1.2s ease-in-out infinite;
  gap: 3px;
  padding: 14px 20px;
}

.floating-chat-dialog__ptt-btn--cancel {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #ef4444 !important;
  box-shadow: 0 0 24px rgba(239, 68, 68, 0.45) !important;
  animation: none !important;
}

.floating-chat-dialog__ptt-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.floating-chat-dialog__ptt-icon {
  display: flex;
  align-items: center;
}

.floating-chat-dialog__ptt-label {
  white-space: nowrap;
}

@keyframes ptt-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
}

/* ---- Text Input ---- */

.floating-chat-dialog__input-row {
  display: flex;
  gap: 8px;
  padding: 8px 14px 12px;
  border-top: 1px solid #1e293b;
  align-items: flex-end;
}

.floating-chat-dialog__input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 8px 14px;
  color: #e2e8f0;
  font-size: 12px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 60px;
  transition: border-color 0.15s ease;
}

.floating-chat-dialog__input:focus {
  border-color: #3b82f6;
}

.floating-chat-dialog__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.floating-chat-dialog__input::placeholder {
  color: #475569;
}

.floating-chat-dialog__send {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
}

.floating-chat-dialog__send:hover:not(:disabled) {
  background: #2563eb;
}

.floating-chat-dialog__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
