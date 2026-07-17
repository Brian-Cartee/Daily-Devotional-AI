# Philip Realtime Lab — iPhone prototype

Isolated companion branch: `spike/philip-realtime-iphone-lab`  
Base: `d00902c2` (Phase 2B preparation)  
Proven canary: `d7d6c1ec`

## What this is

A **philip-lab-only** native screen that runs the proven OpenAI Realtime WebRTC
handshake through `@livekit/react-native-webrtc`, without LiveKit Cloud and
without replacing the legacy Philip Voice Lab.

| Piece | Location |
|-------|----------|
| Native screen | `mobile-build/app/philip-realtime-lab.tsx` |
| Native session client | `mobile-build/lib/philipRealtimeLabSession.ts` |
| Lab-only SDP server | `artifacts/philip-realtime-core/iphone-lab/server.mjs` |
| Cedar session config | `artifacts/philip-realtime-core/iphone-lab/config.mjs` |
| EAS profile | `philip-lab` → bundle `com.shepherdspath.app.philip-lab` |

## Voice / model

- Model: `gpt-realtime-2.1`
- Voice: `cedar`
- Instructions: compact Realtime Philip identity from Phase 2B

## Hard rules

- OpenAI key stays on the lab server
- Production `shepherdspathai.com` API hosts are rejected by the client
- Paid conversation remains disarmed until `ALLOW_IPHONE_REALTIME=1`
- No raw audio persistence

## Local unpaid checks

```bash
cd artifacts/philip-realtime-core
npm run check
npm run test:iphone-lab-prep
```

## Lab server (later phone conversation only)

```bash
PHILIP_REALTIME_LAB_SECRET='…' node iphone-lab/server.mjs
# Arm only after Brian authorizes a paid phone session:
ALLOW_IPHONE_REALTIME=1 PHILIP_REALTIME_LAB_SECRET='…' node iphone-lab/server.mjs
```

## Rollback

1. Do not distribute the new lab build.
2. Keep using the previous philip-lab binary / legacy Voice Lab screen.
3. Leave production, nginx, PM2, and LiveKit Cloud untouched.
4. Delete or ignore `evidence/iphone-lab/` as needed.
