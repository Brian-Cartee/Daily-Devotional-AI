# Philip Realtime Core — Phase 1 Architecture Report

**Branch:** `spike/philip-realtime-core-v1`  
**Worktree:** `/Users/briancartee/philip-lab-worktrees/philip-realtime-core-v1`  
**Phase:** unpaid, local/mock only  
**Stop rule:** no paid provider calls, no deploy, no push, no Phase 2 without Brian’s explicit dollar/cap approval

---

## 1. Orientation snapshot (read-only)

| Location | Branch | Role | Notes |
|---|---|---|---|
| `/Users/briancartee/Daily-Devotional-AI` | `spike/philip-voice-lab` | Protected dirty workspace | Do not touch |
| `/Users/briancartee/philip-lab-worktrees/philip-voice-lab-fix` | `reconcile/philip-voice-candidate-20260713` | Philip candidate | Preserved; not modified by this sprint |
| `/Users/briancartee/philip-lab-worktrees/philip-realtime-benchmark` | `spike/philip-realtime-benchmark` | Prior realtime benchmark evidence | Read-only reference |
| `/Users/briancartee/philip-lab-worktrees/philip-realtime-core-v1` | `spike/philip-realtime-core-v1` | **This sprint** | Clean-slate Phase 1 harness |

Starting HEAD for this worktree (from candidate): `314e8ac57fc6989c5bd72ec99a416dc64a881c0b`

Disk at orientation: ~42 GiB free on the Data volume (sufficient; no large dependency installs performed).

### Rollback / removal

```bash
# From any clone of the repo:
git worktree remove /Users/briancartee/philip-lab-worktrees/philip-realtime-core-v1
git branch -D spike/philip-realtime-core-v1   # local only; never pushed in Phase 1
```

This does not affect the dirty main workspace, the reconcile candidate, or the realtime benchmark worktree.

---

## 2. Official Realtime API sources used

Verified against current OpenAI docs (fetched during this sprint):

1. **Realtime overview** — https://platform.openai.com/docs/guides/realtime  
2. **WebRTC (preferred for browser/mobile clients)** — https://platform.openai.com/docs/guides/realtime-webrtc  
   - Unified session create: `POST /v1/realtime/calls` (multipart SDP + session JSON)  
   - Ephemeral secrets: `POST /v1/realtime/client_secrets`  
   - Data channel name: `oai-events`  
   - Session shape includes `type: "realtime"`, model `gpt-realtime-2.1`, voice example `marin`
3. **Realtime conversations** — https://platform.openai.com/docs/guides/realtime-conversations  
   - `session.update`, turn detection (`semantic_vad` / `server_vad`), tools, `response.cancel`, `conversation.item.truncate`, barge-in via `input_audio_buffer.speech_started`
4. **Model + pricing `gpt-realtime-2.1`** — https://platform.openai.com/docs/models/gpt-realtime-2.1  
   - Text: $4 / $24 per 1M (input/output); cached text input $0.40  
   - Audio: $32 / $64 per 1M (input/output); cached audio input $0.40

Phase 1 uses these shapes in a **mock provider**. No network calls to OpenAI were made.

---

## 3. Architecture and event flow

```
User audio (mock PCM)
   → DuplexAudioInterface.pushOutboundPcm
   → MockRealtimeProvider (GA-shaped client events)
        input_audio_buffer.append / commit
        session.update (semantic_vad, tools, compact instructions)
   ← server events: speech_stopped, transcript, response.*, error
   → PhilipRealtimeSession
        hard-contract intercept (crisis / conduct / explicit prayer)
        factual_currentness tool boundary (no fabrication)
        barge-in: response.cancel + item.truncate + audio cancel
        failure recovery speech (never silent)
   → DuplexAudioInterface inbound playback
   → SessionObservability (transcript, timings, tokens, cost, gates)
   → BudgetGuard hard stop
```

Package root: `artifacts/philip-realtime-core/`

Key modules:

- `src/session.mjs` — lifecycle + conversation state + recovery
- `src/transport/mockProvider.mjs` — provider-neutral GA event mock
- `src/audio/duplexInterface.mjs` — bidirectional streaming audio interface
- `src/instructions/compactPhilip.mjs` — compact identity / faith restraint
- `src/tools/hardContracts.mjs` — crisis, hard conduct, explicit prayer only
- `src/tools/factualCurrentness.mjs` — current-fact tool interface
- `src/observability/*` — gates, cost model, session log
- `fixtures/scenarios.mjs` — genuine-session-shaped replays
- `test/run-phase1-suite.mjs` — local mock suite

---

## 4. What was reused

| Asset | How reused |
|---|---|
| Compact Philip posture / genome principles | Adapted into `compactPhilip.mjs` (not imported from Voice Lab runtime) |
| Crisis / prayer / hard-conduct intent | Pattern-level hard contracts only |
| Factual no-guess boundary | Tool interface + spoken admission |
| Latency / cost observability ideas | New gate schema + `gpt-realtime-2.1` pricing anchors |
| Prior realtime benchmark lessons | Prefer native S2S; treat chained STT→LLM→TTS as retired for ordinary path |
| Genuine session failure modes | Scenario fixtures (greeting, full plate, World Cup, prayer, interrupt, error, etc.) |

---

## 5. What was deliberately retired from the ordinary path

