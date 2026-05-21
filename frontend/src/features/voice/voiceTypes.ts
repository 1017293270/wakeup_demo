export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'wakeup'
  | 'recognizing'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'stopped'

export interface VoiceEventItem {
  id: string
  type: string
  text: string
  timestamp: number
}

export interface VoiceGatewayConfig {
  wsUrl: string
  wakeWords: string[]
  sampleRate: number
}

export interface GatewayEvent<T = Record<string, unknown>> {
  event: string
  requestId?: string
  data: T
}
