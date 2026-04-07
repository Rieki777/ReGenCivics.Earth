# Background Images, Contrast Fixes, and Scroll Fix
# Claude Code Execution Prompt - 2026-04-02

Read the skill at `.claude/skills/regen-background-design/SKILL.md` before starting.
The image generation script is `scripts/nano-banana-pro-generate-image.py`.
API key is in `.env` as `GEMINI_API_KEY`.

---

## Summary of Work

Three independent tasks:

1. **Community page** - generate an elven governance chamber background, wire it into the hero, audit all overlaid element contrast
2. **CrowdPoolingProjects page** - fix scroll bug (`background-attachment: fixed` broken on Safari), audit and fix all box/text contrast, improve background image
3. **New background-design skill** - already created at `.claude/skills/regen-background-design/SKILL.md`, move it to `~/.claude/skills/` if not already there

---

## Task 1: Community Page Background

### 1a. Generate the image

```bash
source .env && export GEMINI_API_KEY
mkdir -p /tmp/bg-panels
pip install Pillow --break-system-packages
```

Generate a single hero panel at 4K for the Community page. This is a hero section (not full-scroll), so one image is sufficient.

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting. Enchanted forest aesthetic. Rich saturated colors with warm golden and cool emerald tones. Painterly but detailed. Similar to Studio Ghibli background art. Magical but grounded. Not cartoonish, not photorealistic. A grand governance chamber inside an ancient elven tree-cathedral. The ceiling vaults upward into living tree branches intertwined with crystalline skylights. Golden sunset light pours through the tree branches and windows from outside where food forests and terraced gardens cascade down hillsides. Waterfalls visible through the massive arched openings on both sides, tumbling through hanging gardens. In the center foreground, a circular council chamber with a glowing floor pattern like a seed of life. Comfortable organic wooden benches arranged in concentric circles. Bioluminescent fungi along the walls. Epic proportions - the space feels both ancient and futuristic. The color palette: deep forest greens, warm amber and gold from the sunset, touches of teal bioluminescence. The bottom of the image fades toward rich dark forest green." \
  --filename /tmp/community-hero.png \
  --resolution 4K
```

Convert to webp:
```python
#!/usr/bin/env python3
from PIL import Image
import os

img = Image.open("/tmp/community-hero.png")
# Resize to 1920x1080 for the hero (not full-scroll)
img_resized = img.resize((1920, 1080), Image.LANCZOS)
os.makedirs("client/public/images/backgrounds", exist_ok=True)
img_resized.save("client/public/images/backgrounds/community-hero.webp", "WEBP", quality=85)

