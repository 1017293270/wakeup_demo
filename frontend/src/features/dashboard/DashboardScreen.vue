<template>
  <main class="dashboard-screen" :class="`dashboard-screen--${voice.state}`">
    <div class="screen-bg" aria-hidden="true" />
    <div class="screen-vignette" aria-hidden="true" />

    <div class="dashboard-canvas" :style="{ '--dashboard-scale': dashboardScale }">
    <header class="screen-header">
      <div class="screen-title">
        <span class="eyebrow">AI Native Voice Command Center</span>
        <h1>语音唤醒 AI 指挥舱</h1>
        <p>数字人实时接入唤醒、识别、对话和播报链路。</p>
      </div>
      <nav class="screen-actions" aria-label="大屏操作">
        <RouterLink to="/chat" class="screen-link screen-link--chat">
          <svg class="chat-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          进入对话
        </RouterLink>
        <StatusBadge :text="voice.serviceOnline ? '语音服务在线' : '语音服务未连接'" :tone="voice.serviceOnline ? 'ok' : 'warn'" />
        <StatusBadge :text="clockText" tone="active" />
        <button class="screen-link" @click="handleLogout">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          退出
        </button>
        <RouterLink to="/config" class="screen-link" aria-label="配置中心">
          <svg class="settings-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          设置
        </RouterLink>
      </nav>
    </header>

    <section class="command-layout command-layout--center">
      <section class="command-stage command-stage--centered" aria-label="Live2D 数字人状态">
        <div class="stage-core">
          <Live2DAvatar :state="voice.state" />
        </div>

        <WakeStatusPanel
          :state="voice.state"
          :transcript="voice.transcript"
          :answer="voice.answer"
          :error-message="voice.errorMessage"
          :hint="voice.hint"
          :wake-word="voice.wakeWord"
        />

        <div v-if="voice.answer && !voice.dialogVisible" class="answer-subtitle" aria-live="polite">
          <span v-if="voice.transcript" class="answer-subtitle__q">"{{ voice.transcript }}"</span>
          <p class="answer-subtitle__a">{{ voice.answer }}</p>
        </div>

        <div class="voice-controls" aria-label="语音控制">
          <button class="voice-control voice-control--primary" :disabled="isStartDisabled" @click="startListening">
            {{ startLabel }}
          </button>
          <button class="voice-control voice-control--secondary" :disabled="isStopDisabled" @click="stopListening">
            停止
          </button>
          <button class="voice-control voice-control--secondary" @click="simulateWakeup">
            模拟唤醒
          </button>
          <button class="voice-control voice-control--secondary" style="border-color: rgba(124,255,200,0.4); background: rgba(124,255,200,0.15);" @click="forceShowDialog">
            强制打开弹窗
          </button>
        </div>
      </section>
    </section>

    <FloatingChatDialog
      :visible="voice.dialogVisible"
      :online="voice.serviceOnline"
      :disabled="isDialogInputDisabled"
      :messages="voice.dialogMessages"
      :is-thinking="voice.isThinking"
      :expanded="dialogExpanded"
      :volume-level="recordingVolume"
      @close="handleDialogClose"
      @minimize="handleDialogMinimize"
      @expand="toggleExpand"
      @send="handleDialogSend"
      @record-start="startRecording"
      @record-stop="stopRecording"
      @record-cancel="cancelRecording"
    />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import Live2DAvatar from '../../components/business/Live2DAvatar.vue'
import WakeStatusPanel from '../../components/business/WakeStatusPanel.vue'
import FloatingChatDialog from '../../components/business/FloatingChatDialog.vue'
import { useVoiceSocket } from '../voice/useVoiceSocket'
import { useMicrophoneStream } from '../voice/useMicrophoneStream'
import { useVoiceStore } from '../../stores/voiceStore'
import { useAuthStore } from '../../stores/authStore'
import { logout as logoutApi } from '../../services/authApi'
import type { GatewayEvent, VoiceState } from '../voice/voiceTypes'
import { getConfig } from '../../services/configApi'
import { defaultWakeConfig } from '../config/configSchema'

const router = useRouter()
const voice = useVoiceStore()
const authStore = useAuthStore()
const clockText = ref(formatClock())
const starting = ref(false)
const dashboardScale = ref(1)
let voiceSocket: ReturnType<typeof useVoiceSocket> | null = null
let timer = 0
let recognizingTimer = 0
let activeSpeechAudio: HTMLAudioElement | null = null

