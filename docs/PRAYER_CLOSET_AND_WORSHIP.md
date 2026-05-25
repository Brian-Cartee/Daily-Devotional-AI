# Prayer closet & worship bed (shipped MVP)

## For you (Brian)

While you were away, we added:

1. **Prayer closet** — `/prayer-closet`
2. **Worship bed** — optional music inside the closet: **YouTube mixes** (~1 hr, official embed) or **local stillness** (4 MP3 slots + quiet fallback tone)

### Deploy on Lightsail

```bash
cd ~/Daily-Devotional-AI && git pull && bash scripts/deploy-lightsail.sh
```

### Add real worship tracks (recommended)

Download royalty-free worship / gentle house MP3s from [Pixabay worship](https://pixabay.com/music/search/worship/) and place them here:

`artifacts/shepherds-path/public/worship/`

| Filename | Mood |
|----------|------|
| `morning-stillness.mp3` | Soft ambient prayer |
| `soaking-prayer.mp3` | Warm pads |
| `hope-rise.mp3` | Uplifting gentle house |
| `night-rest.mp3` | Evening rest |

Until files exist, local mode plays a **very quiet generated stillness tone**.

### Curated YouTube mixes (prayer closet)

Edit `artifacts/shepherds-path/src/lib/worshipYouTubeMixes.ts` to add `videoId` + metadata. Current mixes:

| Mix | Channel |
|-----|---------|
| Holy Voltage Ep. 1 | Holy Voltage Radio |
| House Praise 2026 | Kingdom Frequencies |
| Glorious Praise & Worship | Casley Music |
| Best uplifting EDM worship | EDM Christian Music |
| JESUS uplifting EDM #14 | Christian Techno Music |
| Upbeat workout & feel-good | Christian Edm Music |

Playback uses the **YouTube IFrame API** (compliant embed). On mobile, the user may need to **tap play** inside the slim player bar.

### Home entry points

- New card under **Today's devotional** — “Your prayer closet”
- **Shortcuts** row — Prayer closet
- **More paths** — Prayer closet

### What’s in the closet

- Name your closet (local storage)
- Pick background (path, lake, forest, today’s art, etc.)
- Verse on the wall (today’s or pinned)
- Candle slider (dims the room)
- Worship bed toggle + track + volume
- Prayer note → save to journal
- Last prayer snippet from journal
- Links to Talk It Through, journal, devotional

Floater is hidden on `/prayer-closet` so the space stays calm.
