# CORE (core.regencivics.earth) - build handoff, 2026-07-01

Church of the Regenerative Earth, built inside this monorepo as a subdomain (ADR-18). Phases 0 through 7 of `CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md` are complete in code, plus Zeffy added as the preferred donation processor (ADR-19). All live features are wired and tested behind feature flags that flip on automatically once you set their keys and run their data steps. Nothing here touched the Railway DB, Railway env, git push, or real payments.

## What shipped (CLAUDE CODE, done)

- **Phase 0** Seven React pages + in-theme 404 under `client/src/pages/core/`, `CoreNav` + `CoreFooter`, host switch in `client/src/App.tsx` (`isCoreHost` -> `CoreShell`), `/church` redirect on the main domain, scoped `core.css` mapped to existing tokens, ADR-18 in `.ai/docs/DECISIONS.md`. Formation doc served at `/core/formation-document.docx` (home rewritten to "the whole Earth"; no names/SSN/address).
- **Phase 1** `drizzle/0153_core_church.sql` + `drizzle/schema.ts`: `church_role_holders`, `church_donations`, `church_payouts`, `elder_chat_messages`, `elder_corpus_chunks` (embedding column + FULLTEXT index).
- **Phase 2** `server/routes/churchRoles.ts` + `server/lib/church-permissions.ts` (`assertCanAcceptPayments` / `assertCanMakePayments`, data-driven, no hardcoded names/IDs).
- **Phase 3** `server/routes/churchDonations.ts` (checkout, payout ledger, reconciliation), `server/webhooks/stripe.ts` (signature verify + idempotency + Resend receipt), `DonateForm` / `ThankYou` / `Reconciliation` pages. `stripe` added.
- **Phase 3.5 (Zeffy, ADR-19)** Zeffy is now the PREFERRED processor (zero platform fees for nonprofits); Stripe is the secondary fallback. `server/lib/zeffy.ts`, `server/webhooks/zeffy.ts` (shared-secret-in-URL auth since Zeffy has no documented HMAC, idempotent on `zeffyPaymentId`), `drizzle/0154_core_zeffy.sql` (adds `provider`/`zeffyPaymentId`/`zeffyCampaignId` to `church_donations`), `ZeffyDonate.tsx` (iframe embed) + `DonateOptions.tsx` (Zeffy primary, Stripe behind a "prefer to give by card directly?" disclosure), `scripts/reconcile-zeffy.ts` (backup reconciliation via Zeffy's read-only API).
- **Phase 4** `server/routes/elderChat.ts` + `server/lib/elder-{corpus,retrieval,safety}.ts` (Voyage embeddings with FULLTEXT fallback, crisis fallback, grounded system prompt with citations, rate limiting, transcript log), `scripts/build-elder-corpus.ts` (dry-run verified: 120 chunks / 10 books), live client chat with disclaimer.
- **Phase 4.5** `scripts/generate-core-assets.ts` + `scripts/process-core-assets.ts` (SCRIPTS READY), `CoreImage` + registry + manifest, wired into program cards, elder portrait, nav emblem with graceful fallbacks.
- **Phase 5** Per-page title/meta/OG, CORE OG card in `server/routes/og.ts`, JSON-LD (Organization + Faith FAQ), Home `h1` fix, focus rings, reduced-motion-aware motion.
- **Phase 5.5 (Steward rename, ADR-20)** The role title priest/priestess is renamed to a single, gender-neutral "Steward" everywhere: schema (`drizzle/0155_core_steward_rename.sql`, a safe 3-step enum rename), the `churchRoles` router and permission helpers, UI copy on Transparency and Reconciliation, and the living docs. Historical ADR-18/19 prose is left as-is (records what was true at the time); `anastasia_canon.md`'s literary use of "priest" is untouched (unrelated meaning, must stay verbatim).
- **Tests**: 26 passing (`server/church-roles.test.ts`, `server/church-donations.test.ts`, `server/elder-chat.test.ts`, `server/og-core.test.ts`, `server/zeffy.test.ts`). Ship gate green throughout (truncation 0, typecheck exit 0).

## Pre-launch QC matrix (section 9)

```
[x] Ship gate: audit-truncation clean (0/802), classNames present, tsc --noEmit exit 0
[x] prefers-reduced-motion: reveal + emblem sway have static fallbacks (verified)
[x] All internal routes + external regencivics.earth links resolve (audited)
[x] Formation-document download works (/core/formation-document.docx in build)
[x] No founder names, no SSN, no home address in CORE built output (grepped dist; CORE chunks clean)
[x] 404 page is in-theme
[x] Fonts self-hosted (no Google Fonts CDN request; CDN import dropped in the port)
[x] Keyboard focus rings on all interactive elements; one <h1> per page
[x] Donate page falls back correctly with zero config (verified: no regression, matches pre-Zeffy behavior)
[~] Donation (Zeffy): coded + unit-tested (webhook token guard, idempotency). Live test needs your Zeffy embed URL + webhook token.
[~] Donation (Stripe, fallback): coded + unit-tested (checkout guard, webhook signature, payout guard). Live test needs your Stripe keys.
[~] Chatbot: coded + unit-tested (crisis fallback, retrieval top-k, rate limit, enable-flag). Grounded live answers need ANTHROPIC_API_KEY + corpus.
[~] All images AVIF/WebP + LQIP + alt: pipeline ready + alt text in registry; needs GEMINI_API_KEY to generate.
[~] OG cards render: composition done + unit-tested. BLOCKED repo-wide: og.ts loads a .woff2 that satori 0.26 cannot parse. Vendor a TTF and point getFont() at it (fixes all OG, not just CORE).
[ ] Lighthouse (Perf/A11y/SEO/BP), axe, cross-browser (Safari/Firefox), CWV: run on staging once the subdomain is live (needs a running server + real assets).
```

## WAITING ON YOU (Rye) - ordered

Full runbook + rollback: `.ai/docs/security/OPS-PLAYBOOK.md` Procedure 12.

1. **DNS + Railway domain** for `core.regencivics.earth` (CNAME + custom domain). The host switch activates automatically.
2. **Run the migrations, in order**: `0153_core_church.sql`, `0154_core_zeffy.sql`, `0155_core_steward_rename.sql` (or `npx tsx scripts/run-migration.ts --all`).
3. **Set up Zeffy** (preferred, zero fees): create a nonprofit account at zeffy.com, build a donation Campaign/form (one-time + monthly amounts), get its embed URL (Campaigns -> ... -> Share -> Embed), and register a webhook (Settings -> Integrations -> Webhook) at `https://core.regencivics.earth/api/webhooks/zeffy/<a-secret-token-you-choose>`.
4. **Set env vars on Railway**: `ZEFFY_EMBED_URL`, `ZEFFY_WEBHOOK_TOKEN` (must match the token in the webhook URL above), optional `ZEFFY_API_KEY`; `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CORE_DONATION_SUCCESS_URL`, `CORE_DONATION_CANCEL_URL` (Stripe fallback); optional `VOYAGE_API_KEY`; `ANTHROPIC_API_KEY` if not already set. (All documented in `.env.example`.)
5. **Stripe (fallback, optional but recommended as backup)**: create account + bank, register webhook `https://core.regencivics.earth/api/webhooks/stripe`, copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
6. **Build the elder corpus**: `npx tsx scripts/build-elder-corpus.ts` (set `VOYAGE_API_KEY` first for embeddings; otherwise it runs FULLTEXT-only).
7. **Seed the two Steward holders** via `churchRoles.grantRole` with real user IDs (governance act; not in source).
8. **Generate illustrations** (quality): `GEMINI_API_KEY=... npx tsx scripts/generate-core-assets.ts` then `npx tsx scripts/process-core-assets.ts`.
9. **Commit + push + deploy**, then smoke-test giving on BOTH paths (a small real Zeffy gift, and a small real Stripe gift if enabled) and the chatbot on the live site.

## Flags for your review

- **"Home is the whole Earth"**: I rewrote the served formation document's home base from "Hawaiian Paradise Park, Big Island, Hawaii" to "the whole Earth" (3 places), per your note. Please confirm the doctrinal/legal wording is acceptable.
- **Sensitive source docs**: `CP_575_E.pdf`, the IRS EIN application PDF, and `Church_of_the_Regenerative_Earth_Formation_v2.docx` are in the repo root and contain the SSN / home address. I added them to `.gitignore` so `git add -A` cannot commit them. Do not force-add them.
- **Legal copy**: the donation receipt and 508(c)(1)(a) disclosure language (`server/webhooks/stripe.ts`, `server/webhooks/zeffy.ts`) should get a human/legal review before real gifts flow.
- **Zeffy webhook auth**: Zeffy does not document HMAC signature verification the way Stripe/GitHub do, so I used a secret token in the webhook URL path instead (`/api/webhooks/zeffy/<token>`), plus idempotency on the payment ID. Treat that URL (with the token) as a secret; don't post it publicly.
- **OG font**: vendoring a TTF for `og.ts` is a small, high-value fix that turns on share cards site-wide.

## Not pushed (VM cannot push; commit from Windows)

All CORE work is uncommitted in your working tree. Suggested commit grouping: (1) Phase 0 scaffold + docs, (2) schema + migrations, (3) roles + donations (Stripe) + webhook, (4) Zeffy integration, (5) elder chat + corpus, (6) assets pipeline + SEO/a11y, (7) Steward rename. Or one `feat(core): church of the regenerative earth subdomain` commit if you prefer.
