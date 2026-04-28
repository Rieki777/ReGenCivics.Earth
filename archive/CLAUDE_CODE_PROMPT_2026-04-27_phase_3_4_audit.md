# Claude Code Handoff: Final audit pass on path progression

Last batch of the day. Four targeted improvements from a quality review across everything we shipped: a security tighten, an empty state, scroll anchors that were silently broken, and a reduced-motion fallback.

## Apply + push

```bash
git fetch origin && git checkout main && git pull origin main
git am PHASE_3_4_AUDIT_PATCH.patch
git push origin main
```

No migrations. No new env vars.

## What ships

| File | Change | Why |
|---|---|---|
| `server/routes/playerPaths.ts` | `markBonusClaimed` switched from `protectedProcedure` (self-target) to `adminProcedure` (target any userId). | Letting a user self-flip the bonus-claimed flag was an audit-accuracy hole. The normal flow is automatic via the Hypha Alchemy webhook (`cascadeClaimPassed`). The endpoint stays for admin-only manual reconciliation. |
| `client/src/components/EpicQuestSection.tsx` | Empty state when path filter narrows the Epic pool to zero. Reduced-motion fallback for the canopy-fall keyframe. | Avoids rendering an empty carousel. Respects user a11y preference. |
| `client/src/components/CitizenshipTierSidebar.tsx` | Steward and Sage pills now scroll to existing `id="epic-quests"`. Co-Creator pill scrolls to new `id="rites-of-passage"`. Explorer falls back to scroll-to-top because Welcome Aboard lives on /profile. | Pills clicked silently before; no anchors existed at the target IDs. |
| `client/src/pages/Quest.tsx` | Added `id="rites-of-passage"` to the "Rites & Quests by Season" section so the Co-Creator pill has somewhere to scroll to. Plus a tiny em-dash cleanup in a comment. | See above. |

## Audit findings I did NOT fix (notes for later)

These came up during the review but are either deferred or non-issues:

1. **Path-portal click on undeclared portal redirects to `/profile?tab=quests`**: hard nav. Could be an inline modal on /quest. Low impact since the Profile Add-a-Path UX is already polished and the redirect is fast. Defer.

2. **Detector cron scales linearly with declared-path users**: at <100 users this is fine. Around 10k users, the per-cycle cost is N reads + N criterion checks. Optimization opportunity: skip users with no quest_completion / loi / application / vote / tool-click activity since last cron run. Cache `last_run_at` per user. Defer until volume warrants.

3. **Alliance Co-Creator query uses `sql.raw` with placeholders**: parameterized correctly (toolIds are int IDs from a previous query, not user input). Safe today. Could rewrite with drizzle's `inArray()` for stronger typing. Defer.

4. **PathProgressionSection lives at the bottom of Quest.tsx (~1700 lines)**: could be extracted to its own file. Code-quality nit. Defer.

5. **`useActivePathHash` doesn't have an SSR-safe initial value option**: the hook handles SSR via `typeof window === "undefined"` checks. Works for our setup. Could be more elegant. Defer.

6. **Welcome Aboard has no anchor on /quest**: by design now. Explorer pill scrolls to top. If we ever bring Welcome Aboard cards into /quest, add the anchor.

## Voice + writing

Empty-state copy: "No water-themed Epic Quests yet. The forest grows season by season. More quests in this element come with the next round of authoring." Passes the project rules (no em-dashes, no contrast-framing, no AI patterns, no rhetorical openers).

## Truncation + typecheck

Phase 3.4 specific files: clean. No NUL bytes, no em-dashes in new content, typecheck passes. Pre-existing FUSE artifacts on `App.tsx`, `notify.ts`, `webhook-receiver.ts`, `Opportunity.tsx`, `email.ts`, `newsletter.ts` are local-only; git HEAD has them clean.

## Recovery

Pure UI + a single tRPC procedure permission tighten. Revert commit `0742ec2` to roll back. The auto-flip cascade in `webhook-receiver.ts` keeps working regardless because it's a separate code path.
