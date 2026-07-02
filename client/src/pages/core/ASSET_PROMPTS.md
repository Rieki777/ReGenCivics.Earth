# CORE image asset prompts (for Claude Code to generate)

Every image on `core.regencivics.earth` is generated with the `nano-banana-pro` skill (Google Nano Banana Pro / Gemini 3 Pro Image). This file is the single source of truth for the full prompts, filenames, sizes, and alt text. Regenerate from here to keep the set consistent.

## How to generate

Requires `GEMINI_API_KEY` in the environment (Rye sets this, see the handoff in the main build guide). Run from the repo root. Use the STABLE descriptive filenames below (not the timestamped pattern), because these are site assets.

Command template:

```bash
GEMINI_API_KEY="$GEMINI_API_KEY" uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "PROMPT TEXT HERE" \
  --filename "client/public/core/raw/FILENAME.png" \
  --resolution 4K
```

The `--resolution` flag sets the pixel budget (1K, 2K, 4K), not the aspect ratio. Aspect is steered by the composition words in the prompt. After generation, post-process each raw PNG with `sharp`: crop to the target aspect, resize to the listed widths, export AVIF + WebP (+ a JPEG fallback for OG), generate a 24px blurred LQIP data URI, then upload to R2 (`assets.regencivics.earth/core/...`) and reference through the `/api/img` proxy with `srcset`. Keep the raw PNGs out of git (add `client/public/core/raw/` to `.gitignore`).

## Shared style preamble

Prepend this exact block to every scene prompt so the whole set shares one art style:

