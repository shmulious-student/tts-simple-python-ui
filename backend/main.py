import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Literal
import tempfile

from model import EdgeTtsModel
from ai_processing.orchestrator import AiProcessor

# --- Logging Configuration ---
# This sets up a basic configuration for logging throughout the application.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - [%(name)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# --- FastAPI App Initialization ---

app = FastAPI()

# --- CORS (Cross-Origin Resource Sharing) ---
# This is necessary to allow the React development server (on a different port)
# to make requests to this backend API.

origins = [
    "http://localhost:3000",  # The default port for React's development server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

tts_model = EdgeTtsModel()
logging.info("Initializing AI Processor... (This may take a moment)")
ai_processor = AiProcessor()
logging.info("Initialization complete.")

# --- Pydantic Models for API ---

class SynthesizeRequest(BaseModel):
    text: str
    voice: str

class ProcessUrlRequest(BaseModel):
    url: str
    target_lang: Literal['en', 'he']
    summary_level: Literal['short', 'medium', 'long'] = 'medium'


# --- API Endpoints ---

@app.get("/api/voices")
async def get_voices():
    """
    Dynamically fetches and formats the available voices from the TTS service,
    grouping them by language for the frontend.
    """
    try:
        all_voices = await tts_model.list_voices()
    except Exception as e:
        # If the voice service is down or there's an issue, return an error
        raise HTTPException(status_code=503, detail=f"Could not fetch voices from service: {e}")

    # Helper to extract a clean name like "Hila" from "he-IL-HilaNeural"
    def get_name_from_shortname(short_name):
        parts = short_name.split('-')
        if len(parts) > 2:
            return parts[2].replace('Neural', '')
        return short_name  # Fallback

    # Helper for Hebrew gender translation
    def get_hebrew_gender(gender):
        return 'נקבה' if gender == 'Female' else 'זכר'

    # Define which languages to include and their group names in the UI
    language_groups = {
        "Hebrew": "he-IL",
        "English": "en-US",
    }

    formatted_voices = {name: {} for name in language_groups.keys()}

    for voice in all_voices:
        locale = voice.get('Locale', '')
        short_name = voice.get('ShortName', '')
        gender = voice.get('Gender', '')
        name = get_name_from_shortname(short_name)

        if locale == language_groups["Hebrew"]:
            formatted_voices["Hebrew"][short_name] = f"{get_hebrew_gender(gender)} ({name})"
        elif locale == language_groups["English"]:
            formatted_voices["English"][short_name] = f"{gender} ({name})"

    return formatted_voices

@app.post("/api/process-url")
async def process_url_endpoint(request: ProcessUrlRequest):
    """
    Fetches an article, summarizes it to a specified level, translates it
    to the target language, and returns the resulting text.
    """
    try:
        processed_data = ai_processor.process_url(
            url=request.url,
            target_lang=request.target_lang,
            summary_level=request.summary_level
        )
        return processed_data
    except ValueError as e: # For bad user input like unsupported lang or no text found
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e: # For model/network errors
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Catch-all for any other unexpected errors
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@app.post("/api/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """
    Generates speech from text and streams the audio back.
    """
    if not request.text or not request.voice:
        raise HTTPException(status_code=400, detail="Text and voice must be provided.")

    try:
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
            output_path = tmp_file.name

        # Synthesize the audio using the model
        await tts_model.synthesize_to_file(request.text, request.voice, output_path)

        # Stream the file back to the client
        def file_iterator(path):
            try:
                with open(path, "rb") as f:
                    yield from f
            finally:
                os.remove(path) # Clean up the file after streaming is complete

        return StreamingResponse(file_iterator(output_path), media_type="audio/mpeg")

    except Exception as e:
        # Clean up the temp file in case of an error
        if 'output_path' in locals() and os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=str(e))

# --- Static Files Mount ---
# This must be after all API routes
app.mount("/", StaticFiles(directory="../frontend/build", html=True), name="static")