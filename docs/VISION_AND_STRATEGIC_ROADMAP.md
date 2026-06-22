# Shepherd's Path Vision & Strategic Roadmap

### Version 1.0 · Living document

**Last updated:** June 2026  
**Owner:** Brian Cartee  
**Status:** Single source of truth for vision, strategy, product, and technical direction

> This is not a pitch deck. Not a business plan. It is the document your brother, future partners, Cursor, Claude, investors, and advisors should read first — then build from.

**Companion docs (technical & operational):**
- [PRODUCT_CONVICTION_CHARTER.md](./PRODUCT_CONVICTION_CHARTER.md) — theological and product guardrails
- [SAFE_DEPLOY.md](./SAFE_DEPLOY.md) — production deploy procedure
- [CLAUDE.md](../CLAUDE.md) — developer quick reference
- [MISSION_FIT_BACKLOG.md](./MISSION_FIT_BACKLOG.md) — feature prioritization filter

---

# Shepherd's Path

## Vision, Strategy & Growth Roadmap

### Founder

**Brian Cartee**

### Mission

To help people walk with God through life's hardest moments by providing a compassionate, Scripture-grounded spiritual companion available whenever they need it.

---

# Executive Summary

Shepherd's Path is not a Bible app.

It is not a prayer app.

It is not a devotional app.

Those categories are already crowded and mature.

Shepherd's Path exists to solve a different problem:

**Spiritual loneliness during real-life struggles.**

Millions of people carry anxiety, grief, fear, confusion, shame, loneliness, and uncertainty every day.

Many have no pastor available.

Many do not want to burden friends.

Many feel disconnected from church.

Many simply need someone to walk with them through what they are carrying.

Shepherd's Path exists to meet people in those moments.

Our mission is to become the most trusted faith companion in the world.

---

# Founder Story

*Brian: keep this section personal and current. Update when your story evolves.*

Brian Cartee built Shepherd's Path from lived experience — not market research alone.

After the mortgage crisis and the years of rebuilding that followed, Brian knows what it feels like to search for God in the middle of something hard and not know where to start. Faith was not theoretical. Survival, family, identity, and hope were on the line. Church was not always available at 2:00 AM. Friends were not always the right audience. Content apps offered verses but not presence.

Shepherd's Path exists because **the moment matters more than the library.**

Brian is building this as a ministry-shaped product: stewardship over ego, Scripture over algorithms, presence over performance. The goal is not to become another content platform. The goal is to be the place someone opens when life is heavy — and to leave them closer to God than when they arrived.

**Why Brian is the right builder:**
- Deep personal stake in the problem (not a tourist in the faith-tech category)
- Technical ability to ship (full-stack product, mobile shell, AI integration, production ops)
- Long-horizon conviction (formation over virality; trust over hacks)
- Willingness to keep core discipleship free while building sustainable revenue

---

# The Problem

Most faith products deliver content.

People rarely need more content.

They need:

- Comfort
- Presence
- Guidance
- Prayer
- Understanding
- Hope

Most spiritual struggles happen outside church walls.

The moments that matter most often happen:

- At 2:00 AM
- During a crisis
- After bad news
- During grief
- During anxiety
- During loneliness
- During major life decisions

These moments create an emotional need that existing faith apps do not fully solve.

---

# Why Now?

Five forces make the **Spiritual Companion** category possible today in a way it was not five years ago:

1. **AI quality crossed a pastoral threshold.** Large language models can now hold empathetic, context-aware conversation at low cost (`gpt-4o-mini` for guidance; OpenAI TTS for listen). The product can feel present without pretending to be God or replacing Scripture.

2. **Mobile-first spiritual habits are normalized.** People already reach for their phone in crisis. The behavior exists; the faithful product did not.

3. **Church disconnection is structural, not cyclical.** Millions believe but feel alone between Sundays. The gap is persistent — not a temporary pandemic artifact.

