# Carryover from 2026-04-08 Mobile Safari Batch — 2026-04-19

Six items from `FIXES_TO_MAKE_2026-04-08_MOBILE_SAFARI.md` could not be
closed by Claude Code. They live here as a short shipping checklist.

The parent doc has been archived (`archive/FIXES_TO_MAKE_2026-04-08_MOBILE_SAFARI.md`)
because every other fix is either VERIFIED or CODED and waiting only on
`git push` plus iPhone Safari device testing.

---

## The 6 carryover items

### A1 — Per-page horizontal-scroll audit

**Status:** HUMAN STEP REQUIRED

The global safety net is already in `client/src/index.css` (`html, body
{ overflow-x: hidden; }` at line 279, `max-width: 100vw` at line 2095).
That prevents the symptom. It does not fix the underlying element that
is wider than the viewport.

**What you do.** Walk each top-level route on a real iPhone Safari with
devtools connected. Pages confirmed affected: Welcome, Bionomics,
Crowdpooling, Live Governance Dashboard, 4 Paths to Play. For each
overflowing element, post the selector and offending width in chat so
Claude Code can cap it properly.

---

### A3 — Mobile menu redesign

**Status:** IDEAS FOR RYE

Ten menu ideas live in the archived doc (Section "For Rye — Mobile
menu: 10 ideas"). Reply with `idea #N` and Claude Code wires the
chosen direction into `client/src/components/MobileMenu.tsx` plus the
Tools route and the wizard-family icon.

---

### B8 — Bionomics "For food producers" button links

**Status:** BLOCKED on content

The button needs a destination. Either paste the Medium "Food Producers
Unite" URL in chat, or paste fresh copy and Claude Code will draft a
blog post at `/blog/food-producers-unite` and point the button there.

---

### E4 — Tools page broken links

**Status:** WAITING ON RYE

Post the full list of broken tool URLs and Claude Code will update each
row in the `tools` table (via a fresh migration file) and rewrite any
hardcoded links in the JSX.

---

### G1 — Open Access session: April 5 → April 20

**Status:** HUMAN STEP REQUIRED

Three-part update:

1. DB row in `scheduleEvents`:
   ```sql
   UPDATE scheduleEvents
   SET startAt = '2026-04-20 18:00:00',
       endAt   = '2026-04-20 19:30:00',
       updatedAt = NOW()
   WHERE slug = 'open-access-2026-04-05';
   ```
2. Google Calendar event (Cowork Claude can do this via the gcal MCP
   if you ask directly).
3. Riverside room name / date.

If you open Railway's DB console, Cowork Claude can run the SQL and
the calendar update in the same session. Ask for it in chat.

---

### I2 — How do players currently send gratitude?

**Status:** QUESTION FOR RYE

One-liner: describe the current flow (is it a modal? a forum post?
nothing yet?). Claude Code will either document what exists or spec
the missing path.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| A1 | Walk each page on iPhone Safari, post offending selectors | Physical device required | Post selectors in chat |
| A3 | Pick mobile menu idea | Editorial judgment | Reply with `idea #N` |
| B8 | Paste Medium URL or fresh blog copy | Editorial | Paste in chat |
| E4 | List broken tool URLs | Need the list | Paste list in chat |
| G1 | Update DB + gcal + Riverside (or ask Cowork Claude to do it) | Railway + gcal + Riverside access | Reply "update open access to April 20" |
| I2 | Describe current gratitude flow | Only you know | One-liner in chat |
| — | Push the 23 CODED items | Holds index.lock on this machine | `git push origin main` |
| — | Approve Railway deploys | Dashboard access | Railway UI |
| — | Test each CODED fix on a real iPhone | Physical device | — |

### CLAUDE CODE — can be done without you

Nothing. Every remaining fix in this carryover is blocked on Rye input
or on Rye shipping the CODED batch. Claude Code will resume work the
moment any of the six above clears.

### WAITING ON YOU before Claude Code can proceed

All six items above.
