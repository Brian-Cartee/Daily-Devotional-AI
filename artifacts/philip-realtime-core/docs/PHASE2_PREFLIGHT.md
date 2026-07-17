# Philip Realtime Core — Phase 2 Preflight

Date: 2026-07-17  
Authorization: browser-only OpenAI Realtime WebRTC, `gpt-realtime-2.1`

## Repository and machine

- Worktree: `/Users/briancartee/philip-lab-worktrees/philip-realtime-core-v1`
- Branch: `spike/philip-realtime-core-v1`
- Authorized starting HEAD: `d372fd9281de8718d4a4f969062dedab447a5455`
- Starting status: clean
- Disk: 35 GiB free on `/System/Volumes/Data`
- Protected dirty workspace, reconcile candidate, and benchmark worktree: not modified

## Current official protocol

Verified against:

- https://platform.openai.com/docs/guides/realtime-webrtc
- https://platform.openai.com/docs/guides/realtime-conversations
- https://platform.openai.com/docs/models/gpt-realtime-2.1

Selected protocol:

1. Browser creates an `RTCPeerConnection`, an audio input track, and data channel `oai-events`.
2. Browser sends its SDP offer to the local trusted server.
3. Server sends multipart `sdp` + `session` to `POST /v1/realtime/calls`, authenticated with the standard key.
4. Server returns only the SDP answer to the browser.
5. Audio travels over WebRTC; lifecycle/tool events travel over `oai-events`.

The official alternative is for the trusted server to mint a client secret with
`POST /v1/realtime/client_secrets`, after which the browser posts SDP directly to
`/v1/realtime/calls`. This sprint uses the unified server-mediated handshake, so
no ephemeral credential is created or exposed.

## Sanitized request/session configuration

```json
{
  "endpoint": "POST https://api.openai.com/v1/realtime/calls",
  "authentication": "server-side bearer key (redacted; never sent to browser)",
  "session": {
    "type": "realtime",
    "model": "gpt-realtime-2.1",
    "output_modalities": ["audio"],
    "audio": {
      "input": {
        "turn_detection": {
          "type": "semantic_vad",
          "eagerness": "auto",
          "create_response": true,
          "interrupt_response": true
        }
      },
      "output": { "voice": "marin" }
    },
    "tools": ["factual_currentness"],
    "tool_choice": "auto"
  }
}
```

The exact compact instructions and tool schema are in `phase2/config.mjs`.
Input transcription is not configured because that would invoke a second model,
which was not authorized. The known neutral fixture text is the clean user
transcript; assistant audio transcripts come from Realtime response events.

## Attempt and budget enforcement

- The local server writes an attempt to `evidence/phase2/attempt-ledger.json`
  **before** making `/v1/realtime/calls`. Authentication, protocol, and transport
  failures therefore consume one of the three attempts.
- There is no automatic retry. A second canary attempt, if needed, uses the same
  protocol/config and also counts.
- Session 1 hard-stops at 115 seconds (before its 2-minute maximum).
- Sessions 2–3 hard-stop at 295 seconds (before their 5-minute maximum).
- Maximum attempts: 3.
- Absolute estimated provider-spend ceiling: $5.00.
- Each new attempt reserves $1.50; an attempt is rejected if reservation would
  exceed the remaining cap.
- Runtime `response.done` usage is costed at current documented
  `gpt-realtime-2.1` text/audio rates. The peer connection closes at least $0.10
  before cumulative estimated spend reaches $5.

## Privacy and evidence

- Neutral macOS synthetic speech only.
- No microphone and no private speech.
- No audio recording.
- Temporary WAV fixtures and Chrome profiles live under gitignored `tmp/` and
  are deleted in the runner's `finally` block.
- No API key, bearer header, SDP, ephemeral credential, or raw audio is persisted.
- Sanitized evidence includes connection events, fixture transcripts,
  speech/VAD timing, first-audible timing, barge-in stop timing, response
  transcripts and lengths, provider errors, tool calls, usage, and cost.

## Local verification before first provider call

- Syntax checks: pass
- Phase 1 mock tests: 16/16 pass
- Phase 2 preflight tests: 5/5 pass
- Missing-key path: returns HTTP 412 and does **not** consume an attempt
- OpenAI key presence in the agent runtime: **false**

No paid session has been attempted at this point.
