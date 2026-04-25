# Fixes to Make — 2026-03-16

This document continues from `FIXES_TO_MAKE_2026-03-15.md` and `FIXES_TO_MAKE_2026-03-14.md`.

---

## Handoff Summary — State at end of 2026-03-15

### DONE THIS SESSION

| Fix | Task | Status |
|---|---|---|
| Fix 109 Step 7 | Idle preloading of Quest/Community/Play in Home.tsx | DONE |
| Fix 109 Step 9 | `/health` GET endpoint added to server | DONE |
| Fix 103 | Nav icon ⛰️ → 🌲 | CONFIRMED ALREADY DONE |
| Fix 107 Part A | /game SEEDS section expanded to Regenerative Renaissance framing | DONE |
| Fix 107 Part B | Contributions discussion forum seed post added to seed-forum-posts.ts | DONE |
| Fix 108 Bug 2 | Activity bar text color fixed (white/70 → text-[#1a472a] on cream bg) | DONE |
| Fix 108 Bug 3 | Weekly Digest section restyled with visible bg/text | DONE |
| Fix 108 UX | Welcome card, hero stats, newsletter CTA all restyled for visibility | DONE |
| Fix 110-A | Floating button overlaps fixed (SiteTour: bottom-[72px], ScrollToTop: bottom-[128px]) | DONE |
| Fix 110-B | Anytime Quests section added after Winter section | DONE |
| Fix 110-C Part 2 | "Earn Tokens, Gain Voice" callout removed from /quest page | DONE |
| Fix 110-D | Why Quests opening expanded with "What if healing..." + co-creating new economy paragraphs | DONE |
| Fix 110-E | Quest Arc label → "Quest Arc for the Rites of Passage: full journey!" + Map icon | DONE |
| Fix 110-F item 2 | Food Foresting token corrected +33 → +111 $Regen | DONE |

---

### DONE THIS SESSION (2026-03-16 continued)

| Fix | Task | Status |
|---|---|---|
| Wave 1.5 | Token rebalancing — questData.ts + seasonalQuestsData.ts + QuestDetailModal.tsx | DONE |
| Wave 1.6 | Ringing Cedars quest added to seasonalQuestsData.ts + cedar_keeper badge + forum thread | DONE |
| Wave 2.6 | Two blog posts added: claim-your-land-project + your-seeds-contributions-live-on | DONE |
| Fix 102 | Footer logo — logos found in place, SiteFooter.tsx updated to use regencivics-logo-light.png | DONE |
| Fix 101 | scripts/bake-overlays.ts written (Rye to run: npx tsx scripts/bake-overlays.ts) | SCRIPT DONE |
| Fix 110-F item 1 | Quest story cards added for all 14 quests in QuestDetailModal.tsx | DONE |
| Fix 110-F item 3 | EPIC quests replaced with official content from QUEST_MASTER_SHEET Part 5 | DONE |

---

### STILL PENDING — Claude Code

| Fix | Task | Priority | Notes |
|---|---|---|---|
| ~~Fix 76A~~ | ~~Quest PDF field guides~~ | Low | **DONE 2026-03-14** — 9 remaining PDFs generated (quests 5-13); QUEST_PDF_SLUGS updated in QuestDetailModal.tsx |
| ~~Fix 110-C Part 1~~ | ~~Start Your Journey cards in a 2-up/3-up grid~~ | Low | **DONE** — HowItWorks.tsx already has 3-up responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) |

### RYE — actions needed

| Task | Command / Action |
|---|---|
| Bake overlay images | `npx tsx scripts/bake-overlays.ts` then update imageSrc refs (script prints the mapping) |
| Re-run seed-forum-posts | `npx tsx scripts/seed-forum-posts.ts --reset` (now includes Ringing Cedars thread) |
| Confirm quest qualifier data | Review questQualifiers.ts with stewards before re-enabling |
| UptimeRobot setup | Set up free uptime monitor at uptimerobot.com to ping `/health` every 5 minutes |
