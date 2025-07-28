from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uuid
import base64
import json
import asyncio
from io import BytesIO
import time

app = FastAPI()

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
        self.active_connections = {}
        self.last_activity = {}

    async def connect(self, websocket, client_id):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.last_activity[client_id] = time.time()
        print(f"Client connected: {client_id}")

    def disconnect(self, client_id):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            if client_id in self.last_activity:
                del self.last_activity[client_id]
            print(f"Client disconnected: {client_id}")

    async def send_json(self, client_id, data):
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:

                if "type" in data and "_" in data["type"]:
                    data["type"] = data["type"].replace("_", "-")
                await websocket.send_json(data)
                self.last_activity[client_id] = time.time()
            except Exception as e:
                print(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Test Audio Recording Server"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/ping")
async def ping():
    """Respond to ping requests with a pong"""
    return {"ping": "pong", "timestamp": time.time()}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    query_params = dict(websocket.query_params)
    client_id = query_params.get('client_id')

    if not client_id or client_id == "undefined":
        client_id = str(uuid.uuid4())
        print(f"No client ID provided, generated: {client_id}")
    else:
        print(f"Client connecting with ID: {client_id}")

    await manager.connect(websocket, client_id)

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:

                await websocket.send_bytes(b"\x01")
                continue

            if "text" in message:
                if not message["text"].strip():
                    await websocket.send_text("")
                    continue

                try:
                    data = json.loads(message["text"])

                    if "type" in data:
                        message_type = data["type"].replace("-", "_")
                        print(f"Received message from {client_id}: {message_type}")

                        if message_type == "keep_alive":
                            await manager.send_json(client_id, {
                                "type": "keep_alive_response",
                                "timestamp": time.time() * 1000
                            })

                        elif message_type == "start_session":

                            session_id = str(uuid.uuid4())
                            active_sessions[session_id] = {
                                "client_id": client_id,
                                "status": "recording",
                                "start_time": time.time(),
                                "transcript": ""
                            }
                            session_audio_buffers[session_id] = BytesIO()

                            await manager.send_json(client_id, {
                                "type": "session-created",
                                "sessionId": session_id
                            })
                            print(f"Session created: {session_id} for client {client_id}")

                        elif message_type == "audio_chunk":
                            session_id = data.get("session_id")
                            chunk_id = data.get("chunk_id")
                            sequence_number = data.get("sequence_number", 0)


                            await manager.send_json(client_id, {
                                "type": "chunk-ack",
                                "sessionId": session_id,
                                "chunkId": chunk_id,
                                "sequenceNumber": sequence_number
                            })


                            if sequence_number % 5 == 0 and session_id in active_sessions:

                                fake_transcript = "This is a simulated transcription for testing purposes."
                                active_sessions[session_id]["transcript"] = fake_transcript

                                await manager.send_json(client_id, {
                                    "type": "transcription-update",
                                    "sessionId": session_id,
                                    "chunk": fake_transcript,
                                    "fullTranscript": fake_transcript
                                })

                        elif message_type == "end_session":
                            session_id = data.get("session_id") or data.get("sessionId")

                            if session_id in active_sessions:
                                session = active_sessions[session_id]
                                session["status"] = "completed"

                                await manager.send_json(client_id, {
                                    "type": "processing-status",
                                    "sessionId": session_id,
                                    "status": "completed",
                                    "progress": 100
                                })

                                await manager.send_json(client_id, {
                                    "type": "medical-note",
                                    "sessionId": session_id,
                                    "note": "# Test Medical Note\n\n## Transcript\nThis is a simulated transcript.\n\n## Note\nThis is a test note generated by the server."
                                })

                                await manager.send_json(client_id, {
                                    "type": "session-ended",
                                    "sessionId": session_id,
                                    "status": "complete"
                                })

                        else:

                            await manager.send_json(client_id, {
                                "type": "echo",
                                "originalType": message_type,
                                "data": data
                            })

                except json.JSONDecodeError:
                    print(f"Received invalid JSON from client {client_id}")

    except WebSocketDisconnect:
        print(f"Client disconnected: {client_id}")
    except Exception as e:
        print(f"Error handling WebSocket connection: {e}")
    finally:
        manager.disconnect(client_id)


        for session_id, session in list(active_sessions.items()):
            if session.get("client_id") == client_id and session.get("status") == "recording":
                session["status"] = "completed"
                print(f"Marked session {session_id} as completed due to client disconnect")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
