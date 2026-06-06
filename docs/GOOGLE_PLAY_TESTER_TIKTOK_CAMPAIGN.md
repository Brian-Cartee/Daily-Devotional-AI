# Google Play closed testers — TikTok campaign kit

Recruit **12+ opted-in** Android testers for Google Play’s **14-day closed test** rule.  
Use this with [SHORT_VIDEO_PRODUCTION_KIT.md](./SHORT_VIDEO_PRODUCTION_KIT.md) (filming) and [YOUTUBE_GROWTH_EXECUTION.md](./YOUTUBE_GROWTH_EXECUTION.md) (UTMs + scheduling).

**Reward:** 1 year **Pro** free (annual value **$44.99**) via in-app promo code.  
**Suggested code:** `PLAYBETA12` (add on server before you post — see [Promo code setup](#promo-code-setup-server))

---

## Google’s rules (say these plainly in the video)

| Rule | What testers must do |
|------|----------------------|
| **Minimum** | **12 people** opted in to **Closed testing** |
| **Duration** | Stay opted in **14 days in a row** (don’t leave the test) |
| **Your job** | Send them the **Play Console opt-in link** (not just the website) |
| **Buffer** | Recruit **15** so 2–3 dropouts don’t break the clock |

**Do not** promise “instant Production” — only that they help you launch and get Pro as a thank-you.

---

## Links you need before posting

| Item | Where to get it |
|------|-----------------|
| **Closed test opt-in URL** | Play Console → **Test and release** → **Testing** → **Closed testing** → **Testers** tab → copy link or add emails |
| **App listing (after opt-in)** | Same track → testers install from Play Store test link |
| **Web app (optional)** | `https://www.shepherdspathai.com/?utm_source=tiktok&utm_medium=social&utm_campaign=playbeta12` |
| **Support** | `https://www.shepherdspathai.com/support` |

Replace `YOUR_CLOSED_TEST_LINK` everywhere below with the real Play link.

---

## Promo code setup (server)

Codes are validated from `PROMO_CODES` (comma-separated) on the API server. Each valid code grants **1 year Pro** in the app (Upgrade → **Have a promo code?**).

**On Lightsail** (after you choose the code name):

```bash
# SSH in, then edit api-server env — append your new code to existing list:
# PROMO_CODES=EXISTING1,EXISTING2,PLAYBETA12

cd ~/Daily-Devotional-AI/artifacts/api-server   # or your deploy path
nano .env   # add PLAYBETA12 to PROMO_CODES
pm2 restart api-server
```

**Test:**

```bash
curl -sS -X POST https://www.shepherdspathai.com/api/promo/validate \
  -H 'Content-Type: application/json' \
  -d '{"code":"PLAYBETA12"}' | python3 -m json.tool
```

Expect `"valid": true` and an `expiresAt` ~1 year out.

**After you have 15 solid testers:** remove `PLAYBETA12` from `PROMO_CODES` and restart API (TikTok will spread the code).

---

## TikTok video (30–40 sec) — film in CapCut

**Hook (0–3 sec) — text on screen + say it:**  
`Android users — I need 12 testers 🙏`

**Middle (3–25 sec):**  
"I'm launching **Shepherd's Path** on Google Play — a quiet daily devotional: verse, reflection, prayer. Google requires **12 people** on the **closed test** for **14 days**. If you help, you get **1 year Pro free** — **$44.99 value**. Comment **TEST** and I'll DM the link."

**Rules card (3 sec) — on screen:**  
```
✓ Android only  
✓ Join closed test link  
✓ Stay opted in 14 days  
✓ Code: PLAYBETA12 (after install)
```

**End card (3 sec):**  
```
Shepherd's Path  
Comment TEST below
```

**On-screen style:** purple `#6B4AE6`, same as [SHORT_VIDEO_PRODUCTION_KIT.md](./SHORT_VIDEO_PRODUCTION_KIT.md).

---

## TikTok caption (copy-paste)

```
Android friends — I need 12 testers for Google Play 🙏

Shepherd's Path = daily verse + reflection + prayer (calm, not loud).

Google rule: 12 people on the CLOSED TEST for 14 days straight.

🎁 Thank-you: 1 year Pro FREE ($44.99 value)
Code after you install: PLAYBETA12
(Upgrade → Have a promo code?)

HOW TO JOIN:
1) Comment TEST — I'll DM the Play closed-test link
2) Accept the invite & install from Play Store
3) Open app once, try today's devotional
4) Stay in the test 14 days — don't opt out

Android only for this round. iOS friends — App Store link in bio.

#christiantiktok #faithtok #dailydevotional #prayer #android #betatest
```

**Bio (one line while campaign runs):**  
`Android beta: comment TEST · Pro code PLAYBETA12`

---

## Pinned comment (your account replies)

```
Closed test steps:
1) I'll DM you the Google Play opt-in link (check requests)
2) Install → open app once
3) Pro code: PLAYBETA12 → Upgrade → Have a promo code?
4) Stay opted in 14 days — helps me launch 🙏

Web: https://www.shepherdspathai.com/?utm_source=tiktok&utm_medium=social&utm_campaign=playbeta12
```

---

## DM template (when they comment TEST)

```
Thanks for helping launch Shepherd's Path 🙏

1) Join closed test (required for Google):
YOUR_CLOSED_TEST_LINK

2) Install from Play Store when it offers the test build.

3) Open the app → try today's verse + reflection.

4) Pro thank-you ($44.99/yr value):
   Upgrade → "Have a promo code?" → PLAYBETA12

5) Please stay opted in 14 days — if you leave the test, Google resets my clock.

Questions: https://www.shepherdspathai.com/support
```

---

## Story / second post (reminder on day 3)

**Caption:**

```
Still need Android closed testers — 14-day opt-in 🙏
Comment TEST · Pro year free with PLAYBETA12
First 15 only — then list closes.
```

---

## Comment replies (you type — don’t fully automate)

| They say | You reply |
|----------|-----------|
| `TEST` | "DM sent — check Message requests" (then send DM template) |
| `iPhone?` | "This round is Android closed test; iOS is in bio / App Store" |
| `Is it paid?` | "App is free; Pro is optional — testers get 1yr free with PLAYBETA12" |
| `What's the code again?` | "PLAYBETA12 in Upgrade → Have a promo code? after you install from the test link" |

---

## Efficiency checklist (social workflow)

- [ ] `PLAYBETA12` added to `PROMO_CODES` + API restarted + curl test OK
- [ ] Closed test link copied from Play Console
- [ ] Film 30s video (CapCut) — hook in first 2 sec
- [ ] Paste caption + pin comment
- [ ] Post when you can answer DMs for **2–3 hours**
- [ ] Track opt-ins in Play Console (aim **15**, not 12)
- [ ] Spreadsheet: name / @ / date joined / day 14 target
- [ ] Day 15: apply for Production (questionnaire — no extra email to Google)
- [ ] Remove `PLAYBETA12` from env after 15 redemptions or campaign end

---

## What NOT to do

- Don’t post only the website link — **closed test opt-in** is required for Google’s 12/14 rule.
- Don’t post the Play link publicly if you want control — **DM only** keeps spam down.
- Don’t use 20 different public codes — one code is enough; **remove it** when done.
- Don’t buy fake testers who never open the app — hurts Production application.

---

## Repurpose (same kit → other platforms)

| Platform | Change |
|----------|--------|
| **Instagram Reel** | Same video; caption + "Link in bio" → landing page with note "Android testers DM us" |
| **Facebook** | Same video; pin comment with support link |
| **YouTube Short** | Use UTM `utm_campaign=playbeta12` in description |

---

## Production access questionnaire (when 14 days done)

Short answers you can paste:

- **Testers:** 12+ Android users via closed test; mix of TikTok recruits and personal network.
- **Engagement:** Opened app, used daily verse, reflection, prayer; feedback via TikTok DMs and support page.
- **Issues fixed:** [list 1–2 things you fixed during test, if any].

No separate message to Google — only this form.
