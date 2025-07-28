from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
import base64
import os
import aiohttp
import traceback
import asyncio
import json
from starlette.websockets import WebSocketState
from typing import Dict
import time
from fastapi import Body
from pathlib import Path
from io import BytesIO
import tempfile
import subprocess
import concurrent.futures
from faster_whisper import WhisperModel
from app.services.streaming_transcription import get_or_create_session, end_session
from app.services.whisper_model import get_whisper_model
from app.services.note_generation import generate_medical_note

os.environ["HF_HOME"] = "/hf_home"
os.environ["XDG_CACHE_HOME"] = "/hf_home"

ThreadPoolExecutor = concurrent.futures.ThreadPoolExecutor

def to_frontend_format(data):
    if not isinstance(data, dict):
        return data

    result = {}
    for key, value in data.items():
        parts = key.split('_')
        camel_key = parts[0] + ''.join(x.title() for x in parts[1:])

        if isinstance(value, dict):
            result[camel_key] = to_frontend_format(value)
        elif isinstance(value, list) and all(isinstance(item, dict) for item in value):
            result[camel_key] = [to_frontend_format(item) for item in value]
        else:
            result[camel_key] = value

    return result

def from_frontend_format(data):
    if not isinstance(data, dict):
        return data

    result = {}
    for key, value in data.items():
        snake_key = ''.join(['_' + c.lower() if c.isupper() else c for c in key]).lstrip('_')

        if isinstance(value, dict):
            result[snake_key] = from_frontend_format(value)
        elif isinstance(value, list) and all(isinstance(item, dict) for item in value):
            result[snake_key] = [from_frontend_format(item) for item in value]
        else:
            result[snake_key] = value

    return result

def give_transcript(audio_bytes):
    if not audio_bytes or len(audio_bytes) == 0:
        print("ERROR: No audio data provided to give_transcript")
        return ""

    print(f"Starting transcription of {len(audio_bytes)} bytes")
    start = time.time()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
        temp_wav_path = temp_wav.name
        temp_wav.write(audio_bytes)

    try:
        model = get_whisper_model()
        transcription_start = time.time()

        try:
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(model.transcribe, temp_wav_path, beam_size=5)
                try:
                    segments, info = future.result(timeout=120)
                except concurrent.futures.TimeoutError:
                    return "Transcription timed out"
        except Exception as transcribe_error:
            print(f"ERROR during transcription: {transcribe_error}")
            traceback.print_exc()
            return f"Transcription error: {str(transcribe_error)}"

        transcript = ""
        segment_count = 0
        try:
            for segment in segments:
                segment_count += 1
                transcript += segment.text + " "
        except Exception as segment_error:
            print(f"ERROR processing segments: {segment_error}")
            traceback.print_exc()

        end = time.time()
        return transcript.strip()
    except Exception as e:
        print(f"ERROR in give_transcript: {e}")
        traceback.print_exc()
        return f"Error during transcription: {str(e)}"
    finally:
        try:
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
        except Exception as e:
            print(f"Error cleaning up temporary file: {e}")

def convert_webm_to_wav(webm_data):
    if not webm_data:
        return b""

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_webm:
        temp_webm_path = temp_webm.name
        temp_webm.write(webm_data)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
        temp_wav_path = temp_wav.name

    try:
        ffmpeg_cmd = f"ffmpeg -i {temp_webm_path} -ar 16000 -ac 1 {temp_wav_path}"
        try:
            result = subprocess.run(
                ffmpeg_cmd, shell=True, check=True, capture_output=True, timeout=30
            )
        except subprocess.TimeoutExpired:
            return b""
        except subprocess.CalledProcessError:
            return b""

        with open(temp_wav_path, 'rb') as wav_file:
            wav_data = wav_file.read()
            return wav_data
    except Exception as e:
        return b""
    finally:
        try:
            os.unlink(temp_webm_path)
            os.unlink(temp_wav_path)
        except Exception:
            pass

def fix_webm_headers(webm_data):
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_input:
        temp_input_path = temp_input.name
        temp_input.write(webm_data)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_output:
        temp_output_path = temp_output.name

    try:
        subprocess.run(
            f"ffmpeg -y -i {temp_input_path} -c copy -map 0 -movflags faststart {temp_output_path}",
            shell=True, check=True, capture_output=True
        )

        with open(temp_output_path, 'rb') as fixed_file:
            return fixed_file.read()
    finally:
        try:
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
        except Exception:
            pass

def get_transcription_service_url():
    service_url = "http://host.docker.internal:8000/transcribe"
    return service_url

