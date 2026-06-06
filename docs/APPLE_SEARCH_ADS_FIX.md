# Apple Search Ads fix — Shepherd's Path

**Paused campaign:** Search Results US v1  
**Problem:** TTR ~1.16% (weak). Tap→install ~12.5% (OK). CPA ~$15.68.  
**Root cause:** Mostly **listing + search terms**, not the app itself.

Fix **App Store Connect first**, then **relaunch ASA at $5/day** for 7 days.

---

## Part 1 — App Store Connect (do this first)

### A. Subtitle (30 chars max) — change today

**Remove:** `Daily Faith & Devotionals` (generic, low emotion)

**Use one of these:**

| Option | Subtitle |
|--------|----------|
| **Recommended** | `Verse, reflection & prayer daily` |
| Alt A | `Quiet daily devotional` |
| Alt B | `When life is loud, sit here` |

Path: **App Store Connect → App → App Information** (or version metadata) → **Subtitle**

### B. Promotional text (170 chars, no review)

Paste (edit anytime):

```
New: personalized reflection & prayer with your name. One calm daily step — today's verse, then space to breathe. Free to start.
```

### C. Screenshot order (6.9" display) — highest impact for TTR

Searchers want **devotional + calm**, not a feature grid.

| # | Upload | Why |
|---|--------|-----|
| **1** | Hero: **Find your way back to God** (or best emotional Canva hero) | Stops the scroll |
| **2** | **Today's Word / devotional** (verse on screen) | Matches search intent |
| **3** | **Talk It Through** | Differentiator |
| **4** | **Prayer closet** or journal | Depth |
| **5** | **Journeys** or Lament | Hard seasons |
| **6–10** | Bible, Jesus on-ramp, community, home | Rest |

Files: `artifacts/shepherds-path-mobile/store-assets/screenshots/6.9/` or your Canva PNGs at **1290×2796** / **1320×2868**.

**Do not** lead with Iron Circle / Pro / feature dump on slides 1–2.

### D. Description — first 3 lines (above the fold)

Replace the opening with:

```
Shepherd's Path is a quiet daily devotional — today's Scripture, a short reflection, and a prayer you can make your own.

When God feels far or life is loud, you don't need another overwhelming app. One verse. One step. Enough for today.

Not a replacement for church — a calm companion on your phone.
```

Keep FEATURES / PRO / legal URLs below that.

Path: **Distribution → App Store → Description**

### E. Keywords field (100 characters, comma-separated, no spaces)

**Remove** standalone `Bible` (too broad, expensive junk taps).

**Use:**

```
devotional,prayer,daily devotional,christian,scripture,faith,verse,journal,worship,spiritual
```

---

## Part 2 — Before turning ads back on

### Checklist

- [ ] Subtitle updated
- [ ] Promotional text updated
- [ ] Screenshots 1–2 swapped per table above
- [ ] Description opening updated
- [ ] Keywords updated
- [ ] **Save** in App Store Connect (no new binary required for metadata/screenshots)

Wait **24–48 hours** for Apple to refresh search ad creative cache (sometimes faster).

---

## Part 3 — Relaunch Apple Search Ads

### Campaign settings

| Setting | Value |
|---------|--------|
| **Daily budget** | **$5** (not $10) |
| **Placement** | Search Results only (keep) |
| **Countries** | United States only (keep) |

### Ad Group structure (new campaign: `Search Results US v2`)

Create **3 ad groups** — same keywords, different match types:

**Ad Group 1 — Exact (highest intent)**  
Bid: start **$2.50** max CPT  

Keywords (exact match):

- daily devotional
- daily devotionals
- devotional app
- christian devotional
- bible devotional
- morning devotional
- prayer app
- daily prayer app
- bible verse of the day

**Ad Group 2 — Exact (problem / moment)**  

- prayer for anxiety
- grief devotional
- christian prayer app
- bible study app

**Ad Group 3 — Search Match OFF**  
Do **not** use a broad Search Match ad group until TTR > 2%.

### Negative keywords (campaign level)

Add as **exact** or **broad** negatives:

```
free bible
bible offline
bible games
bible trivia
church
sermon
podcast
catholic
mormon
lds
quran
muslim
kids
children
coloring
wallpaper
ringtone
translator
strong's
commentary
study bible
logos
olive tree
youversion
holy bible
king james only
```

(Add more after you read **Search Terms** from the old campaign — anything with 50+ impressions, 0 taps → negative.)

### CPA / CPT caps

- **Max CPT:** $2.00–$2.50 until TTR improves  
- **CPA Goal (if used):** $12 max — pause keywords above that after 20 taps

---

## Part 4 — Read old campaign data (30 min)

**Apple Ads → Search Results US v1 → Search Terms**

Export or screenshot top 20 rows. Sort by **Impressions**.

| Action | Rule |
|--------|------|
| **Negative** | 100+ impressions, 0 taps |
| **Keep** | Any term with ≥1 tap |
| **Exact bid up** | Terms with tap + install |

Paste Search Terms into a note — don't restart blind.

---

## Part 5 — Success metrics (7 days @ $5/day)

| Metric | Target |
|--------|--------|
| **TTR** | **> 2%** (was 1.16%) |
| **CPA** | **< $12** (was $15.68) |
| **Installs** | **≥ 4** on ~$35 spend |

If after 7 days TTR still < 1.5% → **pause ASA again** and rely on TikTok/Shorts + organic search for 30 days.

---

## Part 6 — What NOT to do

- Don't raise budget to $20/day hoping for more installs  
- Don't add competitor brand names (YouVersion, Bible Gateway) — policy + expensive  
- Don't lead screenshots with Pro paywall  
- Don't rely on ASA until listing changes are live  

---

## Quick links

- App Store Connect: https://appstoreconnect.apple.com  
- Apple Ads: https://app-ads.apple.com  
- Screenshot order: [APP_STORE_SCREENSHOT_ORDER.md](./APP_STORE_SCREENSHOT_ORDER.md)  
- Metadata file (EAS): `/.mobile-build/store.config.yaml`
