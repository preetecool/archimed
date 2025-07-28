
from faster_whisper import WhisperModel
import os


_model = None

def get_whisper_model():
    global _model
    if _model is None:
        print("Initializing Whisper Turbo model...")
        _model = WhisperModel("turbo", device="cuda", compute_type="float16")
    return _model



