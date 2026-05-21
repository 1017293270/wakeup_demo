import { defineStore } from 'pinia';
import { defaultWakeConfig } from '../features/config/configSchema';
export const useVoiceStore = defineStore('voice', {
    state: () => ({
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
        setState(state) {
            this.state = state;
        },
        pushEvent(type, text) {
            this.events.unshift({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type,
                text,
                timestamp: Date.now()
            });
            this.events = this.events.slice(0, 12);
        },
        setError(message) {
            this.errorMessage = message;
            this.state = 'error';
            this.pushEvent('error', message);
        },
        setWakeWord(wakeWord) {
            this.wakeWord = wakeWord;
        },
        sendText(text) {
            if (!text.trim())
                return;
            this.transcript = text;
            this.setState('recognizing');
            this.pushEvent('asr', text);
        },
        setDialogVisible(visible) {
            this.dialogVisible = visible;
        },
        addDialogMessage(role, text) {
            this.dialogMessages.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                role,
                text
            });
        },
        clearDialogMessages() {
            this.dialogMessages = [];
        },
        setThinking(thinking) {
            this.isThinking = thinking;
        },
        updateWakeConfig(config) {
            this.wakeConfig = { ...this.wakeConfig, ...config };
        }
    }
});
//# sourceMappingURL=voiceStore.js.map