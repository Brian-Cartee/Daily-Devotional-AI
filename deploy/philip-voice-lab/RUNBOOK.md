# Philip Voice Lab — Isolated Server Deployment Runbook

**Branch:** `reconcile/philip-voice-candidate-20260713`  
**Purpose:** Run Philip voice lab beside live Shepherd's Path without replacing or destabilizing production.

---

## Architecture (recommended)

```
                    ┌─────────────────────────────────────────┐
  iPhone lab build  │  nginx (www.shepherdspathai.com)        │
  ─────────────────►│  /api/internal/philip-voice/* → :3101   │
                    │  all other /api/*           → :3001     │
                    └─────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
    philip-lab-api :3101      api-server :3001          philip-voice-agent :8091
    (isolated entry)          (UNCHANGED production)    (LiveKit worker)
    • session mint            • guidance/transcribe/tts ◄── loopback only
    • timeline files          • existing schedulers
    • evaluations             • prod database
         │
         └── dispatch ─────────────────────────────────────────► :8091
```

**Why not a second full API on :3101?**  
Starting `dist/index.mjs` with `NODE_ENV=production` also starts daily email, verse sync, push, SMS, and Expo schedulers. Push/SMS schedulers start even when `ENABLE_EMAIL_SCHEDULER=false`. Startup also runs DB schema ensures, verse sync, and prayer-wall seeding. A duplicate full API is **not safe**.

**Solution:** Minimal `dist/philip-lab-index.mjs` exposes only lab routes. The voice agent calls production loopback (`PHILIP_VOICE_LAB_GUIDANCE_API_BASE=http://127.0.0.1:3001`) for Philip brain + TTS.

---

## 1. Separate server directory

On the Lightsail host (when approved — do not run from this package automatically):

```bash
export PHILIP_LAB_ROOT=/opt/shepherdspath-philip-lab
sudo mkdir -p "$PHILIP_LAB_ROOT"
sudo chown "$USER":"$USER" "$PHILIP_LAB_ROOT"
git clone https://github.com/Brian-Cartee/Daily-Devotional-AI.git "$PHILIP_LAB_ROOT"
cd "$PHILIP_LAB_ROOT"
git checkout reconcile/philip-voice-candidate-20260713
```

Production checkout (`~/Daily-Devotional-AI` or equivalent) and PM2 process `api-server` remain untouched.

---

## 2. Install and build

```bash
cd "$PHILIP_LAB_ROOT"
pnpm install --frozen-lockfile

cd artifacts/api-server
cp philip-lab.env.example .env.philip-lab
# Edit .env.philip-lab — set secrets and LiveKit keys (never commit)

pnpm run build:philip-lab
# Agent runs from source .mjs — no separate build required
```

---

## 3. Environment variables (names only)

| Variable | Purpose |
|----------|---------|
| `PHILIP_VOICE_LAB_ENABLED` | Master kill switch (`true` / unset) |
| `PHILIP_VOICE_LAB_SECRET` | Shared secret — mobile `X-Philip-Lab-Secret` + agent dispatch |
| `PORT` | Lab API listen port (`3101`) |
| `HOST` | Lab API bind (`127.0.0.1`) |
| `PHILIP_VOICE_LAB_API_BASE` | Agent + timeline loopback to lab API (`http://127.0.0.1:3101`) |
| `PHILIP_VOICE_LAB_GUIDANCE_API_BASE` | Agent guidance/TTS loopback to production (`http://127.0.0.1:3001`) |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `PHILIP_VOICE_LAB_AGENT_PORT` | Agent HTTP port (`8091`) |
| `PHILIP_VOICE_LAB_AGENT_DISPATCH_URL` | Lab API → agent dispatch (`http://127.0.0.1:8091/dispatch`) |
| `PHILIP_VOICE_LAB_LOG_DIR` | Optional timeline JSON directory |
| `FFMPEG_PATH` | Optional explicit ffmpeg binary |

