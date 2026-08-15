#!/usr/bin/env bash
#
# process-raw-video.sh — ReGen Civics raw footage assembly pipeline
#
# You record. This does the unglamorous 80%: audio normalization, transcript,
# styled captions, and per-platform crops. No avatars, no generation. Real
# footage in, post-ready video out.
#
# Usage:
#   ./scripts/process-raw-video.sh input.mp4 [output_dir] [--no-burn] [--trim-silence]
#
# Outputs (in output_dir, default ./video-out/<basename>/):
#   vertical.mp4   1080x1920  — Instagram Reel / Facebook Reel (captions burned)
#   square.mp4     1080x1080  — IG/FB feed (captions burned)
#   wide.mp4       1920x1080  — LinkedIn native (captions NOT burned; upload
#                               captions.srt alongside — LinkedIn supports SRT
#                               and clean video reads better there)
#   captions.srt              — sidecar transcript for native upload + alt text
#   transcript.txt            — plain text (paste into /admin-create as source!)
#   thumb-1..3.jpg            — thumbnail candidates from 20/50/80% marks
#   manifest.json             — what was produced, from what, with what settings
#
# Recording notes (these make center-crop work):
#   - Frame yourself CENTER. All crops are center crops.
#   - Record 4K landscape if you can; 1080 vertical crop needs the pixels.
#   - Get the mic close. Normalization fixes levels, not room echo.
#
# Requirements (WSL2):
#   sudo apt install ffmpeg
#   pip install faster-whisper   # uses the RTX 3050 if CUDA is set up
#   # fallback: pip install openai-whisper
#
# ffmpeg and a whisper are the only hard requirements. Timestamp math uses awk
# and the manifest is written directly, so neither jq nor bc is needed: both
# are absent from Git Bash on Windows, and this should run there too.
#
set -euo pipefail

INPUT="${1:?Usage: process-raw-video.sh input.mp4 [output_dir] [--no-burn] [--trim-silence]}"
BASENAME="$(basename "${INPUT%.*}")"
OUTDIR="${2:-./video-out/$BASENAME}"
BURN=1
TRIM=0
for arg in "$@"; do
  [ "$arg" = "--no-burn" ] && BURN=0
  [ "$arg" = "--trim-silence" ] && TRIM=1
done

mkdir -p "$OUTDIR"
WORK="$OUTDIR/.work"
mkdir -p "$WORK"

echo "==> [1/5] Normalizing audio (EBU R128 loudnorm)..."
SILENCE_FILTER=""
if [ "$TRIM" = "1" ]; then
  # Trims silences longer than 1s down; conservative on purpose. Review output.
  SILENCE_FILTER="silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-45dB,"
fi
ffmpeg -y -i "$INPUT" \
  -af "${SILENCE_FILTER}loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy -c:a aac -b:a 192k \
  "$WORK/normalized.mp4" 2>"$WORK/ffmpeg-normalize.log" || {
    # silenceremove needs re-encode of audio against copied video; if the
    # container fights back, re-encode video too.
    echo "    (retrying with full re-encode)"
    ffmpeg -y -i "$INPUT" \
      -af "${SILENCE_FILTER}loudnorm=I=-16:TP=-1.5:LRA=11" \
      -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k \
      "$WORK/normalized.mp4" 2>>"$WORK/ffmpeg-normalize.log"
  }

echo "==> [2/5] Transcribing..."
SRT="$OUTDIR/captions.srt"
if command -v faster-whisper >/dev/null 2>&1; then
  faster-whisper "$WORK/normalized.mp4" --model small --output_format srt \
    --output_dir "$WORK" >/dev/null
  mv "$WORK/normalized.srt" "$SRT"
elif command -v whisper >/dev/null 2>&1; then
  whisper "$WORK/normalized.mp4" --model small --output_format srt \
    --output_dir "$WORK" >/dev/null
  mv "$WORK/normalized.srt" "$SRT"
else
  echo "ERROR: no whisper found. pip install faster-whisper (or openai-whisper)"
  exit 1
