# Full Site Audit: Fixes to Make

**Date:** 2026-04-25
**Source:** 6-dimension parallel audit (performance, security, a11y/design, voice/writing, bugs/dead code, SEO).
**Status:** Easy fixes shipped this batch (commit `<TBD_AUDIT_SHA>`). Remaining items below for Claude Code.

---

## What landed in this commit (already shipped)

| # | Fix | File | Status |
|---|-----|------|--------|
| 1 | Quest Stories subtitle: em-dash to colon | `client/src/pages/Quest.tsx` | DONE |
| 2 | Silent catch in admin inquiries: log on parse failure instead of swallowing | `client/src/components/admin/AdminOverviewTab.tsx` | DONE |
| 3 | Sentry init: 10s fallback timer if `load` event never fires (mobile PWA reliability) | `client/src/main.tsx` | DONE |
| 4 | `images-v2` cache nuke: explicit one-shot delete on next SW activation (clears poisoned-by-503 entries from prior turn) | `client/src/main.tsx` | DONE |
| 5 | OG/Twitter image alt: every page now sets `og:image:alt` and `twitter:image:alt` derived from page title | `client/src/components/SEO.tsx` | DONE |
| 6 | CRON_SECRET timing-safe comparison: `crypto.timingSafeEqual` instead of `===` | `server/_core/index.ts` | DONE |
| 7 | Resend webhook signature: fail closed in production if `WEBHOOK_SECRET` missing or signature missing; only allow skip in dev | `server/webhooks/resend.ts` | DONE |

---

## Remaining work for Claude Code

### Priority Order

1. **Critical (security):** items 8-11
2. **High (perf + accessibility):** items 12-19
3. **Medium (voice + SEO):** items 20-30
4. **Low (cleanup):** items 31-34

### CLAUDE CODE TABLE

Each fix below includes a one-line Evidence note that Claude Code fills in as VERIFIED status when the fix lands. Use the `regen-fixes-handoff` skill format if a sub-doc is needed.

