# Execution Prompt: Generate All 13 Role Character Illustrations

## Overview

Generate 26 character illustrations for the Team page role cards (13 roles x 2 versions each). Uses the nano-banana-pro skill (Gemini image generation).

**Two versions per character:**
1. **Card portrait** (`[slug]-card.webp`) - Character only, no background scene, no text. Used on the exterior of role portal cards. Will be composited onto dark card backgrounds with HTML-rendered titles below.
2. **Full scene** (`[slug]-scene.webp`) - Character in a background scene with the character name as text on the image. Used inside the expanded portal modal when someone clicks a card. Style matches The Tinkerer and The Ranger reference images (landscape composition, scene background, character name in a banner/label).

**Save all to:** `client/public/images/roles/`

**Resolution:** 2K for all images.

**Convert to WebP after generation** (same as the test batch): `cwebp -q 85 input.png -o output.webp`

---

## Style Guide

**Overall style:** Quirky hand-drawn illustrated character design. Warm earthy tones (browns, tans, olive greens, warm golds) with green and gold nature accents. Looks like a character select screen in a cooperative board game about regenerating the earth. Each character is a distinct person with personality, posture, and attitude visible before you read the name.

**Card portraits:** Character standing, full body or 3/4 body, simple flat or transparent background (light parchment tone or transparent). No scene elements, no text, no title, no tagline. Just the character and their key props/tools. Clean edges for compositing onto dark card backgrounds.

**Full scene images:** Landscape orientation (16:9 ish). Character in the left or center of a nature scene relevant to their role. Rolling hills, forests, fields, ruins, workshops. Warm golden light (sunrise/sunset feel). The character name appears as a label/banner in the style of The Tinkerer reference (earthy banner with serif-style lettering). NO tagline text on the image. NO "Character Select" header. Just the character name.

**Character diversity:** Vary skin tones, body types, hairstyles, and ages across the 13 characters. Some younger, some older. Mix of masculine, feminine, and androgynous presentations. Everyone looks like someone who actually works with land and community.

---

## The 13 Characters

### 1. The Gardener (Season Facilitator)
- **Tagline (for HTML only, not on image):** Keeps the seasons turning
- **Slug:** `season-facilitator`
- **Character:** Warm-faced person with sun-weathered skin and a gentle smile, wearing a woven straw hat with green ribbon, earth-toned patched coat with leaf embroidery. Holding a large wooden seasonal calendar wheel divided into four sections (snowflake, flower, sun, leaf). Small plants and seedlings growing around their boots. Tool belt with pruning shears and a small journal.
- **Scene background:** A garden at the transition between seasons, one side blooming, the other side with autumn leaves. Stone path. Gentle sunrise.
- **Scene text:** `- THE GARDENER -`

### 2. The Weaver (Alliance Weaver)
- **Tagline (for HTML only):** Connects what wants to be connected
- **Slug:** `alliance-weaver`
- **Character:** Tall person with long braided hair and a knowing expression, wearing a cloak covered in constellation patterns and subtle thread designs. Threads of golden light extend from their fingertips connecting to distant points. A satchel at their hip full of sealed letters and small gifts. Wearing sturdy travel boots.
- **Scene background:** A hilltop at golden hour, looking out over a valley with distant villages connected by faintly glowing threads of light. Wind in the cloak.
- **Scene text:** `- THE WEAVER -`

### 3. The Guide (Incubator Guide)
- **Tagline (for HTML only):** Walks beside new roots
- **Slug:** `incubator-guide`
- **Character:** Sturdy person with kind eyes and weathered hands, wearing a canvas vest over a green tunic. Holding an old lantern in one hand and a hand-drawn map in the other. Compass hanging from belt. Small seedlings growing out of the top of their backpack. Muddy boots that have seen real trails.
- **Scene background:** A forest path with dappled sunlight, the trail ahead splitting into multiple directions, each marked with small wooden signposts. Ferns and new growth everywhere.
- **Scene text:** `- THE GUIDE -`

### 4. The Tender (Forum Gardener)
- **Tagline (for HTML only):** Grows conversations into community
- **Slug:** `forum-gardener`
- **Character:** Younger person with curly hair and bright eyes, kneeling in a garden. Wearing an apron with pockets full of seed packets. One hand holds a wooden watering can, the other tends to speech-bubble-shaped plants growing on vines. Small glowing comment-thread flowers blooming around them. Soil on their knees.
- **Scene background:** A cozy walled garden with trellises covered in conversation-vine plants. A small wooden bench. Warm afternoon light through the leaves.
- **Scene text:** `- THE TENDER -`

### 5. The Architect (Game Designer)
- **Tagline (for HTML only):** Designs the rules we play by
- **Slug:** `game-designer`
- **Character:** Person with glasses and an intent expression, sitting at a table covered in dice, game boards, glowing rule cards, and small figurines. Wearing a vest with geometric patterns. One hand holds a compass, the other sketches on a large piece of parchment. Scattered pencils and protractors. A cat sitting on the corner of the table watching.
- **Scene background:** A warm study or workshop with shelves of game prototypes, hanging mobiles of geometric shapes, and a window looking out onto green hills. Candle and lamp light.
- **Scene text:** `- THE ARCHITECT -`

