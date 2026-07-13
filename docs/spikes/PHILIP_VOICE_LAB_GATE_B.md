# Philip Voice Lab — Gate B: User Experience Validation

**Branch:** `spike/philip-voice-lab`  
**Gate A (complete):** LiveKit connects; agent receives audio; phase1 + tts pipeline runs; Philip audio can publish to the room.  
**Gate B (this doc):** Prove **Philip** — not the transport.

> Do not merge, deploy, or submit to TestFlight until Gate B is reviewed and passed.

**Read before testing:** [`artifacts/api-server/src/PHILIP_VOICE.md`](../../artifacts/api-server/src/PHILIP_VOICE.md)

---

## What Gate B is asking

| Gate A proved | Gate B must prove |
|---------------|-------------------|
| Audio can move through LiveKit | A real person would keep talking |
| Endpoints can be called in sequence | Philip sounds present, not procedural |
| Lab screen can connect | Waiting feels like someone settling in — not a loading spinner with a voice |
| One turn can complete | Three consecutive sessions feel trustworthy |

**North star (from PHILIP_VOICE.md):** Did the person leave feeling understood, prayed for, and one step closer to God than when they arrived — *in voice*, not just in text?

---

## Gate B tooling (instrumentation + harness)

### Session timeline (automatic)

Every lab conversation writes a structured timeline:

| Location | Contents |
|----------|----------|
| Agent stdout | `[philip-gate-b]` events with timestamps |
| `artifacts/api-server/server/philip-voice-lab/{conversationId}.json` | Full session: turns, metrics, evaluation |
| LiveKit data channel `philip-gate-b` | Snapshot pushed to client after each turn |

**Per-turn metrics** (ms from `user_stops_speaking`):

- `sttMs` — transcribe complete  
- `phase1Ms` — phase1 complete  
- `ttsMs` — TTS blob complete  
- `publishMs` — ffmpeg decode + LiveKit publish start  
- `playbackPublishDurationMs` — paced frame publish  
- `totalLatencyMs` — user stop → playback publish start  

**Also logged:** `interruption_attempt`, `vad_event`, `vad_timeout`, `disconnect`, `empty_transcript`, `turn_error`, `mic_resumed`.

### Philip Test Harness (after every session)

1. Connect in **Philip Voice Lab** → speak → **Disconnect**  
2. App opens **Philip Test Harness** (`/philip-voice-eval`)  
3. Score technical / human / canonical fields + required **“What broke immersion?”**  
4. Optional scenario tag (Grief, Anxiety, …) for comparing revisions  
5. Evaluation saved to same conversation JSON + `_evaluations.jsonl`

### Your workflow (30–50 conversations)

Use the scenario chips. **Do not tweak after every session.** Wait until the same issue appears **3–4 times**, then log it in the Gate B debt table.

---

- [ ] philip-lab build installed (not Expo Go; not production app)
- [ ] Lab enabled on **test server only** (`PHILIP_VOICE_LAB_ENABLED=true`)
- [ ] Agent running (`bash scripts/run-philip-voice-agent.sh` or PM2)
- [ ] Phone not on silent (or use wired headphones for first pass)
- [ ] Notes app + screen recording ready (optional but recommended for latency)
- [ ] Tester name: _______________  Date: _______________  Build #: _______________
- [ ] Network: Wi‑Fi / LTE / other: _______________

**Suggested test situations** (use real words, not scripts):

1. Anxiety about family — 20–30 seconds  
2. Grief or loss — 20–30 seconds  
3. Feeling distant from God — 20–30 seconds  

---

## 1. End-to-end latency

**Primary metric:** Time from **end of user speech** (you stop talking) to **first audible Philip speech**.

**Target (aspirational, not a ship blocker by itself):** ≤ 4 seconds on good Wi‑Fi for a short Phase 1 reply. Document actuals honestly.

### How to measure

1. Screen-record the session **or** use a stopwatch from the moment you finish your last word until you hear Philip's first syllable.  
2. Repeat for **3 turns** across **2 sessions**. Record each in the table below.  
3. If agent logs are available, note timestamps for `transcript:` → `phase1 ok` → `tts ok` → `playback published`.

### Turn latency log

| Session | Turn # | Situation (1 line) | End of speech → Philip audio (sec) | Acceptable? Y/N | Notes |
|---------|--------|--------------------|-------------------------------------|-----------------|-------|
| 1 | 1 | | | | |
| 1 | 2 | | | | |
| 1 | 3 | | | | |
| 2 | 1 | | | | |
| 2 | 2 | | | | |
| 2 | 3 | | | | |

### Sub-stage breakdown (observe / log if possible)

Fill when you can attribute delay. Estimates are fine; precision helps prioritization later.

