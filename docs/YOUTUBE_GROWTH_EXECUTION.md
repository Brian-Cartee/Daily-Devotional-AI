# Shepherd's Path — Growth execution links & tools

Use this with **[YOUTUBE_APP_GROWTH_MASTER.md](./YOUTUBE_APP_GROWTH_MASTER.md)**.

---

## What we recommend (simple stack)

| Priority | Tool | Why |
|----------|------|-----|
| **1** | **This repo (`docs/` folder)** | Strategy never gets lost; versioned with your product |
| **2** | **Google Sheet** | 90-day calendar + KPIs (free, easy on phone) |
| **3** | **YouTube Studio** | Schedule, analytics, Shorts — [studio.youtube.com](https://studio.youtube.com) |
| **4** | **Canva** | Purple brand templates, carousels, thumbnails — [canva.com](https://www.canva.com) |
| **5** | **CapCut** (desktop or mobile) | Shorts captions, fast cuts — [capcut.com](https://www.capcut.com) |
| **6** | **ChatGPT / Claude / Cursor** | Batch 10 scripts at a time from the master doc |

**Optional later:** [Metricool](https://metricool.com) (schedule YT + IG + TikTok), [Notion](https://www.notion.so) (if you want a pretty dashboard).

**Not recommended at start:** expensive course platforms, 4 different schedulers, buying ads before organic hooks work.

---

## Your product links (bookmark these)

| Purpose | URL |
|---------|-----|
| **Website / app (web)** | https://www.shepherdspathai.com |
| **Install-friendly (native shell)** | https://www.shepherdspathai.com/?native=1&enter=1 |
| **Support / bugs / help** | https://www.shepherdspathai.com/support |
| **Feedback survey** | https://www.shepherdspathai.com/feedback |
| **Pricing / Pro** | https://www.shepherdspathai.com/pricing |
| **How to use** | https://www.shepherdspathai.com/how-to-use |
| **Privacy** | https://www.shepherdspathai.com/privacy |
| **Terms** | https://www.shepherdspathai.com/terms |
| **Admin dashboard** | https://www.shepherdspathai.com/shepherd-admin |
| **App Store Connect** | https://appstoreconnect.apple.com |

---

## YouTube channel links (set up once)

| Item | Where |
|------|--------|
| Create / manage channel | https://www.youtube.com/create_channel |
| YouTube Studio (upload, analytics) | https://studio.youtube.com |
| Custom URL (after 100 subs) | Studio → Customization → Basic info |
| Link in bio (use website first) | https://www.shepherdspathai.com |

**Channel description template (paste & edit):**

```
Shepherd's Path — a quiet daily companion for prayer, Scripture, and gentle guidance.
Not church on your phone. A calm room when life is loud and God feels far.

Free daily devotional: https://www.shepherdspathai.com
Support: https://www.shepherdspathai.com/support
```

---

## Tracking installs from video (UTM links)

Put these in **video descriptions** and **pinned comments** (not the Shorts swipe-up unless available).

| Source | Link |
|--------|------|
| Long-form default | `https://www.shepherdspathai.com/?utm_source=youtube&utm_medium=video&utm_campaign=longform` |
| Shorts | `https://www.shepherdspathai.com/?utm_source=youtube&utm_medium=shorts&utm_campaign=shorts` |
| Rebuild series | `https://www.shepherdspathai.com/?utm_source=youtube&utm_medium=video&utm_campaign=rebuild7` |
| Bio / profile | `https://www.shepherdspathai.com/?utm_source=youtube&utm_medium=bio&utm_campaign=channel` |

**Tip:** Use a short redirect later (e.g. `shepherdspathai.com/youtube`) if descriptions feel long.

---

## Google Sheet — 90-day tracker (copy structure)

Create a sheet with tabs:

### Tab 1: `Content calendar`

| Week | Date | Asset type | Title / hook | Status | YT link |
|------|------|------------|--------------|--------|---------|
| 1 | | Short | Silence from God... | draft | |
| 1 | | Long | Why God Feels Silent | film | |

### Tab 2: `KPIs`

| Week ending | Subs | Shorts views (7d) | Long views (7d) | Installs (est.) | Paid subs |
|-------------|------|-------------------|-----------------|-----------------|-----------|

### Tab 3: `Ideas bank`

Paste Shorts #1–50 from the master doc; mark `used` when posted.

**Blank template (Google Sheets):**  
https://docs.google.com/spreadsheets/create  

Or duplicate any “content calendar” template and rename columns to match above.

---

## AI prompt to batch content (paste into ChatGPT / Claude / Cursor)

```
Read our strategy in docs/YOUTUBE_APP_GROWTH_MASTER.md (or paste Part 2).

This week’s theme: [e.g. spiritual burnout / men / anxiety at night].

Generate:
1. Five YouTube Shorts scripts (25–35 sec each): hook, on-screen text, verse, closing line, CTA "link in description"
2. One long-form outline (10 min) using our retention structure
3. Five thumbnail title options (3–5 words, emotional)
4. Description + pinned comment for the long-form (include UTM link)
5. One carousel slide script (5 slides)

Tone: cinematic, peaceful, premium, reverent. No prosperity gospel. No manipulation.
Brand: Shepherd's Path — quiet faith for overwhelmed adults.
```

---

## Weekly rhythm (minimum viable)

| Day | Task | Time |
|-----|------|------|
| Mon | Script 6 Shorts (AI + edit) | 45 min |
| Tue | Film b-roll / record voice | 60 min |
| Wed | CapCut edit Shorts | 60 min |
| Thu | Film 1 long-form | 90 min |
| Fri | Thumbnail + upload + schedule | 45 min |
| Sat | Reply comments | 20 min |
| Sun | Plan next week + check KPIs | 30 min |

---

## Where files live in this project

| File | Contents |
|------|----------|
| [docs/YOUTUBE_APP_GROWTH_MASTER.md](./YOUTUBE_APP_GROWTH_MASTER.md) | Full strategy, 50 Shorts, hooks, 90-day plan |
| [docs/YOUTUBE_GROWTH_EXECUTION.md](./YOUTUBE_GROWTH_EXECUTION.md) | This file — tools, links, UTM, Sheet structure |
| [docs/IOS_PLATFORM.md](./IOS_PLATFORM.md) | App Store / WebView / deploy notes |

---

## Save this forever (Git)

On your Mac:

```bash
cd ~/Daily-Devotional-AI
git add docs/YOUTUBE_APP_GROWTH_MASTER.md docs/YOUTUBE_GROWTH_EXECUTION.md
git commit -m "Add YouTube and app growth strategy docs"
git push origin main
```

Then on GitHub: **Daily-Devotional-AI → docs →** open either file anytime.

---

## Quick answer: "Which should I use?"

**Save:** Both markdown files in `docs/` (commit to GitHub).  
**Execute:** Google Sheet + YouTube Studio + Canva + CapCut.  
**Write faster:** ChatGPT/Claude with the prompt above.  
**Don't need yet:** A separate paid "portal" for growth — use `/support` for users and Sheet for yourself.
