# Shipped log

Rolling reference index of past sprints, fixes batches, and execution prompts. Each entry summarizes what landed; full source docs live in `archive/` if you need the original spec or item-by-item detail.

When picking up new work, the recent entries here are usually the relevant context. The git log is the authoritative source of what actually shipped per file; this doc is the human-readable map.

Add new entries to the top. Format per entry:

- Date and theme on one line
- 3-6 bullet summary of what was in scope
- Pointer to the archived source doc(s)
- Open carryover items noted at the end if any (otherwise omit)

---

## 2026-04-23 — Batch 3 UI follow-ups

Sixteen fixes from a screenshot batch. Six shipped directly by Cowork agent: governance "Contribution Scores" card removed (system not built yet), season label hard-set to "winter" until the Sept 2026 equinox, Schedule "Episode day/time may be adjusted" caveat hidden under the Past Events tab, forum Weekly Digest card recolored for forest-bg readability, "Create Account" routes to OAuth instead of `/connect`, Apply-page login gate restyled to forest theme, More tab logo swapped to phoenix-circle crest. Nine specced for Claude Code (gratitude mobile clipping verify, Safari FAB position, music player mobile dedupe, mobile menu horizontal scroll, Apply button audit on map, volume slider iOS, sign-in debug, plus two human-only items). One Rye-only: Earth Day Google Cal Zoom→Riverside swap.

Source: `archive/FIXES_TO_MAKE_2026-04-23_BATCH3.md`.

## 2026-04-21 — UI batch (15 fixes) + Batch 2 (5 fixes)

Two waves of screenshot-driven UI fixes. Batch 1: forum editor toolbar (TipTap mousedown preventDefault + click-anywhere-to-focus + serializer carries list context for ordered numbering), removed the High contrast button, Continue-to-Hypha opens in new tab, comets spawn from upper 27% only, welcome map cropped + text box narrowed, footer Game column condensed 11→5. Plus 9 complex items specced into the doc for Claude Code: vouches, focus areas multi-select, season intention server-backed, Epic Quests locked-by-default, river/bridge/scales image swap, mobile playlist parity, Cowork onboarding download. Batch 2: Who Holds the Vote PNG replaces SVG pie, gratitude dialog escapes card clipping via Portal + fixed positioning, forum forest theme on all three forum pages, Tools Library matcher repositioned, Promote-to-decision modal body scroll lock + single inner scroll.

Source: `archive/FIXES_TO_MAKE_2026-04-21_UI_BATCH.md`, `archive/FIXES_TO_MAKE_2026-04-21_BATCH2.md`.

## 2026-04-19 — Quest progressive disclosure v2 + Hypha bridge fixes + Mobile Safari carryover

Three doc set. (a) Quest Card Progressive Disclosure v2 build (rewriting the CSS-only Tier 2 hover into a full three-tier disclosure, content sourced from `QUEST_MASTER_SHEET.md`). (b) Three Hypha bridge bugs found in pre-refactor audit + status of the upstream Hypha PRs. (c) Six items that Claude Code couldn't close from the 2026-04-08 mobile Safari batch, listed as a shipping checklist (everything else from that batch is VERIFIED or waiting only on git push + iPhone device testing).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md`, `archive/FIXES_TO_MAKE_2026-04-19_HYPHA_BRIDGE.md`, `archive/FIXES_TO_MAKE_2026-04-19_CARRYOVER.md`.

## 2026-04-18 — Polish Sprint 4 + Sprint 3 close-out

Sprint 4 polish build (the `_POLISH_SPRINT4.md` send-off) plus Sprint 4 close-out + Sprint 3 Part B (the `_FINISH.md` follow-up). Took the site from "shipping-quality" toward world-class on Tier 1 + Tier 3 routes. Plus a screenshot-driven Part 0 in the fixes doc with three SPEC docs (top-priority items from Rye's April 17 walkthrough).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-18_POLISH_SPRINT4.md`, `archive/CLAUDE_CODE_PROMPT_2026-04-18_FINISH.md`, `archive/FIXES_TO_MAKE_2026-04-18.md`.

## 2026-04-17 — Sprint 3 World-Class Polish + Visual Audit

Beauty, readability, and seamlessness layer on top of the V5 retry sprint (drift sweep, pre-commit guards, exotic hex cleanup). Visual audit was a route-by-route pass on desktop + iPhone emulator, normalizing color palette around the locked dark-forest tokens. Pairs with `client/src/lib/design-tokens.ts` and `DESIGN_SYSTEM.md` (both still in repo root as standing references).

Source: `archive/CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md`, `archive/FIXES_TO_MAKE_VISUAL_AUDIT.md`.

## 2026-03-27 — Community Agreements feature + forum UI polish

Full build plan for the interactive Community Agreements page plus several forum UI changes. Long-running plan that was reviewed by CTO 2026-04-08 and verified 2026-04-09. The companion `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md` (still in repo root) tracks the actual implementation work as it shipped.

Source: `archive/COMMUNITY_AGREEMENTS_PLAN.md`. Implementation log: `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md`.

---

## How to add a new entry

When you ship a sprint or close a fixes batch:

1. Add a new section at the top of this file with date, theme, summary, and source pointer.
2. Move the source `CLAUDE_CODE_PROMPT_*.md` and `FIXES_TO_MAKE_*.md` files to `archive/`.
3. Note any open carryover items at the end of the entry so the next session knows what's still pending.

The auto-archive convention from `~/.claude/memories/rye-working-style.md` says any dated doc older than 1 week migrates to `archive/`. This log is the place those entries land before they fall off the working-list radar.
