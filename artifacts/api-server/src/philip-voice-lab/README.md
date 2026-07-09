# Philip Voice Lab (isolated spike)

Internal-only LiveKit voice loop for testing. **Not exposed to production users** when the server kill switch is off.

## Architecture

```
[iOS PhilipVoiceLab] ──WebRTC──► [LiveKit Cloud room]
                                      ▲
[PM2: philip-voice-agent] ────────────┘  (skeleton: dispatch + phase1 + tts)
        │
        ├── POST /api/guidance/phase1  (loopback to main api-server)
        └── POST /api/tts              (spike TTS only)
```

Main `api-server` only adds gated routes in `src/routes/philipVoiceLab.ts`. The agent runs as a **separate process**.

## Server env (Lightsail or local)

Add to `artifacts/api-server/.env.philip-lab` (copy from `philip-lab.env.example`; never commit secrets):

```bash
PHILIP_VOICE_LAB_ENABLED=true
PHILIP_VOICE_LAB_SECRET=<random-long-string>
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
PHILIP_VOICE_LAB_AGENT_DISPATCH_URL=http://127.0.0.1:8091/dispatch
PHILIP_VOICE_LAB_AGENT_PORT=8091
PHILIP_VOICE_LAB_API_BASE=http://127.0.0.1:8080

# Optional dev simulation (runs one phase1+tts turn on dispatch without RTC)
PHILIP_VOICE_LAB_SIMULATE_TURN=false
```

**Kill switch:** set `PHILIP_VOICE_LAB_ENABLED=false` or unset — token routes return 404.

## Run locally

### 1. Main API (existing)

```bash
cd artifacts/api-server
# Merge .env.philip-lab into runtime or export vars
pnpm run dev
```

### 2. Agent worker (separate terminal)

```bash
bash scripts/run-philip-voice-agent.sh
```

### 3. Mint a session (curl)

```bash
curl -s -X POST http://127.0.0.1:8080/api/internal/philip-voice/session \
  -H "Content-Type: application/json" \
  -H "X-Philip-Lab-Secret: $PHILIP_VOICE_LAB_SECRET" \
  -d '{"sessionId":"lab-test-session-001"}' | jq .
```

### 4. iOS lab app

Build with `philip-lab` EAS profile (see `docs/spikes/PHILIP_VOICE_LAB.md`), open:

```
shepherdspath://philip-voice-lab?key=<EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY>
```

## PM2 on Lightsail (when approved — not for production deploy yet)

```bash
pm2 start scripts/run-philip-voice-agent.sh --name philip-voice-agent
pm2 save
```

Stop: `pm2 stop philip-voice-agent`

## Next integration steps (not in this skeleton)

1. Tune VAD thresholds for noisy environments / shorter pauses
2. Optional: `@livekit/agents` framework for production-grade turn detection
3. Streaming TTS via `/api/tts/stream` to reduce time-to-first-byte
4. Re-arm listen after playback (turn loop)

Prompt/theology: unchanged — always via `/api/guidance/phase1`.

## RTC loop (implemented)

On dispatch the agent:

1. Joins the LiveKit room (`@livekit/rtc-node`) and publishes an audio track
2. Subscribes to the user's microphone via `AudioStream`
3. Energy-based VAD collects an utterance on silence
4. `POST /api/guidance/transcribe` (WAV upload)
5. `POST /api/guidance/phase1` → `POST /api/tts`
6. Decodes MP3 → PCM via **ffmpeg**, publishes frames to the agent track
7. Resumes listening after playback

**Requires ffmpeg** on the agent host (`FFMPEG_PATH` optional).
