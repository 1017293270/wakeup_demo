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
