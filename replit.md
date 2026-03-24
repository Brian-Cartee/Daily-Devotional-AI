# Shepherd's Path — AI-Guided Scripture & Spiritual Growth App

Tagline: **Walk the path. Follow the Word.**

## Overview

A faith-centered Bible companion with daily devotionals, guided scripture paths, full Bible reading, and a prayer journal. Designed for the 20–40 age range with a calm, sacred, premium aesthetic.

## Four Core Experiences

1. **Daily Devotional** (`/devotional`) — 4-step spiritual loop: Today's Word → AI Reflection → AI Prayer → Thank Him (personalized gratitude closing prayer). Email capture at bottom. Streak tracking.
2. **Bible Journey** (`/understand`) — 4 curated reading tracks (Psalms, Proverbs, Gospel, Wisdom) with daily-rotated passage + full 18-passage canonical guided path with AI tools
3. **Read the Bible** (`/read`) — Full Bible chapter-by-chapter reading (KJV via bible-api.com) with AI assistance
4. **Prayer Journal** (`/journal`) — Save prayers, reflections, and scriptures; organized in 3 tabs

## Architecture

- **Frontend**: React + Vite + TypeScript, TailwindCSS, ShadCN UI, Framer Motion, Wouter routing
- **Backend**: Express (Node.js/TypeScript)
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: OpenAI GPT-4o-mini via Replit AI Integrations (no user API key required)
- **Data source**: Google Sheets (live sync at startup via googleapis)
- **Email**: Resend (daily email subscription system with welcome email + 7AM UTC scheduler; optional Daily Beauty image for opted-in subscribers)
- **Bible text**: bible-api.com (KJV, proxied via `/api/bible`)

## Page Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingHome | Home screen with 3-card section links |
| `/devotional` | Devotional | 4-step daily flow: Word → Reflection → Prayer → Thank Him + email capture |
| `/understand` | UnderstandBible | 4 Bible tracks + 18 canonical guided passages with AI tools |
| `/read` | ReadBible | Full Bible reading (Literata font, parsed verse numbers) |
| `/journal` | Journal | Prayer journal — My Prayers, My Reflections, Saved Scriptures |

## Key Components

- `NavBar.tsx` — Fixed top nav (Devotional, Journey, Read, Journal)
- `EmailSubscribe.tsx` — Floating subscription button (global in App.tsx)
- `BibleStudyChat.tsx` — Interactive AI chat for devotional verse
- `AILoadingState.tsx`, `AIResponseCard.tsx` — AI response UI

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/verses/daily` | Today's verse (DB cache, synced from Sheet) |
| POST | `/api/ai/generate` | AI reflection or prayer for today's verse |
| POST | `/api/ai/chat` | Follow-up chat for daily verse |
| GET | `/api/bible?ref=...` | Bible chapter text proxy (bible-api.com KJV) |
| POST | `/api/stripe/create-checkout-session` | Create Stripe checkout session (body: `{plan: "monthly"|"annual"}`) |
| GET | `/api/stripe/session-email` | Get customer email from checkout session (query: `session_id`) |
| POST | `/api/stripe/check-pro` | Check if an email has active Pro subscription |
| POST | `/api/stripe/webhook` | Stripe webhook handler (events: checkout.session.completed, subscription updated/deleted) |

## Stripe / Pro Subscription

- **Products**: "Shepherd's Path Pro" in Stripe test mode — $5.99/month and $44.99/year
- **Secrets**: `STRIPE_SECRET_KEY` (stored), `VITE_STRIPE_PUBLISHABLE_KEY` (stored)
- **Webhook secret**: `STRIPE_WEBHOOK_SECRET` — set this after deploying to your public URL
- **Webhook URL** (set in Stripe dashboard after deploy): `https://yourdomain/api/stripe/webhook`
- **Pro subscriber table**: `pro_subscribers` in PostgreSQL (email, stripe_customer_id, stripe_subscription_id, plan, status)
- **Frontend Pro check**: `client/src/lib/proStatus.ts` — `isProVerifiedLocally()`, `checkProWithServer()`, `markProVerified()`
- **AI limit bypass**: Pro users skip the 10/day AI usage limit (checked in `aiUsage.ts`)
- **Success page**: `/pro-success` — auto-retrieves customer email from Stripe session, marks Pro in localStorage
- **"Already subscribed?" flow**: UpgradeModal has email input that calls `/api/stripe/check-pro` to activate Pro locally

