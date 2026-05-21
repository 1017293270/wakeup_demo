import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.asr.provider_baidu import BaiduRecognizer
from app.schemas.config import WakeConfig


class BaiduRecognizerTests(unittest.IsolatedAsyncioTestCase):
    async def test_recognize_pcm_returns_empty_text_when_baidu_request_times_out(self):
        recognizer = BaiduRecognizer()
        recognizer._token = "token"

        with patch("app.asr.provider_baidu.httpx.AsyncClient") as client_class:
            client = AsyncMock()
            client.post.side_effect = httpx.ConnectTimeout("connect timed out")
            client_class.return_value.__aenter__.return_value = client

            result = await recognizer.recognize_pcm(b"0" * 32000, WakeConfig(asr_engine="baidu"))

        self.assertEqual(result, "")
