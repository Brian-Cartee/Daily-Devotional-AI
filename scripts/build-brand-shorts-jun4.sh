#!/usr/bin/env bash
# Spirit-led brand Shorts — master + 7 stills → Desktop
set -euo pipefail

MASTER="${1:-$HOME/Desktop/6-4-26 latest.mp4}"
ASSETS="${2:-$HOME/.cursor/projects/Users-briancartee-Daily-Devotional-AI/assets}"
OUT="${3:-$HOME/Desktop}"
W=1080
H=2338
FPS=30
XFADE=0.55

for f in "$MASTER" \
  "$ASSETS/2_rain_-d2e9e2cf-7c7f-48ba-be9f-b6e54c1062d6.png" \
  "$ASSETS/1_path_-6d78d55b-248d-4708-ab47-697992578bdc.png" \
  "$ASSETS/1_Psalm_Bible_-93591c19-d845-4b28-ac6d-2178c8854de2.png" \
  "$ASSETS/1_praying_Jesus_-1454f360-4d7d-46fa-b554-fa1d6333c67f.png" \
  "$ASSETS/2_cross-70e95964-770a-442f-8541-f436399d62ab.png" \
  "$ASSETS/2_sky_dusk_-5fac50ff-4fcb-4680-a05f-9b884df03e74.png" \
  "$ASSETS/1_Luke_Bible_-6b57654f-b52a-4009-81e2-eb753c84b151.png"; do
  [[ -f "$f" ]] || { echo "Missing: $f"; exit 1; }
done

WORK="$(mktemp -d /tmp/sp-brand-jun4.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK"

img_clip() {
  local dur="$1" img="$2" out="$3" mood="$4"
  local frames
  frames="$(awk "BEGIN {printf \"%d\", $FPS * $dur}")"
  local zrate="0.0010"
  [[ "$mood" == "slow" ]] && zrate="0.0008"
  ffmpeg -y -hide_banner -loglevel error -loop 1 -i "$img" -t "$dur" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},format=yuv420p,\
eq=contrast=1.06:brightness=-0.02:saturation=1.08,\
vignette=angle=PI/5,\
zoompan=z='min(zoom+${zrate},1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS}" \
    -an -c:v libx264 -preset fast -crf 19 "$out"
}

end_card_clip() {
  # Branded hold (text lives in master + platform captions; ffmpeg lacks drawtext here)
  img_clip "$1" "$2" "$3" slow
}

master_clip() {
  local start="$1" dur="$2" out="$3"
  local fout
  fout="$(awk "BEGIN {print $dur - 1}")"
  ffmpeg -y -hide_banner -loglevel error -ss "$start" -i "$MASTER" -t "$dur" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,\
eq=contrast=1.04:saturation=1.05,fade=t=in:st=0:d=0.6,fade=t=out:st=${fout}:d=1" \
    -r "$FPS" -c:v libx264 -preset fast -crf 17 -an "$out"
}

xfade_chain() {
  local out="$1"
  shift
  local n=$#
  if [[ $n -lt 2 ]]; then cp "$1" "$out"; return; fi
  local prev="$1" dur
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$prev")"
  local offset
  offset="$(awk "BEGIN {print $dur - $XFADE}")"
  local filter="[0:v][1:v]xfade=transition=fadeblack:duration=${XFADE}:offset=${offset}[v01]"
  local inputs=(-i "$1" -i "$2")
  local maps="[v01]"
  local idx=2
  for ((i=2; i<n; i++)); do
    local next="${!i}"
    local pdur
    pdur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$prev")"
    local poff
    poff="$(awk "BEGIN {print $pdur - $XFADE}")"
    local tag="v0$idx"
    filter+=";${maps}[$idx:v]xfade=transition=fade:duration=${XFADE}:offset=${poff}[${tag}]"
    maps="[${tag}]"
    inputs+=(-i "$next")
    prev="$next"
    ((idx++)) || true
  done
  # rebuild simpler: pairwise merge in loop
  :
}

# Pairwise xfade merge (reliable)
merge_two() {
  local a="$1" b="$2" out="$3"
  local da db off
  da="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$a")"
  off="$(awk "BEGIN {print $da - $XFADE}")"
  ffmpeg -y -hide_banner -loglevel error -i "$a" -i "$b" \
    -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${XFADE}:offset=${off}[v]" \
    -map "[v]" -c:v libx264 -preset fast -crf 18 -an "$out"
}

merge_all() {
  local out="$1"
  shift
  local cur="$1"
  shift
  local i=1
  for next in "$@"; do
    local tmp="$WORK/merge_$i.mp4"
    merge_two "$cur" "$next" "$tmp"
    cur="$tmp"
    ((i++)) || true
  done
  cp "$cur" "$out"
}

