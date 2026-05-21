<template>
  <main class="dashboard-screen" :class="`dashboard-screen--${voice.state}`">
    <div class="screen-bg" aria-hidden="true" />
    <div class="screen-vignette" aria-hidden="true" />

    <div class="dashboard-canvas" :style="{ '--dashboard-scale': dashboardScale }">
    <header class="screen-header">
      <div class="screen-title">
        <span class="eyebrow">AI Native Voice Command Center</span>
        <h1>语音唤醒 AI 指挥舱</h1>
        <p>Live2D 数字人实时接入唤醒、识别、对话和播报链路。</p>
      </div>
      <nav class="screen-actions" aria-label="大屏操作">
        <StatusBadge :text="voice.serviceOnline ? '语音服务在线' : '语音服务未连接'" :tone="voice.serviceOnline ? 'ok' : 'warn'" />
        <StatusBadge :text="clockText" tone="active" />
        <RouterLink to="/config" class="screen-link" aria-label="配置中心">
          <svg class="settings-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          设置
        </RouterLink>
      </nav>
    </header>

    <section class="command-layout">
      <aside class="dashboard-rail dashboard-rail--left" aria-label="核心指标">
        <DataPanel title="核心指标" meta="今日实时">
          <KpiGrid :items="kpis" />
        </DataPanel>

        <DataPanel title="唤醒趋势" meta="24 小时">
          <DashboardChartPanel :option="trendOption" />
        </DataPanel>

        <DataPanel title="响应时长分布" meta="P95 1.9s">
          <DashboardChartPanel :option="latencyOption" />
        </DataPanel>
      </aside>

      <section class="command-stage" aria-label="Live2D 数字人状态">
        <div class="stage-metrics" aria-hidden="true">
          <span>{{ stageMetric.label }}</span>
          <strong>{{ stageMetric.value }}</strong>
        </div>

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

      <aside class="dashboard-rail dashboard-rail--right" aria-label="链路追踪">
        <DataPanel title="唤醒词分布" meta="今日">
          <DashboardChartPanel :option="pieOption" />
        </DataPanel>

        <DataPanel title="模型质量">
          <div class="quality-list">
            <div v-for="row in qualityRows" :key="row.label" :class="`quality-list__item--${row.status}`">
              <span>{{ row.label }}</span>
              <strong>{{ row.value }}</strong>
            </div>
          </div>
        </DataPanel>

        <DataPanel title="实时事件">
          <VoiceEventStream :events="voice.events" />
        </DataPanel>
      </aside>
    </section>

    <section class="signal-strip" aria-label="AI 执行链路">
      <article v-for="step in signalSteps" :key="step.key" class="signal-step" :class="`signal-step--${step.state}`">
        <span>{{ step.label }}</span>
        <strong>{{ step.detail }}</strong>
      </article>
    </section>

    <!-- DEBUG: 状态指示 -->
    <div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(0,0,0,0.8);color:#0f0;padding:8px 16px;border-radius:8px;font-size:12px;font-family:monospace">
      dialogVisible: {{ voice.dialogVisible }} | state: {{ voice.state }}
    </div>

    <FloatingChatDialog
      :visible="voice.dialogVisible"
      :online="voice.serviceOnline"
      :disabled="!voice.serviceOnline"
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
import type { EChartsOption } from 'echarts'
import DataPanel from '../../components/ui/DataPanel.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import DashboardChartPanel from '../../components/business/DashboardChartPanel.vue'
import Live2DAvatar from '../../components/business/Live2DAvatar.vue'
import WakeStatusPanel from '../../components/business/WakeStatusPanel.vue'
import VoiceEventStream from '../../components/business/VoiceEventStream.vue'
import FloatingChatDialog from '../../components/business/FloatingChatDialog.vue'
import KpiGrid from './components/KpiGrid.vue'
import { kpis, latencyBuckets, qualityRows, wakeTrend, wakeWordDistribution } from './mockDashboardData'
import { useVoiceSocket } from '../voice/useVoiceSocket'
import { useMicrophoneStream } from '../voice/useMicrophoneStream'
import { useVoiceStore } from '../../stores/voiceStore'
import type { GatewayEvent, VoiceState } from '../voice/voiceTypes'
import { getConfig } from '../../services/configApi'
import { defaultWakeConfig } from '../config/configSchema'

type SignalStepState = 'idle' | 'active' | 'done' | 'error'

const voice = useVoiceStore()
const clockText = ref(formatClock())
const starting = ref(false)
const dashboardScale = ref(1)
let voiceSocket: ReturnType<typeof useVoiceSocket> | null = null
let timer = 0
let recognizingTimer = 0
let activeSpeechAudio: HTMLAudioElement | null = null

