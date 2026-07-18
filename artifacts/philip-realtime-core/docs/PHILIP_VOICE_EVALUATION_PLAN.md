# Philip Voice Evaluation Plan (FUTURE — NOT EXECUTED)

Status: **plan only**. No provider calls, no audio synthesis, no deployment, no EAS
build, and no change to the active `cedar` configuration are part of this document.
Voice selection is intentionally decoupled from the conversation-polish package so
every candidate is auditioned with the same concise spoken text.

## Prerequisite

The opening/brevity/pacing correction (this package) must be validated in one
capped Cedar phone session first. Only after wording quality is settled do voice
differences become attributable to the voice rather than the prompt.

## Candidates

### A. Realtime-native (played through the existing native WebRTC output path)

| Candidate | Basis |
|---|---|
| `cedar` | Current voice; official docs recommend `marin` and `cedar` for best quality. |
| `marin` | Second officially recommended Realtime voice; already used in Phase 2B config. |
| `ash` | Officially supported Realtime voice (documented list: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar); commonly characterized as lower/steadier. Include only after a short unpaid check of current official voice descriptions. |
| `echo` | Same documented list; masculine-leaning. Same unpaid pre-check applies. |

Only `cedar` and `marin` are pre-authorized shortlist members; `ash`/`echo` are the
"at most two additional" candidates and must be confirmed against the official voice
list at audition time before any paid call.

Realtime-native candidates require **no architecture change**: the session config
`audio.output.voice` is the only difference, and the official post-processing
`audio.output.speed` control (0.25–1.5) applies equally to all of them.

### B. Saved external-TTS candidates (chained rendering — architectural cost applies)

| Candidate | Where preserved |
|---|---|
| Onyx treatment 1 | Legacy Voice Lab TTS settings (server-side; production api-server routes). |
| Onyx treatment 2 | Same location, second saved treatment. |
| Brian's ElevenLabs custom voice | Voice ID preserved server-side as `ELEVENLABS_PHILIP_VOICE_ID` (never in the client bundle; not reproduced here). |

External TTS **cannot** run through native Realtime audio output. It requires a
chained/hybrid path: Realtime (or text model) produces text → server-side TTS
renders audio → app plays the rendered stream. That reintroduces the chained
latency and interruption limitations the Realtime migration removed:

- barge-in becomes client-side playback cancellation, not provider-level truncation;
- speech-end → first audible regresses from ~0.6–1.3 s (measured on the genuine
  iPhone session) toward the multi-second chained latencies measured in the legacy
  Voice Lab;
- output transcripts and provider usage accounting split across two providers.

External candidates should therefore be auditioned as **voice-quality references
only**, on pre-rendered clips, unless a deliberate hybrid architecture decision is
made later.

## Shared neutral evaluation script (identical text for every candidate)

1. **Reciprocal greeting** — "I'm here, and glad we're talking. How are you doing today?"
2. **Ordinary daily-life response** — "A stressful day and a good workout can sit side by side. Sounds like the gym gave you some room to breathe."
3. **Caregiving acknowledgment** — "That's a lot to carry — your mom's procedure and her leukemia follow-up in the same week. You're showing up for her."
4. **Practical reflection** — "One steady anchor beats five perfect plans. What's the one you can actually protect next week?"
5. **User-led faith response** — "A verse and a short prayer each day isn't small. That rhythm is holding more than you might realize."
6. **Brief prayer** — "Father, thank You for Brian and for his mom. Give them peace and steady hands this week. Amen."
7. **Factual uncertainty** — "I don't have a verified answer for that, and I won't guess. Here's what I do know for certain."
8. **Natural closing** — "I'm glad we had this time. Take care of yourself tonight."

## Blind scoring rubric (1–5 each, listener does not know the candidate)

- Warmth
- Grounded masculinity
- Calm pace
- Natural conversational rhythm
- Authenticity
- Spiritual appropriateness
- Clarity
- Emotional steadiness
- Interruption suitability (how natural a mid-sentence cutoff feels)
- Desire to continue

Score sheets must separate these confounds explicitly:

| Dimension | Held constant by design |
|---|---|
| Voice quality | The variable under test |
| Wording/prompt quality | Identical script for all candidates |
| Transport latency | Realtime-native candidates share one path; external clips are pre-rendered and excluded from latency scoring |
| Barge-in behavior | Only meaningfully testable on Realtime-native candidates |
| External-TTS architectural cost | Reported separately; never folded into voice scores |

## Smallest authorized audition (when approved — none of this is authorized now)

- **Realtime-native (cedar, marin, +≤2 confirmed):** one capped Realtime session
  per voice, scripted items 1–8 spoken by the operator, max 90 seconds per session.
  Expected provider calls: 1 Realtime session per voice (≤4 total).
  Conservative cap: **$0.50 per session, $2.00 total** (the genuine 116 s session
  cost $0.11, so this is >4× headroom).
- **External references (Onyx ×2, ElevenLabs):** pre-render the 8 script lines once
  per candidate via the existing server-side TTS routes. Expected provider calls:
  3 TTS render batches, no Realtime session. Conservative cap: **$1.00 total**.
- Total conservative ceiling for the full comparison: **$3.00**, zero EAS builds
  (voice is server-side session config; the existing iPhone build is reusable for
  Realtime-native candidates).
- Disarm-by-default rules from the iPhone lab apply unchanged: sessions armed
  individually, counted, capped, and disarmed automatically afterward.

## Explicitly out of scope until separately authorized

Provider calls, audio synthesis, deployment, EAS builds, exposing the ElevenLabs
key or voice ID value, changing the active `cedar` configuration, TestFlight/App
Store, LiveKit Cloud, or any production change.