const mic = useMicrophoneStream(16000)
const recording = ref(false)
const recordingVolume = ref(0)
const audioFrames: ArrayBuffer[] = []
let microphoneStreaming = false

const DASHBOARD_DESIGN_WIDTH = 1920
const DASHBOARD_DESIGN_HEIGHT = 1080

const dialogExpanded = ref(false)
const isDialogInputDisabled = computed(() => !voice.serviceOnline || voice.isThinking)

function toggleExpand() {
  dialogExpanded.value = !dialogExpanded.value
}

function getDefaultVoiceWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function computeVolume(frame: ArrayBuffer): number {
  const view = new Int16Array(frame)
  let sumSquares = 0
  for (let i = 0; i < view.length; i++) {
    const normalized = view[i] / 32768
    sumSquares += normalized * normalized
  }
  const rms = Math.sqrt(sumSquares / view.length)
  return Math.min(1, rms * 5)
}

function shouldStreamWakeFrame(): boolean {
  return voice.serviceOnline && !voice.conversationActive && !recording.value
}

function handleMicrophoneFrame(frame: ArrayBuffer) {
  if (recording.value) {
    audioFrames.push(frame.slice(0))
    recordingVolume.value = computeVolume(frame)
    return
  }

  if (shouldStreamWakeFrame()) {
    voiceSocket?.sendFrame(frame)
  }
}

function startRecording() {
  if (voice.isThinking) return
  if (recording.value) return
  audioFrames.length = 0
  recording.value = true
  recordingVolume.value = 0
  voice.hint = '输入中...'
  if (microphoneStreaming) return
  mic.start(handleMicrophoneFrame).catch((err) => {
    console.error('[PTT] 麦克风启动失败:', err)
    recording.value = false
    voice.hint = ''
    const detail = err instanceof Error ? err.message : String(err)
    voice.pushEvent('error', `麦克风失败: ${detail}`)
  })
}

function stopRecording() {
  if (!recording.value) return
  recording.value = false
  recordingVolume.value = 0
  voice.hint = ''
  if (!microphoneStreaming) mic.stop()

  if (audioFrames.length === 0) {
    voice.pushEvent('standby', '未录制到音频，请重试')
    return
  }

  const totalLength = audioFrames.reduce((acc, frame) => acc + frame.byteLength, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const frame of audioFrames) {
    combined.set(new Uint8Array(frame), offset)
    offset += frame.byteLength
  }

  const samples = new Int16Array(combined.buffer)
  const SILENCE_THRESHOLD = 200

  let start = 0
  while (start < samples.length && Math.abs(samples[start]) < SILENCE_THRESHOLD) start++
  let end = samples.length - 1
  while (end > start && Math.abs(samples[end]) < SILENCE_THRESHOLD) end--

  start = Math.max(0, start - 800)
  end = Math.min(samples.length - 1, end + 800)

  const trimmed = samples.slice(start, end + 1)

  let peak = 0
  for (let i = 0; i < trimmed.length; i++) {
    const abs = Math.abs(trimmed[i])
    if (abs > peak) peak = abs
  }
  if (peak > 0 && peak < 8000) {
    const gain = Math.min(26000 / peak, 4.0)
    for (let i = 0; i < trimmed.length; i++) {
      const v = trimmed[i] * gain
      trimmed[i] = Math.max(-32768, Math.min(32767, Math.round(v)))
    }
  }

  const processed = new Uint8Array(trimmed.buffer)

  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < processed.byteLength; i += chunkSize) {
    const chunk = processed.subarray(i, Math.min(i + chunkSize, processed.byteLength))
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j])
    }
  }
  const base64 = btoa(binary)

  const durationSec = (trimmed.length / 16000).toFixed(1)
  console.log(`[PTT] 音频: ${durationSec}s, 原始=${(samples.length / 16000).toFixed(1)}s, 裁剪=${((start / 16000) * 1000).toFixed(0)}ms前/${(((samples.length - end) / 16000) * 1000).toFixed(0)}ms后, 峰值=${peak}`)

  if (trimmed.length < 8000) {
    voice.pushEvent('standby', '录音太短，请重试')
    audioFrames.length = 0
    return
  }

  voice.pushEvent('asr', '正在识别语音...')
  voice.setThinking(true)
  voiceSocket?.sendAudio(base64)
  audioFrames.length = 0
}

