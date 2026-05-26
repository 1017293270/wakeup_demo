import importlib
import os
import sys
import types
import unittest
from unittest.mock import patch


def install_fakes():
    db = types.ModuleType("db")

    class ConfigManager:
        @staticmethod
        def get_config(key, default=None):
            return default

    db.ConfigManager = ConfigManager
    sys.modules["db"] = db

    asr_service = types.ModuleType("asr_service")
    asr_service.ASRService = object
    sys.modules["asr_service"] = asr_service

    tts_service = types.ModuleType("tts_service")
    tts_service.TTSService = object
    sys.modules["tts_service"] = tts_service


class VoicePipelineDialogTests(unittest.TestCase):
    def setUp(self):
        install_fakes()
        os.environ["VOICE_WORKFLOW_PASSWORD"] = "secret"
        sys.modules.pop("config", None)
        sys.modules.pop("voice_pipeline", None)
        self.voice_pipeline = importlib.import_module("voice_pipeline")

    def test_dialog_client_uses_access_token_and_extracts_nested_answer(self):
        responses = [
            _FakeResponse({"success": True, "result": {"accessToken": "token_123"}}),
            _FakeResponse({"success": True, "data": {"content": "今天有 6 个事件"}}),
        ]
        client = self.voice_pipeline.DialogClient("http://example.test/sz", "admin", "secret")

        with patch.object(self.voice_pipeline.requests, "post", side_effect=responses) as post:
            answer = client.ask("今天多少事件")

        self.assertEqual(answer, "今天有 6 个事件")
        post.assert_any_call(
            "http://example.test/sz/sys/mLogin",
            json={"username": "admin", "password": "secret"},
            timeout=10,
            proxies={"http": None, "https": None},
        )
        post.assert_any_call(
            "http://example.test/sz/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
            json={"content": "今天多少事件"},
            headers={"X-Access-Token": "token_123", "Authorization": "Bearer token_123"},
            timeout=30,
            proxies={"http": None, "https": None},
        )

    def test_empty_dialog_answer_uses_clear_service_message(self):
        pipeline = self.voice_pipeline.VoicePipeline.__new__(self.voice_pipeline.VoicePipeline)
        pipeline.dialog = types.SimpleNamespace(ask=lambda question: "")

        answer = pipeline._ask_dialog_or_service_message("今天多少咨询?")

        self.assertEqual(answer, self.voice_pipeline.DIALOG_EMPTY_ANSWER_MESSAGE)


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload
        self.status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


if __name__ == "__main__":
    unittest.main()
