# Background Image Production - Claude Code Execution Prompt

**Created:** 2026-04-02
**Prereqs:** Gemini API key is in `.env` as `GEMINI_API_KEY`. Image generation script is at `scripts/nano-banana-pro-generate-image.py`.
**Output:** `client/public/images/backgrounds/home-desktop.webp` and `home-mobile.webp`

---

## Overview

Generate 6 art panels using Gemini image generation, then composite them into two seamless vertical background images (desktop + mobile) for the homepage. The full art direction is in `BACKGROUND_IMAGE_PRODUCTION_BRIEF.md`. This prompt covers the step-by-step execution.

## Step 0: Setup

```bash
# Load the API key
source .env
export GEMINI_API_KEY

# Verify the script works
python3 scripts/nano-banana-pro-generate-image.py --prompt "test: a green leaf" --filename /tmp/test-leaf.png --resolution 1K

# Install Pillow for compositing
pip install Pillow --break-system-packages

# Create working directory for panels
mkdir -p /tmp/bg-panels
```

## Step 1: Generate All 6 Panels

Generate each panel at 4K resolution. Each prompt is carefully designed so the edges blend with adjacent panels. Generate them one at a time since each takes ~30-60 seconds.

**CRITICAL:** Every prompt includes the art style anchor: "Digital fantasy painting, enchanted forest aesthetic, rich saturated colors, warm golden and cool emerald tones, painterly but detailed, similar to Studio Ghibli background art. Magical but grounded." This prevents style drift between panels.

### Panel 1 - Starry Village (top of page)

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, enchanted forest aesthetic, rich saturated colors, warm golden and cool emerald tones, painterly but detailed, similar to Studio Ghibli background art. Magical but grounded. Wide landscape composition. Enchanted treehouse village nestled in massive ancient trees at night. Warm glowing round windows like hobbit homes. Wooden bridges connecting treehouses. Starry night sky above with Milky Way visible, crescent moon, purple-indigo clouds. Fireflies and golden light particles floating. The bottom third of the image: dense tree canopy fading from dark greens to warmer lighter greens, with hints of golden dawn light emerging from below the canopy. The very bottom edge should be dark forest green with warm golden light peeking through leaves." \
  --filename /tmp/bg-panels/panel-1-starry-village.png \
  --resolution 4K
```

### Panel 2 - Forest Canopy Transition

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, enchanted forest aesthetic, rich saturated colors, warm golden and cool emerald tones, painterly but detailed, similar to Studio Ghibli background art. Magical but grounded. Wide landscape composition. Dense ancient forest at dawn golden hour. The top of the image is dark forest green canopy with hints of warm golden light from above. Massive ancient tree trunks with rope bridges and wooden walkways winding between them. Warm golden light filtering down through morning mist and canopy creating god rays. Moss and ferns on everything. The light grows brighter and warmer toward the bottom. Bottom third opens into a sunlit clearing with dappled golden-green light. The very bottom edge should be warm golden-green with bright dappled sunlight filtering through." \
  --filename /tmp/bg-panels/panel-2-forest-canopy.png \
  --resolution 4K
```

### Panel 3 - Community Life

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, enchanted forest aesthetic, rich saturated colors, warm golden and cool emerald tones, painterly but detailed, similar to Studio Ghibli background art. Magical but grounded. Wide landscape composition. The top edge is warm golden-green with dappled sunlight. Sunlit regenerative community in a forest clearing. Diverse people of many ethnicities sharing food at wooden tables, tending garden beds, children playing by a clear stream. Fruit trees with oranges and mangoes. Raised garden beds with colorful vegetables. Wooden platforms and treehouses visible in the background among trees. Warm golden afternoon light fills the scene. A stream winds through the middle. The bottom third shows the lush grass transitioning to garden soil becoming visible. Plants with roots beginning to show at the edge of a gentle hillside cut. Flowers, mushrooms, and herbs at ground level. The very bottom edge is rich brown-green garden soil with surface plants and the beginnings of root systems visible." \
  --filename /tmp/bg-panels/panel-3-community.png \
  --resolution 4K
```

### Panel 4 - Underground Transition

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, enchanted forest aesthetic, rich saturated colors, painterly but detailed, similar to Studio Ghibli background art. Magical but grounded. Wide landscape composition showing a cross-section view underground. The top edge is rich brown-green garden soil with surface plants and the beginnings of root systems. The surface garden floor transitions into a cross-section of rich dark soil in painterly fantasy style. Roots descend from plants above. Glowing mushrooms and bioluminescent cyan-teal fungi begin to appear among the roots. Illustrated earthworms and beetles in the same painterly style. The soil gets progressively darker toward the bottom. Small crystals and mineral deposits start to glimmer with warm gold and cool teal light. The roots become thicker and more interconnected as they go deeper. The very bottom edge is dark earth with scattered teal and gold bioluminescent glow points." \
  --filename /tmp/bg-panels/panel-4-underground.png \
  --resolution 4K
```

