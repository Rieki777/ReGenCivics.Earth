# Fixes to Make: 2026-06-20

This batch covers UI readability issues, a scroll bug, homepage layout changes, and a broken save button. All from mobile screenshots.

---

## Fix 1: Apply page form text readability (High)

**Status:** CODED

**Symptom:** On `/apply` (Apply.tsx), form field labels ("Project Name *", "Project Type *", "Location *", "Project Vision *"), in-field text, and helper text are too light. Hard to read on mobile. Headers need to be darker. Input text needs more contrast against the light form backgrounds.

**Fix:** In Apply.tsx, find all label/header elements and form input styling. Ensure:
- Section headers like "Basic Information" use `text-gray-900` or `text-foreground` (not gray-500/600)
- Form field labels use `text-gray-800` or darker
- Input text (both placeholder and entered value) uses `text-gray-900` for values, `text-gray-500` for placeholders (not lighter)
- Helper text below fields uses at least `text-gray-600`
- The select dropdown text ("Select project type") should be dark when a value is selected

**Files to check:** `client/src/pages/Apply.tsx`, and any shared form component styles in `client/src/components/ui/` (input.tsx, select.tsx, label.tsx, textarea.tsx)

---

## Fix 2: Remove LOI suggestion box from Apply page (High)

**Status:** CODED

**Symptom:** At the top of `/apply`, there's a callout box that says "Early stage and just exploring? Send a brief Letter of Intent. We will follow up to see if the program is a fit." with a "Send a Letter of Intent" button. Rye wants this removed entirely.

**Fix:** In Apply.tsx, find and remove the LOI suggestion callout. Look for text content matching "Early stage and just exploring" or "Letter of Intent". Remove the entire containing div/section. The LOI route itself can stay, just remove the callout from the apply form page.

**Files to change:** `client/src/pages/Apply.tsx`

---

## Fix 3: Quest detail modal scroll bug (Critical)

**Status:** CODED

**Symptom:** When scrolling inside the quest detail modal (the popup showing quest details like "Quest 5: Rites of Love"), the scroll passes through to the main page behind it. The modal content doesn't scroll independently.

**Fix:** In QuestDetailModal.tsx, the modal overlay needs `overscroll-behavior: contain` and the modal body needs `overflow-y: auto` with a `max-height`. The backdrop should also prevent scroll passthrough. Common fix pattern:

1. On the modal overlay/backdrop: add `overflow-hidden` to the body element when modal opens (or use a portal with scroll lock)
2. On the modal content container: add `overflow-y-auto overscroll-contain` and set `max-h-[90vh]` or similar
3. Ensure the scrollable area is the content div inside the modal, not the entire overlay

Also check if there's a useEffect that disables body scroll when the modal is open. If missing, add:
```tsx
useEffect(() => {
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = ''; };
}, []);
```

**Files to change:** `client/src/components/QuestDetailModal.tsx`

---

## Fix 4: Homepage welcome section layout (Medium)

**Status:** CODED

**Symptom:** On the homepage (Home.tsx), the "Welcome Beautiful Human" section has text overlaying the fantasy map image. The text reads "regen civics is a fund and an in-real-life game for supporting regenerative land projects..." overlaid on the map, but the text is hard to read because it's directly on the image with minimal contrast.

**Fix:** Rye wants the layout restructured:
- The first paragraph ("regen civics is a fund and an in-real-life game for supporting regenerative land projects and the ReGenerative Renaissance...") should be in a card/box ABOVE the map, with a solid or semi-transparent background for readability
- The second paragraph ("We create quests and Infinite Games that help people heal...Welcome to the Infinite Game.") should stay on/in the map
- Scale the map and text so it renders better on mobile

Look for the relevant section in Home.tsx. It likely uses a `PageBackground` or a styled div with a background image. Restructure so the first paragraph is in its own container with `bg-card` or `bg-background/90` styling, placed above the map image, and only the second paragraph overlays the map.

**Files to change:** `client/src/pages/Home.tsx`

---

## Fix 5: Landing screen 2x2 path cards redesign (Medium)

**Status:** CODED

**Symptom:** The main landing page has a 2x2 grid of path cards (Investors, Land Projects, Alliance Partners, ReGen Players). The current design for first-time visitors shows expanded cards with subtitles ("FUND THE RENAISSANCE"), long descriptions, and "Explore the Fund ->" links. Rye prefers the design used for returning users: compact cards with character art images, titles, "YOUR PATH" badge, "Go ->" links, and a collapsible "MORE" section.

