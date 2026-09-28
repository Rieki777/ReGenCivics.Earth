# Claude Code Prompt: Build core.regencivics.earth (Church of the Regenerative Earth)

This document is the full build spec for standing up the Church of the Regenerative Earth (CORE) as a functional site at `core.regencivics.earth`, inside the existing regen-civics repo. It is written for Claude Code to execute end to end, with a Handoff Breakdown at the bottom for the steps only Rye can do.

**Run this inside the regen-civics monorepo** (the repo that contains `CLAUDE.md`, `.ai/`, `client/`, and `server/`). The `Desktop\CORE\` folder is reference material only: it holds the static first-draft site and copies of these docs. All code work happens in the monorepo.

Read `CLAUDE.md`, `.ai/docs/STEERING.md`, and `.ai/docs/DOMAIN-LANGUAGE.md` before starting. Respect the ship gate and the writing rules (no em-dashes anywhere in copy).

A first-draft static version of every page already exists at `C:\Users\taren\Desktop\CORE\site\`. Use it as the content and visual reference. This guide ports that draft into the React + tRPC stack and wires it up.

---

## 1. What we are building

A subdomain site, `core.regencivics.earth`, that presents the church, its faith, its programs, its elders, and how to get involved, and that is fully wired for two live features:

1. An **Ask Anastasia** chatbot, powered by the Claude API with retrieval over `anastasia_canon.md`, designed to extend to more elders later.
2. **Donations and tithes** through Stripe (one-time and recurring), with a **Steward** role that can accept and make payments on behalf of the church.

Everything else on the site is content that links back to the main `regencivics.earth` app for community, quests, schedule, and giving flows that already exist.

### Design language
Match `regencivics.earth`: forest greens, warm parchment, spring-green and amber accents, storybook rounded cards, fonts Righteous (display), Quicksand (subhead), Nunito (body). The static draft already encodes the exact palette and type. Warm the tone slightly relative to the main site.

### Pages (from the static draft)
- Home (`/`) - CORE as the spiritual core of ReGen Civics
- Our Faith (`/faith`) - creed, three principles of life, eight values
- Programs (`/programs`) - online gatherings, feeding those in need, healing circles, food forest planting, community events, sacred music
- Elders (`/elders`) - Anastasia, her canon (The Ringing Cedars of Russia, credited to Vladimir Megre), and the Ask Anastasia chatbot
- Get Involved (`/get-involved`) - links out to regencivics.earth
- Donate (`/donate`) - Stripe giving
- Transparency (`/transparency`) - 508(c)(1)(a) status, EIN, governance, formation document download

### Hard content rules
- No personal names of the founding council anywhere public. The church is about the people, not a founding council.
- Never publish the SSN or home address from the IRS documents.
- Public legal detail is limited to: legal name, 508(c)(1)(a) status, founding year 2026, EIN 42-3198293, SEEDS constitutional home, and the downloadable formation document.

---

## 2. Architecture decision

**Build inside the regen-civics monorepo and serve CORE as a subdomain.** This reuses the existing Express + Vite + tRPC server, Drizzle + MySQL, auth (JWT in HttpOnly cookie), the Hypha bridge, and `@anthropic-ai/sdk` (already a dependency). Append an ADR to `.ai/docs/DECISIONS.md` recording this choice.

### Subdomain routing
The app already runs multiple subdomains (`regencivics.earth`, `gov.regencivics.earth`). Before writing new host logic, search the codebase for how `gov.regencivics.earth` selects its route tree or layout and mirror that exact pattern. If there is no host-based switch yet, implement this:

- In `client/src/App.tsx`, detect the host once at startup: `const isCore = window.location.hostname.startsWith('core.')`.
- When `isCore` is true, render a dedicated `<CoreApp />` route tree (its own `Switch` of church routes, its own nav and footer) instead of the main app shell. Keep the church nav/footer as separate components so the main site is untouched.
- Church routes live under `client/src/pages/core/` (Home, Faith, Programs, Elders, GetInvolved, Donate, Transparency).
- Add a redirect so that on the main domain, `/church` sends users to `https://core.regencivics.earth`, and on the core subdomain the church tree is the root.

DNS and the Railway custom domain for `core.regencivics.earth` are a Rye step (see Handoff).

---

## 3. Build phases

Do these in order. Each phase ends in a shippable, typechecking state. Run the ship gate after each phase, and do not mark a phase done until its Definition of Done passes.