### Panel 5 - Mycelium Network

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, enchanted forest aesthetic, painterly but detailed, similar to Studio Ghibli background art. Wide landscape composition. Deep underground scene. The top edge is dark earth with scattered teal and gold bioluminescent glow points. A vast network of glowing bioluminescent root and mycelium connections like a neural network made of nature. Thick ancient roots intertwine and branch. Teal cyan and warm gold bioluminescence illuminates the underground darkness. Large crystal formations catch and refract the light. Glowing mushroom colonies in clusters. The network pattern becomes more expansive and cosmic-looking toward the bottom, like the roots are becoming constellations. The dark earth tones deepen into deep blue-black. The very bottom edge is deep dark blue-black with thin root tendrils and the first pinpoint stars appearing between them, as if the underground is becoming outer space." \
  --filename /tmp/bg-panels/panel-5-mycelium.png \
  --resolution 4K
```

### Panel 6 - Roots to Space with Earth

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting, painterly but detailed, cosmic and magical. Wide landscape composition. The top edge is deep dark blue-black with thin bioluminescent root tendrils and scattered stars. The root and mycelium network from above thins out and dissolves into the darkness of deep space. Stars become more numerous. The Milky Way galaxy stretches across the upper portion. In the center-bottom of the image: ONE large beautiful painterly Earth seen from space, filling about 60 percent of the width. The Earth has rich blues of oceans and greens of continents visible. A soft atmospheric glow halos the planet. Deep black galaxy and star field behind it. The thinnest root tendrils from above seem to reach down and connect to the Earth, suggesting the planet itself is part of the living network. The overall feeling is awe, connection, and the unity of all life." \
  --filename /tmp/bg-panels/panel-6-space-earth.png \
  --resolution 4K
```

## Step 2: Review Panels

Before compositing, read each generated panel image to verify:
1. All 6 files exist and have reasonable file sizes (should be 1-10MB each at 4K)
2. The art style is consistent across all panels (painterly fantasy throughout)
3. Edge colors roughly match between adjacent panels

```bash
ls -la /tmp/bg-panels/
```

If any panel has the wrong style or bad edge colors, regenerate just that panel with an adjusted prompt. You may need 2-3 attempts per panel to get good edge matching.

## Step 3: Composite into Final Images

Create and run this compositing script:

```python
#!/usr/bin/env python3
"""Composite 6 panels into desktop and mobile background images."""
from PIL import Image
import numpy as np
import os

def blend_panels(panels, target_width, panel_height, blend_zone=250):
    """Stack panels vertically with gradient blending between each pair."""
    resized = []
    for p in panels:
        # Calculate crop to center
        aspect = target_width / panel_height
        p_aspect = p.width / p.height
        if p_aspect > aspect:
            new_w = int(p.height * aspect)
            left = (p.width - new_w) // 2
            p = p.crop((left, 0, left + new_w, p.height))
        else:
            new_h = int(p.width / aspect)
            top = (p.height - new_h) // 2
            p = p.crop((0, top, p.width, top + new_h))
        p = p.resize((target_width, panel_height), Image.LANCZOS)
        resized.append(p)

    total_h = len(resized) * panel_height - (len(resized) - 1) * blend_zone
    result = Image.new('RGB', (target_width, total_h))

    # Use numpy for fast gradient mask creation
    gradient = np.tile(
        np.linspace(0, 255, blend_zone, dtype=np.uint8).reshape(-1, 1),
        (1, target_width)
    )
    mask = Image.fromarray(gradient, mode='L')

    y = 0
    for i, panel in enumerate(resized):
        if i == 0:
            result.paste(panel, (0, 0))
            y = panel_height
        else:
            blend_start = y - blend_zone
            prev_strip = result.crop((0, blend_start, target_width, y))
            curr_strip = panel.crop((0, 0, target_width, blend_zone))
            blended = Image.composite(curr_strip, prev_strip, mask)
            result.paste(blended, (0, blend_start))
            remaining = panel.crop((0, blend_zone, target_width, panel_height))
            result.paste(remaining, (0, y))
            y += panel_height - blend_zone

    return result

# Load panels
panel_files = [
    "/tmp/bg-panels/panel-1-starry-village.png",
    "/tmp/bg-panels/panel-2-forest-canopy.png",
    "/tmp/bg-panels/panel-3-community.png",
    "/tmp/bg-panels/panel-4-underground.png",
    "/tmp/bg-panels/panel-5-mycelium.png",
    "/tmp/bg-panels/panel-6-space-earth.png",
]

panels = []
for f in panel_files:
    print(f"Loading {f}...")
    panels.append(Image.open(f))
    print(f"  Size: {panels[-1].size}")

# Desktop: 1920px wide, ~950px per panel, 250px blend = ~4450px total
print("\nCompositing desktop version (1920px wide)...")
desktop = blend_panels(panels, 1920, 950, blend_zone=250)
print(f"  Desktop size: {desktop.size}")

out_dir = "client/public/images/backgrounds"
os.makedirs(out_dir, exist_ok=True)

desktop.save(f"{out_dir}/home-desktop.webp", "WEBP", quality=85)
print(f"  Saved {out_dir}/home-desktop.webp")

# Mobile: 768px wide, ~1600px per panel, 300px blend = ~8100px total
print("\nCompositing mobile version (768px wide)...")
mobile = blend_panels(panels, 768, 1600, blend_zone=300)
print(f"  Mobile size: {mobile.size}")

mobile.save(f"{out_dir}/home-mobile.webp", "WEBP", quality=85)
print(f"  Saved {out_dir}/home-mobile.webp")

# Report file sizes
for name in ["home-desktop.webp", "home-mobile.webp"]:
    path = f"{out_dir}/{name}"
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"  {name}: {size_mb:.2f} MB")

print("\nDone! Verify by opening both files and checking for seams.")
```

