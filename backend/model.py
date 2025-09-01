import re
import edge_tts
import html

class EdgeTtsModel:
    """
    A wrapper class for the edge-tts library to synthesize text to speech. It
    converts plain text to SSML for more robust synthesis.
    This class requires the 'edge-tts' package to be installed.
    (pip install edge-tts)
    """

    # This regex matches any character that is NOT a valid XML 1.0 character.
    # See: https://www.w3.org/TR/xml/#charsets
    _INVALID_XML_CHARS_RE = re.compile(
        '[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]'
    )

    def _strip_invalid_xml_chars(self, text: str) -> str:
        """Removes characters that are invalid in XML using a pre-compiled regex."""
        return self._INVALID_XML_CHARS_RE.sub('', text)

    def _preprocess_text(self, text: str) -> str:
        """
        Cleans and prepares plain text for synthesis by removing invalid characters
        and normalizing whitespace. This provides robustness without using SSML.
        """
        clean_lines = []
        lines = text.splitlines()
        for line in lines:
            # Sanitize the line by stripping whitespace and invalid XML characters.
            clean_line = self._strip_invalid_xml_chars(line.strip())
            if clean_line:
                clean_lines.append(clean_line)
        
        # Join the cleaned lines with a space. The TTS engine is smart enough
        # to handle pauses based on punctuation like periods and commas.
        return " ".join(clean_lines)

    async def synthesize_to_file(self, text: str, voice: str, output_path: str) -> None:
        """
        Synthesizes the given text to an audio file using the specified voice.
        This method now preprocesses the text for robustness.
        """
        # Preprocess the raw text to clean it up before sending to the engine.
        processed_text = self._preprocess_text(text)
        communicate = edge_tts.Communicate(processed_text, voice)
        await communicate.save(output_path)

    async def list_voices(self):
        """Returns a sorted list of available voices from edge-tts."""
        voices = await edge_tts.list_voices()
        # Sort by ShortName for a consistent and user-friendly order
        return sorted(voices, key=lambda voice: voice['ShortName'])