### Master execution order (run top to bottom)

```
Phase 0  Scaffold + static port of all 7 pages          -> ship gate
Phase 1  Drizzle migration + schema (do not run it)     -> ship gate
Phase 2  Steward role + permission guards               -> ship gate
Phase 3  Stripe donations (checkout + webhook + ledger) -> ship gate
Phase 4  Ask Anastasia chatbot (Claude API + retrieval) -> ship gate
Phase 4.5 Visual assets: generate + wire all images     -> ship gate   (section 8, items 1-3)
Phase 5  SEO, accessibility, motion, microcopy polish   -> ship gate   (section 8, items 2,5,8,9)
Phase 6  Quality-control matrix + QC checklist          -> section 9   (section 8, item 4)
Phase 7  Staging deploy, observability, go-live         -> Handoff     (section 8, item 10)
```

Section 8 details every improvement folded into phases 4.5 through 7. Section 9 is the pre-launch checklist. Do not skip the visual or QC phases: a complete first pass means real illustrations, motion, and a passing QC matrix, not just wired features.

**Definition of Done, every phase:** ship gate passes (audit-truncation clean, new classNames present, `pnpm typecheck` exit 0), no new console errors, and the phase's own acceptance criteria (stated in its section) are met.

### Phase 0 - Scaffold and static port
1. Create `client/src/pages/core/` and port each static page from `Desktop\CORE\site\*.html` into a React component. Reuse existing shadcn/ui primitives and Tailwind. Map colors to the existing CSS variables in `client/src/index.css` (forest, spring, parchment, amber). Do not introduce a second copy of the color system.
2. Build `CoreNav` and `CoreFooter` components. Footer legal line: `Church of the Regenerative Earth (CORE) - EIN 42-3198293 - Founded 2026 - Constitutional home: the SEEDS Constitution - Governed by the people through the tools at regencivics.earth and Hypha.`
3. Wire the host switch in `App.tsx` as described in section 2.
4. Add the formation document for download on the Transparency page. Serve it through a static route or an R2 object (source file: `Desktop\CORE\site\formation-document.docx`).
5. External links: Get Involved, community, schedule, and the main Donate CTA point to `https://regencivics.earth`, `https://regencivics.earth/schedule`, etc.

Acceptance: all seven pages render at their routes on the core host, nav and footer work on mobile and desktop, no personal names in the output. Ship gate, then continue.

### Phase 1 - Data model (Drizzle migration)
Write one numbered migration in `drizzle/` (do not run it, that is a Rye step). Follow the `regen-database-sql` skill patterns. Add:

1. **`church_role_holders`** (or extend the existing `roleHolders` / `roles` tables if a clean fit exists, check first):
   - `id`, `user_id`, `role` enum (`steward`), `can_accept_payments` boolean, `can_make_payments` boolean, `granted_at`, `granted_by`, `revoked_at` nullable.
   - The two initial holders are seeded by Rye after deploy (Handoff), not hardcoded in source.
2. **`church_donations`**:
   - `id`, `stripe_session_id`, `stripe_payment_intent`, `donor_user_id` nullable, `donor_email` nullable, `amount_cents`, `currency`, `interval` enum (`one_time`, `monthly`), `status` enum (`pending`, `succeeded`, `failed`, `refunded`), `created_at`, `updated_at`. Never mutate amount after `succeeded`.
3. **`church_payouts`** (payments made by the church):
   - `id`, `initiated_by_user_id`, `amount_cents`, `currency`, `purpose`, `destination_ref`, `status`, `created_at`. A ledger of church-side payments. Real money movement happens through the church bank account and Stripe on the operator side; this table records intent and reconciliation.
4. **`elder_chat_messages`**:
   - `id`, `session_id`, `elder` (default `anastasia`), `role` (`user`/`assistant`), `content`, `retrieved_chunk_ids` json, `created_at`. Used for moderation, rate limiting, and tuning. Store no PII beyond what the user types.

Update `drizzle/schema.ts` to match. `pnpm db:push` and the migration runner are Rye steps.

Acceptance: migration written and idempotent-safe, `schema.ts` updated, `pnpm typecheck` passes.

