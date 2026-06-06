#!/usr/bin/env bash
# Build Shepherd's Path Shorts from master edit + stills → ~/Desktop
set -euo pipefail

MASTER="${1:-$HOME/Desktop/best so far/best so far - FIXED.mp4}"
OUT_DIR="${2:-$HOME/Desktop}"
ASSETS="${3:-$HOME/.cursor/projects/Users-briancartee-Daily-Devotional-AI/assets}"

if [[ ! -f "$MASTER" ]]; then
  echo "ERROR: Master not found: $MASTER"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: ffmpeg required (brew install ffmpeg)"
  exit 1
fi

WORK="$(mktemp -d /tmp/sp-shorts.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

W=1080
H=2338
FPS=30
HOOK_DUR=2.5
XFADE=0.45

img_to_hook() {
  local img="$1"
  local out="$2"
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -i "$img" -t "$HOOK_DUR" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p" \
    -r "$FPS" -an \
    -c:v libx264 -preset fast -crf 20 \
    "$out"
}

# Stills from Cursor assets (user-provided screenshots)
IMG_PROMO="$ASSETS/68DA69C2-21E5-4CE6-9ABD-0800C1452B76_1_105_c-df0a104d-8d39-4728-b359-5068f0a4d7c5.png"
IMG_THRESHOLD="$ASSETS/70F35D7C-B3B7-4876-9C5C-A9073B1375A2_1_105_c-e403249b-4386-42a1-8b92-1acbde6e1ef5.png"
IMG_RAIN="$ASSETS/Rain_window_1-240c43f1-f8c8-40bf-8dc0-a6367891de0f.png"
IMG_PRAYER="$ASSETS/walking_towards_Light__1_BEST-d7c3c211-c195-480f-91a2-fc7ee3301feb.png"
IMG_PATH="$ASSETS/image__2-ea8ff63d-3787-4cb8-8fb0-5f7a32b94ab3.png"
IMG_END="$ASSETS/end_background_1-9fa1984b-3160-4673-82e1-0b70cf960c2a.png"

for f in "$IMG_PROMO" "$IMG_THRESHOLD" "$IMG_RAIN" "$IMG_PRAYER" "$MASTER"; do
  [[ -f "$f" ]] || { echo "ERROR: Missing file: $f"; exit 1; }
done

echo "==> Normalizing master (${W}x${H})..."
ffmpeg -y -hide_banner -loglevel error -i "$MASTER" \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
  -r "$FPS" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k -ar 48000 \
  "$WORK/master_norm.mp4"

echo "==> Building hook clips..."
img_to_hook "$IMG_PROMO" "$WORK/hook_promo.mp4"
img_to_hook "$IMG_THRESHOLD" "$WORK/hook_threshold.mp4"
img_to_hook "$IMG_RAIN" "$WORK/hook_rain.mp4"
img_to_hook "$IMG_PRAYER" "$WORK/hook_prayer.mp4"
img_to_hook "$IMG_PATH" "$WORK/hook_path.mp4"

join_hook_master() {
  local hook="$1"
  local out="$2"
  local offset
  offset="$(awk "BEGIN {print $HOOK_DUR - $XFADE}")"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$hook" -i "$WORK/master_norm.mp4" \
    -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${XFADE}:offset=${offset}[v];[1:a]asetpts=PTS-STARTPTS[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k -movflags +faststart \
    "$out"
}

echo "==> Rendering variants..."
cp "$WORK/master_norm.mp4" "$OUT_DIR/ShepherdsPath_Short_MASTER.mp4"

join_hook_master "$WORK/hook_promo.mp4" "$OUT_DIR/ShepherdsPath_Short_01_Hook-FindYourWay.mp4"
join_hook_master "$WORK/hook_threshold.mp4" "$OUT_DIR/ShepherdsPath_Short_02_Hook-Threshold.mp4"
join_hook_master "$WORK/hook_rain.mp4" "$OUT_DIR/ShepherdsPath_Short_03_Hook-3amRain.mp4"
join_hook_master "$WORK/hook_prayer.mp4" "$OUT_DIR/ShepherdsPath_Short_04_Hook-Prayer.mp4"
join_hook_master "$WORK/hook_path.mp4" "$OUT_DIR/ShepherdsPath_Short_05_Hook-GoldenPath.mp4"

# End-card: body + 3s branded still (fast concat)
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/master_norm.mp4")"
BODY="$(awk "BEGIN {print $DUR - 3}")"
ffmpeg -y -hide_banner -loglevel error -i "$WORK/master_norm.mp4" -t "$BODY" -c copy "$WORK/body.mp4"
ffmpeg -y -hide_banner -loglevel error -loop 1 -i "$IMG_END" -t 3 \
  -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p" -r "$FPS" -an \
  -c:v libx264 -preset fast -crf 20 "$WORK/tail.mp4"
printf "file '%s/body.mp4'\nfile '%s/tail.mp4'\n" "$WORK" "$WORK" > "$WORK/endlist.txt"
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$WORK/endlist.txt" -i "$WORK/master_norm.mp4" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUT_DIR/ShepherdsPath_Short_ENDCARD-Branded.mp4" 2>/dev/null || \
ffmpeg -y -hide_banner -loglevel error -i "$WORK/body.mp4" -i "$WORK/tail.mp4" -i "$WORK/master_norm.mp4" \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]asetpts=PTS-STARTPTS[a]" -map "[v]" -map "[a]" \
  -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUT_DIR/ShepherdsPath_Short_ENDCARD-Branded.mp4"

# Platform aliases (same file — upload with different UTMs in description)
cp "$OUT_DIR/ShepherdsPath_Short_MASTER.mp4" "$OUT_DIR/ShepherdsPath_YouTube_Short.mp4"
cp "$OUT_DIR/ShepherdsPath_Short_01_Hook-FindYourWay.mp4" "$OUT_DIR/ShepherdsPath_TikTok_Short.mp4"
cp "$OUT_DIR/ShepherdsPath_Short_02_Hook-Threshold.mp4" "$OUT_DIR/ShepherdsPath_Reels_Short.mp4"

echo ""
echo "==> Done. Files on Desktop:"
ls -lh "$OUT_DIR"/ShepherdsPath_*.mp4