| Stage | What you feel / observe | Typical feel (tester) | Agent log marker (if any) |
|-------|-------------------------|------------------------|---------------------------|
| **STT** | Pause after you stop — dead air before anything happens | | `transcript:` |
| **Phase1** | Longest “thinking” gap? | | `phase1 ok` |
| **TTS** | Delay after text would have appeared | | `tts ok` |
| **LiveKit publish** | Gap after TTS should exist but before sound | | `playback published` |
| **Playback start** | First syllable clipped, faded in, or delayed on device | | (subjective) |

### Latency questions (Philip, not engineering)

- [ ] Does the silence feel like **Philip sitting with what you said** — or like a **frozen app**?
- [ ] Would a grieving or anxious person interpret the wait as **presence** or **abandonment**?
- [ ] Is the wait **consistent** turn to turn, or wildly variable?
- [ ] After Philip speaks, does the **next** turn feel faster or slower? (Habituation / trust)

**Gate B latency pass (subjective):** At least **2 of 3** testers say the wait is tolerable for a first lab spike *and* the delay is never mistaken for a crash.

**Gate B latency fail:** Unprompted comment: *“Is it broken?”* or *“I wouldn’t wait for this.”*

---

## 2. Interruption behavior

**Current spike behavior (observe, do not fix yet):** Half-duplex — mic is not processed while the agent is transcribing, generating, or playing Philip's reply.

### Tests

| # | Action | Pass | Fail | Notes |
|---|--------|------|------|-------|
| 2.1 | Speak a full thought; let Philip respond completely | Philip finishes without user audio bleeding in | Philip cuts off mid-sentence; echo | |
| 2.2 | **While Philip is speaking**, try to interrupt with a new thought | Document what happens | | |
| 2.3 | Interrupt **during** the post-speech wait (before Philip audio) | Document what happens | | |
| 2.4 | Say “wait” or “hold on” as Philip starts | Document what happens | | |

### Record observed behavior

- [ ] User **can** naturally interrupt Philip mid-reply  
- [ ] User **cannot** interrupt — Philip always plays to completion  
- [ ] User speech during Philip reply is **lost**  
- [ ] User speech during Philip reply **queues** or **overlaps** (unexpected)  

### If interruption is required for Philip to feel real

Document only — **no implementation in Gate B:**

| Requirement | Why it matters for Philip |
|-------------|---------------------------|
| Barge-in / duplex listen during playback | Spiritual conversation allows “no, that's not it” — a father listens when the child speaks over him |
| `AudioSource.clearQueue()` on user speech | Stop TTS mid-utterance without playing stale tail |
| Turn detector that distinguishes user vs agent audio | Avoid echo-triggered false interrupts |
| Shorter Phase 1 chunks or streaming TTS | Less to interrupt; faster correction |
| Explicit UI state (“Philip is speaking” / “Your turn”) | Sets expectation when barge-in is not supported |

**Gate B interruption pass (for v1 lab):** Team agrees whether **half-duplex is acceptable for internal lab** — document decision.  
**Gate B interruption fail for product:** Testers describe feeling **trapped** or **not heard** when Philip is wrong or too long.

---

## 3. Turn detection quality

**Current spike:** Energy-based VAD — end of utterance on ~1.4s silence; minimum speech ~450ms; max utterance ~28s.

### False early cutoffs

| # | Scenario | Pass | Fail | Notes |
|---|----------|------|------|-------|
| 3.1 | Speak with natural mid-sentence pause (“I feel… [breath] …overwhelmed”) | Full thought reaches Philip | Philip responds to fragment only | |
| 3.2 | Speak slowly with long pauses between phrases | One turn per complete sharing | Multiple Philip replies to one sharing | |
| 3.3 | Quiet voice / emotional cracking | Captured | Cut off or empty transcript | |

- [ ] **False early cutoff** happened: Y / N — example: _______________________________

### Long waits

| # | Scenario | Pass | Fail | Notes |
|---|----------|------|------|-------|
| 3.4 | Finish speaking clearly; stay silent | Philip responds within acceptable wait | >10s with no feedback | |
| 3.5 | Ambient noise (fan, car, café) | Reasonable behavior | Never detects end of speech | |

- [ ] **Long wait** happened: Y / N — longest wait: _______ sec — context: _______________

### Double responses

| # | Scenario | Pass | Fail | Notes |
|---|----------|------|------|-------|
| 3.6 | One clear utterance | Exactly **one** Philip reply | Two replies to same speech | |
| 3.7 | Philip finishes; you stay silent | No spontaneous second Philip turn | Unprompted duplicate | |

- [ ] **Double response** happened: Y / N — example: _______________________________

### Missed utterances