Mobile build (EAS, separate step): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PHILIP_VOICE_LAB_KEY`, `EXPO_PUBLIC_ENABLE_PHILIP_VOICE_LAB`.

---

## 4. PM2 process names and startup order

Use **only** these names — never `api-server` or `frontend`:

| Order | PM2 name | Command |
|-------|----------|---------|
| 1 | `philip-lab-api` | `node dist/philip-lab-index.mjs` in `artifacts/api-server` |
| 2 | `philip-voice-agent` | `node src/philip-voice-lab/agent.mjs` in `artifacts/api-server` |

```bash
cd "$PHILIP_LAB_ROOT/artifacts/api-server"

# Load env vars into PM2 (create .env.philip-lab first)
pm2 start dist/philip-lab-index.mjs \
  --name philip-lab-api \
  --cwd "$(pwd)" \
  --node-args="--enable-source-maps" \
  --update-env \
  --env-file .env.philip-lab

pm2 start src/philip-voice-lab/agent.mjs \
  --name philip-voice-agent \
  --cwd "$(pwd)" \
  --interpreter node \
  --update-env \
  --env-file .env.philip-lab

pm2 save
```

Or use `deploy/philip-voice-lab/ecosystem.config.cjs` (adjust `cwd` paths first).

**Startup order:** `philip-lab-api` → `philip-voice-agent` → nginx reload (if snippet added).

---

## 5. Health checks

```bash
# Lab API (no secret on generic health)
curl -s http://127.0.0.1:3101/api/health

# Lab API gated health (requires secret — use env, do not echo)
curl -s http://127.0.0.1:3101/api/internal/philip-voice/health \
  -H "X-Philip-Lab-Secret: \$PHILIP_VOICE_LAB_SECRET"

# Voice agent
curl -s http://127.0.0.1:8091/health

# Production unchanged
curl -s http://127.0.0.1:3001/api/health
```

Run preflight: `bash scripts/philip-voice-lab-preflight.sh` from repo root.

---

## 6. nginx route design

Add **only** the snippet in `deploy/philip-voice-lab/nginx-philip-lab.snippet` inside the existing `server { }` block for `www.shepherdspathai.com`.

- Proxies **only** `/api/internal/philip-voice/` to `127.0.0.1:3101`
- All other `/api/` traffic continues to `127.0.0.1:3001`
- Agent dispatch (`:8091`) is **not** exposed publicly — loopback only
- Every lab route enforces `PHILIP_VOICE_LAB_SECRET` in application code

After editing nginx config: `sudo nginx -t && sudo systemctl reload nginx`

---

## 7. Kill switch and shutdown

**Kill switch (instant):** Set `PHILIP_VOICE_LAB_ENABLED=false` in `.env.philip-lab`, then:

```bash
bash scripts/philip-voice-lab-stop.sh
```

Lab routes return 404; agent refuses to start.

**Rollback (stops lab only):**

```bash
bash scripts/philip-voice-lab-stop.sh
# Remove nginx snippet and reload nginx
# Optional: rm -rf /opt/shepherdspath-philip-lab
```

Production `api-server`, `frontend`, and PM2 entries are **not** touched.

---

## 8. Database and side-effect policy

| Component | Production DB writes? |
|-----------|----------------------|
| `philip-lab-api` (timeline/eval) | **No** — file-backed under `server/philip-voice-lab/` |
| Production `api-server` guidance (via agent loopback) | **Yes** — session/AI-usage rows for ephemeral lab `sessionId` values |
| Lab schedulers | **None** — isolated entry does not start them |

Use lab-specific `sessionId` prefixes (e.g. `philip-lab-device-…`) so production data stays identifiable.

---

## 9. Port summary

| Service | Port | Bind |
|---------|------|------|
| Production API | 3001 | 0.0.0.0 (existing) |
| Philip lab API | 3101 | 127.0.0.1 |
| Philip voice agent | 8091 | 127.0.0.1 |
| Frontend | 3000 | existing |

---

## 10. Validation checklist (before device test)

- [ ] `bash scripts/philip-voice-lab-preflight.sh` passes
- [ ] `pm2 status` shows `philip-lab-api` + `philip-voice-agent` only (no duplicate `api-server`)
- [ ] Production `curl http://127.0.0.1:3001/api/health` still OK
- [ ] Lab health returns 401 without secret, 200 with secret
- [ ] `PHILIP_VOICE_LAB_GUIDANCE_API_BASE` points to :3001 (not :8080)
- [ ] nginx snippet active; public session endpoint reachable from device
