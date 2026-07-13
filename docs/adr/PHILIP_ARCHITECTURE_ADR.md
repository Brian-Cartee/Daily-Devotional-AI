# ADR: Philip Architecture — Models, Voice, Memory, Agents, Tools, Cost

**Status:** Draft for discussion. Not a build authorization.
**Date:** 2026-07-08
**Gate:** Per the Shepherd's Path strategy decision, Philip stays deprioritized behind the Church Care OS pivot until ~100 paying churches, or until a timeboxed spike (separate decision, not this doc) proves the voice-reliability problem is actually solved by a paved-road framework. This ADR exists so that *if/when* that gate opens, the direction is already decided — not re-litigated from scratch under time pressure.

## Context

Philip's first architecture (custom WebView bridge + expo-av + hand-rolled turn-taking) failed on infrastructure, not on theology or prompt quality. That failure is what triggered the pivot away from Philip as the flagship feature. The prompt/theology canon (`PHILIP_VOICE.md`, `talkItThroughPrompt.ts`, `talkItThroughVariants.ts`) was never the problem and is fully reusable.

The guiding principle for this ADR, stated directly by Brian: **architect Philip as if every foundation model available today will be obsolete within five years. Replacing the underlying model should be a configuration change, not a rewrite.** Everything below is written to protect that property.

---

## 1. AI Models

**Decision: no hardcoded provider. A model-abstraction layer sits between Philip's product logic and any LLM, from the first line of code.**

Do not pick "Claude vs GPT vs Gemini vs DeepSeek vs Qwen" as a one-time decision. Pick a **routing architecture** instead:

- A thin adapter interface (`generate(prompt, context, tier)`) that product/theology code calls — it never imports a provider SDK directly.
- A router behind that interface selects the actual model per-turn based on **tier**, not per-deployment based on vendor preference:
  - **Tier 0 (cheap/fast):** routine conversational turns, small talk, retrieval-augmented scripture lookups. Candidate: a cheap/open-weight model (Qwen, DeepSeek, or whatever is cheapest-and-good-enough at the time) or a small Claude/GPT tier model.
  - **Tier 1 (premium):** emotionally loaded moments, anything touching the Two Non-Negotiables (scripture selection, "did they come" recognition), and the first N turns of a new relationship where getting the voice right matters most.
  - **Tier 2 (safety-critical):** self-harm / crisis language detection and response. This tier should be the most conservative and probably the most expensive-per-token you're willing to spend, regardless of the cost-reduction goal below — this is the one place "cheaper" is not an acceptable tradeoff.
