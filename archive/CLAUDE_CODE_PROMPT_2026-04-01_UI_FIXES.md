# UI Fixes — Mobile Readability, Error Page, Gold Banner
## 2026-04-01

Five focused fixes. All frontend. No DB changes. Verify each one at 375px
mobile viewport width before marking complete.

---

## Fix 1 — Hypha Space Treasury modal: text hard to read on mobile

**Find:** Search for "Hypha Space Treasury" in `client/src/`. It appears in
a modal or expandable card on the Fund or player profile page.

**Problem:** The text content area has insufficient background contrast
against the background image. Body text is hard to read.

**Fix:** On the modal/card content container (the div wrapping the text, not
the outer modal shell):
- Set background to `rgba(10, 28, 18, 0.82)` or similar dark-green semi-opaque
- Ensure body text is `color: white` with `font-weight: 400` minimum
- Add `border-radius: 12px` and `padding: 16px` if not already present
- The green pill tags ("On-Chain Transparency", "90% Unity Governance",
  "Live Updates") are fine — leave those as-is

**Verify:** Screenshot at 390px width. Text should be clearly legible against
the background.

---

## Fix 2 — Anyone / ReGen Players page: text hard to read on mobile

**Find:** Search for "Anyone" or "ReGen Players" in `client/src/pages/`.
This is one of the four path landing pages.

**Problem:** The hero section text ("Anyone / ReGen Players" headline and
body copy) is hard to read over the background image on mobile.

**Fix:**
- Add `text-shadow: 0 2px 16px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)`
  to the main headline
- Add the same shadow to the body paragraph text
- Increase the dark overlay on the hero section: find the overlay div
  (likely `bg-black/40` or similar) and raise it to at least `bg-black/55`
  or `rgba(0,0,0,0.55)`
- If there is a subtitle line ("At what level do we want to play the
  Infinite Game?") that also appears, apply the same text-shadow

**Verify:** Screenshot at 375px. Headline and body should be fully legible.

---

## Fix 3 — Welcome Back four-path cards: labels hard to read on mobile

**Find:** Search for "Welcome Back" in `client/src/`. This is the
authenticated home/dashboard view. The four cards are "Investors",
"Land Projects", "Alliance Partners", "ReGen Game Players".

**Problem:** The card labels ("FUND THE RENAISSANCE" etc.) and subtitles
("Go →") are hard to read over the card background images on mobile.

**Fix:** On each card's label/text overlay area:
- Strengthen the bottom gradient: change from current value to
  `linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)`
- Add `text-shadow: 0 1px 6px rgba(0,0,0,0.9)` to the label text
- Ensure the subtitle text (path description + "Go →") also has the shadow

**Verify:** Screenshot at 390px. All four card labels clearly readable.

---

## Fix 4 — Error page buttons not clickable (HIGH PRIORITY)

**Find:** Search for "ponder the TAO" or "Return Home" in `client/src/`.
This is the error boundary or 404 page component.

**Problem:** "Return Home" and "Visit Community" buttons render but cannot
be clicked/tapped on mobile.

**Root cause:** Almost certainly one of two things:
1. The component uses `useNavigate` from React Router inside an
   ErrorBoundary — router hooks fail when the router context is unavailable
   (which it can be inside error boundaries)
2. An invisible overlay element sits above the buttons with a higher z-index

**Fix:**
- Check if the component uses `useNavigate`. If yes, replace the button
  onClick handlers with plain anchor tags:
  ```tsx
  // Replace:
  <button onClick={() => navigate('/')}>Return Home</button>
  // With:
  <a href="/">Return Home</a>
  // And:
  <a href="/community">Visit Community</a>
  ```
  Style the `<a>` tags identically to the current buttons.
- If no `useNavigate`, inspect the component for any positioned overlay
  elements. Add `position: relative; z-index: 10` to the button container.
- Check for `pointer-events: none` anywhere in the ancestor chain.

**Verify:** Navigate to a broken URL (e.g. `/broken-page-test`) to trigger
the error/404 state. Confirm both buttons navigate correctly on mobile and
desktop.

---

## Fix 5 — "If enough of us play the Game, it's real." banner: gold glow

**Find:** Search for "If enough of us play" in `client/src/pages/Home.tsx`.
This is a banner section on the homepage.

**Problem:** The banner uses a plain flat background. Rye wants a warm
glowing gold treatment to make it feel significant.

**Fix:** Update the banner section's background styling:

If using Tailwind with arbitrary values:
```tsx
style={{
  background: 'linear-gradient(135deg, #7A5C0F 0%, #B8860B 30%, #D4A017 50%, #B8860B 70%, #7A5C0F 100%)',
  boxShadow: 'inset 0 0 80px rgba(212, 160, 23, 0.35), 0 4px 32px rgba(212, 160, 23, 0.15)'
}}
```

Text color changes:
- Main headline ("If enough of us play the Game, it's real."): change to
  `#FFF8E7` (warm white) with `text-shadow: 0 1px 12px rgba(0,0,0,0.4)`
- Subtext ("A regenerative economy built by the people who use it."): same
  warm white, slightly lower opacity (`opacity: 0.9`)
- Arrow/link icon: `#FFF8E7`

Remove any existing green background classes from this section.

**Verify:** Screenshot at both desktop (1280px) and mobile (390px). The
banner should read as warm and golden, not garish. If it feels too bright,
reduce the middle stop from `#D4A017` to `#C49010`.

---

## After all fixes

Run the dev server and take screenshots of:
1. Hypha Treasury modal on mobile
2. Anyone/ReGen Players page on mobile
3. Welcome Back dashboard on mobile (logged in)
4. Error page (navigate to `/broken-test`) on mobile and desktop
5. Homepage gold banner on desktop and mobile

All five should show clear improvements. Commit as:
`fix: mobile readability, error page buttons, gold banner styling`
