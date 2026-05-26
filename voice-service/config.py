"""
语音交互服务配置文件
- 唤醒词：小聚小聚
- ASR：Google Web Speech（免费线上）/ 百度语音（备选）
- TTS：Microsoft Edge TTS（免费线上，edge-tts库）
"""

import os


def _load_project_env():
    """Load local .env values for direct Python runs without adding a dependency."""
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and (value or key not in os.environ):
                os.environ[key] = value


_load_project_env()

# ==================== WebSocket ====================
WS_HOST = "127.0.0.1"
WS_PORT = 8766

# ==================== 唤醒词 ====================
WAKE_WORD = "小智小智"
# 因为ASR可能误识别，列出可接受的近似词
WAKE_WORD_ALTERNATIVES = ["小智", "小志小志", "小治小治", "小知小知"]
# 唤醒后等待指令的超时时间（秒）
WAKEUP_LISTEN_TIMEOUT = 60

# ==================== 对话服务 ====================
WORKFLOW_BASE_URL = os.getenv("VOICE_WORKFLOW_BASE_URL", "http://127.0.0.1:7000/sz")
WORKFLOW_USERNAME = os.getenv("VOICE_WORKFLOW_USERNAME", "")
WORKFLOW_PASSWORD = os.getenv("VOICE_WORKFLOW_PASSWORD", "")

# ==================== 问候语 ====================
GREETING_TEXT = "你好，我是小智"

# ==================== ASR 配置 ====================
# 可选: "funasr" | "google" | "baidu"
# - funasr: 本地离线中文 ASR，默认推荐，模型放在 VOICE_ASR_MODEL_DIR
# - google: 无需密钥，直接可用，可能需要科学上网
# - baidu: 需要填写下方百度密钥，适合国内网络环境
ASR_ENGINE = os.getenv("VOICE_ASR_ENGINE", "funasr").lower()
# 当主引擎返回空时，自动尝试备用引擎
# 设为 "" 禁用备用；设为 "google"、"baidu" 或 "funasr"
ASR_FALLBACK_ENGINE = os.getenv("VOICE_ASR_FALLBACK_ENGINE", "").lower()
ASR_LANGUAGE = "zh-CN"

# FunASR 本地模型目录。默认按 voice-service/models/funasr 存放：
#   paraformer-zh/
#   fsmn-vad/
#   ct-punc/
FUNASR_MODEL_DIR = os.getenv(
    "VOICE_ASR_MODEL_DIR",
    os.path.join(os.path.dirname(__file__), "models", "funasr"),
)
FUNASR_DEVICE = os.getenv("VOICE_FUNASR_DEVICE", "cpu")
FUNASR_DISABLE_UPDATE = os.getenv("VOICE_FUNASR_DISABLE_UPDATE", "true").lower() == "true"
# 百度 ASR 模型 PID
#   1537: 普通话(纯中文识别) — 通用免费模型
ASR_DEV_PID = 1537

# ASR 后处理纠错词典（常见误识别 → 正确文本）
ASR_CORRECTIONS = {
    # 业务高频词汇纠错（工单/事件 是最高频的误识别对）
    "世界": "事件",
    "工资": "工单",
    "公示": "工单",
    "公单": "工单",
    "攻单": "工单",
    "公丹": "工单",
    "空单": "工单",
    "总是": "总数",
    # 时间相关
    "上上个月": "上个月",
    "上上": "上",
    "上上上": "上",
}

# 百度语音识别 API（ASR_ENGINE = "baidu" 时填写）
# 申请地址：https://ai.baidu.com/tech/speech
BAIDU_APP_ID = os.getenv("VOICE_BAIDU_APP_ID", "")
BAIDU_API_KEY = os.getenv("VOICE_BAIDU_API_KEY", "")
BAIDU_SECRET_KEY = os.getenv("VOICE_BAIDU_SECRET_KEY", "")

# ==================== TTS 配置 ====================
# Microsoft Edge TTS 中文语音，完全免费
# 可选音色参考：https://speech.microsoft.com/portal/voicegallery
# 推荐：
#   zh-CN-XiaoxiaoNeural  - ���声，温柔自然（默认）
#   zh-CN-YunxiNeural     - 男声，清晰流畅
#   zh-CN-XiaoyiNeural    - 女声，活泼可爱
TTS_VOICE = "zh-CN-XiaoxiaoNeural"
TTS_RATE = "+0%"    # 语速，范围 -50% ~ +100%
TTS_VOLUME = "+0%"  # 音量，范围 -50% ~ +100%

# ==================== 音频采集 ====================
AUDIO_SAMPLE_RATE = 16000
# 每段识别的最长时间（秒），超过则截断
ASR_PHRASE_TIME_LIMIT = 8
# 识别到唤醒词后，忽略接下来 N 秒内的识别结果（防止唤醒词残音被当指令）
WAKEUP_IGNORE_SECONDS = 1.5

# 激活状态下，静默超过此时间（秒）自动回到待机
ACTIVE_TIMEOUT = 15

# ==================== 声纹识别配置 ====================
# 是否启用声纹验证（启用后只有已注册的声纹才能唤醒）
VOICEPRINT_ENABLED = False
# 百度声纹识别分组ID（自己定义，用于区分不同的声纹库）
VOICEPRINT_GROUP_ID = "voice_wake_group"

# ==================== 数据库配置 ====================
MYSQL_HOST = os.getenv("VOICE_MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("VOICE_MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("VOICE_MYSQL_USER", "")
MYSQL_PASSWORD = os.getenv("VOICE_MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("VOICE_MYSQL_DATABASE", "")
