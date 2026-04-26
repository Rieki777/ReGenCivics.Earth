# PRINCIPLES: Security Posture

The non-negotiable posture for ReGen Civics. These principles are upstream of OWASP, the audit, and the playbooks.

Last reviewed: 2026-04-25.

---

## 1. Trust nothing the client sends

Every input from the browser, every webhook payload, every URL parameter, every cookie, every form body is potentially attacker-controlled. Validate at the server boundary. tRPC's Zod schemas + `sanitizeInput` (`server/_core/security.ts`) are the canonical path. Don't read raw `req.body` outside the Zod-validated entry point.

## 2. Server is the source of truth for value

Token balances, citizenship tier, governance vote weight: these are computed and written server-side, never trusted from the client. The private ledger (`db.creditPrivateTokens`) is the only legitimate write path. See ADR-7 in `DECISIONS.md`.

## 3. Auth surface is small + auditable

Every authenticated procedure goes through tRPC's `protectedProcedure` or `adminProcedure`. The session-cookie verification path is one function: `sdk.authenticateRequest` in `server/_core/sdk.ts`. We don't accept tokens from headers, query strings, or alternative cookies. If you find yourself adding an "API key" path, write an ADR first.

## 4. Webhooks must verify signatures

Every inbound webhook (Resend, Riverside, Alchemy, Hypha) verifies a shared-secret HMAC signature before processing. Failures are rate-limited per-IP via `recordWebhookFailure` in `server/_core/security.ts`. Any new webhook follows the same pattern.

## 5. Secrets live in env, never in code

`JWT_SECRET`, `DATABASE_URL`, OAuth client secrets, webhook secrets, API keys: env vars only. `server/_core/env.ts` validates required ones at startup and `process.exit(1)` if missing in production. Never log a secret.

## 6. Default to deny on infrastructure

CSP `default-src 'self'`. CORS allowlist is explicit, not `*`. Rate limits exist on every public mutation. Cookie attributes default to the most-restrictive workable: `httpOnly`, `secure` (production), `sameSite=lax`, scoped domain.

## 7. Defense in depth

Single-layer defenses break. Token-clearing on logout uses three variants (host-only, `.regencivics.earth`, `regencivics.earth` no-dot). OAuth state validation happens client AND server side. CSP narrows what could exfil + headers narrow what could be embedded. Don't rely on any one layer.

## 8. Audit before declaring done

The ship gate (`STEERING.md` Section 3) is mandatory before claiming VERIFIED on security work. Plus, for security commits specifically, the live verification protocol in `STEERING.md` Section 4 is mandatory: navigate, reproduce, confirm.

## 9. Leak fast, recover fast

If a secret leaks: rotate immediately, no shame. The OPS-PLAYBOOK rotation procedure runs in <30 minutes. Hesitation makes it worse.

## 10. AI inputs are untrusted

User-generated content reaching an LLM (forum posts, video transcripts, profile bios) is potentially adversarial. Treat as input the same way you'd treat raw HTML: sanitize, scope, sandbox. See `AI-AUTOMATION-RISKS.md`.

---

## What this means in practice

| Doing this | Stop and think |
|---|---|
| Adding a new tRPC procedure | Public or protected? What does the input shape constrain? Does it touch tokens? |
| Adding a new env var | Required or optional? Validated at startup? In `.env.example`? Logged anywhere? |
| Adding a new webhook | Signature verification? Rate-limit on failure? Idempotency on retry? |
| Reading a cookie | `httpOnly` ok? Spec what (name, path, domain) match. |
| Calling an external API server-side | Whose credentials? Where stored? What's the failure mode? |
| Posting to a forum reply from an automated source | Bot user? Voice rules? Rate-limited? |
| Sending content to Claude / an LLM | Sanitized? User PII? Output written to where? |
| Touching user input in HTML | Through `sanitizeInput` or escaped on render? |

---

## The "won't do" list

These are paths we deliberately won't take, regardless of perceived convenience:

- No SMS auth (introduces telecom-level attack surface; we already have email + Google + Apple).
- No password-based login (we use OAuth + magic link; passwords would just be a hash store + reset flow we don't need).
- No "remember-me" tokens beyond the session cookie's 1-year max age.
- No persistent server-side session store (stateless JWT is the design; see ADR-1).
- No client-side secret storage. localStorage / sessionStorage is for non-sensitive UI state only.
- No third-party tracking pixels in user-authed paths. Analytics is server-side and aggregated.
