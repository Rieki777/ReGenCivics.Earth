# Lane L — live functional QA report (adopted verbatim in substance)

Build measured: `2026-07-28-wave1-5f3cf0b` (live `/health`); local build at `wt-liveqa` on the same SHA
reports the identical marker, so local-observed findings are the same code. Signed-out only on live;
a founder account exists only on local scratch schema `amora_lanel`. No live writes.

## HIGH — none

## MED
| # | Finding | Where | Repro |
|---|---|---|---|
| M1 | No security response headers on any route (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); `x-powered-by: Express` advertised. Compounds with the `/map` full-viewport iframe: the village is framable | live | `curl -sI https://amora.regencivics.earth/` |
| M2 | 14 quest images referenced by seed data never shipped — all `/api/uploads/quest-NN-*.webp` 404 live AND on a fresh local build (build defect, not lost uploads); 7 fire on `/quests` (the only genuine console errors on a public route); cards fall back to a designed gradient | live + local | `curl -o /dev/null -w "%{http_code}" …/api/uploads/quest-01-welcome-ambassador.webp` → 404 |
| M3 | `/admin/mint` renders the 404 body signed-out (title stays "Village settings · Amora") and still fires `GET /api/admin/variables` + `/api/admin/economy` → 401 console errors; sibling `/admin` correctly renders the sign-in prompt | live | open `/admin/mint` signed out |
| M4 | Store surface contrast: 12 failures on `/admin` → Modules On/Off — `18 of 18` count and `always on` pills at 2.49:1 (`rgb(153,161,175)` on `rgb(249,250,251)`), sidebar section labels 2.60:1, `Core` pills 4.39:1 (need 4.5) | local (admin-gated live) | control-validated measurement |
| M5 | Unlabelled form controls: `/feedback` input (placeholder only) + textarea (nothing); same pattern on 9 more routes (`/contribute` 3, `/steward` 4, `/love-letter` 5, `/propose-quest` 10, `/register` 4, `/set-password` 2, `/visit` 4, `/map/circles` 1, `/work-with-us` 1). Honeypots correctly excluded | live | detector proven on injected controls |
| M6 | Store search box has no accessible name (`Admin.tsx:3505`, placeholder only) while its four sibling selects carry `aria-label` | local | inspect |

## LOW
| # | Finding |
|---|---|
| L1 | Unknown routes return HTTP 200 (soft-404); `/robots.txt` and `/sitemap.xml` serve the SPA HTML |
| L2 | `/events` and `/messages` set their titles then render the 404 page (off modules; nav correctly omits both — typed-URL only) |
| L3 | Heading-level skips: `/prosperity`, `/housing`, `/opportunities` (h1→h3), `/co-creators-guide` (h2→h4) |
| L4 | `/library` "out on loan" span at 4.39:1 |
| L5 | 401 bodies have four incompatible shapes (`Unauthorized` / `Sign in first` / `auth_required`+module / `Sign in to see your messages`) |
| L6 | Hand-written second copy of the module gate at `server/index.ts:8976` (`/api/network/published` mounted above its own `requireModule`, returns `Not found` instead of `module_disabled`) |
| L7 | Migration 0077 absent from this SHA (76 files 0076→0078) — cross-worktree allocation, not a lost file |

## Round-2 focus verdicts (all CLEAN or by-design)
- Federated documents (`/api/platform/info`, `/.well-known/village.json`): **no vendor/tier/price strings — byte-checked** against a 27-term vocabulary with a known-bad control that flagged 7 terms on a doctored body. Both project `{id, lifecycle}` only.
- `/api/modules` signed-out: 16 modules, all `included`/`public`, support party `platform`, nulls elsewhere, zero price fields, no secret slots.
- 404-off / 401-anon / 503-lapsed semantics: **correct, proven by writing lifecycles + rebooting** (settings map is in-memory). `preview` answers the same 404 body as `off` (no existence leak); admin prefixes on an off module answer 404 not 401. The 503 path is structurally unreachable in this build (`vendorModules()` empty; all 18 entries `included`) — design, verified by code and injection.
- Store filters absent because the library holds one answer — **rule verified by control** (doctored payload made tier + price filters appear; `Admin.tsx:3507`).
- Catalog/search/detail: functionally clean; search matches name AND description; empty state + Clear work; all 18 Details toggles carry `aria-expanded`; zero console errors/≥400s across the admin pass at 1280 and 768.

## Checked and CLEAN
56 public routes × 2 viewports (112 records), zero hard errors, zero uncaught page errors; zero horizontal overflow at 1280 or 768; console clean on 54/56 routes; only failed subresource is Cloudflare's own RUM beacon; `<main>` on all 48 substantive routes; exactly one h1 everywhere; zero images without alt; zero unnamed buttons / empty links; `lang` + meta description everywhere; skip link is tab stop 1, 22 stops on landing all with visible focus; public-route contrast 1 marginal failure across 10 routes (oklch normalised via canvas); nav has 28 hrefs, none to an off module; 76 migrations apply clean; `instanceId` consistent across the three identity surfaces.

## Could NOT measure — 8
1. Every signed-in member surface on live (no test account) — routes named.
2. Every admin surface on live (tested on local same-SHA build; live serves 16 modules `public` vs scratch's 4).
3. **JourneyToLaunch citation line never rendered anywhere**: live is admin-gated; local returns `503 assistant-unavailable` with no key. Verified by source + `loop.e2e.test.ts:2814`, not by render.
4. The 503 vendor-lapse response over live HTTP (structurally unreachable).
5. Contrast: 68 in-viewport nodes unmeasured (translucent fg/bg, image/gradient backdrops) + 853 offscreen nodes; measured 274 pass / 13 fail; the 921 unmeasured are NOT counted as passes.
6. Live write paths (by discipline).
7. `/map` iframe interior (cross-document; also the only route to time out networkidle).
8. Real iOS Safari (Lane V).

## Tooling lies caught (per the brief)
- First Playwright run exited 0 having launched nothing (wrong `chrome-win` vs `chrome-win64` path) — every later run checked for artifacts on disk.
- First contrast checker excluded each element's own background, manufacturing 25 failures incl. "white on white" on primary CTAs; fixed against screenshot ground truth.
- First pass read `/map` as a 0-char blank page — it is an iframe; `innerText` cannot cross the document boundary.

## Artifacts
Worktree `wt-liveqa` on `wt/live-qa` at `5f3cf0b`, built + migrated + founder on `amora_lanel`, ready for the fix phase. Evidence JSON + screenshots under the coordinator session scratchpad (`laneL-results.json`, `contrast2.json`, `store-results.json`, `detail-results.json`, `shots*/`).
