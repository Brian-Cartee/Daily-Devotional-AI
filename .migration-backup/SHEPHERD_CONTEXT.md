# Shepherd's Path — App Context Document
*For use with OpenAI, Claude, or any AI assistant. Drop this file into any chat session to give the AI full context about the app before making suggestions or configuration changes.*

---

## 1. What This App Is

**Shepherd's Path** is a Christian faith app for iOS and Android (React/Express web app, published via Capacitor).

**Core mission:** Guide people toward a personal relationship with Jesus — not just information about Jesus.

**Live on:** Apple App Store (v1.1 active). Google Play re-application ~April 23, 2026.

**URL:** shepherdspathai.com

**Tone of voice (critical):**
- Pastoral and warm, not academic or clinical
- Plain language — like a trusted pastor talking to a friend over coffee
- No "AI" language anywhere in the UI — never say "AI" to users
- No "Scholar" in user-visible text
- Capitalize divine pronouns (He, Him, His) only when unmistakably referring to God, Jesus, or the Holy Spirit
- Never preachy, never guilt-driven — invitational always

---

## 2. The Full Devotional Session Flow

This is the core experience. Everything else supports it.

```
TODAY'S VERSE
│  Cinematic hero card — photo background, verse text, reference
│  Actions: Listen (TTS), Save Image, Share, AI Art, Context, Remember this verse
│
REFLECTION  (Step 1)
│  AI-generated · streams in · anchored to where the user is today
│  User can reply → saves to journal
│  "Did someone come to mind?" → send-to-friend prompt
│
PRAYER  (Step 2)
│  Generated AFTER reflection finishes · receives reflection as context
│  Emerges from the same emotional space as the reflection
│
THANK HIM  (Step 3)
│  User types gratitude · AI generates closing prayer from that input
│
[Post-prayer share nudge — "Did someone come to mind?"]
│
UNDERSTAND THIS  (Step 4)
│  Deep study chat · horizontal preset chips
│  Pre-loaded with verse reference + prayer content for context
│  Warm contextual opener · "Searching the Scriptures…" loading
│  "Deepen today's prayer" preset appears when prayer exists
│  ResourceSuggestionCard surfaces short clips reactively after ≥2 user messages
│
CONTEXT  (accessible from verse card)
│  Tapping "Context" on the verse card opens a bottom sheet
│  3 plain-language sections: Who wrote this / When · What was happening · Why it matters
│  Ends with a bridge sentence connecting background back to reading the verse
│  Opener: "Looking a little deeper at today's verse…"
│  Cached per verse · graceful failure message if unavailable
│
DAILY SERMON  (Step 5)
│  One curated full-length sermon per day, personalized to today's verse + reflection
│  Finds videos from trusted voices (Keller, Giglio, Chan, Platt, Chandler, etc.)
│  Thumbnail first → tap to open in-app YouTube player
│  "I've finished watching" → journal prompt → closing prayer (parameterized, instant)
│
JOURNAL PROMPT + SAVE BAR
│  Save verse / reflection / prayer to journal
│
[ShareInviteCard — "Invite a friend" at the very bottom]
```

**Session continuity rule:** Reflection → Prayer → "Understand This" → Sermon all flow as one connected experience. Nothing feels like a reset.

---

## 3. All Features & Pages

### Core Pages
| Route | Page | Description |
|---|---|---|
| `/` | LandingHome | Tab split: Today (daily verse + session entry) / Explore |
| `/devotional` | Devotional | The full daily devotional session (see Section 2) |
| `/guidance` | GuidancePage | AI conversation — user shares what they're going through, receives tailored scripture + prayer |
| `/read` | ReadBible | Full Bible reader (KJV/WEB/ASV) with chapter navigation, font size control, bookmarks, proper-noun lookup popovers, AI pastoral insight sidebar |
| `/understand` | UnderstandBible | Bible journey builder — "Build my journey" → personalized study plan |
| `/journal` | Journal | Journal entries · flashback feature · spiritual letter · memory verses |
| `/prayer-wall` | PrayerWallPage | Community prayer wall |
| `/reading-plans` | ReadingPlansPage | Curated multi-day Bible reading plans |
| `/pricing` | PricingPage | Pro upgrade page |
| `/salvation` | SalvationPage | Gospel presentation page |
| `/greatest-gift` | GreatestGiftPage | Outreach page |
| `/store` | StorePage | Merch / resources |
| `/stories` | StoriesPage | Testimonials / stories |
| `/support` | SupportPage | User support |