**Fix:** In Home.tsx, find the two versions of the 2x2 path grid. Replace the first-visit/default version with the returning-user version's design. The returning version has:
- Larger character art images filling the card top
- "YOUR PATH" badges (for returning users with selected paths)
- Title + subtitle underneath the image
- "Go ->" link
- Expandable "v MORE" toggle
- More compact overall

The new design should still work for both first-time and returning visitors. For first-time visitors, omit the "YOUR PATH" badge but keep the compact card layout.

**Files to change:** `client/src/pages/Home.tsx`

---

## Fix 6: Token page readability (High)

**Status:** CODED

**Symptom:** On the economy/tokens page (Economy.tsx), the "ReGen Game Tokens + RGVoice" section and the "NOTE: These tokens are unique from... Fund tokens!" text are hard to read. Text is overlaid on a busy background image with insufficient contrast. This is a site-wide readability issue on pages with text-over-image sections.

**Fix:** For the immediate fix, add semi-transparent background panels behind text sections on the economy page. Look for sections with text overlaying background images and add `bg-black/50 backdrop-blur-sm` or `bg-card/80` behind the text content, with appropriate padding and rounded corners.

For a thorough approach: audit all pages that use text over background images and apply the same treatment. Key pages to check: Economy.tsx, Home.tsx, and any page using the PageBackground component with overlaid text.

**Files to change:** `client/src/pages/Economy.tsx` (primary), and potentially a shared utility class

---

## Fix 7: Save button broken on contribution form (Critical)

**Status:** CODED

**Symptom:** On the crowd pooling page, the "Save Contribution Form" dialog appears (with a name field showing "Generic Contribution" and a "Set as default form" checkbox), but the Save button doesn't work when clicked. The Cancel button may also be affected.

**Fix:** In CrowdPoolingTool.tsx (around line 726 based on earlier search), find the Save Contribution Form dialog. Debug why the Save button's onClick handler doesn't fire or doesn't complete. Common causes:
- Missing onClick handler
- Handler references stale state
- The button is inside a form that submits instead of calling the handler
- The dialog's event handling conflicts with the parent form
- z-index issues with the button click target

Check the save handler logic. Make sure it calls the appropriate tRPC mutation or local state update and closes the dialog.

**Files to change:** `client/src/components/CrowdPoolingTool.tsx`

---

## Fix 8: Form text contrast site-wide (High)

**Status:** CODED

**Symptom:** Across multiple forms (Apply page, CrowdPooling contributions, tools submission), input text is too light against the light-colored form backgrounds. The input fields have a light green/gray tint with white or very light text, making entered values hard to read.

**Fix:** This is likely a global CSS issue with form input styling. Check:
1. `client/src/components/ui/input.tsx` and `textarea.tsx` for the base text color class
2. `client/src/index.css` or `globals.css` for CSS variable definitions (`--input`, `--foreground`, etc.)
3. Any Tailwind theme overrides in `tailwind.config.ts`

The input text color should be `text-foreground` (mapped to near-black/dark color). If the inputs currently use a custom color that's too light, change to standard foreground. Placeholder text should be `text-muted-foreground`.

Ensure these elements all use dark text:
- Input values (what the user typed)
- Select dropdown selected values
- Textarea content
- Form labels
- Section headers within forms

**Files to change:** `client/src/components/ui/input.tsx`, `client/src/components/ui/textarea.tsx`, `client/src/components/ui/select.tsx`, possibly `client/src/index.css`

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| - | Run Plays migrations 0137-0140 | Railway DB access | `npx tsx scripts/run-migration.ts --all` (after deploy) |
| 7 | Reproduce Save button bug | Browser interaction needed | Click Save on crowd pooling form, check console for errors |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Apply page form text readability | CODED |
| 2 | Remove LOI suggestion box | CODED |
| 3 | Quest detail modal scroll bug | CODED |
| 4 | Homepage welcome section layout | CODED |
| 5 | Landing 2x2 path cards redesign | CODED |
| 6 | Token page readability | CODED |
| 7 | Save button broken investigation | CODED |
| 8 | Form text contrast site-wide | CODED |

### PRIORITY ORDER

1. Fix 3 (quest modal scroll) and Fix 7 (save button): Critical, blocking user interaction
2. Fix 1, 6, 8 (readability/contrast): High, affects all mobile users
3. Fix 2 (remove LOI box): High, quick removal
4. Fix 4, 5 (homepage layout): Medium, visual improvement