### Phase 2 - Steward role and permissions
1. Add a `churchRoles` tRPC router in `server/routes/churchRoles.ts` (register it in `server/routers.ts`). Procedures: `getMyChurchRoles`, `listRoleHolders` (admin), `grantRole` / `revokeRole` (admin).
2. Server-side helpers `assertCanAcceptPayments(userId)` and `assertCanMakePayments(userId)`, checked on every payment mutation. Never trust the client.
3. Governance note for code comments and the ADR: these rights are held today by a small core team and are intended to move to direct community governance over time through the tools at regencivics.earth and Hypha. The check must be data-driven (the `church_role_holders` table), so governance can grant and revoke without a code change. Do not hardcode any names or user IDs. The two current holders are seeded by Rye after deploy.

Acceptance: permission guards unit-tested, no hardcoded identities, ship gate passes.

### Phase 3 - Stripe donations
`stripe` is not yet a dependency. Add it. Secret keys are server-side only.

1. Env vars (Rye sets real values, see Handoff): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (client-safe), `CORE_DONATION_SUCCESS_URL`, `CORE_DONATION_CANCEL_URL`.
2. `server/routes/churchDonations.ts` (register in `server/routers.ts`):
   - `createCheckoutSession({ amountCents, interval })` creates a Stripe Checkout Session. `one_time` uses a one-off price; `monthly` creates or reuses a recurring price and subscription. Insert a `pending` row in `church_donations`. Return the Checkout URL.
3. Stripe webhook handler in `server/webhooks/` (mirror existing webhook receivers): verify the signature with `STRIPE_WEBHOOK_SECRET`, handle `checkout.session.completed`, `invoice.paid`, `payment_intent.payment_failed`, and update `church_donations.status`. Idempotent. Follow the webhook checklist in `.ai/docs/security/BUILD-PLAYBOOK.md` and `AI-AUTOMATION-RISKS.md`.
4. Payouts: `churchDonations.recordPayout(...)` (guarded by `assertCanMakePayments`) writes a `church_payouts` row for the ledger. Do not build an in-app tool that initiates external transfers autonomously. Actual transfers are a human action by a Steward. Add a clear code comment saying so.
5. Client: Donate page gets amount presets, a custom amount, and a one-time / monthly toggle, calls `createCheckoutSession`, and redirects to Stripe. Keep the draft's "giving is worship" copy.

Acceptance: checkout session creation and webhook signature handling are tested; guards enforced; ship gate passes.

### Phase 4 - Ask Anastasia chatbot (Claude API + retrieval)
Reuse `@anthropic-ai/sdk`. Build retrieval so it generalizes to more elders.

1. Corpus prep script `scripts/build-elder-corpus.ts`:
   - Read `anastasia_canon.md`. Chunk by section headings then into ~800-1000 token windows with slight overlap. Keep metadata: book, section title, chunk index.
   - Retrieval option A (recommended): embeddings via Voyage AI (`voyage-3` or current), Anthropic's recommended partner. Add `VOYAGE_API_KEY`. Store chunk text + vector in `elder_corpus_chunks` (`id`, `elder`, `book`, `section`, `chunk_index`, `content`, `embedding`). Cosine similarity in the app for top-k.
   - Retrieval option B (fallback, no new vendor): MySQL FULLTEXT / BM25 over the same chunks. Choose A if Voyage is acceptable, else B. Record the choice in the ADR.
   - This script writes to the DB, so running it is a Rye step. Claude Code writes and tests the logic against a local fixture.
2. `server/routes/elderChat.ts` (register in `server/routers.ts`):
   - `ask({ sessionId, question, elder = 'anastasia' })`: retrieve top-k chunks, call Claude with a system prompt that establishes Anastasia's voice and grounds strictly in the retrieved passages, answer in her cadence, defer gently when uncovered. Treat user text as untrusted (no tools, no instruction-following from user content). Persist to `elder_chat_messages`. Return the answer plus book/section citations.
   - Rate limit per session and per IP (reuse `server/rate-limit.ts`).
3. Client: Elders page replaces the static placeholder with a real chat panel. Keep the coming-soon styling until keys and corpus are live, then flip it on. Design so a second elder is just another `elder` value and corpus set.
4. Attribution: keep the credit to Vladimir Megre and The Ringing Cedars of Russia on the Elders page and in the chatbot about text.

Acceptance: grounded answers with citations against the local fixture, crisis fallback (section 8, item 6) in place, rate limit tested, ship gate passes.

---

## 4. Environment variables

