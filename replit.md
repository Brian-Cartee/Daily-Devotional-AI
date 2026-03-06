# Daily Bread — Interactive Bible Study & Spiritual Growth App

## Overview

An interactive Bible study and spiritual growth companion organized around three core experiences:
1. **Daily Devotional** — Daily verse from Google Sheets, AI reflection, prayer, share
2. **Understand the Bible** — Curated guided path through 18 key passages with AI study tools
3. **Read the Bible** — Full Bible chapter-by-chapter reading (via bible-api.com) with AI assistance

## Architecture

- **Frontend**: React + Vite + TypeScript, TailwindCSS, ShadCN UI, Framer Motion, Wouter routing
- **Backend**: Express (Node.js/TypeScript)
- **Database**: PostgreSQL (via Drizzle ORM) — caches daily verses and subscribers
- **AI**: OpenAI GPT-4o-mini via Replit AI Integrations (no user API key required)
- **Data source**: Google Sheets (live sync at startup via googleapis)
- **Email**: Resend (daily email subscription system with welcome email + 7AM UTC scheduler)
- **Bible text**: bible-api.com (KJV, proxied via `/api/bible`)

## Page Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | LandingHome | 3-card home screen with section links |
| `/devotional` | Devotional | Daily verse, AI reflection, prayer, share |
| `/understand` | UnderstandBible | 18 guided key passages with AI tools |
| `/read` | ReadBible | Full Bible reading with AI assistance sidebar |

## Key Components

- `NavBar.tsx` — Fixed top nav, shows on all inner pages
- `EmailSubscribe.tsx` — Fixed top-right floating subscription button (in App.tsx globally)
- `BibleStudyChat.tsx` — Interactive AI chat for devotional verse
- `AILoadingState.tsx`, `AIResponseCard.tsx` — AI response UI

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/verses/daily` | Today's verse (DB cache, synced from Sheet) |
| POST | `/api/ai/generate` | AI reflection or prayer for today's verse |
| POST | `/api/ai/chat` | Follow-up chat for daily verse |
| GET | `/api/bible?ref=...` | Bible chapter text proxy (bible-api.com KJV) |
| POST | `/api/chat/passage` | AI chat for arbitrary Bible passage (Understand/Read) |
| POST | `/api/subscribe` | Subscribe to daily email |
| GET | `/api/unsubscribe?email=...` | Unsubscribe from daily email |
| POST | `/api/admin/send-daily-email` | Manually trigger daily email send |

## Database Schema

- `verses` — id, reference, text, encouragement, reflection_prompt, date (unique)
- `subscribers` — id, email (unique), name, subscribed_at, active

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

## Guided Bible Path

18 curated passages defined in `client/src/data/guidedPath.ts`, organized by theme:
- The Beginning (Genesis 1–3)
- The Covenant (Genesis 12)
- Rescue (Exodus 14)
- Worship & Wisdom (Psalm 23, Proverbs 3)
- The Promise (Isaiah 53)
- Jesus (John 1, 3, Matthew 5, Luke 15, John 11, 19–20)
- The Church (Acts 2)
- The Letters (Romans 8, 1 Cor 13, Ephesians 2)
- The End & New Beginning (Revelation 21)

## Future Phase Architecture Hooks

- **User accounts**: Add `users` table, Replit Auth integration
- **Save reflections / Favorites**: Add `saved_reflections`, `favorites` tables with userId FK
- **Streaks/habits**: Add `user_activity` table with streak tracking
- **Topic search**: Add topic tags to verses + search endpoint
- **Progress tracking for Understand path**: Track which chapters explored (needs user accounts)
- **Push notifications**: Add push subscription table + cron job
- **Reading plans**: Curated multi-day plans linking Devotional + Understand + Read

## Running

```
npm run dev       # Start dev server (port 5000)
npm run db:push   # Sync schema to PostgreSQL
```