## Email Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/passage` | AI chat for arbitrary Bible passage |
| POST | `/api/subscribe` | Subscribe to daily email |
| GET | `/api/unsubscribe?email=...` | Unsubscribe from daily email |
| POST | `/api/admin/send-daily-email` | Manually trigger daily email send |
| GET | `/api/journal?sessionId=...` | Get journal entries for session |
| POST | `/api/journal` | Create journal entry |
| DELETE | `/api/journal/:id` | Delete journal entry |
| POST | `/api/streak` | Record daily visit, return current/longest streak |

## Database Schema

- `verses` — id, reference, text, encouragement, reflection_prompt, date (unique)
- `subscribers` — id, email (unique), name, subscribed_at, active
- `journal_entries` — id, session_id, type (prayer/reflection/verse), content, reference, verse_date, created_at
- `streaks` — id, session_id (unique), current_streak, longest_streak, last_visit_date

## Journal Session Model

Journal entries are tied to a browser-generated UUID stored in localStorage (`sp_session_id`). No login required — entries persist per browser. Future: migrate to user accounts when auth is added.

## Google Sheet Column Layout

Spreadsheet ID: `1Zhg_rL3i-eIyBNWOpB8Vld0awv6e-l9UoG6lvY3r4jI`

| Column | Content |
|--------|---------|
| A | Date (YYYY-MM-DD or M/D/YYYY) |
| B | Verse text |
| C | Reference (e.g. John 3:16) |
| D | Translation |
| E | Summary |
| F | Takeaway/Encouragement |
| G | Reflection Prompt |

## Visual Design System

- **Fonts**: Plus Jakarta Sans (UI/headings), Instrument Serif italic (verse quotes), Literata (Bible reading)
- **Colors**: Warm parchment background (`38 28% 96%`), deep indigo primary (`249 58% 40%`), amber-gold accent
- **Hero overlays**: Deep dark gradient (52%→28%→72%) for sacred, cinematic feel
- **Body texture**: Subtle SVG grain at 3% opacity for warmth
- **Target feel**: Calm, sacred, premium — inspired by Hallow and Glorify

## Planned Premium Model (NOT YET IMPLEMENTED)

**Free Tier:**
- Daily verse
- Daily devotional (Word + Reflection + Prayer)
- Limited AI questions per day

**Premium Tier ($5–9/month):**
- Unlimited AI guidance & chat
- Prayer journal (unlimited saves)
- Deeper devotional content
- Bible study tools & guided paths

Comparable pricing: Hallow (~$8.99/mo), Glorify (~$6.99/mo)

Implementation will require: user auth, subscription/payment integration (Stripe), usage tracking, and feature gating middleware.

## AI Personalization System (Built)

### Spiritual Memory
All AI endpoints fetch the user's last 6 journal entries (prayers, reflections, notes) and inject them as context into the system prompt. The AI uses these to make connections and personalize responses naturally — without quoting entries directly unless it flows.

### Relationship Depth (Day 1 → Day 30+)
`client/src/lib/relationship.ts` tracks `sp_first_use` in localStorage and calculates days since first use. This `daysWithApp` value is passed to every AI call. The server's `buildRelationshipNote()` function assigns one of four relationship stages:
- **Day 1–3**: Welcoming, gentle, introductory — you are just beginning to know each other
- **Day 4–14**: Building rapport — begin noticing patterns, offer more depth
- **Day 15–30**: Established friendship — speak with genuine familiarity, reference growth
- **Day 30+**: Deep spiritual companion — intimate, honors how far they've come

