# Philip Voice Lab — Required HTTP Endpoints

## Mobile lab app (via nginx → lab API :3101)

| Method | Path | Auth | Implementation |
|--------|------|------|----------------|
| GET | `/api/internal/philip-voice/health` | `X-Philip-Lab-Secret` | `routes/philipVoiceLab.ts` |
| POST | `/api/internal/philip-voice/session` | secret header | Mints LiveKit token; dispatches agent |
| POST | `/api/internal/philip-voice/evaluation` | secret | Gate B eval (eval screen) |
| POST | `/api/internal/philip-voice/timeline/client` | secret | Merges client timeline JSON |
| GET | `/api/internal/philip-voice/timeline/:id` | secret | Reads file-backed timeline |

Storage: `server/philip-voice-lab/*.json` — **no production database**.

## Voice agent (loopback only)

| Method | Path | Target | Auth | Purpose |
|--------|------|--------|------|---------|
| POST | `/dispatch` | agent :8091 | `X-Philip-Lab-Secret` | Start room worker |
| GET | `/health` | agent :8091 | none | ffmpeg + room count |
| POST | `/api/internal/philip-voice/timeline` | lab API :3101 | secret | Persist turn timeline |
| POST | `/api/guidance/transcribe` | **production** :3001 | session body | Whisper STT |
| POST | `/api/guidance/phase1` | **production** :3001 | none | Turn 1 Philip |
| POST | `/api/guidance/response` | **production** :3001 | `philipVoiceLab: true` | Turn 2+ Philip |
| POST | `/api/tts` | **production** :3001 | `scope: guidance` | Philip voice MP3 |

Guidance routes: `routes/routes.ts` → `handleGuidanceTurn` in `philip-runtime/runtime/pipeline.ts`.

## nginx public exposure (minimum)

Only this prefix is proxied to :3101:

```
/api/internal/philip-voice/
```

Agent `:8091` and production guidance `:3001` remain loopback-only from the server's perspective.
