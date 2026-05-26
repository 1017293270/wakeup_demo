import asyncio
import logging
import threading
import time

import requests
import speech_recognition as sr

from asr_service import ASRService
from config import GREETING_TEXT, WORKFLOW_BASE_URL, WORKFLOW_PASSWORD, WORKFLOW_USERNAME
from db import ConfigManager
from tts_service import TTSService

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 50 * 60
SAMPLE_RATE = 16000
SAMPLE_WIDTH = 2
MAX_FRAME_BYTES = 8192
WAKE_CHUNK_BYTES = SAMPLE_RATE * SAMPLE_WIDTH * 2
COMMAND_CHUNK_BYTES = SAMPLE_RATE * SAMPLE_WIDTH * 3
MAX_WAKE_BUFFER_BYTES = SAMPLE_RATE * SAMPLE_WIDTH * 8
MAX_COMMAND_BUFFER_BYTES = SAMPLE_RATE * SAMPLE_WIDTH * 10
COMMAND_SPEECH_RMS_THRESHOLD = 300
COMMAND_TRAILING_SILENCE_BYTES = int(SAMPLE_RATE * SAMPLE_WIDTH * 0.8)
COMMAND_PRE_SPEECH_BYTES = int(SAMPLE_RATE * SAMPLE_WIDTH * 0.3)
COMMAND_MIN_AUDIO_BYTES = int(SAMPLE_RATE * SAMPLE_WIDTH * 0.4)
DIALOG_EMPTY_ANSWER_MESSAGE = "问数服务暂时没有返回可展示内容，请稍后重试。"


class DialogClient:
    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self._token = ""
        self._token_expires_at = 0.0
        self._lock = threading.Lock()

    def _login(self, force: bool = False) -> str:
        if self._token and not force and time.time() < self._token_expires_at:
            return self._token

        if not self.password:
            logger.warning("Dialog service password is empty; login skipped")
            return ""

        try:
            response = requests.post(
                f"{self.base_url}/sys/mLogin",
                json={"username": self.username, "password": self.password},
                timeout=10,
                proxies={"http": None, "https": None},
            )
            response.raise_for_status()
            data = response.json()
            token = self._extract_token(data)
            if not token:
                logger.warning("Dialog login response did not include a token")
                return ""

            self._token = token
            self._token_expires_at = time.time() + TOKEN_TTL_SECONDS
            return token
        except Exception as exc:
            logger.warning("Dialog service login failed: %s", exc)
            return ""

    def ask(self, question: str, retried: bool = False) -> str:
        token = self._login(force=retried)
        if not token:
            return ""

        try:
            response = requests.post(
                f"{self.base_url}/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
                json={"content": question},
                headers={"X-Access-Token": token, "Authorization": f"Bearer {token}"},
                timeout=30,
                proxies={"http": None, "https": None},
            )
            response.raise_for_status()
            data = response.json()
            return self._extract_answer(data)
        except requests.HTTPError as exc:
            if response.status_code in (401, 403) and not retried:
                with self._lock:
                    self._token = ""
                return self.ask(question, retried=True)
            logger.warning("Dialog service request failed: %s", exc)
            return ""
        except Exception as exc:
            logger.warning("Dialog service request error: %s", exc)
            return ""

    @staticmethod
    def _extract_token(data: dict) -> str:
        candidates = [
            data.get("token"),
            data.get("accessToken"),
            data.get("result", {}).get("token") if isinstance(data.get("result"), dict) else None,
            data.get("result", {}).get("accessToken") if isinstance(data.get("result"), dict) else None,
            data.get("data", {}).get("token") if isinstance(data.get("data"), dict) else None,
            data.get("data", {}).get("accessToken") if isinstance(data.get("data"), dict) else None,
        ]
        return next((str(item) for item in candidates if item), "")

    @classmethod
    def _extract_answer(cls, data) -> str:
        if data is None:
            return ""
        if isinstance(data, str):
            return data
        if isinstance(data, (int, float, bool)):
            return str(data)
        if isinstance(data, list):
            parts = [cls._extract_answer(item) for item in data]
            return "\n".join(part for part in parts if part)
        if not isinstance(data, dict):
            return str(data)

        for key in ("message", "result", "data", "answer", "reply", "content", "text", "output"):
            answer = cls._extract_answer(data.get(key))
            if answer:
                return answer
        return ""