function cancelRecording() {
  if (!recording.value) return
  recording.value = false
  recordingVolume.value = 0
  voice.hint = ''
  if (!microphoneStreaming) mic.stop()
  audioFrames.length = 0
  voice.setThinking(false)
  voice.pushEvent('standby', '录音已取消')
}

const startLabel = computed(() => {
  if (starting.value) return '启动中'
  return voice.state === 'listening' ? '监听中' : '开启监听'
})

const isStartDisabled = computed(() => starting.value || voice.serviceOnline || ['connecting'].includes(voice.state))
const isStopDisabled = computed(() => voice.state === 'idle' || voice.state === 'stopped')

function formatClock() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function updateDashboardScale() {
  dashboardScale.value = Math.min(
    window.innerWidth / DASHBOARD_DESIGN_WIDTH,
    window.innerHeight / DASHBOARD_DESIGN_HEIGHT
  )
}

function scheduleThinkingState() {
  window.clearTimeout(recognizingTimer)
  recognizingTimer = window.setTimeout(() => {
    if (voice.state === 'recognizing') voice.setState('thinking')
  }, 520)
}

function settleAfterSpeech() {
  if (voice.state === 'speaking') {
    voice.setState('listening')
    voice.pushEvent('standby', '语音播报完成，已回到监听')
  }
}

function playGatewayAudio(audio: string) {
  activeSpeechAudio?.pause()
  activeSpeechAudio = new Audio(audio)
  activeSpeechAudio.onended = () => {
    activeSpeechAudio = null
    settleAfterSpeech()
  }
  activeSpeechAudio.onerror = () => {
    activeSpeechAudio = null
    voice.pushEvent('tts', '语音播放失败，已继续监听')
    settleAfterSpeech()
  }

  void activeSpeechAudio.play().catch(() => {
    activeSpeechAudio = null
    voice.pushEvent('tts', '浏览器阻止了自动播放，已继续监听')
    settleAfterSpeech()
  })
}

function handleGatewayEvent(event: GatewayEvent) {
  console.log('[DEBUG] gateway event:', event.event, JSON.stringify(event.data))
  const hint = String((event.data as { hint?: string }).hint || '')
  if (hint) voice.hint = hint

  if (event.event === 'ready') {
    voice.serviceOnline = true
    voice.sessionId = String((event.data as { sessionId?: string }).sessionId || '')
    voice.setState('listening')
    voice.pushEvent('ready', '语音服务已就绪')
  }

  if (event.event === 'wakeup') {
    const wakeWord = String((event.data as { wakeWord?: string }).wakeWord || voice.wakeWord)
    voice.setState('wakeup')
    voice.conversationActive = true
    voice.setDialogVisible(true)
    voice.clearDialogMessages()
    voice.setThinking(false)
    voice.pushEvent('wakeup', `唤醒成功：${wakeWord}`)
  }

  if (event.event === 'asrResult') {
    voice.transcript = String((event.data as { text?: string }).text || '')
    voice.setState('recognizing')
    voice.hint = ''
    voice.pushEvent('asr', voice.transcript || '语音转写完成')
    voice.addDialogMessage('user', voice.transcript)
    voice.setThinking(true)
    scheduleThinkingState()
  }

  if (event.event === 'dialogResult') {
    window.clearTimeout(recognizingTimer)
    const answer = String((event.data as { answer?: string }).answer || '')
    voice.answer = answer
    voice.hint = ''
    voice.setState('speaking')
    voice.setThinking(false)
    voice.pushEvent('dialog', answer || '业务回答已生成')
    voice.addDialogMessage('assistant', answer)
  }

  if (event.event === 'ttsStatus') {
    const status = String((event.data as { status?: string }).status || '')
    if (status === 'start') {
      voice.setState('speaking')
      voice.pushEvent('tts', '语音合成中')
    }
    if (status === 'end' && !activeSpeechAudio) {
      settleAfterSpeech()
    }
  }

  if (event.event === 'ttsResult') {
    const audio = String((event.data as { audio?: string }).audio || '')
    voice.setState('speaking')
    voice.pushEvent('tts', '语音播报开始')
    if (audio) playGatewayAudio(audio)
    else settleAfterSpeech()
  }

  if (event.event === 'standby') {
    voice.setThinking(false)
    if (voice.state === 'stopped') return
    const reason = String((event.data as { reason?: string }).reason || '')
    if (reason === 'silence_timeout' || reason === 'cancelled') {
      voice.conversationActive = false
      voice.setDialogVisible(false)
    }
    voice.setState('listening')
    voice.pushEvent('standby', '已回到监听')
  }

  if (event.event === 'error') {
    voice.setThinking(false)
    voice.setError(String((event.data as { message?: string }).message || '语音服务错误'))
  }

  if (event.event === 'configUpdate') {
    const config = (event.data as { config?: Record<string, unknown> }).config
    if (config) {
      voice.updateWakeConfig(config as Record<string, unknown>)
      voice.pushEvent('config', '配置已更新')
    }
  }
}

