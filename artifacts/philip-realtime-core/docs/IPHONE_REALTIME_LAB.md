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
| Lab-only SDP route | `artifacts/api-server/src/routes/philipRealtimeLab.ts` |
| Cedar session config | `artifacts/philip-realtime-core/iphone-lab/config.mjs` |
| EAS profile | `philip-lab` → bundle `com.shepherdspath.app.philip-lab` |

## Voice / model

- Model: `gpt-realtime-2.1`
- Voice: `cedar`
- Input transcription: `gpt-4o-mini-transcribe` (asynchronous, associated by `item_id`)
- Instructions: compact Realtime Philip identity from Phase 2B

## Hard rules

- OpenAI key stays on the lab server
- The client accepts only
  `https://www.shepherdspathai.com/api/internal/philip-voice/realtime`; nginx
  already proxies that authenticated route directly to the isolated `:3101`
  lab process, never the production API process.
- Paid conversation remains disarmed until `ALLOW_IPHONE_REALTIME=1`
- No raw audio persistence
- The Realtime screen has no navigation or fallback to legacy Voice Lab.
- The existing internal-build lab credential is used only to mint a five-minute
  Realtime bearer token. This is a temporary internal-bundle risk; it does not
  expose the OpenAI key or send the durable lab credential to OpenAI.

## Local unpaid checks

```bash
cd artifacts/philip-realtime-core
npm run check
npm run test:iphone-lab-prep
```

## Isolated server

The route is bundled into `philip-lab-api` and uses its existing
`PHILIP_VOICE_LAB_SECRET` for token minting. Deploy it with
`ALLOW_IPHONE_REALTIME` absent/false. `/status` must report `armed:false`,
`sessionsUsed:0`, and `$0` before a replacement build is distributed.

Arm only after Brian separately authorizes a paid phone session.

## Rollback

1. Do not distribute the new lab build.
2. Reinstall the previous internal philip-lab binary if needed.
3. Leave production, nginx, PM2, and LiveKit Cloud untouched.
4. Delete or ignore `evidence/iphone-lab/` as needed.
