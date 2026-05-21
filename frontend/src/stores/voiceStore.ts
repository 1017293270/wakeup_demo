import { defineStore } from 'pinia'
import type { VoiceEventItem, VoiceState } from '../features/voice/voiceTypes'
import type { WakeConfig } from '../features/config/configSchema'
import { defaultWakeConfig } from '../features/config/configSchema'

interface DialogMessage {
  id: string
  role: 'user' | 'assistant' | 'status'
  text: string
}

interface VoiceStoreState {
  state: VoiceState
  sessionId: string
  transcript: string
  answer: string
  errorMessage: string
  serviceOnline: boolean
  events: VoiceEventItem[]
  hint: string
  conversationActive: boolean
  wakeWord: string
  dialogVisible: boolean
  dialogMessages: DialogMessage[]
  isThinking: boolean
  wakeConfig: WakeConfig
}

export const useVoiceStore = defineStore('voice', {
  state: (): VoiceStoreState => ({
    state: 'idle',
    sessionId: '',
    transcript: '',
    answer: '',
    errorMessage: '',
    serviceOnline: false,
    events: [],
    hint: '',
    conversationActive: false,
    wakeWord: '小智小智',
    dialogVisible: false,
    dialogMessages: [],
    isThinking: false,
    wakeConfig: { ...defaultWakeConfig }
  }),
  actions: {
    setState(state: VoiceState) {
      this.state = state
    },
    pushEvent(type: string, text: string) {
      this.events.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        text,
        timestamp: Date.now()
      })
      this.events = this.events.slice(0, 12)
    },
    setError(message: string) {
      this.errorMessage = message
      this.state = 'error'
      this.pushEvent('error', message)
    },
    setWakeWord(wakeWord: string) {
      this.wakeWord = wakeWord
    },
    sendText(text: string) {
      if (!text.trim()) return
      this.transcript = text
      this.setState('recognizing')
      this.pushEvent('asr', text)
    },
    setDialogVisible(visible: boolean) {
      this.dialogVisible = visible
    },
    addDialogMessage(role: 'user' | 'assistant' | 'status', text: string) {
      this.dialogMessages.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text
      })
    },
    clearDialogMessages() {
      this.dialogMessages = []
    },
    setThinking(thinking: boolean) {
      this.isThinking = thinking
    },
    updateWakeConfig(config: Partial<WakeConfig>) {
      this.wakeConfig = { ...this.wakeConfig, ...config }
    }
  }
})
