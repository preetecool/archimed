# Archimed - Medical Transcription & Note Generation Platform

A real-time medical transcription platform that converts doctor-patient conversations into structured medical notes using AI.

## Architecture Overview

### Frontend (Nuxt.js/Vue.js)
- **Framework**: Nuxt 3 with Vue.js components
- **Features**: Real-time audio recording, WebSocket communication, payment integration (Stripe)
- **Authentication**: Firebase Auth with session cookies
- **Internationalization**: English/French support
- **Key Components**: AudioRecorder, SessionList, MedicalNoteDisplay

### Payment System (Stripe Integration)
- **Subscription Management**: Trial activation with payment collection
- **Checkout Sessions**: Server-side checkout session creation with webhook validation
- **Payment History**: Customer payment tracking and subscription status monitoring
- **API Endpoints**: `/api/payments/create-checkout-session`, `/api/subscription/status`
- **Webhook Handling**: Secure Stripe webhook processing for payment events
- **Components**: PaymentModal, SubscriptionInfo, TrialPaymentCollection

### WebSocket Service
- Real-time bidirectional communication between client and transcription server
- Connection management with automatic reconnection and heartbeat monitoring
- Message queuing for offline scenarios
- Client identity management with persistent session tracking

### Web Worker (Audio Processing)
- **File**: `client/public/workers/audioProcessor.worker.js`
- Handles audio chunk processing and IndexedDB storage
- Manages offline audio buffering and synchronization
- Implements automatic cleanup and storage optimization

### Python Backend (FastAPI)
- **Location**: `transcription/` directory
- **WebSocket Server**: Real-time audio processing at `localhost:8080`
- **Features**: Session management, audio transcription, medical note generation
- **AI Models**: Faster-Whisper for transcription, custom medical note generation

### Whisper Integration
- **Model**: Faster-Whisper "turbo" model with CUDA acceleration
- Real-time streaming transcription with beam search (beam_size=5)
- Optimized for medical terminology and French/English languages

### Data Flow
1. Browser captures audio → Web Worker processes chunks
2. WebSocket sends audio to Python backend
3. Faster-Whisper transcribes audio in real-time
4. AI generates structured medical notes
5. Results streamed back to client via WebSocket

## Setup

Install dependencies for both client and transcription services:

```bash
# Client setup
cd client && npm install

# Python backend setup
cd transcription && pip install -r requirements.txt
```

## Development

Start both services:

```bash
# Start transcription server (port 8080)
cd transcription && python run.py

# Start Nuxt development server (port 3000)
cd client && npm run dev
```
