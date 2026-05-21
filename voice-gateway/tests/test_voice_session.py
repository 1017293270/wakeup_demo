import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

from app.ws_router import VoiceSession


class FakeWebSocket:
    def __init__(self):
        self.messages: list[dict] = []

    async def send_text(self, text):
        self.messages.append(json.loads(text))


class VoiceSessionTests(unittest.IsolatedAsyncioTestCase):
    async def test_start_preloads_greeting_tts_in_background(self):
        session = VoiceSession(FakeWebSocket())
        session.config.tts_enabled = True
        session.config.greeting_text = "你好"
        session.tts.synthesize = AsyncMock(return_value="data:audio/wav;base64,test")

        await session.start({"sampleRate": 16000, "channels": 1, "format": "pcm_s16le"}, "req_1")
        await asyncio.sleep(0)

        session.tts.synthesize.assert_awaited_once_with("你好", session.config)

    async def test_wakeup_timeout_returns_to_idle_after_configured_silence(self):
        session = VoiceSession(FakeWebSocket())
        session.config.active_timeout = 40
        session.config.tts_enabled = False

        await session._trigger_wakeup("小智小智", 0.98)

        with patch("app.ws_router.asyncio.sleep", new=AsyncMock()) as sleep:
            await session._watch_timeout()

        sleep.assert_awaited_with(40)
        self.assertEqual(session.state, "idle")
        self.assertEqual(session.websocket.messages[-1]["event"], "standby")
        self.assertEqual(session.websocket.messages[-1]["data"]["reason"], "silence_timeout")

    async def test_greeting_tts_returns_session_to_listening_for_free_conversation(self):
        session = VoiceSession(FakeWebSocket())
        session.config.tts_enabled = True
        session.config.greeting_text = "你好"
        session.tts.synthesize = AsyncMock(return_value="data:audio/wav;base64,test")

        await session._trigger_wakeup("小智小智", 0.98)

        self.assertEqual(session.state, "listening")
