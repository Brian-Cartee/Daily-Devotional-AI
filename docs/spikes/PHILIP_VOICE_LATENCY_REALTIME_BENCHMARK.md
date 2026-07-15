# Philip Voice Lab — Latency / Realtime Architecture Benchmark Plan

**Status:** proposal only (read-only). No live architecture change in the contribution/false-closing package.  
**Date:** 2026-07-15  
**Context:** Post-`f9008648` phone session `philip-lab-mrjs2inh-va4-75e1097c` showed speech-end→first-audio as high as ~10.1s (GPT guidance ~7.0s). That delay is technical dead air, not thoughtful pacing.

Estimates below are **preliminary assumptions** requiring later verification. No paid provider probes or web research were authorized for this document.

---

## Current measured pain (75e1097c)

| Metric | Observed |
|--------|----------|
| Worst speech-end → firstAudio | ~10105 ms (turn 2) |
| Worst GPT guidance | ~7021 ms |
| Typical STT | ~2.4–3.5 s (worst ~6.7 s on long utterance) |
| What `firstAudioAt` means | Agent publish/start — **not** proven on-device ear start |

---

## Architecture comparison

### 1) Current chained path

`VAD silence → batch STT (Whisper via lab :3101) → GPT-4o guidance → TTS (:3001) → LiveKit publish`

| Dimension | Assessment |
|-----------|------------|
| Expected SE→first-audio | Often **3–8 s**; spikes **8–12 s+** when GPT is slow |
| Barge-in / interruption | Weak — utterance closes only after silence; limited mid-playback interrupt |
| Transcript / observability | Strong — full text, Front Door meta, timings per stage |
| Genome / safety contracts | Strong — inspectable Front Door + compact genome + crisis/prayer gates |
| Provider lock-in | Moderate (OpenAI STT/LLM/TTS + LiveKit) |
| Implementation difficulty | Already live |
| Cost / 10-min conversation | **Preliminary:** roughly mid-$0.10s–low-$1s order depending on talk ratio and TTS minutes — **verify later** |
| Migration risk | N/A (baseline) |
| iPhone rebuild | Not required for server-side changes |

### 2) OpenAI Realtime voice

Single realtime session carrying audio↔audio (optional text events).

| Dimension | Assessment |
|-----------|------------|
| Expected SE→first-audio | **Preliminary:** often sub-second to low single seconds when warmed |
| Barge-in | Native strength |
| Transcript / observability | Medium — events exist, but less natural fit for current Front Door JSONL unless dual-logged |
| Genome / safety | Risk of dilution unless tools/system instructions heavily recreated; crisis/prayer contracts harder to keep deterministic |
| Lock-in | High (OpenAI realtime stack) |
| Difficulty | Medium–high vs current lab |
| Cost / 10-min | **Preliminary:** often higher than chained batch per minute of audio — **verify** |
| Migration risk | High for Philip-specific policies |
| iPhone rebuild | Likely **yes** or substantial native client change if WebRTC path differs |

### 3) Hybrid (recommended benchmark target)

Keep LiveKit (or equivalent) transport + VAD/interrupt; use realtime or streaming STT for fast partials; run **inspectable Philip guidance** (Front Door + genome + safety) on finalized turns or mid-turn tool calls; stream TTS when safe.

| Dimension | Assessment |
|-----------|------------|
| Expected SE→first-audio | **Preliminary goal:** median **<2.5 s**, p95 **<4 s** for ordinary turns |
| Barge-in | Can support cancel/clear of TTS queue |
| Observability | Can preserve/improve stage timings |
| Genome / safety | Best preservation among low-latency options |
| Lock-in | Medium (compose providers) |
| Difficulty | Medium — larger than phrase patches, smaller than full realtime rewrite |
| Cost | Between chained and full realtime — **verify** |
| Migration risk | Medium; rollback to chain remains possible |
| iPhone rebuild | Possibly optional if LiveKit session shape unchanged; confirm |

### 4) ElevenLabs conversational / realtime (if relevant)

Useful for **voice quality + barge-in** comparison, especially vs current TTS timbre. Philip policy layer still needs a home (server guidance or tool bridge). Treat as **voice/transport option**, not a substitute for contribution genome.

| Dimension | Assessment |
|-----------|------------|
| Latency / barge-in | Competitive in conversational SKUs (**verify**) |
| Genome / safety | Requires explicit bridge back to Philip Front Door + genome |
| Lock-in | High on voice path |
| iPhone rebuild | Likely if SDK path changes |

---

## Recommendation

1. **Do not migrate production architecture in the next conversation-fix cycle.**  
2. Run a **small isolated benchmark** after the next phone session validates contribution genome v2:  
   - Same scripted prompts vs chained baseline  
   - Measure SE→first-audio, barge-in success, transcript fidelity, and whether Front Door/genome still apply  