// Push-to-talk recording state
const mic = useMicrophoneStream(16000)
const recording = ref(false)
const recordingVolume = ref(0)
const audioFrames: ArrayBuffer[] = []
let volumeTimer: number | undefined
let microphoneStreaming = false

function computeVolume(frame: ArrayBuffer): number {
  const view = new Int16Array(frame)
  let sumSquares = 0
  for (let i = 0; i < view.length; i++) {
    const normalized = view[i] / 32768
    sumSquares += normalized * normalized
  }
  const rms = Math.sqrt(sumSquares / view.length)
  return Math.min(1, rms * 5) // amplify and clamp to 0-1
}

function startRecording() {
  if (recording.value) return
  audioFrames.length = 0
  recording.value = true
  recordingVolume.value = 0
  voice.hint = '输入中...'
  if (microphoneStreaming) return
  mic.start((frame: ArrayBuffer) => {
    voiceSocket?.sendFrame(frame)
    if (recording.value) {
      audioFrames.push(frame.slice(0))
      recordingVolume.value = computeVolume(frame)
    }
  }).catch((err) => {
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

  // Concatenate all audio frames
  const totalLength = audioFrames.reduce((acc, frame) => acc + frame.byteLength, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const frame of audioFrames) {
    combined.set(new Uint8Array(frame), offset)
    offset += frame.byteLength
  }

  // Trim leading/trailing silence and normalize
  const samples = new Int16Array(combined.buffer)
  const SILENCE_THRESHOLD = 200 // 16-bit amplitude threshold

  // Find first non-silent sample
  let start = 0
  while (start < samples.length && Math.abs(samples[start]) < SILENCE_THRESHOLD) start++
  // Find last non-silent sample
  let end = samples.length - 1
  while (end > start && Math.abs(samples[end]) < SILENCE_THRESHOLD) end--

  // Keep some padding (100ms at 16kHz = 1600 samples)
  start = Math.max(0, start - 800)
  end = Math.min(samples.length - 1, end + 800)

  const trimmed = samples.slice(start, end + 1)

  // Normalize volume (peak to 80%)
  let peak = 0
  for (let i = 0; i < trimmed.length; i++) {
    const abs = Math.abs(trimmed[i])
    if (abs > peak) peak = abs
  }
  if (peak > 0 && peak < 8000) {
    const gain = Math.min(26000 / peak, 4.0) // max 4x boost
    for (let i = 0; i < trimmed.length; i++) {
      const v = trimmed[i] * gain
      trimmed[i] = Math.max(-32768, Math.min(32767, Math.round(v)))
    }
  }

  const processed = new Uint8Array(trimmed.buffer)

  // Convert to base64
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

  if (trimmed.length < 8000) { // less than 0.5s
    voice.pushEvent('standby', '录音太短，请重试')
    audioFrames.length = 0
    return
  }

  voice.pushEvent('asr', '正在识别语音...')
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
  voice.pushEvent('standby', '录音已取消')
}

// Expand state
const dialogExpanded = ref(false)

function toggleExpand() {
  dialogExpanded.value = !dialogExpanded.value
}

const DASHBOARD_DESIGN_WIDTH = 1920
const DASHBOARD_DESIGN_HEIGHT = 1080

const startLabel = computed(() => {
  if (starting.value) return '启动中'
  return voice.state === 'listening' ? '监听中' : '开启监听'
})

const isStartDisabled = computed(() => starting.value || voice.serviceOnline || ['connecting'].includes(voice.state))
const isStopDisabled = computed(() => voice.state === 'idle' || voice.state === 'stopped')

const stageMetric = computed(() => {
  if (voice.state === 'error') return { label: '链路告警', value: '检查' }
  if (voice.state === 'speaking') return { label: '本轮播报', value: 'TTS' }
  if (voice.state === 'thinking') return { label: 'AI 生成', value: 'RUN' }
  if (voice.state === 'wakeup' || voice.state === 'recognizing') return { label: '声纹命中', value: '0.94' }
  return { label: '今日唤醒', value: '2,324' }
})

const signalSteps = computed(() => {
  const order: VoiceState[] = ['wakeup', 'recognizing', 'thinking', 'speaking', 'listening']
  const activeIndex = order.indexOf(voice.state)
  const isError = voice.state === 'error'

  return [
    { key: 'wakeup', label: 'Wakeup', detail: '唤醒命中' },
    { key: 'asr', label: 'ASR', detail: '语音转写' },
    { key: 'dialog', label: 'Dialog', detail: '业务回答' },
    { key: 'tts', label: 'TTS', detail: '语音播报' },
    { key: 'standby', label: 'Standby', detail: '回到监听' }
  ].map((step, index) => {
    let state: SignalStepState = 'idle'
    if (isError) state = index <= 3 ? 'error' : 'idle'
    else if (activeIndex === index) state = 'active'
    else if (activeIndex > index || voice.state === 'listening') state = 'done'
    return { ...step, state }
  })
})

const chartTextColor = '#dbe7ff'
const axisStyle = { color: 'rgba(219, 231, 255, 0.18)' }
const splitStyle = { color: 'rgba(219, 231, 255, 0.1)' }

const trendOption = computed<EChartsOption>(() => ({
  color: ['#56f0ff', '#f7c873'],
  grid: { left: 38, right: 18, top: 30, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(6, 10, 18, 0.94)',
    borderColor: 'rgba(86, 240, 255, 0.32)',
    textStyle: { color: '#fff' }
  },
  xAxis: {
    type: 'category',
    data: wakeTrend.hours,
    axisLine: { lineStyle: axisStyle },
    axisTick: { show: false },
    axisLabel: { color: chartTextColor }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: splitStyle },
    axisLabel: { color: chartTextColor }
  },
  series: [
    {
      name: '唤醒',
      type: 'line',
      smooth: true,
      showSymbol: false,
      areaStyle: { opacity: 0.2 },
      data: wakeTrend.wakeups
    },
    {
      name: '对话',
      type: 'line',
      smooth: true,
      showSymbol: false,
      areaStyle: { opacity: 0.12 },
      data: wakeTrend.dialogs
    }
  ]
}))

const pieOption = computed<EChartsOption>(() => ({
  color: ['#56f0ff', '#f7c873', '#7cffc8', '#ff8aa0'],
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(6, 10, 18, 0.94)',
    borderColor: 'rgba(247, 200, 115, 0.28)',
    textStyle: { color: '#fff' }
  },
  series: [
    {
      type: 'pie',
      radius: ['54%', '74%'],
      center: ['50%', '52%'],
      label: { color: chartTextColor, formatter: '{b}\n{d}%' },
      labelLine: { lineStyle: { color: 'rgba(219, 231, 255, 0.34)' } },
      data: wakeWordDistribution
    }
  ]
}))