| # | Scenario | Pass | Fail | Notes |
|---|----------|------|------|-------|
| 3.8 | Short reply (“yeah”, “I don't know”) | Transcribed or pastorally re-prompted | Ignored with no response | |
| 3.9 | Second turn in same session | Philip hears and responds | Mic dead after first turn | |
| 3.10 | Whisper or very short (<3 words) | Handled gracefully | Empty / skipped | |

- [ ] **Missed utterance** happened: Y / N — example: _______________________________

**Gate B turn-detection pass:** No more than **1 serious failure** (missed sharing, double reply, or fragment reply) across a full 3-turn session.  
**Gate B turn-detection fail:** User repeats themselves unprompted because Philip didn't hear them.

---

## 4. Audio quality

Test on **speaker** and **headphones** (separate rows).

### Speaker pass

| Check | Pass | Fail | Notes |
|-------|------|------|-------|
| Volume loud enough at arm's length | | | |
| Voice intelligible — every word clear | | | |
| No harsh clipping / distortion on plosives | | | |
| Pacing feels human (not rushed chipmunk, not dragged) | | | |
| No obvious echo of your own voice in Philip's turn | | | |
| No room feedback loop / squeal | | | |
| Philip volume **balanced** with your memory of text Philip | | | |

### Headphones pass

| Check | Pass | Fail | Notes |
|-------|------|------|-------|
| Comfortable listening level | | | |
| No clipping | | | |
| Natural pacing | | | |

### Philip-specific audio questions

- [ ] Does Philip's voice sound like **the same Philip** as text/TTS elsewhere in the app?
- [ ] Does cadence feel like **someone speaking to you** — or **a file playing**?
- [ ] Any robotic tail, pop, or truncation at **start** or **end** of replies?
- [ ] Background noise on your side — does it **pollute** Philip's turn?

**Gate B audio pass:** Headphones session is **clear and listenable**; speaker session has **no blocking echo**.  
**Gate B audio fail:** Tester removes headphones or stops session due to audio discomfort or unintelligibility.

---

## 5. Conversation feel

This is the heart of Gate B. Technical success that fails here **fails Gate B**.

### Philip identity (PHILIP_VOICE.md)

For **each** of 3 test situations, note:

| Criterion | Session 1 | Session 2 | Session 3 |
|-----------|-------------|-------------|-----------|
| Acknowledges reality before uplifting | | | |
| Sounds settled — not eager or performing | | | |
| Does **not** sound like a chatbot processing input | | | |
| Does **not** sound like voicemail (“leave your message”) | | | |
| Carries weight of Scripture or faith **appropriately for Phase 1** | | | |
| One faithful question — not a lecture | | | |
| You would **trust** this voice with something real | | | |

### The core question

After each session, answer honestly:

> **Does it feel like waiting on a computer — or talking with someone?**

| Session | Computer (1–5) | Someone (1–5) | One-sentence why |
|---------|----------------|-----------------|----------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

*(1 = not at all, 5 = strongly)*

### Trust killers (check any that occurred)

- [ ] Philip spoke before you felt **heard**
- [ ] Philip sounded **generic** — could be any faith app
- [ ] Philip sounded **too upbeat** for what you shared
- [ ] Philip **hedged the gospel** or felt vague about Christ
- [ ] Philip said something that felt like **“God told me”** false authority
- [ ] Wait + voice combo felt like **customer support hold music**
- [ ] You would **not** say this truth out loud to another person

### Trust builders (check any that occurred)

- [ ] You felt **recognized**, not fixed
- [ ] You wanted to **keep talking**
- [ ] Philip's question opened a door — you thought *“that's the right question”*
- [ ] You forgot for a moment that it was **technology**
- [ ] You would use this again **this week** carrying something real

**Gate B feel pass:** Majority of sessions score **Someone ≥ 4** and **Computer ≤ 2**; no trust killers on grief/anxiety scenarios.  
**Gate B feel fail:** Any tester says: *“I'd rather type.”* or *“This doesn't sound like Philip.”*

---

## 6. Reliability

### Three consecutive sessions (required)

Complete **three full sessions** on the **same device build**, same day or consecutive days:

| Session | Connect OK | ≥2 voice turns | Philip heard each turn | Philip replied each turn | Mic resumed after each reply | Session ended cleanly | Pass Y/N |
|---------|------------|----------------|------------------------|--------------------------|------------------------------|----------------------|----------|
| A | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |

**Gate B reliability pass:** **3/3** sessions pass the row above.  
**Gate B reliability fail:** Any session requires force-quit to recover.

### Cold launch

| # | Steps | Pass | Fail | Notes |
|---|-------|------|------|-------|
| 6.1 | Force-quit app → reopen → deep link or navigate to lab → connect | First connect works | Hang / error loop | |
| 6.2 | First utterance after cold launch | Philip responds | Dead mic / no reply | |

### Background / foreground

| # | Steps | Pass | Fail | Notes |
|---|-------|------|------|-------|
| 6.3 | Connect → home button mid-wait (before Philip speaks) → return within 30s | Recovers or fails gracefully | Stuck forever | |
| 6.4 | Connect → background **during** Philip speech → return | Audio state sane | Overlap / ghost audio | |
| 6.5 | Connect → background during **your** speech → return | Turn still completes or clear retry | Lost utterance, no feedback | |

### Network interruption

| # | Steps | Pass | Fail | Notes |
|---|-------|------|------|-------|
| 6.6 | Toggle airplane mode **after** connect, before speaking | Clear error; no crash | Black screen / hang | |
| 6.7 | Drop Wi‑Fi mid-turn (LTE handoff) | Completes or fails with recoverable error | Stuck “connected” with no Philip | |
| 6.8 | Reconnect after failure — second connect works | | | |

### Recoverability

- [ ] After any failure, user can **disconnect and reconnect** without reinstalling  
- [ ] Kill switch (`PHILIP_VOICE_LAB_ENABLED=false`) produces **clear** message, not cryptic error  
- [ ] No session leaves mic **hot** after disconnect  

---

## 7. Technical debt discovered during the spike

**Log issues here during Gate B testing.** Do not fix during Gate B — capture for post-gate prioritization.

### Known debt (pre-test)

| ID | Area | Observation | Impact on Philip UX |
|----|------|-------------|---------------------|
| TD-01 | Turn detection | Energy VAD only — no semantic end-of-turn | Early cutoffs; long waits in noisy rooms |
| TD-02 | Duplex | Half-duplex during processing + playback | Cannot interrupt; may feel one-sided |
| TD-03 | Latency | Sequential: STT → phase1 → full TTS blob → ffmpeg → paced publish | Long dead air; breaks “someone is with you” |
| TD-04 | TTS path | Spike uses blob `/api/tts`, not `/api/tts/stream` | Slower time-to-first-byte |
| TD-05 | Agent host | Requires ffmpeg on server for MP3 → PCM | Deploy/ops dependency; failure mode if missing |
| TD-06 | SDK maturity | `@livekit/rtc-node` developer preview | Unknown production stability |
| TD-07 | Scope | Lab uses Phase 1 only — not full Talk It Through arc | Conversation may feel incomplete vs product vision |
| TD-08 | Client UX | Minimal lab screen — no pastoral status copy | User doesn't know if Philip is listening vs thinking |
| TD-09 | Echo | No AEC tuning documented for lab | Speakerphone may worsen VAD / quality |

### New debt found in testing

| ID | Found by | Date | Description | Severity (H/M/L) | Blocks product? Y/N |
|----|----------|------|-------------|------------------|---------------------|
| TD-10 | | | | | |
| TD-11 | | | | | |
| TD-12 | | | | | |

---

## Gate B summary (complete after live testing)

**Testers:** _______________________________  
**Dates:** _______________________________  
**Build:** philip-lab # _______________________________

| Area | Result: Pass / Fail / Inconclusive | Blocker? |
|------|-------------------------------------|----------|
| 1. Latency | | |
| 2. Interruption | | |
| 3. Turn detection | | |
| 4. Audio quality | | |
| 5. Conversation feel | | |
| 6. Reliability (3 sessions) | | |
| 7. Technical debt logged | | |

### Overall Gate B decision

- [ ] **PASS** — Philip is provable in voice; proceed to product integration planning (not merge yet)  
- [ ] **CONDITIONAL** — Philip promising but specific blockers listed: _______________________________  
- [ ] **FAIL** — Voice path does not serve Philip; archive or pivot approach  

**One paragraph — did we prove Philip?**  

_______________________________________________________________________________  
_______________________________________________________________________________  
_______________________________________________________________________________

---

## What happens after Gate B

1. **If PASS:** Review debt log; prioritize *feel* fixes (latency, turn detection, status copy) before merge/deploy/TestFlight to production users.  
2. **If FAIL:** Do not merge spike; decide whether to iterate lab or revisit architecture ADR.  
3. **No optimization during Gate B** — testers observe and record only.

**Related docs:**  
- Spike setup: [`PHILIP_VOICE_LAB.md`](./PHILIP_VOICE_LAB.md)  
- Philip voice DNA: [`artifacts/api-server/src/PHILIP_VOICE.md`](../../artifacts/api-server/src/PHILIP_VOICE.md)  
- Legacy hands-free checklist (product path): [`docs/reminders/VOICE_CONVERSATION_TEST_CHECKLIST.md`](../reminders/VOICE_CONVERSATION_TEST_CHECKLIST.md)