> Painterly storybook illustration in an enchanted-forest solarpunk style, a regenerative future where nature and gentle living technology have grown into one, magical and hopeful without ever feeling artificial. Hand-painted texture with soft edges, subtle grain, and luminous highlights. Warm, reverent, hopeful, alive, touched with quiet wonder. Soft golden dawn light and gentle atmosphere, with a delicate bioluminescent glow woven through the living world: moss and mycelium that hold a faint inner light, motes of light drifting like slow fireflies, a crystalline clarity to the air. Where architecture or tools appear, they are grown rather than built: living wood, woven vine, and soft crystal, never metal or machinery. Color palette centered on deep forest greens (#0d2818, #1a472a, #2d5a3d), spring green (#7dd87d), warm parchment cream (#f8f5f0, #f0ebe3), and amber-gold accents (#d4a574, #ffd700), with a soft bioluminescent teal (#4a9f9f) used sparingly as a hint of magic, never dominant. A sense of living systems, reciprocity, and abundance. Where people appear they are fully human, ordinary and dignified, no pointed ears and no fantasy creatures, simply touched by the same soft magic and light as the world around them. Diverse, tender, warm. No text, no lettering, no logos, no watermarks, no UI elements, no borders. One cohesive art style across the whole set.

Note on tone: this borrows the "solarpunk meets elven meets regenerative future" feeling used for the ReGen Civics role character art (grown-not-built materials, bioluminescence, crystal and mycelium instead of leather and iron), but CORE keeps its people fully human. No pointed ears, no fantasy creatures. The magic lives in the light and the living world around them, not in the people themselves.

Note on abundance: wherever the composition allows, every scene is rich with the more-than-human world, food forests and fruiting trees, fungi and mushrooms, and wildlife at ease among people. Nothing is barren, empty, or sterile. This is a thriving regenerative future where humanity and all life flourish together in beauty. (The one exception is the CORE emblem, item 12, which stays a simple abstract mark and does not take this treatment.)

---

## 1. Home hero
- File: `home-hero` | Composition: wide 16:9 | Resolution: 4K | Output widths: 2400, 1600, 1000, 640 | Aspect target: 16:9
- Used: Home page hero background (with a soft parchment gradient over the lower third for headline legibility).
- Alt: "A community tending a food forest at dawn, sunlight through the trees."
- Prompt (preamble + this):
> Wide 16:9 composition. Dawn over a thriving food forest on gently rolling land, heavy with fruit: figs, apples, citrus, berries. A small group of diverse people of different ages tending the earth together, planting and gathering, unhurried and joyful. Layers of fruit trees, cedars, and garden beds receding into golden morning mist, threads of soft bioluminescent light drifting between the trees like slow fireflies. Songbirds and butterflies move through the branches, a deer grazes calmly at the treeline, and small mushrooms dot the leaf litter. The whole scene feels like a single living organism breathing, thriving and abundant. Depth and openness, room for a headline in the lower portion.

## 2. Faith
- File: `faith-seed` | Composition: 4:3 | Resolution: 4K | Output widths: 1600, 1000, 640 | Aspect target: 4:3
- Used: Our Faith page, top section.
- Alt: "Two hands lowering a single seed into dark, living soil."
- Prompt (preamble + this):
> Close, reverent 4:3 composition. Two cupped human hands lowering a single pale seed into dark, crumbling, living soil rich with faintly glowing mycelium, tiny roots, and a small mushroom at the edge of the frame. A thread of soft golden light travels between the hand and the seed, suggesting a bond of knowing. A curling fern frond softly out of focus behind the hands. Shallow depth of field, sacred and quiet.

## 3-8. Program vignettes (six, square)
All six: Composition square 1:1 | Resolution 2K | Output widths 800, 480 | Aspect target 1:1. Used as the Programs page cards (replace the emoji).

### 3. Online gatherings
- File: `program-gathering`
- Alt: "People gathered in a warm circle of light around a glowing seedling."
- Prompt (preamble + this):
> Square 1:1 composition. A warm circle of diverse faces gathered close in soft candle and firelight around a single glowing seedling at the center, ferns and small flowering plants ringing the circle, a moth drawn to the light, as if meeting across distance yet fully present. Intimate, tender, luminous.

### 4. Feeding those in need
- File: `program-meal`
- Alt: "Hands sharing bowls of food across a long outdoor table."
- Prompt (preamble + this):
> Square 1:1 composition. Many hands passing bowls of colorful, abundant food across a long wooden table outdoors under fruit trees heavy with citrus and grapes, dappled golden light. Songbirds in the branches above, a vine of grapes trailing along the table's edge, bees drifting past. Generosity in motion, food moving from hand to hand.

### 5. Healing circles
- File: `program-healing`
- Alt: "People sitting in a gentle circle, one hand resting on another."
- Prompt (preamble + this):
> Square 1:1 composition. A gentle healing circle of people seated on the grass at dusk beneath a fruiting tree, one hand resting softly on another's shoulder, soft candlelight, fireflies rising around them, a fox resting quietly at the circle's edge. An atmosphere of safety and being held. Calm and warm, nothing clinical.

### 6. Food forest planting
- File: `program-planting`
- Alt: "Hands pressing a young sapling into rich earth."
- Prompt (preamble + this):
> Square 1:1 composition. Close view of hands pressing a young fruit-tree sapling into rich dark earth threaded with the faint glow of mycelium and dotted with small mushrooms, other saplings and a watering can nearby, a rabbit in soft focus in the background, morning light. Hopeful, grounded, tactile.

### 7. Community gatherings / seasonal ceremony
- File: `program-ceremony`
- Alt: "People around a small fire under a starlit sky in a forest clearing."
- Prompt (preamble + this):
> Square 1:1 composition. A small sacred fire in a forest clearing at night, diverse people gathered around it in celebration, sparks rising toward a starlit sky, warm amber glow on their faces, fruit trees ringing the clearing and an owl watching quietly from a branch above. Festive and reverent.

### 8. Sacred music
- File: `program-song`
- Alt: "People singing together with open, joyful faces."
- Prompt (preamble + this):
> Square 1:1 composition. A cluster of diverse people singing together outdoors at the edge of a food forest, faces open and joyful, mouths mid-song, soft golden light, fruiting vines overhead, a few leaves drifting, butterflies and a deer at the wood's edge. Music made visible as gentle waves of warm light.

## 9. Elders (Anastasia)
- File: `elders-anastasia` | Composition: vertical 3:4 portrait | Resolution: 4K | Output widths 900, 600 | Aspect target 3:4
- Used: Elders page, the Anastasia profile block (replaces the plain gradient portrait).
- IMPORTANT: symbolic and non-identifiable. Do not depict a specific, recognizable real person. Represent a spirit of the forest and the land.
- Alt: "A symbolic figure standing in a sunlit cedar forest, seen softly from behind."
- Prompt (preamble + this):
> Vertical 3:4 portrait composition. A symbolic, non-identifiable figure standing barefoot in a sunlit cedar forest, seen softly from behind or in gentle silhouette, long hair catching golden light, one hand resting on a tall cedar whose bark holds a faint thread of bioluminescent moss. Ferns, small mushrooms, and wildflowers grow at the roots, and a deer or fox is glimpsed softly in the background. She reads as a spirit of the forest and the land rather than a portrait of any specific person. Fully human, no pointed ears. Do not show a clear, recognizable face. Serene, luminous, timeless.

## 9b. Elders (Yeshua)
- File: `elders-yeshua` | Composition: vertical 3:4 portrait | Resolution: 4K | Output widths 900, 600 | Aspect target 3:4
- Used: Elders page, the Yeshua profile block.
- IMPORTANT: symbolic and non-identifiable. Do not depict a specific, recognizable real person, and do not use the iconic conventional image of Jesus. Represent a spirit of peace and the living law of love.
- Alt: "A symbolic figure walking a sunlit path through a green garden at dawn, seen softly."
- Prompt (preamble + this):
> Vertical 3:4 portrait composition. A symbolic, non-identifiable male figure walking a sunlit path through a green garden at dawn, seen softly from behind or in gentle silhouette, robed in simple flowing cloth, one hand open at his side. Around him a thriving garden of fig and olive trees heavy with fruit, running water catching the light, doves and small birds, a faint bioluminescent glow in the moss along the path. He reads as a spirit of peace and the living law of love rather than a portrait of any specific person. Fully human. Do not show a clear, recognizable face, and do not depict the iconic conventional image of Jesus. Calm, luminous, timeless.

## 10. Donate
- File: `donate-seed-to-tree` | Composition: wide 16:9 | Resolution: 2K | Output widths 1600, 1000, 640 | Aspect target 16:9
- Used: Donate page hero.
- Alt: "A seed passing between two hands and growing into a great tree of light."
- Prompt (preamble + this):
> Wide 16:9 composition. On the left, a seed resting in an open hand; a ribbon of golden light flows rightward where the same light blossoms into a great, generous fruit-laden tree sheltering small figures beneath it, its branches heavy with fruit and nesting birds, small animals resting peacefully among its roots. Giving becoming abundance, light passing from hand to hand.

## 11. Transparency
- File: `transparency-open-hand` | Composition: wide 16:9 | Resolution: 2K | Output widths 1600, 1000, 640 | Aspect target 16:9
- Used: Transparency page header.
- Alt: "An open hand holding a small glowing ledger of light."
- Prompt (preamble + this):
> Wide 16:9 composition. A single open, upturned hand holding a small open book or ledger made of soft golden light, pages glowing, nothing hidden. A single leaf and a small mushroom rest quietly beside the hand, the only nod to the living world in an otherwise spare frame. Honesty and openness, clean and calm, plenty of negative space.

## 12. CORE emblem (logo mark)
- File: `core-emblem` | Composition: square 1:1, centered, transparent background | Resolution: 2K | Output widths 256, 128, 64, 32 (also export favicon .ico)
- Used: nav brand mark (replaces the CSS gradient circle) and favicon.
- Alt: "The CORE emblem, a sprouting seed inside a circle."
- Prompt (preamble + this):
> Square 1:1, centered, flat vector-like emblem on a fully transparent background. A single sprouting seed with two small leaves rising from a stylized curved horizon, enclosed in a clean circular ring. Simple, balanced, iconic, two or three colors only (forest green, spring green, amber). No text. Reads clearly at small sizes.

## 13. 404 page
- File: `not-found-404` | Composition: 4:3 | Resolution: 2K | Output widths 1000, 640 | Aspect target 4:3
- Used: in-theme 404 page.
- Alt: "A small glowing seedling on a forked forest path at dusk."
- Prompt (preamble + this):
> 4:3 composition. A single small glowing seedling growing at a gentle fork in a mossy forest path at dusk, the path edged with faintly bioluminescent moss and small glowing mushrooms, fireflies drifting, a rabbit pausing at the fork, inviting rather than sad. A quiet sense of being a little lost but safe, the path ahead soft and green.

---

## Open Graph share cards (generated in code, not here)
Do not generate OG cards as separate art. In `server/routes/og.ts`, compose each page's OG card (1200x630) at request time by cropping that page's hero illustration to 1.91:1, darkening the lower third, and overlaying the page title in the display font plus the CORE emblem. This keeps share cards consistent with the pages and easy to update.

## Acceptance criteria for the asset phase
- Every file above exists in AVIF + WebP at the listed widths, on R2, served via `/api/img`.
- Every `<img>` has the alt text listed here and a LQIP blur placeholder.
- No raw PNGs committed to git.
- The Anastasia image shows no recognizable real person.
- Lighthouse: images do not regress LCP below the budget in the main guide.
