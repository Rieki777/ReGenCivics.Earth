# Claude Code Build Prompt — The Harvest (/admin-create) UX and readability fix

A design and accessibility pass on the shipped /admin-create page. Based on a screenshot review of the live page. Do not change the data model or the generation logic except for the one content bug in item 9. Read `client/src/pages/AdminCreate.tsx` and the shared UI tokens first, and keep the existing regen palette; the goal is to make it legible and clean, not to restyle the brand.

## The standard to hit
WCAG AA: normal text at least 4.5:1 against its background, large text (18.66px bold or 24px plus) and UI component boundaries at least 3:1. Verify computed contrast on the live page, do not eyeball it. Body reading text should aim higher, near 7:1.

## Issues and fixes

### 1. Compose textarea is unreadable
The compose box renders as a medium-gray filled area with light-gray placeholder text, so the prompt ("Drop an idea. First line becomes the working title...") barely shows and the field looks disabled or broken. Fix: white or cream fill, a clear 1px border in a mid tone, dark ink text for input, and placeholder at a real mid-gray (around #6b7280) that meets 4.5:1. Remove the gray fill entirely.

### 2. Primary buttons look disabled
"Compose the package" and "Draft 1 channel" use a muted sage green with pale text, which reads as disabled. Fix: primary actions get a strong filled green (the deep brand green) with white text at 4.5:1 or better. Define a genuinely distinct disabled state (lower opacity plus a not-allowed cursor) so enabled never looks disabled. The leading sparkle icon must be clearly visible, not washed out.

### 3. Secondary button contrast
"What would it draw from?" is pale green text on cream. Fix: darken the text or add a subtle fill so the label meets 4.5:1, and give it a visible border.

### 4. Score chips are low-contrast and crowd the title
The chips (material 1.00, recency 1.00, cluster 1.00, focus 1.00) are pale text on pale fill and sit cramped against the title, wrapping awkwardly. Fix: move the whole score cluster to its own row beneath the why-now line, not beside the title. Give each chip darker text (at least 4.5:1), a bit more padding, and a consistent gap. Keep the single overall score (the dark-green 1.00) as the one emphasized chip; the four component chips are secondary and smaller but still legible.

### 5. Theme pills
"crypto-tech" and "game-design" pills are pale green on pale. Fix: darker text or a stronger fill to reach 4.5:1.

### 6. Action row icons overlap and crowd
Develop, Snooze, Not this, Steer sit too tight, the icons crowd their labels, and the Develop button's chevron crowds its text. Fix: consistent spacing, at least an 8px gap between icon and label and at least 16px between actions, vertical centering, and a minimum 40px by 40px touch target for each. The Develop chevron needs its own padding from the label. Nothing should touch or overlap.

### 7. Draft preview body text is too light to read
The draft body renders in a muted teal-green on cream, which is the worst readability offender for a block of reading text. Fix: draft body in the ink color (near-black), line-height about 1.5, and a comfortable max reading width. Reserve green for headings and accents, never for paragraphs.

### 8. Angle input is faint
The "Angle (optional)..." field has a nearly invisible border and pale placeholder. Fix: visible border, mid-gray placeholder at 4.5:1, dark input text.

### 9. BUG, not just design: generated drafts contain em-dashes
The draft preview uses em-dashes as list markers ("— goal", "— target audience", "— pain points"). Em-dashes are a hard voice-rule violation, and they are reaching the screen, which means generation output is not being run through the voice grader, or the grader is not catching list-marker em-dashes. Fix: run every generated draft through the deterministic voice grader before it is stored and displayed, strip or convert em-dashes (to hyphens or a rewrite), and confirm the drafting prompt tells the model the hard rules. This is content correctness tied to the whole system's promise, so treat it as the priority item.

### 10. Overall hierarchy and rhythm
Everything sits at a similar low-contrast weight, so title, why-now meta, tags, scores, and body blur together. Establish a clear type scale: title (bold, dark green), why-now meta (small, mid-gray), tags and chips (small, legible), body (ink, readable). Add consistent vertical spacing between the card's sections so the eye can separate them.

## Recommended tokens (verify against the existing design system, adjust to match)
- Ink text: #23262b (body and inputs)
- Meta text: #55606a (why-now, secondary)
- Placeholder: #6b7280
- Primary green fill: #23503a with #ffffff text
- Accent green (headings): #2f6b4c
- Borders: #cdd3cc
- Chip text on pale fill: at least #3a4a40
Do not introduce new brand colors; map these onto the existing tokens.

## Ship gate
```
pnpm gate
pnpm test   # voice grader runs on generated draft output and no em-dash reaches a stored/displayed draft; a component test asserts primary button and body text meet the contrast tokens above
```
Per new className, grep it in client/src. Evidence: paste computed contrast ratios for the compose placeholder, a score chip, a theme pill, and the draft body, before and after.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Git push and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 2 | Eyeball the live page after deploy, on desktop and phone | Only you see it in context | regencivics.earth/admin-create |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | Compose textarea: remove gray fill, fix placeholder and text contrast | READY TO BUILD |
| 2 | Primary and secondary buttons: strong enabled state, distinct disabled | READY TO BUILD |
| 3 | Score chips: own row, legible, uncrowded | READY TO BUILD |
| 4 | Theme pills contrast | READY TO BUILD |
| 5 | Action row spacing, no overlap, 40px targets | READY TO BUILD |
| 6 | Draft body in ink, readable width and line-height | READY TO BUILD |
| 7 | Angle input contrast | READY TO BUILD |
| 8 | Voice grader on draft output, strip em-dashes (priority) | READY TO BUILD |
| 9 | Type scale and vertical rhythm | READY TO BUILD |
| 10 | Contrast and grader tests | READY TO BUILD |

## Secondary observation (not this build)
The top ripe idea is a copied AI-marketing template ("ALERT Claude just upended the content creator") scored 1.00. Ripeness may over-rank forwarded or promotional content that is not really Rye's own thinking. Worth a later tune: down-weight captures that look forwarded or templated, so the feed favors Rye's original ideas. Flagging only; leave for a separate pass.
