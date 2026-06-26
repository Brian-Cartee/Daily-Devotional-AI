# Voice Conversation — Hands-Free Test Checklist

**Goal:** Tap once on Talk It Through → speak naturally → Philip responds aloud → mic resumes automatically → repeat until session ends.

**Platforms:** iPhone App Store shell (native bridge), iPhone Safari/PWA, desktop Chrome.

---

## Before you start

- [ ] Force-quit app → reopen (native builds only)
- [ ] Fresh entry: `/guidance` (not `?active=1`)
- [ ] Phone not on silent (or use headphones)
- [ ] Notes app ready for exact behavior + timestamps

---

## Core hands-free loop

### 1. Entry — one tap, full ping-pong

- [ ] Open Talk It Through (single tap from nav)
- [ ] **Pass:** Philip greeting plays within ~2s
- [ ] **Pass:** Status shows “Philip is speaking” then “Philip is listening”
- [ ] **Pass:** Mic opens **without** second tap (native app)
- [ ] Speak ~15–30s real content
- [ ] **Pass:** Silence auto-submits OR “Done speaking” works (native: auto preferred)
- [ ] **Pass:** Status: “Philip is sitting with that” during Phase 1
- [ ] **Pass:** Philip Phase 1 speaks aloud
- [ ] **Pass:** Mic reopens automatically after Philip finishes
- [ ] **Fail notes:** _______________________________________________

### 2. Full session voice path

- [ ] Complete entry → Phase 1 reply → Phase 2 → verse → prayer → carry/stay
- [ ] **Pass:** No mic active while Philip speaks (no echo/feedback)
- [ ] **Pass:** No overlapping TTS from previous turn
- [ ] **Fail notes:** _______________________________________________

### 3. Stay path — follow-up ping-pong

- [ ] Choose **stay** after prayer
- [ ] **Pass:** Philip speaks follow-up aloud
- [ ] **Pass:** Mic reopens automatically
- [ ] Speak again → **Pass:** response continues naturally
- [ ] **Fail notes:** _______________________________________________

---

## Fallback paths (must still work)

### 4. Typed path

- [ ] Tap “type instead” or use text field
- [ ] **Pass:** Full session without voice
- [ ] **Pass:** Phase 1 text-only (no auto TTS on typed entry)

### 5. Mic denied

- [ ] Deny mic in iOS Settings → reopen app
- [ ] **Pass:** Pastoral error copy, text path available
- [ ] **Pass:** No infinite “listening” state

### 6. TTS failure

- [ ] Airplane mode after transcript submitted (or block `/api/tts`)
- [ ] **Pass:** Text fallback visible; no stuck “speaking” orb
- [ ] **Pass:** Copy: “Philip's voice had trouble…” (not technical error)

### 7. AI / network failure

- [ ] Slow or failed `/api/guidance` during voice session
- [ ] **Pass:** Session recoverable; no black screen
- [ ] **Pass:** Can continue by text

---

## Edge cases

### 8. Silence / no speech

- [ ] Open mic, say nothing for 10s
- [ ] **Pass:** Retries or pastoral prompt — not infinite listen

### 9. User speaks while Philip speaks

- [ ] Talk over Philip mid-TTS
- [ ] **Pass:** Philip not interrupted unless barge-in explicitly added (half-duplex: mic should stay off)

### 10. Session end during request

- [ ] Navigate away mid-turn
- [ ] **Pass:** Mic stops; no background capture
- [ ] **Pass:** Stale audio does not play on return

### 11. Rapid start/stop

- [ ] Force-quit during active mic
- [ ] Reopen → **Pass:** Clean state, no duplicate overlays

### 12. Stale response prevention

- [ ] Submit entry, immediately force-quit before Phase 1
- [ ] Reopen fresh session → **Pass:** Old response does not bleed in

---

## Platform matrix

| Check | App Store (native) | Safari PWA | Desktop Chrome |
|-------|-------------------|------------|----------------|
| Hands-free entry | | | |
| Auto mic after TTS | | | |
| Phase 1 ping-pong | | | |
| Follow-up ping-pong | | | |
| Typed fallback | | | |

---

## Success definition

**Ship when:** On **iPhone App Store build**, three consecutive real sessions complete entry → Phase 1 voice reply → Phase 2 without manual mic tap between Philip turns (Done speaking only if silence detection fails once, not every turn).

**Do not ship hands-free** if: dead taps, stuck mic, black screen, or Philip talks over user capture.
