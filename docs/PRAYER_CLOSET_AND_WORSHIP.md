# Prayer closet & worship bed (shipped MVP)

## For you (Brian)

While you were away, we added:

1. **Prayer closet** — `/prayer-closet`
2. **Worship bed** — optional music inside the closet (4 track slots + quiet fallback tone until MP3s are added)

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

Until files exist, the app plays a **very quiet generated stillness tone** when worship bed is on.

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
