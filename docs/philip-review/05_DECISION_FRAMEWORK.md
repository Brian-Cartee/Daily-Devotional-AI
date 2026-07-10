# Philip Decision Framework

**When to engineer, when to canon, when to wait.**

---

## The quorum rule

| Signal | Action |
|--------|--------|
| **Claude: Canon hard-fail** | Stop. Fix before anything else. No quorum needed. |
| **2+ reviewers** flag same issue on same session | Authorized engineering sprint (smallest fix) |
| **Same issue 3–4 sessions** (human rubric or AI) | Authorized — add to debt table, prioritize |
| **Only ChatGPT** flags experience | Tune wording / VAD / latency — not theology |
| **Only Gemini** flags horizon | Backlog or strategy doc — not this week's code |
| **Only Cursor** has a fix | Do not ship until experience + faithfulness reviewers agree problem is real |
| **Automated eval fails** | Fix regression even if live sessions "felt fine" |
| **Live sessions fail, automated passes** | Rubric or scenario gap — add fixture to `eval/`, don't ignore |

---

## Decision tree

```
New issue reported
        │
        ▼
  Canon hard-fail? ──YES──► Fix immediately (Claude leads)
        │
        NO
        ▼
  turing:gate regression? ──YES──► Fix before deploy (Cursor leads)
        │
        NO
        ▼
  Quorum (2 reviewers OR 3 sessions)? ──NO──► Log in debt table; wait
        │
        YES
        ▼
  Gemini: commodity by 2029? ──YES──► Defer or solve via Canon/formation, not features
        │
        NO
        ▼
  Smallest fix (Cursor) → verify checklist → turing:gate → 2 live sessions
```

---

## What each change type requires

| Change type | Approvers | Verification |
|-------------|-----------|--------------|
| Prompt / planner tweak | ChatGPT ≥7 + Claude PASS | `npm run eval` on affected category |
| Runtime gates / pipeline | Claude PASS + `turing:gate` | Golden 15 + live session |
| Voice agent (.mjs) | ChatGPT voice rubric + logs | Voice Lab 3-turn session + timeline JSON |
| Canon / theology | Refounding or Amendment process | Not a Cursor Friday change |
| New feature | Gemini horizon=moat + North Star fit | 10-session debt table entry first |
| Deploy to production | `turing:gate` pass + no open hard-fails | `curl native-manifest.json` timestamp |

---

## Stop building list (unless quorum overrides)

- Smarter answers for its own sake
- Longer memory as marketing
- More agents before usage proof
- Prompt marathons without session reviews
- Engagement streaks / guilt notifications
- Philip full-screen moments
- Cheerful tone to mask latency
- Bible trivia / generic devotional volume

---

## Invest deeply list (years, not sprints)

- Canon ratification + eval enforcement
- This review system (compounding)
- Formation arcs (grief, doubt, addiction — multi-session)
- Church integration with consent
- Ethical memory doctrine
- Crisis protocol
- Testimony / prayer archive
- Model abstraction (swap providers without identity rewrite)

---

## Prompt change policy

**Prompts are implementation (Tier 2b), not identity (Tier 0).**

1. No prompt edit without a **failed session artifact** (transcript + rubric)
2. No prompt edit to fix what a **gate** should catch — fix the gate
3. One variable per change — so review can attribute improvement
4. After edit: `npm run eval -- --filter <category>` minimum

---

## Escalation to Brian

Escalate when:

- Canon hard-fail on crisis or false authority
- Same quorum issue unresolved after 2 fix attempts
- Automated pass rate drops >10% in one week
- Voice Lab timeline corruption on back-to-back turns
- Any reviewer recommends pausing Voice Lab for Gate B failure

---

## One-line decision test

> **If every AI company shipped this tomorrow, would Philip still matter?**

If no → don't build.  
If yes → quorum, smallest fix, measure again.
