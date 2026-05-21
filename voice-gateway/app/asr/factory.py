from app.asr.provider_baidu import BaiduRecognizer
from app.asr.recognizer import AsrRecognizer, MockRecognizer
from app.schemas.config import WakeConfig


def create_recognizer(config: WakeConfig) -> AsrRecognizer:
    if config.asr_engine == "baidu":
        return BaiduRecognizer()
    return MockRecognizer()
