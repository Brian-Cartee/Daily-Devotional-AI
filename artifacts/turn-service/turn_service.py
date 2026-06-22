"""
Smart Turn Detection Service — Shepherd's Path
Port 3002 | WebSocket endpoint: /ws/turn

Receives raw PCM audio (16kHz, mono, float32) from the browser via AudioWorklet.
Uses Silero VAD to detect speech activity, then fires turn_complete after a short
post-speech silence — replacing the 10-second blind timer in the browser.

Events sent to client:
  {"event": "ready"}          — model loaded, connection open
  {"event": "speech_start"}   — voice activity detected
  {"event": "speech_end"}     — voice went silent
  {"event": "turn_complete"}  — silence held long enough: user is done
  {"event": "error", "msg"}   — something went wrong
"""

import asyncio
import json
import logging
import numpy as np
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("turn-service")

# ---------------------------------------------------------------------------
# Load Silero VAD once at startup (cached by torch.hub)
# ---------------------------------------------------------------------------
log.info("Loading Silero VAD model...")
_vad_model, _vad_utils = torch.hub.load(
    repo_or_dir="snakers4/silero-vad",
    model="silero_vad",
    force_reload=False,
    verbose=False,
)
log.info("Silero VAD ready.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Tuning constants
# ---------------------------------------------------------------------------
SAMPLE_RATE = 16_000
VAD_WINDOW = 512          # samples per Silero VAD call (~32ms at 16kHz)
VAD_THRESHOLD = 0.45      # speech probability threshold
MIN_SPEECH_MS = 400       # ignore noise bursts shorter than this
SILENCE_AFTER_SPEECH_MS = 900   # silence needed after speech to fire turn_complete
WATCHDOG_MS = 25_000      # fire turn_complete even if VAD never sees silence


@app.websocket("/ws/turn")
async def turn_detection(websocket: WebSocket):
    await websocket.accept()
    log.info("Client connected")

    # Per-connection VAD iterator (stateful)
    vad_iter = _vad_utils[3](_vad_model, sampling_rate=SAMPLE_RATE, threshold=VAD_THRESHOLD)

    buf = np.empty(0, dtype=np.float32)   # rolling PCM buffer
    speech_active = False
    speech_ms_accumulated = 0
    silence_task: asyncio.Task | None = None
    watchdog_task: asyncio.Task | None = None
    turn_fired = False

    async def fire_turn():
        nonlocal turn_fired
        if turn_fired:
            return
        turn_fired = True
        try:
            await websocket.send_text(json.dumps({"event": "turn_complete"}))
        except Exception:
            pass

    async def silence_countdown():
        await asyncio.sleep(SILENCE_AFTER_SPEECH_MS / 1000)
        await fire_turn()

    async def watchdog_countdown():
        await asyncio.sleep(WATCHDOG_MS / 1000)
        if not turn_fired:
            log.warning("Watchdog fired — forcing turn_complete")
            await fire_turn()

    def cancel_silence():
        nonlocal silence_task
        if silence_task and not silence_task.done():
            silence_task.cancel()
        silence_task = None

    def cancel_watchdog():
        nonlocal watchdog_task
        if watchdog_task and not watchdog_task.done():
            watchdog_task.cancel()
        watchdog_task = None

    try:
        await websocket.send_text(json.dumps({"event": "ready"}))

        while True:
            raw = await websocket.receive_bytes()
            if not raw:
                continue

            # Append to rolling buffer
            chunk = np.frombuffer(raw, dtype=np.float32)
            buf = np.concatenate([buf, chunk])

            # Process in VAD_WINDOW-sized windows
            while len(buf) >= VAD_WINDOW:
                window = buf[:VAD_WINDOW]
                buf = buf[VAD_WINDOW:]
                tensor = torch.from_numpy(window)

                speech_dict = vad_iter(tensor, return_seconds=False)

                if speech_dict:
                    if "start" in speech_dict:
                        speech_active = True
                        cancel_silence()
                        # Start watchdog on first speech
                        if watchdog_task is None:
                            watchdog_task = asyncio.create_task(watchdog_countdown())
                        try:
                            await websocket.send_text(json.dumps({"event": "speech_start"}))
                        except Exception:
                            pass

                    elif "end" in speech_dict and speech_active:
                        speech_active = False
                        # Only act if we've accumulated enough speech
                        speech_ms_accumulated += int(VAD_WINDOW / SAMPLE_RATE * 1000)
                        if speech_ms_accumulated >= MIN_SPEECH_MS:
                            try:
                                await websocket.send_text(json.dumps({"event": "speech_end"}))
                            except Exception:
                                pass
                            cancel_silence()
                            silence_task = asyncio.create_task(silence_countdown())

    except WebSocketDisconnect:
        log.info("Client disconnected")
    except Exception as e:
        log.error(f"Error: {e}")
        try:
            await websocket.send_text(json.dumps({"event": "error", "msg": str(e)}))
        except Exception:
            pass
    finally:
        cancel_silence()
        cancel_watchdog()
        vad_iter.reset_states()


@app.get("/health")
async def health():
    return {"status": "ok", "model": "silero-vad"}
