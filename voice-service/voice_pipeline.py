"""
语音唤醒管道（完整版）
负责：唤醒检测 → 问候语播报 → 指令识别 → 调用对话服务 → TTS播报 → 回到待机

状态机：
  idle  → 检测到唤醒词 → greeting  → 发送 wakeup 事件 + TTS问候
  greeting → 问候播报完成 → waiting_for_ptt
  waiting_for_ptt → 收到前端 PTT 语音 → processing_command
  processing_command → 处理完成 → waiting_for_ptt
  任意活跃状态 → 超时 → idle
"""
import asyncio
import logging
import threading
import time
from queue import Queue, Empty

import requests
import speech_recognition as sr

from asr_service import ASRService
from db import ConfigManager
from voiceprint_service import voiceprint_service
from tts_service import TTSService
from config import WORKFLOW_BASE_URL, WORKFLOW_USERNAME, WORKFLOW_PASSWORD, GREETING_TEXT

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 50 * 60  # token 有效期 50 分钟


class DialogClient:
    """对话服务客户端，支持自动登录和 token 刷新"""

    def __init__(self, base_url: str, username: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self._token = ""
        self._token_expires_at = 0.0
        self._lock = threading.Lock()

    def _login(self, force: bool = False) -> str:
        """登录获取 token"""
        if self._token and not force and time.time() < self._token_expires_at:
            return self._token

        if not self.password:
            logger.warning("对话服务密码为空，无法登录")
            return ""

        t0 = time.time()
        try:
            resp = requests.post(
                f"{self.base_url}/sys/mLogin",
                json={"username": self.username, "password": self.password},
                timeout=10,
                proxies={"http": None, "https": None},  # 不走系统代理
            )
            resp.raise_for_status()
            data = resp.json()
            token = (
                data.get("token")
                or data.get("accessToken")
                or data.get("result", {}).get("token")
                or data.get("data", {}).get("token")
                or ""
            )
            if not token:
                logger.warning("登录响应中未找到 token")
                return ""

            self._token = token
            self._token_expires_at = time.time() + TOKEN_TTL_SECONDS
            elapsed = time.time() - t0
            logger.info(f"[perf] 登录对话服务: {elapsed:.2f}s")
            return token
        except Exception as e:
            logger.warning(f"对话服务登录失败: {e}")
            return ""

    def ask(self, question: str, retried: bool = False) -> str:
        """调用对话服务获取回答"""
        t0 = time.time()
        token = self._login(force=retried)
        if not token:
            return ""

        try:
            resp = requests.post(
                f"{self.base_url}/pro_fastgpt/wechatyProjectFastgpt/callOnlyAskGptWorkflow",
                json={"content": question},
                headers={
                    "X-Access-Token": token,
                    "Authorization": f"Bearer {token}",
                },
                timeout=30,
                proxies={"http": None, "https": None},  # 不走系统代理
            )
            resp.raise_for_status()
            data = resp.json()
            elapsed = time.time() - t0
            # 尝试多种可能的回答字段
            answer = (
                data.get("message")
                or data.get("result")
                or data.get("data")
                or data.get("content")
                or data.get("answer")
                or data.get("reply")
                or data.get("text")
                or data.get("output")
                or ""
            )
            if isinstance(answer, dict):
                answer = (
                    answer.get("message")
                    or answer.get("content")
                    or answer.get("answer")
                    or answer.get("text")
                    or str(answer)
                )
            logger.info(f"[perf] 调用对话服务: {elapsed:.2f}s, 回答长度: {len(str(answer))}, 响应字段: {list(data.keys())[:5]}")
            if not answer:
                logger.warning(f"[dialog] 对话服务返回空内容，完整响应: {str(data)[:300]}")
            return str(answer) if answer else ""
        except requests.HTTPError as e:
            if resp.status_code in (401, 403) and not retried:
                with self._lock:
                    self._token = ""
                return self.ask(question, retried=True)
            logger.warning(f"对话服务调用失败: {e}")
            return ""
        except Exception as e:
            logger.warning(f"对话服务调用异常: {e}")
            return ""


class VoicePipeline:
    def __init__(self, loop: asyncio.AbstractEventLoop, send_event_fn):
        self.loop = loop
        self.send_event = send_event_fn  # async callable(event, data)

        self.asr = ASRService()
        self.tts = TTSService()
        self.dialog = DialogClient(WORKFLOW_BASE_URL, WORKFLOW_USERNAME, WORKFLOW_PASSWORD)

        # 状态机：idle | greeting | waiting_for_ptt | processing_command
        self._state = "idle"
        self._lock = threading.Lock()

        # 超时计时器
        self._silence_timer: threading.Timer | None = None

        # 后台监听控制
        self._stop_bg: callable = None
        self._mic: sr.Microphone = None
        self._running = False

        # 音频帧队列（listening_for_command 状态使用）
        self._audio_queue: Queue = Queue(maxsize=200)
        self._processing_thread: threading.Thread | None = None
        self._cancel_processing = False  # 文字输入中断当前语音处理

        # 加载配置
        self.load_config()

    def load_config(self):
        """从数据库加载配置"""
        self.WAKE_WORD = ConfigManager.get_config("wake_word", "小智小智")
        self.WAKE_WORD_ALTERNATIVES = ConfigManager.get_config("wake_word_alternatives", ["小智"])
        self.ACTIVE_TIMEOUT = ConfigManager.get_config("active_timeout", 40)
        self.VOICEPRINT_ENABLED = ConfigManager.get_config("voiceprint_enabled", False)
        self.GREETING_TEXT = ConfigManager.get_config("greeting_text", GREETING_TEXT)
        # 加载 ASR 纠错词典
        db_corrections = ConfigManager.get_config("asr_corrections", None)
        if db_corrections and isinstance(db_corrections, dict):
            self.asr.set_corrections(db_corrections)
        logger.info(f"配置加载完成：唤醒词={self.WAKE_WORD}, 超时时间={self.ACTIVE_TIMEOUT}秒, 声纹验证={'已启用' if self.VOICEPRINT_ENABLED else '已禁用'}")

    # ------------------------------------------------------------------ #
    #  公开接口                                                            #
    # ------------------------------------------------------------------ #

    def start(self):
        """启动后台语音监听"""
        if self._running:
            return
        self._running = True
        t = threading.Thread(target=self._init_and_listen, daemon=True)
        t.start()

    def stop(self):
        """停止语音监听"""
        self._running = False
        self._cancel_silence_timer()
        if self._stop_bg:
            try:
                self._stop_bg(wait_for_stop=False)
            except Exception:
                pass
            self._stop_bg = None
        # 清空队列唤醒处理线程
        if self._processing_thread and self._processing_thread.is_alive():
            self._audio_queue.put(None)  # sentinel
        logger.info("语音管道已停止")

    def manual_wakeup(self):
        """手动唤醒（测试用）"""
        with self._lock:
            if self._state != "idle":
                logger.warning(f"手动唤醒被忽略，当前状态: {self._state}")
                return
            self._state = "greeting"

        logger.info("手动唤醒触发")
        self._start_silence_timer()
        self._async_send("wakeup", {"wakeWord": self.WAKE_WORD, "confidence": 1.0})
        self._do_greeting_sequence()

    def cancel(self):
        """退出唤醒状态，回到 idle"""
        self._cancel_silence_timer()
        with self._lock:
            prev = self._state
            self._state = "idle"
        logger.info(f"退出唤醒，从 {prev} 回到待机")
        self._async_send("standby", {"reason": "cancelled"})

    def text_input(self, text: str):
        """文字输入：跳过 ASR，直接走 对话服务 → TTS 管线"""
        with self._lock:
            if self._state == "idle":
                # 从 idle 直接进入处理：先发唤醒事件让前端弹窗
                self._state = "processing_command"
                self._async_send("wakeup", {"wakeWord": self.WAKE_WORD, "confidence": 1.0, "hint": "文字输入触发"})
            elif self._state in ("greeting", "waiting_for_ptt", "processing_command"):
                self._state = "processing_command"
                self._cancel_processing = True  # 中断当前语音指令处理
            else:
                logger.warning(f"文字输入被忽略，当前状态: {self._state}")
                return
        self._cancel_silence_timer()

        logger.info(f"[text_input] 处理文字: {text!r}")
        self._async_send("asrResult", {"text": text, "isFinal": True, "timestamp": int(time.time() * 1000)})

        def _process_text():
            try:
                self._async_send("ttsStatus", {"status": "start", "hint": "正在思考..."})

                t_dialog = time.time()
                answer = self.dialog.ask(text)
                dialog_elapsed = time.time() - t_dialog
                if not answer:
                    answer = f'我听到您说"{text}"，暂时没有合适的回答，请您说得更清晰一些'

                logger.info(f"[text_input] 对话服务回答: {answer!r}")
                self._async_send("dialogResult", {"question": text, "answer": answer, "timestamp": int(time.time() * 1000)})

                self._say_and_return(answer)
            except Exception as e:
                logger.error(f"[text_input] 处理异常: {e}", exc_info=True)
                self._async_send("error", {"message": f"文字输入处理失败：{e}"})
                with self._lock:
                    if self._state == "processing_command":
                        self._state = "waiting_for_ptt"
                self._start_silence_timer()

        threading.Thread(target=_process_text, daemon=True).start()

    def voice_input(self, audio_bytes: bytes):
        """前端 PTT 语音输入：接收 PCM 音频 → ASR → 对话服务 → TTS"""
        with self._lock:
            if self._state not in ("waiting_for_ptt", "processing_command"):
                logger.warning(f"voice_input 被忽略，当前状态: {self._state}")
                return
            self._state = "processing_command"
        self._cancel_silence_timer()

        duration = len(audio_bytes) / (16000 * 2)  # 16kHz, 16-bit
        logger.info(f"[voice_input] 收到前端音频，大小: {len(audio_bytes)} bytes, 时长: {duration:.1f}s")

        def _process():
            try:
                audio = sr.AudioData(audio_bytes, sample_rate=16000, sample_width=2)
                self._async_send("standby", {"reason": "recognizing", "hint": "正在识别语音..."})
                t_asr = time.time()
                text = self.asr.recognize(audio)
                asr_elapsed = time.time() - t_asr
                logger.info(f"[perf] voice_input ASR: {asr_elapsed:.2f}s, text={text!r}")

                if not text:
                    logger.info("[voice_input] ASR 无结果")
                    self._async_send("standby", {"reason": "no_speech", "hint": "未识别到语音，请重试"})
                    with self._lock:
                        if self._state == "processing_command":
                            self._state = "waiting_for_ptt"
                    self._start_silence_timer()
                    return

                self._async_send("asrResult", {"text": text, "isFinal": True, "timestamp": int(time.time() * 1000)})
                self._async_send("ttsStatus", {"status": "start", "hint": "正在思考..."})

                t_dialog = time.time()
                answer = self.dialog.ask(text)
                dialog_elapsed = time.time() - t_dialog
                if not answer:
                    answer = f'我听到您说"{text}"，暂时没有合适的回答，请您说得更清晰一些'

                logger.info(f"[perf] voice_input 链路: ASR={asr_elapsed:.2f}s + 对话={dialog_elapsed:.2f}s")
                logger.info(f"[voice_input] 对话服务回答: {answer!r}")
                self._async_send("dialogResult", {"question": text, "answer": answer, "timestamp": int(time.time() * 1000)})

                self._say_and_return(answer)
            except Exception as e:
                logger.error(f"[voice_input] 处理异常: {e}", exc_info=True)
                self._async_send("error", {"message": f"语音处理失败：{e}"})
                with self._lock:
                    if self._state == "processing_command":
                        self._state = "waiting_for_ptt"
                self._start_silence_timer()

        threading.Thread(target=_process, daemon=True).start()

    # ------------------------------------------------------------------ #
    #  内部方法                                                            #
    # ------------------------------------------------------------------ #

    def _init_and_listen(self):
        """在后台线程中：初始化麦克风 → 启动持续监听"""
        try:
            self._mic = self.asr.get_microphone()
            with self._mic as source:
                self.asr.calibrate_noise(source, duration=1.5)

            if not self._running:
                return

            self._stop_bg = self.asr.listen_in_background(self._mic, self._on_audio)
            logger.info(f"后台语音监听已启动，等待唤醒词「{self.WAKE_WORD}」...")

        except Exception as e:
            logger.error(f"麦克风初始化失败: {e}", exc_info=True)
            self._async_send("error", {"message": f"麦克风初始化失败: {e}"})

    def _on_audio(self, recognizer: sr.Recognizer, audio: sr.AudioData):
        """后台监听回调，根据状态处理音频"""
        if not self._running:
            return

        with self._lock:
            current_state = self._state

        if current_state == "idle":
            self._handle_idle(audio)
        # waiting_for_ptt 和 processing_command 状态下丢弃音频（等待前端 PTT 输入）

    # ---------- idle 状态 ----------

    def _handle_idle(self, audio: sr.AudioData):
        """idle 状态：检测唤醒词"""
        t0 = time.time()
        self._async_send("standby", {"reason": "recognizing", "hint": "正在检测唤醒词"})
        text = self.asr.recognize(audio)
        asr_elapsed = time.time() - t0
        if not text:
            if asr_elapsed > 0.1:
                logger.info(f"[perf] idle ASR 无结果: {asr_elapsed:.2f}s")
            return

        logger.info(f"[perf] idle ASR 识别到唤醒词: {asr_elapsed:.2f}s, text={text!r}")
        logger.debug(f"[idle] ASR: {text!r}")
        if not self._is_wakeword(text):
            return

        # TODO: 声纹验证 - 暂时禁用
        # if self.VOICEPRINT_ENABLED:
        #     logger.info("检测到唤醒词，开始声纹验证")
        #     self._async_send("standby", {"reason": "voiceprint", "hint": "正在验证身份..."})
        #     try:
        #         pcm_data = audio.get_raw_data(convert_rate=16000, convert_width=2)
        #         verify_success, user_id = voiceprint_service.verify_voiceprint(pcm_data)
        #         if not verify_success:
        #             logger.info("声纹验证失败，拒绝唤醒")
        #             return
        #         logger.info(f"声纹验证通过，用户ID: {user_id}")
        #     except Exception as e:
        #         logger.error(f"声纹验证异常: {e}，拒绝唤醒")
        #         return

        with self._lock:
            if self._state != "idle":
                return
            self._state = "greeting"

        logger.info(f"唤醒词检测成功: {text!r}，进入已唤醒状态")
        self._start_silence_timer()
        self._async_send("wakeup", {"wakeWord": self.WAKE_WORD, "confidence": 0.95, "hint": "唤醒成功"})
        self._async_send("ttsStatus", {"status": "start", "hint": "正在准备问候语..."})
        self._do_greeting_sequence()

    # ---------- greeting 状态 ----------

    def _do_greeting_sequence(self):
        """播报问候语，然后进入 listening_for_command"""
        def _greeting_and_listen():
            try:
                logger.info(f"[greeting] 播报问候语: {self.GREETING_TEXT}")
                t_tts = time.time()
                self._async_send("ttsResult", {"success": True, "text": self.GREETING_TEXT, "audio": ""})
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(self.tts.speak(self.GREETING_TEXT))
                finally:
                    loop.close()
                tts_elapsed = time.time() - t_tts
                logger.info(f"[perf] 问候语 TTS: {tts_elapsed:.2f}s")
            except Exception as e:
                logger.warning(f"[greeting] 问候语播报失败: {e}")
            finally:
                # 仅当仍处于 greeting 状态时才转入 PTT 等待，避免覆盖 text_input 设置的 processing_command
                with self._lock:
                    if self._state == "greeting":
                        self._state = "waiting_for_ptt"
                logger.info("[greeting] 问候语完成，进入 PTT 等待状态（等待前端按键说话）")

        threading.Thread(target=_greeting_and_listen, daemon=True).start()

    # ---------- listening_for_command 状态 ----------

    def _handle_command_audio(self, audio: sr.AudioData):
        """将音频放入队列，由处理线程统一识别"""
        try:
            self._audio_queue.put_nowait(audio)
        except Exception:
            logger.warning("[command] 音频队列已满，丢弃一帧")

    def _process_command_audio(self):
        """在独立线程中处理指令音频：ASR → 对话服务 → TTS

        listen_in_background 提供的每个音频片段都是完整短语（已通过 VAD 切分），
        不需要跨片段累积，直接逐段处理即可。
        """
        while self._running:
            try:
                audio = self._audio_queue.get(timeout=2.0)
            except Empty:
                continue
            except Exception as e:
                logger.warning(f"[command] 队列获取异常: {e}")
                continue

            if audio is None:  # sentinel
                break

            with self._lock:
                if self._state != "listening_for_command":
                    continue
                self._state = "processing_command"
                self._cancel_processing = False
            self._cancel_silence_timer()

            # 给用户反馈正在识别
            self._async_send("standby", {"reason": "recognizing", "hint": "正在识别语音指令..."})

            t_asr = time.time()
            text = self.asr.recognize(audio)
            asr_elapsed = time.time() - t_asr

            # 检查是否被文字输入中断
            if self._cancel_processing:
                logger.info("[command] 语音处理被文字输入中断（ASR 后）")
                with self._lock:
                    if self._state == "processing_command":
                        self._state = "listening_for_command"
                continue

            if not text:
                logger.info(f"[perf] command ASR 无结果: {asr_elapsed:.2f}s")
                with self._lock:
                    if self._state == "processing_command":
                        self._state = "listening_for_command"
                self._start_silence_timer()
                continue

            logger.info(f"[command] ASR 识别结果: {text!r}")
            self._async_send("asrResult", {"text": text, "isFinal": True, "timestamp": int(time.time() * 1000)})

            # AI 思考中，给用户反馈
            self._async_send("ttsStatus", {"status": "start", "hint": "正在思考..."})

            # 调用对话服务
            t_dialog = time.time()
            answer = self.dialog.ask(text)
            dialog_elapsed = time.time() - t_dialog

            # 再次检查是否被文字输入中断
            if self._cancel_processing:
                logger.info("[command] 语音处理被文字输入中断（对话后）")
                with self._lock:
                    if self._state == "processing_command":
                        self._state = "listening_for_command"
                continue

            if not answer:
                answer = f'我听到您说"{text}"，暂时没有合适的回答，请您说得更清晰一些'

            logger.info(f"[perf] 命令链路: ASR={asr_elapsed:.2f}s + 对话={dialog_elapsed:.2f}s")
            logger.info(f"[command] 对话服务回答: {answer!r}")
            self._async_send("dialogResult", {"question": text, "answer": answer, "timestamp": int(time.time() * 1000)})

            # TTS 播报
            self._say_and_return(answer)

        logger.info("[command] 处理线程退出")

    def _say_and_return(self, text: str):
        """TTS 播报后回到 idle"""
        self._async_send("ttsResult", {"success": True, "text": text, "audio": ""})
        t0 = time.time()
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(self.tts.speak(text))
            finally:
                loop.close()
            tts_elapsed = time.time() - t0
            logger.info(f"[perf] TTS 播报: {tts_elapsed:.2f}s")
        except Exception as e:
            logger.warning(f"[command] TTS 播报失败: {e}")

        # 播报完成后回到 PTT 等待，保持对话窗口打开
        self._async_send("standby", {"sessionId": "", "reason": "tts_complete"})

        with self._lock:
            self._state = "waiting_for_ptt"

        # 记录历史
        try:
            from db import HistoryManager
            HistoryManager.add_history(
                wake_word=self.WAKE_WORD,
                instruction_text="",
                tts_text=text,
                status="success",
                duration=0,
            )
        except Exception:
            pass

        self._start_silence_timer()
        logger.info("[command] 播报完成，回到待机状态")

    # ---------- 通用 ----------

    def _is_wakeword(self, text: str) -> bool:
        if self.WAKE_WORD in text:
            return True
        return any(alt in text for alt in self.WAKE_WORD_ALTERNATIVES)

    def _start_silence_timer(self):
        """启动/重置超时计时器（已禁用自动退出，仅手动 cancel）"""
        pass

    def _cancel_silence_timer(self):
        if self._silence_timer is not None:
            self._silence_timer.cancel()
            self._silence_timer = None

    def _on_silence_timeout(self):
        """超时自动回到待机状态"""
        with self._lock:
            if self._state == "idle":
                return
            prev = self._state
            self._state = "idle"

            # 停止处理线程（如果存在）
            if prev in ("listening_for_command", "waiting_for_ptt"):
                try:
                    self._audio_queue.put(None)
                except Exception:
                    pass

        logger.info(f"唤醒超时（从 {prev}），自动进入待机，等待唤醒词")
        self._async_send("standby", {"reason": "silence_timeout"})

    def _async_send(self, event: str, data: dict):
        """从后台线程安全地调用异步 send_event"""
        asyncio.run_coroutine_threadsafe(
            self.send_event(event, data),
            self.loop,
        )
