export function useVoiceSocket(config, handlers) {
    let ws = null;
    let reconnectTimer;
    let connected = false;
    function connect() {
        clearTimeout(reconnectTimer);
        ws = new WebSocket(config.wsUrl);
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
            connected = true;
            sendAction('startService');
            handlers.onOpen?.();
        };
        ws.onmessage = (message) => {
            if (typeof message.data !== 'string')
                return;
            try {
                const parsed = JSON.parse(message.data);
                handlers.onEvent({
                    event: parsed.event,
                    data: parsed.data || {}
                });
            }
            catch {
                handlers.onError?.('收到无法解析的语音服务消息');
            }
        };
        ws.onerror = () => {
            handlers.onError?.('语音服务连接异常');
        };
        ws.onclose = () => {
            connected = false;
            handlers.onClose?.();
        };
    }
    function sendAction(action, data) {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, data: data || {} }));
        }
    }
    function manualWakeup() {
        sendAction('manualWakeup');
    }
    function cancel() {
        sendAction('cancel');
    }
    function synthesize(text) {
        sendAction('tts', { text });
    }
    function sendText(text) {
        sendAction('textInput', { text });
    }
    function sendAudio(base64Audio) {
        sendAction('voiceInput', { audio: base64Audio });
    }
    function sendFrame(frame) {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(frame);
        }
    }
    function stop() {
        clearTimeout(reconnectTimer);
        ws?.close();
        ws = null;
        connected = false;
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
            return connected;
        }
    };
}
//# sourceMappingURL=useVoiceSocket.js.map