#!/bin/bash
# Generate quest card images using nano-banana-pro
# Run from repo root: bash scripts/generate-quest-images.sh

UV="/c/Users/taren/.local/bin/uv"
SCRIPT="/c/Users/taren/.claude/skills/nano-banana-pro/scripts/generate_image.py"
ARCHIVE="/c/Users/taren/Nano Photos/quests"
PUBLIC="client/public/images/quests"
RES="1K"

GEMINI_API_KEY=$(powershell -Command "[System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY','Machine'); [System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')" 2>/dev/null | tr -d '\r' | grep -v '^$' | head -1)
export GEMINI_API_KEY

mkdir -p "$ARCHIVE" "$PUBLIC"

run_quest() {
  local id=$1 slug=$2 prompt=$3
  local fname="quest-$(printf '%02d' $id)-${slug}.png"
  echo "Generating $fname..."
  "$UV" run "$SCRIPT" --prompt "$prompt" --filename "$ARCHIVE/$fname" --resolution "$RES"
  [ -f "$ARCHIVE/$fname" ] && cp "$ARCHIVE/$fname" "$PUBLIC/$fname" && echo "  ✓ Saved $PUBLIC/$fname"
}

run_quest 0 "fire" "Sacred fire ceremony at dusk, flames dancing with gold and amber light, silhouettes of people gathered in circle around a bonfire, smoke rising to starlit sky, transformative ritual energy, cinematic nature photography style, dark moody atmospheric"

run_quest 1 "potion-brewing" "Hands carefully tending to vibrant fermented potions and herbal elixirs in glass jars, colorful tinctures and medicinal mushrooms on a rustic wooden table, warm golden light, botanical alchemy aesthetic, earthy and mystical"

run_quest 2 "saving-seeds" "Close-up of diverse seeds in open palms, heirloom vegetable seeds in wooden bowls and paper packets, seed library aesthetic, warm sunlight, earthy tones, botanical illustration style meets documentary photography"

run_quest 3 "healing-wholes" "Abundant regenerative food forest with layers of plants, fruit trees, vegetables, and herbs growing together in harmony, lush green abundance, golden hour light, aerial view of a thriving permaculture garden"

run_quest 4 "dreaming-spaces-of-love" "A beautiful family homestead at golden hour, cozy natural building with living roof, children playing in wildflower meadow, vegetable garden, a hammock strung between old trees, warm domestic paradise, painterly soft light"

run_quest 5 "rites-of-love" "Ceremony in an ancient forest grove, people in natural linen clothing dancing together on mossy ground, wildflowers woven in hair, sunbeams filtering through old-growth trees, spiritual ecology and earth connection"

run_quest 6 "healing-circles" "Diverse community gathered in an outdoor healing circle, sitting on logs and stones in a beautiful natural clearing, faces showing openness and deep listening, dappled forest light, warmth and belonging"

run_quest 7 "wild-foraging" "Close-up of hands reaching for wild berries and mushrooms in a forest, a wicker basket with foraged herbs and greens, morning light through ferns, earthy textures, rewilding and deep nourishment aesthetic"

run_quest 8 "medicine-journey" "Surreal inner landscape journey, person meditating in ancient forest with bioluminescent plants and floating light orbs, dreamlike atmosphere, psychedelic nature art, deep greens and purples, consciousness expansion"

run_quest 9 "tree-talk" "Person with hands on the bark of a massive ancient tree, mycelial network glowing beneath the forest floor, golden forest light, sense of deep communication and listening, magical realism, forest spirits"

run_quest 10 "communication-patterns" "Two people in meaningful conversation outdoors, body language open and engaged, overlapping speech shown as flowing light patterns between them, bokeh nature background, human connection and relational intelligence"

run_quest 11 "coordination-patterns" "Bird's eye view of people organizing together around a shared project in nature, colorful strings connecting ideas on a wall, natural building site, cooperative movement energy, community coordination"

run_quest 12 "breathplay-future-dreaming" "Person lying in meadow with eyes closed, breath visible as golden light, dreaming clouds with future visions of regenerative civilization, stars and cosmos overhead, visionary and peaceful, future dreaming aesthetic"

echo ""
echo "All quest images done!"
