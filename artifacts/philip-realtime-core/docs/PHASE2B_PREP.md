# Phase 2B — Local preparation

Phase 2B evaluates the conversational quality of the already-proven browser
WebRTC Realtime path. It does not alter or reuse the exhausted Phase 2 attempt
ledger. The Phase 2 transport, manual canary, and evidence remain unchanged.

## Authorization enforced in code

- Main conversational model: `gpt-realtime-2.1`
- Input transcription: `gpt-4o-mini-transcribe`
- Three new sessions maximum in the Phase 2B ledger
- Five minutes maximum per session (the client stops at 295 seconds)
- $3.00 absolute cumulative Phase 2B cap
- $1.00 reservation before each provider request
- Session 1 only until its report is complete
- Manual browser Begin only; no retry loop
- Real microphone only; no synthetic audio
- No audio recording or persistence

The server starts in unpaid preparation mode. `POST /api/session` returns 423
without counting a session unless `ALLOW_PHASE2B_SESSION1=1` was present when
the server started. The browser also blocks accidental session creation before
the manual Begin action and blocks direct browser requests to OpenAI.

## Official input-transcription support

Checked against current official OpenAI documentation on 2026-07-17:

- The Realtime conversation guide says committing input audio starts input
  transcription when enabled.
- The Realtime cost guide explicitly documents input transcription inside a
  conversational Realtime session. It states that transcription runs on a
  different model and is billed separately.
- The Realtime session and call API references list
  `gpt-4o-mini-transcribe` as supported input transcription.
- The completed event includes `item_id`, transcript text, and transcription
  usage. The API reference states transcription runs asynchronously with
  Response creation and may complete before or after Response events.
- Supplying language `en` improves latency and accuracy.

Configuration:

```json
{
  "type": "realtime",
  "model": "gpt-realtime-2.1",
  "audio": {
    "input": {
      "transcription": {
        "model": "gpt-4o-mini-transcribe",
        "language": "en"
      },
      "turn_detection": {
        "type": "semantic_vad",
        "create_response": true,
        "interrupt_response": true
      }
    }
  }
}
```

This is one speech-to-speech conversation session, not a second
transcription-only session. Assistant response generation is not gated on the
transcription event.

Official sources:

- <https://developers.openai.com/api/docs/guides/realtime-conversations>
- <https://developers.openai.com/api/docs/guides/realtime-costs>
- <https://developers.openai.com/api/reference/resources/realtime/subresources/sessions/methods/create>
- <https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/accept/>
- <https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe>

## Evidence and privacy

The browser retains only event metadata, sanitized transcript text, timing, and
usage. It does not instantiate `MediaRecorder`, serialize media, or expose the
provider credential. The server writes evidence with mode `0600` under:

`evidence/phase2b/`

That directory is isolated and can be deleted without affecting source code,
prior Phase 2 evidence, or any production resource.

Tracked measurements include:

- user transcript completion associated by `item_id`
- assistant audio transcript
- provider speech start and stop
- user speaking duration
- speech end to first audible assistant audio
- interruption to assistant output stop
- assistant response and audible durations
- transcript completion after speech end
- provider errors and tool calls
- Realtime token usage and estimated cost
- separate transcription token usage and estimated cost

## Local verification

From `artifacts/philip-realtime-core`:

```bash
npm run check
npm run test:phase2b-prep
```

Neither command may make a provider call.

Only after all checks pass and preparation is committed:

```bash
ALLOW_PHASE2B_SESSION1=1 npm run phase2b:manual-server
```

Open `http://127.0.0.1:4318`, complete the unpaid local microphone check, then
manually press **Begin Session 1**. After the natural spoken closing, press
**End & Save**. Do not start a second session before reviewing Session 1.
