#!/bin/bash
# Generate return-card images using nano-banana-pro
# Run from repo root: bash scripts/generate-return-card-images.sh

UV="/c/Users/taren/.local/bin/uv"
SCRIPT="/c/Users/taren/.claude/skills/nano-banana-pro/scripts/generate_image.py"
ARCHIVE="/c/Users/taren/Nano Photos/return-cards"
PUBLIC="client/public/images/return-cards"
RES="1K"

GEMINI_API_KEY=$(powershell -Command "[System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY','Machine'); [System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')" 2>/dev/null | tr -d '\r' | grep -v '^$' | head -1)
export GEMINI_API_KEY

mkdir -p "$ARCHIVE" "$PUBLIC"

run_card() {
  local slug=$1 prompt=$2
  local fname="${slug}.png"
  echo "Generating $fname..."
  "$UV" run "$SCRIPT" --prompt "$prompt" --filename "$ARCHIVE/$fname" --resolution "$RES"
  [ -f "$ARCHIVE/$fname" ] && cp "$ARCHIVE/$fname" "$PUBLIC/$fname" && echo "  ✓ Saved $PUBLIC/$fname"
}

run_card "journey-quests" "A glowing map with a winding trail through a regenerative landscape, quest waypoints marked with golden stars, mythic journey aesthetic, illustrated adventure map style, parchment and nature tones"

run_card "next-quest" "A luminous door opening in an ancient forest, golden light pouring through, path continuing beyond, sense of next chapter and exciting adventure, mythic quest fantasy style"

run_card "community" "Diverse community members gathered in vibrant conversation in an online-meets-nature forum space, speech bubbles as flowers, warm belonging and connection, digital community aesthetic meets nature"

run_card "opportunity" "Elegant investment dashboard with growing regenerative land charts, green and gold upward trends, aerial view of thriving land project, sophisticated impact investing aesthetic"

run_card "accelerator" "A seedling becoming a towering tree in time-lapse frames, each stage more vibrant, surrounded by mentors and support, accelerator growth metaphor, regenerative business and nature intertwined"

run_card "schedule" "A calendar page transforming into a blooming flower, a friendly face on video call in a cozy nature-filled home office, warm discovery conversation, regenerative connection aesthetic"

echo ""
echo "All return-card images done!"
