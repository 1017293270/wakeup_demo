"""
TTS（文字转语音）服务
使用 edge-tts（微软 Edge 神经网络 TTS，免费线上 API）
支持高质量中文语音合成，无需 API 密钥
"""
import asyncio
import base64
import logging
import os
import tempfile
import time

import edge_tts
import pygame

from db import ConfigManager

logger = logging.getLogger(__name__)

# 全局初始化 pygame mixer（只初始化一次）
_mixer_initialized = False


def _ensure_mixer():
    global _mixer_initialized
    if not _mixer_initialized:
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
            _mixer_initialized = True
            logger.info("pygame mixer 初始化成功")
        except Exception as e:
            logger.error(f"pygame mixer 初始化失败: {e}（无音频输出设备？）")


class TTSService:
    def __init__(self):
        _ensure_mixer()
        # 加载配置
        self.load_config()

    def load_config(self):
        """从数据库加载配置"""
        self.TTS_VOICE = ConfigManager.get_config("tts_voice", "zh-CN-XiaoxiaoNeural")
        self.TTS_RATE = ConfigManager.get_config("tts_rate", "+0%")
        self.TTS_VOLUME = ConfigManager.get_config("tts_volume", "+0%")

        # 修复格式问题：确保语速和音量带+/-号，edge-tts要求必须带符号
        if self.TTS_RATE and not self.TTS_RATE.startswith(('+', '-')):
            self.TTS_RATE = '+' + self.TTS_RATE
        if self.TTS_VOLUME and not self.TTS_VOLUME.startswith(('+', '-')):
            self.TTS_VOLUME = '+' + self.TTS_VOLUME

        logger.info(f"TTS配置加载完成：音色={self.TTS_VOICE}, 语速={self.TTS_RATE}, 音量={self.TTS_VOLUME}")

    async def speak(self, text: str) -> bool:
        """
        将文本合成语音并通过扬声器播放

        Args:
            text: 要合成播报的文本

        Returns:
            True=播放成功, False=失败
        """
        if not text or not text.strip():
            return False

        tmp_path = None
        try:
            # 1. 用 edge-tts 合成音频到临时文件
            communicate = edge_tts.Communicate(
                text=text,
                voice=self.TTS_VOICE,
                rate=self.TTS_RATE,
                volume=self.TTS_VOLUME,
            )
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                tmp_path = f.name

            await communicate.save(tmp_path)
            logger.debug(f"TTS合成完成，文件: {tmp_path}")

            # 2. 在 executor 中播放（阻塞操作，不能直接在 asyncio 中调用）
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._play_blocking, tmp_path)

            return True

        except Exception as e:
            logger.error(f"TTS合成/播放失败: {e}", exc_info=True)
            return False

        finally:
            # 清理临时文件
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    def _play_blocking(self, path: str):
        """阻塞式音频播放（在线程中执行）"""
        if not _mixer_initialized:
            logger.warning("音频播放跳过：mixer 未初始化")
            return

        try:
            pygame.mixer.music.load(path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.05)
        except Exception as e:
            logger.error(f"音频播放失败: {e}")

    def stop(self):
        """停止当前播放"""
        if _mixer_initialized:
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass

    async def speak_to_file(self, text: str) -> str:
        """合成语音到临时文件，返回文件路径"""
        if not text or not text.strip():
            raise Exception("文本不能为空")

        tmp_path = tempfile.mktemp(suffix=".mp3")
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=self.TTS_VOICE,
                rate=self.TTS_RATE,
                volume=self.TTS_VOLUME,
            )
            await communicate.save(tmp_path)
            return tmp_path
        except Exception as e:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise e

    async def speak_to_data_url(self, text: str) -> str:
        """Synthesize speech and return an MP3 data URL for browser playback."""
        tmp_path = await self.speak_to_file(text)
        try:
            with open(tmp_path, "rb") as file:
                encoded = base64.b64encode(file.read()).decode("ascii")
            return f"data:audio/mp3;base64,{encoded}"
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