### Probing Questions
AI is instructed to close ~1 in 4 reflections and ~1 in 3 chat responses with a single warm question that invites the person to go deeper. Never clinical or formulaic — always like a caring friend wanting to understand.

### Crisis Detection
All interactive AI chat endpoints run `detectCrisis()` before calling OpenAI. If crisis phrases are detected (suicidal ideation, self-harm), the endpoint immediately returns a fixed, warmth-first crisis response with 988 Lifeline, Crisis Text Line, and findahelpline.com. Never routes crisis through AI.

### Emotional Tone Adaptation
AI system prompts instruct reading emotional tone and responding accordingly — if a person seems heavy, lead with compassion before scripture; if joyful, celebrate with them.

### Files
- `client/src/lib/relationship.ts` — relationship age tracker
- `server/routes.ts` — `detectCrisis()`, `getJournalContext()`, `buildRelationshipNote()`

## Future Features (Not Yet Built)

### "Pray for Me" — Community Prayer Wall
Users submit anonymous prayer requests. Others tap 🙏 "I prayed for you." This turns the app into a community, not just a tool — and is a genuine virality driver.
Implementation will require: prayer_requests table (anonymous or session-based), prayer_reactions table, a public feed UI, moderation/reporting.

### User Accounts + Premium Tier
Auth (Replit Auth or email/password), Stripe subscriptions, feature gating for unlimited AI.
Pricing target: $5–9/mo (comparable to Hallow $8.99, Glorify $6.99).

## Guided Bible Path

18 curated passages in `client/src/data/guidedPath.ts`:
- The Beginning (Genesis 1–3), The Covenant (Genesis 12), Rescue (Exodus 14)
- Worship & Wisdom (Psalm 23, Proverbs 3), The Promise (Isaiah 53)
- Jesus (John 1, 3, Matthew 5, Luke 15, John 11, 19–20)
- The Church (Acts 2), The Letters (Romans 8, 1 Cor 13, Ephesians 2)
- The End (Revelation 21)

## Running

```
npm run dev       # Start dev server (port 5000)
npm run db:push   # Sync schema to PostgreSQL
```

## iOS App Store Submission — Status (as of March 24, 2026)

**Apple credentials:**
- Team ID: D5X4W5F62Y
- Bundle ID: `com.shepherdspath.app`
- Deployed URL: `daily-devotional-ai.replit.app`
- Privacy policy: `daily-devotional-ai.replit.app/privacy`
- Terms: `daily-devotional-ai.replit.app/terms`

**App Store Connect listing:** Fully filled out — metadata, screenshots, in-app purchases (Annual Pro: `annual_pro`), contact (Brian Cartee / 4049889512 / briancartee@gmail.com).

**App Review Information:** Uncheck "Sign-in required" (app has no login). Add note: "No account or sign-in is required. All features are accessible immediately. The app does not target mainland China."

**BLOCKED ON: Build upload.** The Build section in App Store Connect is empty. Apple needs a compiled iOS binary (.ipa).

**How to unblock (tomorrow's task):**
The Android APK was built using Android Studio (Panda 2 version visible on Mac desktop) — almost certainly via Capacitor.
1. Find the local Capacitor project folder on the Mac (same one used for Android build)
2. Run: `npx cap add ios` (if ios folder doesn't exist yet)
3. Run: `npx cap open ios` (opens Xcode)
4. In Xcode: Product → Archive → Distribute App → App Store Connect → Upload
5. Wait 10–30 min for Apple to process, then the build appears in App Store Connect
6. Attach build to submission → Add for Review → Submit

**Google Play:** Already in internal testing. 14-day clock started ~March 23. Production unlock ~April 6.
