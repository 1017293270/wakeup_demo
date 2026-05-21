import unittest
from unittest.mock import patch

from app.ws_router import voice_ws


class FakeDisconnectWebSocket:
    def __init__(self):
        self.accepted = False
        self.receive_count = 0

    async def accept(self):
        self.accepted = True

    async def receive(self):
        self.receive_count += 1
        return {"type": "websocket.disconnect", "code": 1000}

    async def send_text(self, text):
        raise AssertionError(f"unexpected send: {text}")


class VoiceWebSocketTests(unittest.IsolatedAsyncioTestCase):
    async def test_voice_ws_stops_after_disconnect_message(self):
        websocket = FakeDisconnectWebSocket()

        with patch("app.ws_router.VoiceSession"):
            await voice_ws(websocket)

        self.assertTrue(websocket.accepted)
        self.assertEqual(websocket.receive_count, 1)
