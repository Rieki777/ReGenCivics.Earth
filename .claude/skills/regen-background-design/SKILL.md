---
name: regen-background-design
description: Use when creating, changing, or fixing background images for any ReGen Civics page. Covers generating art with Gemini, compositing panels into a seamless vertical image, wiring up PageBackground component correctly, and auditing overlaid elements for contrast and accessibility. Triggers on: "background image", "page background", "change the background", "fix the background", "new background for", "background isn't scrolling", "background doesn't blend", "contrast on cards", "text visibility over background", or any request to generate art for a specific page.
---

# ReGen Civics Page Background Design

## Art Style

All ReGen Civics backgrounds use the same painterly fantasy style:

> "Digital fantasy painting. Enchanted forest aesthetic. Rich saturated colors with warm golden and cool emerald tones. Painterly but detailed. Similar to Studio Ghibli background art. Magical but grounded. Not cartoonish, not photorealistic."

Open every Gemini prompt with that style anchor verbatim. Without it, panels drift in style between generations.

## Image Generation

Use `scripts/nano-banana-pro-generate-image.py` (in the project root). The Gemini API key is in `.env` as `GEMINI_API_KEY`.

```bash
source .env
export GEMINI_API_KEY

python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "[STYLE ANCHOR] [SCENE DESCRIPTION] [EDGE COLOR NOTES]" \
  --filename /tmp/bg-panels/panel-1.png \
  --resolution 4K
```

For single-panel pages (hero backgrounds, interior pages): generate one panel, skip compositing.

For full-scroll pages (homepage-style): generate 6 panels and composite (see `BACKGROUND_IMAGE_PRODUCTION_BRIEF.md`).

## Target Sizes

| Page type | Desktop | Mobile |
|---|---|---|
| Hero-only background | 1920x1200px | 768x1200px |
| Full-scroll page | 1920x5000px | 768x8500px |
| Interior section | match content height | match content height |

## PageBackground Component

Always use `PageBackground` instead of raw CSS `background-attachment: fixed`. Fixed background breaks on iOS Safari.

**Correct setup:**
```tsx
import PageBackground from "@/components/PageBackground";

<PageBackground
  backgroundImage="/images/backgrounds/page-name.webp"
  mobileBackgroundImage="/images/backgrounds/page-name-mobile.webp"
  overlayOpacity={0.5}
  theme="forest"
  blendColor="18, 45, 28"
  scrollWithPage={true}        // for full-scroll pages
  sectionOverlays={[
    { id: "hero", opacity: 0.25 },
    { id: "content", opacity: 0.55 },
  ]}
>
  {children}
</PageBackground>
```

**scrollWithPage settings:**
- `scrollWithPage={true}` - background scrolls 1:1 with content. Use for multi-panel tall images.
- `scrollWithPage={false}` (default) - JS parallax at 0.3 speed. Use for hero sections with one image.

**Never use:**
```css
background-attachment: fixed;  /* Broken on iOS Safari */
```

## Output Location

Always save to:
```
client/public/images/backgrounds/page-name.webp
client/public/images/backgrounds/page-name-mobile.webp
```

Convert to webp at quality 85:
```python
from PIL import Image
img = Image.open("panel.png")
img.save("client/public/images/backgrounds/page-name.webp", "WEBP", quality=85)
```

## Contrast Audit

After adding any background, audit all overlaid elements:

### Minimum Requirements (WCAG AA)

| Element type | Minimum contrast ratio |
|---|---|
| Normal text (<18px) | 4.5:1 |
| Large text (18px+ or 14px bold) | 3:1 |
| UI components (buttons, inputs) | 3:1 |
| Decorative only | No requirement |

### Glass Panel Standards

For `glass-panel` and card elements on dark backgrounds:

```css
/* Good - readable over background */
background: rgba(255, 255, 255, 0.08);   /* At least 8% for dark pages */
border: 1px solid rgba(255, 255, 255, 0.15);
backdrop-filter: blur(8px);

/* Better for text-heavy cards */
background: rgba(0, 0, 0, 0.45);
border: 1px solid rgba(255, 255, 255, 0.12);
```

### Text on Dark Backgrounds

```css
/* Primary text - always 90% or higher */
color: rgba(255, 255, 255, 0.9);

/* Secondary text - minimum 60% */
color: rgba(255, 255, 255, 0.7);

/* Never use on dark bg (fails contrast) */
color: rgba(255, 255, 255, 0.5);  /* Too low for body text */
```

### Section Overlay Opacities

The overlay on top of the background image affects everything below it. Rule of thumb:

- `0.25` - Hero sections where art should show through
- `0.45` - Sections with images alongside text
- `0.55` - Standard content sections
- `0.65` - Footer / newsletter - highest contrast needed

If cards sit on `opacity: 0.25` overlay and use `bg-white/5`, the combined background is dark forest art at ~75% strength. Cards need `bg-black/50` or higher to be readable.

## Audit Checklist

Before shipping any background change:

- [ ] Background uses `PageBackground` component (never raw `background-attachment: fixed`)
- [ ] `scrollWithPage` set correctly for page type
- [ ] All card/box backgrounds have at least 8% opacity or explicit dark fill
- [ ] Body text is at least 70% white (or equivalent contrast)
- [ ] Primary text is at least 90% white
- [ ] Buttons have filled backgrounds, not just borders
- [ ] Overlay opacities match content density (higher opacity where more text)
- [ ] Both desktop and mobile images exist and are the right height
- [ ] No seams between panels (if multi-panel)
- [ ] Consistent art style throughout

## Common Mistakes

| Mistake | Fix |
|---|---|
| `background-attachment: fixed` | Use `PageBackground` component |
| `bg-white/5` on dark overlay | Use `bg-black/50` or `bg-white/10 backdrop-blur` |
| `text-white/50` for body text | Use `text-white/80` minimum |
| Mobile background too short | Target 8500px for full-scroll pages |
| Single panel for full-scroll page | Generate and composite 6 panels |
| Style drift between panels | Always prepend the style anchor to each prompt |
| Panels don't blend at edges | Note edge colors in prompt for each panel |