- Batch STT → semantic router → Terra → TTS chain
- Front Door keyword/template machinery
- G-lite orchestration
- Contribution gate controlling every ordinary response
- Large deterministic phrase library
- Fixed 1400 ms silence window as the normal turn mechanism
- LiveKit `roomLoop` / lab agent loop as conversational core
- Any import of `frontDoor.mjs`, `gliteOrchestration.mjs`, `ordinaryContributionEngine.mjs`, `roomLoop.mjs`

Hard safety contracts remain — as contracts, not as a conversational router.

---

## 6. Phase 1 deliverables proven (mock)

1. Realtime session lifecycle — connect / update / close  
2. Streaming bidirectional audio interface  
3. Turn detection config — `semantic_vad` with `create_response` + `interrupt_response`  
4. Barge-in + assistant audio cancellation  
5. Conversation state  
6. Tool/function-call interface (`factual_currentness`, crisis tool schema)  
7. Compact Philip instruction loading  
8. Failure recovery with no silent turn  
9. Transcript + timing-event capture  
10. Per-session cost estimation + hard budget stops  

**Mock test result:** `16/16` pass (`npm test` in `artifacts/philip-realtime-core`).

**Important:** timings are synthetic. Do **not** treat them as measured provider latency.

---

## 7. Estimated API cost (conservative planning model)

Assumptions: `gpt-realtime-2.1`; ~55% user talk / ~35% assistant talk; audio token density ~1 in-token/100 ms and ~1 out-token/50 ms (heuristic, not a billing guarantee).

| Duration | Estimated USD |
|---|---|
| 5 minutes | ~$0.20 |
| 10 minutes | ~$0.41 |
| 20 minutes | ~$0.81 |

Caching can lower input cost; reasoning-effort and denser speech can raise it. Treat **2×** as a planning buffer for Phase 2.

---

## 8. Can the existing iPhone build support this?

**Not as-is for native OpenAI Realtime WebRTC.**

The current Philip lab iPhone path is LiveKit-centered (server agent + room media). Server-only repairs to the legacy chain can ride that build; a native realtime speech-to-speech client needs:

- WebRTC peer connection to OpenAI (`/v1/realtime/calls` or ephemeral `client_secrets`)
- Data channel `oai-events`
- Mic/playback wiring and barge-in UX
- Backend minting of ephemeral credentials (API key never on device)

A **browser** prototype can validate WebRTC earlier. The existing native shell does not already expose that OpenAI Realtime path.

## 9. Would a new EAS build be required?

**Yes, for a production-capable iPhone Realtime client.**  
Possibly **no** for an early Phase 2 **server/browser** smoke (local web harness only).  
If Phase 2 stays inside the LiveKit lab app without native OpenAI WebRTC, that would be a different (inferior for this goal) architecture and is out of scope for this clean-slate core.

---

## 10. Smallest Phase 2 paid test (proposal only — not authorized)

1. Local browser WebRTC harness against `gpt-realtime-2.1`  
2. Three scripted calls ≤5 minutes each  
3. Measure speech-end → first audible, barge-in stop, zero silent failures, zero fabricated current facts, zero forced faith pivots  
4. Hard budget guard enabled in process  

**Do not run until Brian approves exact calls and dollar cap.**

## 11. Maximum calls and conservative dollar cap (proposal)

| Control | Proposed default |
|---|---|
| Max paid calls | **3** |
| Max minutes / call | **5** |
| Conservative dollar cap | **$5** total (includes buffer above ~$0.60–$1.20 expected) |
| Hard stop | Process kills further `response.create` / session connects when estimate ≥ cap |

---

## 12. Remaining technical risks

1. **Provider latency may miss ≤1500 ms median / ≤3000 ms P90** under real networks and reasoning settings — Phase 1 cannot prove this.  
2. **Instruction-following variance** — compact genome may still over-pray or under-recognize without careful eval.  
3. **Mobile WebRTC + WKWebView / native audio** integration cost and EAS cycle time.  
4. **Tool latency** for factual currentness if a live lookup is added later.  
5. **Cost ramps** with long sessions, retries, and reasoning effort.  
6. **Semantic VAD false end-of-turn** on incomplete speech (“Oh, by the way…”).  
7. **Trust bar** is experiential (“desire to continue”) — instrumentation helps but does not replace genuine listening tests.

---

## 13. Can this meet the original Philip goal?

**Conditionally yes — more plausibly than repairing the chained Voice Lab.**

The original goal needs recognition-first, low-latency, interruptible conversation without making the user manage Philip. Native realtime S2S removes the structural multi-hop delay and template/router failure modes that produced silent turns and misrouting in the decisive G-lite phone session.

It can still fail if:

- latency/cost force shallow models or heavy hedging  
- faith restraint / prayer contract / crisis boundaries are not held in prompts+tools  
- the product ships another “lab maze” UX instead of settled presence  

There is **no Phase 1 evidence** yet of measured conversational delight — only that the architecture is the right class of system to attempt it under cost control.

---

## 14. Success gates (instrumented; mock-only values today)

| Gate | Target |
|---|---|
| Speech-end → first audible median | ≤1500 ms |
| P90 | ≤3000 ms |
| Interruption → audio stopped | ≤500 ms |
| Silent failed turns | 0 |
| Unsupported current-fact claims | 0 |
| Forced faith pivots | 0 |

---

## 15. Explicit non-actions taken

- No paid OpenAI/provider calls  
- No deploy, push, PM2, EAS, LiveKit Cloud, production, or env edits  
- No automatic large dependency installs  
- No modification of protected dirty workspace or candidate/research evidence deletion  
- No legacy phone testing resumed  