echo "==> Building clips..."
img_clip 3.2 "$ASSETS/2_rain_-d2e9e2cf-7c7f-48ba-be9f-b6e54c1062d6.png" "$WORK/a_rain.mp4" slow
img_clip 3.4 "$ASSETS/1_path_-6d78d55b-248d-4708-ab47-697992578bdc.png" "$WORK/a_path.mp4" slow
img_clip 3.6 "$ASSETS/1_Psalm_Bible_-93591c19-d845-4b28-ac6d-2178c8854de2.png" "$WORK/a_psalm.mp4" slow
master_clip 1.2 14.5 "$WORK/a_master.mp4"
img_clip 3.2 "$ASSETS/1_praying_Jesus_-1454f360-4d7d-46fa-b554-fa1d6333c67f.png" "$WORK/a_pray.mp4" slow
img_clip 3.4 "$ASSETS/2_cross-70e95964-770a-442f-8541-f436399d62ab.png" "$WORK/a_cross.mp4" slow
end_card_clip 3.8 "$ASSETS/2_sky_dusk_-5fac50ff-4fcb-4680-a05f-9b884df03e74.png" "$WORK/a_end.mp4"

echo "==> Video A — Through the Storm (xfade chain)..."
merge_all "$WORK/video_a_noaudio.mp4" \
  "$WORK/a_rain.mp4" "$WORK/a_path.mp4" "$WORK/a_psalm.mp4" \
  "$WORK/a_master.mp4" "$WORK/a_pray.mp4" "$WORK/a_cross.mp4" "$WORK/a_end.mp4"

img_clip 3.0 "$ASSETS/2_sky_dusk_-5fac50ff-4fcb-4680-a05f-9b884df03e74.png" "$WORK/b_dusk.mp4" slow
img_clip 3.4 "$ASSETS/1_Luke_Bible_-6b57654f-b52a-4009-81e2-eb753c84b151.png" "$WORK/b_luke.mp4" slow
img_clip 3.2 "$ASSETS/1_path_-6d78d55b-248d-4708-ab47-697992578bdc.png" "$WORK/b_path.mp4" slow
master_clip 0.5 15.5 "$WORK/b_master.mp4"
img_clip 3.2 "$ASSETS/1_praying_Jesus_-1454f360-4d7d-46fa-b554-fa1d6333c67f.png" "$WORK/b_pray.mp4" slow
img_clip 3.4 "$ASSETS/2_cross-70e95964-770a-442f-8541-f436399d62ab.png" "$WORK/b_cross.mp4" slow
end_card_clip 4.0 "$ASSETS/2_rain_-d2e9e2cf-7c7f-48ba-be9f-b6e54c1062d6.png" "$WORK/b_end.mp4"

echo "==> Video B — Scripture Meets You (xfade chain)..."
merge_all "$WORK/video_b_noaudio.mp4" \
  "$WORK/b_dusk.mp4" "$WORK/b_luke.mp4" "$WORK/b_path.mp4" \
  "$WORK/b_master.mp4" "$WORK/b_pray.mp4" "$WORK/b_cross.mp4" "$WORK/b_end.mp4"

add_audio() {
  local vin="$1" vout="$2" label="$3"
  local vdur
  vdur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$vin")"
  local aout
  aout="$(awk "BEGIN {print $vdur - 2}")"
  ffmpeg -y -hide_banner -loglevel error -i "$vin" -i "$MASTER" \
    -filter_complex "[1:a]afade=t=in:st=0:d=1.2,afade=t=out:st=${aout}:d=2,atrim=0:${vdur},asetpts=PTS-STARTPTS[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$vout"
}

echo "==> Adding audio from master..."
add_audio "$WORK/video_a_noaudio.mp4" "$OUT/ShepherdsPath_ThroughTheStorm_Jun4.mp4" "A"
add_audio "$WORK/video_b_noaudio.mp4" "$OUT/ShepherdsPath_ScriptureMeetsYou_Jun4.mp4" "B"

cp "$OUT/ShepherdsPath_ThroughTheStorm_Jun4.mp4" "$OUT/ShepherdsPath_TikTok_ThroughTheStorm.mp4"
cp "$OUT/ShepherdsPath_ScriptureMeetsYou_Jun4.mp4" "$OUT/ShepherdsPath_Reels_ScriptureMeetsYou.mp4"

echo ""
echo "==> Done:"
ls -lh "$OUT"/ShepherdsPath_*Jun4.mp4 "$OUT"/ShepherdsPath_TikTok_ThroughTheStorm.mp4 "$OUT"/ShepherdsPath_Reels_ScriptureMeetsYou.mp4 2>/dev/null
