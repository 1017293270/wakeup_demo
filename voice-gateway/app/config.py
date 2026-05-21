from pathlib import Path
import os
import re


def _legacy_config_value(name: str, default: str = "") -> str:
    legacy_config = Path(__file__).resolve().parents[2] / "voice-service" / "config.py"
    if not legacy_config.exists():
        return default

    try:
        content = legacy_config.read_text(encoding="utf-8")
    except OSError:
        return default

    match = re.search(rf'^{name}\s*=\s*["\']([^"\']*)["\']', content, re.MULTILINE)
    return match.group(1) if match else default


class Settings:
    def __init__(self) -> None:
        self.host = os.getenv("VOICE_HOST", "127.0.0.1")
        self.port = int(os.getenv("VOICE_PORT", "8766"))
        self.config_path = Path(os.getenv("VOICE_CONFIG_PATH", "data/config.json"))
        self.history_path = Path(os.getenv("VOICE_HISTORY_PATH", "data/history.jsonl"))
        self.dialog_service_root = os.getenv("VOICE_DIALOG_SERVICE_ROOT", "http://101.43.17.8:5001")
        self.workflow_base_url = os.getenv("VOICE_WORKFLOW_BASE_URL", "http://101.43.17.8:7000/sz")
        self.workflow_username = os.getenv("VOICE_WORKFLOW_USERNAME", "admin")
        self.workflow_password = os.getenv("VOICE_WORKFLOW_PASSWORD", "")
        self.mysql_host = os.getenv("VOICE_MYSQL_HOST", _legacy_config_value("MYSQL_HOST", "127.0.0.1"))
        self.mysql_port = int(os.getenv("VOICE_MYSQL_PORT", _legacy_config_value("MYSQL_PORT", "3306")))
        self.mysql_user = os.getenv("VOICE_MYSQL_USER", _legacy_config_value("MYSQL_USER", "root"))
        self.mysql_password = os.getenv("VOICE_MYSQL_PASSWORD", _legacy_config_value("MYSQL_PASSWORD", ""))
        self.mysql_database = os.getenv("VOICE_MYSQL_DATABASE", _legacy_config_value("MYSQL_DATABASE", "jeecg-boot"))
        self.asr_engine = os.getenv("VOICE_ASR_ENGINE", _legacy_config_value("ASR_ENGINE", "mock"))
        self.tts_engine = os.getenv("VOICE_TTS_ENGINE", "edge")
        self.baidu_app_id = os.getenv("VOICE_BAIDU_APP_ID", _legacy_config_value("BAIDU_APP_ID"))
        self.baidu_api_key = os.getenv("VOICE_BAIDU_API_KEY", _legacy_config_value("BAIDU_API_KEY"))
        self.baidu_secret_key = os.getenv("VOICE_BAIDU_SECRET_KEY", _legacy_config_value("BAIDU_SECRET_KEY"))


settings = Settings()