async def call_transcription_service(audio_data):
    transcription_url = get_transcription_service_url()

    try:
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field('file', audio_data, filename='audio.webm', content_type='audio/webm')

            async with session.post(transcription_url, data=form_data) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('transcript', '')
                else:
                    error_text = await response.text()
                    print(f"Error from transcription service: {response.status}, {error_text}")
                    return ""
    except Exception as e:
        print(f"Error calling transcription service: {e}")
        traceback.print_exc()
        return ""


app = FastAPI(title="Medical Transcription Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_sessions = {}
session_audio_buffers = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.last_activity: Dict[str, float] = {}
        self.last_pong: Dict[str, float] = {}
        self.connection_start_time: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        is_reconnection = client_id in self.last_activity
        self.active_connections[client_id] = websocket
        self.last_activity[client_id] = time.time()
        self.last_pong[client_id] = time.time()

        if not is_reconnection:
            self.connection_start_time[client_id] = time.time()
            print(f"New client connected: {client_id}")
        else:
            print(f"Client reconnected: {client_id}")
            await self.handle_client_reconnection(client_id)

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            if client_id in self.last_activity:
                del self.last_activity[client_id]
            if client_id in self.last_pong:
                del self.last_pong[client_id]
            if client_id in self.connection_start_time:
                duration = time.time() - self.connection_start_time[client_id]
                print(f"Client disconnected: {client_id} (connected for {duration:.2f} seconds)")
                del self.connection_start_time[client_id]
            else:
                print(f"Client disconnected: {client_id}")

    async def send_json(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            try:
                frontend_data = to_frontend_format(data)
                if "type" in data:
                    frontend_data["type"] = data["type"].replace("_", "-")

                websocket = self.active_connections[client_id]
                if websocket.client_state != WebSocketState.CONNECTED:
                    print(f"Cannot send to {client_id} - connection not in CONNECTED state")
                    self.disconnect(client_id)
                    return

                try:
                    await websocket.send_json(frontend_data)
                    self.last_activity[client_id] = time.time()
                except WebSocketDisconnect as e:
                    print(f"WebSocket disconnected while sending to {client_id}: {e}")
                    self.disconnect(client_id)
                except Exception as e:
                    print(f"Error sending JSON to client {client_id}: {e}")
                    if "connection is closed" in str(e).lower() or "disconnected" in str(e).lower():
                        self.disconnect(client_id)
            except Exception as e:
                print(f"Error preparing message for client {client_id}: {e}")
                traceback.print_exc()
                self.disconnect(client_id)
        else:
            print(f"Cannot send message to client {client_id} - not in active connections")

    async def send_bytes(self, client_id: str, data: bytes):
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                if websocket.client_state != WebSocketState.CONNECTED:
                    print(f"Cannot send bytes to {client_id} - connection not in CONNECTED state")
                    self.disconnect(client_id)
                    return
                await websocket.send_bytes(data)
                self.last_activity[client_id] = time.time()
            except Exception as e:
                print(f"Error sending bytes to client {client_id}: {e}")
                self.disconnect(client_id)
        else:
            print(f"Cannot send bytes to client {client_id} - not in active connections")

    async def handle_binary_message(self, client_id: str, data: bytes):
        try:
            await self.send_bytes(client_id, b"\x01")
        except Exception as e:
            print(f"Error handling binary message from {client_id}: {e}")

    async def check_inactive_connections(self, timeout_seconds: int = 60):
        while True:
            await asyncio.sleep(20)
            current_time = time.time()
            clients_to_disconnect = []

            for client_id, last_active in list(self.last_activity.items()):
                if current_time - last_active > timeout_seconds:
                    connection_duration = 0
                    if client_id in self.connection_start_time:
                        connection_duration = current_time - self.connection_start_time[client_id]
                    print(f"Client {client_id} inactive for {timeout_seconds}s (connected for {connection_duration:.2f}s), closing connection")
                    clients_to_disconnect.append(client_id)

            for client_id in clients_to_disconnect:
                if client_id in self.active_connections:
                    try:
                        await self.active_connections[client_id].close(code=1000, reason="Inactivity timeout")
                    except:
                        pass
                    self.disconnect(client_id)

    async def handle_client_reconnection(self, client_id: str):
        client_sessions = []
        for session_id, session in active_sessions.items():
            if session.get("client_id") == client_id:
                client_sessions.append({
                    "id": session_id,
                    "status": session.get("status", "unknown"),
                    "startTime": session.get("start_time", 0)
                })

        if not client_sessions:
            print(f"No active sessions found for client {client_id}")
            return

        print(f"Found {len(client_sessions)} active sessions for client {client_id}")
        await self.send_json(client_id, {
            "type": "reconnection_info",
            "activeSessions": client_sessions,
            "timestamp": time.time() * 1000
        })

        for session in client_sessions:
            if session.get("status") == "recording":
                print(f"Resuming recording session {session['id']} for client {client_id}")
                await self.send_json(client_id, {
                    "type": "session-resumed",
                    "sessionId": session["id"],
                    "status": "recording"
                })
            elif session.get("status") == "pending_completion":
                print(f"Session {session['id']} is pending completion for client {client_id}")
                await self.send_json(client_id, {
                    "type": "session-pending-completion",
                    "sessionId": session["id"]
                })


manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Medical Transcription Service API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    query_params = dict(websocket.query_params)
    client_id = query_params.get('client_id')

    if not client_id or client_id == "undefined":
        client_id = str(uuid.uuid4())
        print(f"No client ID provided, generated: {client_id}")
    else:
        print(f"Client connecting with ID: {client_id}")

    inactive_checker_task = None
    keepalive_task = None
    ping_task = None
    is_reconnection = client_id in manager.active_connections

    try:
        await manager.connect(websocket, client_id)
        inactive_checker_task = asyncio.create_task(manager.check_inactive_connections())

        async def send_app_ping():
            try:
                while True:
                    await asyncio.sleep(15)
                    if client_id in manager.active_connections:
                        try:
                            if websocket.client_state == WebSocketState.CONNECTED:
                                await manager.send_json(client_id, {
                                    "type": "app-ping",
                                    "timestamp": time.time() * 1000
                                })
                        except Exception as e:
                            print(f"Error sending app ping to {client_id}: {e}")
                            break
                    else:
                        break
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Error in app ping task for {client_id}: {e}")

        app_ping_task = asyncio.create_task(send_app_ping())

        while True:
            try:
                message = await asyncio.wait_for(websocket.receive(), timeout=60)
                manager.last_activity[client_id] = time.time()

                if "bytes" in message:
                    bytes_data = message.get("bytes", b"")
                    if not bytes_data or bytes_data == b"\x00":
                        try:
                            await websocket.send_bytes(b"\x00")
                        except Exception as e:
                            print(f"Error responding to ping from {client_id}: {e}")
                    else:
                        await manager.handle_binary_message(client_id, bytes_data)
                    continue

                if "text" in message:
                    try:
                        if not message["text"].strip():
                            try:
                                await websocket.send_text("")
                            except Exception as e:
                                print(f"Error responding to text ping from {client_id}: {e}")
                            continue

                        data = json.loads(message["text"])
                        data = from_frontend_format(data)

                        if "type" in data:
                            message_type = data["type"].replace("-", "_")
                            data["type"] = message_type
                        else:
                            message_type = "unknown"

                        print(f"Received message from {client_id}: {message_type}")

                        if message_type == "keep_alive":
                            await manager.send_json(client_id, {
                                "type": "keep_alive_response",
                                "timestamp": time.time() * 1000,
                                "server_time": time.time()
                            })
                            continue

                        if message_type == "start_session":
                            await handle_start_session(client_id, data)
                        elif message_type == "audio_chunk":
                            await handle_audio_chunk(client_id, data)
                        elif message_type == "resume_session":
                            await handle_resume_session(client_id, data)
                        elif message_type == "end_session":
                            await handle_end_session(client_id, data)
                        elif message_type == "delete_session":
                            await handle_delete_session(client_id, data)
                        elif message_type == "update_session_metadata":
                            await handle_update_session_metadata(client_id, data)
                        else:
                            await manager.send_json(client_id, {
                                "type": "error",
                                "message": f"Unknown message type: {message_type}"
                            })
                    except json.JSONDecodeError:
                        print(f"Received invalid JSON from client {client_id}")
                        await manager.send_json(client_id, {
                            "type": "error",
                            "message": "Invalid JSON data"
                        })

            except asyncio.TimeoutError:
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_bytes(b"\x00")
                        manager.last_activity[client_id] = time.time()
                        continue
                    else:
                        print(f"Connection no longer active for {client_id}")
                        break
                except Exception as e:
                    print(f"Connection check failed for {client_id}, closing: {e}")
                    break
            except WebSocketDisconnect as e:
                print(f"WebSocket disconnected normally for {client_id}: {e}")
                break
            except RuntimeError as e:
                if "disconnect message" in str(e):
                    print(f"WebSocket for {client_id} has already disconnected")
                    break
                print(f"Runtime error for client {client_id}: {e}")
                try:
                    await manager.send_json(client_id, {
                        "type": "error",
                        "message": "Server runtime error"
                    })
                except:
                    pass
                if websocket.client_state != WebSocketState.CONNECTED:
                    break
            except Exception as e:
                print(f"Error processing message from {client_id}: {e}")
                traceback.print_exc()
                try:
                    await manager.send_json(client_id, {
                        "type": "error",
                        "message": "Server error processing message"
                    })
                except:
                    pass
                if websocket.client_state != WebSocketState.CONNECTED:
                    break

    except WebSocketDisconnect:
        print(f"WebSocket disconnected normally: {client_id}")
    except Exception as e:
        print(f"Error in WebSocket connection for {client_id}: {e}")
        traceback.print_exc()
    finally:
        if app_ping_task and not app_ping_task.done():
            app_ping_task.cancel()

        if keepalive_task and not keepalive_task.done():
            keepalive_task.cancel()

        if inactive_checker_task and not inactive_checker_task.done():
            inactive_checker_task.cancel()

        manager.disconnect(client_id)

        for session_id, session in list(active_sessions.items()):
            if session.get("client_id") == client_id:
                if session.get("status") == "recording":
                    session["status"] = "pending_completion"
                    session["pendingFinalization"] = True
                    session["lastEndAttempt"] = time.time()
                    print(f"Session {session_id} marked as pending completion")

                if session_id in session_audio_buffers:
                    try:
                        session_audio_buffers[session_id].close()
                        del session_audio_buffers[session_id]
                    except:
                        pass


async def handle_start_session(client_id: str, data: dict):
    session_id = str(uuid.uuid4())

    active_sessions[session_id] = {
        "client_id": client_id,
        "status": "recording",
        "start_time": time.time(),
        "transcript": "",
        "metadata": data.get("metadata", {}),
    }

    session_audio_buffers[session_id] = BytesIO()

    await manager.send_json(client_id, {
        "type": "session-created",
        "sessionId": session_id
    })

    print(f"Session created: {session_id} for client {client_id}")


async def handle_update_session_metadata(client_id: str, data: dict):
    session_id = data.get("session_id")
    metadata = data.get("metadata")

    if not session_id or session_id not in active_sessions:
        await manager.send_json(client_id, {
            "type": "error",
            "message": "Invalid session ID",
            "session_id": session_id
        })
        return

    if metadata and isinstance(metadata, dict):
        for key, value in metadata.items():
            if key == "reasons" and isinstance(value, list):
                active_sessions[session_id]["reasons"] = value
            else:
                if "metadata" not in active_sessions[session_id]:
                    active_sessions[session_id]["metadata"] = {}
                active_sessions[session_id]["metadata"][key] = value

        await manager.send_json(client_id, {
            "type": "metadata_updated",
            "session_id": session_id,
            "message": "Session metadata updated successfully"
        })

        print(f"Updated metadata for session {session_id}")


def transcribe_with_model(audio_bytes):
    try:
        from app.services.whisper_model import get_whisper_model

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
            temp_wav_path = temp_wav.name
            temp_wav.write(audio_bytes)

        try:
            model = get_whisper_model()
            segments, info = model.transcribe(temp_wav_path, beam_size=5)

            transcript = ""
            for segment in segments:
                transcript += segment.text + " "

            return transcript.strip()
        finally:
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
    except Exception as e:
        print(f"Error in direct transcription: {e}")
        traceback.print_exc()
        return ""

async def handle_audio_chunk(client_id: str, data: dict):
    session_id = data.get("session_id")
    audio_base64 = data.get("audio")
    chunk_id = data.get("chunk_id")
    sequence_number = data.get("sequence_number", 0)

    print(f"Processing audio chunk for session_id: {session_id}, sequence: {sequence_number}")

    if not session_id or session_id not in active_sessions:
        await manager.send_json(client_id, {
            "type": "error",
            "message": "Invalid session ID",
            "sessionId": session_id
        })
        return

    session = active_sessions[session_id]
    if session.get("client_id") != client_id:
        print(f"Client {client_id} trying to submit audio for session {session_id} owned by {session.get('client_id')}")
        session["client_id"] = client_id

    try:
        audio_bytes = base64.b64decode(audio_base64)

        if session_id in session_audio_buffers:
            session_audio_buffers[session_id].write(audio_bytes)

        transcription_session = get_or_create_session(session_id)
        result = await transcription_session.process_chunk(audio_bytes, manager, client_id)

        active_sessions[session_id]["transcript"] = result["full_text"]

        await manager.send_json(client_id, {
            "type": "chunk-ack",
            "sessionId": session_id,
            "chunkId": chunk_id,
            "sequenceNumber": sequence_number
        })

    except Exception as e:
        print(f"Error processing audio chunk: {e}")
        traceback.print_exc()
        await manager.send_json(client_id, {
            "type": "error",
            "message": "Failed to process audio chunk",
            "sessionId": session_id,
            "details": str(e)
        })

async def handle_resume_session(client_id: str, data: dict):
    session_id = data.get("session_id")

    if not session_id or session_id not in active_sessions:
        await handle_start_session(client_id, data)
        return

    session = active_sessions[session_id]
    old_client_id = session.get("client_id")

    if old_client_id != client_id:
        print(f"Session {session_id} being resumed by client {client_id} (was {old_client_id})")
        session["client_id"] = client_id

    if session["status"] in ["disconnected", "pending_completion"]:
        session["status"] = "recording"
        session["reconnect_time"] = time.time()

        session["reconnection_events"] = session.get("reconnection_events", [])
        session["reconnection_events"].append({
            "time": time.time(),
            "client_id": client_id,
            "client_time": data.get("client_time")
        })

    transcription = session.get("transcript", "")

    await manager.send_json(client_id, {
        "type": "session-resumed",
        "sessionId": session_id,
        "status": session["status"],
        "transcript": transcription
    })

    print(f"Session {session_id} resumed for client {client_id}")


async def handle_end_session(client_id: str, data: dict):
    session_id = data.get("session_id") or data.get("sessionId")

    print(f"Ending session with ID: {session_id}")

    if not session_id or session_id not in active_sessions:
        await manager.send_json(client_id, {
            "type": "error",
            "message": "Invalid session ID",
            "sessionId": session_id
        })
        return

    session = active_sessions[session_id]
    current_transcript = session.get("transcript", "")
    print(f"End session for {session_id} with transcript length: {len(current_transcript)}")

    session["status"] = "processing"
    session["pendingFinalization"] = False

    print(f"Sending processing-status message for session {session_id}")

    try:
        await manager.send_json(client_id, {
            "type": "processing-status",
            "sessionId": session_id,
            "status": "started",
            "progress": 25
        })
    except Exception as e:
        print(f"Error sending initial processing status: {e}")

    heartbeat_task = None

    async def send_periodic_heartbeats():
        try:
            while session_id in active_sessions and active_sessions[session_id]["status"] == "processing":
                try:
                    await manager.send_json(client_id, {
                        "type": "processing-heartbeat",
                        "sessionId": session_id,
                        "timestamp": time.time() * 1000
                    })
                except Exception as e:
                    print(f"Error sending heartbeat: {e}")
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error in heartbeat task: {e}")

    try:
        heartbeat_task = asyncio.create_task(send_periodic_heartbeats())
        process_task = asyncio.create_task(process_session_audio(session_id, client_id))

        def on_task_done(task):
            try:
                result = task.result()
                print(f"Background task for session {session_id} completed")
                if heartbeat_task and not heartbeat_task.done():
                    heartbeat_task.cancel()
            except Exception as e:
                print(f"Background task for session {session_id} failed: {e}")
                traceback.print_exc()
                if heartbeat_task and not heartbeat_task.done():
                    heartbeat_task.cancel()

        process_task.add_done_callback(on_task_done)
        print(f"End session request for {session_id} handled, processing in background")

    except Exception as e:
        print(f"Error setting up processing tasks: {e}")
        if heartbeat_task and not heartbeat_task.done():
            heartbeat_task.cancel()


async def handle_delete_session(client_id: str, data: dict):
    session_id = data.get("session_id")

    if session_id in active_sessions:
        del active_sessions[session_id]
        print(f"Deleted session {session_id}")

    if session_id in session_audio_buffers:
        try:
            session_audio_buffers[session_id].close()
            del session_audio_buffers[session_id]
            print(f"Deleted audio buffer for session {session_id}")
        except Exception as e:
            print(f"Error cleaning up audio buffer: {e}")

    await manager.send_json(client_id, {
        "type": "session_deleted",
        "session_id": session_id
    })

async def process_session_audio(session_id: str, client_id: str):
    processing_start_time = time.time()
    processing_timeout = 600

    try:
        print(f"STARTING PROCESS_SESSION_AUDIO for {session_id}")

        if session_id not in active_sessions:
            print(f"Error: Session {session_id} not found in active_sessions")
            return False

        session = active_sessions[session_id]
        session["processing_start_time"] = processing_start_time

        await manager.send_json(client_id, {
            "type": "processing-status",
            "sessionId": session_id,
            "status": "processing",
            "progress": 25
        })


        print(f"Getting transcript for {session_id}")
        transcript = ""

        session_transcript = session.get("transcript", "")
        print(f"Existing session transcript: {len(session_transcript) if session_transcript else 0} chars")

        streaming_transcript = ""
        try:
            from app.services.streaming_transcription import end_session
            streaming_transcript = end_session(session_id)
            print(f"Got streaming transcript: {len(streaming_transcript) if streaming_transcript else 0} chars")
        except Exception as e:
            print(f"Error getting streaming transcript: {e}")
            traceback.print_exc()

        if streaming_transcript and len(streaming_transcript.strip()) >= 50:
            if session_transcript and len(session_transcript) > len(streaming_transcript) * 1.1:
                print(f"Using existing session transcript ({len(session_transcript)} chars) which is significantly longer than streaming transcript")
                transcript = session_transcript
            else:
                print(f"Using streaming transcript ({len(streaming_transcript)} chars)")
                transcript = streaming_transcript
        elif session_transcript and len(session_transcript.strip()) >= 50:
            print(f"Using existing session transcript ({len(session_transcript)} chars)")
            transcript = session_transcript
        else:
            print("Using full audio transcription as fallback")
            try:
                transcription_start = time.time()
                TRANSCRIPTION_TIMEOUT = 60

                if session_id in session_audio_buffers:
                    print(f"Transcribing full audio for {session_id}")
                    audio_buffer = session_audio_buffers[session_id]
                    audio_buffer.seek(0)
                    audio_data = audio_buffer.read()
                    audio_buffer.seek(0)

                    if audio_data and len(audio_data) > 0:
                        print(f"Audio buffer size: {len(audio_data)} bytes")

                        partial_transcript = ""
                        if streaming_transcript and len(streaming_transcript) > 0:
                            partial_transcript = streaming_transcript
                        elif session_transcript and len(session_transcript) > 0:
                            partial_transcript = session_transcript

                        if partial_transcript:
                            print(f"Will supplement fallback transcription with partial transcript ({len(partial_transcript)} chars)")

                        from app.services.whisper_model import get_whisper_model
                        model = get_whisper_model()

                        try:
                            full_transcript = await asyncio.wait_for(
                                asyncio.get_event_loop().run_in_executor(None, lambda: transcribe_with_model(audio_data)),
                                timeout=TRANSCRIPTION_TIMEOUT
                            )

                            print(f"Full transcription completed in {time.time() - transcription_start:.2f}s: {len(full_transcript)} chars")

                            if full_transcript and len(full_transcript.strip()) > 50:
                                if partial_transcript and len(partial_transcript) > len(full_transcript) * 1.2:
                                    transcript = partial_transcript
                                    print(f"Keeping partial transcript ({len(partial_transcript)} chars) which is longer than full transcript ({len(full_transcript)} chars)")
                                else:
                                    transcript = full_transcript
                                    print(f"Using full transcript ({len(full_transcript)} chars)")
                            else:
                                if partial_transcript:
                                    transcript = partial_transcript
                                    print(f"Full transcript too short, using partial transcript ({len(partial_transcript)} chars)")
                                else:
                                    print("No usable transcript available")
                        except asyncio.TimeoutError:
                            print(f"Transcription timed out after {TRANSCRIPTION_TIMEOUT}s")
                            if partial_transcript:
                                transcript = partial_transcript
                                print(f"Using partial transcript ({len(partial_transcript)} chars) due to timeout")
                            else:
                                transcript = "Transcription not available (timed out)"
                    else:
                        print("No audio data found in buffer")
                        transcript = streaming_transcript or session_transcript or "No audio data available for transcription"
                else:
                    print(f"No audio buffer found for session {session_id}")
                    transcript = streaming_transcript or session_transcript or "Audio buffer not found"
            except Exception as e:
                print(f"Error in fallback transcription: {e}")
                traceback.print_exc()
                transcript = streaming_transcript or session_transcript or f"Transcription error: {str(e)[:100]}"

        if not transcript or len(transcript.strip()) < 20:
            transcript = "Transcription not available or too short"

        session["transcript"] = transcript
        print(f"Final transcript for {session_id} set: {len(transcript)} chars")

        await manager.send_json(client_id, {
            "type": "processing-status",
            "sessionId": session_id,
            "status": "processing",
            "progress": 50
        })


        print(f"Starting note generation with {len(transcript)} chars")

        reasons = []
        if "metadata" in session and isinstance(session["metadata"], dict):
            if "reasons" in session["metadata"] and isinstance(session["metadata"]["reasons"], list):
                reasons = session["metadata"]["reasons"]

        note = ""
        try:
            NOTE_TIMEOUT = 60
            await manager.send_json(client_id, {
                "type": "processing-status",
                "sessionId": session_id,
                "status": "processing",
                "progress": 60,
                "message": "Generating medical note"
            })

            note_start_time = time.time()
            note = await asyncio.wait_for(
                generate_medical_note(transcript, reasons),
                timeout=NOTE_TIMEOUT
            )
            note_generation_time = time.time() - note_start_time

            print(f"Note generation completed in {note_generation_time:.2f}s: {len(note)} chars")

            await manager.send_json(client_id, {
                "type": "processing-status",
                "sessionId": session_id,
                "status": "processing",
                "progress": 80
            })
        except asyncio.TimeoutError:
            print(f"Note generation timed out after {NOTE_TIMEOUT}s, using fallback")
            note = create_fallback_note(transcript, reasons)
        except Exception as e:
            print(f"Error in note generation: {e}")
            traceback.print_exc()
            note = create_fallback_note(transcript, reasons)

        try:
            if session_id in session_audio_buffers:
                print(f"Cleaning up audio buffer for {session_id}")
                session_audio_buffers[session_id].close()
                del session_audio_buffers[session_id]
        except Exception as e:
            print(f"Error cleaning up audio buffer: {e}")

        print(f"Sending note to client: {len(note)} chars")

        async def send_with_retry(message_type, data, max_retries=3):
            for attempt in range(max_retries):
                try:
                    full_message = {
                        "type": message_type,
                        "sessionId": session_id,
                        **data
                    }
                    await manager.send_json(client_id, full_message)
                    return True
                except Exception as e:
                    print(f"Error sending {message_type} (attempt {attempt+1}): {e}")
                    await asyncio.sleep(1)
            return False

        note_sent = await send_with_retry("medical-note", {
            "note": note
        })

        if not note_sent:
            print(f"Failed to send medical note to client")

        status_sent = await send_with_retry("processing-status", {
            "status": "completed",
            "progress": 100
        })

        if not status_sent:
            print(f"Failed to send completion status to client")

        if session_id in active_sessions:
            session["status"] = "completed"
            session["medicalNote"] = note
            session["end_time"] = time.time()
            session["processing_end_time"] = time.time()

        ended_sent = await send_with_retry("session-ended", {
            "status": "complete"
        })

        if not ended_sent:
            print(f"Failed to send session-ended to client")

        print(f"PROCESS_SESSION_AUDIO COMPLETED in {time.time() - processing_start_time:.2f}s for {session_id}")
        return note_sent and status_sent and ended_sent

    except asyncio.TimeoutError as e:
        print(f"TIMEOUT in process_session_audio for {session_id}: {e}")
        traceback.print_exc()
        processing_duration = time.time() - processing_start_time

        try:
            if session_id in active_sessions and active_sessions[session_id].get("status") == "processing":
                active_sessions[session_id]["status"] = "error"
                active_sessions[session_id]["error"] = f"Processing timeout after {processing_duration:.2f}s"
                active_sessions[session_id]["processing_end_time"] = time.time()

                await manager.send_json(client_id, {
                    "type": "processing-status",
                    "sessionId": session_id,
                    "status": "error",
                    "progress": 100,
                    "message": "Processing timeout"
                })

                await manager.send_json(client_id, {
                    "type": "session-ended",
                    "sessionId": session_id,
                    "status": "error"
                })
        except Exception as notify_e:
            print(f"Error notifying client of processing timeout: {notify_e}")

        return False

    except Exception as e:
        print(f"ERROR in process_session_audio for {session_id}: {e}")
        traceback.print_exc()
        processing_duration = time.time() - processing_start_time

        try:
            if session_id in active_sessions and active_sessions[session_id].get("status") == "processing":
                active_sessions[session_id]["status"] = "error"
                active_sessions[session_id]["error"] = str(e)
                active_sessions[session_id]["processing_end_time"] = time.time()

                try:
                    transcript = active_sessions[session_id].get("transcript", "")
                    reasons = []
                    if "metadata" in active_sessions[session_id] and isinstance(active_sessions[session_id]["metadata"], dict):
                        if "reasons" in active_sessions[session_id]["metadata"]:
                            reasons = active_sessions[session_id]["metadata"]["reasons"]

                    fallback_note = create_fallback_note(transcript, reasons)
                    active_sessions[session_id]["medicalNote"] = fallback_note

                    await manager.send_json(client_id, {
                        "type": "medical-note",
                        "sessionId": session_id,
                        "note": fallback_note
                    })
                except Exception as note_e:
                    print(f"Error creating/sending fallback note: {note_e}")

                await manager.send_json(client_id, {
                    "type": "processing-status",
                    "sessionId": session_id,
                    "status": "error",
                    "progress": 100,
                    "message": f"Error during processing: {str(e)[:100]}"
                })

                await manager.send_json(client_id, {
                    "type": "session-ended",
                    "sessionId": session_id,
                    "status": "error"
                })
        except Exception as notify_e:
            print(f"Error notifying client of processing error: {notify_e}")

        return False


def create_fallback_note(transcript, reasons):
    return f"""# Note Médicale


{', '.join(reasons) if reasons else 'Consultation générale'}


{transcript}


Une synthèse n'a pas pu être générée en raison d'une erreur technique.
"""

def transcribe_with_model(audio_data):
    try:
        from app.services.whisper_model import get_whisper_model

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
            temp_wav_path = temp_wav.name
            temp_wav.write(audio_data)

        try:
            model = get_whisper_model()
            segments, info = model.transcribe(temp_wav_path, beam_size=5)

            transcript = ""
            for segment in segments:
                transcript += segment.text + " "

            return transcript.strip()
        finally:
            if os.path.exists(temp_wav_path):
                os.unlink(temp_wav_path)
    except Exception as e:
        print(f"Error in transcribe_with_model: {e}")
        traceback.print_exc()
        return ""


@app.post("/generate-note")
async def generate_note_api(request: dict = Body(...)):
    transcript = request.get("transcript")
    reasons = request.get("reasons", [])

    if not transcript:
        raise HTTPException(status_code=400, detail="Missing transcript")

    try:
        try:
            from app.services.note_generation import generate_medical_note
            note = await generate_medical_note(transcript, reasons)
        except Exception as e:
            print(f"Error importing or calling note generation service: {e}")
            traceback.print_exc()
            note = f"""# Medical Note


{transcript}


This is an automatically generated note based on the audio transcript.
"""

        return {"success": True, "note": note}
    except Exception as e:
        print(f"Error in generate-note endpoint: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating note: {str(e)}")

@app.get("/ping")
async def ping():
    return {"ping": "pong", "timestamp": time.time()}

@app.post("/api/finalize-session")
async def finalize_session_api(request: dict = Body(...)):
    session_id = request.get("sessionId") or request.get("session_id")
    client_id = request.get("clientId") or request.get("client_id")

    if not session_id or not client_id:
        raise HTTPException(status_code=400, detail="Missing sessionId or clientId")

    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    data = {
        "session_id": session_id
    }

    try:
        await handle_end_session(client_id, data)
        return {"success": True, "message": f"Session {session_id} finalized successfully"}
    except Exception as e:
        print(f"Error finalizing session via HTTP: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error finalizing session: {str(e)}")

@app.get("/api/session-status/{session_id}")
async def get_session_status(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = active_sessions[session_id]

    return {
        "status": session.get("status", "unknown"),
        "progress": 100 if session.get("status") == "completed" else 50,
        "transcript": session.get("transcript", ""),
        "note": session.get("medicalNote", ""),
        "startTime": session.get("start_time", 0),
        "endTime": session.get("end_time", 0)
    }


async def cleanup_old_sessions():
    while True:
        current_time = time.time()
        for session_id, session in list(active_sessions.items()):

            if current_time - session.get("start_time", current_time) > 86400:
                if session_id in session_audio_buffers:
                    try:
                        session_audio_buffers[session_id].close()
                        del session_audio_buffers[session_id]
                    except:
                        pass
                del active_sessions[session_id]
                print(f"Cleaned up old session: {session_id}")
        await asyncio.sleep(3600)

async def monitor_processing_sessions():
    while True:
        current_time = time.time()
        for session_id, session in list(active_sessions.items()):
            if session.get("status") == "processing":

                if session.get("start_processing_time") and current_time - session.get("start_processing_time") > 300:
                    print(f"Session {session_id} processing timeout - marking as error")
                    session["status"] = "error"
                    session["error"] = "Processing timeout"
        await asyncio.sleep(30)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(monitor_processing_sessions())
    asyncio.create_task(cleanup_old_sessions())
