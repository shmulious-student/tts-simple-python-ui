import logging
from transformers import pipeline
from .base_handler import ModelLoadingError

logger = logging.getLogger(__name__)

class HebrewTranslator:
    """
    Handles the English-to-Hebrew translation model.
    """
    def __init__(self):
        """
        Initializes the English-to-Hebrew translation pipeline.
        """
        try:
            logger.info("Loading English-to-Hebrew translation model (Helsinki-NLP/opus-mt-en-he)...")
            self.pipeline = pipeline(
                "translation_en_to_he", model="Helsinki-NLP/opus-mt-en-he"
            )
            logger.info("English-to-Hebrew translation model loaded successfully.")
        except Exception:
            logger.exception("Failed to load the English-to-Hebrew translation model.")
            raise ModelLoadingError("Failed to load the English-to-Hebrew translation model.")

    def translate_to_hebrew(self, text: str, max_length: int) -> str:
        """
        Translates English text to Hebrew, handling truncation internally.
        """
        # Truncate text to fit the model's context window (512 tokens)
        truncated_text = self.pipeline.tokenizer.decode(
            self.pipeline.tokenizer.encode(text, max_length=510, truncation=True),
            skip_special_tokens=True
        )

        result = self.pipeline(truncated_text, max_length=max_length)
        return result[0]['translation_text']