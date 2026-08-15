# Round-2 QA triage and fix routing

Coordinator, 2026-08-15, against build `5f3cf0b`. Inputs: `LANE_L_REPORT_2026-08-15.md` (0 HIGH /
6 MED / 7 LOW) and `LANE_V_REPORT_2026-08-15.md` (4 HIGH / 5 MED / 4 LOW). Deduped: V-L11 = L-M2;
V-M5 is NOT a finding (safe-area padding exists; coordinator-verified at `MobileTabBar.tsx:29`) —
its real half folds into the H1/H4 fix. Two detectors disagree on `/quests` alt text (L: zero
missing site-wide; V-L12: 6 missing) — the fix lane resolves by reading the DOM, and the loser
detector's mechanism goes in the paid-lessons.

## Ownership decision on the map (H2/H3)
The map is `docs/prototypes/grounds-v0.html`, a ~4 MB self-contained prototype served by the
server (`server/index.ts` ~18196) and shelled by `client/src/pages/LivingMap.tsx`. It is the map
lane's artifact and is actively worked in other sessions (`ga-map`, `wt-map-*` worktrees). Ruling:
- **H2 has a shell-side fix that is ours**: an always-visible, safe-area-aware escape control
  rendered by `LivingMap.tsx` OUTSIDE the iframe (a small fixed "Back to village" affordance at a
  z-index above the iframe, touch-target ≥44px). That restores in-app navigation without touching
  the prototype. → Lane F2.
