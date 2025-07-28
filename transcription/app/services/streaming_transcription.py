import os
import time
import tempfile
import subprocess
from pathlib import Path
from faster_whisper import WhisperModel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO


_model = None

def get_model():
    """Get or initialize the WhisperModel singleton"""
    global _model
    if _model is None:
        print("Initializing WhisperModel...")
        _model = WhisperModel("small", device="cuda", compute_type="float16")
        print("WhisperModel initialized successfully")
    return _model


class StreamingTranscriptionSession:
    """Manages a streaming transcription session with in-memory chunk handling"""

    def __init__(self, session_id):
        self.session_id = session_id
        self.model = get_model()
        self.accumulated_text = ""
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.last_transcription_time = 0
        self.transcription_interval = 8
        self.pending_transcription = False


        self.audio_buffer = BytesIO()
        self.audio_size = 0

    async def process_chunk(self, audio_bytes, websocket_manager, client_id):
        """Process an audio chunk and return incremental transcription"""

        self.audio_buffer.write(audio_bytes)
        self.audio_size += len(audio_bytes)

        print(f"Added {len(audio_bytes)} bytes to audio buffer for session {self.session_id}")


        current_time = time.time()
        time_since_last = current_time - self.last_transcription_time





        should_transcribe = (
            time_since_last > self.transcription_interval and
            not self.pending_transcription and
            self.audio_size > 10000
        )

        if should_transcribe:
            self.pending_transcription = True
            self.last_transcription_time = current_time

            try:

                future = self.executor.submit(self._transcribe_audio_buffer)
                new_transcript = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: future.result()
                )


                if new_transcript and len(new_transcript) > 5:
                    self.accumulated_text = new_transcript


                    await websocket_manager.send_json(client_id, {
                        "type": "transcription-update",
                        "sessionId": self.session_id,
                        "chunk": new_transcript,
                        "fullTranscript": self.accumulated_text
                    })

            except Exception as e:
                print(f"Error in transcription: {e}")
                import traceback
                traceback.print_exc()
            finally:
                self.pending_transcription = False


        return {
            "new_text": "",
            "full_text": self.accumulated_text
        }

    def _transcribe_audio_buffer(self):
        """Transcribe the audio buffer - runs in a separate thread"""
        try:

            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_webm:
                temp_webm_path = temp_webm.name

                self.audio_buffer.seek(0)
                temp_webm.write(self.audio_buffer.read())
                self.audio_buffer.seek(0, 2)

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                temp_wav_path = temp_wav.name


            ffmpeg_cmd = f'ffmpeg -y -i "{temp_webm_path}" -ar 16000 -ac 1 -acodec pcm_s16le "{temp_wav_path}"'
            result = subprocess.run(ffmpeg_cmd, shell=True, capture_output=True, text=True)

            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")

                self._cleanup_temp_files(temp_webm_path, temp_wav_path)
                return ""


            print(f"Transcribing temporary audio: {temp_wav_path}")
            segments, info = self.model.transcribe(temp_wav_path, beam_size=5)

            transcript = ""
            segments_list = list(segments)

            if segments_list:
                print(f"Detected language '{info.language}' with probability {info.language_probability}")

                for segment in segments_list:
                    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
                    transcript += segment.text + " "

            result = transcript.strip()
            print(f"Full transcript result: {result[:50]}...")


            self._cleanup_temp_files(temp_webm_path, temp_wav_path)

            return result

        except Exception as e:
            print(f"Error in transcription: {e}")
            import traceback
            traceback.print_exc()

            try:
                self._cleanup_temp_files(temp_webm_path, temp_wav_path)
            except:
                pass
            return ""

    def _cleanup_temp_files(self, *file_paths):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")

    def cleanup(self):
        """Clean up resources"""

        try:
            self.audio_buffer.close()
        except:
            pass
        self.executor.shutdown(wait=False)



active_transcription_sessions = {}

def get_or_create_session(session_id):
    """Get or create a transcription session"""
    if session_id not in active_transcription_sessions:
        active_transcription_sessions[session_id] = StreamingTranscriptionSession(session_id)
    return active_transcription_sessions[session_id]

def end_session(session_id):
    """End a transcription session and return the final transcript"""
    print(f"Ending streaming transcription session: {session_id}")
    print(f"Available sessions: {list(active_transcription_sessions.keys())}")

    if session_id in active_transcription_sessions:
        session = active_transcription_sessions[session_id]


        transcription = session.accumulated_text


        transcript_length = len(transcription) if transcription else 0
        transcript_preview = transcription[:100] + "..." if transcript_length > 100 else transcription
        print(f"Found transcription of length {transcript_length}")
        print(f"Transcript preview: {transcript_preview}")

        try:

            session.cleanup()
            del active_transcription_sessions[session_id]
            print(f"Streaming transcription session {session_id} ended with {transcript_length} characters")
        except Exception as e:
            print(f"Error cleaning up session {session_id}: {e}")

        return transcription
    else:

        from app.services import main

        try:
            if hasattr(main, 'active_sessions') and session_id in main.active_sessions:

                main_session = main.active_sessions[session_id]
                if "transcript" in main_session and main_session["transcript"]:
                    transcript = main_session["transcript"]
                    print(f"Recovered transcript from main session: {len(transcript)} characters")
                    return transcript
        except Exception as recovery_error:
            print(f"Failed to recover transcript from main session: {recovery_error}")

        print(f"Warning: No streaming transcription session found for {session_id}")
        return ""