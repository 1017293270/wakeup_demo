from abc import ABC, abstractmethod

from app.schemas.config import WakeConfig


class AsrRecognizer(ABC):
    @abstractmethod
    async def recognize_pcm(self, audio: bytes, config: WakeConfig) -> str:
        """Recognize 16kHz mono PCM signed 16-bit audio."""


class MockRecognizer(AsrRecognizer):
    async def recognize_pcm(self, audio: bytes, config: WakeConfig) -> str:
        if len(audio) < 8000:
            return ""
        return "今天数据概览"