- **H3 (the prototype's own 790px internal overflow and off-screen ✕ controls) is routed to the
  map owner**, not fixed by a QA lane: file it as a message to the map lane's session with V's
  measurements and screenshots. → coordinator action, recorded as an open blocker on the map lane.

## Fix lanes — disjoint zones, HIGH first

### Lane F1 — mobile shell (client/, HIGH)
Owns: `client/src/components/mobile/MobileTabBar.tsx`, `client/src/components/Layout.tsx` (or
wherever the page-bottom spacer lives), `client/src/pages/Login.tsx` (+ Register), `Quests.tsx`,
`Feed.tsx` bottom regions, `client/src/index.css` global touch/scroll rules.
1. **V-H1/H4 root cause**: the fixed tab bar reserves no page-bottom space at first paint on
   the routes where a primary CTA sits in the bottom ~70px. Fix at the source: guarantee every
   routed page's scroll container reserves `calc(<bar height> + env(safe-area-inset-bottom))`
   at the bottom whenever the bar is rendered (the Layout spacer already exists —
   `calc(env(safe-area-inset-bottom,0px) + 4rem)` — find why `/login`, `/quests`, `/feed` do
   not receive it, or why the CTA is positioned below it). Prove with V's harness pattern:
   `elementFromPoint` at each CTA centre returns the CTA at 390×664 and 390×844, scrollY=0.
   Re-run V's `occlusion.json` sweep: 19 thefts → 0.
2. **V-M7**: `autocomplete` on `/register` (`name`, `email`, `new-password` ×2) and the `/admin`
   login form (`username`/`email`, `current-password`).
3. **V-M8** (touch targets, client-owned ones only): `/feed` hashtag buttons and `/quests` sticky
   filter pills to ≥44px tall hit area (padding, not font-size, so the ratchet-zone copy is
   unchanged); `/tools` "More" and `/admin` password-reveal to ≥44×44 hit area (padding/
   `min-w`/`min-h`; visual size may stay small). Store toggles (40.6px) belong to Lane F3.
4. **V-L13**: `-webkit-tap-highlight-color: transparent` on controls and `overscroll-behavior:
   contain` on overlay/scroll containers, `overscroll-behavior-y: none` on body only if the app
   has no pull-to-refresh dependence (check first).
5. **L-M5** unlabelled form controls on 10 routes: add `<label>` or `aria-label` per control
   (honeypots stay `aria-hidden`). This touches page files F1 already owns; do it here.
Gates: the eleven, cold; brand ratchet 63/63 zero headroom (client is a zone — copy strings
unchanged, only attributes/classes); voice gate on any new visible copy.

### Lane F2 — map shell escape (client/src/pages/LivingMap.tsx only, HIGH)
1. **V-H2**: render an escape control in the SHELL above the iframe (fixed, top-left or
   top-right, ≥44×44, safe-area-inset-top aware, visible on all viewports, `aria-label`
   "Back to the village"), routing to the previous in-app location or `/`. Do not modify
   `docs/prototypes/grounds-v0.html`. Prove: outer shell has ≥1 button; `elementFromPoint` at
   its centre returns it at 390×844 and 390×664.
2. Also L-M1's `/map`-specific half: none — headers are Lane F4.
Note the shell's existing hash-forwarding contract (LivingMap.tsx header comment 28–30) — do
not break deep links.

### Lane F3 — store surface (client/src/pages/Admin.tsx store region + admin rail, MED)
Owns: the catalog/store region of `Admin.tsx` (Lane M's zone, now unowned) and the admin
sidebar labels.
1. **L-M4**: contrast — `always on`/lifecycle pills and the `18 of 18` count from
   `rgb(153,161,175)` to a ≥4.5:1 token on the `rgb(249,250,251)` backdrop; sidebar section
   labels ≥4.5:1; `Core` pills from 4.39 to ≥4.5. Measure, don't eyeball (L's `contrast2.json`
   method).
2. **L-M6**: `aria-label="Search the catalog"` on the store search input.
3. **V-M6**: catalog horizontal overflow at 360px — cards must fit `100% - rail - padding`
   (min-w-0 / w-full / box-sizing check); prove `overflowBy: 0` at 360.
4. **V-M8** store toggles to ≥44×44 hit area.
Gates: the eleven, cold; brand ratchet.

### Lane F4 — server hygiene (server/, MED+LOW)
Owns: `server/index.ts` header/route-shell zones only (no module/catalog/integrations zones).
1. **L-M1**: security response headers on every route — `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera/mic/
   geolocation unless the map needs geolocation — check), `X-Frame-Options: SAMEORIGIN` +
   CSP `frame-ancestors 'self'` (the `/map` iframe is same-origin, so this is safe), remove
   `x-powered-by`. **HSTS only if Railway terminates TLS for every hostname the app serves**
   (verify before setting; a wrong HSTS is not reversible for max-age). A full CSP with
   script-src is OUT of scope (inline scripts in the 4 MB map prototype would break) — set
   `frame-ancestors` only and note the rest.
2. **L-M3**: `/admin/mint` signed-out — render the same sign-in prompt `/admin` renders and do
   not fire admin fetches unauthenticated. (Client-side; the file is `client/src/pages/Mint*`
   — F4 owns it since it is a route-shell concern and no other fix lane touches it.)
3. **L-L1**: real 404 status for unknown routes where the SPA fallback serves the not-found
   view (server-side route allowlist or a client-reported status is NOT possible — evaluate the
   existing SPA fallback; if a proper 404 requires a route manifest, ship `/robots.txt` and
   `/sitemap.xml` as real files at minimum and report the soft-404 as deferred with reason).
4. **L-L5**: unify 401 body shape to `{error:"auth_required", ...}` where the four variants
   live, WITHOUT changing status codes; grep client for any code that branches on the old
   strings first.
5. **L-L6**: replace the hand-written gate at `server/index.ts:8976` with the framework's
   `requireModule("network")` ordering fix, preserving the 404 status.
6. **L-M2** (14 quest images): find why the seed references `/api/uploads/quest-NN-*.webp` that
   no build produces — either ship the assets (if they exist in any worktree/asset store) or
   change the seed to `image: null` so cards use the designed gradient without 7 console 404s.
   Report which.
7. **L-L3** heading skips and **L-L4** `/library` contrast are client — hand to F1 (add to its
   list) since they touch pages F1 owns; F4 does not touch client pages except Mint.

### Deferred (recorded, not dispatched)
- V-M9 perf: the 328 KB Admin chunk over the store is a real cost; profile after F3 lands
  (code-split the store panel) — own item, needs a baseline first.
- V-H3 map internal overflow → map lane (message sent by coordinator).
- L-L7 (0077) not a defect.
- V's "store tiers beyond included never rendered on mobile" — becomes a Lane V re-run item
  the day the first non-included listing exists.

## Sequencing
F1, F2, F3, F4 run concurrently — zones are disjoint by construction (F1: mobile components +
public page files; F2: LivingMap.tsx only; F3: Admin.tsx store region; F4: server + Mint page).
Land order by size and risk: F2 (one file) → F3 → F4 → F1 (largest surface). Each rebases on
the previous landing and re-runs the eleven gates cold. Then Lane V re-runs its occlusion and
overflow sweeps against the deployed SHA as the closing proof.