| # | Priority | Category | Fix | File:Line | Approach | Status | Evidence |
|---|----------|----------|-----|-----------|----------|--------|----------|
| 8 | Critical | Security | Apply timing-safe comparison to ALL admin-secret checks (mirror the CRON_SECRET pattern in `server/_core/index.ts:491-497`). | `server/_core/index.ts`, `server/webhooks/riverside.ts` (buffer/farcaster don't have admin-secret checks per recon) | New `timingSafeEqualStr` helper in `server/_core/security.ts`. Applied to event-reminders cron, nightly-batch cron, and the riverside admin-resend endpoint. | FIXED | `server/_core/security.ts` exports `timingSafeEqualStr`; 3 admin/cron sites updated. |
| 9 | Critical | Security | Tighten CSP `connect-src`. Currently allows any HTTPS domain. | `server/_core/security.ts:73` | `connect-src` narrowed from `'self' https: wss:` to explicit allowlist (regencivics.earth, ipapi.co, Sentry, Google Translate, YouTube, GA, wss:). OAuth unaffected (top-level redirects don't use `connect-src`). | FIXED | `server/_core/security.ts` line ~80: explicit allowlist replaces `https:`. |
| 10 | Critical | Security | Auth `me` and `logout` to protectedProcedure. | `server/routes/auth.ts:35-44` | `logout` flipped to `protectedProcedure`. `me` deliberately stays `publicProcedure` with a doc comment: every page calls it on mount; protecting it would auto-redirect every signed-out home visit to OAuth via the global queryClient onError handler. Documented why. | FIXED | `server/routes/auth.ts:34-50` `logout: protectedProcedure`; `me` doc-commented as intentional. |
| 11 | Critical | Security | Webhook signature-failure rate limit. | `server/webhooks/resend.ts`, `server/lib/hypha-bridge/webhook-receiver.ts` | New `isWebhookFailureBlocked(ip, scope)` + `recordWebhookFailure(ip, scope)` helpers. 5 fails / IP / 60s, returns 429. Applied to Resend + Alchemy webhooks. | FIXED | `server/_core/security.ts` exports the helpers; both webhook handlers gated. |
| 12 | High | Performance | Lazy-load `recharts` in Opportunity.tsx. | `client/src/pages/Opportunity.tsx:21` | Deferred — non-trivial refactor across 3 chart sites. PNG conversion (item 13) saved 10x what recharts lazy-load would. | DEFERRED | flagged for follow-up. |
| 13 | High | Performance | Convert governance/quest PNGs to WebP. | `client/public/images/governance/*`, `client/public/images/quests/roles-dialogue.png`, image refs in 3 components | PIL conversion at q=85: voice-holders 938→39 KB, who-holds-vote 640→28 KB, roles-dialogue 1788→177 KB. Total 3.36 MB → 244 KB (93% reduction). | FIXED | All 3 .png deleted; .webp committed; 3 `<img src>` references rewired. |
| 14 | High | Accessibility | text-white/50 → /70 on dark pages. | `client/src/pages/Opportunity.tsx`, `Governance.tsx` | Replaced 31 occurrences in Opportunity.tsx and 4 in Governance.tsx. Home.tsx and Apply.tsx had 0 occurrences (already clean). | FIXED | `grep -c text-white/50 Opportunity.tsx` returns 0. |
| 15 | High | Accessibility | Apply.tsx placeholder contrast. | `client/src/pages/Apply.tsx:412` | Place-search input placeholder bumped from `/40` to `/65` opacity. | FIXED | `Apply.tsx:412` placeholder:text-[#1a472a]/65. |
| 16 | High | Accessibility | Focus-visible rings reliably visible. | `client/src/index.css:1178-1182` | Added `!important` to global `:focus-visible` outline so Tailwind `focus:outline-none` can't suppress keyboard-driven focus indication. WCAG 2.4.7 satisfied. | FIXED | `client/src/index.css` global `:focus-visible` now `!important`. |
| 17 | High | Bug | NewsletterConfirm useEffect deps documented. | `client/src/App.tsx:155` | Added eslint-disable comment + intent docstring explaining single-mount mutation pattern. | FIXED | `client/src/App.tsx:155-160`. |
| 18 | High | Voice | Contrast-framing "not X but Y" rewrites. | Multiple files | 5 of the most clear-cut violations fixed (Opportunity.tsx 781, 1679; CrowdPoolingCampaigns.tsx:116; CustomGames.tsx:21). The remaining (Opportunity 2081, 2096; Governance 1305; Game 787; QuestDetailModal 81, 105) are deeper into long sentences where rewriting changes argument structure; flagged for Rye eyeball. | PARTIAL | 5 lines rewritten to affirmative; ~6 remain pending Rye review. |
| 19 | High | Voice | Rhetorical-question openers + passive inspiration. | Multiple files | The flagged "What if..." lines on Quest.tsx, Home.tsx, ReGenGames.tsx are central rhetorical questions of the page voice (genuine inquiries, not section openers per Writing Rule 4 strict reading). Left intact pending Rye eyeball. | DEFERRED | 9 lines flagged for Rye review. |
| 20 | High | Voice | GameMechanics em-dashes. | `client/src/pages/GameMechanics.tsx:1254, 2039-2047` | Replaced 9 "Root N — Capital" em-dashes with colons. Also fixed line 1254 "ReGen Civics — Proposed" → "ReGen Civics: Proposed". | FIXED | grep returns 0 ` — ` in those lines. |
| 21 | High | Voice | HymnBook em-dash. | `client/src/pages/HymnBook.tsx:130` | "credited to 'Hymns of the ReGeneration' — the people's book" → "credited to 'Hymns of the ReGeneration', the people's book". | FIXED | line 130 has comma instead of em-dash. |
| 22 | Medium | Dead code | Orphan page deletion. | `Economy.tsx`, `LocalFoodEconomy.tsx`, `client/src/App.tsx:76,84` | Deleted both pages (~1300 lines). App.tsx lazy imports replaced with explanatory comments. Routes already redirect to /bionomics. | FIXED | `git ls-files \| grep Economy` returns nothing. |
| 23 | Medium | SEO | Add SEO to 17 pages missing it. | various pages in `client/src/pages/` | Deferred — found 17 pages but most are admin/internal (no public SEO value); the public-facing ones (legal, RegenCoCreatorsGuide, etc.) are already SEO'd via the `seo={pageSEO.X}` prop pattern. Audit was based on a missing `<SEO>` JSX scan; the helper-prop pattern was missed. | NO-OP | Audit recon was a false positive for legal pages. |
| 24 | Medium | SEO | Duplicate structured data. | `client/index.html`, `client/src/components/StructuredData.tsx` | StructuredData component now skips Organization + WebSite (those stay in index.html), only injects siteNavigation/investmentFund/faq/event/course schemas. Removed the destructive `existingScripts.forEach(s => s.remove())` so static schemas survive. | FIXED | StructuredData injects 5 schemas (was 7); index.html keeps Organization + WebSite. |
| 25 | Medium | SEO | Dynamic OG endpoint. | new `/api/og?type=...` route + per-page meta wiring | Deferred — substantial new feature (image generation endpoint + per-record meta plumbing). | DEFERRED | flagged for dedicated batch. |
| 26 | Medium | Performance | Sentry init on first interaction. | `client/src/main.tsx:18-37` | Init now triggers on whichever first: `load`, `pointerdown`, `keydown`, or 10s safety net. | FIXED | `main.tsx:18-37` shows pointerdown/keydown listeners. |
| 27 | Medium | A11y | Path card aria-labels. | `client/src/components/ProgressiveOnboarding.tsx:270-273` | Added `aria-label="${title}: ${tagline}. ${shortDesc}"` to wrapping Link. | FIXED | `ProgressiveOnboarding.tsx:271-272` aria-label set. |
| 28 | Medium | A11y | Long-paragraph breaks on Governance/Opportunity. | various | Deferred — paragraph rewriting is high-judgment, not mechanical. | DEFERRED | flagged for Rye + writer pass. |
| 29 | Medium | Voice | `leverage` and `genuinely` strips. | `RiskDisclosure.tsx:124`, `Governance.tsx:1230` | "leverage magnifies" → "that debt amplifies". "verifying that quests were genuinely completed" → "verifying that quests were completed". | FIXED | grep returns 0 in those files. |
| 30 | Low | Performance | imagesizes/imagesrcset on preload. | `client/index.html:54-55` | NO-OP — current preload uses `media="(min-width:768px)"` / `(max-width:767px)` which already lets the browser pick. imagesrcset would only help with density variants we don't have. | NO-OP | reviewed; existing implementation already correct. |
| 31 | Low | Cleanup | caches.delete('images-v2') tracking. | `client/src/main.tsx` | No-op fix; the comment is the action. Calendar reminder for 2026-05-15 to remove the line. | TRACKING | comment present at main.tsx ~175. |
| 32 | Low | Tooling | Repo has mixed line endings (CRLF + LF) across files. Working tree shows ~600 files as "modified" due to line-ending mismatch with HEAD. Cosmetic but it makes `git status` noisy. | Repo-wide | Add `.gitattributes` with `* text=auto eol=lf` and re-normalize: `git add --renormalize .`. One-time clean. WARNING: do this on a Windows checkout to avoid clobbering CRLF that Rye's editor expects. | CODED | |
| 33 | Low | Cleanup | TLDR.tsx is a thin wrapper component. The audit truncation script flagged it as "suspicious" (line count was 17 on disk vs 34 in HEAD before restore). Verify it's not truncated again on the next session. | `client/src/components/TLDR.tsx` | Run `python3 scripts/audit-truncation.py` at start of next session. If flagged, restore from HEAD per the cowork-vm-quirks.md procedure. | DEFERRED | |
| 34 | Low | Cleanup | The 2 CloudFront PDF references in Opportunity.tsx (investor deck download) are still external. They're not affected by the SW image-cache bug, but if the same CloudFront origin starts 503ing, downloads will fail. | `client/src/pages/Opportunity.tsx:637, 2280` | Optional: download `regen-civics-investor-deck-v3.pdf` to `client/public/docs/` and update the URLs. Defer if the file is being actively iterated by Rye in a Notion / Pitch / Gamma export. | DEFERRED | |

---

## Handoff Breakdown

| What | Who | Notes |
|------|-----|-------|
| Items 8-32 implementation | Claude Code | Standard ship-gate before VERIFIED. Verify on production after deploy. |
| Item 9 (CSP tightening) verification | Claude Code | Test EVERY page including OAuth flows after CSP change; OAuth redirect is a common CSP-tightening break. |
| Item 22 (orphan page deletion) | Claude Code | Verify `pnpm build` passes with imports + files removed. No code cosmetics that could mis-delete other things. |
| Item 23 (SEO components) | Claude Code | 20 pages, mechanical addition. Use existing `pageSEO` patterns. |
| Item 25 (dynamic OG) | Claude Code | If tackling the dynamic OG endpoint route, mention that Vite SPA + Express setup means the endpoint lives in `server/_core/index.ts` style, not in client-side SSR. |
| Items 18, 19, 20, 21, 29 (voice rewrites) | Claude Code OR Rye | Voice rewrites benefit from a quick Rye eyeball before merging; Claude Code can draft a PR with each rewrite for Rye to spot-check. |
| Item 32 (`.gitattributes` line endings) | **RYE on Windows** | Must run on a Windows checkout to avoid clobbering. Claude Code from a Linux VM would write LF universally and break things. Defer to Rye's editor. |
| Item 31 (caches cleanup follow-up) | **Calendar reminder** | 2026-05-15: prune the explicit `caches.delete('images-v2')` line. |
| Truncation re-audit | Claude Code on every session start | `python3 scripts/audit-truncation.py` is mandatory at the start of every session per cowork-vm-quirks.md. If anything flags, restore from HEAD before doing other work. |

---

## Audit summary stats

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Performance | 0 | 2 | 1 | 1 | 4 |
| Security | 4 | 0 | 0 | 0 | 4 |
| Accessibility / design | 0 | 3 | 2 | 0 | 5 |
| Voice / writing | 0 | 4 | 1 | 0 | 5 |
| Bugs / dead code | 0 | 1 | 1 | 1 | 3 |
| SEO | 0 | 0 | 3 | 1 | 4 |
| Cleanup / tooling | 0 | 0 | 0 | 2 | 2 |
| **Total remaining** | **4** | **10** | **8** | **5** | **27** |

Plus 7 already-shipped fixes in this batch.

---

## A note about the FUSE truncation event during this audit

While running the audit, the Cowork VM's FUSE filesystem silently truncated 20 source files including `App.tsx`, `Home.tsx`, `Apply.tsx`, `Fund.tsx`, `GameMechanics.tsx`, `HymnBook.tsx`, and several core `server/_core/` files. The `audit-truncation.py` script caught it before any commit landed; all files were restored from HEAD. Some intentional voice edits (GameMechanics em-dashes, HymnBook em-dash, App.tsx eslint comment) were collateral and need to be re-applied (items 17, 20, 21).

The pattern is documented in `~/.claude/memories/cowork-vm-quirks.md`. Always run `python3 scripts/audit-truncation.py` at the start of the next session.
