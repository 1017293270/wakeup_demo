import difflib
import logging

from app.schemas.config import WakeConfig

logger = logging.getLogger(__name__)

# Minimum similarity ratio for fuzzy wake word matching (0.0–1.0)
FUZZY_THRESHOLD = 0.55


class WakeupDetector:
    def __init__(self, config: WakeConfig):
        self.config = config
        self._bytes_seen = 0

    def reset(self) -> None:
        self._bytes_seen = 0

    def detect_by_text(self, text: str) -> bool:
        if not text:
            return False

        # Exact match first
        if self.config.wake_word and self.config.wake_word in text:
            return True
        if any(item and item in text for item in self.config.wake_word_alternatives):
            return True

        # Fuzzy match: ASR often returns phonetic near-hits
        all_words = [self.config.wake_word] + self.config.wake_word_alternatives
        for word in all_words:
            if not word:
                continue
            ratio = difflib.SequenceMatcher(None, text.strip(), word).ratio()
            if ratio >= FUZZY_THRESHOLD:
                logger.info(
                    "[Wakeup] fuzzy match: text='%s' vs word='%s' similarity=%.2f (threshold=%.2f)",
                    text, word, ratio, FUZZY_THRESHOLD,
                )
                return True

        # Log what the near-misses were for debugging
        best_ratio = 0.0
        best_word = ""
        for word in all_words:
            if not word:
                continue
            ratio = difflib.SequenceMatcher(None, text.strip(), word).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_word = word
        if best_ratio > 0.3:
            logger.info(
                "[Wakeup] near miss: text='%s' vs best_word='%s' similarity=%.2f (need %.2f)",
                text, best_word, best_ratio, FUZZY_THRESHOLD,
            )

        return False

    def detect_mock_audio(self, frame: bytes) -> bool:
        self._bytes_seen += len(frame)
        # About one second of 16kHz mono int16 audio. This keeps local联调 deterministic.
        return self._bytes_seen >= 32000
