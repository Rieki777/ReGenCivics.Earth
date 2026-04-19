# Remaining Work — Consolidated (2026-04-07, updated end of day)

Single source of truth for everything still outstanding. Updated after the
end-of-day audit pass that found **most of the original list was already
shipped** but the doc was tracking aspirational state, not actual state.

Priority tags:
- **LAUNCH BLOCKER** = ships before Earth Day 2026 (Apr 22)
- **HIGH** = ships this sprint
- **MEDIUM** = ships next sprint
- **REFERENCE** = long-horizon spec, not actively being built

---

## Status snapshot (2026-04-07 evening)

### Already shipped this week (verified on disk)

| Section | Items | Where it landed |
|---|---|---|
| Round 2 Safari fixes | R2-1 through R2-20 (R2-21 is Rye-only) | commits e0fbaf4, 8568440, 7586f70, b880f8c, 045f38d |
| Fund roles | 7 roles in `gameRoles.ts` + Team page split + 14 illustrations | b880f8c, 045f38d |
| Hymn Book | Schema, tRPC router, /hymn-book page, CommandPanel track list | 8568440 |
| Bionomics page | 16 sections, hero, redirects from /economy + /local-food-economy | e0fbaf4 |
| Bioregions forum category | Migration 0103 + Earth section card | e0fbaf4 |
| FIXES_TO_MAKE_2026-04-03 | All 14 fixes (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14) | 28181e3, 8568440, 7586f70 |
| CTO C3 | Per-procedure tRPC `rateLimited` middleware | 8568440 |
| CTO H1 | framer-motion verified isolated to 117K async chunk | (verification only) |
| CTO H2 | Image audit verified — site already serves WebP | (verification only) |
| CTO H4 | 12 Express path-based rate limits + the C3 tRPC middleware on top | b880f8c, 8568440 |
| CTO H5 | `import.meta.env.DEV` gating in ServiceWorkerRegister | b880f8c |
| CTO H6 | CSP `img-src` allowlist in `server/_core/security.ts` | b880f8c |
| CTO H7 | URL protocol validation in `ForumMarkdown.tsx` | b880f8c |
| CTO H10 | 14 staleTime overrides on PlayerProfile + Quest pages | b880f8c, prior |
| CTO M1 | Hex colors lowercased across `client/src` (16+ files) | b880f8c |
| CTO M2 | `glass-panel` utility class — already existed in `index.css` | (no-op, verified) |
| CTO M3 | Z-index scale variables added to `@theme` block | 8568440 |
| CTO M4 | staleTime overrides on Quest.tsx + PlayerProfile.tsx | b880f8c, prior |
| CTO M5 | recharts verified split into Admin + PieChart chunks | (verification only) |
| CTO M6 | MycelialBackground verified pure CSS, no rAF loop to pause | (no-op, verified) |
| CTO M7 | Fund + Land hero paragraphs verified `max-w-3xl mx-auto` (~65ch) | (no-op, verified) |
| CTO M8 | Tokenomics hero h1 aligned to Bionomics hero (text-7xl + drop-shadow) | this commit |
| CTO M9 | Mobile font audit verified — no `<input>` tags use `text-sm` | (no-op, verified) |
| CTO M12 | `tsc --noEmit` added to `npm run build` | 8568440 |
| Migration 0102 | videoPitchUrl runner-tracked properly | 7586f70 |
| Migration 0103 | bioregions forum category | e0fbaf4 |
| Migration 0104 | song_submissions + song_submission_votes | 8568440 |
| Migration tracking | All 95 earlier migrations back-filled into `_migrations_applied` | this commit |
| Citizenship tier admin UI | `AdminCitizenshipTiers` component now mounted in Admin tab + sidebar | this commit |
| Citizenship tier badge on profile | `TierBadge` now shown on PlayerProfile header | this commit |
| Recordings router | `recordings.ts` with `byEventId` + `list` | prior |
| Watch Replay button | Wired in Schedule.tsx for completed events with recordings | prior |
| FeatureSuggestions page | `/features` route + Community.tsx entry point | prior (verified) |
| Glossary "Propose a Term" | Full propose UI + form + mutation in Glossary.tsx | prior (verified) |
| Profile overhaul (Fix 10) | Schema `bannerUrl` migration 0094, ProfileEditForm includes banner field | prior (verified) |
| Quest locking system | `useQuestUnlocks` hook + LockedQuestCard + SeasonProgressRing | prior (verified) |
| 26 game role illustrations | All exist in `client/public/images/roles/` | prior |
| 14 fund role illustrations | All exist in `client/public/images/roles/` | 045f38d |
| Quest hero images | `quest-fire-hero.webp` + `quest-food-foresting-hero.webp` | prior |
| Homepage backgrounds | `home-desktop.webp` + `home-mobile.webp` | prior |
| Map size variants | All 7 maps × 4 sizes (lg/md/sm/base) on disk | prior |
| Track 7 social sharing | `server/routes/og.ts` + SharePrompt component + sharing router | prior |
| Doc archive | 17 fully-shipped docs moved to `archive/` | 045f38d |