- Mixture-of-Experts (a single vendor's MoE model) is a *candidate implementation* for Tier 0, not a substitute for the routing layer above. Don't conflate "use an MoE model" with "build a router" — you want the router regardless of which models sit behind it.

**Why not just pick Claude and move on:** Brian is already building on Anthropic elsewhere, which is a reasonable default for Tier 1/2 today. But hardcoding that into Philip's product logic recreates the exact kind of infrastructure lock-in that made the voice engine expensive to fix. The abstraction costs a small amount of upfront engineering and buys total optionality later.

**Open question, not resolved by this ADR:** which specific models sit in which tier. That's a fast-moving, cheap-to-change decision — resolve it operationally (a config file / admin flag), not architecturally.

---

## 2. Voice

**Decision: LiveKit (client + Agents) as the initial voice transport and orchestration layer, chosen specifically because it owns the iOS audio-session and turn-detection problems that broke the previous architecture.**

- Client: `@livekit/react-native` (Expo dev-build, not Expo Go) for the native app; LiveKit JS client for web.
- Server: LiveKit Agents for room lifecycle, VAD/turn endpointing, and interruption (barge-in) handling.
- Pipecat is the fallback if LiveKit's Agents abstraction turns out to be too opinionated for Philip's specific conversational shape (e.g., the Phase 1/Phase 2/verse/prayer/stay-or-carry structure needs finer-grained control than Agents exposes). Pipecat can also run *on top of* LiveKit as a transport, so choosing LiveKit now doesn't foreclose Pipecat later.
- Daily and raw WebRTC are not standalone choices here — Daily is what Pipecat's RN transport typically rides on, and raw WebRTC is what LiveKit/Daily already wrap for you. Neither is a reason to skip LiveKit.

**Why this is the swappable layer, not the stable one:** voice infrastructure changes fast (this is literally the second engine Philip has had). Nothing about Philip's identity should live inside the voice layer — it should only carry audio in and text/response out, with the actual conversational logic (persona, memory, scripture selection) living upstream, untouched by which transport is under it.

---

## 3. Memory

**Decision: three technical tiers, with the six named "memory types" as categories/tags inside those tiers — not six separate systems.**

| Technical tier | Purpose | Storage shape |
|---|---|---|
| **Session memory** | Current conversation only (turn history, current emotional thread) | In-memory / ephemeral, discarded or summarized at session end |
| **Long-term memory** | Everything that should be retrievable later but doesn't need to be loaded every turn | Vector store + metadata, retrieved via RAG. **Daily, Relationship, Scripture, Prayer, and Journal memory all live here**, distinguished by a `type` field and normal metadata filtering — not separate databases. |
| **Identity memory** | The compact, always-loaded profile of who this person is (name, key relationships, ongoing struggles, walk stage) | Small structured record, not vector-retrieved — this gets injected into every prompt directly because it's too important to depend on retrieval recall. |

Why identity is its own tier and not just another RAG category: RAG retrieval is probabilistic (it can miss). Identity — "this is Sarah, she's been praying for her marriage for 6 months, don't re-ask what's already been said" — is exactly the kind of thing that must never silently fail to surface. It should be small enough to always fit in context, not something Philip "might remember."

**Consequence:** the memory schema (session / long-term / identity, with typed records) is the stable part. Which vector database or storage backend implements it is swappable.

---

## 4. Agents

**Decision: one core Philip persona/orchestrator, plus a small number of tool-calling specialists — not nine parallel "agents."**

The nine roles suggested (Prayer, Bible, Writing, Business, Leadership, Church, Research, Scheduling, Relationship) are mostly **tools with a system-prompt flavor**, not agents that need independent reasoning loops. Standing up nine agents before there's usage data to justify them is the same over-investment risk that got Philip shelved in the first place — it trades "one giant prompt" for "nine giant prompts to maintain," which isn't obviously better.

Recommended shape:
- **Philip (core):** the persona and conversational orchestrator. Always in the loop. Owns the Two Non-Negotiables and decides when to call a tool vs. respond directly.
- **A small number of genuine specialist agents**, only where the reasoning is actually different in kind, not just topic:
  - **Prayer agent** — has a distinct job (holding a prayer, not just discussing one).
  - **Scripture/Bible agent** — retrieval + precision matching is a real distinct skill (this is the Tony Evans "one verse, exactly right" requirement — worth isolating so it can be tuned/evaluated on its own).
  - Everything else (Writing, Business, Leadership, Church, Research, Scheduling, Relationship) starts as a **tool call**, not an agent. Promote one to a full agent only when you have evidence that a single tool call isn't enough — e.g., if scheduling needs multi-step negotiation across a calendar.

**Consequence:** the agent *layer* (a registry of callable agents/tools that the core orchestrator can invoke) is stable. Which specific agents exist in that registry is expected to grow and change — that's the swappable part.

---

## 5. Tools

Phase tools by blast radius and by what already exists, not by what's interesting:

- **Phase 1 (low risk, already partially built):** Bible search, prayer list, notes/journal. These are read-mostly or write-to-Philip's-own-data.
- **Phase 2 (personal productivity, user-consented):** Calendar, Reminders. Still user's own data, but now Philip is *acting* (creating events), which needs explicit confirmation UX.
- **Phase 3 (B2B-dependent):** Church directory, CRM — only relevant once church-portal exists and has an API for Philip to call. Don't build these until the Church Care OS side has real data to connect to.
- **Phase 4 (deferred, needs an explicit safety review before any spike touches them):** Email, Phone, Messages, Web (open browsing). These let Philip act on the user's behalf toward *other people* — a spiritual-authority AI sending messages or making calls without a human in the loop is a materially different risk category than Philip talking to the user. Do not implement without a separate, explicit decision.

**Interface consequence:** define one tool-calling contract (name, args schema, confirmation-required flag) now, even for Phase 1 tools, so Phase 3/4 tools slot into the same registry later instead of needing their own plumbing.

---

## 6. Cost

Reframe the question from "which model is best" to **"how do we cut cost 90% while keeping 95% of the experience"** — this is the actual competitive lever, not model choice in isolation.

Levers, roughly in order of impact-per-effort:
1. **Tiered routing** (see §1) — most turns don't need a premium model. This is the single biggest lever.
2. **TTS caching** — cache audio for repeated phrases/greetings/common scripture lines instead of re-synthesizing every time.
3. **Prompt distillation** — author the theology/persona prompt once (with a premium model, offline), then compress/distill it into a smaller prompt or fine-tune target that a cheap model can execute consistently, rather than sending the full `PHILIP_VOICE.md`-derived prompt on every turn to an expensive model.
4. **Context discipline** — identity memory should be small and curated (per §3) specifically so every turn isn't paying premium-model prices to re-read a bloated profile.
5. **Streaming over completeness** — for voice, partial/streamed responses reduce perceived latency cost without needing a faster (more expensive) model.

This lever list, not the model-comparison table, is what should be revisited most often — it changes monthly as model pricing shifts, while the routing *architecture* in §1 doesn't need to change at all.

---

## Objective 12 — Philip as an Operating System, Not an App

Layer map, with an explicit stability rating:

| Layer | Responsibility | Stability |
|---|---|---|
| **Theology layer** (`PHILIP_VOICE.md`, prompt kernels) | Who Philip is, spiritually and relationally | **Stable for years.** This is the actual product. Everything else exists to deliver this. |
| **Identity/persona layer** | Voice, tone, the Two Non-Negotiables | **Stable for years.** Changes only with deliberate theological/brand decisions, never with a model or infra swap. |
| **Core kernel / orchestrator** | Turn loop, tier routing, when to call a tool vs. respond, safety escalation | **Stable contract, evolving implementation.** The *interface* (what the kernel promises to do) should barely change; the code behind it will. |
| **Memory layer** | Session / long-term / identity schema | **Stable schema, swappable backend.** (§3) |
| **Agent layer** | Registry of callable specialists | **Stable interface, growing contents.** (§4) |
| **Tool layer** | Registry of callable actions with confirmation semantics | **Stable interface, growing/phased contents.** (§5) |
| **Model abstraction layer** | Adapter + router in front of any LLM | **Stable interface, fully swappable backend.** (§1) |
| **Voice layer** | Audio transport in/out | **Fully swappable.** Already on its second implementation; expect a third. (§2) |
| **Plugin system / third-party integrations** | Anything external (calendar providers, email providers, etc.) | **Fully swappable**, by design — these are the layers most exposed to the outside world changing. |
| **Church integration layer** | API surface to `artifacts/church-portal` | **Swappable, paced by the B2B roadmap**, not by AI trends — this layer changes when the church product changes, independent of everything else in this table. |

**The one-sentence test for every future engineering decision:** *does this change the theology/identity layer, or does it change something underneath it?* If underneath, it should be swappable without Philip's product logic noticing. If the theology/identity layer itself needs to change, that's a deliberate, rare, human decision — never a side effect of a model upgrade or a voice-stack migration.

---

## Non-decisions (explicitly out of scope for this document)

- Whether/when the 100-paying-church gate opens. See `project_shepherds_path_strategy` memory / prior conversation — unchanged by this ADR.
- Specific vendor selection within any tier (which cheap model, which vector DB). These are operational, not architectural, and should be revisited on a much shorter cycle than this document.
- Any commitment to build. This ADR describes the shape a build would take *if* undertaken — it is not the timeboxed spike decision, which is separate.
