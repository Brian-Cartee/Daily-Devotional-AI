[README.md](https://github.com/user-attachments/files/34811189/README.md)
# Shepherd's Path

**An AI-guided daily devotional and Bible companion for web, mobile and SMS.**

Shepherd's Path was a faith app that paired daily scripture with AI-written reflections, prayers and conversation. I designed, built and launched it on my own in 2026, teaching myself full-stack development from scratch along the way, with no prior coding background. The live service was retired in fall 2026 when monthly infrastructure costs outgrew subscription revenue. The code stays here as a record of the build.

## What it did

- **Daily devotional:** A four-step daily flow: today's verse, an AI reflection, an AI prayer and a personal gratitude prayer.
- **AI companion chat:** Follow-up conversation anchored to the day's verse or to any passage being read. Responses stream token by token.
- **Bible reader and study:** Chapter-by-chapter reading (KJV, WEB, ASV) with an AI companion, plus topic-based study tracks.
- **Guided journeys and reading plans:** Curated paths such as Psalms and Lent, plus generated "Bible in a Year" and "New Testament in 90 Days" schedules.
- **Prayer journal and prayer wall:** Private journaling and a community space for prayer requests.
- **SMS channel:** Users could text the service and get scripture, a reflection and a prayer back. It included a daily morning devotional by text and STOP/START opt-out handling.
- **Voice:** Text-to-speech for reflections, with a choice of voices.
- **Subscriptions:** A free tier with daily AI limits, Pro monthly and annual plans, and one-time support tips.

## How the AI was designed

- **Guardrails over cleverness:** The companion was instructed to speak plainly and warmly. It avoids clichés, lists and "you should" language, and it does not invent or misquote scripture.
- **Crisis detection first:** Every message is screened before it reaches the model. When crisis language appears, the AI is bypassed entirely and a fixed, compassionate response with 988 Lifeline and emergency resources is returned. This applies in the app and over SMS, and it cannot be disabled.
- **Personal context, used carefully:** Responses draw on a user's recent journal entries for context without quoting them back.
- **Relationship that grows over time:** The companion's tone moves from welcoming to familiar based on how long someone has used the app.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Node.js, Express (TypeScript) |
| Database | PostgreSQL with Drizzle ORM |
| AI | OpenAI (GPT-4o-mini) with streaming responses; OpenAI text-to-speech |
| Payments | Stripe (subscriptions, tips, refunds, webhooks) |
| Messaging | Twilio (SMS and voice), Resend (email), Web Push notifications |
| Content | bible-api.com for public-domain Bible text; Google Sheets for daily verse management |
| Hosting | AWS Lightsail, with a mobile build for the App Store |

## Status

Retired in fall 2026. This repository is not maintained and is shared for reference only. All credentials used by the live service have been revoked.

## About the builder

Built by Brian Cartee, a mortgage capital markets and operations executive who taught himself to build software with AI-assisted development tools. The project covers the full product lifecycle: idea, design, database, APIs, payments, AI behavior, launch and the business decision to shut it down.
