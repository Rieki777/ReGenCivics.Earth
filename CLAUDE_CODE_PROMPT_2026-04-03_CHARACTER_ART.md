# Execution Prompt: Generate All 13 Role Character Illustrations

## Overview

Generate 26 character illustrations for the Team page role cards (13 roles x 2 versions each). Uses the nano-banana-pro skill (Gemini image generation).

**Two versions per character:**
1. **Card portrait** (`[slug]-card.webp`) - Character only, no background scene, no text. Used on the exterior of role portal cards. Will be composited onto dark card backgrounds with HTML-rendered titles below.
2. **Full scene** (`[slug]-scene.webp`) - Character in a background scene with the character name as text on the image. Used inside the expanded portal modal when someone clicks a card.

**Save all to:** `client/public/images/roles/`

**Resolution:** 2K for all images.

**Convert to WebP after generation** (same as the test batch): `cwebp -q 85 input.png -o output.webp`

---

## Style Guide

**THE VIBE: Solarpunk meets elven meets jedi meets regenerative future.** These characters live in a world that already healed. Think: Rivendell if it was built by permaculture designers with solar panels woven into living architecture. Studio Ghibli's future earth. Moss-covered technology. Bioluminescent accents. Flowing fabrics with circuitry patterns. Living wood merged with soft-glowing interfaces. Crystal and mycelium and sunlight, not leather and iron and torchlight.

**Color palette:** Deep forest greens, warm golds, bioluminescent teals and cyans, sunrise amber, living wood browns, soft white light. NOT medieval browns and grays. The world is green and alive and lit from within.

**Overall style:** Illustrated character design with a hand-painted quality. Warm and inviting, detailed but not photorealistic. The line between technology and nature is gone. Tools are grown, not forged. Clothing is woven from living fibers. Architecture behind them is part tree, part crystal, part solar membrane. Every surface has some sign of life growing on or through it.

**Card portraits:** Character standing, full body or 3/4 body, simple soft gradient or transparent background (warm green-to-gold gradient or transparent). No scene elements, no text, no title, no tagline. Just the character and their key props/tools. Clean edges for compositing onto dark card backgrounds.

**Full scene images:** Landscape orientation (16:9 ish). Character in the left or center of a solarpunk nature scene relevant to their role. Living architecture, food forests, bioluminescent groves, rooftop gardens with solar membranes, mycelium networks visible as soft glowing veins in the ground. Golden hour light, always. The character name appears as a simple clean label. NO tagline text on the image. NO "Character Select" header. Just the character name.

**CRITICAL: Every scene must feel deeply regenerative, organic, and alive.** Every scene includes visible fruiting plants (berry bushes, fruit trees, gourds, hanging figs, pomegranates, citrus, etc.) and at least one or two animals or creatures (songbirds, deer, foxes, rabbits, butterflies, dragonflies, bees, frogs, owls, hummingbirds, small lizards, etc.). This is a world of abundance. Food is growing everywhere. Animals are comfortable around people. Nothing is barren or sterile. Even the most "technological" scenes have vines bearing fruit climbing through them, pollinators buzzing past, and wildlife at ease in the background.

**Character diversity:** Vary skin tones, body types, hairstyles, and ages across the 13 characters. Some younger, some older. Mix of masculine, feminine, and androgynous presentations. Everyone looks like someone who lives deeply connected to land and community. Some have subtle bioluminescent freckles or markings. Some have hair woven with living vines or small flowers. Pointed ears on some (elven touch), not all. Flowing robes and tunics, not armor.

---

## The 13 Characters

### 1. The Gardener (Season Facilitator)
- **Tagline (for HTML only, not on image):** Keeps the seasons turning
- **Slug:** `season-facilitator`
- **Character:** Serene person with warm brown skin and silver-streaked hair woven with tiny living flowers. Wearing a flowing robe in shifting seasonal colors (green fading to gold fading to frost-blue at the hem). Holding a circular holographic seasonal wheel that floats above their open palm, each quadrant glowing with its season's energy. Bare feet in soft moss. A living-wood staff in the other hand with leaves that change color along its length. Subtle pointed ears. Eyes that hold deep patience.
- **Scene background:** A circular garden where four seasons exist simultaneously in four quadrants. Cherry blossoms heavy with fruit, summer wildflowers with bees humming through them, autumn apple and persimmon trees loaded with ripe fruit, frost-touched evergreens with a fox curled beneath. A crystal sundial in the center. Bioluminescent pathways between quadrants. A pair of songbirds on a branch. Golden hour light.
- **Scene text:** `- THE GARDENER -`

### 2. The Weaver (Alliance Weaver)
- **Tagline (for HTML only):** Connects what wants to be connected
- **Slug:** `alliance-weaver`
- **Character:** Tall, graceful person with deep copper skin and very long hair in elaborate braids threaded with thin bioluminescent fibers. Wearing a flowing cape with a subtle mycelium-network pattern that seems to shift and pulse with soft light. From their fingertips, threads of golden-green light extend outward, connecting to unseen points. A crystalline pendant at their chest pulses with a soft heartbeat glow. Travel sandals with living vine straps. Calm, far-seeing expression.
- **Scene background:** Standing on a living-wood bridge between two treehouse communities, threads of light connecting dozens of structures across a lush valley. Grapevines heavy with fruit climb the bridge railings alongside bioluminescent fungi. A hummingbird hovers near a flowering vine. Butterflies drift between the treehouses. Distant solar-membrane canopies catching sunset light. Fig trees line the valley floor.
- **Scene text:** `- THE WEAVER -`

### 3. The Guide (Incubator Guide)
- **Tagline (for HTML only):** Walks beside new roots
- **Slug:** `incubator-guide`
- **Character:** Sturdy person with warm olive skin, kind crinkled eyes, and short curly hair with a few small leaves growing naturally in it. Wearing a practical tunic with many pockets, each containing a different seedling or small crystal tool. One hand holds a softly glowing orb that projects a holographic trail map. The other hand rests gently on a young sapling growing from a portable living-soil pouch at their hip. Comfortable walking boots with moss cushion soles. Radiates trustworthy calm.
- **Scene background:** A forest path where young saplings line both sides, each one labeled with a small glowing marker. Berry bushes heavy with blueberries and raspberries grow wild along the edges. The path ahead forks into several directions, each fork marked by a living-wood archway with bioluminescent vines bearing small glowing fruit. A deer and fawn graze peacefully in a clearing to one side. Dappled golden light through a canopy. A rabbit sits near the trailhead. Small glowing wayfinding orbs floating at each fork.
- **Scene text:** `- THE GUIDE -`

### 4. The Tender (Forum Gardener)
- **Tagline (for HTML only):** Grows conversations into community
- **Slug:** `forum-gardener`
- **Character:** Young person with rich dark skin and an explosion of natural hair adorned with tiny bioluminescent flowers that glow softly. Wearing a loose linen tunic with living-thread embroidery that slowly shifts patterns. Kneeling in a garden where the plants are shaped like speech bubbles and conversation threads, tending them with a crystalline watering vessel that pours light instead of water. A small companion creature (like a luminous moth) rests on their shoulder. Expression of focused tenderness.
- **Scene background:** A sheltered courtyard garden within living architecture, where conversation-plants grow on trellises of woven light. Some plants bloom (active threads), some are budding (new discussions). Passionfruit and kiwi vines climb the living walls. A bright-feathered songbird perches on a trellis. Dragonflies hover over a small reflective pool. A comfortable seating circle in the center with moss cushions. A cat dozes on one cushion. Warm afternoon light filtering through translucent leaf-membrane walls. Strawberry plants spill over the edges of raised beds.
- **Scene text:** `- THE TENDER -`

### 5. The Architect (Game Designer)
- **Tagline (for HTML only):** Designs the rules we play by
- **Slug:** `game-designer`
- **Character:** Sharp-featured person with pale freckled skin, focused eyes behind thin crystalline glasses, and auburn hair pulled back loosely. Wearing a fitted vest with geometric bioluminescent patterns over a simple tunic. Seated at a floating holographic workstation covered in game board projections, rule-card holograms, and small glowing figurines that move on their own. One hand manipulates a 3D holographic model of interconnected systems. Scattered around them: crystalline dice, a compass made of living wood, sketched designs on translucent leaf-paper. A small fern grows from the corner of their desk.
- **Scene background:** A sun-drenched design studio in a treehouse, one wall entirely open to a view of green canopy with visible mango and avocado trees. Holographic game prototypes float around the room. Shelves of crystalline prototypes and living-wood models. A real cat (ginger, warm) sleeps on a beam overhead. A bowl of fresh figs and pomegranates on the desk. Bees drift past the open wall. A small gecko clings to a vine on the ceiling.
- **Scene text:** `- THE ARCHITECT -`

### 6. The Keeper (Treasury Steward)
- **Tagline (for HTML only):** Balances seeds and coins
- **Slug:** `treasury-steward`
- **Character:** Older person with deep brown skin, silver locs, and a steady, trustworthy gaze that has seen many seasons. Wearing a long flowing robe with subtle golden thread throughout, like veins of a leaf. Holding a floating balance scale made of crystallized light: seeds on one side, glowing tokens on the other, perfectly balanced. A holographic ledger orbits slowly around their other hand, numbers and flows visible as streams of light. Round spectacles with a soft golden tint. A large living-wood key hangs from a chain at their waist.
- **Scene background:** A treasury chamber grown from living crystal and wood. Shelves hold jars of seeds and containers of softly glowing tokens, interspersed with potted citrus trees heavy with lemons and oranges. A large holographic ledger display shows flows of resources as rivers of light. Sunlight enters through a crystal ceiling where a vine of golden grapes has woven itself through. An owl perches calmly on a high shelf. A small tortoise walks slowly across the floor. Everything is transparent, open, visible.
- **Scene text:** `- THE KEEPER -`

### 7. The Storyteller (Storyteller)
- **Tagline (for HTML only):** Turns what happened into what matters
- **Slug:** `storyteller`
- **Character:** Expressive person with warm tawny skin and animated dark eyes, sitting cross-legged on a floating moss platform. Writing in a journal made of living leaf-pages with a stylus that leaves trails of soft light. Story-threads rise from the pages as wisps of golden bioluminescence, each carrying tiny holographic scenes. Their clothes are loose and comfortable, a draped wrap in sunset colors. A camera-like crystal device hangs from a strap. Ink-like bioluminescent markings on their hands (from the writing). Hair is medium-length and windswept, with a few small feathers woven in.
- **Scene background:** Beneath a massive ancient fruit tree (figs and pears hanging from branches) in a meadow, its roots glowing with soft mycelium light. The story-threads drift up into the branches and become tiny floating scenes visible in the canopy. Fireflies beginning to emerge in the warm dusk. A fox sits among the listeners, ears forward. Butterflies rest on wildflowers. Sunset colors. Distant solarpunk spires on the horizon. Other listeners sit nearby, drawn to the stories. A basket of freshly picked fruit sits beside them.
- **Scene text:** `- THE STORYTELLER -`

### 8. The Tinkerer (Grand Builder)
- **Tagline (for HTML only):** Builds the world one tool at a time
- **Slug:** `grand-builder`
- **Character:** Strong-armed person with medium brown skin, rolled-up sleeves, and a focused creative expression. Wearing a living-fiber workshop apron with tool loops that hold hybrid tools: part crystal, part living wood, part soft-glowing circuitry. One hand assembles a glowing module on a workbench that's half living wood, half holographic interface. Floating schematics and instruction-holograms orbit their workspace. Plants grow through cracks in everything. Goggles pushed up on forehead with bioluminescent lenses. Sawdust and pollen in their hair.
- **Scene background:** An open-air workshop at the edge of a food forest with visible banana palms, breadfruit trees, and tomato vines climbing the workshop posts. Half-built structures that seamlessly merge living wood, crystal, and soft-glowing technological elements. Solar membrane canopy overhead. A robin hops along the workbench. Bees pollinate squash blossoms growing around the base of a half-built arch. Tools and living materials everywhere. The boundary between building and growing is invisible. Golden hour light.
- **Scene text:** `- THE TINKERER -`

### 9. The Ranger (Security Reviewer)
- **Tagline (for HTML only):** Keeps our digital commons safe
- **Slug:** `security-reviewer`
- **Character:** Alert, keen-eyed person with dark skin and short natural hair, carrying themselves with quiet confidence. Wearing a fitted ranger-style outfit in forest greens and golds with subtle bioluminescent circuitry patterns along the seams. Standing in a living-wood watchtower. One hand holds a crystalline spyglass that shows holographic overlays of what it sees. The other hand rests on a translucent shield made of woven light with sacred geometry patterns. A scroll of glowing code-symbols unfurls from a belt pouch. Boots with living-root grip soles. Watchful, protective energy.
- **Scene background:** A watchtower grown from a living tree on a hilltop, overlooking a green valley with a winding bioluminescent river. The watchtower tree bears large peaches and the branches host a nesting hawk. The watchtower has crystal sensor arrays woven into its branches. A loyal wolf-like companion rests at the base of the tower. Sunrise behind mountains. The valley below is a patchwork of orchards, food forests, and garden plots. Peaceful but alert atmosphere.
- **Scene text:** `- THE RANGER -`

### 10. The Librarian (Tool Curator)
- **Tagline (for HTML only):** Organizes what the builders make
- **Slug:** `tool-curator`
- **Character:** Thoughtful person with light brown skin, neat shoulder-length hair, and a calm collected expression. Wearing a comfortable cardigan woven from living fibers over a simple tunic, crystalline reading glasses perched on their head. Standing before a wall of floating shelves where tools hover in place, each one softly glowing its own color, some drifting gently into new positions as the person guides them with small hand gestures. One hand holds a tool, examining it. The other hand holds a small holographic label. A mug of something warm floats beside them on a tiny platform of woven light.
- **Scene background:** A warm, bright library-workshop hybrid inside a living-crystal structure. Floor-to-ceiling shelves of glowing tools, each with a holographic label. Herb pots (basil, rosemary, lavender) line the windowsills. A potted dwarf lemon tree in the corner bears ripe fruit. Soft natural light from a living-crystal skylight where a pair of doves roost. A cozy reading nook with moss cushions and climbing vines bearing small berries. A friendly tabby cat weaves between shelves. Everything is organized, peaceful, inviting.
- **Scene text:** `- THE LIBRARIAN -`

### 11. The Cartographer (Quest Steward)
- **Tagline (for HTML only):** Maps the paths players walk
- **Slug:** `quest-steward`
- **Character:** Adventurous person with light skin, bright curious eyes, and windswept reddish hair. Wearing a traveler's vest with many pockets over flowing clothes, each pocket holding different colors of bioluminescent ink. Leaning over a large holographic map that transforms into a living landscape as they draw on it with a glowing stylus. The stylus leaves trails that become winding paths through projected terrain. A compass rose tattoo on one forearm pulses with soft light. Explorer's goggles pushed back on their head.
- **Scene background:** A cartographer's station set up on a cliff overlook, the actual landscape below mirroring the holographic map on their table. Wild olive and walnut trees frame the cliff edge. Crystalline ink bottles and floating scroll-holograms around the table. An eagle circles in the middle distance. Wind catching translucent papers. The paths on the map below glow faintly where players have walked them, winding through orchards and food forests. A lizard suns itself on a warm rock nearby. Vast green horizon.
- **Scene text:** `- THE CARTOGRAPHER -`

### 12. The Herald (Outreach Writer)
- **Tagline (for HTML only):** Carries the signal outward
- **Slug:** `outreach-writer`
- **Character:** Energetic person with bronze skin and a bright, open expression. Releasing luminous bird-like creatures (not quite birds, more like origami light-forms) from raised hands. Each light-bird carries a sealed message and trails a different colored bioluminescent ribbon as it flies. Wearing a messenger's outfit: a crossbody satchel of living leather, comfortable travel clothes in warm tones, a short cape with solar-membrane lining that catches light. A crystalline quill tucked behind one ear. Stack of sealed letter-crystals visible in the satchel. Energy of someone who loves what they carry.
- **Scene background:** A balcony on a tall living-crystal tower overlooking a vast green landscape of orchards, terraced gardens, and food forests. Jasmine and passionfruit vines climb the tower walls, buzzing with bees. Light-birds flying outward in every direction, their glowing ribbons creating a web of paths across the sky. Real swallows fly alongside the light-birds. A potted pomegranate tree sits on the balcony rail, fruit splitting open. Morning light breaking through clouds. Other communities visible in the distance, connected by the light-trails.
- **Scene text:** `- THE HERALD -`

### 13. The Alchemist (Skills Builder)
- **Tagline (for HTML only):** Turns code into community tools
- **Slug:** `skills-builder`
- **Character:** Person with olive skin, bright curious eyes, and slightly wild dark hair with bioluminescent streaks. Standing at a workbench that's part alchemist's lab, part living organism. Assembling glowing crystalline skill-modules that emit soft colored light and hum with energy. Floating holographic instruction manuals orbit around their head like a halo. Sparking connections arc between finished skill-crystals on the shelf behind them. Wearing a living-fiber lab coat with alchemical and circuit symbols that shift and change. Goggles on forehead with iridescent lenses. Expression of someone in creative flow.
- **Scene background:** An alchemist's lab grown inside a hollow crystal-tree. Living walls with climbing bioluminescent vines bearing glowing berries. Shelves of glowing skill-crystals and bottled abilities next to jars of dried herbs and hanging bundles of lavender and sage. A forge-like structure that's part cauldron, part living reactor, emitting soft warm light. A curious raven perches on the cauldron's rim. Mushrooms (chanterelles, lion's mane) grow from the living walls. Sunlight streaming through the crystal walls, refracting into rainbows. Frogs sit on lily pads in a small water feature. The boundary between magic and technology doesn't exist here.
- **Scene text:** `- THE ALCHEMIST -`

---

## Prompt Templates

For each character, run TWO generations:

### Card Portrait Prompt Template:
```
Solarpunk illustrated character design, hand-painted style with warm greens, golds, and bioluminescent accents. [CHARACTER DESCRIPTION]. Full body, standing pose against a simple soft green-to-gold gradient background. No text, no title, no scene background. Clean edges. Futuristic regenerative aesthetic where nature and technology are one. Like a character select screen in a solarpunk cooperative game about healing the earth.
```

### Full Scene Prompt Template:
```
Solarpunk illustrated game character card in landscape orientation, hand-painted style with warm greens, golds, and bioluminescent teal accents. [CHARACTER DESCRIPTION]. [SCENE BACKGROUND DESCRIPTION]. A clean minimal label reads "[SCENE TEXT]" in elegant thin lettering. No other text. Golden hour light. Futuristic regenerative world where nature and technology have merged. Abundant fruiting plants and comfortable wildlife visible throughout the scene. Like a character card from a solarpunk game about the regenerative renaissance.
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
