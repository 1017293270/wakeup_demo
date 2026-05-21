"""
FastAPI WebSocket 服务器
监听 ws://127.0.0.1:8766/ws，与前端语音唤醒页面通信

前端 → 后端 action：
  startService   启动语音服务（进入唤醒词待机）
  manualWakeup   手动唤醒（测试用）
  cancel / hangup  退出唤醒，回到待机

后端 → 前端 event：
  wakeup         检测到唤醒词
  standby        回到待机状态（超时或被取消）
  error          错误通知
"""
import asyncio
import json
import logging

from fastapi import WebSocket, WebSocketDisconnect

from voice_pipeline import VoicePipeline
from tts_service import TTSService
from db import ConfigManager, HistoryManager
from voiceprint_service import voiceprint_service

logger = logging.getLogger(__name__)


class VoiceServer:
    def __init__(self):
        self.clients: set[WebSocket] = set()
        self.pipeline: VoicePipeline | None = None
        self.tts_service: TTSService = TTSService()

    # ------------------------------------------------------------------ #
    #  向前端广播事件                                                      #
    # ------------------------------------------------------------------ #

    async def send_event(self, event: str, data: dict):
        if not self.clients:
            return

        message = json.dumps({"event": event, "data": data}, ensure_ascii=False)
        dead: set[WebSocket] = set()
        for ws in self.clients.copy():
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)

        self.clients -= dead
        if dead:
            logger.debug(f"移除 {len(dead)} 个断开的客户端")

    # ------------------------------------------------------------------ #
    #  客户端连接处理                                                      #
    # ------------------------------------------------------------------ #

    async def handle_client(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)
        logger.info(f"客户端连接，当前连接数: {len(self.clients)}")

        try:
            while True:
                raw = await ws.receive_text()
                try:
                    msg = json.loads(raw)
                    await self._dispatch(msg)
                except json.JSONDecodeError:
                    logger.warning(f"收到非法JSON: {raw!r}")

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"客户端处理异常: {e}", exc_info=True)
        finally:
            self.clients.discard(ws)
            logger.info(f"客户端断开，剩余: {len(self.clients)}")

            if not self.clients and self.pipeline:
                self.pipeline.stop()
                self.pipeline = None
                logger.info("所有客户端已断开，语音管道已停止")

    # ------------------------------------------------------------------ #
    #  Action 分发                                                        #
    # ------------------------------------------------------------------ #

    async def _dispatch(self, msg: dict):
        action = msg.get("action")
        data = msg.get("data", {})
        logger.info(f"收到 action: {action!r}")

        if action == "startService":
            await self._on_start_service()

        elif action == "manualWakeup":
            if self.pipeline:
                self.pipeline.manual_wakeup()

        elif action == "cancel" or action == "hangup":
            if self.pipeline:
                self.pipeline.cancel()

        elif action == "getConfig":
            config = ConfigManager.get_all_config()
            await self.send_event("configResult", {"config": config})

        elif action == "saveConfig":
            config_data = data.get("config", {})
            try:
                for key, value in config_data.items():
                    ConfigManager.set_config(key, value)
                if self.pipeline:
                    self.pipeline.load_config()
                self.tts_service.load_config()
                await self.send_event("saveConfigResult", {"success": True, "message": "配置保存成功"})
            except Exception as e:
                await self.send_event("saveConfigResult", {"success": False, "message": f"配置保存失败: {str(e)}"})

        elif action == "reloadConfig":
            try:
                if self.pipeline:
                    self.pipeline.load_config()
                self.tts_service.load_config()
                await self.send_event("reloadConfigResult", {"success": True, "message": "配置重载成功"})
            except Exception as e:
                await self.send_event("reloadConfigResult", {"success": False, "message": f"配置重载失败: {str(e)}"})

        elif action == "getHistory":
            page = data.get("page", 1)
            page_size = data.get("page_size", 20)
            keyword = data.get("keyword", "")
            history = HistoryManager.get_history_list(page, page_size, keyword)
            await self.send_event("historyResult", {"history": history})

        elif action == "clearHistory":
            try:
                HistoryManager.clear_history()
                await self.send_event("clearHistoryResult", {"success": True, "message": "历史记录清空成功"})
            except Exception as e:
                await self.send_event("clearHistoryResult", {"success": False, "message": f"历史记录清空失败: {str(e)}"})

        elif action == "textToSpeech":
            text = data.get("text", "")
            if not text:
                await self.send_event("ttsResult", {"success": False, "message": "文本不能为空"})
                return
            try:
                import base64
                tmp_file = await self.tts_service.speak_to_file(text)
                logger.info(f"TTS合成成功，临时文件: {tmp_file}")
                with open(tmp_file, "rb") as f:
                    audio_base64 = base64.b64encode(f.read()).decode("utf-8")
                import os
                os.unlink(tmp_file)
                await self.send_event("ttsResult", {"success": True, "audio": f"data:audio/mp3;base64,{audio_base64}"})
            except Exception as e:
                logger.error(f"TTS合成失败: {str(e)}", exc_info=True)
                await self.send_event("ttsResult", {"success": False, "message": f"语音合成失败: {str(e)}"})

        elif action == "textInput":
            """文字输入：走 ASR → 对话服务 → TTS 管线"""
            text = data.get("text", "")
            if not text or not self.pipeline:
                await self.send_event("error", {"message": "文字不能为空或服务未启动"})
                return
            try:
                self.pipeline.text_input(text)
            except Exception as e:
                logger.error(f"文字输入处理异常: {e}", exc_info=True)
                await self.send_event("error", {"message": f"文字输入处理失败：{e}"})

        elif action == "voiceInput":
            """前端 PTT 语音输入：接收 base64 PCM 音频 → ASR → 对话服务 → TTS"""
            audio_base64 = data.get("audio", "")
            if not audio_base64 or not self.pipeline:
                await self.send_event("error", {"message": "音频数据为空或服务未启动"})
                return
            try:
                import base64
                audio_bytes = base64.b64decode(audio_base64)
                self.pipeline.voice_input(audio_bytes)
            except Exception as e:
                logger.error(f"语音输入处理异常: {e}", exc_info=True)
                await self.send_event("error", {"message": f"语音输入处理失败：{e}"})

        elif action == "textToSpeech":
            text = data.get("text", "")
            if not text:
                await self.send_event("ttsResult", {"success": False, "message": "文本不能为空"})
                return
            try:
                import base64
                tmp_file = await self.tts_service.speak_to_file(text)
                logger.info(f"TTS合成成功，临时文件: {tmp_file}")
                with open(tmp_file, "rb") as f:
                    audio_base64 = base64.b64encode(f.read()).decode("utf-8")
                import os
                os.unlink(tmp_file)
                await self.send_event("ttsResult", {"success": True, "audio": f"data:audio/mp3;base64,{audio_base64}"})
            except Exception as e:
                logger.error(f"TTS合成失败: {str(e)}", exc_info=True)
                await self.send_event("ttsResult", {"success": False, "message": f"语音合成失败: {str(e)}"})

        elif action == "registerVoiceprint":
            user_id = data.get("user_id", "")
            audio_base64 = data.get("audio", "")
            if not user_id or not audio_base64:
                await self.send_event("registerVoiceprintResult", {"success": False, "message": "用户ID和音频不能为空"})
                return
            try:
                import base64
                import tempfile
                import os
                from pydub import AudioSegment

                audio_data = base64.b64decode(audio_base64)
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                    f.write(audio_data)
                    tmp_webm = f.name
                audio = AudioSegment.from_file(tmp_webm, format="webm")
                audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
                pcm_data = audio.raw_data
                os.unlink(tmp_webm)
                success, msg = voiceprint_service.register_voiceprint(pcm_data, user_id)
                if success:
                    users = ConfigManager.get_config("voiceprint_users", [])
                    if user_id not in users:
                        users.append(user_id)
                        ConfigManager.set_config("voiceprint_users", users, "已注册的声纹用户列表")
                await self.send_event("registerVoiceprintResult", {"success": success, "message": msg})
            except Exception as e:
                logger.error(f"声纹注册失败: {str(e)}", exc_info=True)
                await self.send_event("registerVoiceprintResult", {"success": False, "message": f"注册失败: {str(e)}，请确认已安装ffmpeg"})

        elif action == "deleteVoiceprint":
            user_id = data.get("user_id", "")
            if not user_id:
                await self.send_event("deleteVoiceprintResult", {"success": False, "message": "用户ID不能为空"})
                return
            try:
                success, msg = voiceprint_service.delete_voiceprint(user_id)
                if success:
                    users = ConfigManager.get_config("voiceprint_users", [])
                    if user_id in users:
                        users.remove(user_id)
                        ConfigManager.set_config("voiceprint_users", users, "已注册的声纹用户列表")
                await self.send_event("deleteVoiceprintResult", {"success": success, "message": msg})
            except Exception as e:
                logger.error(f"声纹删除失败: {str(e)}", exc_info=True)
                await self.send_event("deleteVoiceprintResult", {"success": False, "message": f"删除失败: {str(e)}"})

        else:
            logger.warning(f"未知 action: {action!r}")

    async def _on_start_service(self):
        if self.pipeline:
            logger.info("语音服务已在运行，忽略重复 startService")
            return

        loop = asyncio.get_running_loop()
        self.pipeline = VoicePipeline(loop, self.send_event)
        self.pipeline.start()
        logger.info("语音服务已启动")


# 全局单例
voice_server = VoiceServer()
