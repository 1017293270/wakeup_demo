import json
import logging

from app.config import settings
from app.schemas.config import WakeConfig
from app.storage.mysql_client import SessionLocal, VoiceConfig as VoiceConfigModel

logger = logging.getLogger(__name__)


class ConfigStore:
    def load(self) -> WakeConfig:
        db = SessionLocal()
        try:
            rows = db.query(VoiceConfigModel).all()
            raw: dict[str, object] = {}
            for row in rows:
                try:
                    raw[row.config_key] = json.loads(row.config_value)
                except (json.JSONDecodeError, TypeError):
                    raw[row.config_key] = row.config_value
            return WakeConfig(
                **{k: v for k, v in raw.items() if k in WakeConfig.model_fields},
                dialog_service_root=settings.dialog_service_root,
                asr_engine=settings.asr_engine,
            )
        except Exception:
            logger.warning("Failed to load config from MySQL, using defaults")
            return WakeConfig(
                dialog_service_root=settings.dialog_service_root,
                asr_engine=settings.asr_engine,
            )
        finally:
            db.close()

    def save(self, config: WakeConfig) -> WakeConfig:
        db = SessionLocal()
        try:
            for key, value in config.model_dump(exclude={"dialog_service_root", "asr_engine"}).items():
                value_str = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
                row = db.query(VoiceConfigModel).filter(VoiceConfigModel.config_key == key).first()
                if row:
                    row.config_value = value_str
                else:
                    db.add(VoiceConfigModel(config_key=key, config_value=value_str))
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to save config to MySQL")
        finally:
            db.close()
        return config


config_store = ConfigStore()
