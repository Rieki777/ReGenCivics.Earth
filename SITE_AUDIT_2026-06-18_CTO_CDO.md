# Site Audit, 2026-06-18 — CTO + CDO, head to toe

A pre-launch review of regencivics.earth from two seats: the CTO (performance, reliability, security, observability) and the CDO (design system, brand, first impression, conversion). Findings are grounded in the codebase, not vibes. Every recommendation cites where it lives.

## The verdict in one paragraph

The build is genuinely strong: a tokenized design system, self-hosted typography, a documented security baseline, route-level code splitting, a real accessibility pass to WCAG AA, and a mobile bottom nav that is better than most funded startups ship. Two things stand between this and "ready to share widely." First, operational visibility: broken R2 images across several pages, Sentry imported but not switched on, and no product analytics, so launch day would be flown blind with visible image failures. Second, fundraising credibility: the investor funnel has no team, no portfolio, no FAQ, and the risk disclosure is buried, so a serious investor bounces before trusting it. Close those two gaps, finish the polish below, and this moves from "solid" to "world class."

## Scorecard

| Area | Rating |
|---|---|
| SEO infrastructure | Strong |
| Error handling and resilience | Strong |
| Security posture | Strong |
| Accessibility (AA post-fix) | Strong |
| Design system and tokens | Strong |
| Typography | Strong |
| Component consistency | Strong |
| Motion and micro-interactions | Strong |
| Navigation and IA | Strong |
| Homepage and first impression | Strong (no primary CTA) |
| Copy and voice | Strong |
| Onboarding design | Strong (verify it is live) |
| Performance | Adequate (image debt) |
| Code health | Adequate |
| Color and contrast | Adequate (AA, ~5 left) |
| Responsiveness and forms | Adequate (touch targets) |
| Page and route inventory | Adequate (redirect clutter) |
| Conversion paths | Adequate (missing next steps) |
| Imagery (character art placed) | Weak (system designed, art not generated) |
| Analytics and observability | Weak |
| Trust and credibility for fundraising | Weak |

## Launch blockers (do these before sharing widely)

1. Broken R2 images. `IMAGE_ARCHITECTURE.md` documents that most hardcoded R2 URLs now 404 (roughly 4 of 17 keys still resolve). This shows up on Showcase, Blog, Team, Governance, and CrowdPooling, and it kills social share previews when the OG image 404s.
2. No observability. Sentry is in `package.json` and `client/src/main.tsx` calls `initSentry()`, but it is gated on `VITE_SENTRY_DSN`, which is unset. Production errors are invisible.
3. No fundraising trust layer. `/fund` and `/investor` (InvestorForm.tsx) carry no team, portfolio, transparency, or FAQ, and `RiskDisclosure.tsx` is not surfaced in the funnel.

---

# 10 ways to make it world class and ready to share

These are the elevation moves. Each one shifts a dimension from "good" to "memorable."

1. **Make the homepage decide for the visitor.** `Home.tsx` explains the fund and the four paths beautifully, but the first real action sits at the footer. Add a persistent primary CTA below the hero that routes into `/connect` with an intent pre-selected (Invest, Bring my land, Ally, Play). The page already knows the four paths; give the visitor one obvious door.

2. **Build the investor trust layer.** The single biggest fundraising gap. Add a team section with real bios and faces to `/fund`, a portfolio and traction snapshot (projects funded, seasons run, capital in motion), a fund-structure FAQ, and a prominent link to the risk disclosure. Investors fund people and proof, and right now neither is in the path.

3. **Bring the world to life with the character art.** `CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md` specifies 13 roles, each with a card portrait and a full scene, in the solarpunk-elven-jedi style. The brief is excellent and the art is not generated or placed, so the Team and role pages read text-heavy. Generate the 26 images with nano-banana-pro, optimize to WebP, and place them. This is the difference between "another DAO site" and a living movement.

4. **Instrument the whole funnel.** Turn on Sentry in Railway, then add a small product-analytics layer with a named event taxonomy: `signup`, `quest_complete`, `apply_submit`, `loi_submit`, `pledge`, `forum_post`. The first two weeks of sharing are worth far more with data than without.

5. **Finish the three funnels end to end.** Each path (`/fund`, `/land`, `/play`) explains itself well, then leaves the visitor at a dead end. Add an explicit next-step CTA to the bottom of each, surface the orphaned `/loi` from `/land` and `/apply`, and give `/play` a single green "Start the Welcome Aboard quests" button into `/profile?tab=quests`.

6. **Turn activity into proof.** The live community feed is a strong idea. Pair it with real numbers a newcomer can trust: projects in the alliance, seasons completed, total quests done, capital pooled. Proof of life converts both investors and land projects.

7. **Make onboarding a moment, not a maze.** `WelcomeAboardQuests.tsx` and the brief are well designed (10 quests, 330 $ReGen plus 1 RGVoice, claim-gated). Confirm it is wired into `PlayerProfile.tsx`, fire a one-time post-signup welcome, and get a new player to their first quest in under a minute.