fi
# Plain transcript — paste this into /admin-create as source material so the
# post copy is generated FROM what you actually said (verifier-friendly).
sed -E 's/^[0-9]+$//; s/^[0-9:,]+ --> .*$//' "$SRT" | tr -s '\n' ' ' \
  | sed 's/  */ /g' > "$OUTDIR/transcript.txt"

# Caption style: readable on phones, bottom-anchored, no design ambitions.
# Tweak Fontsize/MarginV per taste after first run.
SUBSTYLE="FontName=Arial,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=40,Alignment=2"

# The subtitles filter resolves its path INSIDE a filter string, which MSYS
# leaves untranslated and where a Windows drive colon parses as an option
# separator, so libass just fails to open the file. Running the burn from
# $OUTDIR and naming the subtitle file bare sidesteps path escaping entirely,
# on Git Bash and WSL2 and Linux alike.
SRT_NAME="$(basename "$SRT")"

echo "==> [3/5] Exporting vertical 1080x1920 (Reels)..."
VF_VERT="crop=ih*9/16:ih,scale=1080:1920"
[ "$BURN" = "1" ] && VF_VERT="$VF_VERT,subtitles='$SRT_NAME':force_style='$SUBSTYLE'"
( cd "$OUTDIR" && ffmpeg -y -i ".work/normalized.mp4" -vf "$VF_VERT" \
  -c:v libx264 -preset fast -crf 20 -c:a copy \
  "vertical.mp4" 2>".work/ffmpeg-vertical.log" )

echo "==> [4/5] Exporting square 1080x1080 (feed) and wide 1920x1080 (LinkedIn)..."
VF_SQ="crop=ih:ih,scale=1080:1080"
[ "$BURN" = "1" ] && VF_SQ="$VF_SQ,subtitles='$SRT_NAME':force_style='$SUBSTYLE'"
( cd "$OUTDIR" && ffmpeg -y -i ".work/normalized.mp4" -vf "$VF_SQ" \
  -c:v libx264 -preset fast -crf 20 -c:a copy \
  "square.mp4" 2>".work/ffmpeg-square.log" )

# LinkedIn: clean video + sidecar SRT (upload captions.srt in the LI composer)
( cd "$OUTDIR" && ffmpeg -y -i ".work/normalized.mp4" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset fast -crf 20 -c:a copy \
  "wide.mp4" 2>".work/ffmpeg-wide.log" )

echo "==> [5/5] Thumbnails + manifest..."
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/normalized.mp4")
# ffprobe returns N/A on some containers. Keep the manifest valid JSON.
case "$DURATION" in '' | *[!0-9.]*) DURATION=0 ;; esac

# Actual 20/50/80% marks. awk instead of bc: bc is not on Git Bash for Windows.
i=1
for pct in 20 50 80; do
  AT=$(awk -v d="$DURATION" -v p="$pct" 'BEGIN { printf "%.3f", d * p / 100 }')
  ffmpeg -y -ss "$AT" -i "$WORK/normalized.mp4" -frames:v 1 -q:v 2 \
    "$OUTDIR/thumb-$i.jpg" 2>/dev/null
  i=$((i + 1))
done

# Written directly rather than through jq, which is another dependency for one
# small object. Only the input path is untrusted enough to need escaping.
json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > "$OUTDIR/manifest.json" <<EOF
{
  "source": "$(json_escape "$INPUT")",
  "durationSeconds": $DURATION,
  "captionsBurned": $([ "$BURN" = "1" ] && echo true || echo false),
  "silenceTrimmed": $([ "$TRIM" = "1" ] && echo true || echo false),
  "outputs": {
    "vertical": "vertical.mp4 (IG/FB Reel, captions burned)",
    "square": "square.mp4 (feed)",
    "wide": "wide.mp4 (LinkedIn, upload captions.srt as sidecar)",
    "srt": "captions.srt",
    "transcript": "transcript.txt (paste into /admin-create as source material)"
  }
}
EOF

echo ""
echo "Done: $OUTDIR"
echo "Next: upload outputs to R2 (assets.regencivics.earth), paste"
echo "transcript.txt into /admin-create, and let the gate decide if it's a post."
