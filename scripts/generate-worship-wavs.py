#!/usr/bin/env python3
"""Generate loopable stillness WAV files for prayer-closet worship bed (royalty-free, generated)."""
from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "artifacts" / "shepherds-path" / "public" / "worship"

TRACKS = [
    ("morning-stillness", 110.0, 0.22),
    ("soaking-prayer", 164.81, 0.2),
    ("hope-rise", 220.0, 0.18),
    ("night-rest", 87.31, 0.16),
]

SAMPLE_RATE = 22050
DURATION_SEC = 24


def write_track(name: str, freq: float, gain: float) -> None:
    path = OUT_DIR / f"{name}.wav"
    n_frames = SAMPLE_RATE * DURATION_SEC
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for i in range(n_frames):
            t = i / SAMPLE_RATE
            # Soft attack/release + gentle second harmonic
            env = min(1.0, t / 2.0, (DURATION_SEC - t) / 2.0)
            sample = env * gain * (
                0.85 * math.sin(2 * math.pi * freq * t)
                + 0.15 * math.sin(2 * math.pi * freq * 1.5 * t)
            )
            wf.writeframes(struct.pack("<h", int(max(-32767, min(32767, sample * 32767)))))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, freq, gain in TRACKS:
        write_track(name, freq, gain)
        print(f"Wrote {OUT_DIR / (name + '.wav')}")


if __name__ == "__main__":
    main()