4. **Trust in generic chatbots is low; trust in purpose-built companions can be high.** A vertically focused, Scripture-grounded companion can outperform general AI for this use case — if tone, safety, and theology are disciplined.

5. **Distribution is democratized.** App Store, organic social, pastor referral, and word-of-mouth can reach hurting people without a traditional ministry launch budget — if the first experience earns trust.

**The window:** First mover in *trusted spiritual companionship* — not first mover in Bible apps.

---

# Our Category

### Not:

- Bible App
- Prayer App
- Devotional App
- Meditation App

### Instead:

## Spiritual Companion

A trusted faith-based companion that walks alongside people through life's challenges while remaining deeply grounded in Scripture.

---

# Core Positioning

When life gets heavy…

When faith feels distant…

When someone doesn't know where to turn…

**Shepherd's Path is the place they go.**

**Tagline (internal):** *The path is already here.*

**Bottom nav order (product truth):** For You → Today → **Talk It Through** → Journey

---

# Our North Star

We do not measure success by:

- Downloads alone
- Raw sessions
- Page views
- Content consumption

We measure success by:

## Lives Impacted

Questions:

- Did someone feel less alone?
- Did someone reconnect with God?
- Did someone find hope?
- Did someone pray when they otherwise wouldn't have?
- Did someone return because they felt understood?

**Decision filter (from Product Conviction Charter):** Does this exalt Christ, keep Scripture central, help users pray and grow, protect peace — and would we still ship it if engagement dropped but integrity rose?

---

# Product Philosophy

Every feature must answer one question:

## Does this help someone walk with God through a real moment?

If not, it should not exist.

**We explicitly reject:** streak leaderboards, shame-based retention, AI as spiritual authority, paywalling core Scripture access, performative spirituality, addictive dopamine loops.

---

# The Core Experience

## Talk It Through

Talk It Through is the center of the company.

Everything else supports it.

**Route:** `/guidance`  
**Nav label:** Talk It Through (heart icon)

### Purpose

Allow users to share what is on their heart and receive:

- Compassion
- Reflection
- Scripture
- Prayer
- Encouragement

### Experience principles

- Warm, human, pastoral, gentle, non-judgmental
- Never robotic, preachy, or transactional
- Sacred restraint: pauses ("Reading this carefully…") before AI responds
- Two-phase conversation: empathy + one question → then full guidance

### User flow (summary)

1. **Entry** — Home hero, nav tab, devotional completion, journal, prayer wall, deep links (`/guidance?situation=...`)
2. **Share** — Voice (mic) or type; situation pills (Anxiety, Grief, Doubt, etc.)
3. **Phase 1** — AI reflects back + asks one deepening question; user replies
4. **Phase 2** — Streams "What I'm hearing"; progressive reveal of Scripture card, Walk This Today, prayer card
5. **Completion fork** — "Carry this into your day" vs "Stay a little longer"
6. **Stay path** — Follow-up chat, personalized journey (Pro), pastor video, share invite
7. **Carry path** — Optional "Sit in silence" → home

### AI voice (system design)

Prompts position the AI as a *quiet, wise presence* — not therapist, not pastor, not chatbot. Scripture and prayer are generated in separate API calls so the main response stays conversational. Two modes exist: **Encouraging** (default) and **Coach** (direct accountability — consent-gated; compassion overrides coach tone in crisis).

Full UX audit: see conversation history / `GuidancePage.tsx` + `talkItThroughPrompt.ts`.

---

# Supporting Experiences

