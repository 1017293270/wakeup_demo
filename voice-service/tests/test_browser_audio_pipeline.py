import asyncio
import importlib
import sys
import types
import unittest


def install_fakes():
    db = types.ModuleType("db")

    class ConfigManager:
        values = {
            "wake_word": "hello",
            "wake_word_alternatives": ["hi"],
            "active_timeout": 15,
            "voiceprint_enabled": False,
            "greeting_text": "ready",
        }

        @classmethod
        def get_config(cls, key, default=None):
            return cls.values.get(key, default)

        @staticmethod
        def get_all_config():
            return {}

        @staticmethod
        def set_config(*args, **kwargs):
            return True

    class HistoryManager:
        @staticmethod
        def add_history(*args, **kwargs):
            return 1

        @staticmethod
        def get_history_list(*args, **kwargs):
            return {"list": []}

        @staticmethod
        def clear_history():
            return True

    db.ConfigManager = ConfigManager
    db.HistoryManager = HistoryManager
    sys.modules["db"] = db

    asr_service = types.ModuleType("asr_service")

    class ASRService:
        def __init__(self):
            self.inputs = []

        def set_corrections(self, corrections):
            pass

        def get_microphone(self):
            raise AssertionError("server microphone must not be opened")

        def recognize(self, audio):
            self.inputs.append(audio)
            return "hello"

    asr_service.ASRService = ASRService
    sys.modules["asr_service"] = asr_service

    tts_service = types.ModuleType("tts_service")

    class TTSService:
        async def speak_to_data_url(self, text):
            return "data:audio/mp3;base64,test"

        async def speak(self, text):
            return True

        def load_config(self):
            pass

    tts_service.TTSService = TTSService
    sys.modules["tts_service"] = tts_service

    voiceprint_service = types.ModuleType("voiceprint_service")
    voiceprint_service.voiceprint_service = object()
    sys.modules["voiceprint_service"] = voiceprint_service


class FakeWebSocket:
    def __init__(self, messages):
        self.messages = list(messages)
        self.sent = []
        self.accepted = False

    async def accept(self):
        self.accepted = True

    async def receive(self):
        if self.messages:
            return self.messages.pop(0)
        return {"type": "websocket.disconnect", "code": 1000}

    async def send_text(self, message):
        self.sent.append(message)


class BrowserAudioPipelineTests(unittest.TestCase):
    def setUp(self):
        install_fakes()
        for name in ["voice_pipeline", "ws_server"]:
            sys.modules.pop(name, None)

    def test_start_does_not_open_server_microphone(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        events = []

        async def send_event(event, data):
            events.append((event, data))

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline.start()
            loop.run_until_complete(asyncio.sleep(0.01))
            self.assertTrue(pipeline._running)
            self.assertIsNone(getattr(pipeline, "_mic", None))
        finally:
            pipeline.stop()
            loop.close()

    def test_browser_pcm_frames_can_trigger_wakeup(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        events = []

        async def send_event(event, data):
            events.append((event, data))

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline.start()
            for _ in range(8):
                pipeline.handle_audio_frame(b"\x01\x00" * 4000)
            loop.run_until_complete(asyncio.sleep(0.2))
            self.assertTrue(any(event == "wakeup" for event, _ in events))
        finally:
            pipeline.stop()
            loop.close()

    def test_live_audio_frames_are_ignored_after_wakeup_until_push_to_talk(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        processed = []

        async def send_event(event, data):
            pass

        def frame(sample, seconds=0.1):
            sample_count = int(voice_pipeline.SAMPLE_RATE * seconds)
            return int(sample).to_bytes(2, "little", signed=True) * sample_count

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline._running = True
            pipeline._state = "waiting_for_ptt"
            pipeline._process_command_async = lambda audio: processed.append(audio)

            for _ in range(30):
                pipeline.handle_audio_frame(frame(1200))

            self.assertEqual(processed, [])

            for _ in range(8):
                pipeline.handle_audio_frame(frame(0))

            self.assertEqual(processed, [])
        finally:
            pipeline.stop()
            loop.close()

    def test_push_to_talk_audio_is_processed_after_wakeup(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        processed = []

        async def send_event(event, data):
            pass

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline._running = True
            pipeline._state = "waiting_for_ptt"
            pipeline._process_command_async = lambda audio: processed.append(audio)

            pipeline.voice_input(b"\x01\x00" * 16000)

            self.assertEqual(len(processed), 1)
            self.assertEqual(processed[0], b"\x01\x00" * 16000)
        finally:
            pipeline.stop()
            loop.close()

    def test_text_input_is_ignored_while_command_is_processing(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        events = []
        processed = []

        async def send_event(event, data):
            events.append((event, data))

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline._running = True
            pipeline._state = "processing_command"
            pipeline._processing_command = True
            pipeline._process_text_async = lambda text: processed.append(text)

            pipeline.text_input("今天多少咨询?")
            loop.run_until_complete(asyncio.sleep(0.01))

            self.assertEqual(processed, [])
            self.assertTrue(any(event == "standby" and data.get("reason") == "busy" for event, data in events))
        finally:
            pipeline.stop()
            loop.close()

    def test_push_to_talk_is_ignored_while_command_is_processing(self):
        voice_pipeline = importlib.import_module("voice_pipeline")
        events = []
        processed = []

        async def send_event(event, data):
            events.append((event, data))

        loop = asyncio.new_event_loop()
        try:
            pipeline = voice_pipeline.VoicePipeline(loop, send_event)
            pipeline._running = True
            pipeline._state = "processing_command"
            pipeline._processing_command = True
            pipeline._process_command_async = lambda audio: processed.append(audio)

            pipeline.voice_input(b"\x01\x00" * 16000)
            loop.run_until_complete(asyncio.sleep(0.01))

            self.assertEqual(processed, [])
            self.assertTrue(any(event == "standby" and data.get("reason") == "busy" for event, data in events))
        finally:
            pipeline.stop()
            loop.close()

    def test_websocket_binary_frames_are_dispatched_to_pipeline(self):
        ws_server = importlib.import_module("ws_server")

        class Pipeline:
            frames = []

            def __init__(self, loop, send_event):
                self.loop = loop
                self.send_event = send_event

            def start(self):
                pass

            def stop(self):
                pass

            def handle_audio_frame(self, frame):
                self.frames.append(frame)

        ws_server.VoicePipeline = Pipeline
        server = ws_server.VoiceServer()
        socket = FakeWebSocket([
            {"type": "websocket.receive", "text": '{"action":"startService"}'},
            {"type": "websocket.receive", "bytes": b"\x01\x00\x02\x00"},
            {"type": "websocket.disconnect", "code": 1000},
        ])

        asyncio.run(server.handle_client(socket))

        self.assertTrue(socket.accepted)
        self.assertEqual(Pipeline.frames, [b"\x01\x00\x02\x00"])


if __name__ == "__main__":
    unittest.main()
