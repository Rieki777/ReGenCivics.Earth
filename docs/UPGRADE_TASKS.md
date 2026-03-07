# ReGen Civics — Upgrade Tasks & Site Fixes

Ordered by priority. Update status as work progresses.

---

## Status Key
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked — needs external input

---

## Immediate / Deployment

- [x] Fix Railway migrations 0036/0037/0038 — idempotent via stored procedures
- [x] Pin Node.js 22 in nixpacks.toml + .node-version (Vite 7 requires 20.19+)
- [x] Add .railwayignore to reduce build context size
- [ ] Confirm first clean Railway deployment — watch deploy logs end-to-end
- [ ] Run `pnpm db:push` after successful deploy to confirm `player_contributions` table exists in production DB

---

## Blocked — Needs External Input

- [!] **Live Token Stats on /governance** (#5)
  - Need: $RCivics contract address from Rieki or via app.hypha.earth/en/dho/regen-civics
  - Once address is known: wire into the token stats component to pull live circulating supply, holders, price

- [!] **Governance Two Tokens image** (#3)
  - Image URL updated to: `https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png`
  - Need: visual confirmation in browser that the URL resolves correctly
  - If broken: update the URL in `client/src/pages/Governance.tsx` line ~893

---

## Deferred — Revisit When Ready

- [ ] **Trust Bar on /opportunity** (#20)
  - Removed for now — reinstate when 20+ land projects and alliance orgs are committed
  - Component logic is ready; just needs the partner list and re-adding to Opportunity.tsx

- [ ] **First Visit Onboarding Overlay** (#19)
  - Removed — landing page already answers "who is this for"
  - Revisit if analytics show high bounce rate from new visitors
  - Component still exists at `client/src/components/FirstVisitOnboarding.tsx`

---

## Content & Copy

- [ ] **Season Timeline fact-check pass** — verify Season 1 dates (2021) and project counts with Rieki before next public push
- [ ] **Investor drip email review** — send a test investor inquiry through the form and confirm all 4 drip emails arrive at Day 3 / 7 / 14 / 30 with correct copy and links
- [ ] **Calendly link audit** — confirm `https://calendly.com/rieki-cordon/30min` is the correct and active booking link across all email templates and pages
- [ ] **Forum link in investor drip Email 2** — link reads `regencivics.earth/community`; confirm community forum is public-facing and accessible without login

---

## Features — Next Build Batch

- [ ] **Player Contributions verification flow** — Admin panel currently has no UI to view/verify pending contributions. Add a "Contributions" tab in Admin with list of pending entries and approve/reject buttons (tRPC endpoint `playerContributions.adminVerify` already exists)
- [ ] **Site Tour AI responses** — review and refine the AI system prompt in `server/routers.ts` (`siteTour.chat`) for accuracy and tone as the site evolves
- [ ] **Org Stewardship UX** — stewards currently see join requests in PlayerProfile. Consider a dedicated `/steward` dashboard page if volume grows
- [ ] **Email digest system** — `emailDigestFrequency` column is live. Build the scheduled digest job that actually sends weekly/monthly/seasonal summaries to opted-in players
- [ ] **CrowdPooling — live progress bars** — confirm live pledge totals are updating correctly from the DB on campaign pages
- [ ] **Map — project filtering** — add filter by season, status, and region to the /map page
- [ ] **Admin AI Assistant** — expand the system prompt with up-to-date fund facts, project counts, and season context as those change

---

## Infrastructure

- [ ] **Redis cache health** — confirm Redis is being hit correctly in production (check cache hit rates in Railway logs or add a `/health` endpoint that reports cache status)
- [ ] **Error monitoring** — Sentry is installed (`@sentry/node`, `@sentry/react`). Confirm DSN is set in Railway env vars and errors are flowing to Sentry dashboard
- [ ] **Background email processor** — confirm the 60-second scheduled email job is running in production and drip emails are being dispatched (check server logs for "Scheduled email sent" lines)
- [ ] **DB migration strategy** — current approach (stored procedures in SQL files) works but is fragile. Consider writing a `scripts/migrate.js` custom migration runner with proper try/catch for cleaner long-term maintenance

---

## SEO & Performance

- [ ] **Lighthouse audit** — run against production regencivics.earth and address any LCP/CLS issues
- [ ] **OG image audit** — check all major pages (/fund, /land, /ally, /play, /opportunity) have correct og:image and og:description meta tags
- [ ] **Sitemap** — confirm `/sitemap.xml` is generated and submitted to Google Search Console

---

## Notes

- Railway CLI: always run `railway status` before `railway up` to confirm which service is targeted
- DB pushes in development: `pnpm db:push` = `drizzle-kit generate && drizzle-kit migrate`
- Production migrations run automatically as Railway `preDeployCommand` = `pnpm exec drizzle-kit migrate`
- Cloudflare R2 CDN base: `https://assets.regencivics.earth/`
