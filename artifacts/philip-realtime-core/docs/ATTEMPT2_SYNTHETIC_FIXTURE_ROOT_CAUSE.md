# Attempt 2 synthetic fixture failure — root cause

## Proven facts (from Attempt 2 evidence + local WAV reproduction)

1. Realtime transport succeeded: HTTP **201**, data channel open, `session.created` / `session.updated`, then `input_audio_buffer.speech_started`.
2. `input_audio_buffer.speech_stopped` never arrived; client timed out after ~15s (`timeout:s1-greeting:speech_stopped`).
3. Fixture playback ended ~4s after start (`fixturePlaybackEndedAtMs`), with speech already started ~143ms after playback began.

## Local reproduction of the fixture pipeline

Same path as Attempt 2 (`say` → `ffmpeg` PCM16 mono 48 kHz WAV):

| Metric | Value |
|---|---|
| Duration | ~3.98 s |
| RMS last 500 ms | ~0.17 (not silence) |
| RMS last 100 ms | ~0.05 (still speech energy) |
| `trailingSilent500ms` | **false** |
| `endsAbruptlyWithSpeechEnergy` | **true** |

## Client track lifecycle (code audit)

- Audio is injected via `AudioBufferSourceNode` → `AudioContext.createMediaStreamDestination()`.
- The destination `MediaStreamTrack` is added to the peer connection and **left live permanently**.
- After `BufferSource` `ended`, the client does **not**:
  - append trailing zero/silence PCM to the fixture
  - mute/disable the outbound track
  - stop the destination track
  - replace the track with an explicit silence generator for ≥1.5s

## Root cause (proven)

**Compound fixture/VAD defect, not credential or model failure:**

1. **Primary:** Synthetic `say`/`ffmpeg` WAVs **end abruptly with residual speech energy** and **omit trailing silence PCM**, so the provider never receives a clean post-utterance quiet interval from the fixture itself.
2. **Amplifier:** The **`MediaStreamDestination` track remains live** after buffer end without an explicit silence tail or mute, so the automated client waited for `speech_stopped` that semantic VAD never emitted under that stream condition.

Therefore Attempt 3 must use a **real microphone** with observable local silence (≥1.5s), not another synthetic fixture replay.

## Explicit non-actions

- Do not patch-and-retry synthetic automation against Attempt 3 in this preparation.
- Do not treat Attempt 2 as evidence that `gpt-realtime-2.1` or the restored credential failed.
