# Shepherd's Path — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Products

- **Shepherd's Path Web App** — `artifacts/shepherds-path/` (React + Vite, preview at `/`)
- **API Server** — `artifacts/api-server/` (Express 5, preview at `/api`)
- **Shepherd's Path Mobile** — `artifacts/shepherds-path-mobile/` (Expo / React Native, bundle ID: `com.shepherdspath.app`)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **Frontend**: React + Vite + Tailwind CSS v3 + wouter
- **Build**: esbuild (API server), Vite (frontend)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

```
artifacts/
  shepherds-path/     # React + Vite frontend (previewPath: /)
  api-server/         # Express backend (previewPath: /api)
  mockup-sandbox/     # Design mockups (previewPath: /__mockup/)
lib/
  db/                 # Shared Drizzle schema + PostgreSQL client
  api-spec/           # OpenAPI spec (lib/api-spec/openapi.yaml)
  api-client-react/   # Generated React hooks from OpenAPI
  api-zod/            # Generated Zod schemas from OpenAPI
.migration-backup/    # Original single-artifact app (do not modify)
```

## Important Notes

- The `@shared` alias in the frontend's vite.config.ts points to `artifacts/shepherds-path/src/shared/` — a frontend-safe copy of shared types (no DB imports)
- The API server routes use `registerRoutes(server, app)` directly — the legacy route function is called from `artifacts/api-server/src/index.ts`
- TTS cache: `server/tts-cache/` at workspace root
- Verse art cache: `server/verse-art-cache/` at workspace root
- Growth plan PDF: `scripts/shepherds-path-growth-plan.pdf` at workspace root

## Mobile App (iOS)

- **Bundle ID**: `com.shepherdspath.app`
- **EAS Project ID**: `b916bb13-03ee-45a4-86a4-cbe7a11c34a7` (owner: `shepherdspath`)
- **EAS build profiles**: development (simulator), preview (device), production (App Store)
- **Current App Store version**: `2.0.0` (must stay ≥ this — the 1.x train is closed in ASC)
- **RevenueCat**: platform key selected at runtime — test key in dev/Expo Go, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` in production iOS builds
- **Store metadata**: `artifacts/shepherds-path-mobile/store.config.yaml` (EAS Metadata format)
- **Submission config**: `artifacts/shepherds-path-mobile/eas.json` — uses ASC API key (no appleId needed when key is present)
- **Privacy manifest**: included in `app.json` under `ios.privacyManifests` (required for iOS 17+)
- **supportsTablet**: must remain `true` (Apple requires all previously-supported devices to keep being supported)

### Running EAS builds from Replit

Git operations are blocked in the main Replit environment, so EAS must be run from a temp directory:

```bash
# One-time setup (after a reboot, /tmp is cleared so redo this)
mkdir -p /tmp/build/node_modules
ln -sfn /home/runner/workspace/node_modules/.pnpm /tmp/build/node_modules/.pnpm
cp -r artifacts/shepherds-path-mobile /tmp/build/artifacts/shepherds-path-mobile --no-dereference
mkdir -p /tmp/asc-key
printf -- "-----BEGIN PRIVATE KEY-----\n" > /tmp/asc-key/AuthKey_3DD2747FYX.p8
echo "$ASC_API_KEY_CONTENT" | tr -d ' \n\r\t' | fold -w 64 >> /tmp/asc-key/AuthKey_3DD2747FYX.p8
printf -- "-----END PRIVATE KEY-----\n" >> /tmp/asc-key/AuthKey_3DD2747FYX.p8

# Build
cd /tmp/build/artifacts/shepherds-path-mobile
EXPO_TOKEN=$EXPO_TOKEN EAS_NO_VCS=1 eas build --platform ios --profile production --non-interactive --no-wait

