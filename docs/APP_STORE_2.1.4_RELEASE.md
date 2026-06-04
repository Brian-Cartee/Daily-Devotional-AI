# App Store / Play release — 2.1.4 (build 165)

Use this when submitting **iOS build 165** / **Android versionCode 126**. The shell loads the live site; most UX ships on [shepherdspathai.com](https://www.shepherdspathai.com) — pull-to-refresh in the app picks up web updates without a new store build.

---

## What’s New in This Version (App Store Connect)

Paste into **What’s New**:

```
What's New in 2.1.4

• A calmer first-time welcome — choose what you need (peace, grief, Scripture depth, and more) before Today’s Word
• Home focuses on one clear step: today’s verse, reflection, and prayer
• “Talk it through” is now the tab name everywhere — same pastoral conversation, clearer label
• Your name and session stay in sync across app restarts for personalized prayer
• Pull down to refresh and get the latest experience from Shepherd’s Path
• Smoother Apple Pro subscription sync after purchase
• Performance and stability improvements

Thank you for walking this path with us.
```

---

## Promotional Text (170 chars max)

Option A (169 chars):

```
Quiet daily Scripture and prayer — a gentler welcome, Today’s Word first, and Talk it through when life is heavy. Pull to refresh for the latest.
```

Option B (147 chars):

```
Meet God in the quiet: today’s devotional first, Talk it through when you need more, pull to refresh for updates. Scripture stays free.
```

---

## Native binary changes (2.1.4)

| Area | Change |
|------|--------|
| **Profile sync** | `native-profile.ts` seeds session + name before web loads; saves web updates to AsyncStorage |
| **Apple Pro** | `inject-pro.ts` syncs RevenueCat purchase into embedded site |
| **Subscription** | Native `/subscription` modal registered in router |
| **Pull to refresh** | iOS: pull down reloads live site (fewer store updates needed for web-only fixes) |
| **Build** | iOS 165, Android 126, EAS Xcode image for production |

---

## Already live on the website (no binary required)

Users get these on refresh or after install once the site loads:

- Shorter threshold (merged welcome screens)
- One home overlay per visit (web)
- Pastoral Pro / AI limit copy
- Steady-walker welcome copy + Scripture Deep Dive on picker
- Verse-first devotional (opt-in continuity)
- Why panel gating improvements

---

## Build commands (Mac)

```bash
cd ~/Daily-Devotional-AI/.mobile-build

# Commit is on main — pull first
git pull origin main

# iOS (EAS production)
eas build --platform ios --profile production

# Android (when ready for Play closed/open testing)
eas build --platform android --profile production

# Submit iOS after TestFlight smoke
eas submit --platform ios --latest
```

Or use existing scripts if configured: `submit-ios.sh`, `build-android.sh`.

---

## TestFlight / device smoke (15 min)

1. **Fresh install** (or delete app → reinstall TestFlight build).
2. **First launch** → threshold need picker (not dumped straight on busy home).
3. Pick **Stillness** or **Peace** → complete flow → land on **Today’s Word**.
4. **Devotional** → enter name → **Save & personalize** → force-quit → reopen → name still there.
5. **Pull down** on home → page reloads; threshold/tab labels match latest web.
6. **Talk it through** tab label (not “Guidance”).
7. **···** → Contact support / Send feedback open.
8. **Pro** (sandbox): purchase or restore → web shows Pro without manual Safari visit.

---

## App Store Connect checklist

- [ ] Version **2.1.4**, build **165** attached
- [ ] What’s New pasted (above)
- [ ] Promotional text updated (optional)
- [ ] Screenshots: consider caption **Talk it through** instead of Guidance on slide 4
- [ ] Review notes: *“App loads shepherdspathai.com in a WebView; microphone used only in optional Sermon Mode.”*

---

## After approval

Tell testers and TikTok traffic: **pull down to refresh** on the home screen after we deploy web fixes — no App Store wait for copy and flow tweaks.