# Mobile version
img_mobile = img.resize((768, 960), Image.LANCZOS)
img_mobile.save("client/public/images/backgrounds/community-hero-mobile.webp", "WEBP", quality=85)
print("Saved community hero images")
```

Save as `/tmp/convert-community.py` and run with `python3 /tmp/convert-community.py`.

### 1b. Wire into Community.tsx hero section

In `client/src/pages/Community.tsx`, find the Hero Section (around line 247). Replace:

```tsx
{/* Hero Section */}
<section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
  {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] via-[#2d5a3f] to-[#f8f5f0]" />
  {/* Hero image: replace src with gathering-grove-hero.webp once generated */}
  <img
    src="/gathering-grove-hero.webp"
    alt=""
    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
    loading="eager"
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
  />
```

With:

```tsx
{/* Hero Section */}
<section className="relative pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden">
  {/* Background image */}
  <picture>
    <source media="(max-width: 767px)" srcSet="/images/backgrounds/community-hero-mobile.webp" />
    <img
      src="/images/backgrounds/community-hero.webp"
      alt=""
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style={{ objectPosition: "center top" }}
      loading="eager"
    />
  </picture>
  {/* Dark overlay for text readability */}
  <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/65 via-[#1a472a]/60 to-[#f8f5f0]" />
```

### 1c. Community page contrast audit

The rest of the Community page uses `bg-[#f8f5f0]` (cream). That's fine - it has dark text. Only the hero section sits on a dark background.

**Hero section fixes** - find and update the following in the hero JSX:

1. Stats bar text: `text-white/90` is good, keep it.
2. Subheading: `text-white/80` is good, keep it.
3. Tag pill: `bg-[#7dd87d]/20 border border-[#7dd87d]/30` - on the darker overlay this may be hard to read. Change to: `bg-[#7dd87d]/30 border border-[#7dd87d]/50`
4. Tag pill text: `text-[#7dd87d] text-sm` - fine.
5. H1: `text-white` - fine.

Add `text-shadow` to the H1 and subheading for extra readability:
```tsx
// On the h1
style={{ fontFamily: 'var(--font-display)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}

// On the subheading p
style={{ fontFamily: 'var(--font-body)', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
```

---

## Task 2: CrowdPoolingProjects Page - Three Fixes

### 2a. Fix the scroll bug (background-attachment: fixed)

**Root cause:** `background-attachment: fixed` is broken on iOS Safari. The background doesn't scroll with the page. The existing `PageBackground` component already solves this with JS parallax.

In `client/src/pages/CrowdPoolingProjects.tsx`, find the root div around line 1244:

```tsx
return (
  <div
    className="min-h-screen relative"
    style={{
      backgroundColor: "#0d2818",
      backgroundImage: `url('/images/crowd-pooling-hero.webp')`,
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundAttachment: "fixed",
    }}
  >
    {/* Dark overlay - 60% opacity */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/60 via-[#0a1f10]/70 to-[#0d2818]/90 pointer-events-none" />

    <SEO {...pageSEO.crowdPoolingProjects} />
    <link rel="preload" as="image" href="/images/crowd-pooling-hero.webp" fetchPriority="high" />

    <div className="relative z-10">
```

Replace the entire wrapper with `PageBackground`:

```tsx
import PageBackground from "@/components/PageBackground";

// ...

return (
  <PageBackground
    backgroundImage="/images/crowd-pooling-hero.webp"
    overlayOpacity={0.55}
    theme="forest"
    blendColor="13, 40, 24"
    scrollWithPage={true}
    sectionOverlays={[
      { id: "hero", opacity: 0.35 },
      { id: "content", opacity: 0.60 },
    ]}
  >
    <SEO {...pageSEO.crowdPoolingProjects} />
    <div className="relative z-10 min-h-screen">
```

And close with `</PageBackground>` instead of the original closing `</div>` pair.

Also add `data-section="hero"` to the hero div and `data-section="content"` to the main content div so the section overlays apply correctly.

**Remove the preload link** - PageBackground handles its own preloading.

### 2b. Improve the crowd-pooling background image

The current image at `client/public/images/crowd-pooling-hero.webp` doesn't blend well. Generate a replacement:

```bash
python3 scripts/nano-banana-pro-generate-image.py \
  --prompt "Digital fantasy painting. Enchanted forest aesthetic. Rich saturated colors with warm golden and cool emerald tones. Painterly but detailed. Similar to Studio Ghibli background art. Magical but grounded. Wide landscape composition. A vast regenerative land project seen from above at golden hour. Multiple ecovillages and land communities dotted across rolling hills and valleys, each glowing with warm light. Terraced food forests. Streams connecting the villages. Communal gardens and orchards. Ancient trees in groups. The landscape is both wild and tended. A rich tapestry of green with golden light from a dramatic sunset sky. Clouds with purple and amber tones. The bottom of the image is dark forest green fading to deep earth. This image will have dark semi-transparent cards placed on top, so it needs to be bright, saturated, and rich with warm light so it shows through." \
  --filename /tmp/crowd-pooling-hero-new.png \
  --resolution 4K
```

Convert and save:
```python
#!/usr/bin/env python3
from PIL import Image

img = Image.open("/tmp/crowd-pooling-hero-new.png")
# Full-scroll page needs to be tall
img_desktop = img.resize((1920, 3200), Image.LANCZOS)
img_desktop.save("client/public/images/crowd-pooling-hero.webp", "WEBP", quality=85)
print(f"Saved crowd-pooling-hero.webp at {img_desktop.size}")
```

Run as `/tmp/convert-crowd-pooling.py`.

### 2c. Contrast audit - fix all boxes and text

The current page has serious contrast issues. Find and fix each one:

**Issue 1: Hero subtitle too faint**
```tsx
// Find:
<p className="text-white/70 text-base md:text-lg mb-10 max-w-2xl mx-auto">
// Change to:
<p className="text-white/90 text-base md:text-lg mb-10 max-w-2xl mx-auto" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
```

**Issue 2: Callout box barely visible**
```tsx
// Find:
<div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 text-sm text-white/80 flex items-center gap-3">
// Change to:
<div className="bg-black/40 border border-[#7dd87d]/40 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 text-sm text-white/90 flex items-center gap-3">
```

**Issue 3: Aggregate progress banner too dark**
```tsx
// Find:
<div className="bg-[#0d2818]/80 border-b border-[#7dd87d]/20 backdrop-blur-sm py-4">
// Change to:
<div className="bg-black/50 border-b border-[#7dd87d]/30 backdrop-blur-sm py-4">
```

**Issue 4: Stats in aggregate banner**
```tsx
// Find p values and labels:
<p className="text-[#7dd87d] font-bold text-xl">{val}</p>
<p className="text-white/60 text-xs">{label}</p>
// Change white/60 to:
<p className="text-white/80 text-xs">{label}</p>
```

**Issue 5: Project cards** - search for project card containers (they will have `glass-panel` class or a div with dark background). For each card:

Find the card outer wrapper (look for `border border-[#7dd87d]/20` or similar glass panel class). Add or increase the background opacity:
```tsx
// Before (insufficient):
className="... bg-[#0d2818]/60 border border-[#7dd87d]/20 ..."
// After (readable):
className="... bg-black/55 border border-[#7dd87d]/35 backdrop-blur-sm ..."
```

**Issue 6: Card text colors** - scan for `text-white/60` and `text-white/50` inside the project card JSX. Change all body text to `text-white/80` minimum, secondary metadata to `text-white/70`.

**Issue 7: "Season 2 Projects" tag** - find the tag near the hero:
```tsx
// Find:
<span className="text-sm font-medium text-[#7dd87d]">Season 2 Projects</span>
// Wrapper likely has bg-[#7dd87d]/15. Change to:
className="... bg-[#7dd87d]/25 border border-[#7dd87d]/50"
```

**Issue 8: Filter/sort UI** - search for any `text-white/40` or `text-white/30` (these are too faint for UI labels). Replace with `text-white/70`.

**Issue 9: Disabled button** - the "List Project" disabled button uses `text-white/50`. On a dark overlay, this is borderline. Change to:
```tsx
className="border-white/30 text-white/60 cursor-not-allowed w-full sm:w-auto"
```

---

## Task 3: Screenshot Fixes (4 items)

### 3a. "Community socials" link on Team page

In `client/src/pages/Team.tsx`, find around line 652:
```tsx
<a href="/socials" className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors">community socials</a>!
```
Change to:
```tsx
<a href="/community" className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors">community</a>!
```
Also update the text before it. Find `See a role missing? Let us know in our` and keep that text, just change the link text from "community socials" to "community" and the href from "/socials" to "/community".

### 3b. HowItWorks Step 5 - infinity icon + new copy

In `client/src/components/HowItWorks.tsx`, find the step 5 object (around line 55):
```tsx
{
  number: "05",
  title: "Value Flows Back",
  summary: "As projects thrive, value returns to investors, players, and the land itself.",
  detail: "Healthy land appreciates. Thriving communities generate economic activity. Alliance services create recurring revenue. This creates a positive feedback loop where ecological regeneration drives financial returns, and financial returns fund more regeneration.",
  icon: TrendingUp,
```
Change to:
```tsx
{
  number: "05",
  title: "Regenerative Economic Systems",
  summary: "The land projects, organizations, and food producers create the foundations for entirely new economic systems. Welcome to the Infinite Game.",
  detail: "Healthy land appreciates. Thriving communities generate economic activity. Food systems become local. Governance becomes participatory. Alliance services create recurring value. Together these pieces form the foundation of regenerative economies that grow stronger the more people participate.",
  icon: Infinity,
```

Also update the import at the top of the file. Find:
```tsx
import {
  Sprout, Users, Coins, Globe, ArrowRight, ChevronDown,
  Leaf, Handshake, Target, TrendingUp
} from "lucide-react";
```
Change `TrendingUp` to `Infinity`:
```tsx
import {
  Sprout, Users, Coins, Globe, ArrowRight, ChevronDown,
  Leaf, Handshake, Target, Infinity
} from "lucide-react";
```

If `TrendingUp` is used elsewhere in the same file, keep it in the import and add `Infinity`. Check before removing.

### 3c. GameHookBanner redesign (hybrid: emerald glass + Seed of Life watermark)

Rewrite `client/src/components/GameHookBanner.tsx` completely. The new design combines:
- Emerald gradient base (forest palette)
- Glass-like transparency with `backdrop-blur`
- Faint Seed of Life SVG watermark behind the text at 6% opacity
- Hook text in `#7dd87d` green, subtext in white/85
- Thin glowing green border lines

Replace the entire component file with:

```tsx
/**
 * GameHookBanner - "If enough of us play the Game, it's real."
 * Full-width band displayed on homepage, /play, /quest, /game, /local-food-economy.
 * 5 contextual versions. Links to /economy.
 */
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";

const HOOK_VARIANTS: Record<string, { hook: string; subtext: string }> = {
  home: {
    hook: "If enough of us play the Game, it's real.",
    subtext: "A regenerative economy built by the people who use it.",
  },
  play: {
    hook: "Every quest you complete builds a real economy.",
    subtext: "Your contributions earn tokens that create the foundation for new economic systems.",
  },
  quest: {
    hook: "This quest is part of something bigger.",
    subtext: "Completing quests builds your contribution score and grows the regenerative economy.",
  },
  game: {
    hook: "The Game is the economy. The economy is the Game.",
    subtext: "Contribution scores, gratitude tokens, seasonal harvests. All real.",
  },
  food: {
    hook: "Local food systems start with local action.",
    subtext: "Rate producers, support regenerative farms, build food sovereignty in your bioregion.",
  },
};

interface Props {
  variant?: keyof typeof HOOK_VARIANTS;
  className?: string;
}

export function GameHookBanner({ variant = "home", className = "" }: Props) {
  const content = HOOK_VARIANTS[variant] ?? HOOK_VARIANTS.home;

  return (
    <Link href="/economy">
      <div
        className={`w-full py-6 px-4 border-y border-[#7dd87d]/25 cursor-pointer group transition-all relative overflow-hidden ${className}`}
        style={{
          background: "linear-gradient(135deg, rgba(26,71,42,0.92) 0%, rgba(45,107,63,0.88) 50%, rgba(26,71,42,0.92) 100%)",
          backdropFilter: "blur(12px)",
          boxShadow: "inset 0 1px 0 rgba(125,216,125,0.2), inset 0 -1px 0 rgba(125,216,125,0.2)",
        }}
      >
        {/* Seed of Life watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
          <SeedOfLifeIcon className="text-[#7dd87d]" size={200} />
        </div>

        <div className="container max-w-4xl mx-auto text-center relative z-10">
          <p
            className="text-lg md:text-xl font-bold mb-1"
            style={{
              fontFamily: "var(--font-display)",
              color: "#7dd87d",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            {content.hook}
          </p>
          <p
            className="text-sm flex items-center justify-center gap-1"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {content.subtext}
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              style={{ color: "#7dd87d" }}
            />
          </p>
        </div>
      </div>
    </Link>
  );
}
```

This replaces the ugly gold gradient with an emerald glass panel that integrates with the forest aesthetic, adds sacred geometry depth through the watermark, and uses proper green accents that match the rest of the site.

And the arrow icon:
```tsx
style={{ color: "#FFF8E7" }}
```
Change to:
```tsx
style={{ color: "#7dd87d" }}
```

### 3d. BFF resource link

Search across the codebase for a "resources" section, an "Alliance Partners" list, or a page that lists organizations/tools. Add a reference to Bioregional Financing Facility (BFF) linking to `https://www.biofi.earth/`. If there's an alliance partners section or a resources page, add BFF there. If no natural location exists yet, add it to the `/economy` page or the Alliance Partners section of the community page as a highlighted resource:

```tsx
<a href="https://www.biofi.earth/" target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] underline hover:text-[#9de89d]">
  Bioregional Financing Facility (BFF)
</a>
```

The exact placement depends on what exists. Look for "resources", "partners", "tools", "alliance" sections. If adding to economy page copy, frame it as: "Allocate resources to a Bioregional Financing Facility (BFF)." with the link on "BFF".

---

## Task 4: Skill Installation

The new skill is at:
```
.claude/skills/regen-background-design/SKILL.md
```

To make it available to Claude Code globally, copy it:
```bash
mkdir -p ~/.claude/skills/regen-background-design
cp .claude/skills/regen-background-design/SKILL.md ~/.claude/skills/regen-background-design/SKILL.md
```

---

## Final Verification

After all changes:

1. Run `npm run build` and verify it compiles without TypeScript errors
2. Check the CrowdPoolingProjects page renders (no missing import errors for PageBackground)
3. Verify no `background-attachment: fixed` remains in the crowd-pooling file:
   ```bash
   grep -n "backgroundAttachment" client/src/pages/CrowdPoolingProjects.tsx
   # Should return nothing (or only "scroll")
   ```
4. Verify image files exist:
   ```bash
   ls -lh client/public/images/backgrounds/community-hero*.webp
   ls -lh client/public/images/crowd-pooling-hero.webp
   ```
5. Verify both images are under 2MB each for reasonable load times

Then commit and push:
```bash
git add client/src/pages/CrowdPoolingProjects.tsx
git add client/src/pages/Community.tsx
git add client/src/pages/Team.tsx
git add client/src/components/HowItWorks.tsx
git add client/src/components/GameHookBanner.tsx
git add client/public/images/backgrounds/community-hero.webp
git add client/public/images/backgrounds/community-hero-mobile.webp
git add client/public/images/crowd-pooling-hero.webp
git add .claude/skills/regen-background-design/SKILL.md
git commit -m "feat: backgrounds, contrast fixes, banner redesign, HowItWorks step 5, community socials link"
git push
```

---

## Handoff Breakdown

| Task | Who |
|---|---|
| Generate images (Gemini API calls) | Claude Code |
| Convert PNG to webp (Pillow) | Claude Code |
| Update Community.tsx hero JSX | Claude Code |
| Update CrowdPoolingProjects.tsx (PageBackground + contrast) | Claude Code |
| Fix contrast on all crowd-pooling cards and text | Claude Code |
| Change "community socials" to "community" in Team.tsx | Claude Code |
| Update HowItWorks step 5 (Infinity icon + new copy) | Claude Code |
| Redesign GameHookBanner (emerald gradient) | Claude Code |
| Add BFF link to appropriate page | Claude Code |
| Install skill to ~/.claude/skills/ | Claude Code |
| Run build + verify no errors | Claude Code |
| Review generated images and re-generate if not right | Rye (visual judgment call) |
| git push | Rye (needs git credentials) |
