import logging
import time

from app.storage.mysql_client import SessionLocal, VoiceHistory as VoiceHistoryModel

logger = logging.getLogger(__name__)


class HistoryStore:
    def append(self, item: dict) -> dict:
        db = SessionLocal()
        try:
            row = VoiceHistoryModel(
                wake_word=item.get("wake_word", ""),
                instruction_text=item.get("instruction_text", ""),
                tts_text=item.get("tts_text", ""),
                status=item.get("status", "success"),
                duration=item.get("duration", 0),
            )
            db.add(row)
            db.commit()
            db.refresh(row)
            return {
                "id": row.id,
                "created_at": row.create_time.strftime("%Y-%m-%d %H:%M:%S") if row.create_time else "",
                **item,
            }
        except Exception:
            db.rollback()
            logger.exception("Failed to append history to MySQL")
            return item
        finally:
            db.close()

    def list(self, keyword: str = "") -> list[dict]:
        db = SessionLocal()
        try:
            query = db.query(VoiceHistoryModel)
            if keyword:
                query = query.filter(
                    (VoiceHistoryModel.instruction_text.like(f"%{keyword}%"))
                    | (VoiceHistoryModel.tts_text.like(f"%{keyword}%"))
                )
            rows = query.order_by(VoiceHistoryModel.create_time.desc()).limit(200).all()
            return [
                {
                    "id": row.id,
                    "wake_word": row.wake_word,
                    "instruction_text": row.instruction_text,
                    "tts_text": row.tts_text,
                    "status": row.status,
                    "duration": row.duration,
                    "create_time": row.create_time.strftime("%Y-%m-%d %H:%M:%S") if row.create_time else "",
                }
                for row in rows
            ]
        except Exception:
            logger.exception("Failed to list history from MySQL")
            return []
        finally:
            db.close()

    def clear(self) -> None:
        db = SessionLocal()
        try:
            db.query(VoiceHistoryModel).delete()
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to clear history in MySQL")
        finally:
            db.close()


history_store = HistoryStore()
