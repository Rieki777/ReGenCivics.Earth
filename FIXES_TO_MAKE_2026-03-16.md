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

### STILL PENDING — Claude Code

| Fix | Task | Priority | Notes |
|---|---|---|---|
| Fix 102 | Footer logo | Medium | Blocked on Rye saving logo files |
| Fix 76A | Quest PDF field guides | Low | Use /pdf skill, source: QUEST_MASTER_SHEET.md |
| Wave 1.5 | Token rebalancing — update all $ReGen values | High | Use TOKEN_REBALANCING_PROPOSAL.md |
| Wave 1.6 | Ringing Cedars quest + forum thread + cedar badge | High | Use QUEST_RINGING_CEDARS_DRAFT.md |
| Fix 101 | Restore parallax backgrounds with baked overlays | High | Write scripts/bake-overlays.ts using sharp |
| Wave 2.6 | Two blog posts added to site | Medium | BLOG_CLAIM_YOUR_PROJECT.md + BLOG_SEEDS_CONTRIBUTIONS.md |
| Fix 110-C Part 1 | Start Your Journey cards in a 2-up/3-up grid | Low | Journey cards not found in current code — may be unimplemented |
| Fix 110-F item 1 | Wire up quest story card details from QUEST_MASTER_SHEET.md | Medium | questDetailsData.ts needs populating |
| Fix 110-F item 3 | EPIC quests section: add official EPIC quest content from QUEST_MASTER_SHEET.md Part 5 | Medium | |

### RYE — actions needed

| Task | Command / Action |
|---|---|
| Save logos | Put `regencivics-logo-dark.png` and `regencivics-logo-light.png` in `client/public/images/logos/` |
| Re-run seed-forum-posts | `npx tsx scripts/seed-forum-posts.ts --reset` (now includes contributions discussion thread) |
| Confirm quest qualifier data | Review questQualifiers.ts with stewards before re-enabling |
| UptimeRobot setup | Set up free uptime monitor at uptimerobot.com to ping `/health` every 5 minutes |
