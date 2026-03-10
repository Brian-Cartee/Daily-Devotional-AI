# Shepherd's Path — Master Reference Document

**As of: March 10, 2026**
*Update the date above each time this document is revised.*

---

## 1. Product Identity

| Field | Value |
|---|---|
| App Name | Shepherd's Path |
| Tagline | "Your daily walk with Jesus." |
| Domain | ShepherdPathAI.com |
| Support Email | support@shepherdspathai.com |
| App Store Name | Shepherd's Path |
| PWA Theme Color | `#3b1f7a` (deep purple) |

---

## 2. Pricing & Plans

### Subscription Tiers

| Plan | Price | AI Uses | Notes |
|---|---|---|---|
| Free | $0 | 10 AI generations per day | Resets at midnight local time |
| Pro Monthly | $5.99 / month | Unlimited | Billed monthly via Stripe |
| Pro Annual | $44.99 / year | Unlimited | ~37% savings vs monthly |

### What "AI Uses" Counts
Each tap of Reflect, Prayer, or a chat message in the Devotional or Study section counts as one AI use. Generating a new reflection and generating a prayer are two separate uses.

### Pro Benefits (vs Free)
- Unlimited AI reflections, prayers, and chat
- No daily usage cap
- Priority voice (same voices, no throttle)
- Streak-based "Thank You" message instead of tip prompt

---

## 3. One-Time Tips (Support the Mission)

Users can optionally leave a tip to support the app. Shown after streak milestones.

| Amount | Label |
|---|---|
| $3 | Small offering |
| $5 | Generous gift |
| $10 | Partner-level support |

- Processed via Stripe one-time checkout
- Tip prompt appears after streak milestones: **7, 14, 30, 60, and 100 days**
- 90-day cooldown between tip prompts (stored in `localStorage`)
- Pro users see a thank-you message instead of a tip prompt
- After successful tip, user is redirected to `/devotional?tip=thank-you` which shows a confirmation toast

---

## 4. Streak Milestones & Achievements

| Streak | Achievement ID | Reward |
|---|---|---|
| 7 days | `streak_7` | Achievement card + tip prompt eligibility |
| 14 days | `streak_14` | Achievement card + tip prompt eligibility |
| 30 days | `streak_30` | Achievement card + tip prompt eligibility |
| 60 days | `streak_60` | Achievement card + tip prompt eligibility |
| 100 days | `streak_100` | Achievement card + tip prompt eligibility |

---

## 5. Navigation Structure

Six sections accessible from the bottom navigation bar:

| Section | Route | Description |
|---|---|---|
| Devotional | `/devotional` | Daily verse, AI reflection & prayer, chat |
| Journey | `/journey` | Streak tracking, achievements, growth stats |
| Read | `/read` | Full Bible reading with AI companion |
| Study | `/study` | Topic-based Bible study with AI |
| Journal | `/journal` | Personal spiritual journal entries |
| *(Landing)* | `/` | Marketing homepage (non-logged-in users) |
| Pricing | `/pricing` | Plan comparison page |

---

## 6. AI System

### Model
- **Model:** `gpt-4o-mini` (used across all AI features)
- **Streaming:** Yes — responses stream token by token for a natural feel

### AI Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/ai/generate` | Generates reflection or prayer for daily verse |
| `POST /api/ai/chat` | Follow-up conversation anchored to daily verse |
| `POST /api/chat/passage` | AI companion for Bible reading (Read/Study pages) |
| `POST /api/tts` | Text-to-speech audio generation |

### Voice System
Users choose their preferred AI voice during onboarding (2-step name → voice preview flow).

| Voice | OpenAI Voice ID | Character |
|---|---|---|
| Voice A | `onyx` | Deep & warm |
| Voice B | `nova` | Gentle & clear |

Voice preference is stored in `localStorage` under key `sp_voice`. No gender framing — users preview and choose by sound.

