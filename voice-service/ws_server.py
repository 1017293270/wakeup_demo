import asyncio
import base64
import json
import logging
import os

from fastapi import WebSocket, WebSocketDisconnect

from db import ConfigManager, HistoryManager
from tts_service import TTSService
from voice_pipeline import MAX_FRAME_BYTES, VoicePipeline
from voiceprint_service import voiceprint_service

logger = logging.getLogger(__name__)


class VoiceServer:
    def __init__(self):
        self.clients: set[WebSocket] = set()
        self.pipelines: dict[WebSocket, VoicePipeline] = {}
        self.tts_service: TTSService = TTSService()

    async def send_event(self, event: str, data: dict, target: WebSocket | None = None):
        message = json.dumps({"event": event, "data": data}, ensure_ascii=False)
        recipients = [target] if target is not None else list(self.clients)
        dead: set[WebSocket] = set()
        for ws in recipients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.clients.discard(ws)
            self.pipelines.pop(ws, None)

    async def handle_client(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
        logger.info("voice client connected; clients=%d", len(self.clients))

        try:
            while True:
                message = await ws.receive()
                if message.get("type") == "websocket.disconnect":
                    break

                frame = message.get("bytes")
                if frame is not None:
                    await self._dispatch_audio(ws, frame)
                    continue

                raw = message.get("text")
                if raw is None:
                    continue
                try:
                    await self._dispatch(ws, json.loads(raw))
                except json.JSONDecodeError:
                    await self.send_event("error", {"message": "invalid JSON message"}, ws)

        except WebSocketDisconnect:
            pass
        except Exception as exc:
            logger.error("voice client error: %s", exc, exc_info=True)
        finally:
            pipeline = self.pipelines.pop(ws, None)
            if pipeline:
                pipeline.stop()
            self.clients.discard(ws)
            logger.info("voice client disconnected; clients=%d", len(self.clients))

    async def _dispatch_audio(self, ws: WebSocket, frame: bytes):
        pipeline = self.pipelines.get(ws)
        if not pipeline:
            await self.send_event("error", {"message": "voice service is not started"}, ws)
            return
        if len(frame) > MAX_FRAME_BYTES:
            await self.send_event("error", {"code": "AUDIO_FRAME_TOO_LARGE", "message": "audio frame too large"}, ws)
            return
        pipeline.handle_audio_frame(frame)

    async def _dispatch(self, ws: WebSocket, msg: dict):
        action = msg.get("action")
        data = msg.get("data", {}) or {}
        logger.info("voice action=%r", action)

        if action == "startService":
            await self._on_start_service(ws)
        elif action == "manualWakeup":
            if pipeline := self.pipelines.get(ws):
                pipeline.manual_wakeup()
        elif action in {"cancel", "hangup"}:
            if pipeline := self.pipelines.get(ws):
                pipeline.cancel()
        elif action == "getConfig":
            await self.send_event("configResult", {"config": ConfigManager.get_all_config()}, ws)
        elif action == "saveConfig":
            await self._save_config(ws, data)
        elif action == "reloadConfig":
            await self._reload_config(ws)
        elif action == "getHistory":
            history = HistoryManager.get_history_list(data.get("page", 1), data.get("page_size", 20), data.get("keyword", ""))
            await self.send_event("historyResult", {"history": history}, ws)
        elif action == "clearHistory":
            HistoryManager.clear_history()
            await self.send_event("clearHistoryResult", {"success": True, "message": "history cleared"}, ws)
        elif action in {"textToSpeech", "tts"}:
            await self._text_to_speech(ws, str(data.get("text", "")))
        elif action == "textInput":
            text = str(data.get("text", "")).strip()
            if not text or ws not in self.pipelines:
                await self.send_event("error", {"message": "text is empty or voice service is not started"}, ws)
                return
            self.pipelines[ws].text_input(text)
        elif action == "voiceInput":
            await self._voice_input(ws, data)
        elif action == "registerVoiceprint":
            await self._register_voiceprint(ws, data)
        elif action == "deleteVoiceprint":
            await self._delete_voiceprint(ws, data)
        else:
            await self.send_event("error", {"message": f"unknown action: {action}"}, ws)

    async def _on_start_service(self, ws: WebSocket):
        if ws in self.pipelines:
            return

        loop = asyncio.get_running_loop()

        async def send_to_client(event: str, data: dict):
            await self.send_event(event, data, ws)

        pipeline = VoicePipeline(loop, send_to_client)
        self.pipelines[ws] = pipeline
        pipeline.start()

    async def _save_config(self, ws: WebSocket, data: dict):
        try:
            for key, value in (data.get("config", {}) or {}).items():
                ConfigManager.set_config(key, value)
            for pipeline in self.pipelines.values():
                pipeline.load_config()
            self.tts_service.load_config()
            await self.send_event("saveConfigResult", {"success": True, "message": "config saved"}, ws)
            await self.send_event("configUpdate", {"config": ConfigManager.get_all_config()})
        except Exception as exc:
            await self.send_event("saveConfigResult", {"success": False, "message": f"config save failed: {exc}"}, ws)

    async def _reload_config(self, ws: WebSocket):
        try:
            for pipeline in self.pipelines.values():
                pipeline.load_config()
            self.tts_service.load_config()
            await self.send_event("reloadConfigResult", {"success": True, "message": "config reloaded"}, ws)
        except Exception as exc:
            await self.send_event("reloadConfigResult", {"success": False, "message": f"config reload failed: {exc}"}, ws)

    async def _text_to_speech(self, ws: WebSocket, text: str):
        if not text.strip():
            await self.send_event("ttsResult", {"success": False, "message": "text cannot be empty"}, ws)
            return
        try:
            audio = await self.tts_service.speak_to_data_url(text)
            await self.send_event("ttsResult", {"success": True, "text": text, "audio": audio}, ws)
        except Exception as exc:
            logger.error("TTS failed: %s", exc, exc_info=True)
            await self.send_event("ttsResult", {"success": False, "message": f"TTS failed: {exc}"}, ws)

    async def _voice_input(self, ws: WebSocket, data: dict):
        audio_base64 = data.get("audio", "")
        pipeline = self.pipelines.get(ws)
        if not audio_base64 or not pipeline:
            await self.send_event("error", {"message": "audio is empty or voice service is not started"}, ws)
            return
        try:
            pipeline.voice_input(base64.b64decode(audio_base64))
        except Exception as exc:
            await self.send_event("error", {"message": f"voice input failed: {exc}"}, ws)

    async def _register_voiceprint(self, ws: WebSocket, data: dict):
        user_id = data.get("user_id", "")
        audio_base64 = data.get("audio", "")
        if not user_id or not audio_base64:
            await self.send_event("registerVoiceprintResult", {"success": False, "message": "user_id and audio are required"}, ws)
            return
        try:
            import tempfile
            from pydub import AudioSegment

            audio_data = base64.b64decode(audio_base64)
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as file:
                file.write(audio_data)
                tmp_webm = file.name
            audio = AudioSegment.from_file(tmp_webm, format="webm")
            audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            success, message = voiceprint_service.register_voiceprint(audio.raw_data, user_id)
            os.unlink(tmp_webm)
            await self.send_event("registerVoiceprintResult", {"success": success, "message": message}, ws)
        except Exception as exc:
            await self.send_event("registerVoiceprintResult", {"success": False, "message": f"register failed: {exc}"}, ws)

    async def _delete_voiceprint(self, ws: WebSocket, data: dict):
        user_id = data.get("user_id", "")
        if not user_id:
            await self.send_event("deleteVoiceprintResult", {"success": False, "message": "user_id is required"}, ws)
            return
        success, message = voiceprint_service.delete_voiceprint(user_id)
        await self.send_event("deleteVoiceprintResult", {"success": success, "message": message}, ws)


voice_server = VoiceServer()
