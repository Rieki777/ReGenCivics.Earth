# Claude Code Prompt: H3 Wire `.ink-reveal` and `.blur-up` Animations

**Priority: HIGH — ships before Earth Day**

**This prompt requires a human in the loop.** Claude Code runs `npm run dev`, wires the classes, then pauses for Rye to eyeball each page before merging. Do not merge without Rye's sign-off on each hero.

---

## Context

`index.css` defines `.ink-reveal` and `.blur-up` as animation utility classes. As of this writing, **no element in the codebase has either class applied** (or they are applied inconsistently). The CTO audit flagged this as deferred because blind wiring risks flash-of-unstyled-content (FOUC) and layout shift.

Before starting, grep for `.ink-reveal` and `.blur-up` across `client/src/` to see the current state. Note any files where they ARE already applied and skip those.

Also confirm the classes respect `prefers-reduced-motion`. If `index.css` does not already wrap the animation in `@media (prefers-reduced-motion: no-preference)`, add that before wiring anything. Motion should be opt-in, not opt-out.

---

## Pages and placements

For each page below, apply the classes as specified. Start `npm run dev` and verify visually before moving to the next page.

| Page | File | Hero `<h1>` | Hero image / background element |
|------|------|-------------|----------------------------------|
| Home | `client/src/pages/Home.tsx` | `.ink-reveal` | `.blur-up` on the hero `<img>` or background `<div>` |
| Bionomics | `client/src/pages/Bionomics.tsx` | `.ink-reveal` | `.blur-up` on the hero image |
| Fund | `client/src/pages/Fund.tsx` | `.ink-reveal` | `.blur-up` on the hero image or particle canvas wrapper |
| Game | `client/src/pages/Game.tsx` | `.ink-reveal` | `.blur-up` on the hero image |
| Tokenomics | `client/src/pages/Tokenomics.tsx` | Already has `ink-reveal` on h1 (line 840) — verify it fires, skip if working | `.blur-up` on hero background/particle wrapper |
| Land | `client/src/pages/Land.tsx` | `.ink-reveal` | `.blur-up` on the hero image |
| Team | `client/src/pages/Team.tsx` | `.ink-reveal` | `.blur-up` on the hero image |

**Rules:**
- Apply `.ink-reveal` to the hero `<h1>` only — not subheadings or body text
- Apply `.blur-up` to the first meaningful image in the hero section — not icons or decorative shapes
- Do not apply either class to text inside interactive elements (buttons, links)
- If a hero has no `<img>` (pure CSS background or canvas), apply `.blur-up` to the outermost hero `<section>` with a note in a comment

---

## For each page, pause and report

After wiring each page, output:
```
[PAGE NAME] — classes applied:
  h1: .ink-reveal added at line X
  image: .blur-up added at line Y (element: <img src="...">)
  Visual: [describe what you see in the browser — does ink-reveal animate on load? does blur-up clear properly?]
  prefers-reduced-motion: [confirmed or not confirmed]
```

Do NOT proceed to the next page until you have visually confirmed the animation fires and does not cause layout shift (CLS).

---

## Verification checklist (run after all pages)

- [ ] `npm run build` passes with zero errors
- [ ] Each of the 7 hero h1s has exactly one `.ink-reveal` (not duplicated in className)
- [ ] Each of the 7 hero images has exactly one `.blur-up`
- [ ] No CLS observed on any page (open Chrome DevTools Performance tab, record a page load, confirm layout shift score is 0 or negligible)
- [ ] Animation does not fire on pages where user has `prefers-reduced-motion: reduce` set

---

## Commit

```
feat(animations): wire .ink-reveal and .blur-up to all hero sections

Applied to Home, Bionomics, Fund, Game, Tokenomics, Land, Team.
Each placement verified visually in npm run dev. prefers-reduced-motion
respected via existing @media wrapper in index.css.
```
