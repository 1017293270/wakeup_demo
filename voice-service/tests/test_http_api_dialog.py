import importlib
import os
import sys
import types
import unittest
from unittest.mock import patch


class EnvLoadingTests(unittest.TestCase):
    def test_project_env_non_empty_values_override_existing_environment(self):
        os.environ["VOICE_MYSQL_HOST"] = "stale-host"
        os.environ["VOICE_MYSQL_USER"] = "stale-user"
        os.environ["VOICE_MYSQL_DATABASE"] = "stale-db"
        sys.modules.pop("config", None)

        import config

        config = importlib.reload(config)

        self.assertEqual(config.MYSQL_HOST, "8.137.162.40")
        self.assertEqual(config.MYSQL_USER, "app_user")
        self.assertEqual(config.MYSQL_DATABASE, "app_database")


class DialogAnswerTests(unittest.TestCase):
    def setUp(self):
        os.environ["VOICE_WORKFLOW_USERNAME"] = "admin"
        os.environ["VOICE_WORKFLOW_PASSWORD"] = "secret"
        sys.modules["db"] = types.SimpleNamespace(ConfigManager=object(), HistoryManager=object())
        import http_api

        self.http_api = importlib.reload(http_api)
        self.http_api.WORKFLOW_USERNAME = "admin"
        self.http_api.WORKFLOW_PASSWORD = "secret"

    def test_dialog_answer_logs_in_and_calls_wenshu_workflow(self):
        responses = [
            _FakeResponse({"success": True, "result": {"token": "token_123"}}),
            _FakeResponse({"success": True, "data": {"answer": "今天有 6 个事件"}}),
        ]

        with patch.object(self.http_api.requests, "post", side_effect=responses) as post:
            answer = self.http_api._dialog_answer("今天多少事件")

        self.assertEqual(answer, "今天有 6 个事件")
        post.assert_any_call(
            f"{self.http_api.WORKFLOW_BASE_URL.rstrip('/')}/sys/mLogin",
            json={"username": "admin", "password": "secret"},
            timeout=8,
            proxies={"http": None, "https": None},
        )
        post.assert_any_call(
            f"{self.http_api.WORKFLOW_BASE_URL.rstrip('/')}/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
            json={"content": "今天多少事件"},
            headers={"X-Access-Token": "token_123", "Authorization": "Bearer token_123"},
            timeout=30,
            proxies={"http": None, "https": None},
        )

    def test_dialog_answer_extracts_nested_response_text(self):
        answer = self.http_api._extract_dialog_answer({"data": {"content": "嵌套结果"}})

        self.assertEqual(answer, "嵌套结果")


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload
