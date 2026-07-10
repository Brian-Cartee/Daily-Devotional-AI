# Philip Testing Workflow

**Improve Philip through real sessions + structured review — not prompt guessing.**

---

## Two tracks (run both)

| Track | When | What |
|-------|------|------|
| **Automated regression** | Before every deploy; after every runtime change | `eval/` suite |
| **Live session review** | 2–3× per week during active Philip work | Human + 4 AI roles |

---

## Track A — Automated (before deploy)

### Minimum gate (required)

```bash
cd eval
npm install
npm run turing:gate          # golden 15 vs production
# or local API:
npm run turing:gate -- --local
```

**Pass:** ≥80% scenarios pass (`GATE_MIN_PASS_RATE` in `eval/golden.ts`).  
**Excellent target:** ≥90%.

### Full regression (weekly or before major Philip changes)

```bash
cd eval
npm run eval                 # 60 scenarios, phase1
npm run eval:response        # full response path
npm run presence             # presence fixtures
npm run turing -- --smoke    # 5-scenario conversation smoke
npm run turing -- --presence # presence-layer conversations
```

Reports: `eval/reports/philip-eval-*.html`, `eval/reports/turing-test-*.html`

### Optional deploy gate (when enabled)

```bash
RUN_TURING_GATE=1 bash scripts/deploy.sh
# skips with SKIP_TURING_GATE=1
```

### Mind continuity gate

```bash
cd eval && npm run turing:mind-gate
```

Validates session mind reads correctly by exchange 3+.

---

## Track B — Live sessions (the fast improvement loop)

### Phase 1 weekend goal: 10 sessions

Use **real situations**, not scripts. Suggested mix:

| # | Scenario | Channel |
|---|----------|---------|
| 1–2 | Grief or loss | Talk It Through |
| 3–2 | Anxiety / fear | Talk It Through |
| 5 | Spiritual distance | Talk It Through |
| 6–7 | Voice Lab multi-turn (5+ turns) | Voice Lab |
| 8 | Fast back-to-back voice turns | Voice Lab |
| 9 | Quiet / emotional voice | Voice Lab |
| 10 | Interrupt Philip mid-reply (barge-in) | Voice Lab |

### Per session checklist

1. **Run session** — talk naturally 3–10 turns minimum for text; 5+ for voice
2. **Capture artifact**
   - Text: copy transcript or note turn highlights
   - Voice: timeline JSON from `artifacts/api-server/server/philip-voice-lab/{conversationId}.json` OR Gate B eval from `/philip-voice-eval`
3. **Fill** [templates/SESSION_REVIEW.md](./templates/SESSION_REVIEW.md) — your scores first (human baseline)
4. **Paste** transcript into ChatGPT (Experience) and Claude (Constitutional) using [03_AI_ROLES.md](./03_AI_ROLES.md)
5. **Synthesize** — list themes; mark quorum issues
6. **Cursor** — only for quorum issues; smallest fix
7. **Gemini** — only after 3+ sessions or before major roadmap bets

### Do not tweak after every session

Wait until the **same issue appears 3–4 times** across sessions OR is a Canon hard-fail. Log recurring issues in the debt table below.

---

## Debt table (recurring themes)

| Issue | Sessions seen (3+ needed) | Reviewers agreeing | Horizon | Action |
|-------|---------------------------|--------------------|---------|--------|
| | | | | |
| | | | | |

Copy this table into a running note or expand in Gate B doc.

---

## Voice Lab specific

After disconnect, app opens **Philip Test Harness** (`/philip-voice-eval`).

Required field: **"What broke immersion?"**

Timeline auto-saved: `artifacts/api-server/server/philip-voice-lab/{conversationId}.json`

Per-turn metrics to check:

- `sttMs`, `guidanceMs`, `ttsMs`, `playbackMs`, `totalTurnMs`
- `lane` on turn 3+ (should be `follow_up`, not `presence_hold`)
- `vadReason`, `mic_resumed` timing

---

## 10-session review meeting (with yourself or team)

After 10 sessions:

1. Sort debt table by frequency × trust impact
2. Compare human rubric averages vs automated eval trends
3. Quorum issues → one engineering sprint (max 1–2 fixes)
4. Everything else → backlog
5. Re-run `npm run turing:gate` after fixes
6. Update North Star only if transformation definition changed (rare)

---

## What "Excellent Philip" looks like in numbers

| Signal | Good | Excellent |
|--------|------|-----------|
| `turing:gate` pass rate | ≥80% | ≥90% |
| Human overall session | ≥7 avg | ≥8.5 avg |
| Recognition before advice | ≥7 | ≥9 |
| Trust increased | ≥7 | ≥9 |
| Voice: "would keep talking" | 2/3 testers | 3/3 testers |
| Canon hard-fails | 0 | 0 |
| Turn 3+ lane | `follow_up` | `follow_up` + substance |
| Same issue recurrence before fix | — | <2 sessions after fix |

Automated eval proves **regression safety**. Live rubric proves **excellence**.
