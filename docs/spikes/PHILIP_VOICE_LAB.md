# Philip Voice Lab (spike)

Isolated native-only spike for LiveKit + Philip voice loop. **Not merged to main, not deployed to production users** until explicitly approved.

**Gate B (UX validation):** [`PHILIP_VOICE_LAB_GATE_B.md`](./PHILIP_VOICE_LAB_GATE_B.md) — prove Philip, not LiveKit.

**Gate B harness:** After disconnect, `/philip-voice-eval` scores each conversation. Logs: `artifacts/api-server/server/philip-voice-lab/{conversationId}.json`.

## What this is

| Piece | Location |
|-------|----------|
| Server kill switch + token mint | `artifacts/api-server/src/routes/philipVoiceLab.ts` |
| Agent worker (PM2) | `artifacts/api-server/src/philip-voice-lab/agent.mjs` |
| Native lab screen | `mobile-build/app/philip-voice-lab.tsx` |
| Feature flag | `EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB` (philip-lab builds only) |
| EAS profile | `philip-lab` in `mobile-build/eas.json` |
| Build script | `mobile-build/build-philip-lab.sh` |

Reuses existing **`POST /api/guidance/phase1`** and **`POST /api/tts`** — no new model router, memory, or tool registry.

## Hard constraints (unchanged)

- No web app (`artifacts/shepherds-path/`) changes
- No GuidancePage / NavBar / Talk It Through changes
- No deletion of old voice files
- No merge to `main` without approval
- No `scripts/deploy.sh` for this spike until approved

## Phase 1 semantic orchestration scope

`philip-spoken-orchestration-glite-v1` is a **semantic-judgment prototype**.
Both `ordinary_structured` and `rare_depth` use the same physical
`gpt-5.6-terra` model and one-call TurnUnderstanding + `spokenResponse`
contract. The labels represent ordinary- versus rare-depth response contracts;
they do not represent different model-speed classes.

Phase 1 makes no faster-ordinary-engine or end-to-end latency claim. A later,
separately approved Phase 2 would be responsible for proving any lower-latency
model or transport path.

### Human-review evidence status

The committed contribution bakeoff (`c2fcadd2`) is explicitly pending blinded
human review, and its 24 score-sheet entries are blank. Prior chat history
contains a manually supplied blinded score map and reported arm averages
(A 24.5, B 38.83, C 39.0, D 38.17), but neither the entered scores nor the
unblinded report were committed. Those numbers are transcript-only evidence,
not reproducible committed evidence; earlier reports that presented them
without that qualification overstated disk reproducibility.

## Safe future isolated candidate deployment (only after approval)

This isolated candidate is not deployed with the production-oriented
`scripts/deploy.sh` path.

1. Fast-forward the candidate branch normally; do not force-push.
2. Update only `/home/ubuntu/Daily-Devotional-AI-philip-lab`.
3. Preserve the existing `.env.philip-lab`; do not copy or replace secrets.
4. Run `CI=true pnpm install --frozen-lockfile` in that isolated checkout.
5. Run the complete Philip lab test matrix there.
6. Run the full API build.
7. Run `build:philip-lab` last.
8. Restart only `philip-lab-api` and `philip-voice-agent`.
9. Do not run `pm2 save`.
10. Do not restart the production API server.
11. Make no nginx, EAS, LiveKit Cloud, mobile, or production-environment changes.

## Run locally

### 1. API server

```bash
cd artifacts/api-server
cp philip-lab.env.example .env.philip-lab
# Fill LIVEKIT_* and PHILIP_VOICE_LAB_SECRET

# Load lab env alongside main .env (export vars or merge into .env for local dev)
export $(grep -v '^#' .env.philip-lab | xargs)
pnpm install
pnpm run dev
```

### 2. Agent (separate terminal)

```bash
bash scripts/run-philip-voice-agent.sh
```

### 3. Native lab (Expo)

```bash
cd mobile-build
export EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB=true
export EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY="<same as PHILIP_VOICE_LAB_SECRET>"
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8080   # or production API if lab enabled there
pnpm install
pnpm exec expo start
```

Open lab:

- In-app route: navigate to `/philip-voice-lab` (dev menu or `router.push`)
- Deep link: `shepherdspath://philip-voice-lab?key=<PHILIP_VOICE_LAB_KEY>`

### 4. Curl session mint

```bash
curl -s -X POST http://127.0.0.1:8080/api/internal/philip-voice/session \
  -H "Content-Type: application/json" \
  -H "X-Philip-Lab-Secret: $PHILIP_VOICE_LAB_SECRET" \
  -d '{"sessionId":"lab-local-001"}' | jq .
```

## Build philip-lab (TestFlight candidate)

```bash
export PHILIP_VOICE_LAB_KEY="<same as server PHILIP_VOICE_LAB_SECRET>"
bash mobile-build/build-philip-lab.sh
```

Uses EAS profile `philip-lab` with bundle id `com.shepherdspath.app.philip-lab` when `EXPO_PUBLIC_PHILIP_VOICE_LAB_BUNDLE_SUFFIX=lab`.

## Required env vars

### Server (`artifacts/api-server`)

| Variable | Purpose |
|----------|---------|
| `PHILIP_VOICE_LAB_ENABLED` | Kill switch (`true` / unset) |
| `PHILIP_VOICE_LAB_SECRET` | Shared secret for session + agent dispatch |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `PHILIP_VOICE_LAB_AGENT_DISPATCH_URL` | Default `http://127.0.0.1:8091/dispatch` |
| `PHILIP_VOICE_LAB_AGENT_PORT` | Agent HTTP port (default 8091) |
| `PHILIP_VOICE_LAB_API_BASE` | Loopback to main API (default `http://127.0.0.1:8080`) |

### Native (philip-lab build only)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB` | `true` — gates route + LiveKit plugins |
| `EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY` | Must match `PHILIP_VOICE_LAB_SECRET` |
| `EXPO_PUBLIC_API_URL` | API host (prod or local) |
| `EXPO_PUBLIC_PHILIP_VOICE_LAB_BUNDLE_SUFFIX` | `lab` → separate bundle id |

## TestFlight test steps (when approved)

1. Enable lab on **staging or isolated server** — not production until deliberate.
2. `pm2 start scripts/run-philip-voice-agent.sh --name philip-voice-agent` on server.
3. Build with `build-philip-lab.sh`, submit to TestFlight internal group.
4. Install lab build on device (separate icon / bundle id).
5. Open `shepherdspath://philip-voice-lab?key=...`
6. Tap **Connect to lab room** — expect LiveKit connected; agent join is skeleton until RTC wired.
7. With `PHILIP_VOICE_LAB_SIMULATE_TURN=true` on agent, verify server logs show phase1 + tts on dispatch.
8. Set `PHILIP_VOICE_LAB_ENABLED=false` — app should show kill-switch error on connect.

## Rollback

1. **Server:** `PHILIP_VOICE_LAB_ENABLED=false` (or unset) → routes return 404.
2. **Agent:** `pm2 stop philip-voice-agent && pm2 delete philip-voice-agent`
3. **Clients:** Stop distributing philip-lab TestFlight build; production app unchanged (flag off).
4. **Code:** Stay on `spike/philip-voice-lab` branch; do not merge.

## Risks

| Risk | Mitigation |
|------|------------|
| Agent skeleton — no RTC publish yet | **Resolved** — `roomLoop.mjs` joins room, STT, phase1, tts, publish |
| ffmpeg required on agent host | MP3 from `/api/tts` decoded via ffmpeg before LiveKit publish |
| LiveKit / WebRTC native deps | Only philip-lab profile enables plugins via `app.config.js` |
| Secret in EAS env | `PHILIP_VOICE_LAB_KEY` baked at build time — rotate if leaked |
| Accidental prod enable | Kill switch + 404 when disabled; do not deploy without approval |
| TTS via `/api/tts` | Spike only — not final voice architecture |

## Next steps (post-skeleton)

1. Tune VAD / echo handling for real iOS device rooms
2. Three consecutive clean iOS sessions before product integration
3. Optional streaming TTS (`/api/tts/stream`) for lower latency
