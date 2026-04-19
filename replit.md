# Shepherd's Path — AI-Guided Scripture & Spiritual Growth App

## Overview

Shepherd's Path is a faith-centered mobile and web application designed to be a Bible companion, offering daily devotionals, guided scripture paths, full Bible reading, and a prayer journal. It targets users aged 20–40, aiming for a calm, sacred, and premium aesthetic. The project's vision is to provide a digital space for spiritual growth, leveraging AI to personalize the user's journey. Key capabilities include a 4-step daily devotional loop, curated Bible journeys, a full KJV Bible reader with AI assistance, and a personal prayer journal.

## Voice & Tone

**Voice system lives at `docs/voice-system.md` — read it before writing any copy or AI prompt.**

The short version: quiet, steady presence. Not eager, not distant. Stays. Listens. Makes space. Never instructional, never pressuring, never prophetic. The guardrail test: "Does this feel like it's trying to help me… or like it's trying to be right?" If it's trying to be right — rewrite it.

## User Preferences

- The AI should foster a sense of spiritual companionship, adapting its tone based on the user's emotional state (compassionate when heavy, celebratory when joyful).
- AI reflections and chat responses should occasionally conclude with a warm, probing question to encourage deeper reflection.
- The AI should personalize responses by subtly incorporating context from the user's journal entries without direct quotation.
- The AI's interaction style should evolve with the user's journey, starting with a welcoming and gentle tone, progressing to a more familiar and spiritually intimate companion over time.
- In cases of crisis (e.g., suicidal ideation), the system should bypass AI and provide immediate, warmth-first crisis resources.

## System Architecture

The application is built with a React + Vite + TypeScript frontend utilizing TailwindCSS, ShadCN UI, Framer Motion, and Wouter for routing. The backend is an Express server in Node.js/TypeScript, connected to a PostgreSQL database via Drizzle ORM. OpenAI's GPT-4o-mini, accessed via Replit AI Integrations, powers AI functionalities. Data for daily verses is synced from Google Sheets, and email services are handled by Resend. The King James Version (KJV) Bible text is sourced from bible-api.com.

**Core Features:**
- **Daily Devotional:** A 4-step flow including "Today's Word," AI Reflection, AI Prayer, and a personalized gratitude prayer.
- **Bible Journey:** Curated reading plans (e.g., "First Steps," Psalms, Lent) with AI Reflection and Commentary.
- **Read the Bible:** Chapter-by-chapter KJV reading with AI assistance for proper noun lookup.
- **Prayer Journal:** Allows users to save prayers, reflections, and scriptures, organized into three tabs.
- **Faith Rhythm Setup:** A personalization flow that suggests a daily verse, prayer prompt, and Bible journey based on user input.
- **Salvation Page:** A guided walkthrough of the Gospel.
- **Reading Plans Page:** Programmatically generated reading schedules for "Bible in a Year" and "New Testament in 90 Days."
- **Prayer Wall Page:** A community feature for submitting and praying for requests.
- **Promotional Page:** A page for PRO membership and merchandise bundles.

**UI/UX Design:**
- **Fonts:** Plus Jakarta Sans for UI/headings, Instrument Serif italic for verse quotes, and Literata for Bible reading.
- **Colors:** Warm parchment background, deep indigo primary, amber-gold accent, and a distinct brand purple (`#442f74`) for the app UI, with a brighter purple (`#7A018D`) for the app icon.
- **Visuals:** Deep dark gradient hero overlays for a sacred feel, and subtle SVG grain texture for warmth.
- **Target Aesthetic:** Calm, sacred, premium, inspired by applications like Hallow and Glorify.

## STANDING DESIGN RULE — Mobile Width Utilization

**Every pixel of screen width is precious. Never waste it.**

This is a mobile-first app. A phone screen is ~390px wide. Any unnecessary horizontal reduction has a compounding negative impact on readability, hierarchy, and feel.

**Mandatory rules for every UI decision:**
1. **Full-bleed sections:** Hero images, cards, banners, and section containers must reach edge-to-edge (`w-full`, no `max-w-*` wrapping unless explicitly justified).
2. **Padding discipline:** Use `px-4` (16px per side) as the standard content padding. Never stack padding — if a parent already has `px-4`, children must not add their own horizontal padding.
3. **No gratuitous `max-w-*` constraints inside page bodies** — `max-w-lg`, `max-w-md`, etc. artificially shrink content on a screen that is already small. Only use them for centered layouts on wide-screen views (tablet/desktop).
4. **Cards and tiles must be full-width** within their padded container. Avoid two-column layouts for primary content — side-by-side cards cut available width in half.
5. **Before reducing width for any reason, ask:** "Does this serve the user or just look tidy on a desktop preview?" If it serves the desktop preview at the cost of the mobile experience, don't do it.
6. **Text must use the full line width** — narrow text columns (e.g., `max-w-xs` centered text) should only be used for short labels, never for body copy or scripture passages.

**Violation signs to watch for and fix:**
- Content that looks fine in the browser but cramped on an actual phone screenshot
- Nested containers each adding their own `px-*` values
- Cards with internal padding + parent padding both active simultaneously
- `mx-auto max-w-sm` wrappers inside an already-padded scroll container

**AI Personalization:**
- **Spiritual Memory:** AI endpoints incorporate the user's last 6 journal entries as context for personalized responses.
- **Relationship Depth:** AI responses adapt based on `daysWithApp`, progressing from a welcoming tone to that of a deep spiritual companion.
- **Probing Questions:** AI is designed to close some reflections and chat responses with a warm question to encourage deeper engagement.
- **Crisis Detection:** Interactive AI chat endpoints include a crisis detection mechanism that redirects to fixed crisis resources if sensitive phrases are identified.
- **Emotional Tone Adaptation:** AI system prompts instruct the AI to adapt its emotional tone based on the user's input.

**Database Schema Highlights:**
- `verses`: Stores daily verses and associated prompts.
- `subscribers`: Manages email subscription details.
- `journal_entries`: Stores user's prayers, reflections, and saved scriptures.
- `streaks`: Tracks user's daily visit streaks.
- `pro_subscribers`: Manages Pro subscription details.

## External Dependencies

- **AI:** OpenAI GPT-4o-mini (via Replit AI Integrations)
- **Bible Text:** bible-api.com (for KJV, proxied via `/api/bible`)
- **Email:** Resend (for daily email subscriptions and welcome emails)
- **Database:** PostgreSQL (accessed via Drizzle ORM)
- **Data Source:** Google Sheets (for live verse syncing)
- **Payments:** Stripe (for Pro subscription management, including checkout sessions and webhooks)