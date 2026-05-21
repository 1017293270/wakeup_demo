import base64
import logging

import httpx

from app.config import settings
from app.asr.recognizer import AsrRecognizer
from app.schemas.config import WakeConfig

logger = logging.getLogger(__name__)


class BaiduRecognizer(AsrRecognizer):
    def __init__(self):
        self._token: str | None = None

    async def _get_token(self) -> str:
        if self._token:
            return self._token

        if not settings.baidu_api_key or not settings.baidu_secret_key:
            raise RuntimeError("Baidu ASR credentials are not configured")

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://openapi.baidu.com/oauth/2.0/token",
                params={
                    "grant_type": "client_credentials",
                    "client_id": settings.baidu_api_key,
                    "client_secret": settings.baidu_secret_key,
                },
            )
            response.raise_for_status()
            payload = response.json()
            self._token = payload["access_token"]
            return self._token

    async def recognize_pcm(self, audio: bytes, config: WakeConfig) -> str:
        try:
            token = await self._get_token()
        except Exception as exc:
            logger.warning("Baidu ASR token unavailable: %s", exc)
            return ""

        logger.info("[BaiduASR] sending %d bytes audio to Baidu API", len(audio))
        payload = {
            "format": "pcm",
            "rate": 16000,
            "channel": 1,
            "cuid": "voice-wakeup-dashboard",
            "token": token,
            "speech": base64.b64encode(audio).decode("ascii"),
            "len": len(audio),
        }

        try:
            async with httpx.AsyncClient(timeout=config.asr_timeout_seconds) as client:
                response = await client.post("https://vop.baidu.com/server_api", json=payload)
                response.raise_for_status()
                data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Baidu ASR request failed: %s", exc)
            return ""

        if data.get("err_no") != 0:
            logger.warning("Baidu ASR returned error: err_no=%s err_msg=%s", data.get("err_no"), data.get("err_msg"))
            return ""

        result = data.get("result") or []
        recognized = str(result[0]).strip() if result else ""
        logger.info("[BaiduASR] recognized text: '%s'", recognized)
        return recognized
