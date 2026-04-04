# Character Art Prompt Template

Use this template when generating the CHARACTER_ART execution prompt for Claude Code. The prompt tells Claude Code to use the nano-banana-pro skill (Gemini image generation) to create all character illustrations for the season.

## File Structure

The execution prompt should be saved as: `CLAUDE_CODE_PROMPT_[DATE]_CHARACTER_ART.md`

Archive the previous season's art prompt first (move to `archive/`).

## Template

```markdown
# Execution Prompt: Generate Season [N] Character Illustrations

## Overview

Generate [NUMBER] character illustrations for the Team page role cards ([N] roles x 2 versions each). Uses the nano-banana-pro skill (Gemini image generation).

**Two versions per character:**
1. **Card portrait** (`[slug]-card.webp`) - Character only, no background scene, no text. Used on the exterior of role portal cards.
2. **Full scene** (`[slug]-scene.webp`) - Character in a background scene with the character name as text. Used inside the expanded portal modal.

**Save all to:** `client/public/images/roles/`

**Resolution:** 2K for all images.

**Convert to WebP after generation:** `cwebp -q 85 input.png -o output.webp`

---

## Style Guide

[INSERT STYLE GUIDE HERE - carry forward from previous season unless changed]

**THE VIBE:** [Core aesthetic direction]

**Color palette:** [Colors]

**Overall style:** [Description]

**Card portraits:** Character standing, full body or 3/4 body, simple soft gradient or transparent background. No scene elements, no text, no title, no tagline. Just the character and their key props/tools. Clean edges for compositing onto dark card backgrounds.

**Full scene images:** Landscape orientation (16:9). Character in left or center of scene. Character name as simple clean label. NO tagline. NO header text.

**CRITICAL: Every scene must feel deeply regenerative, organic, and alive.** Visible fruiting plants and at least 1-2 animals or creatures per scene. Food growing everywhere. Animals comfortable around people. Nothing barren or sterile.

**Character diversity:** Vary skin tones, body types, hairstyles, and ages. Mix of masculine, feminine, and androgynous presentations. Connected to land and community.

---

## The Characters

### [NUMBER]. [Character Name] ([Role Title])
- **Tagline (for HTML only, not on image):** [Tagline]
- **Slug:** `[slug]`
- **Character:** [Physical description, clothing, props, expression, energy]
- **Scene background:** [Environment description with specific fruits and animals]
- **Scene text:** `- [CHARACTER NAME IN CAPS] -`

[REPEAT FOR EACH CHARACTER]

---

## Prompt Templates

### Card Portrait:
```
[Art style] illustrated character design, hand-painted style with [palette]. [CHARACTER DESCRIPTION]. Full body, standing pose against a simple soft [gradient] background. No text, no title, no scene background. Clean edges. [Aesthetic summary].
```

### Full Scene:
```
[Art style] illustrated game character card in landscape orientation, hand-painted style with [palette]. [CHARACTER DESCRIPTION]. [SCENE BACKGROUND]. A clean minimal label reads "[SCENE TEXT]" in elegant thin lettering. No other text. Golden hour light. [Aesthetic summary]. Abundant fruiting plants and comfortable wildlife visible throughout.
```

---

## Execution Steps

1. Check nano-banana-pro availability: `ls ~/.claude/skills/nano-banana-pro/scripts/generate_image.py`
2. Create output directory: `mkdir -p client/public/images/roles/`
3. Generate all images using 2K resolution
4. Convert PNGs to WebP: `for f in client/public/images/roles/*.png; do cwebp -q 85 "$f" -o "${f%.png}.webp" && rm "$f"; done`
5. Verify all files exist (list expected filenames)
6. List all files with sizes
```

## Seasonal Art Variations

The core solarpunk aesthetic stays consistent, but each season can have its own visual flavor within it:

- **Winter seasons:** More bioluminescence, crystal structures, cozy interior scenes, frost-touched edges, warm indoor lighting
- **Spring seasons:** Blooming everything, new growth, morning light, pollinators everywhere, fresh greens
- **Summer seasons:** Full abundance, golden hour, outdoor scenes, festivals visible in backgrounds, harvest energy
- **Fall seasons:** Rich warm colors, composting and transformation imagery, quieter scenes, lantern light, mushrooms

These are suggestions. Rye may want something completely different for a particular season.

## Reusing Characters Across Seasons

When a role continues between seasons, the character design should stay recognizable but can get seasonal touches:
- Same character appearance (skin tone, build, key features stay identical)
- Seasonal clothing or color shifts (heavier layers in winter, lighter in summer)
- Seasonal props (winter: warm drink, spring: seedlings, summer: harvest basket, fall: journal)
- Scene backgrounds shift to match the season

When generating art for a continuing character, reference the previous season's description as a starting point and note what changed.