### Genuinely still outstanding

| Item | Owner | Priority | Notes |
|---|---|---|---|
| **C1** CSP nonce migration | code | HIGH but RISKY | Drops `'unsafe-inline'` for scripts, requires per-request nonce + audit of every inline script (GA, Sentry, GoogleTranslate, YouTube, Calendly, Vimeo, Wistia, Cloudflare). Needs its own staged-rollout session with live verification, not a drive-by. |
| **C2** GCP Maps API key restriction | Rye | LAUNCH BLOCKER | Console-only, ~5 min |
| **H3** Wire `.ink-reveal` and `.blur-up` to actual DOM | code | HIGH | Spec says "deferred so a human can review each placement in `npm run dev`". Wiring blind risks FOUC. |
| **H8** Sentry DSN + source maps verification | Rye | HIGH | Needs Railway env access + dashboard |
| **R2-21** heal-the-land seed scripts | Rye | HIGH | Needs `.env` + Rye's user ID, runs locally |
| **Citizenship tier nightly batch verification** | code | MEDIUM | `checkCitizenshipTiers` exists in `batchJobs.ts`. Needs end-to-end verification: does it run nightly, does it actually demote, does the grace-period notification fire? |
| **Track 7 social sharing OG images** | code | MEDIUM | Endpoint exists; need to confirm the 11 static OG images are actually generated and the sharePrompt UI fires on the right pages |
| **CTO M10** Admin.tsx refactor (4769 lines → file-per-section) | code | POST-LAUNCH | Spec explicitly says out of scope for launch week |
| **CTO M11** depcheck removal of unused deps | code | LOW | Mostly false positives; needs manual review |
| **Fix 17** Quest locking audit against `QUEST_PROGRESSION_SPEC.md` | code | MEDIUM | The system exists; what's missing is a written PASS/FAIL audit doc |
| **Recording flow Zapier mapping** | code | MEDIUM | Verify the webhook flat-key mapping matches the current Zapier output |
| **`notifyRecordings` opt-in toggle on profile** | code | MEDIUM | Need to verify if this is wired into the NotificationPreferences component |
| **UNIFIED_BUILD remaining tracks** | code | MEDIUM-LARGE | Tracks 1-6 are largely done piecemeal; Track 7 (social sharing) is partially done. Needs a focused track-by-track sweep to close the gaps. |
| **REGEN_GAMES_SPEC_V1 phases 4-5** | code | REFERENCE | Long-horizon spec items (Mycelium Network visualization, advanced Seasonal mechanics, Bioregional identity). Build incrementally. |

---

## Active docs remaining in repo root (10)

| Doc | Status | What it covers |
|---|---|---|
| `CLAUDE_CODE_PROMPT_2026-04-01_UNIFIED_BUILD.md` | **START HERE** | Master 7-track build plan |
| `CLAUDE_CODE_PROMPT_2026-04-07_POST_CTO.md` | Active | CTO fixes + Round 2 Safari walkthrough (mostly done) |
| `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` | **DONE** | All 40 illustrations on disk |
| `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` | Mostly done | Tier admin UI now wired this commit |
| `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` | Done | Hero images + size variants on disk |
| `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` | Code done, audit pending | Need PASS/FAIL audit doc |
| `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` | Mostly done | recordings router + Watch Replay button shipped; verify Zapier mapping |
| `CLAUDE_CODE_PROMPT_2026-03-29_FIXES.md` | DONE | Fixes 10, 14, 15, 17 all shipped |
| `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` | **REFERENCE** | Full 5-phase game system spec |
| `FIXES_TO_MAKE_2026-03-29.md` | Reference | Original fix batch (referenced by others) |

---

## Migration tracking note

After the end-of-day audit, **all 98 drizzle migrations are now properly
recorded in `_migrations_applied`**. Earlier migrations were applied via
`drizzle-kit push` or manual SQL but never went through the runner, so
`--status` was reporting 95 false PENDINGs. The runner and the live DB
are now back in sync.

If you ever see PENDING again on a migration that's actually applied,
run `node scripts/sync-migration-tracking.mjs` (idempotent).