| Experience | Route | Purpose |
|------------|-------|---------|
| **Daily Word (Today)** | `/devotional` | Daily Scripture, reflection, prayer — simple touchpoint |
| **For You (Home)** | `/` | One clear next step; emotional entry to Talk It Through |
| **Guided Journeys** | `/understand` | Seasonal pathways: anxiety, grief, forgiveness, hope, etc. |
| **Journal** | `/journal` | Process what God is doing; prayer history |
| **Bible Read** | `/read` | Full Bible (KJV, WEB, ASV) — always free |
| **Sigh Room** | `/sigh` | Quieter entry when words are hard |
| **Prayer Wall** | `/prayer-wall` | Community intercession |
| **Prayer Closet** | `/prayer-closet` | Guided prayer space |
| **Sermon Mode** (mobile) | Native tab | Live scripture detection during sermons |

---

# Why People Return

People do not return because content is available.

People return because they feel:

- Seen
- Heard
- Understood
- Encouraged

The goal is not information.

The goal is transformation.

---

# Current Traction & Metrics

*Update this section monthly. Investors and partners will ask for these numbers.*

| Metric | Current | Target (12 mo) | Notes |
|--------|---------|----------------|-------|
| **Monthly active users (MAU)** | _[fill in]_ | _[fill in]_ | Web + iOS + Android |
| **Weekly Talk It Through conversations** | _[fill in]_ | _[fill in]_ | Core health metric |
| **D7 / D30 retention** | _[fill in]_ | _[fill in]_ | |
| **Journal entries saved** | _[fill in]_ | _[fill in]_ | |
| **Email subscribers** | _[fill in]_ | _[fill in]_ | `subscribers` table |
| **Pro / Mission Partner subs** | _[fill in]_ | _[fill in]_ | Stripe + RevenueCat |
| **App Store rating** | _[fill in]_ | 4.7+ | |
| **Social followers (YT / IG / TikTok)** | _[fill in]_ | _[fill in]_ | |
| **Testimonials collected** | _[fill in]_ | 50+ written/video | Priority for Phase 1 |

**Where to pull data:**
- Production DB (PostgreSQL on Lightsail): `journal_entries`, `subscribers`, `pro_subscribers`
- RevenueCat dashboard (iOS/Android IAP)
- Stripe dashboard (web subscriptions)
- App Store Connect / Google Play Console
- Analytics (add PostHog / Plausible if not yet wired — recommended)

---

# Our Competitive Advantage

### Competitors

- Hallow
- YouVersion
- Abide
- Glorify
- Pray.com

All are strong products. Most focus primarily on content delivery.

### Shepherd's Path focus

- Personalized spiritual companionship
- The emotional moment
- The conversation
- The relationship

---

# Long-Term Moat

Technology is not the moat.

AI is not the moat.

The moat is:

## Trust

Built one conversation at a time.

### Theological integrity

Consistently grounded in Scripture. AI supports; never replaces.

### Voice & tone

Warm. Compassionate. Pastoral. Recognizable. Codified in `talkItThroughPrompt.ts` and the Product Conviction Charter.

### User history

Journal, guidance memory, prayer archive, seasonal context — understanding what someone has carried over time.

### Brand reputation

Known as safe, trustworthy, and spiritually mature.

---

# Target Users

## Primary audience

Christians experiencing:

- Anxiety
- Loneliness
- Fear
- Grief
- Burnout
- Spiritual disconnection

## Secondary audience

People who:

- Believe in God
- Feel disconnected from church
- Are exploring faith
- Need encouragement

---

# Monetization Philosophy

Revenue exists to sustain the mission.

The free experience must be genuinely valuable.

Premium should deepen the relationship — never exploit spiritual hunger.

## Pricing (current — June 2026)

| Tier | Monthly | Annual | Role |
|------|---------|--------|------|
| **Free** | $0 | $0 | Full Bible, daily devotional, core journeys, meaningful Talk It Through |
| **Pro** | $7.99 | $79.99 | Unlimited AI + listen, full archive, guided pathways, sermon notes |
| **Mission Partner** | $14.99 | $149.99 | Pro + unlimited listen (no soft cap) + impact badge + ministry support positioning |

**Payments:** Stripe (web), RevenueCat + App Store / Google Play (native).

## Free tier (actually free)

