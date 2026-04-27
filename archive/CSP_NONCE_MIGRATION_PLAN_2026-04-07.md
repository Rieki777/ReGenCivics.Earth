# CSP Nonce Migration Plan

**Created:** 2026-04-07
**Status:** Ready to execute, **NOT launch-blocking**
**Scope:** Small (9-13 hours)
**Priority:** High post-launch (security debt)

## Context

regen-civics currently ships a CSP with `'unsafe-inline'` and `'unsafe-eval'` in `script-src` and `'unsafe-inline'` in `style-src`. This weakens XSS protection. This plan migrates to a nonce-based CSP.

## Current CSP (server/_core/security.ts lines 18-32)

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.youtube.com https://s.ytimg.com https://static.cloudflareinsights.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://www.gstatic.com
img-src 'self' data: blob: https://assets.regencivics.earth https://regencivics.earth https://*.googleapis.com https://*.gstatic.com https://img.youtube.com https://i.ytimg.com https://*.ytimg.com https://*.googleusercontent.com https://storage.googleapis.com https://lh3.googleusercontent.com https://www.google.com https://www.gstatic.com https://maps.gstatic.com
font-src 'self' https://fonts.gstatic.com data:
media-src 'self' https: blob:
connect-src 'self' https: wss:
frame-src 'self' https://calendly.com https://www.youtube.com https://youtu.be https://www.youtube-nocookie.com https://player.vimeo.com https://www.vimeo.com https://fast.wistia.net https://www.loom.com https://www.dailymotion.com
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'self'
upgrade-insecure-requests
```

## Inventory of inline scripts/styles that need nonce support

| Location | Lines | Type | Purpose |
|---|---|---|---|
| `client/index.html` | 57-73 | inline `<script>` IIFE | Route-aware LCP preload (conditional `<link rel="preload">` for hero images) |
| `client/index.html` | 120-182 | `<script type="application/ld+json">` | JSON-LD structured data. Non-executable, does NOT need nonce. |
| `client/public/offline.html` | 7-14 | inline `<style>` | Critical styling for offline fallback page |
| `client/src/components/ui/chart.tsx` | 70-101 | React `<style dangerouslySetInnerHTML>` | Dynamic CSS variables for Recharts theming |
| `client/src/components/JsonLD.tsx` | 12-14 | `<script type="application/ld+json">` | JSON-LD. Non-executable, no nonce needed. |

**No Vite inline script injection.** HMR uses WebSocket; the React plugin does not inject inline scripts. The PWA plugin generates `sw.js` separately. No third-party CDN scripts are loaded via `<script src>` in `client/index.html` today.

## Risk of dropping `'unsafe-inline'` without nonce support

- LCP preload script stops running → hero images no longer preloaded on `/bionomics`, `/economy`, `/local-food-economy`
- Recharts loses color theming → charts become hard to read
- Offline fallback page loses layout styling
- Any future inline script addition silently breaks

## Migration plan (6 phases)

### Phase 1 — Per-request nonce generation

1. **Create `server/_core/nonce.ts`** exporting `generateNonce(length = 16)` using `crypto.randomBytes().toString('base64url')`.
2. **Add `cspNonceMiddleware` in `server/_core/security.ts`** that calls `generateNonce()` and assigns to `res.locals.nonce`.
3. **Modify existing `cspMiddleware`** to read `res.locals.nonce` and inject `'nonce-<value>'` into `script-src` and `style-src` in place of `'unsafe-inline'`.
4. **Register nonce middleware BEFORE CSP middleware** in `server/_core/index.ts` around line 134:
   ```
   app.use(cspNonceMiddleware);
   app.use(cspMiddleware);
   app.use(securityHeadersMiddleware);
   ```

### Phase 2 — Pass nonce to the HTML template

Current `server/_core/index.ts` lines 44-47 uses `res.sendFile()` for the catch-all route. Change to read `index.html` from disk once at boot (cache the string), then per-request replace `{{NONCE}}` with `res.locals.nonce` before sending.

Also add a dedicated route handler for `/offline.html` that does the same substitution.

### Phase 3 — Tag inline elements with nonce placeholder

- `client/index.html` line 57: change `<script>` to `<script nonce="{{NONCE}}">`
- `client/public/offline.html` line 7: change `<style>` to `<style nonce="{{NONCE}}">`
- Add a new inline script tag right before `</body>` in `client/index.html`:
  ```
  <script nonce="{{NONCE}}">window.__NONCE__="{{NONCE}}";</script>
  ```
  This script itself is nonce-authorized and exposes the nonce to React components that need it.

### Phase 4 — Thread nonce into React components

`client/src/components/ui/chart.tsx` lines 70-101 render a `<style dangerouslySetInnerHTML>`. Update to:
```
<style
  nonce={typeof window !== 'undefined' ? (window as any).__NONCE__ : ''}
  dangerouslySetInnerHTML={{ __html: cssContent }}
/>
```
React allows the `nonce` attribute on DOM elements. No other React components need changes (JsonLD is non-executable data, no CSP enforcement).

### Phase 5 — Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP

In `server/_core/security.ts` lines 20-21:
- Remove `'unsafe-inline'` from both `script-src` and `style-src`
- Remove `'unsafe-eval'` from `script-src`
- Confirm nonce token is in its place

### Phase 6 — Testing

Local dev checklist:
- `npm run dev` → app loads, no CSP errors in DevTools Console
- LCP preload fires (Network tab shows preloaded hero image on `/bionomics`)
- Charts render with colors (visit any page with a Recharts component)
- 3 hard reloads each produce a different nonce in the CSP response header
- Navigate to `/offline.html` → styles render

Production:
- `npm run build && NODE_ENV=production node dist/index.js`
- CSP header contains `'nonce-<value>'` and does NOT contain `'unsafe-inline'` or `'unsafe-eval'`
- Manual XSS test: submit a forum post containing `<script>alert(1)</script>` → does not execute

Optional safety net: start with `Content-Security-Policy-Report-Only` header in parallel for 24-48h, add a `/api/csp-report` endpoint to collect violations, then flip to enforcing.

## File change summary

| File | Change |
|---|---|
| `server/_core/nonce.ts` | NEW — nonce generator |
| `server/_core/security.ts` | Add `cspNonceMiddleware`, update `cspMiddleware`, remove `'unsafe-inline'`/`'unsafe-eval'` |
| `server/_core/index.ts` | Register nonce middleware; replace `sendFile` catch-all with template substitution; add `/offline.html` route |
| `client/index.html` | Add `nonce="{{NONCE}}"` to line 57 script; add global nonce injection script before `</body>` |
| `client/public/offline.html` | Add `nonce="{{NONCE}}"` to `<style>` |
| `client/src/components/ui/chart.tsx` | Add `nonce={window.__NONCE__}` to `<style>` |

## Rollback

If issues in production: revert `server/_core/security.ts` to restore `'unsafe-inline'`. The rest of the changes are harmless if the nonce is absent (browsers ignore unknown nonces under `'unsafe-inline'`).

## Scope and timing

Total: 9-13 hours / 1-2 dev days. **Not launch-blocking.** Ship to production after Earth Day launch in a dedicated security hardening PR.
