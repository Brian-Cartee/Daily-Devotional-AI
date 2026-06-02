#!/usr/bin/env python3
"""Build Safari/PWA icons with safe padding so tiles don't clip the glow. Requires Pillow."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "artifacts" / "shepherds-path" / "public"
SRC = PUBLIC / "talk-it-through-icon.png"

# theme-color in index.html / manifest.json
BG = (59, 31, 122, 255)
INSET = 0.16

OUTPUTS = [
    (32, "favicon-32.png"),
    (180, "apple-touch-icon.png"),
    (192, "app-icon-192.png"),
    (512, "app-icon-512.png"),
    (1024, "sp-icon.png"),
]


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    for size, name in OUTPUTS:
        inner = max(8, int(size * (1 - INSET * 2)))
        logo = src.copy()
        logo.thumbnail((inner, inner), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), BG)
        x = (size - logo.width) // 2
        y = (size - logo.height) // 2
        canvas.paste(logo, (x, y), logo.split()[3])
        out = PUBLIC / name
        canvas.save(out, "PNG")
        print(f"Wrote {name} ({size}×{size})")

    shutil.copy(PUBLIC / "app-icon-512.png", PUBLIC / "app-icon.png")
    print("Synced app-icon.png")


if __name__ == "__main__":
    main()
