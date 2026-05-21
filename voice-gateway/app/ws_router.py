import asyncio
import json
import logging
import time
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.asr.factory import create_recognizer
from app.dialog.client import DialogClient
from app.schemas.config import WakeConfig
from app.schemas.events import ClientMessage, StartMessageData
from app.storage.config_store import config_store
from app.storage.history_store import history_store
from app.tts.provider_edge import EdgeTtsSynthesizer
from app.wakeup.detector import WakeupDetector

logger = logging.getLogger(__name__)
router = APIRouter()


class VoiceSession:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.session_id = f"sess_{uuid4().hex[:12]}"
        self.config = config_store.load()
        self.recognizer = create_recognizer(self.config)
        self.detector = WakeupDetector(self.config)
        self.dialog = DialogClient()
        self.tts = EdgeTtsSynthesizer()
        self.started = False
        self.state = "idle"
        self.wake_buffer = bytearray()
        self.command_buffer = bytearray()
        self.processing = False
        self.last_active_at = time.time()
        self.timeout_task: asyncio.Task | None = None
        self.greeting_preload_task: asyncio.Task | None = None
        self.greeting_audio_cache: dict[str, str] = {}

    async def send(self, event: str, data: dict, request_id: str | None = None) -> None:
        payload = {"event": event, "data": data}
        if request_id:
            payload["requestId"] = request_id
        await self.websocket.send_text(json.dumps(payload, ensure_ascii=False))

    async def start(self, data: dict, request_id: str | None) -> None:
        try:
            start_data = StartMessageData(**data)
        except ValidationError as exc:
            await self.error("AUDIO_FORMAT_INVALID", "启动参数不正确", {"errors": exc.errors()}, request_id)
            return

        if start_data.sampleRate != 16000 or start_data.channels != 1 or start_data.format != "pcm_s16le":
            await self.error("AUDIO_FORMAT_INVALID", "音频格式必须为 16kHz mono PCM signed 16-bit little-endian", {}, request_id)
            return

        if start_data.wakeWords:
            self.config.wake_word = start_data.wakeWords[0]
            self.config.wake_word_alternatives = start_data.wakeWords[1:] or self.config.wake_word_alternatives
            self.detector = WakeupDetector(self.config)

        self.started = True
        self.state = "idle"
        logger.info(
            "[VoiceSession] session=%s state=idle asr_engine=%s wake_word=%s alternatives=%s",
            self.session_id, self.config.asr_engine, self.config.wake_word, self.config.wake_word_alternatives,
        )
        await self.send("ready", {"sessionId": self.session_id}, request_id)
        self._preload_greeting()

    async def stop(self, request_id: str | None = None) -> None:
        self.started = False
        self.state = "stopped"
        self._cancel_timeout()
        self._cancel_greeting_preload()
        await self.send("closed", {"sessionId": self.session_id, "reason": "client_stop"}, request_id)

    async def handle_audio(self, frame: bytes) -> None:
        if not self.started or not frame:
            return
        if len(frame) > 8192:
            await self.error("AUDIO_FRAME_TOO_LARGE", "音频帧过大", {"size": len(frame)})
            return

        self.last_active_at = time.time()

        if self.state == "idle":
            logger.debug("[VoiceSession] session=%s state=idle recv frame size=%d", self.session_id, len(frame))
            await self._handle_wakeup_audio(frame)
            return

        if self.state == "listening":
            await self._handle_command_audio(frame)

    async def _handle_wakeup_audio(self, frame: bytes) -> None:
        self.wake_buffer.extend(frame)

        if self.config.asr_engine == "mock":
            if self.detector.detect_mock_audio(frame):
                logger.info("[Wakeup] session=%s mock wakeup triggered (bytes_seen=%d)", self.session_id, self.detector._bytes_seen)
                await self._trigger_wakeup(self.config.wake_word, 1.0)
            return

        if len(self.wake_buffer) < 64000:
            return

        logger.info(
            "[Wakeup] session=%s sending %d bytes to ASR (engine=%s)",
            self.session_id, len(self.wake_buffer), self.config.asr_engine,
        )
        text = await self.recognizer.recognize_pcm(bytes(self.wake_buffer), self.config)
        self.wake_buffer.clear()
        logger.info("[Wakeup] session=%s ASR result: text='%s' (len=%d)", self.session_id, text, len(text))
        if text and self.detector.detect_by_text(text):
            logger.info("[Wakeup] session=%s WAKE WORD MATCHED! word='%s'", self.session_id, self.config.wake_word)
            await self._trigger_wakeup(self.config.wake_word, 0.92)
        else:
            logger.info("[Wakeup] session=%s no wake word detected, back to idle", self.session_id)

    async def _trigger_wakeup(self, wake_word: str, confidence: float) -> None:
        self.state = "listening"
        self.wake_buffer.clear()
        self.command_buffer.clear()
        self._reset_timeout()
        await self.send(
            "wakeup",
            {
                "sessionId": self.session_id,
                "wakeWord": wake_word,
                "confidence": confidence,
                "timestamp": int(time.time() * 1000),
            },
        )

        if self.config.tts_enabled and self.config.greeting_text:
            await self._synthesize_and_send(self.config.greeting_text)

    async def _handle_command_audio(self, frame: bytes) -> None:
        if self.processing:
            return

        self.command_buffer.extend(frame)
        if len(self.command_buffer) < 64000:
            return

        self.processing = True
        self.state = "recognizing"
        self._reset_timeout()
        audio = bytes(self.command_buffer)
        self.command_buffer.clear()

        try:
            text = await self.recognizer.recognize_pcm(audio, self.config)
            if not text:
                logger.info("[VoiceSession] session=%s ASR returned empty result", self.session_id)
                await self.error("ASR_EMPTY", "没有识别到有效语音，请重试")
                return

            logger.info("[VoiceSession] session=%s command ASR result: text='%s'", self.session_id, text)
            await self.send(
                "asrResult",
                {"sessionId": self.session_id, "text": text, "isFinal": True, "timestamp": int(time.time() * 1000)},
            )

            self.state = "thinking"
            try:
                dialog_result = await self.dialog.ask(text, self.session_id, self.config)
                answer = dialog_result["answer"]
                logger.info("[VoiceSession] session=%s dialog answer: text='%s'", self.session_id, answer)
            except Exception as exc:
                logger.error("[VoiceSession] session=%s dialog service call failed: %s", self.session_id, exc)
                answer = f'我已识别到"{text}"。当前对话服务暂不可用，请稍后重试。'

            await self.send(
                "dialogResult",
                {
                    "sessionId": self.session_id,
                    "question": text,
                    "answer": answer,
                    "timestamp": int(time.time() * 1000),
                },
            )

            if self.config.tts_enabled:
                try:
                    await self._synthesize_and_send(answer)
                except Exception as exc:
                    logger.error("[VoiceSession] session=%s TTS failed: %s", self.session_id, exc)

            history_store.append(
                {
                    "wake_word": self.config.wake_word,
                    "instruction_text": text,
                    "tts_text": answer,
                    "status": "success",
                    "duration": round(time.time() - self.last_active_at, 2),
                }
            )
            self.state = "listening"
            self._reset_timeout()
        except Exception as exc:
            logger.error("[VoiceSession] session=%s command audio processing failed: %s", self.session_id, exc)
            await self.error("COMMAND_PROCESSING_ERROR", f"指令处理失败：{exc}")
        finally:
            self.processing = False

    async def _synthesize_and_send(self, text: str) -> None:
        previous_state = self.state
        self.state = "speaking"
        await self.send("ttsStatus", {"sessionId": self.session_id, "status": "start", "text": text})
        audio = self.greeting_audio_cache.get(self._tts_cache_key(text))
        if not audio:
            audio = await self.tts.synthesize(text, self.config)
        await self.send(
            "ttsResult",
            {"sessionId": self.session_id, "success": True, "text": text, "audio": audio, "format": "data-url"},
        )
        await self.send("ttsStatus", {"sessionId": self.session_id, "status": "end", "text": text})
        self.state = previous_state

    async def handle_tts(self, data: dict, request_id: str | None) -> None:
        text = str(data.get("text", "")).strip()
        if not text:
            await self.error("TEXT_REQUIRED", "文字转语音文本不能为空", {}, request_id)
            return
        await self._synthesize_and_send(text)

    async def error(self, code: str, message: str, details: dict | None = None, request_id: str | None = None) -> None:
        await self.send("error", {"code": code, "message": message, "details": details or {}}, request_id)

    def _reset_timeout(self) -> None:
        self._cancel_timeout()
        self.timeout_task = asyncio.create_task(self._watch_timeout())

    def _cancel_timeout(self) -> None:
        if self.timeout_task and not self.timeout_task.done():
            self.timeout_task.cancel()
        self.timeout_task = None

    def _preload_greeting(self) -> None:
        self._cancel_greeting_preload()
        if not self.config.tts_enabled or not self.config.greeting_text:
            return
        self.greeting_preload_task = asyncio.create_task(self._preload_greeting_audio())

    async def _preload_greeting_audio(self) -> None:
        text = self.config.greeting_text
        key = self._tts_cache_key(text)
        if key in self.greeting_audio_cache:
            return
        try:
            self.greeting_audio_cache[key] = await self.tts.synthesize(text, self.config)
        except Exception as exc:
            logger.warning("Greeting TTS preload failed: %s", exc)

    def _cancel_greeting_preload(self) -> None:
        if self.greeting_preload_task and not self.greeting_preload_task.done():
            self.greeting_preload_task.cancel()
        self.greeting_preload_task = None

    def _tts_cache_key(self, text: str) -> str:
        return "|".join([text, self.config.tts_voice, self.config.tts_rate, self.config.tts_volume])

    async def _watch_timeout(self) -> None:
        await asyncio.sleep(self.config.active_timeout)
        if self.state in {"listening", "recognizing", "thinking", "speaking"}:
            self.state = "idle"
            self.command_buffer.clear()
            self.detector.reset()
            await self.send("standby", {"sessionId": self.session_id, "reason": "silence_timeout"})


@router.websocket("/api/v1/voice/ws")
async def voice_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    session = VoiceSession(websocket)
    logger.info("voice session connected: %s", session.session_id)

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                logger.info("voice session disconnected: %s", session.session_id)
                break

            if "bytes" in message and message["bytes"] is not None:
                await session.handle_audio(message["bytes"])
                continue

            raw_text = message.get("text")
            if raw_text is None:
                continue

            try:
                client_message = ClientMessage(**json.loads(raw_text))
            except Exception:
                await session.error("PROTOCOL_INVALID", "WebSocket 消息格式不正确")
                continue

            if client_message.type == "start":
                await session.start(client_message.data, client_message.requestId)
            elif client_message.type == "stop":
                await session.stop(client_message.requestId)
            elif client_message.type == "tts":
                await session.handle_tts(client_message.data, client_message.requestId)
            else:
                await session.error("ACTION_UNKNOWN", f"未知指令：{client_message.type}", request_id=client_message.requestId)
    except WebSocketDisconnect:
        logger.info("voice session disconnected: %s", session.session_id)
    finally:
        session._cancel_timeout()
        session._cancel_greeting_preload()
