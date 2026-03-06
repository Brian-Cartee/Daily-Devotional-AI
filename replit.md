# Bible Reflection & Spiritual Growth App

## Overview

A daily Bible verse reflection tool powered by AI. Each day the app pulls a verse, encouragement, and reflection prompt from a Google Sheet and serves it to users. Users can generate AI devotional reflections, pray, and engage in an interactive Bible study conversation anchored to the daily verse.

## Architecture

- **Frontend**: React + Vite + TypeScript, TailwindCSS, ShadCN UI, Framer Motion
- **Backend**: Express (Node.js/TypeScript)
- **Database**: PostgreSQL (via Drizzle ORM) — caches daily verses locally for fast reads
- **AI**: OpenAI GPT-4o-mini via Replit AI Integrations (no user API key required)
- **Data source**: Google Sheets (live sync via googleapis)

## Key Features

- **Daily verse** pulled automatically from a Google Sheet (date-matched, with fallback to most recent row)
- **Short AI reflection** (2 paragraphs, mobile-friendly)
- **Interactive Bible study chat**: Follow-up questions with full verse context maintained across the conversation
  - 6 preset prompt buttons: Cross-reference scriptures, Historical context, Who wrote this and why, Life application, Generate prayer, Explain simply
  - Custom question text input
- **Generate Prayer** button — produces a standalone prayer card

## Google Sheet Column Layout

The app expects these columns (1-indexed, row 1 = header):
| Column | Content |
|--------|---------|
| A | Date (YYYY-MM-DD or M/D/YYYY) |
| B | Verse text |
| C | Reference (e.g. John 3:16) |
| D | Translation |
| E | Summary |
| F | Takeaway/Encouragement |
| G | Reflection Prompt |

Spreadsheet ID: `1Zhg_rL3i-eIyBNWOpB8Vld0awv6e-l9UoG6lvY3r4jI`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/verses/daily` | Returns today's verse (from DB cache, synced from Sheet) |
| POST | `/api/ai/generate` | Generates a reflection or prayer for today's verse |
| POST | `/api/ai/chat` | Follow-up chat with full verse + conversation context |
| GET | `/api/debug/sheet-rows` | Returns first 5 raw rows from Google Sheet (debug only) |

## Database Schema

- `verses` — id, reference, text, encouragement, reflection_prompt, date (unique)

## Future Phase Architecture Hooks

- **User accounts**: Add `users` table, Replit Auth integration
- **Save reflections**: Add `saved_reflections` table with userId FK
- **Favorites**: Add `favorites` table
- **Streaks/habits**: Add `user_activity` table with streak tracking
- **Topic search**: Add topic tags to verses table + search endpoint
- **Additional AI providers**: AI client is isolated in `server/routes.ts`, swap model string or base URL to change provider
- **Notifications**: Add push subscription table + cron job

## Running

```
npm run dev       # Start dev server (port 5000)
npm run db:push   # Sync schema to PostgreSQL
```
