# Homepage Background Image Production Brief

**Status:** Ready to execute when image generation tools are available
**Output files:** `client/public/images/backgrounds/home-desktop.webp` and `home-mobile.webp`

---

## Current State

- Desktop: 1920x4939px webp
- Mobile: 768x4939px webp (same height, way too short for mobile)
- CSS: `background-size: cover; background-position: center top; background-attachment: scroll` on `position: absolute; inset: 0`
- The image scrolls with the page via `scrollWithPage={true}` in PageBackground component
- Overlay opacity varies per section (0.25 to 0.65) so the art needs to look good through a semi-transparent dark overlay

## Real Mobile Page Height (measured from Home.tsx sections)

On a 768px-wide mobile viewport, all content stacks single-column. Measured section heights:

| Section | Mobile Height (px) |
|---|---|
| Banner | ~70 |
| Fund Launch Banner | ~60 |
| Welcome Video (py-10, 16:9 at 768w) | ~480 |
| Hero (min-h-[60vh] + heading + video) | ~650 |
| Four Paths (4 cards single-col, ~350px each) | ~1,600 |
| HowItWorks (5 expandable steps + CTA cards) | ~900 |
| Scarcity to Regeneration (3 cards + quote) | ~900 |
| What We Value (800x1200 portrait image + padding) | ~1,300 |
| Two Spaces, One Vision (2 cards stacked + pill) | ~1,000 |
| Live Activity Feed | ~250 |
| Newsletter Signup | ~350 |
| Footer margins | ~100 |
| **TOTAL (collapsibles closed)** | **~7,660** |
| **With collapsibles open** | **~8,500+** |

Target mobile background height: **8,500px** (covers collapsible expansion without running out of art)

## Problems with Current Image

1. **Section 1 to 2**: Hard seam from starry night sky (section 1) to bright daylight community garden (section 2). Completely different lighting with zero transition.
2. **Section 3 to 4**: Illustrated painterly garden abruptly becomes photorealistic soil cross-section with carrots and beets. Totally different art style.
3. **Section 4**: The photorealistic underground soil does not match the painterly fantasy style of everything else.
4. **Bottom**: Earth/space section transitions too abruptly from the root network above.
5. **Overall**: Feels like 6 separate images pasted together, not one continuous painting.

## Target: One Continuous Vertical Painting

The image should feel like scrolling through one unified world, top to bottom, like a vertical scroll painting. Same art style throughout. Each zone blends into the next with shared colors and visual elements at the edges.

### Art Style (consistent across all panels)

Digital fantasy painting. Enchanted forest aesthetic. Rich saturated colors with warm golden and cool emerald tones. Painterly but detailed. Similar to Studio Ghibli background art or high-quality fantasy book illustration. Magical but grounded. Not cartoonish, not photorealistic.

### Visual Journey (top to bottom)

**Panel 1 - Starry Village (top)**
Enchanted treehouse village nestled in massive ancient trees. Warm glowing round windows (hobbit-style). Wooden bridges connect the homes. Starry night sky above with Milky Way, crescent moon, purple-indigo clouds. Fireflies and golden light particles. The bottom of this panel: dense tree canopy fading from dark greens to warmer, lighter greens. Hint of golden light emerging from below.

**Panel 2 - Forest Canopy Transition**
Dense ancient forest at dawn/golden hour. Warm golden light filtering down through mist and canopy. Massive tree trunks, rope bridges, wooden walkways. The light gets brighter toward the bottom. Top is dark-green canopy matching panel 1's bottom. Bottom opens up into a sunlit clearing. This panel is the bridge from night to day.

**Panel 3 - Community Life**
Sunlit regenerative community. Diverse people sharing food, tending gardens, children by a stream. Fruit trees (oranges, mangoes, papaya). Garden beds with vegetables. Wooden platforms and treehouses in background. Warm golden afternoon light. Stream winds through the scene. Bottom of this panel: the lush grass and garden soil starts to become visible. Plants with roots just beginning to show. Flowers and mushrooms at ground level.

**Panel 4 - Underground Transition**
The surface garden floor transitions into a cross-section view of rich dark soil. But in PAINTERLY FANTASY STYLE (not photorealistic). Roots descend from above. Glowing mushrooms and bioluminescent fungi begin to appear. Earthworms and insects rendered in the same illustrated style. The soil gets darker toward the bottom. Small crystals and mineral deposits start to glimmer. The roots become thicker, more interconnected.

**Panel 5 - Mycelium Network**
Deep underground. A vast network of glowing bioluminescent root connections, like a neural network. Thick ancient roots intertwine. Teal/cyan and warm gold bioluminescence illuminates the underground. Crystal formations. Mushroom colonies glow. The network pattern becomes more expansive and cosmic-looking toward the bottom. The dark earth tones start to deepen into deep blue-black.

**Panel 6 - Roots to Space with Single Earth**
The root/mycelium network thins out and fades into the darkness of deep space. Stars begin to appear between the root tendrils. The Milky Way galaxy becomes visible. At the center bottom: ONE large, beautiful, painterly Earth seen from space. The Earth is centered, filling about 60% of the width. Rich blues and greens of continents visible. A soft atmospheric glow around the Earth. Deep black galaxy/star field behind it. The roots from above seem to connect to the Earth, suggesting the planet itself is part of the living network.

## Production Method