### Admin Pages (password protected)
| Route | Description |
|---|---|
| `/shepherd-admin` | Overview — users, streaks, analytics |
| `/shepherd-admin/sermons` | Curated sermon management |

---

## 4. AI Integration Points

### Where OpenAI is called (all use `gpt-4o-mini` unless noted)

| Feature | Endpoint | What it generates | Cached? |
|---|---|---|---|
| Daily Reflection | `POST /api/devotional/reflect` | Streamed devotional reflection on today's verse | sessionStorage by date |
| Prayer | `POST /api/devotional/pray` | Prayer built on reflection context | sessionStorage by date |
| Gratitude Prayer | Inside devotional | Prayer from user's gratitude input | No (real-time) |
| Understand This chat | `POST /api/guidance/response` | Conversational Bible study responses | No |
| Guidance conversation | `POST /api/guidance/response` | AI pastoral guidance responses | No |
| Context | `GET /api/context` | 3-section biblical context (author/era/setting/significance) | In-memory per reference |
| Daily Sermon | `POST /api/sermon/daily` | Theme + search query → YouTube video search | In-memory per verse per day |
| Resource Suggestion | `POST /api/resources/suggest` | Short teaching video suggestions from conversation | No |
| Verse Art | `GET /api/verse-art/:date` | AI-generated image for verse background | On-disk cache |
| Bible lookup | `POST /api/bible/lookup` | Proper noun info (people, places, terms) | No |
| Journal Spiritual Letter | `POST /api/journal/spiritual-letter` | Personal letter from journal entries | No |
| For Two | `POST /api/devotional/for-two` | Couples/friends shared devotional reflection | No |
| Verse + Prayer (Guidance) | `POST /api/guidance/verse-and-prayer` | Contextual scripture + prayer from user's situation | No |
| TTS Audio | `GET /api/tts` | Text-to-speech narration | Disk cache |

### Key prompt principles (apply to all AI calls):
- Always pastoral, warm, plain language
- Never academic jargon
- Never start responses with "Certainly!", "Of course!", "Absolutely!" or similar filler
- Reflection: acknowledge where the person is before pointing to scripture
- Prayer: not a sermon wrapped in "Amen" — real, conversational, personal
- No "AI" in any user-facing output

---

## 5. Free vs. Pro

**Free tier:**
- 5 AI generations total (AI_FREE_LIMIT = 5)
- Amber banner appears when ≤2 remaining
- All non-AI features unlimited (reading, journaling, prayer wall, etc.)

