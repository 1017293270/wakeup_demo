import importlib
import os
from pathlib import Path
import sys
import types
import unittest


SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))


class FakeAudio:
    def get_raw_data(self, convert_rate=None, convert_width=None):
        self.convert_rate = convert_rate
        self.convert_width = convert_width
        return b"\x01\x00" * 1600


def reload_asr_service():
    sys.modules.pop("asr_service", None)
    return importlib.import_module("asr_service")


class FunAsrServiceTests(unittest.TestCase):
    def tearDown(self):
        sys.modules.pop("funasr", None)
        sys.modules.pop("asr_service", None)

    def test_funasr_engine_loads_local_model_and_returns_text(self):
        calls = {}
        funasr = types.ModuleType("funasr")

        class AutoModel:
            def __init__(self, **kwargs):
                calls["init"] = kwargs

            def generate(self, input=None, **kwargs):
                calls["generate"] = {"input": input, **kwargs}
                return [{"text": "小智小智 今天数据概览"}]

        funasr.AutoModel = AutoModel
        sys.modules["funasr"] = funasr

        asr_service = reload_asr_service()
        asr_service.ASR_ENGINE = "funasr"
        asr_service.ASR_FALLBACK_ENGINE = ""
        asr_service.FUNASR_MODEL_DIR = "./models/funasr"
        asr_service.FUNASR_DEVICE = "cpu"

        service = asr_service.ASRService()
        text = service.recognize(FakeAudio())

        self.assertEqual(text, "小智小智 今天数据概览")
        self.assertEqual(calls["init"]["model"], os.path.join("./models/funasr", "paraformer-zh"))
        self.assertEqual(calls["init"]["vad_model"], os.path.join("./models/funasr", "fsmn-vad"))
        self.assertEqual(calls["init"]["punc_model"], os.path.join("./models/funasr", "ct-punc"))
        self.assertEqual(calls["init"]["device"], "cpu")
        self.assertEqual(calls["generate"]["language"], "zh")

    def test_funasr_engine_returns_empty_text_when_dependency_missing(self):
        class MissingFunAsrImporter:
            def find_spec(self, fullname, path=None, target=None):
                if fullname == "funasr":
                    raise ModuleNotFoundError("No module named 'funasr'")
                return None

        asr_service = reload_asr_service()
        asr_service.ASR_ENGINE = "funasr"
        asr_service.ASR_FALLBACK_ENGINE = ""
        asr_service._FUNASR_MODEL = None
        sys.modules.pop("funasr", None)

        original_meta_path = list(sys.meta_path)
        sys.meta_path.insert(0, MissingFunAsrImporter())
        try:
            service = asr_service.ASRService()
            text = service.recognize(FakeAudio())
        finally:
            sys.meta_path = original_meta_path

        self.assertEqual(text, "")


if __name__ == "__main__":
    unittest.main()