class VoicePipeline:
    def __init__(self, loop: asyncio.AbstractEventLoop, send_event_fn):
        self.loop = loop
        self.send_event = send_event_fn
        self.asr = ASRService()
        self.tts = TTSService()
        self.dialog = DialogClient(WORKFLOW_BASE_URL, WORKFLOW_USERNAME, WORKFLOW_PASSWORD)
        self._state = "idle"
        self._lock = threading.Lock()
        self._running = False
        self._silence_timer: threading.Timer | None = None
        self._wake_buffer = bytearray()
        self._command_buffer = bytearray()
        self._command_has_speech = False
        self._command_silence_bytes = 0
        self._recognizing_wake = False
        self._processing_command = False
        self._cancel_processing = False
        self._last_audio_at = 0.0
        self.load_config()

    def load_config(self):
        self.WAKE_WORD = ConfigManager.get_config("wake_word", "小智小智")
        self.WAKE_WORD_ALTERNATIVES = ConfigManager.get_config("wake_word_alternatives", ["小智"])
        self.ACTIVE_TIMEOUT = ConfigManager.get_config("active_timeout", 40)
        self.VOICEPRINT_ENABLED = ConfigManager.get_config("voiceprint_enabled", False)
        self.GREETING_TEXT = ConfigManager.get_config("greeting_text", GREETING_TEXT)
        corrections = ConfigManager.get_config("asr_corrections", None)
        if corrections and isinstance(corrections, dict):
            self.asr.set_corrections(corrections)
        logger.info("Voice config loaded: wake_word=%s timeout=%s", self.WAKE_WORD, self.ACTIVE_TIMEOUT)

    def start(self):
        if self._running:
            return
        self._running = True
        self._state = "idle"
        self._async_send("ready", {"hint": "voice service ready; stream browser PCM audio"})
        logger.info("Voice pipeline started in browser-audio mode")

    def stop(self):
        self._running = False
        self._cancel_silence_timer()
        with self._lock:
            self._state = "idle"
            self._wake_buffer.clear()
            self._reset_command_capture()
            self._processing_command = False
        logger.info("Voice pipeline stopped")

    def manual_wakeup(self):
        with self._lock:
            if self._state != "idle":
                logger.warning("manual_wakeup ignored in state=%s", self._state)
                return
            self._state = "greeting"
            self._wake_buffer.clear()
            self._reset_command_capture()
        self._start_silence_timer()
        self._async_send("wakeup", {"wakeWord": self.WAKE_WORD, "confidence": 1.0})
        self._do_greeting_sequence()

    def cancel(self):
        self._cancel_silence_timer()
        with self._lock:
            self._state = "idle"
            self._wake_buffer.clear()
            self._reset_command_capture()
            self._cancel_processing = True
            self._processing_command = False
        self._async_send("standby", {"reason": "cancelled"})

    def handle_audio_frame(self, frame: bytes):
        if not self._running or not frame:
            return
        if len(frame) > MAX_FRAME_BYTES:
            self._async_send("error", {"code": "AUDIO_FRAME_TOO_LARGE", "message": "audio frame too large"})
            return

        self._last_audio_at = time.time()
        with self._lock:
            state = self._state

        if state == "idle":
            self._handle_wake_frame(frame)

    def text_input(self, text: str):
        text = text.strip()
        if not text:
            self._async_send("error", {"message": "text cannot be empty"})
            return
        with self._lock:
            if self._processing_command:
                self._async_send("standby", {"reason": "busy", "hint": "previous question is still processing"})
                return
            if self._state == "idle":
                self._state = "processing_command"
                self._async_send("wakeup", {"wakeWord": self.WAKE_WORD, "confidence": 1.0, "hint": "text input"})
            elif self._state in {"greeting", "waiting_for_ptt", "processing_command"}:
                self._state = "processing_command"
                self._cancel_processing = True
            else:
                return
            self._processing_command = True
        self._cancel_silence_timer()
        self._process_text_async(text)

    def voice_input(self, audio_bytes: bytes):
        with self._lock:
            if self._processing_command:
                self._async_send("standby", {"reason": "busy", "hint": "previous question is still processing"})
                return
            if self._state not in {"waiting_for_ptt", "processing_command"}:
                logger.warning("voice_input ignored in state=%s", self._state)
                return
            self._state = "processing_command"
            self._cancel_processing = False
            self._processing_command = True
        self._cancel_silence_timer()
        self._process_command_async(bytes(audio_bytes))

    def _handle_wake_frame(self, frame: bytes):
        if self._recognizing_wake:
            return

        self._wake_buffer.extend(frame)
        if len(self._wake_buffer) > MAX_WAKE_BUFFER_BYTES:
            del self._wake_buffer[: len(self._wake_buffer) - MAX_WAKE_BUFFER_BYTES]
        if len(self._wake_buffer) < WAKE_CHUNK_BYTES:
            return

        audio_bytes = bytes(self._wake_buffer)
        self._wake_buffer.clear()
        self._recognizing_wake = True

        def worker():
            try:
                self._async_send("standby", {"reason": "recognizing", "hint": "checking wake word"})
                text = self._recognize_pcm(audio_bytes)
                logger.info("[wake] ASR=%r", text)
                if text and self._is_wakeword(text):
                    self._trigger_wakeup(text)
            finally:
                self._recognizing_wake = False

        threading.Thread(target=worker, daemon=True).start()

    def _handle_command_frame(self, frame: bytes):
        if self._processing_command:
            return

        self._command_buffer.extend(frame)
        is_speech = self._frame_rms(frame) >= COMMAND_SPEECH_RMS_THRESHOLD

        if not self._command_has_speech:
            if is_speech:
                self._command_has_speech = True
                self._command_silence_bytes = 0
            elif len(self._command_buffer) > COMMAND_PRE_SPEECH_BYTES:
                del self._command_buffer[: len(self._command_buffer) - COMMAND_PRE_SPEECH_BYTES]
            return

        if is_speech:
            self._command_silence_bytes = 0
        else:
            self._command_silence_bytes += len(frame)

        if len(self._command_buffer) > MAX_COMMAND_BUFFER_BYTES:
            self._finish_command_capture("max_duration")
            return

        if self._command_silence_bytes < COMMAND_TRAILING_SILENCE_BYTES:
            return

        self._finish_command_capture("trailing_silence")

    def _finish_command_capture(self, reason: str):
        if len(self._command_buffer) < COMMAND_MIN_AUDIO_BYTES:
            logger.info("[command] ignored short audio: reason=%s bytes=%s", reason, len(self._command_buffer))
            self._reset_command_capture()
            return

        audio_bytes = bytes(self._command_buffer)
        duration = len(audio_bytes) / SAMPLE_RATE / SAMPLE_WIDTH
        self._reset_command_capture()
        with self._lock:
            if self._state != "waiting_for_ptt":
                return
            self._state = "processing_command"
            self._cancel_processing = False
            self._processing_command = True
        logger.info("[command] ASR trigger: reason=%s audio=%.2fs", reason, duration)
        self._cancel_silence_timer()
        self._process_command_async(audio_bytes)

    def _reset_command_capture(self):
        self._command_buffer.clear()
        self._command_has_speech = False
        self._command_silence_bytes = 0

    def _trigger_wakeup(self, recognized_text: str):
        with self._lock:
            if self._state != "idle":
                return
            self._state = "greeting"
            self._wake_buffer.clear()
            self._reset_command_capture()
        self._start_silence_timer()
        self._async_send(
            "wakeup",
            {"wakeWord": self.WAKE_WORD, "confidence": 0.92, "text": recognized_text, "hint": "wake word detected"},
        )
        self._do_greeting_sequence()

    def _do_greeting_sequence(self):
        def worker():
            try:
                if self.GREETING_TEXT:
                    self._say(self.GREETING_TEXT, return_to_waiting=False)
            finally:
                with self._lock:
                    if self._state == "greeting":
                        self._state = "waiting_for_ptt"
                self._async_send("standby", {"reason": "greeting_complete"})

        threading.Thread(target=worker, daemon=True).start()

    def _process_text_async(self, text: str):
        self._async_send("asrResult", {"text": text, "isFinal": True, "timestamp": int(time.time() * 1000)})

        def worker():
            try:
                self._async_send("ttsStatus", {"status": "start", "hint": "thinking"})
                answer = self._ask_dialog_or_service_message(text)
                self._async_send("dialogResult", {"question": text, "answer": answer, "timestamp": int(time.time() * 1000)})
                self._say_and_return(answer, instruction_text=text)
            except Exception as exc:
                logger.error("text input failed: %s", exc, exc_info=True)
                self._async_send("error", {"message": f"text input failed: {exc}"})
                self._return_to_waiting()
            finally:
                self._processing_command = False

        threading.Thread(target=worker, daemon=True).start()

    def _process_command_async(self, audio_bytes: bytes):
        def worker():
            text = ""
            try:
                self._async_send("standby", {"reason": "recognizing", "hint": "recognizing command"})
                text = self._recognize_pcm(audio_bytes)
                logger.info("[command] ASR=%r", text)
                if not text:
                    self._async_send("standby", {"reason": "no_speech", "hint": "no speech recognized"})
                    self._return_to_waiting()
                    return

                self._async_send("asrResult", {"text": text, "isFinal": True, "timestamp": int(time.time() * 1000)})
                self._async_send("ttsStatus", {"status": "start", "hint": "thinking"})
                answer = self._ask_dialog_or_service_message(text)
                self._async_send("dialogResult", {"question": text, "answer": answer, "timestamp": int(time.time() * 1000)})
                self._say_and_return(answer, instruction_text=text)
            except Exception as exc:
                logger.error("command processing failed: %s", exc, exc_info=True)
                self._async_send("error", {"message": f"voice processing failed: {exc}"})
                self._return_to_waiting()
            finally:
                self._processing_command = False

        threading.Thread(target=worker, daemon=True).start()

    def _ask_dialog_or_service_message(self, text: str) -> str:
        answer = self.dialog.ask(text)
        if answer:
            return answer
        logger.warning("Dialog service returned empty answer for question=%r", text)
        return DIALOG_EMPTY_ANSWER_MESSAGE

    def _recognize_pcm(self, audio_bytes: bytes) -> str:
        audio = sr.AudioData(audio_bytes, sample_rate=SAMPLE_RATE, sample_width=SAMPLE_WIDTH)
        return self.asr.recognize(audio)

    @staticmethod
    def _frame_rms(frame: bytes) -> float:
        if len(frame) < SAMPLE_WIDTH:
            return 0.0

        total = 0
        sample_count = len(frame) // SAMPLE_WIDTH
        for offset in range(0, sample_count * SAMPLE_WIDTH, SAMPLE_WIDTH):
            sample = int.from_bytes(frame[offset : offset + SAMPLE_WIDTH], "little", signed=True)
            total += sample * sample
        return (total / sample_count) ** 0.5

    def _say(self, text: str, return_to_waiting: bool = True) -> None:
        audio = ""
        try:
            audio = self._run_async_in_thread(self.tts.speak_to_data_url(text))
        except AttributeError:
            logger.warning("TTSService.speak_to_data_url is unavailable; falling back to server playback")
            self._run_async_in_thread(self.tts.speak(text))
        except Exception as exc:
            logger.warning("TTS synthesis failed: %s", exc)

        self._async_send("ttsResult", {"success": True, "text": text, "audio": audio})
        self._async_send("ttsStatus", {"status": "end", "text": text})

        if return_to_waiting:
            self._return_to_waiting()

    def _say_and_return(self, text: str, instruction_text: str = ""):
        self._say(text, return_to_waiting=True)
        try:
            from db import HistoryManager

            HistoryManager.add_history(
                wake_word=self.WAKE_WORD,
                instruction_text=instruction_text,
                tts_text=text,
                status="success",
                duration=0,
            )
        except Exception:
            logger.debug("history write skipped", exc_info=True)

    def _return_to_waiting(self):
        with self._lock:
            if self._running:
                self._state = "waiting_for_ptt"
        self._start_silence_timer()

    def _run_async_in_thread(self, coroutine):
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(coroutine)
        finally:
            loop.close()
            asyncio.set_event_loop(None)

    def _is_wakeword(self, text: str) -> bool:
        normalized = text.replace(" ", "")
        if self.WAKE_WORD and self.WAKE_WORD in normalized:
            return True
        return any(alt and alt in normalized for alt in self.WAKE_WORD_ALTERNATIVES)

    def _start_silence_timer(self):
        self._cancel_silence_timer()
        self._silence_timer = threading.Timer(float(self.ACTIVE_TIMEOUT), self._on_silence_timeout)
        self._silence_timer.daemon = True
        self._silence_timer.start()

    def _cancel_silence_timer(self):
        if self._silence_timer is not None:
            self._silence_timer.cancel()
            self._silence_timer = None

    def _on_silence_timeout(self):
        with self._lock:
            if self._state == "idle":
                return
            self._state = "idle"
            self._wake_buffer.clear()
            self._reset_command_capture()
        self._async_send("standby", {"reason": "silence_timeout"})

    def _async_send(self, event: str, data: dict):
        if self.loop.is_closed():
            return
        future = asyncio.run_coroutine_threadsafe(self.send_event(event, data), self.loop)
        future.add_done_callback(self._log_send_error)

    @staticmethod
    def _log_send_error(future):
        if future.cancelled():
            return
        exc = future.exception()
        if exc:
            logger.warning("failed to send voice event: %s", exc)