# Submit (after build finishes — use build ID from above)
EXPO_TOKEN=$EXPO_TOKEN eas submit --platform ios --id <BUILD_ID> --non-interactive
```

**Key facts**:
- `package.json` must NOT use `catalog:` or `workspace:*` — these are pnpm-only and break EAS build servers. Always use real version numbers.
- ASC API key is stored in the `ASC_API_KEY_CONTENT` secret (raw base64, needs PEM headers added at runtime as shown above)
- ASC Key ID: `3DD2747FYX`, Issuer ID: `2787b8ca-4e36-4112-9a35-875f90ed0169`, App ID: `6760953522`
- Apple Team ID: `D5X4W5F62Y`

## Sermon Mode (v1.5)

Live in-service scripture detection feature. Mic records 20-second audio chunks → Whisper-1 transcription → GPT-4o-mini scripture extraction → scriptures appear on-screen with golden glow animation.

**Screens (mobile)**:
- `app/(tabs)/sermon.tsx` — Sermon tab: session history + "Start Listening" CTA
- `app/sermon-live.tsx` — Live recording: dark background, pulsing gold mic, real-time scripture stream
- `app/sermon-detail.tsx` — Session detail: scriptures, key points, transcript, AI Q&A

**API endpoints**:
- `POST /api/sermon/chunk` — audio chunk → Whisper → scripture refs (fast, per-chunk)
- `POST /api/sermon/sessions` — save completed session
- `GET /api/sermon/sessions?sessionId=&limit=` — list user's sessions
- `GET /api/sermon/sessions/:id` — full session detail
- `POST /api/sermon/sessions/:id/summarize` — Pro: generate AI key points/summary
- `POST /api/sermon/ask` — Pro: Q&A about a specific session

**Database**: `sermon_sessions` table (id, session_id, title, started_at, ended_at, scriptures[], transcript, key_points[], application, duration_seconds)

**Freemium**:
- Free: live mic + scripture detection, last 3 sessions saved (read-only)
- Pro: full transcript, AI summary + key points, "Ask the Sermon" Q&A, unlimited history

**Permissions**: `expo-av` added; iOS NSMicrophoneUsageDescription updated; expo-av plugin added to app.json for Android RECORD_AUDIO.

## Prayer Mode

**Concept**: Users pray aloud → 20-second audio chunks → Whisper transcribes → AI extracts themes in real-time → after ending, GPT generates a full "God heard this" reflection with scripture + affirmation.

**Screens (mobile)**:
- `app/(tabs)/prayer.tsx` — Prayer tab: "Pray Now" CTA at top + personal prayer history + Community Prayer Wall below
- `app/prayer-live.tsx` — Live prayer recording: deep-purple intimate design, breathing mic circle, live theme chips, reflection card with fade-in animation

**API endpoints**:
- `POST /api/prayer/chunk` — audio chunk → Whisper → prayer theme extraction (fast, per-chunk)
- `POST /api/prayer/sessions` — save completed prayer + generate AI reflection (title, themes, scripture, affirmation)
- `GET /api/prayer/sessions?sessionId=&limit=` — list user's prayer history

**Database**: `prayer_recordings` table (id, session_id, title, themes[], scripture_ref, scripture_text, reflection, transcript, duration_seconds, prayed_at)

**Freemium**:
- Free: pray + full reflection + last 5 prayers saved
- Pro: full transcript stored, unlimited history + pattern insights CTA

## Spiritual Posture Selector (Home Screen)

**Concept**: Four tap-to-select pills on the home screen — Grateful / Growing / Seeking / Heavy. Persisted in AsyncStorage. Changes the "Sit with this" reflection section copy to match the user's spiritual state, serving both thriving believers and those who need support.

**Implementation**: `app/(tabs)/index.tsx` — `POSTURE_KEY = "sp_posture"`, `SpiritualPosture` type, 4 Feather-icon pills, `POSTURE_COPY` lookup table, toggle deselects.

## External Services

- OpenAI (AI responses + TTS + Whisper transcription)
- Google Sheets (daily verse sync)
- Stripe (Pro subscriptions)
- RevenueCat (iOS in-app purchases)
- Resend (email)
- Twilio (SMS)
- Web Push / VAPID (push notifications)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