const latencyOption = computed<EChartsOption>(() => ({
  color: ['#7cffc8'],
  grid: { left: 36, right: 16, top: 20, bottom: 28 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(6, 10, 18, 0.94)',
    borderColor: 'rgba(124, 255, 200, 0.3)',
    textStyle: { color: '#fff' }
  },
  xAxis: {
    type: 'category',
    data: latencyBuckets.map((item) => item.name),
    axisLine: { lineStyle: axisStyle },
    axisTick: { show: false },
    axisLabel: { color: chartTextColor }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: splitStyle },
    axisLabel: { color: chartTextColor }
  },
  series: [
    {
      type: 'bar',
      barWidth: 18,
      itemStyle: { borderRadius: [8, 8, 2, 2] },
      data: latencyBuckets.map((item) => item.value)
    }
  ]
}))

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
    voice.pushEvent('wakeup', `唤醒成功：${wakeWord}`)
  }

  if (event.event === 'asrResult') {
    voice.transcript = String((event.data as { text?: string }).text || '')
    voice.setState('recognizing')
    voice.hint = ''
    voice.pushEvent('asr', voice.transcript || '语音转写完成')
    voice.addDialogMessage('user', voice.transcript)
    scheduleThinkingState()
  }

  if (event.event === 'dialogResult') {
    window.clearTimeout(recognizingTimer)
    const answer = String((event.data as { answer?: string }).answer || '')
    voice.answer = answer
    voice.hint = ''
    voice.setState('speaking')
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
    if (voice.state === 'stopped') return
    const reason = String((event.data as { reason?: string }).reason || '')
    // greeting 完成后保持弹窗，只有超时或取消才关闭
    if (reason === 'silence_timeout' || reason === 'cancelled') {
      voice.conversationActive = false
      voice.setDialogVisible(false)
    }
    voice.setState('listening')
    voice.pushEvent('standby', '已回到监听')
  }

  if (event.event === 'error') {
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
    await mic.start((frame: ArrayBuffer) => {
      voiceSocket?.sendFrame(frame)
      if (recording.value) {
        audioFrames.push(frame.slice(0))
        recordingVolume.value = computeVolume(frame)
      }
    })
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
        wsUrl: import.meta.env.VITE_VOICE_WS_URL || 'ws://127.0.0.1:8766/ws',
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
  voice.setDialogVisible(false)
  voice.clearDialogMessages()
  voice.setState('stopped')
  voice.pushEvent('stop', '监听已停止')
}

async function loginDialogWorkflow() {
  // voice-service 后端自动处理登录，无需前端调用
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
  voice.sendText(text)
  voiceSocket?.sendText(text)
}

function handleDialogClose() {
  cancelRecording()
  voice.conversationActive = false
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

onMounted(async () => {
  void loginDialogWorkflow()
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
