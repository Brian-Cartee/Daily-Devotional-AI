# Philip Review System

**Phase 1 operational docs.** Read this before prompts, before engineering sessions, before Voice Lab tuning.

## Why this exists

Prompts are ~5% of Philip. The other 95% is a system where every AI knows its job and every session gets graded the same way.

**Trust compounds. Intelligence depreciates.**  
**Review systems compound. Prompts depreciate.**

## What's in this folder

| Doc | Purpose |
|-----|---------|
| [01_NORTH_STAR.md](./01_NORTH_STAR.md) | One page. Four questions. Frozen mission. |
| [02_EVALUATION_RUBRIC.md](./02_EVALUATION_RUBRIC.md) | Score every session the same way — human or AI judge. |
| [03_AI_ROLES.md](./03_AI_ROLES.md) | Four permanent reviewers + copy-paste prompts. |
| [04_TESTING_WORKFLOW.md](./04_TESTING_WORKFLOW.md) | Run 10 real sessions → review → find themes. |
| [05_DECISION_FRAMEWORK.md](./05_DECISION_FRAMEWORK.md) | When to engineer, when to canon, when to wait. |
| [templates/SESSION_REVIEW.md](./templates/SESSION_REVIEW.md) | Blank form after each live session. |

## Relationship to other docs

| Layer | Location | Role |
|-------|----------|------|
| **Review System** (this folder) | `docs/philip-review/` | How we decide what to improve |
| **Canon** | `PhilipCanon/` | What must never change (Tier 0–2) |
| **Voice identity** | `artifacts/api-server/src/PHILIP_VOICE.md` | Spiritual DNA for prompts |
| **Automated eval** | `eval/` | Regression tests before deploy |
| **Voice Lab Gate B** | `docs/spikes/PHILIP_VOICE_LAB_GATE_B.md` | Live voice UX validation |

## Build order (ChatGPT proposal — adopted)

1. **Phase 1 — Review System** ← you are here  
2. **Phase 2 — Constitution** (`PhilipCanon/` ratification over time)  
3. **Phase 3 — Voice Lab handbook** (tone, timing, silence, interruption — living engineering manual)

Do not invert this order. A perfect prompt without a review process is a trap.

## Quick start (this weekend)

1. Read [01_NORTH_STAR.md](./01_NORTH_STAR.md) — confirm or edit with Brian.
2. Run automated baseline: `cd eval && npm run turing:gate` (see [04_TESTING_WORKFLOW.md](./04_TESTING_WORKFLOW.md)).
3. Do **one** real Talk It Through or Voice Lab session.
4. Fill [templates/SESSION_REVIEW.md](./templates/SESSION_REVIEW.md).
5. Paste transcript into each AI using prompts from [03_AI_ROLES.md](./03_AI_ROLES.md).
6. Apply [05_DECISION_FRAMEWORK.md](./05_DECISION_FRAMEWORK.md) — only fix what earns a quorum.
