from pydantic import BaseModel, Field, HttpUrl


class WakeConfig(BaseModel):
    wake_word: str = "小智小智"
    wake_word_alternatives: list[str] = Field(default_factory=lambda: ["小智", "小志小志", "小知小知"])
    active_timeout: int = Field(default=40, ge=5, le=60)
    greeting_text: str = "你好，我是小智"
    voiceprint_enabled: bool = False
    voiceprint_users: list[str] = Field(default_factory=list)
    tts_voice: str = "zh-CN-XiaoxiaoNeural"
    tts_rate: str = "+0%"
    tts_volume: str = "+0%"
    explanation_words: dict[str, str] = Field(default_factory=dict)
    voice_ws_url: str = "ws://127.0.0.1:8766/api/v1/voice/ws"
    dialog_service_root: str = "http://101.43.17.8:5001"
    asr_engine: str = "mock"
    asr_timeout_seconds: int = Field(default=12, ge=5, le=30)
    tts_enabled: bool = True
    auto_listen: bool = False
    debug_events: bool = True
