import base64
import io
import wave

from app.schemas.config import WakeConfig
from app.tts.synthesizer import TtsSynthesizer


class EdgeTtsSynthesizer(TtsSynthesizer):
    async def synthesize(self, text: str, config: WakeConfig) -> str:
        if not text.strip():
            raise ValueError("Text is required")

        try:
            import edge_tts

            communicate = edge_tts.Communicate(
                text=text,
                voice=config.tts_voice,
                rate=config.tts_rate,
                volume=config.tts_volume,
            )
            chunks: list[bytes] = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
            if chunks:
                audio = base64.b64encode(b"".join(chunks)).decode("ascii")
                return f"data:audio/mpeg;base64,{audio}"
        except Exception:
            # Keep the product recoverable during offline development.
            return self._silent_wav_data_url()

        return self._silent_wav_data_url()

    def _silent_wav_data_url(self) -> str:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)
            wav.writeframes(b"\x00\x00" * 8000)
        audio = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:audio/wav;base64,{audio}"
