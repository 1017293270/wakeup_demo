export const defaultWakeConfig = {
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
    voice_ws_url: 'ws://127.0.0.1:8766/api/v1/voice/ws',
    dialog_service_root: 'http://101.43.17.8:7000/sz/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow',
    asr_engine: 'mock',
    asr_timeout_seconds: 12,
    tts_enabled: true,
    auto_listen: false,
    debug_events: true
};
//# sourceMappingURL=configSchema.js.map