async function startBrowserAudioStream() {
  if (microphoneStreaming) return
  microphoneStreaming = true
  try {
    await mic.start(handleMicrophoneFrame)
    voice.pushEvent('mic', 'Browser microphone stream started')
  } catch (error) {
    microphoneStreaming = false
    const detail = error instanceof Error ? error.message : String(error)
    voice.setError(detail)
    voiceSocket?.stop()
    voiceSocket = null
  }
}

function stopBrowserAudioStream() {
  microphoneStreaming = false
  mic.stop()
}

async function startListening() {
  if (starting.value || voice.serviceOnline) return
  starting.value = true
  voice.setState('connecting')

  try {
    voiceSocket = useVoiceSocket(
      {
        wsUrl: import.meta.env.VITE_VOICE_WS_URL || getDefaultVoiceWsUrl(),
        wakeWords: [],
        sampleRate: 16000
      },
      {
        onOpen: () => {
          voice.serviceOnline = true
          voice.setState('listening')
          void startBrowserAudioStream()
          voice.pushEvent('ready', `语音服务已就绪，请说"${voice.wakeWord}"唤醒`)
        },
        onClose: () => {
          stopBrowserAudioStream()
          voice.serviceOnline = false
          if (voice.state !== 'stopped') voice.setError('语音服务连接已断开')
        },
        onError: (message) => voice.setError(message),
        onEvent: handleGatewayEvent
      }
    )

    voiceSocket.connect()
  } catch (error) {
    voice.setError(error instanceof Error ? error.message : '语音服务启动失败')
  } finally {
    starting.value = false
  }
}

function stopListening() {
  window.clearTimeout(recognizingTimer)
  cancelRecording()
  stopBrowserAudioStream()
  activeSpeechAudio?.pause()
  activeSpeechAudio = null
  voiceSocket?.cancel()
  voiceSocket?.stop()
  voiceSocket = null
  voice.serviceOnline = false
  voice.conversationActive = false
  voice.setThinking(false)
  voice.setDialogVisible(false)
  voice.clearDialogMessages()
  voice.setState('stopped')
  voice.pushEvent('stop', '监听已停止')
}

function simulateWakeup() {
  window.clearTimeout(recognizingTimer)
  voiceSocket?.manualWakeup()
}

function forceShowDialog() {
  voice.conversationActive = true
  voice.setDialogVisible(true)
  voice.clearDialogMessages()
  voice.addDialogMessage('assistant', '弹窗已打开，可以开始对话了。')
  console.log('[DEBUG] dialog forced open, dialogVisible =', voice.dialogVisible)
}

function handleDialogSend(text: string) {
  if (isDialogInputDisabled.value) return
  voice.sendText(text)
  voice.setThinking(true)
  voiceSocket?.sendText(text)
}

function handleDialogClose() {
  cancelRecording()
  voice.conversationActive = false
  voice.setThinking(false)
  voice.setDialogVisible(false)
  voice.clearDialogMessages()
  voiceSocket?.cancel()
  voice.setState('listening')
  voice.pushEvent('standby', '对话已关闭，回到监听')
}

function handleDialogMinimize() {
  cancelRecording()
  voice.setDialogVisible(false)
}

async function handleLogout() {
  try {
    await logoutApi()
  } catch {
    // Logout API call failure is non-critical
  }
  stopListening()
  authStore.clearAuth()
  router.push('/login')
}

onMounted(async () => {
  updateDashboardScale()
  window.addEventListener('resize', updateDashboardScale)
  timer = window.setInterval(() => {
    clockText.value = formatClock()
  }, 1000)

  try {
    const config = await getConfig()
    voice.setWakeWord(config.wake_word || defaultWakeConfig.wake_word)
    voice.updateWakeConfig(config)
  } catch {
    // Use default wake word if config load fails
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDashboardScale)
  window.clearInterval(timer)
  stopListening()
})
</script>
