import logging
import langdetect
from .article_fetcher import fetch_article_text, ArticleFetchingError
from .handlers import EnglishSummarizer, HebrewTranslator, ModelLoadingError
from .constants import SUPPORTED_TARGET_LANGS, MBART_LANG_MAP

# Get a logger instance for this module
logger = logging.getLogger(__name__)

# Suppress verbose logging from langdetect and ensure consistent results
langdetect.DetectorFactory.seed = 0


class AiProcessor:
    """
    Orchestrates the process of fetching, summarizing, and translating web articles.
    """

    def __init__(self):
        """Initializes the underlying AI translator model."""
        try:
            self.english_summarizer = EnglishSummarizer()
            self.hebrew_translator = HebrewTranslator()
            self.initialization_error = None
            logger.info("AI Processor initialized successfully.")
        except ModelLoadingError:
            logger.exception("Failed to initialize one or more AI models. The processor will be unavailable.")
            self.initialization_error = "ModelLoadingError"  # Store a simple indicator

        # This map defines which languages the user can select as a target.
        self.supported_target_langs = SUPPORTED_TARGET_LANGS

        # Define separate summary levels for English-only output vs. translation.
        # English summaries can be much longer as the summarizer has a larger context window.
        self.english_summary_levels = {
            'short': {'min_length': 100, 'max_length': 200},
            'medium': {'min_length': 200, 'max_length': 400},
            'long': {'min_length': 400, 'max_length': 800}
        }

        # For translation, summaries must be shorter to fit within the translator's
        # 512-token limit. This prevents quality degradation.
        self.translation_summary_levels = {
            'short': {'min_length': 50, 'max_length': 120},
            'medium': {'min_length': 120, 'max_length': 250},
            'long': {'min_length': 250, 'max_length': 450}
        }

    def _get_source_language_info(self, text: str) -> dict:
        """
        Detects the source language of the text and returns its properties.
        """
        try:
            detected_lang = langdetect.detect(text[:1000])
            lang_map = {'en': 'English', 'he': 'Hebrew'}
            lang_name = lang_map.get(detected_lang, detected_lang)
            logger.info("Detected source language: '%s' (%s)", detected_lang, lang_name)
            return {
                "is_english": detected_lang == 'en',
                "mbart_code": MBART_LANG_MAP.get(detected_lang),
                "name": lang_name
            }
        except langdetect.lang_detect_exception.LangDetectException:
            logger.warning("Language detection failed for the provided text snippet. Assuming not English.")
            return {"is_english": False, "mbart_code": None, "name": "Unknown"}

    def process_url(self, url: str, target_lang: str, summary_level: str = 'medium') -> dict:
        """Fetches, summarizes, and translates content from a URL."""
        if self.initialization_error:
            raise RuntimeError(
                "AI processor is not available due to a model loading error.") from self.initialization_error

        # --- Select the appropriate summary length limits based on the target language ---
        if target_lang == 'en':
            summary_levels = self.english_summary_levels
        else:
            summary_levels = self.translation_summary_levels

        if target_lang not in self.supported_target_langs:
            raise ValueError(f"Target language '{target_lang}' is not supported.")
        if summary_level not in summary_levels:
            raise ValueError(f"Summary level '{summary_level}' is not supported.")

        try:
            article_text = fetch_article_text(url)
        except ArticleFetchingError as e:
            logger.exception("Failed to fetch or parse article from URL: %s", url)
            raise RuntimeError(f"Failed to fetch content from the provided URL: {url}") from e

        if not article_text.strip():
            raise ValueError("Could not extract readable text from the provided URL.")

        # --- Simplified Core Logic ---

        source_info = self._get_source_language_info(article_text)
        lengths = summary_levels[summary_level]

        if source_info["is_english"]:
            # --- High-Quality English Source Path ---
            logger.info("Step 1/2: Summarizing English text...")
            english_summary = self.english_summarizer.summarize(
                text=article_text,
                min_length=lengths['min_length'],
                max_length=lengths['max_length']
            )

            result_text = ""
            if target_lang == 'en':
                logger.info("English summary requested. Task complete.")
                result_text = english_summary
            elif target_lang == 'he':
                logger.info("Step 2/2: Translating summary to Hebrew...")
                result_text = self.hebrew_translator.translate_to_hebrew(english_summary,
                                                                         max_length=lengths['max_length'])

            return {
                "processed_text": result_text,
                "detected_language": source_info["name"]
            }
        else:
            # All other combinations are not supported to ensure quality.
            raise ValueError(f"Unsupported path: from language '{source_info['mbart_code']}' to '{target_lang}'.")