### AI Character & Guardrails
The AI is instructed to be a deeply thoughtful spiritual companion — a trusted friend who knows the Bible well and speaks plainly. It is explicitly instructed **never** to:
- Give bulleted lists
- Use spiritual clichés ("lean into," "unpack," "let go and let God," "walk in His truth")
- Tell users what they "should" or "must" do
- Open with hollow affirmations ("Great question!", "What a beautiful verse!")
- Be preachy

### Crisis Detection
A built-in crisis detection function (`detectCrisis()`) scans every user message for keywords indicating self-harm or crisis. When triggered, it bypasses the AI model and returns a fixed compassionate response with crisis resources. This cannot be disabled.

---

## 7. Bible Versions

Only three versions are available in the app:

| Abbreviation | Full Name |
|---|---|
| KJV | King James Version |
| WEB | World English Bible |
| ASV | American Standard Version |

These are public-domain translations served via `bible-api.com`. No licensing fees apply.

---

## 8. Daily Verse System

- Daily verse is set via the admin Google Sheet integration
- Verse includes: `reference`, `text`, and `reflectionPrompt`
- If no verse is found in the sheet, a fallback verse is used: Philippians 4:6–7 (WEB)
- The daily email is sent each morning and includes today's verse + a link to the app

---

## 9. Notifications & Email

### Push Notifications
- Browser-based push via Web Push API (VAPID keys stored as environment secrets)
- Users opt in from the Devotional page
- Welcome notification fires on first opt-in

### Daily Email
- Powered by **Resend** (email provider integration)
- Users subscribe via the landing page or devotional page
- Email includes: today's verse, encouragement, and a deep link into the app
- Unsubscribe is handled via Resend

---

## 10. Refund Policy

- Refunds can be requested through the app (Settings → Subscription → Request Refund)
- Processed via Stripe
- Funds appear in **5–10 business days**
- Subscription is cancelled at time of refund

---

## 11. Key Local Storage Keys (Technical Reference)

| Key | Purpose |
|---|---|
| `sp_user_name` | User's display name |
| `sp_voice` | Chosen TTS voice (`onyx` or `nova`) |
| `sp_ai_usage` | Daily AI usage count + last-reset date |
| `sp_tip_dismissed` | Timestamp of last tip prompt dismissal (90-day cooldown) |
| `sp_session_id` | Anonymous session identifier for journal memory |
| `sp_start_date` | Date user first opened the app (for relationship tier calculation) |

---

## 12. Design & Brand

### Fonts
| Role | Font |
|---|---|
| UI / Body | Plus Jakarta Sans |
| Headings / Serif accent | Instrument Serif |
| Bible reading | Literata |
| Decorative / Display | Cormorant Garamond |

### Primary Color
- **Brand purple:** `#3b1f7a` / HSL `263 56% 46%`

### Relationship Tiers (AI voice adapts by usage age)
| Days in App | Tier |
|---|---|
| 1–3 days | New — welcoming, no assumed familiarity |
| 4–14 days | Building — attentive, learning who they are |
| 15–30 days | Established — real rapport, genuine warmth |
| 31+ days | Trusted companion — speaks with earned intimacy |

---

## 13. Monetization Notes (Future)

The following have been discussed but not yet built. Handle via direct email sales for now:

- **White label for churches** — custom branding, group pricing (contact via support email)
- **Influencer referral program** — discussed; to be built as formal feature later
- **Annual price lock guarantee** — users who subscribe annually lock in their rate

---

## 14. Key Secrets & Integrations (Do Not Share Publicly)

All secrets are stored as Replit environment variables. Never commit to code.

| Secret | Purpose |
|---|---|
| `OPENAI_API_KEY` | AI reflections, prayers, chat, TTS |
| `STRIPE_SECRET_KEY` | Subscriptions, tips, refunds |
| `SESSION_SECRET` | Session security |
| VAPID public/private keys | Web push notifications |
| Resend API key | Transactional + daily emails |
| Google Sheet integration | Daily verse management |

---

*To update this document: edit the content above, update the "As of" date at the top, and export/print to PDF.*