- Full Bible reading
- Daily devotional (Scripture, reflection, prayer)
- Core Bible journeys
- Talk It Through: **3 conversations/week** (Mon UTC reset)
- AI: 15 responses/day (first 14 days), then 12/day (+ grace buffer)
- Listen: 3 TTS sessions/day; verse anytime
- Prayer journal (recent archive visible)
- Share verse cards, referrals — always free (growth loop)

## Pro adds

- Unlimited Talk It Through
- Unlimited AI (no daily cap)
- Unlimited listen chains ("Hear this guidance": Scripture → guidance → prayer)
- Full journal archive + PDF export
- Custom AI journey from Talk It Through situation
- 7-day Guided Pathways
- Spiritual Weather email, Prayer Portrait, unlimited sermon mode
- Streak grace day

## Mission Partner adds

- Unlimited listen (no Pro soft cap)
- Badge on prayer wall
- Profile + impact messaging in app
- Positions user as ministry supporter

## Free trial rotation (8-week cycle)

Rotating 2-week trials: unlimited Talk It Through → unlimited listen → full journeys → standard limits. Override via `FREE_TRIAL_FEATURE` + `FREE_TRIAL_ENDS_AT` env vars.

Users should feel they are supporting a ministry they believe in — not renting access to God.

---

# Unit Economics (Technical Truth)

**Primary cost drivers:**

| Surface | Model / service | Notes |
|---------|-----------------|-------|
| Talk It Through | `gpt-4o-mini` (streaming) | 2–4 API calls per full session (phase1, response, verse+prayer, walk-today) |
| TTS / Listen | OpenAI TTS | Cached; chain = scripture + guidance + prayer |
| Devotional AI | `gpt-4o-mini` | Lower volume than TTT |
| Sermon Mode | Whisper + `gpt-4o-mini` | Pro-heavy |
| Verse art | Image generation API | Cached per date |
| Infrastructure | AWS Lightsail | Single server today; PostgreSQL |

**Rule of thumb:** Talk It Through + listen-heavy Pro users dominate marginal cost. Daily devotional-only users are cheap. Mission Partner unlimited listen requires monitoring but aligns with supporter positioning.

**Infrastructure (current):**
- **Production:** https://www.shepherdspathai.com
- **Server:** AWS Lightsail `52.42.155.185`
- **Deploy:** `bash scripts/deploy.sh` (Mac → GitHub → SSH build on server)
- **Mobile:** Expo WebView shell loads live site; pull-to-refresh ships web updates without store release

---

# Technical Architecture

*For engineers, Cursor, and technical partners.*

## Repository

**Monorepo:** `Daily-Devotional-AI` (pnpm workspaces, Node 24, TypeScript 5.9)