| Var | Purpose | Client-safe |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anastasia chatbot (may already exist) | No |
| `VOYAGE_API_KEY` | Elder corpus embeddings (only if retrieval option A) | No |
| `GEMINI_API_KEY` | Nano Banana Pro image generation (build-time only, for generating the site illustrations) | No |
| `STRIPE_SECRET_KEY` | Stripe server calls | No |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhooks | No |
| `STRIPE_PUBLISHABLE_KEY` | Stripe.js on the client | Yes |
| `CORE_DONATION_SUCCESS_URL` | Redirect after successful checkout | Yes |
| `CORE_DONATION_CANCEL_URL` | Redirect after cancelled checkout | Yes |

Runtime vars go on Railway (Rye). `GEMINI_API_KEY` is build-time only and is provided to Claude Code's build environment, not Railway.

---

## 5. Ship gate (run before every "VERIFIED" or "DONE")

From repo root, per `STEERING.md` section 3:

```bash
python3 scripts/audit-truncation.py                 # gate 1: no truncated source files
rg -g '*.css' '<new-className>' client/src/          # gate 2: per new className / @keyframes
pnpm typecheck                                        # gate 3: exit 0
```

Add tests where the repo already tests similar surfaces (many `*.test.ts` files server-side). At minimum: donation checkout session creation, webhook signature handling, permission guards, and retrieval top-k selection.

---

