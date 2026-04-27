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
| 8 | Critical | Security | Apply timing-safe comparison to ALL admin-secret checks (mirror the CRON_SECRET pattern in `server/_core/index.ts:491-497`). Affects buffer/farcaster admin routes. | `server/routes/buffer.ts`, `server/routes/farcaster.ts` (and any other route reading `x-admin-secret`) | Recon all `x-admin-secret` reads, replace `===` with timing-safe pattern. Add rate limit on signature failures. | CODED | |
| 9 | Critical | Security | Tighten CSP `connect-src`. Currently allows any HTTPS domain. Whitelist specific endpoints we actually call: regencivics.earth, hypha.earth, alchemy, sentry, resend, etc. | `server/_core/security.ts:73` (or wherever CSP is set) | Audit `fetch()` and `WebSocket` connections in `client/src/`. Build the explicit list. Test: every page should still load and OAuth should work. | CODED | |
| 10 | Critical | Security | Auth `me` and `logout` procedures: change from `publicProcedure` to `protectedProcedure` so they require an authenticated context. | `server/routes/auth.ts:35-44` | Verify the rest of the codebase doesn't rely on `me` returning `null` for unauthed users (it should still throw UNAUTHORIZED, which the client handles). | CODED | |
| 11 | Critical | Security | Resend webhook: add rate limit on signature verification failures per source IP. Currently any caller can spam unsigned attempts. | `server/webhooks/resend.ts` (also generalize to `server/lib/hypha-bridge/webhook-receiver.ts`) | Use `express-rate-limit` or similar on signature failures, e.g. 5 fails per IP per minute. | CODED | |
| 12 | High | Performance | Lazy-load `recharts` in Opportunity.tsx. Currently imports at module top, dragging recharts into the initial Opportunity chunk (~150KB). | `client/src/pages/Opportunity.tsx:21` (top of file) | Move chart components into a separate file (e.g. `client/src/components/opportunity/Charts.tsx`) and `lazy()` import it where it's rendered. Charts live inside collapsible sections so users may never load them. | CODED | |
| 13 | High | Performance | Convert governance/quest PNGs to WebP and rewire `<img>` `src` attributes. Current PNGs total ~3.5MB across `voice-holders-diagram.png` (939KB), `who-holds-vote.png` (641KB), `roles-dialogue.png` (1.8MB). | `client/public/images/governance/voice-holders-diagram.png`, `who-holds-vote.png`; `client/public/images/quests/roles-dialogue.png`; usages in `Governance.tsx`, `Quest.tsx`, etc. | Use ffmpeg or cwebp at q=85. Drop PNG files; commit only `.webp`. Use `<picture>` if any IE/old-browser fallback is required (probably not). | CODED | |
| 14 | High | Accessibility | Replace `text-white/50` with `text-white/70` (or higher) on dark backgrounds across high-traffic pages: Opportunity.tsx, Governance.tsx, Home.tsx, Apply.tsx. WCAG AA needs 4.5:1 contrast ratio; opacity 0.5 on white over dark green forest is ~3.8:1 (failing). | `client/src/pages/Opportunity.tsx` (~25 instances), `Governance.tsx` (~15 instances), Home.tsx (~5), Apply.tsx (~3) | Run a `rg "text-white/50" client/src/` audit, eyeball each for whether bumping to `/70` is appropriate (some decorative captions are fine at /50). For body text, always go /70+. | CODED | |
| 15 | High | Accessibility | Apply.tsx form input contrast: white form cards (`bg-white text-[#1a472a]`) on dark theme look jarring AND inputs at `text-[#1a472a]/40` for labels fail readability. | `client/src/pages/Apply.tsx:315, 412` (and possibly other form blocks) | Convert to dark-themed inputs: `bg-[#1a472a]/80 text-white placeholder:text-white/60`, labels at `text-white/85`. Use the `regen-form-design` skill checklist. | CODED | |
| 16 | High | Accessibility | Add or strengthen `:focus-visible` rings on path cards, primary CTAs, and link-wrapped divs. Several custom button classes hide the default focus ring without providing replacement. | `client/src/index.css`, `Home.tsx:447-489` (path cards), `Opportunity.tsx:144-195` (buttons) | Add a global `.focus-ring-default:focus-visible { outline: 2px solid #7dd87d; outline-offset: 2px; }` and apply to interactive elements. Test with Tab. | CODED | |
| 17 | High | Bug | App.tsx `NewsletterConfirm` useEffect runs once on mount with empty deps. Document intent OR add explicit deps. (NOTE: I also saw a HEAD-vs-disk truncation on App.tsx during this audit; before editing, run `python3 scripts/audit-truncation.py` and restore from HEAD if flagged.) | `client/src/App.tsx:155` | Either keep empty deps with `// eslint-disable-next-line react-hooks/exhaustive-deps` and a comment, OR add `[token]` and rely on Wouter's fresh-mount-on-route-change. Both are correct; pick one and stick. | CODED | |
| 18 | High | Bug | Voice/contrast-framing rewrites flagged by audit. ~10 confirmed instances in user-facing copy that violate the project Writing Rules ("not X, but Y" patterns). Each requires a thoughtful rewrite. | `client/src/pages/Opportunity.tsx:781, 1679, 2081, 2096`, `CrowdPoolingCampaigns.tsx:116`, `CustomGames.tsx:21`, `Governance.tsx:1305`, `Game.tsx:787`, `QuestDetailModal.tsx:81, 105` | Each rewrite needs the affirmative form. Use `regen-fundraising-copy` skill voice rules. Do not auto-rewrite without reading surrounding context; tone matters per page. | CODED | |
| 19 | High | Bug | Voice rewrites: rhetorical-question openers and passive-inspiration filler in user-facing copy. | `Home.tsx:731`, `Quest.tsx:1022, 1071`, `ReGenGames.tsx:20, 43`, `Ally.tsx:280`, `Schedule.tsx:564`, `AMABanner.tsx:66`, `InvestorForm.tsx:379`, `Apply.tsx:237` | Same approach as #18. Each line gets a rewrite that leads with the affirmative. | CODED | |
| 20 | High | Voice | GameMechanics.tsx Root 1-9 labels use em-dashes ("Root 1 — Intellectual"). Need conversion to colon. | `client/src/pages/GameMechanics.tsx:2039-2047` (9 lines) and `:1254` (string literal `\`ReGen Civics — Proposed variable changes\``) | Replace each ` — ` with `: `. Mechanical fix. (Note: this was attempted in the Cowork pass but blown away by a HEAD restore during a FUSE truncation event. Re-do in Claude Code.) | CODED | |
| 21 | High | Voice | HymnBook.tsx em-dash in user-facing JSX paragraph. | `client/src/pages/HymnBook.tsx:130` | Replace ` — ` with `: ` in the hymn-book attribution paragraph. (Same FUSE truncation note as above.) | CODED | |
| 22 | Medium | Dead code | Two orphan pages totaling ~1300 lines: `Economy.tsx` and `LocalFoodEconomy.tsx`. Routes redirect them; the pages are unreachable BUT the lazy imports in App.tsx still pin them in the bundle. | `client/src/pages/Economy.tsx`, `client/src/pages/LocalFoodEconomy.tsx`, `client/src/App.tsx:76, 84` (imports) | Remove lazy imports from App.tsx, then `git rm` the two pages. Verify build still succeeds. | CODED | |
| 23 | Medium | SEO | 20 pages lack the `<SEO>` component: Admin*, Apply variants, Campaign variants, Community subpages, Component showcase, legal pages (Disclaimers, TermsOfUse, PrivacyPolicy, RiskDisclosure). | Affected files in `client/src/pages/` | Audit by grep: `rg -L "import.*SEO" client/src/pages/`. Add `<SEO title=... description=... />` block to top of each page's return. Use `pageSEO.privacyPolicy`, `pageSEO.termsOfUse` patterns where the helper exists. | CODED | |
| 24 | Medium | SEO | Duplicate global structured data: `client/index.html:121-183` AND `client/src/components/StructuredData.tsx` both inject Organization, WebSite, FAQ schemas. Browsers / crawlers see both. | `client/index.html`, `client/src/components/StructuredData.tsx` | Pick ONE source. Recommend: keep static schemas in index.html (works without JS); strip them from the React component. Component handles per-route schemas only. | CODED | |
| 25 | Medium | SEO | Dynamic OG images for content pages (BlogPost, CampaignDetail, PlayerProfile, EventDetail, ToolDetail). Currently fall back to default OG image, which makes shared links unfocused. | `client/src/components/SEO.tsx`, `BlogPost.tsx`, `CampaignDetail.tsx`, `PlayerProfile.tsx`, `EventDetail.tsx`, `ToolDetail.tsx` | Either ship per-record static OG (commit per-blog-post images to R2) OR build a `/api/og?type=blog&id=...` endpoint that returns 1200x630 PNG dynamically (Next.js-style ImageResponse via @vercel/og or sharp). | CODED | |
| 26 | Medium | Performance | Sentry init: also load when `load` event fires OR on first user interaction (whichever first). Currently the 10s timeout is a safety net but most users see Sentry init far earlier than necessary, slightly delaying their interactive metric. (This one is optional polish.) | `client/src/main.tsx:17-32` | Add `'click'`/`'pointerdown'` listener with `{ once: true }` that triggers `initSentry()`. Compose with the existing load + 10s fallback. | CODED | |
| 27 | Medium | A11y | Path cards on Home.tsx use `<Link><div>` wrappers. Tab order works but the entire card becomes focusable. Some users may want individual elements (image, title, CTA) tabbable. Lower priority once focus rings are visible. | `Home.tsx:441-491` (Path Cards) | Test keyboard navigation; add `aria-label` summarizing the card's purpose to the wrapping Link. | CODED | |
| 28 | Medium | A11y | Walls of text on Governance.tsx and Opportunity.tsx without visual breaks (long paragraphs without sublists or sub-headings). | `Governance.tsx:286-327`, `Opportunity.tsx` various | Break into `<ul>` / `<ol>` lists where appropriate. Add subheadings (h3) every 200 words. Insert visual whitespace (`my-6` between dense sections). | CODED | |
| 29 | Medium | Voice | Banned word `leverage` in user-facing copy (RiskDisclosure.tsx:124). | `client/src/pages/RiskDisclosure.tsx:124` | Replace "leverage magnifies both gains and losses" with "debt amplifies both gains and losses". Also strip `genuinely` from Governance.tsx:1230 (hedging language). | CODED | |
| 30 | Low | Performance | Optimize image preload hints in `client/index.html` for LCP. Currently preloads home hero with `fetchpriority=high` and media queries (correct), but no `imagesizes` / `imagesrcset` hint to let browser pick correct variant before render. | `client/index.html:54-55` | Add `imagesizes` / `imagesrcset` attributes to the preload `<link>` tags so browsers pick mobile vs desktop variant before parsing CSS. | CODED | |
| 31 | Low | Cleanup | `client/src/main.tsx:165` references `caches.delete('images-v2')` (just added). Once the rollout is complete (1-2 weeks), this can be deleted along with the `images-v2` reference. | `client/src/main.tsx` | Tracking ticket: remove the explicit `caches.delete('images-v2')` line on `2026-05-15` or after we're confident every active user has cycled through. | CODED | |
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