8. **Set a performance and reliability budget and enforce it.** Fix the image pipeline so every image has a guaranteed fallback and no page ships a broken asset. Flip `.lighthouserc.json` targets into a CI gate, and serve responsive, lazy images everywhere. A launch with broken images undoes the rest of the polish.

9. **Push design from solid to immersive.** Micro-animate the empty states (stagger icon, title, description), standardize motion easing (ease-out for entrances, ease-in-out for ambient loops), finish the palette-drift migration (272 non-canonical hex values remain), flip the contrast-audit CI from warn-only to fail-on-regression, and standardize mobile touch targets to 44px.

10. **Make every page worth sharing.** Build an OG and Twitter card system that always renders, with a guaranteed default and per-page images, and add a "share your quest" loop so players broadcast their progress. The site is the top of the funnel; design it to travel.

---

# 15 fixes and upgrades, prioritized

P0 = launch blocker, P1 = high impact for sharing, P2 = polish. Effort is rough engineering time.

| # | Pri | Fix | Where | Effort |
|---|-----|-----|-------|--------|
| 1 | P0 | Restore or finish migrating R2 images; add an `onError` fallback to every image component so nothing renders a broken asset | `IMAGE_ARCHITECTURE.md`, `PageBackground.tsx`, image components | 0.5-1 day |
| 2 | P0 | Set `VITE_SENTRY_DSN` in Railway and confirm a test error appears in Sentry | `client/src/main.tsx` (`initSentry`) | 1 hr |
| 3 | P0 | Guarantee OG and Twitter images resolve, with a local default fallback | `SEO.tsx`, `public/og/` | 2-3 hrs |
| 4 | P0 | Add a persistent above-the-fold primary CTA on the homepage into `/connect` with intent pre-select | `Home.tsx` | 2-3 hrs |
| 5 | P0 | Surface the risk disclosure inside the investor funnel (acknowledgement before submit) | `InvestorForm.tsx`, `RiskDisclosure.tsx` | 1-2 hrs |
| 6 | P0 | Verify Welcome Aboard quests are mounted in the profile, fire a one-time welcome, and confirm claim-gating works | `WelcomeAboardQuests.tsx`, `PlayerProfile.tsx` | 2-4 hrs |
| 7 | P0 | Real-device pass on iOS Safari for the "Two Spaces, One Vision" blank-render risk and mobile form legibility | `Home.tsx`, form pages | 0.5 day |
| 8 | P1 | Add product analytics with a named event taxonomy (signup, quest_complete, apply_submit, loi_submit, pledge, forum_post) | new analytics module | 0.5-1 day |
| 9 | P1 | Add a team and a portfolio/traction section to `/fund`, and link `/team` from the funnel | `Fund.tsx`, `Team.tsx` | 0.5-1 day |
| 10 | P1 | Create a fund FAQ page (structure, allocation, minimums, accreditation, distributions, lockups) | new `/fund-faq` | 0.5 day |
| 11 | P1 | Add bottom-of-page next-step CTAs to `/fund`, `/land`, `/play`; surface `/loi` from `/land` and `/apply` | those pages | 3-4 hrs |
| 12 | P1 | Generate and place the 13-role character art (card plus scene), optimized to WebP | nano-banana-pro, `public/images/roles/`, `Team.tsx` | 1 day |
| 13 | P1 | Raise form-label contrast on light backgrounds to an accent-on-light token; standardize 44px touch targets | `design-tokens.ts`, form components | 3-4 hrs |
| 14 | P2 | Flip the contrast-audit CI to fail-on-regression and lower ESLint `max-warnings` from 9999 toward a real number | `scripts/contrast-audit.mjs`, `package.json`, `eslint.config.js` | 0.5 day |
| 15 | P2 | Clean up legacy redirects and duplicate routes (for example `/economy` and `/bionomics`), document canonical routes, remove stray `_tmp_404_*` files | `App.tsx` | 2-3 hrs |

---

## Suggested sequence

Week one, ship the seven P0s. They are mostly small and they remove the things a visitor or an investor would notice in the first thirty seconds. Week two, take the P1s in funnel order: analytics first so the next changes are measurable, then the investor trust layer (team, portfolio, FAQ), then the next-step CTAs and character art. Fold the two P2s into the next quality sprint.

## What is already strong, keep it

Security baseline, CSP with per-request nonce, CSRF, rate limiting, and input sanitization. Route-level lazy loading with retry. The SEO component and sitemap. The design tokens, the self-hosted type, the shadcn/ui component layer, and the adaptive mobile bottom nav. The accessibility pass to AA. None of this needs rework before launch.

## Verification for this audit

Findings were gathered by reading the actual source: `App.tsx` routing, `Home.tsx`, `Fund.tsx`, `Land.tsx`, `Play.tsx`, `InvestorForm.tsx`, `Navigation.tsx`, `design-tokens.ts`, `index.css`, `SEO.tsx`, `main.tsx`, `IMAGE_ARCHITECTURE.md`, `CONTRAST_AUDIT_2026-05-29.md`, and the security docs under `.ai/docs/security/`. The image 404 claim and the Sentry-gating claim should be confirmed live before the P0 sprint closes.