## 6. Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Create the Railway custom domain `core.regencivics.earth` and point DNS at it | Railway dashboard + DNS registrar login | Railway project settings -> Domains; then a CNAME at the DNS host |
| 2 | Set all runtime env vars from section 4 on Railway | Dashboard login required | Railway -> Variables |
| 2b | Provide `GEMINI_API_KEY` to Claude Code's build environment (build-time only, not a Railway runtime var) so it can generate the site illustrations | Your key, used once at build time | Paste in chat or set in the local build shell env |
| 3 | Set up the church bank account and Stripe account, connect them, get live Stripe keys | Real-world banking and identity verification | Stripe dashboard + bank |
| 4 | Register the Stripe webhook endpoint URL and copy the signing secret into `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Stripe -> Developers -> Webhooks |
| 5 | Run the migration once code is merged | Railway DB is only reachable from your Windows machine, not the VM | `npx tsx scripts/run-migration.ts --all` |
| 6 | Run the elder corpus build script | Writes vectors/chunks to Railway DB | `npx tsx scripts/build-elder-corpus.ts` |
| 7 | Seed the two initial Steward role holders (Maggie LaCosta and Rye Cordon) with accept + make payment rights | Needs real user IDs from the DB, and this is a governance act, not source code | Admin action in-app once live, or a one-off seed script run locally |
| 8 | `git add -A && git commit && git push` and approve the Railway deploy | Deploy approval + git push from your machine | local shell |
| 9 | Confirm the deploy succeeded and smoke-test giving with a real small donation and the chatbot | Browser actions on the live site | https://core.regencivics.earth |

### CLAUDE CODE - can be done without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Port static pages into `client/src/pages/core/` React components | CODED when done |
| 2 | Host switch in `App.tsx`, `CoreNav`, `CoreFooter` | CODED |
| 3 | Drizzle migration + `schema.ts` for church roles, donations, payouts, chat, corpus | CODED (Rye runs it) |
| 4 | `churchRoles`, `churchDonations`, `elderChat` tRPC routers + register in `routers.ts` | CODED |
| 5 | Server-side permission guards for payments | CODED |
| 6 | Stripe checkout + webhook handler | CODED (needs Rye's keys to run) |
| 7 | `build-elder-corpus.ts` script + retrieval logic + tests against a local fixture | SCRIPTS READY (Rye runs it) |
| 8 | Elder chat UI + Donate UI | CODED |
| 9 | ADR in `DECISIONS.md`, term entries in `DOMAIN-LANGUAGE.md` (Steward, elder chat), ship-gate runs | DONE |
| 10 | Generate all illustrations from `ASSET_PROMPTS.md`, process to AVIF/WebP, host on R2, wire into pages with LQIP + alt text; compose OG cards in `og.ts` | SCRIPTS READY (needs `GEMINI_API_KEY`) |
| 11 | Motion system with reduced-motion fallback, self-host fonts, accessibility to WCAG AA, SEO + structur| 11 | Motion system with reduced-motion fallback, self-host fonts, accessibility to WCAG AA, SEO + structured data, microcopy, in-theme 404 | CODED |
| 12 | Run the QC matrix (web-quality-audit + webapp-testing) and complete the section 9 checklist | CODED per phase |

### WAITING ON YOU before Claude Code can flip features on

- Chatbot goes live only after `ANTHROPIC_API_KEY` (and `VOYAGE_API_KEY` if used) are set and the corpus script has run (Rye tasks 2, 6).
- Donations go live only after the Stripe account, keys, and webhook are set up (Rye tasks 2, 3, 4).
- Illustrations need `GEMINI_API_KEY` in the build environment (Rye task 2b).
- Everything is blocked on the subdomain existing (Rye task 1) for a real end-to-end test, though local dev with a `core.localhost` host works for building.

---

## 7. Notes for later

- The Ask Anastasia design is deliberately elder-agnostic. Adding a new elder is: add their canon file, run the corpus script for that `elder` value, and add their profile card. No new plumbing.
- Steward rights are data-driven so the community can eventually grant and revoke them through governance without a code change. Keep it that way.
- Keep all public copy free of founder names and free of the SSN and home address from the IRS filings.

---

## 8. Ten ways to make this first pass as complete as possible

These extend the phases above. Items 1 to 3 are Phase 4.5 (visual and motion). Item 4 is Phase 6 (quality control). The rest thread through Phase 5 and Phase 7.

### 1. A real image and illustration system (not emoji)
The draft uses emoji as placeholders. Replace them with a coherent set of painterly, enchanted-forest storybook illustrations in the site palette. The full, copy-paste-ready prompts, filenames, sizes, alt text, and the exact `nano-banana-pro` command already exist in **`client/src/pages/core/ASSET_PROMPTS.md`**. Execute that file: generate each image, export AVIF + WebP with a JPEG fallback, upload to R2 (`assets.regencivics.earth/core/...`), serve through the existing `/api/img` proxy with `srcset`, add tiny blurred LQIP placeholders, and apply the alt text listed there. OG share cards are composed in code by `server/routes/og.ts` (do not generate them as art). Generation needs `GEMINI_API_KEY` in the build environment; keep raw PNGs out of git.

### 2. A motion and animation system with a reduced-motion contract
Add tasteful motion that reinforces the living-systems feeling, never decoration for its own sake:
- Reuse the existing `MycelialBackground` and `useGlobalScrollReveal` rather than inventing new systems.
- Hero: slow ambient drift of light motes / floating seeds behind the headline.
- Scroll reveals: sections and cards fade and rise on enter.
- Section dividers: a thin vine or root that draws itself as you scroll past.
- Micro-interactions: card lift on hover (already in the draft), button press states, a gentle sway on the seed logo.
- Transparency page: count-up on the founding year and any figures.
- Hard rule: animate only `transform` and `opacity` for 60fps, never properties that trigger layout, so CLS stays near zero. Every animation has a full static fallback under `@media (prefers-reduced-motion: reduce)`. Test both states.

### 3. Self-host the fonts (quality fix from the draft)
The static draft loads Righteous, Quicksand, and Nunito from the Google Fonts CDN. The main app deliberately self-hosts these to avoid external requests (see the `@font-face` blocks in `client/src/index.css`). In the React port, drop the CDN import, use the existing self-hosted fonts, and `preload` the hero display font. This matches the main site, improves privacy, and speeds first paint.

### 4. A full quality-control and test matrix (Phase 6, gate before launch)
Beyond the three-gate ship gate:
- Run the `web-quality-audit` skill and hold: Performance >= 90, Accessibility >= 95, SEO 100, Best Practices >= 95 on mobile and desktop.
- Accessibility: automated axe scan plus a manual keyboard-only and screen-reader pass. WCAG AA. Verify amber-on-parchment and spring-green-on-white contrast specifically.
- Cross-browser and device: use the `webapp-testing` skill (Playwright) to smoke-test Chrome, Safari, Firefox, and mobile widths. Screenshot every page at mobile and desktop for visual regression, and re-capture after changes.
- Link checker: verify every internal route, every external `regencivics.earth` link, and the formation-document download.
- Core Web Vitals: LCP < 2.5s (hero image optimized and preloaded), CLS < 0.1, INP healthy.
- Complete the written QC checklist in section 9 and require it signed off before the go-live smoke test.

### 5. Accessibility and inclusivity to WCAG AA, plus translation
The church is for everyone, so treat access as a value. Semantic landmarks, visible focus rings, alt text, reduced-motion, full keyboard operability. Enable the app's existing `LanguageContext` / GoogleTranslate on the subdomain so the site is reachable across languages. Make the chatbot input and transcript screen-reader friendly (ARIA live region for streamed replies).

### 6. Anastasia chatbot guardrails and pastoral safety
- Grounding: answer only from retrieved canon, cite book and section, never invent teachings, defer gently when uncovered. Stay in her tender, plain-spoken voice.
- Crisis handling: if a user expresses self-harm, crisis, or acute distress, the assistant steps out of persona and responds plainly with warmth and real support resources rather than roleplaying through it. This overrides the in-character instruction.
- Prompt-injection resistance: treat all user text as untrusted, expose no tools, follow `.ai/docs/security/AI-AUTOMATION-RISKS.md` end to end.
- Rate limit per session and IP, log to `elder_chat_messages` for moderation and tuning, and show a short visible disclaimer that this is an AI drawing on The Ringing Cedars canon, credited to Vladimir Megre.

### 7. Donation trust, receipts, and compliance
- Stripe Checkout keeps card data off our servers (PCI handled by Stripe).
- Email a receipt for every gift through Resend (already in the stack), with the church legal name, EIN, and 508(c)(1)(a) status.
- Give recurring donors a self-serve management link (Stripe billing portal).
- Add a warm thank-you page with a next step (join the community), and a clear refund path.
- Add a Stewards reconciliation view listing donations and recorded payouts, guarded by the payment role.
- Include the correct tax and disclosure language for a 508(c)(1)(a) faith ministry, and flag it for Rye's review since it is legal copy.

### 8. SEO, social, and discoverability
Per-page title, meta description, and canonical. Open Graph and Twitter cards using the generated share images (reuse `server/routes/og.ts`). JSON-LD structured data: an `Organization` / church entity, plus `FAQPage` on the Faith page. Add the subdomain to the sitemap and a sensible `robots`.

### 9. Content polish, microcopy, and a theology review gate
- Run the `avoid-ai-writing` skill over all copy and enforce the no-em-dash rule and Rye's voice.
- Add the small states that make a site feel finished: loading skeletons, empty states, error states, and an in-theme 404 page.
- Credit the hymns and the Ringing Cedars canon wherever they appear.
- Add a required human review checkpoint before publish for doctrinal accuracy and elder attribution. This is a Rye (or elder) sign-off, not a code task.

### 10. Staging, observability, and a documented rollback
- Deploy to a Railway staging target first and run the full QC matrix there before production.
- Wire privacy-respecting analytics plus a donation funnel and chatbot usage view.
- Add error monitoring (reuse whatever the main app uses; Sentry if present) scoped to the core subdomain.
- Write a one-page go-live checklist (DNS, SSL, env vars, Stripe webhook verified, corpus built, roles seeded, smoke test) and a rollback procedure, and append both to `OPS-PLAYBOOK.md`.

---

## 9. Pre-launch QC checklist (must all pass before go-live)

```
[ ] Ship gate: audit-truncation.py clean, new classNames present, pnpm typecheck exit 0
[ ] Lighthouse mobile + desktop: Perf >=90, A11y >=95, SEO 100, BP >=95
[ ] axe: zero critical/serious a11y violations
[ ] Keyboard-only pass on every page and the chatbot
[ ] prefers-reduced-motion: every animation has a static fallback, verified
[ ] CLS < 0.1, LCP < 2.5s (hero image preloaded), INP healthy
[ ] All images: AVIF/WebP served, LQIP placeholder, descriptive alt text
[ ] Fonts self-hosted (no Google Fonts CDN request in the network tab)
[ ] Cross-browser smoke: Chrome, Safari, Firefox, mobile widths
[ ] All internal routes + external regencivics.earth links resolve
[ ] Formation-document download works
[ ] Donation: test-mode one-time + monthly checkout, webhook updates status, receipt email sends
[ ] Chatbot: grounded answers with citations, crisis fallback works, rate limit works, disclaimer visible
[ ] No founder names, no SSN, no home address anywhere in the built output (grep the dist)
[ ] OG cards render correctly when a page URL is shared
[ ] 404 page is in-theme
```