### 6. The Keeper (Treasury Steward)
- **Tagline (for HTML only):** Balances seeds and coins
- **Slug:** `treasury-steward`
- **Character:** Older person with silver-streaked hair and a steady, trustworthy gaze. Wearing a long apron over simple clothes. Holding an old-fashioned balance scale: seeds on one side, coins on the other, perfectly balanced. A thick ledger book tucked under one arm. Round spectacles. Belt pouch with a large brass key.
- **Scene background:** A stone-walled treasury room with wooden shelves holding labeled jars of seeds and small coin pouches. A large open ledger on a standing desk. Warm lamplight. An arched window showing green outside.
- **Scene text:** `- THE KEEPER -`

### 7. The Storyteller (Storyteller)
- **Tagline (for HTML only):** Turns what happened into what matters
- **Slug:** `storyteller`
- **Character:** Person with an expressive face and animated posture, sitting cross-legged under a large tree. Writing in a leather journal. Story threads float up from the pages like wisps of golden light or fireflies, each carrying tiny images. A shoulder bag with scrolls and a camera. Ink-stained fingers. A warm scarf even in mild weather.
- **Scene background:** Under a massive old oak tree in a meadow. The floating story-threads drift up into the branches. Sunset colors. Distant mountains.
- **Scene text:** `- THE STORYTELLER -`

### 8. The Tinkerer (Grand Builder)
- **Tagline (for HTML only):** Builds the world one tool at a time
- **Slug:** `grand-builder`
- **Character:** Person with rolled-up sleeves and a focused, creative expression. Wearing a leather workshop apron with tool loops holding wrenches, code-symbol tools, and a small hammer. One hand assembles a glowing crystal module on a rustic wooden workbench. Floating instruction manuals and blueprints hover around them with sparking connections. Plants grow through cracks in the workshop floor.
- **Scene background:** An open-air workshop at the edge of a field. Half-built structures that are part physical, part digital (wooden beams merging with glowing wireframes). Tools and materials everywhere. Golden hour light.
- **Scene text:** `- THE TINKERER -`

### 9. The Ranger (Security Reviewer)
- **Tagline (for HTML only):** Keeps our digital commons safe
- **Slug:** `security-reviewer`
- **Character:** Alert, keen-eyed person in a forest ranger style outfit (earth tones with gold accents and buckles). Standing in a wooden watchtower. One hand holds a brass spyglass, the other rests on a glowing translucent shield with Celtic knot patterns. A scroll of code symbols hangs from the watchtower railing. Boots planted firmly. Confident, watchful posture.
- **Scene background:** A watchtower on a hilltop overlooking a green valley with a winding river. Sunrise behind distant mountains. The watchtower is wooden and vine-covered but solid.
- **Scene text:** `- THE RANGER -`

### 10. The Librarian (Tool Curator)
- **Tagline (for HTML only):** Organizes what the builders make
- **Slug:** `tool-curator`
- **Character:** Thoughtful person with neat hair and a calm expression, organizing a beautiful wooden shelf. Each shelf holds glowing tools of different colors, some floating gently into position as the person guides them. Wearing a cardigan over a simple shirt, reading glasses perched on head. One hand holds a tool, the other holds a small label. A step stool nearby.
- **Scene background:** A warm library or tool shed with floor-to-ceiling wooden shelves. Each tool has a hand-written label. Soft natural light from a skylight. A cozy reading nook in the corner with a mug of tea.
- **Scene text:** `- THE LIBRARIAN -`

### 11. The Cartographer (Quest Steward)
- **Tagline (for HTML only):** Maps the paths players walk
- **Slug:** `quest-steward`
- **Character:** Person with adventurous energy, leaning over a large scroll that's transforming into a winding landscape path as they draw it. Holding a glowing quill pen in one hand. The other hand traces the path on the scroll. Wearing a traveler's vest with many pockets, each holding different colored inks. A compass rose tattoo visible on one forearm. Explorer's hat tipped back on their head.
- **Scene background:** A cartographer's table set up outdoors on a cliff overlook. The landscape below mirrors the map they're drawing. Colored ink bottles and rolled scrolls on the table. Wind catching loose papers.
- **Scene text:** `- THE CARTOGRAPHER -`

### 11. The Herald (Outreach Writer)
- **Tagline (for HTML only):** Carries the signal outward
- **Slug:** `outreach-writer`
- **Character:** Energetic person with a bright expression, releasing carrier pigeons from raised hands. Each pigeon carries a sealed letter and trails a glowing ribbon of different colors. Wearing a messenger's outfit: crossbody leather satchel, sturdy boots, a short cape that catches the wind. Quill pen tucked behind one ear. Stack of sealed letters in the satchel.
- **Scene background:** A stone tower balcony overlooking a vast green landscape. Pigeons flying outward in different directions, their glowing ribbons creating paths across the sky. Morning light.
- **Scene text:** `- THE HERALD -`

### 13. The Alchemist (Skills Builder)
- **Tagline (for HTML only):** Turns code into community tools
- **Slug:** `skills-builder`
- **Character:** Person with bright, curious eyes and slightly wild hair, standing at a rustic alchemist's workbench. Assembling glowing crystal-like skill modules that emit soft colored light. Floating instruction manuals orbit around their head. Sparking connections arc between finished crystals on the shelf behind them. Wearing a leather lab coat with alchemical symbols stitched in. Goggles pushed up on forehead.
- **Scene background:** An alchemist's lab merged with a nature workshop. Stone walls with climbing vines. Shelves of glowing crystals and bottled skills. A bubbling cauldron-like forge. Sunlight streaming through a cracked ceiling.
- **Scene text:** `- THE ALCHEMIST -`

---

## Prompt Templates

For each character, run TWO generations:

### Card Portrait Prompt Template:
```
Illustrated character design, quirky hand-drawn style with warm earthy tones and green/gold nature accents. [CHARACTER DESCRIPTION]. Full body, standing pose against a simple light parchment-colored background. No text, no title, no scene background. Clean edges. Like a character token from a cooperative board game about regenerating the earth.
```

### Full Scene Prompt Template:
```
Illustrated game character card in landscape orientation, quirky hand-drawn style with warm earthy tones and green/gold nature accents. [CHARACTER DESCRIPTION]. [SCENE BACKGROUND DESCRIPTION]. A rustic banner label reads "[SCENE TEXT]" in earthy serif lettering. No other text. Warm golden light. Like a character select screen in a cooperative board game about regenerating the earth.
```

---

## Execution Steps

1. Check that the nano-banana-pro skill is available: `ls ~/.claude/skills/nano-banana-pro/scripts/generate_image.py`
2. Create output directory if needed: `mkdir -p client/public/images/roles/`
3. Generate all 26 images (13 card portraits + 13 full scenes) using the prompts above. Use 2K resolution.
4. Convert all PNGs to WebP: `for f in client/public/images/roles/*.png; do cwebp -q 85 "$f" -o "${f%.png}.webp" && rm "$f"; done`
5. Verify all 26 files exist:
   - `season-facilitator-card.webp` + `season-facilitator-scene.webp`
   - `alliance-weaver-card.webp` + `alliance-weaver-scene.webp`
   - `incubator-guide-card.webp` + `incubator-guide-scene.webp`
   - `forum-gardener-card.webp` + `forum-gardener-scene.webp`
   - `game-designer-card.webp` + `game-designer-scene.webp`
   - `treasury-steward-card.webp` + `treasury-steward-scene.webp`
   - `storyteller-card.webp` + `storyteller-scene.webp`
   - `grand-builder-card.webp` + `grand-builder-scene.webp`
   - `security-reviewer-card.webp` + `security-reviewer-scene.webp`
   - `tool-curator-card.webp` + `tool-curator-scene.webp`
   - `quest-steward-card.webp` + `quest-steward-scene.webp`
   - `outreach-writer-card.webp` + `outreach-writer-scene.webp`
   - `skills-builder-card.webp` + `skills-builder-scene.webp`
6. List all files with sizes to confirm.

---

## After Image Generation: Update gameRoles Array

Once images are generated, update the `gameRoles` array in `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md` (Part A) with these changes:

### Role name changes:
- `"Lead Builder"` -> `"Grand Builder"`
- `"Quest Author"` -> `"Quest Steward"`

### Image path changes (all roles):
Update `characterImage` to reference the card version, and add `sceneImage` for the portal interior:

```typescript
// Example for each role:
{
  title: "Season Facilitator",
  characterName: "The Gardener",
  tagline: "Keeps the seasons turning",
  characterImage: "/images/roles/season-facilitator-card.webp",
  sceneImage: "/images/roles/season-facilitator-scene.webp",
  // ... rest of role data
}
```

### Full character name + tagline mapping:

| Role Title | characterName | tagline |
|---|---|---|
| Season Facilitator | The Gardener | Keeps the seasons turning |
| Alliance Weaver | The Weaver | Connects what wants to be connected |
| Incubator Guide | The Guide | Walks beside new roots |
| Forum Gardener | The Tender | Grows conversations into community |
| Game Designer | The Architect | Designs the rules we play by |
| Treasury Steward | The Keeper | Balances seeds and coins |
| Storyteller | The Storyteller | Turns what happened into what matters |
| Grand Builder | The Tinkerer | Builds the world one tool at a time |
| Security Reviewer | The Ranger | Keeps our digital commons safe |
| Tool Curator | The Librarian | Organizes what the builders make |
| Quest Steward | The Cartographer | Maps the paths players walk |
| Outreach Writer | The Herald | Carries the signal outward |
| Skills Builder | The Alchemist | Turns code into community tools |

### Card component updates:
- **Card exterior:** Show `characterImage` (card portrait), render `characterName` as the primary display name and `title` as a smaller subtitle. Show `tagline` in white/60 text below.
- **Portal interior (modal):** Show `sceneImage` as the banner image. Show `characterName` large, `title` as subtitle, `tagline` below.