3. Prefer **hybrid streaming** over full OpenAI Realtime as the first experiment — best path to keep Philip contracts.  
4. Run **voice A/B (Onyx / Cedar / custom ElevenLabs)** as a sibling experiment once waits are tolerable; voice will not fix shallow contribution alone.

---

## Instrumentation to add (server-side first)

Log and aggregate (no private content beyond existing transcript policy):

- `vadCloseAt` (already largely present)
- utterance audio bytes + `utteranceMs`
- upload duration (client→lab), if available
- provider STT duration (`sttMs`)
- generation time-to-first-token + completion (`guidanceMs` split)
- TTS time-to-first-byte + complete (`ttsMs`)
- audio publish timestamp (`firstAudioAt` — label clearly as publish)
- estimated audible playback end (duration from TTS/media length)
- next user speech start
- overlap / interruption / discard (`vad_timeout speech_too_short`, barge-in cancels)

Publish a one-page dashboard or JSON summary per room: median/p95 SE→publish, stage breakdown, discard rate.

---

## Instrumentation implemented (provider-neutral)

Schema: `philip-latency-pipeline-v1` in
`artifacts/api-server/src/philip-voice-lab/latencyPipeline.mjs`.

Persisted on each `.turns.jsonl` record as `latencyStages` (alongside legacy `latency`):

| Stage | Field |
|-------|--------|
| VAD close | `vadCloseAt` |
| Utterance duration / bytes | `utteranceMs`, `audioBytes` |
| Upload start/end | `uploadStartAt`, `uploadEndAt` (null until client reports) |
| STT provider | `sttProviderStartAt`, `sttProviderEndAt`, `sttMs` |
| Model request / first token / completion | `modelRequestStartAt`, `modelFirstTokenAt`, `modelCompletionAt`, `timeToFirstTokenMs` |
| TTS request / first audio | `ttsRequestStartAt`, `ttsFirstAudioAt`, `ttsMs` |
| Publish window | `audioPublishStartAt`, `audioPublishEndAt` |
| Estimated audible window | `estimatedAudibleStartAt`, `estimatedAudibleEndAt` |
| Next user speech | `nextUserSpeechStartAt` |
| Overlap / interrupt | `overlapOrInterruption`, `interruptionKind`, `discardReason` |

**Important:** `firstAudioMeans = agent_publish_start_not_proven_ear` — publish ≠ proven on-device hear time.

Guidance first-token timing is captured inside `guidanceBrain.mjs` when the live LLM path runs (`modelFirstTokenAt`). Front Door–only turns leave it null.

---

## Future benchmark command / runbook (authorization required)

**Do not run paid realtime probes without explicit authorization.**

### Goals

Compare, on the **same scripted prompts** (75e1097c + 4e28a4a8 turns):

1. **Current chained pipeline** (VAD → batch STT → Front Door + GPT-4o → TTS → LiveKit publish)
2. **OpenAI Realtime** (audio↔audio or text events — prototype only)
3. **Hybrid** (streaming STT or partials + inspectable Philip Front Door/genome/safety + streamed TTS)

Metrics: speech-end→first-audio (publish), barge-in success, transcript fidelity, contribution quality pass rate, crisis/prayer contract intact.

### Exact future command (placeholder — implement runner later)

```bash
# LOCAL first. Requires explicit paid-API authorization before realtime modes.
cd /Users/briancartee/philip-lab-worktrees/philip-voice-lab-fix

# 1) Baseline: harvest chained timings from an isolated lab session turns.jsonl
node scripts/philip-latency-benchmark-report.mjs \
  --room <philip-lab-room-id> \
  --mode chained \
  --out .tmp-evidence-508/latency-chained-<room>.json

# 2) Realtime prototype (PAID — stop for authorization):
# node scripts/philip-latency-benchmark-run.mjs --mode openai-realtime --fixture 4e28a4a8

# 3) Hybrid prototype (PAID — stop for authorization):
# node scripts/philip-latency-benchmark-run.mjs --mode hybrid-philip-guidance --fixture 4e28a4a8
```

Report must include med/p95 per stage from `latencyStages`, discard rate, and whether genome/Front Door contracts still applied.

### What requires a new iPhone build

| Change | New iPhone / EAS build? |
|--------|-------------------------|
| Server-only Front Door / genome / contribution / observability | **No** — existing Philip Voice Lab app reusable |
| Same LiveKit room + agent dispatch shape | **No** |
| Client upload timing / next-speech timestamps pushed to agent | **Maybe** — only if not already derivable from LiveKit events |
| Switching transport to OpenAI Realtime WebRTC on device | **Yes** |
| New native barge-in UX beyond current agent path | **Likely yes** |
| Hybrid that keeps LiveKit session contract | **Possibly no** if agent/server-only |

---

## Explicit non-goals for this document’s package

- No env/nginx changes  
- No LiveKit Cloud reconfiguration  
- No EAS  
- No paid latency probes in this task  
- No architecture migration until post-phone validation of contribution genome v3  
