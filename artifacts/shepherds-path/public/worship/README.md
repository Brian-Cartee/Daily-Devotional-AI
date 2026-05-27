# Worship bed audio

Default stillness loops are **generated WAV** files (see repo `scripts/generate-worship-wavs.py`).

| File | Track |
|------|-------|
| `morning-stillness.wav` | Soft ambient prayer |
| `soaking-prayer.wav` | Warm soaking pads |
| `hope-rise.wav` | Gentle uplift |
| `night-rest.wav` | Evening rest |

Regenerate after clone:

```bash
python3 scripts/generate-worship-wavs.py
```

You may replace any file with a licensed MP3/WAV (same basename) from [Pixabay worship](https://pixabay.com/music/search/worship/). The prayer closet plays these when **Stillness (local)** is selected.
