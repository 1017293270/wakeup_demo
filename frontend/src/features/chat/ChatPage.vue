<template>
  <main class="chat-page">
    <!-- Left Sidebar -->
    <aside class="chat-sidebar">
      <div class="chat-sidebar__header">
        <RouterLink to="/" class="chat-sidebar__back">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          返回
        </RouterLink>
        <span class="chat-sidebar__user">{{ authStore.currentUser?.name || authStore.currentUser?.phone || '用户' }}</span>
      </div>

      <div class="chat-sidebar__avatar">
        <Live2DAvatar state="idle" />
      </div>

      <button class="chat-sidebar__new-btn" @click="newChat">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新对话
      </button>

      <div class="chat-sidebar__sessions">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="chat-session-item"
          :class="{ 'chat-session-item--active': session.id === activeSessionId }"
          @click="switchSession(session.id)"
        >
          <span class="chat-session-item__title">{{ session.title }}</span>
          <span class="chat-session-item__time">{{ formatTime(session.created_at) }}</span>
          <button
            class="chat-session-item__delete"
            title="删除对话"
            @click.stop="handleDeleteSession(session.id)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div v-if="sessions.length === 0" class="chat-sidebar__empty">
          暂无对话记录
        </div>
      </div>
    </aside>

    <!-- Right Chat Area -->
    <section class="chat-main">
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="chat-bubble"
          :class="`chat-bubble--${msg.role}`"
        >
          <span class="chat-bubble__role">{{ msg.role === 'user' ? '我' : 'AI' }}</span>
          <p>{{ msg.text }}</p>
        </div>

        <div v-if="thinking" class="chat-bubble chat-bubble--assistant">
          <span class="chat-bubble__role">AI</span>
          <div class="chat-thinking">
            <span class="chat-thinking__dot" />
            <span class="chat-thinking__dot" />
            <span class="chat-thinking__dot" />
          </div>
        </div>

        <div v-if="messages.length === 0 && !thinking" class="chat-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>开始一段新对话</p>
        </div>
      </div>

      <div class="chat-input-area">
        <a-textarea
          v-model:value="inputText"
          class="chat-input-area__input"
          :rows="2"
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          :disabled="thinking"
          @keydown="handleKeydown"
        />
        <button
          class="chat-input-area__send"
          :disabled="!inputText.trim() || thinking"
          @click="handleSend"
        >
          发送
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import Live2DAvatar from '../../components/business/Live2DAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import {
  getSessions,
  getMessages,
  sendMessage,
  deleteSession,
} from '../../services/chatApi'
import type { ChatSession, ChatMessage } from '../../services/chatApi'

const router = useRouter()
const authStore = useAuthStore()

const sessions = ref<ChatSession[]>([])
const messages = ref<ChatMessage[]>([])
const activeSessionId = ref('')
const inputText = ref('')
const thinking = ref(false)
const messagesRef = ref<HTMLElement | null>(null)

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

async function loadSessions() {
  try {
    sessions.value = await getSessions()
  } catch {
    // Sessions load failure is non-critical
  }
}

async function loadMessages(sessionId: string) {
  try {
    messages.value = await getMessages(sessionId)
    scrollToBottom()
  } catch {
    messages.value = []
  }
}

function newChat() {
  activeSessionId.value = generateSessionId()
  messages.value = []
  inputText.value = ''
}

async function switchSession(sessionId: string) {
  activeSessionId.value = sessionId
  await loadMessages(sessionId)
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || thinking.value) return

  inputText.value = ''

  // Ensure we have a session
  if (!activeSessionId.value) {
    activeSessionId.value = generateSessionId()
  }

  // Optimistically add user message
  const userMsg: ChatMessage = {
    id: `local_${Date.now()}`,
    role: 'user',
    text,
    timestamp: new Date().toISOString(),
  }
  messages.value.push(userMsg)
  scrollToBottom()

  thinking.value = true
  try {
    const result = await sendMessage(text, activeSessionId.value)
    // Replace local message with server one
    const idx = messages.value.findIndex((m) => m.id === userMsg.id)
    if (idx >= 0) messages.value[idx] = result.user_message
    else messages.value.push(result.user_message)
    messages.value.push(result.assistant_message)

    // Refresh sessions list
    await loadSessions()
    scrollToBottom()
  } catch (err: any) {
    message.error(err.message || '发送失败')
  } finally {
    thinking.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

async function handleDeleteSession(sessionId: string) {
  try {
    await deleteSession(sessionId)
    sessions.value = sessions.value.filter((s) => s.id !== sessionId)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = ''
      messages.value = []
    }
    message.success('对话已删除')
  } catch {
    message.error('删除失败')
  }
}

watch(messages, scrollToBottom, { deep: true })

onMounted(async () => {
  await loadSessions()
  if (sessions.value.length > 0) {
    activeSessionId.value = sessions.value[0].id
    await loadMessages(activeSessionId.value)
  }
})
</script>
