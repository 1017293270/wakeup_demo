from abc import ABC, abstractmethod

from app.schemas.config import WakeConfig


class TtsSynthesizer(ABC):
    @abstractmethod
    async def synthesize(self, text: str, config: WakeConfig) -> str:
        """Return a playable audio data URL."""