**Pro tier ($X/month via Stripe + Apple IAP + Google Play Billing):**
- Unlimited AI generations
- Streak protection (one missed day doesn't reset streak)
- Priority access to new features

**Key Pro files:**
- `client/src/lib/aiUsage.ts` — free limit logic
- `client/src/lib/proStatus.ts` — Pro verification (localStorage + Stripe check)
- `client/src/components/UpgradeModal.tsx` — upgrade prompt
- `client/src/pages/PricingPage.tsx` — pricing display

**Next monetization lever to implement:** Gate Context + Daily Sermon behind Pro after 3 free uses.

---

## 6. Sharing & Growth Layer

### Share image (`createShareImage` in `client/src/lib/shareImage.ts`)
- Canvas-rendered 1080×1080 PNG
- Background: AI art (if generated) or curated photo pool
- Contains: brand header (logo + name), verse text, reference, footer
- Footer CTA: *"Start your own daily devotional → · Shepherd's Path · shepherdspathai.com"*
- Users can generate AI-painted verse art (Wand2 button on verse card)

### Share triggers
1. **Top action bar** — Save Image button (downloads/shares the verse image)
2. **Post-reflection** — "Did someone come to mind?" → send verse as text (includes app download link)
3. **Post-prayer** — Warm amber card: "Did someone come to mind?" → Share verse image or send as text
4. **ShareInviteCard** — At the bottom of every devotional session
5. **Social row** — X, Facebook, WhatsApp, Telegram buttons
6. **Referral system** — `/api/referral/my-code`, `/api/referral/record`

### Send-to-friend text format:
> [Name] was thinking of you while reading today's verse.
> "[verse text]" — Reference
> They use an app called Shepherd's Path for daily devotionals — free to download at shepherdspathai.com

---

## 7. Session & Caching Architecture

```
sessionStorage (client, per date key):
├── Reflection content      getCachedReflection() / cacheReflection()
├── Prayer content          getCachedPrayer() / cachePrayer()
└── Sermon                  "sermon_daily_YYYY-MM-DD_${verseId}"

localStorage (client, persistent):
├── Pro status              sp_pro_verified / sp_pro_email
├── User name               sp_user_name
├── Voice preference        sp_user_voice
├── Language                sp_lang
├── Streak nudge dismissed  sp_nudge_dismissed
├── Bookmarks               sp_bookmarks
└── AI usage counter        sp_ai_usage

Server in-memory Maps:
├── dailySermonCache        key: "YYYY-MM-DD:verseId"
├── scriptureContextCache   key: normalized reference (e.g., "1_peter_2_9")
└── ttsCache                key: "voice::text_hash" (also disk-backed)
```

---

## 8. Content & Verse System

- Today's verse is sourced from a **Google Sheet** → synced to the database at midnight
- Sync endpoint: called by a nightly cron inside the app server
- Each verse has: `reference`, `text`, `date`, `id`
- The daily verse drives: reflection, prayer, context, sermon — all keyed to it
- **Do not change the verse system without understanding the Google Sheet sync chain**

### Trusted sermon voices (used in YouTube ranking):
Tim Keller, Louie Giglio, Francis Chan, David Platt, Matt Chandler, Steven Furtick, Tony Evans, Priscilla Shirer, Jackie Hill Perry, Paul Washer, John Piper, R.C. Sproul, J.D. Greear, Craig Groeschel, Andy Stanley, Alistair Begg, Charles Stanley

---

## 9. Key Configuration Points

> These are the most common things that may need changing — reference these first before digging into the code.

| What to change | Where | Notes |
|---|---|---|
| Free AI usage limit | `client/src/lib/aiUsage.ts` → `AI_FREE_LIMIT` | Currently `5` |
| Daily verse source | Google Sheet (linked in `.env` or Replit secrets) | Synced nightly |
| App website URL | `client/src/pages/Devotional.tsx` → `APP_URL` | Currently `https://daily-devotional-ai.replit.app` |
| Devotional reflection tone | `server/routes.ts` → reflection prompt (~line 500s) | Full system prompt |
| Prayer tone | `server/routes.ts` → prayer prompt (~line 700s) | Full system prompt |
| Context tone | `server/routes.ts` → `/api/context` endpoint | System + user prompts |
| Sermon search quality | `server/routes.ts` → `/api/sermon/daily` endpoint | Channel ranking list |
| Push notification VAPID key | `VAPID_PUBLIC_KEY` secret | In Replit secrets |
| Stripe keys | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | In Replit secrets |
| Admin password | `ADMIN_PASSWORD` | In Replit secrets |
| Resend (email) | `RESEND_API_KEY` | In Replit secrets |
| YouTube API | `YOUTUBE_API_KEY` | In Replit secrets |

---

## 10. Things That Must NOT Change Without Thinking Carefully

- **Primary key types in database** — Never change serial ↔ varchar; it breaks existing data
- **The verse Google Sheet sync chain** — Changing format breaks the daily verse
- **`vite.config.ts` and `server/vite.ts`** — Pre-configured; do not touch unless critical
- **`drizzle.config.ts`** — Pre-configured; do not touch
- **`package.json` scripts** — Do not edit; use package manager tools instead
- **Password protection in publishing panel** — Must be OFF before republishing
- **Logo size** — User prefers larger logos; do not reduce them

---

## 11. Known Technical Notes

- 13 pre-existing TypeScript errors in `server/replit_integrations/` — do not fix (third-party generated)
- `npm run dev` starts both Express backend and Vite frontend on the same port
- The app uses `wouter` for routing (not React Router)
- TanStack Query v5 — must use object form: `useQuery({ queryKey: [...] })`
- Dark mode: `darkMode: ["class"]` in Tailwind, toggled via ThemeProvider
- `import.meta.env.VITE_*` for frontend env vars; `process.env.*` for backend

---

## 12. The Next Three Priorities (As of April 2026)

1. **Gate Context + Daily Sermon behind Pro** — 3 free uses, then upgrade prompt. Ties monetization to meaningful moments.
2. **Stronger Pro upgrade screen** — Show what Pro unlocks through experience, not feature lists.
3. **App Store re-submissions** — Apple IAP active April 15. Google Play re-apply ~April 23. Xcode upgrade before April 28.
