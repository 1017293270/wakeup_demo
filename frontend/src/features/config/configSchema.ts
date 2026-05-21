export interface WakeConfig {
  wake_word: string
  wake_word_alternatives: string[]
  active_timeout: number
  greeting_text: string
  voiceprint_enabled: boolean
  voiceprint_users: string[]
  tts_voice: string
  tts_rate: string
  tts_volume: string
  explanation_words: Record<string, string>
  asr_corrections: Record<string, string>
  voice_ws_url: string
  dialog_service_root: string
  asr_engine: string
  asr_timeout_seconds: number
  tts_enabled: boolean
  auto_listen: boolean
  debug_events: boolean
}

export const defaultWakeConfig: WakeConfig = {
  wake_word: '小智小智',
  wake_word_alternatives: ['小智', '小志小志', '小知小知'],
  active_timeout: 40,
  greeting_text: '你好，我是小智',
  voiceprint_enabled: false,
  voiceprint_users: [],
  tts_voice: 'zh-CN-XiaoxiaoNeural',
  tts_rate: '+0%',
  tts_volume: '+0%',
  explanation_words: {
    welcome: '欢迎使用语音唤醒数据大屏'
  },
  asr_corrections: {},
  voice_ws_url: 'ws://127.0.0.1:8766/api/v1/voice/ws',
  dialog_service_root: 'http://101.43.17.8:7000/sz/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow',
  asr_engine: 'mock',
  asr_timeout_seconds: 12,
  tts_enabled: true,
  auto_listen: false,
  debug_events: true
}
