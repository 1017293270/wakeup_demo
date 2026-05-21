import type { GatewayEvent, VoiceGatewayConfig } from './voiceTypes'

interface VoiceSocketHandlers {
  onEvent: (event: GatewayEvent) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (message: string) => void
}

export function useVoiceSocket(config: VoiceGatewayConfig, handlers: VoiceSocketHandlers) {
  let ws: WebSocket | null = null
  let reconnectTimer: number | undefined
  let connected = false

  function connect() {
    clearTimeout(reconnectTimer)
    ws = new WebSocket(config.wsUrl)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      connected = true
      sendAction('startService')
      handlers.onOpen?.()
    }

    ws.onmessage = (message) => {
      if (typeof message.data !== 'string') return
      try {
        const parsed = JSON.parse(message.data)
        handlers.onEvent({
          event: parsed.event,
          data: parsed.data || {}
        })
      } catch {
        handlers.onError?.('收到无法解析的语音服务消息')
      }
    }

    ws.onerror = () => {
      handlers.onError?.('语音服务连接异常')
    }

    ws.onclose = () => {
      connected = false
      handlers.onClose?.()
    }
  }

  function sendAction(action: string, data?: Record<string, unknown>) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, data: data || {} }))
    }
  }

  function manualWakeup() {
    sendAction('manualWakeup')
  }

  function cancel() {
    sendAction('cancel')
  }

  function synthesize(text: string) {
    sendAction('tts', { text })
  }

  function sendText(text: string) {
    sendAction('textInput', { text })
  }

  function sendAudio(base64Audio: string) {
    sendAction('voiceInput', { audio: base64Audio })
  }

  function sendFrame(frame: ArrayBuffer) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(frame)
    }
  }

  function stop() {
    clearTimeout(reconnectTimer)
    ws?.close()
    ws = null
    connected = false
  }

  return {
    connect,
    stop,
    manualWakeup,
    cancel,
    synthesize,
    sendText,
    sendAudio,
    sendFrame,
    get connected() {
      return connected
    }
  }
}