Save this as `/tmp/composite-bg.py` and run it:

```bash
python3 /tmp/composite-bg.py
```

## Step 4: Visual Verification

Open both output files and verify against this checklist:

- [ ] No hard seams visible between any sections
- [ ] Consistent painterly fantasy art style from top to bottom
- [ ] Single centered Earth at bottom (not two, not cut off)
- [ ] Color transitions feel natural (night to dawn to day to underground to space)
- [ ] Desktop image is approximately 1920x4400-5000px
- [ ] Mobile image is approximately 768x8000-8500px
- [ ] File sizes under 2MB each (webp at quality 85)
- [ ] No important visual elements cropped at the edges on mobile

## Step 5: Test with Overlay

To verify the art works through the dark overlays used on the page, create a quick test:

```python
from PIL import Image, ImageDraw

def test_with_overlay(img_path, opacity=0.45):
    img = Image.open(img_path).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, int(255 * opacity)))
    result = Image.alpha_composite(img, overlay)
    out = img_path.replace(".webp", "-overlay-test.png")
    result.save(out)
    print(f"Overlay test saved: {out}")

test_with_overlay("client/public/images/backgrounds/home-desktop.webp", 0.45)
test_with_overlay("client/public/images/backgrounds/home-mobile.webp", 0.45)
```

The art should still look rich and visible through the overlay, not washed out. If sections look too dark through the overlay, consider regenerating those panels with brighter, more saturated colors.

## Troubleshooting

**If Gemini returns text instead of an image:**
The model sometimes responds with text descriptions instead of generating an image. If this happens, try:
1. Simplify the prompt (shorter, more direct)
2. Start the prompt with "Generate an image of:" or "Create a painting:"
3. Remove the style description from the prompt and keep only the scene description
4. Try a different resolution (2K instead of 4K)

**If panels have inconsistent styles:**
Regenerate the odd one out. If the style keeps drifting, generate panels 1 and 6 first (the most distinct scenes), then generate 2-5 using panel 1 as an input-image reference:
```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Create the next panel in this same art style but showing [scene description]" \
  --input-image /tmp/bg-panels/panel-1-starry-village.png \
  --filename /tmp/bg-panels/panel-2-forest-canopy.png \
  --resolution 4K
```

**If edges don't blend well even with gradient:**
Increase the blend_zone from 250/300 to 400. This gives more room for the gradient to smooth out color differences.

**If file sizes are too large (>3MB):**
Lower the webp quality from 85 to 75, or resize slightly smaller.

## Panel-to-Page Mapping Reference

| Panel | Page Section | Desktop Height | Mobile Height | Overlay Opacity |
|-------|-------------|---------------|--------------|----------------|
| 1 - Starry Village | Hero + Video | ~950px | ~1,600px | 0.25 |
| 2 - Forest Canopy | Four Paths cards | ~950px | ~1,600px | 0.50 |
| 3 - Community | Scarcity + What We Value | ~950px | ~1,600px | 0.45 |
| 4 - Underground | Two Spaces, One Vision | ~950px | ~1,600px | 0.55 |
| 5 - Mycelium | Live Activity | ~950px | ~1,600px | 0.50 |
| 6 - Space/Earth | Newsletter + Footer | ~950px | ~1,600px | 0.65 |
