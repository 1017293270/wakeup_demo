"""
ASR（语音转文字）服务
支持：
  - Google Web Speech API（免费，需联网，可能需要科学上网）
  - 百度语音识别 API（免费额度，国内网络友好）
"""
import base64
import json
import logging
import time
import requests
import speech_recognition as sr
from config import (
    ASR_ENGINE, ASR_LANGUAGE, ASR_FALLBACK_ENGINE,
    BAIDU_APP_ID, BAIDU_API_KEY, BAIDU_SECRET_KEY,
    AUDIO_SAMPLE_RATE, ASR_PHRASE_TIME_LIMIT,
    ASR_DEV_PID, ASR_CORRECTIONS
)

logger = logging.getLogger(__name__)

# 百度 token 缓存（有效期 30 天，提前 1 天刷新）
_BAIDU_TOKEN_CACHE = {"token": "", "expires_at": 0.0}


def _baidu_get_token(api_key: str, secret_key: str) -> str:
    """获取百度 Access Token（有效期 30 天，本地缓存复用）"""
    if _BAIDU_TOKEN_CACHE["token"] and time.time() < _BAIDU_TOKEN_CACHE["expires_at"]:
        return _BAIDU_TOKEN_CACHE["token"]

    t0 = time.time()
    url = (
        "https://openapi.baidu.com/oauth/2.0/token"
        f"?grant_type=client_credentials&client_id={api_key}&client_secret={secret_key}"
    )
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    token = resp.json()["access_token"]
    elapsed = time.time() - t0
    _BAIDU_TOKEN_CACHE["token"] = token
    _BAIDU_TOKEN_CACHE["expires_at"] = time.time() + (29 * 24 * 3600)  # 29 天后失效
    logger.info(f"[perf] 获取百度 token: {elapsed:.2f}s")
    return token


def _baidu_recognize(audio: sr.AudioData, app_id: str, api_key: str,
                     secret_key: str, language: str) -> str:
    """直接调用百度语音识别 REST API"""
    t0 = time.time()
    token = _baidu_get_token(api_key, secret_key)
    raw_data = audio.get_wav_data(convert_rate=16000, convert_width=2)
    t1 = time.time()
    payload = {
        "format": "wav",
        "rate": 16000,
        "channel": 1,
        "cuid": "voice_service",
        "token": token,
        "speech": base64.b64encode(raw_data).decode("utf-8"),
        "len": len(raw_data),
        "dev_pid": ASR_DEV_PID if language == "zh-CN" else 1737,
    }
    resp = requests.post(
        "https://vop.baidu.com/server_api",
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    resp.raise_for_status()
    result = resp.json()
    if result.get("err_no") != 0:
        raise sr.RequestError(f"百度ASR错误 {result.get('err_no')}: {result.get('err_msg')}")
    total_elapsed = time.time() - t0
    encode_elapsed = t1 - t0
    api_elapsed = time.time() - t1
    logger.info(f"[perf] 百度 ASR 详情: token={'缓存' if t1 - t0 < 0.05 else '刷新'} + 编码={encode_elapsed:.2f}s + 接口={api_elapsed:.2f}s = 总计={total_elapsed:.2f}s")
    return result["result"][0]


class ASRService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        # 关闭动态阈值：防止自动调低导致噪音被误判为语音（百��3301错误的根因）
        self.recognizer.dynamic_energy_threshold = False
        self.recognizer.energy_threshold = 1200  # 降低以更快捕获语音
        self.recognizer.pause_threshold = 0.8    # 停顿0.8s才认为一句话结束（减少截断）
        self.recognizer.phrase_threshold = 0.3   # 最短语音时长（过滤短噪音）
        self.recognizer.non_speaking_duration = 0.5  # 静音缓冲，避免正常停顿被误判为结束
        self._corrections = {}

    def set_corrections(self, corrections: dict):
        """动态更新 ASR 纠错词典"""
        self._corrections = dict(corrections)

    def _apply_corrections(self, text: str) -> str:
        if not text:
            return text
        corrected = text
        for wrong, right in ASR_CORRECTIONS.items():
            corrected = corrected.replace(wrong, right)
        for wrong, right in self._corrections.items():
            corrected = corrected.replace(wrong, right)
        if corrected != text:
            logger.info(f"ASR纠错: {text!r} → {corrected!r}")
        return corrected

    def get_microphone(self) -> sr.Microphone:
        """获取麦克风对象"""
        return sr.Microphone(sample_rate=AUDIO_SAMPLE_RATE)

    def calibrate_noise(self, source: sr.Microphone, duration: float = 1.0):
        """校准麦克风噪音基准，启动时调用一次"""
        logger.info("正在校准麦克风噪音基准，请保持安静...")
        self.recognizer.adjust_for_ambient_noise(source, duration=duration)
        logger.info(f"噪音基准校准完成，能量阈值={self.recognizer.energy_threshold:.0f}")

    def _recognize_engine(self, audio: sr.AudioData, engine: str) -> str:
        """使用指定引擎识别"""
        if engine == "baidu":
            return _baidu_recognize(
                audio,
                app_id=BAIDU_APP_ID,
                api_key=BAIDU_API_KEY,
                secret_key=BAIDU_SECRET_KEY,
                language=ASR_LANGUAGE,
            )
        elif engine == "google":
            return self.recognizer.recognize_google(audio, language=ASR_LANGUAGE)
        return ""

    def recognize(self, audio: sr.AudioData) -> str:
        """识别音频数据，返回文本。主引擎失败时尝试备用引擎。"""
        try:
            text = self._recognize_engine(audio, ASR_ENGINE)
            if not text and ASR_FALLBACK_ENGINE and ASR_FALLBACK_ENGINE != ASR_ENGINE:
                logger.info(f"主引擎 {ASR_ENGINE} 无结果，尝试备用引擎 {ASR_FALLBACK_ENGINE}")
                text = self._recognize_engine(audio, ASR_FALLBACK_ENGINE)
            text = self._apply_corrections(text)
            if text:
                logger.debug(f"ASR识别结果: {text!r}")
            return text

        except sr.UnknownValueError:
            return ""
        except sr.RequestError as e:
            logger.error(f"ASR请求失败（{ASR_ENGINE}）: {e}")
            if ASR_FALLBACK_ENGINE and ASR_FALLBACK_ENGINE != ASR_ENGINE:
                try:
                    return self._recognize_engine(audio, ASR_FALLBACK_ENGINE)
                except Exception:
                    pass
            return ""
        except Exception as e:
            logger.error(f"ASR未知错误: {e}", exc_info=True)
            return ""

    def listen_in_background(self, source: sr.Microphone, callback) -> callable:
        """
        在后台持续监听麦克风，每检测到一段语音就调用 callback(recognizer, audio)

        Returns:
            stop_fn: 调用 stop_fn(wait_for_stop=False) 可停止监听
        """
        stop_fn = self.recognizer.listen_in_background(
            source,
            callback,
            phrase_time_limit=ASR_PHRASE_TIME_LIMIT,
        )
        return stop_fn
