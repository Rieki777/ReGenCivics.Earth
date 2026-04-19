# Claude Code Prompt: Community Agreements + Forum Polish (2026-04-08)

Your job: implement everything in `COMMUNITY_AGREEMENTS_PLAN.md`. A CTO review pass was already done on that doc. The section at the top labeled **"CTO REVIEW NOTES (read first, 2026-04-08)"** tells you which parts are already shipped, which names were wrong in the original plan, and the exact remaining scope. Do not rebuild work that's already done.

## Read in this order before touching code

1. `COMMUNITY_AGREEMENTS_PLAN.md` (entire file, starting with the CTO REVIEW NOTES)
2. `CLAUDE.md` at the repo root (writing rules, migration runner, conventions)
3. The files referenced in the CTO notes: `client/src/pages/Community.tsx`, `client/src/pages/CommunityGuidelines.tsx`, `client/src/pages/QuestSuggestions.tsx`, `server/db.ts` (`listQuestSuggestions` and `toggleQuestVote` as the pattern to mirror), `server/routes/questSuggestions.ts`, `drizzle/schema.ts`, `client/src/pages/Schedule.tsx`
4. `drizzle/0086_community_agreements.sql` and `drizzle/0087_seed_existing_agreements.sql` so you know the table shape before you write the router

## Scope (from the CTO review "Still to do" list)

Implement these and only these. Skip anything the CTO notes mark as already done.

1. **Part 1 — Community Agreements page, full build.** Backend router, tRPC wiring, frontend page at `/community/guidelines`, propose form, vote toggle, seeded agreements rendering, optimistic updates. Mirror QuestSuggestions end to end. Use the correct names listed in the CTO notes (`toggleCommunityAgreementVote`, `getUserCommunityAgreementVotes`, `@/_core/hooks/useAuth`).
2. **Part 2A — section header copy consistency.** Confirm Community.tsx lines 578 and 1103 read "Clarity & Agreements" to match the hero label at line 1083. Fix if drifted.
3. **Part 2D — Add Category form image upload.** Column exists. Wire `FileUpload` into the Add Category form in Community.tsx, add `imageUrl` to `createCategory` and `updateCategory` tRPC inputs in the forum router, and render `imageUrl` on category cards with the existing icon as fallback.
4. **Part 2E — category image audit.** Walk every category card and every image path it renders. Any file that does not resolve in `client/public/` goes into a short list at the bottom of `COMMUNITY_AGREEMENTS_PLAN.md` under a new "Image audit findings" heading. Do not invent new images. Flag them for Rye.
5. **Parts 4 and 5 — Community.tsx card work only.** Add a "Land General" card in the Earth section linking to `/community/c/land-general`. Add an "Alliance General" card in the Alliance section linking to `/community/c/alliance-general`. Confirm the Earth section's "Land Projects" card links to `/community/c/land-projects`. `SECTION_SLUGS` already includes both new slugs (lines 200 to 205). Do not duplicate that change.
6. **Part 6 — Schedule calendar button standardization.** Same label, same variant, same size across all three cards on `Schedule.tsx`. Pick one pattern and apply it to all three.
7. **Part 7 — Recordings section on Schedule page.** Read `drizzle/schema.ts` line 1998 for the `recordings` table. If Schedule.tsx does not already pull from it, wire a Recordings list that reads the most recent N records and renders title, date, and a link. If it already pulls from it, verify and move on.
8. **Parts 8 through 13 — unchanged from the plan.** EXCEPT Part 12 (`TreasuryDashboard.tsx`) which does not exist. Re-scope Part 12: in `client/src/pages/Fund.tsx`, find any existing "Model Dashboard" notice and make it prominent. If no such notice exists, skip Part 12 entirely and record that in the plan.

## Non-negotiables

- **Writing rules apply to every string you put on screen.** No em-dashes anywhere. No contrast framing. None of the banned AI words listed in `CLAUDE.md` (delve, foster, leverage, vibrant, unlock, seamless, robust, comprehensive, empower, utilize, navigate as metaphor, and the rest of that list). Read every piece of copy you produce and strip these before committing.
- **Migrations 0086, 0087, 0088, 0089, 0090 have already been applied to production.** Do not re-run them. Do not write new migration files for the same work. If you need a new migration, use the next number and run it with `npx tsx scripts/run-migration.ts drizzle/NNNN_name.sql`.
- **Mirror `listQuestSuggestions` and `toggleQuestVote` directly.** Do not import or reference `getUserQuestSuggestionVotes`. It does not exist. Build `getUserCommunityAgreementVotes` fresh, following the shape the plan describes.
- **Use the correct useAuth path:** `@/_core/hooks/useAuth`.
- **tRPC patterns:** `publicProcedure` for reads, `protectedProcedure` for propose and vote, `adminProcedure` for status changes (ratified / in_review / declined).
- **Optimistic voting:** the UI should flip the vote and adjust the count immediately, then reconcile with the server response. Mirror how QuestSuggestions does it.

## Verification before you mark anything done

For each of the 8 items above, do a concrete check and write a one-line result into a new file `COMMUNITY_AGREEMENTS_IMPLEMENTATION_LOG.md` as you go:

- Part 1: load `/community/guidelines` in dev, confirm the 6 seeded agreements render, propose a test agreement, vote on it, refresh, confirm persistence.
- Part 2A: grep `Clarity & Agreements` in Community.tsx, confirm at least 3 occurrences (hero, section header, card heading area).
- Part 2D: upload a test image via the Add Category form, confirm it renders on the category card after save.
- Part 2E: attach the image audit findings list to `COMMUNITY_AGREEMENTS_PLAN.md`.
- Parts 4 and 5: load `/community`, confirm both new cards render and click through to their routes without 404.
- Part 6: screenshot the 3 calendar cards on `/schedule`, confirm identical button treatment.
- Part 7: confirm recordings render on `/schedule` from the `recordings` table (or confirm it was already wired).
- Part 12: report whether a Model Dashboard notice exists on `/fund`, and if so, confirm the new prominence treatment.

Do not claim "done" without the matching check.

## Autonomy rules

Rye is holding a lot. Maximum autonomy. Try things, run the dev server, check your own work. Only surface to Rye the items the plan explicitly marks `[HUMAN]` or things that are genuinely blocked on a credential, a file on his computer, or a decision only he can make. When blocked, finish everything else first, then ask once for the minimum you need.

## Commit pattern

One commit per Part. Prefix each with `agreements:` or `community:` or `schedule:` depending on which area it touches. No em-dashes in commit messages either.

## When you're done

Update `REMAINING_WORK_2026-04-08.md` to move `COMMUNITY_AGREEMENTS_PLAN.md` from "active execution prompts" to "archive candidates". Do not archive it yourself. Leave that for Rye.