```
artifacts/
  shepherds-path/       # React + Vite frontend (production web app)
  api-server/           # Express 5 API (port 8080)
  shepherds-path-mobile/  # Expo / React Native (legacy path)
mobile-build/           # Isolated EAS build source (preferred for store builds)
lib/
  db/                   # Drizzle ORM + PostgreSQL schema
  api-spec/             # OpenAPI spec
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind v3, wouter, Framer Motion, TanStack Query |
| API | Express 5, Zod validation |
| Database | PostgreSQL + Drizzle ORM |
| AI | OpenAI (`gpt-4o-mini` primary; TTS; Whisper for sermon) |
| Email | Resend |
| Payments | Stripe (web), RevenueCat (iOS/Android) |
| Mobile | Expo SDK, React Native WebView → production URL |
| Hosting | AWS Lightsail (app + API + DB) |

## Mobile strategy (important)

The iOS/Android app is a **native shell around the live web app**, not a separate codebase for core UX.

- **Bundle ID:** `com.shepherdspath.app`
- **Current version:** 2.1.8 (iOS build 177, Android versionCode 126) — verify in `mobile-build/app.json`
- **EAS builds:** `bash mobile-build/build-mac.sh` (iOS), `bash mobile-build/build-android.sh` (Android)
- **Benefit:** Most product iteration ships via web deploy; users pull-to-refresh
- **Store releases needed for:** native permissions, IAP/RevenueCat, WebView behavior, App Store policy

## Key API surfaces

| Endpoint family | Purpose |
|-----------------|---------|
| `POST /api/guidance/phase1` | Empathy + one question |
| `POST /api/guidance/response` | Streamed guidance (What I'm hearing) |
| `POST /api/guidance/verse-and-prayer` | Scripture + prayer JSON |
| `POST /api/guidance/walk-today` | One practical step |
| `POST /api/guidance/save-memory` | Silent session memory |
| `GET /api/guidance/weekly-allowance` | Free tier conversation limits |
| `POST /api/tts` | Text-to-speech with limits |
| `GET /api/listen/allowance` | Listen session limits |
| `POST /api/devotional/*` | Daily Word generation |
| `POST /api/stripe/*` | Web checkout + Pro status |
| `POST /api/sermon/*` | Sermon mode (mobile) |

## Data model (high level)

- `verses` — daily verse content
- `journal_entries` — prayers, reflections, guidance memory
- `subscribers` — email list + onboarding drip state
- `pro_subscribers` — Stripe subscriptions (+ `tier` column: pro | mission_partner)
- `sermon_sessions` — sermon mode history
- Session identity via `sessionId` (localStorage / native bridge) — not full auth stack today

## Safety & compliance

- Safety page: `/safety` — boundaries, not crisis replacement
- Crisis resources in Talk It Through entry components
- AI daily limits + weekly Talk It Through caps — sacred restraint, cost control
- iOS privacy manifest in `app.json`
- **Not a substitute for:** pastoral care, counseling, crisis intervention, or church community

## Developer rules (common bugs)

1. **iOS dark mode:** WKWebView may not apply Tailwind `dark:` — use inline `rgba()` for card backgrounds on critical surfaces
2. **No page-level back arrows** — conflicts with floating toolbar
3. **Deploy only via** `scripts/deploy.sh` — never run `deploy-lightsail.sh` locally
4. **Verify live:** `curl -s https://www.shepherdspathai.com/native-manifest.json` → `builtAt`

---

# Growth Strategy

## Phase 1 — Build trust (now)

Focus:

- Product quality (especially Talk It Through)
- Onboarding refinement
- Retention
- Testimonials (written + video)
- Social presence (emotional resonance, not virality)
- App Store stability
- First paying supporters

## Phase 2 — Pastor & counselor referrals

Become the recommended companion for:

- Pastors
- Counselors
- Small group leaders
- Chaplains

**Tactics:** downloadable referral one-pager, demo mode, bulk ministry pricing (future), testimony library.

## Phase 3 — Organic word of mouth

The ideal growth loop:

1. Someone is hurting
2. A friend says: "Try Shepherd's Path"
3. The experience exceeds expectations
4. The user shares it with someone else

**Always-free sharing:** verse image cards, `/v/:date` links, referral program.

---

# Social Media Strategy

Social content should focus on emotional moments.

Topics: anxiety, grief, loneliness, hope, God's presence, trusting God, prayer.

Goal: resonance → trust → connection → sharing.

**Not:** entertainment, empty virality, controversy bait.

**Cadence reference:** [VIDEO_VOLUME_PROJECTIONS.md](./VIDEO_VOLUME_PROJECTIONS.md) — Tier A sustainable = ~6 Shorts + 1 long-form/week.

---

# Three-Year Vision

*Targets are directional — update quarterly after reviewing real metrics.*

## Year 1 (2026) — Prove the companion

| Area | Target |
|------|--------|
| **Users** | 10K–25K MAU |
| **Talk It Through** | 40%+ of engaged users try TTT; 25%+ return within 7 days |
| **Revenue** | $3K–8K MRR (mix of Pro + Mission Partner) |
| **Product** | Talk It Through v2 polish; retention loops; 50+ testimonials |
| **Distribution** | iOS + Android stable; YouTube/Shorts cadence; first pastor partnerships |
| **Team** | Founder + AI tooling; 0–1 part-time contractor |

## Year 2 (2027) — Become recommendable

| Area | Target |
|------|--------|
| **Users** | 75K–150K MAU |
| **Revenue** | $25K–50K MRR |
| **Product** | Longitudinal memory; trusted referral network; chaplain/pastor kit |
| **Moat** | Brand = "safe at 2 AM"; documented outcomes/testimonies |
| **Team** | 1–3 FTE (product, care/community, part-time theological review) |

## Year 3 (2028) — Category leader in spiritual companionship

| Area | Target |
|------|--------|
| **Users** | 300K–500K MAU |
| **Revenue** | $100K+ MRR; path to profitability |
| **Product** | Companion knows your season; church-adjacent partnerships; optional human escalation paths |
| **Position** | Most trusted faith companion — not replacing church, bridging gap to God's presence |
| **Team** | Small mission-aligned team; advisory board (theology + pastoral care + ops) |

---

# The Next 12 Months — Immediate Priorities

1. **Refine Talk It Through** — tone, pacing, completion moment, voice input reliability
2. **Improve onboarding** — threshold arrival, name personalization, first prayer handoff
3. **Increase retention** — D7/D30; email drips; Spiritual Weather
4. **Collect testimonials** — in-app prompt + video asks
5. **Grow social presence** — sustainable Shorts cadence
6. **App Store version** — keep native shell current; minimize store friction
7. **Reach first paying supporters** — Mission Partner positioning for ministry-minded users
8. **Instrument metrics** — fill traction table monthly
9. **Stripe / IAP alignment** — Pro + Mission Partner products live everywhere

---

# Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI feels robotic or generic | Heavy prompt investment; sacred pauses; human tone QA; two-phase flow |
| Theological drift | Conviction Charter; review gate; Scripture-first architecture |
| Cost overrun from TTT/listen | Tier limits; caching; model choice; Mission Partner pricing |
| User treats app as therapist | Safety page; crisis resources; pastoral referral copy after deep sessions |
| Apple/Google policy | Clear disclaimers; privacy manifest; no medical claims |
| Founder bottleneck | Document everything (this file); AI-assisted dev; defer non-mission features |
| Low conversion | Free tier genuinely valuable; Pro deepens relationship; testimonials |

---

# What We Will Not Build

(from Mission Fit Backlog — `avoid` list)

- Public streak leaderboards
- Spiritual rank/badge systems
- Competitive faith challenges
- Reaction-count prayer feeds
- Fear/FOMO push copy
- Paywall on core Scripture or daily prayer
- AI framed as authority over Scripture

---

# Long-Term Vision

Become the most trusted spiritual companion in the world.

**Not replacing** churches. Pastors. Community.

**Helping people bridge** the gap between difficult moments and God's presence.

---

# Final Guiding Principle

Every decision should answer:

> **"Will this help someone walk with God, one moment at a time?"**

If yes, build it.

If no, don't.

---

# Document Maintenance

| Action | Frequency |
|--------|-----------|
| Update traction metrics table | Monthly |
| Review 12-month priorities | Quarterly |
| Bump version (1.1, 1.2…) | When strategy or pricing materially changes |
| Sync pricing with `artifacts/shepherds-path/src/lib/pricing.ts` | On any price change |
| Sync technical section with `CLAUDE.md` / `replit.md` | On architecture change |

**Editors:** Brian Cartee (owner). Future: COO, lead engineer, theological advisor.

**AI agents:** When asked to build features, read this document + Product Conviction Charter first. Do not contradict tier limits or positioning without explicit approval.

---

*Shepherd's Path — walk with God, one moment at a time.*
