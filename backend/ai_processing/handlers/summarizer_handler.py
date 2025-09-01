import logging
from transformers import pipeline
from .base_handler import ModelLoadingError

logger = logging.getLogger(__name__)

class EnglishSummarizer:
    """
    Handles the English summarization model.
    """
    def __init__(self):
        """
        Initializes the English summarization pipeline.
        """
        try:
            logger.info("Loading English summarization model (sshleifer/distilbart-cnn-12-6)...")
            self.pipeline = pipeline(
                "summarization", model="sshleifer/distilbart-cnn-12-6"
            )
            logger.info("English summarization model loaded successfully.")
        except Exception:
            logger.exception("Failed to load the English summarization model.")
            raise ModelLoadingError("Failed to load the English summarization model.")

    def summarize(self, text: str, min_length: int, max_length: int) -> str:
        """
        Summarizes English text, handling truncation internally.
        """
        # Truncate text to fit the model's context window (1024 tokens)
        truncated_text = self.pipeline.tokenizer.decode(
            self.pipeline.tokenizer.encode(text, max_length=1022, truncation=True),
            skip_special_tokens=True
        )

        summary = self.pipeline(truncated_text, min_length=min_length, max_length=max_length, do_sample=False)
        return summary[0]['summary_text']