### Panel Generation

Generate 6 panels, each at maximum available resolution (4K preferred). Landscape orientation, approximately 2:1 aspect ratio.

**Critical for blending:** Each panel's bottom 15-20% of color palette must match the top 15-20% of the next panel. Use consistent color anchors:
- Panel 1 bottom / Panel 2 top: Dark forest green, hints of golden light
- Panel 2 bottom / Panel 3 top: Warm golden-green, dappled sunlight
- Panel 3 bottom / Panel 4 top: Garden floor, rich brown-green soil, surface plants
- Panel 4 bottom / Panel 5 top: Dark earth with scattered bioluminescent glow
- Panel 5 bottom / Panel 6 top: Deep dark blue-black with root tendrils and first stars

### Compositing (Python/Pillow)

After generating all 6 panels:

1. Resize each panel to target width (1920px for desktop, 768px for mobile)
2. Calculate target height per panel (desktop total ~5000px, mobile total ~7000px)
3. Center-crop panels to target aspect ratio
4. Stack panels vertically with **200-300px gradient blend zones** between each pair
5. The blend zone uses an alpha gradient: top panel fades from 100% to 0%, bottom panel fades from 0% to 100%
6. Save as webp with quality 85

### Compositing Script

```python
from PIL import Image, ImageFilter
import numpy as np

def blend_panels(panels, target_width, panel_height, blend_zone=250):
    """Stack panels vertically with gradient blending between each pair."""
    # Resize all panels
    resized = []
    for p in panels:
        # Calculate crop to center
        aspect = target_width / panel_height
        p_aspect = p.width / p.height
        if p_aspect > aspect:
            # Too wide, crop sides
            new_w = int(p.height * aspect)
            left = (p.width - new_w) // 2
            p = p.crop((left, 0, left + new_w, p.height))
        else:
            # Too tall, crop top/bottom
            new_h = int(p.width / aspect)
            top = (p.height - new_h) // 2
            p = p.crop((0, top, p.width, top + new_h))
        p = p.resize((target_width, panel_height), Image.LANCZOS)
        resized.append(p)

    # Total height = panels stacked minus overlap zones
    total_h = len(resized) * panel_height - (len(resized) - 1) * blend_zone
    result = Image.new('RGB', (target_width, total_h))

    y = 0
    for i, panel in enumerate(resized):
        if i == 0:
            result.paste(panel, (0, 0))
            y = panel_height
        else:
            # Blend zone between previous and current panel
            blend_start = y - blend_zone

            # Get the overlapping regions
            prev_strip = result.crop((0, blend_start, target_width, y))
            curr_strip = panel.crop((0, 0, target_width, blend_zone))

            # Create gradient mask
            mask = Image.new('L', (target_width, blend_zone))
            for row in range(blend_zone):
                alpha = int(255 * row / blend_zone)
                for col in range(target_width):
                    mask.putpixel((col, row), alpha)

            # Composite
            blended = Image.composite(curr_strip, prev_strip, mask)
            result.paste(blended, (0, blend_start))

            # Paste the rest of the current panel below the blend zone
            remaining = panel.crop((0, blend_zone, target_width, panel_height))
            result.paste(remaining, (0, y))
            y += panel_height - blend_zone

    return result

# Usage:
# panels = [Image.open(f"panel-{i}.png") for i in range(1, 7)]
# desktop = blend_panels(panels, 1920, 950, blend_zone=250)  # ~4450px tall (close to current 4939 with blending)
# desktop.save("home-desktop.webp", "WEBP", quality=85)
# mobile = blend_panels(panels, 768, 1600, blend_zone=300)   # ~8100px tall (covers 8500px page with cover scaling)
# mobile.save("home-mobile.webp", "WEBP", quality=85)
```

### Mobile Version

The mobile version must be significantly taller than desktop. Real page measurements show mobile content reaches ~7,660px with collapsibles closed and ~8,500px+ when expanded. Target:
- Desktop: 1920x~5000px (current is 4939, close enough)
- Mobile: 768x~8500px (current is 4939, which is way too short)

To achieve this, crop the same panels more narrowly (768px wide) but keep more vertical content from each panel, making the total composition taller. Each panel gets ~1,500px on mobile vs ~900px on desktop.

## Page Section Mapping

For reference, the background sections roughly correspond to these page sections (top to bottom):

1. **Panel 1** (Village/Sky): Hero section with main headline
2. **Panel 2** (Forest): Four Paths cards section
3. **Panel 3** (Community): "Scarcity to Regeneration" + "Who Are You" sections
4. **Panel 4** (Underground): Fund + Game overview section
5. **Panel 5** (Mycelium): Video content + intro videos section
6. **Panel 6** (Space/Earth): Newsletter signup + footer

## Quality Checklist

Before shipping, verify:
- [ ] No hard seams visible between any sections
- [ ] Consistent art style from top to bottom (painterly fantasy throughout)
- [ ] Single centered Earth at bottom (not two)
- [ ] Colors work well through the dark overlay (0.25-0.65 opacity)
- [ ] Text is readable over all sections when overlay is applied
- [ ] Mobile version is taller and content is centered (no important elements cropped at edges)
- [ ] File sizes reasonable (aim for under 2MB per file for webp)
- [ ] Both files saved to `client/public/images/backgrounds/`
</content>
</invoke>