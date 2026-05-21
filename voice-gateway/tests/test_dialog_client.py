import unittest
from unittest.mock import AsyncMock, patch

from app.dialog.client import DialogClient
from app.schemas.config import WakeConfig


class DialogClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_ask_logs_in_and_posts_content_to_workflow(self):
        client = DialogClient(username="admin", password="secret")
        http_client = AsyncMock()
        http_client.post.side_effect = [
            _FakeResponse({"success": True, "result": {"token": "token_123"}}),
            _FakeResponse({"success": True, "message": "\n今天有66个事件。"}),
        ]

        with patch("app.dialog.client.httpx.AsyncClient") as client_class:
            client_class.return_value.__aenter__.return_value = http_client

            result = await client.ask("今天有多少事件", "sess_1", WakeConfig())

        self.assertEqual(result["answer"], "\n今天有66个事件。")
        http_client.post.assert_any_await(
            "http://101.43.17.8:7000/sz/sys/mLogin",
            json={"username": "admin", "password": "secret"},
        )
        http_client.post.assert_any_await(
            "http://101.43.17.8:7000/sz/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
            json={"content": "今天有多少事件"},
            headers={"X-Access-Token": "token_123", "Authorization": "Bearer token_123"},
        )

    async def test_login_requires_password_configuration(self):
        client = DialogClient(username="admin", password="")

        result = await client.login(force=True)

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "WORKFLOW_PASSWORD_MISSING")


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload
