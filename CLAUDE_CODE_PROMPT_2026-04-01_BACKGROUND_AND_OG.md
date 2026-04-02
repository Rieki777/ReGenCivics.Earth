# Background Image and OG Image Generation
## Created: 2026-04-01

This prompt covers two deliverables:
- **Part A:** New homepage background (tall, scrolling, multi-scene journey)
- **Part B:** New OG image (1200x630, social-sharing-ready)

Both use the nano-banana-pro image generation skill.

---

## Context

The homepage (`client/src/pages/Home.tsx`) uses `PageBackground` with
`scrollWithPage={true}`. The background image sits behind all page sections
from the hero through the newsletter footer. It needs to be:
- Wide enough to fill desktop screens (min 1920px wide)
- Tall enough to cover the full page scroll (generate at 4K, we'll composite vertically)
- Dark enough that section overlays (0.35-0.65 opacity, blend `18, 45, 28`) still
  let text read cleanly

Current images: `client/public/images/backgrounds/home-desktop.webp` and
`home-mobile.webp`. These need to be replaced.

OG image lives at: `client/public/og-default.jpg` (must be 1200x630px).
Referenced in `client/index.html` lines 57-77 and `client/src/components/SEO.tsx`.

---

## Part A: Homepage Background Image

### Visual Journey (top to bottom)

Generate a **vertical panorama** that reads as one continuous world. Each
panel flows into the next. The tonal journey goes:
**celestial night → warm village dusk → lush golden day → deep forest
twilight → underground mystery → cosmic overview** — then back to stars,
completing a circle.

Use the nano-banana-pro skill to generate each panel at 4K resolution, then
composite them vertically with ImageMagick or PIL into a single tall PNG.
Final output should be roughly 2560px wide × 8000px tall (or taller if needed
to fill the page). Save as both:
- `client/public/images/backgrounds/home-desktop.webp` (2560×8000, quality 85)
- `client/public/images/backgrounds/home-mobile.webp` (768×4000, quality 85)

---

### Panel 1 — Celestial Opening (top ~15% of image)

**Prompt:**
Epic panoramic night-into-sunset sky transitioning from deep indigo at the
top to warm amber and rose at the horizon. Full Milky Way arc visible with
dense star fields and nebulae. Sweeping aurora borealis in greens and purples
and teals, long curtains of light dancing across the sky. Below the aurora, a
wide valley with a winding river catching the last light. A small village of
warm lights and rounded earthen homes sits at the river bend. Diverse humans
and children are tiny specks gathered at the water. Ancient fruit trees heavy
with apples and oranges line the riverbank. A few deer stand at the water's
edge. Lush, painterly, luminous. High fantasy realism, not cartoon.
Aspect: ultra-wide panoramic landscape.

---

### Panel 2 — Regenerative Village Life (next ~20%)

**Prompt:**
Warm golden-hour light over a thriving regenerative village. Treehouses with
rope bridges connect ancient oaks. Round earthen homes with living roofs
covered in herbs and flowers. A central commons with communal fire circle,
medicinal herb garden, beehives. People of all ages and skin tones working
together: harvesting vegetables, weaving, playing music, sharing food. A woman
in a wide-brimmed hat tends a mandala garden. Children run between the trees.
Dogs, cats, goats. A waterfall feeds a natural swimming pool. Lush, abundant,
joyful. Painterly high-fantasy realism. Seamlessly connected to the night sky
panel above and food forest below.

---

### Panel 3 — Food Forest and Quests (next ~20%)

**Prompt:**
Dense ancient food forest at the magic hour, canopy filtering golden light
into cathedral shafts. Towering chestnut, walnut, persimmon, and mulberry
trees hung with climbing plants and mushrooms. Winding stone trails through
layers of abundance: berry bushes, medicinal herbs, nitrogen-fixing shrubs.
Glowing carved stone waymarkers along the path that read QUEST in ancient
runic script. A stone archway portal covered in living vines glows with
soft amber light, opening to another realm. Hints of elven craftsmanship:
carved wooden bridges, mossy stone towers blending into tree trunks, lanterns
made of living crystal. The aesthetic is regenerative elven civilization:
ancient yet timeless, functional yet beautiful, earthy yet magical. Rich
detail, lush painterly style.

---

### Panel 4 — Futuristic Regenerative City (next ~20%)

**Prompt:**
A regenerative city of the future embedded in living forest. Sweeping organic
architecture: spiraling towers grown from living wood and woven bamboo,
crystal domes filled with food gardens, waterways running through and between
buildings. Solar panels shaped like leaves. Mycelium-inspired pedestrian
bridges arcing between tree-level platforms. The city hums with life: markets,
workshop spaces open to the canopy, children learning in open-air schools,
elder councils under great trees. The aesthetic is ancient elven wisdom meets
post-scarcity technology: think Rivendell built by permaculturists with access
to bioluminescent materials. Warm amber and deep green tones. The forest is
not backdrop — it IS the city. Painterly high-fantasy realism, ultra-detailed.

---

### Panel 5 — Underground: Mycelia and Crystal Kingdoms (next ~15%)

**Prompt:**
Cross-section view of the underground world below the regenerative city.
Enormous mycelium networks glow with soft bioluminescent blue-white light,
spanning across the scene like a living internet — the wood wide web. Giant
ancient tree roots descend from above, thick as pillars, trading nutrients
through glowing fungal nodes. Deep veins of crystal formations in amethyst,
quartz, and citrine catch and refract the mycelium's light. Cave systems open
into vast underground chambers where small humanoid beings work and tend the
root networks. Mushroom forests: chanterelles, lion's mane, reishi the size
of boulders. The atmosphere is sacred, ancient, alive. Rich dark blues and
purples lit by soft natural bioluminescence. Painterly, otherworldly.

---

### Panel 6 — Earth Overview and Return to Stars (bottom ~10%)

**Prompt:**
A seamless transition from underground up through soil, through ocean, into
atmosphere, and into space. The curvature of the Earth appears with the
terminator line visible — half in night, half in golden day. Continents
visible with green regenerated forests spreading across them. From this
altitude the aurora borealis is visible as a halo of light above the poles.
The Milky Way fills the upper portion of the frame. This panel mirrors and
echoes Panel 1 — the same stars, the same aurora — completing the circle.
Ultra-detailed space/earth photography style meets painterly illustration.
Full circle. A sense of wholeness and return.

---

### Compositing Instructions

After generating all 6 panels at 4K:

```python
# Use PIL to stack panels vertically
from PIL import Image

panels = [
    "panel1-celestial-opening.png",
    "panel2-village-life.png",
    "panel3-food-forest-quests.png",
    "panel4-regen-city.png",
    "panel5-underground-mycelia.png",
    "panel6-earth-stars.png",
]

images = [Image.open(p) for p in panels]
# Resize all to the same width
target_width = 2560
resized = [img.resize((target_width, int(img.height * target_width / img.width)),
           Image.LANCZOS) for img in images]

total_height = sum(img.height for img in resized)
composite = Image.new("RGB", (target_width, total_height))
y = 0
for img in resized:
    composite.paste(img, (0, y))
    y += img.height

composite.save("home-desktop-composite.png")
```

Then convert to webp:
```bash
cwebp -q 85 home-desktop-composite.png -o client/public/images/backgrounds/home-desktop.webp
# For mobile: scale down and crop center
convert home-desktop-composite.png -resize 768x -quality 85 client/public/images/backgrounds/home-mobile.webp
```

If ImageMagick/cwebp not available, save as PNG and convert via PIL:
```python
composite.save("client/public/images/backgrounds/home-desktop.webp", "WEBP", quality=85)
```

---

## Part B: OG Image (1200x630)

The OG image is what people see when a link to regencivics.earth is shared on
Twitter/X, LinkedIn, iMessage, Slack, etc. Current image is a close-up of a
golden flame figure — too abstract, doesn't convey the world.

### Target Feeling

Like the reference image Rye shared: lush, abundant, joyful, full of life.
A world people want to enter. Treehouses, waterfall, diverse humans working
and playing, animals, food, community. That scene — but tuned to the
ReGen Civics aesthetic: slightly more epic, more magical, slightly more dusk
than midday, with a sense of movement and quest.

### OG Image Prompt

**Prompt:**
Wide cinematic landscape of a thriving regenerative village at golden hour.
Ancient trees with treehouses and rope bridges. A cascading waterfall feeding
a clean river with people swimming and gathering at the banks. Diverse humans
of all ages and backgrounds: elders tending gardens, adults building, children
playing with deer and rabbits. Abundant food everywhere: fruit trees heavy
with oranges and mangoes, vegetable gardens in mandala patterns, herb spirals.
Mushrooms growing at tree bases. A bear in the background near the forest
edge. Colorful birds in the canopy. Stone paths weave through the scene.
Warm golden-amber light from the west. A subtle sense of magic: glowing
lanterns, hints of bioluminescence at the roots. Painterly, high-fantasy
realism. Rich detail. Wide 16:9 cinematic framing. No text, no UI elements.

**Resolution:** 4K, then downscale to 1200x630.
**Output:** Save as `client/public/og-default.jpg` (JPEG quality 90).

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Wide cinematic landscape of a thriving regenerative village at golden hour. Ancient trees with treehouses and rope bridges. A cascading waterfall feeding a clean river with people swimming and gathering at the banks. Diverse humans of all ages and backgrounds: elders tending gardens, adults building, children playing with deer and rabbits. Abundant food everywhere: fruit trees heavy with oranges and mangoes, vegetable gardens in mandala patterns, herb spirals. Mushrooms growing at tree bases. A bear in the background near the forest edge. Colorful birds in the canopy. Stone paths weave through the scene. Warm golden-amber light from the west. A subtle sense of magic: glowing lanterns, hints of bioluminescence at the roots. Painterly high-fantasy realism. Rich detail. Wide 16:9 cinematic framing. No text, no UI elements." \
  --filename "2026-04-01-og-regen-village.png" \
  --resolution 4K
```

Then crop/resize to 1200x630 and save as JPG:
```python
from PIL import Image
img = Image.open("2026-04-01-og-regen-village.png")
# Crop to 16:9 from center if needed
w, h = img.size
target_ratio = 1200 / 630
current_ratio = w / h
if current_ratio > target_ratio:
    new_w = int(h * target_ratio)
    left = (w - new_w) // 2
    img = img.crop((left, 0, left + new_w, h))
else:
    new_h = int(w / target_ratio)
    top = (h - new_h) // 2
    img = img.crop((0, top, w, top + new_h))
img = img.resize((1200, 630), Image.LANCZOS)
img.save("client/public/og-default.jpg", "JPEG", quality=90)
print("Saved og-default.jpg")
```

---

## Part C: Code Changes

After images are generated and saved:

### 1. Update Home.tsx to use new images

`client/src/pages/Home.tsx` lines 183-184 and 191-192:
```tsx
// Change:
const bgImage = "/images/backgrounds/home-desktop.webp";
const mobileBgImage = "/images/backgrounds/home-mobile.webp";
// No file name change needed — we're overwriting the same files.
// But verify the section overlay opacities still look right with the new image.
// The new image is darker at the top (night sky) so hero overlay can go lower:
{ id: "hero", opacity: 0.25 },   // stars should show through more
{ id: "four-paths", opacity: 0.50 },
{ id: "scarcity", opacity: 0.45 },
{ id: "who-are-you", opacity: 0.55 },
{ id: "fund-game", opacity: 0.50 },
{ id: "newsletter", opacity: 0.65 },
```

### 2. Update OG description in index.html and SEO.tsx

`client/index.html` — update the og:description meta tag:
```html
<meta property="og:description" content="A fund and a game for regenerative land projects. Do quests, earn tokens, and fund real-world regeneration." />
```

`client/src/components/SEO.tsx` — update the default description to match.

---

## Execution Order

1. Run Part B (OG image) first — it's one image, fastest to verify
2. Run Part A panels 1-6 sequentially (each takes ~30-60s at 4K)
3. Composite panels into final background
4. Run Part C code changes
5. Verify visually by running `npm run dev` and checking both desktop and mobile views

---

## Fallback: If any panel doesn't look right

Regenerate that panel with adjusted prompt. Common fixes:
- Too bright: add "dramatic, moody, cinematic shadows" to prompt
- Too cartoon: add "photorealistic painterly style, not cartoon, not anime"
- Too chaotic: add "clear compositional layers, foreground midground background"
- Panels don't flow together: use `--input-image` of the adjacent panel's edge
  and add "seamlessly continue this scene" to the prompt

---

## Files Modified

- `client/public/images/backgrounds/home-desktop.webp` (replaced)
- `client/public/images/backgrounds/home-mobile.webp` (replaced)
- `client/public/og-default.jpg` (replaced)
- `client/index.html` (og:description updated)
- `client/src/components/SEO.tsx` (default description updated)
- `client/src/pages/Home.tsx` (section overlay opacities adjusted)
