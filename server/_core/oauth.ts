import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { FUND } from "@shared/fund";
import type { Express, Request, Response } from "express";
import crypto from "node:crypto";
import * as db from "../db";
import { getSessionCookieOptions, clearAllSessionCookies } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { nanoid } from "nanoid";
import { sendEmail } from "./email";
import { linkPendingMembersByEmail } from "../routes/roleHolders";

/**
 * Fire-and-forget: link any crowdpool contributions someone made anonymously
 * under this email to their freshly signed-in account, and back-create the
 * delivered ones onto their Living Tree. Best-effort and non-blocking, so it
 * never delays the login redirect. Idempotent, so running it on every login is
 * safe. Dynamically imports the campaigns router to avoid an init-order cycle.
 */
function linkContributionsBestEffort(openId: string, email: string | null | undefined): void {
  if (!email) return;
  void (async () => {
    try {
      const database = await db.getDb();
      const user = await db.getUserByOpenId(openId);
      if (!database || !user?.id) return;
      const { linkAnonymousContributions } = await import("../routes/campaigns");
      await linkAnonymousContributions(database, user.id, email);
    } catch (e) {
      console.error("[Auth] contribution link failed:", e);
    }
  })();
}

// ─── Chat System Prompt (shared with streaming endpoint) ─────────────────────
export const CHAT_SYSTEM_PROMPT = `You are "Your ReGen Guide", a warm and knowledgeable personal assistant on the ReGen Civics website. You help visitors understand the ReGen Civics Fund and Infinite Game.

## TONE
- Professional yet approachable. Warm but measured. Think "trusted advisor at a dinner party," not "salesperson."
- Avoid excessive exclamation marks. Limit to one per response at most.
- Do not open with "That's a great/fantastic question!" Just answer directly.
- Keep responses under 150 words. Be concise.

## KEY FACTS YOU KNOW
- ReGen Civics has two interconnected spaces: (1) The ${FUND.name} and (2) The Infinite Game.
- FUND STATUS, say this before any other fund fact: ${FUND.statement}
- ${FUND.entities}
- The Fund is being formed to invest in two arms: Land Projects (regenerative agriculture, eco-villages, conservation, housing, infrastructure) and Alliance Organizations (service providers, technology partners, and consultancies supporting those projects).
- ${FUND.eligibility} The proposed minimum is $250,000. "Proposed" is not a hedge: the terms are settled by the founding investors at the founding event, not decided yet.
- Geographic focus: Global. The fund is designed to achieve stability through broad diversification across regions.
- ${FUND.foundingEvent}
- The fund uses a seasonal accelerator model aligned with equinoxes and solstices.
- Alliance partners contribute equity, services, and technology in exchange for $RCivics tokens through a Value Exchange Model.
- The Infinite Game is an open game anyone can play, featuring quests focused on personal health, community building, and ecological restoration.
- Four paths to participate: Investors (Fund), Land Projects, Alliance Partners, and Players (Game).
- Non-accredited investors cannot invest in the fund but can participate as Players in the Infinite Game.

## SITE PAGES YOU CAN REFERENCE
- /opportunity - Full investment thesis, fund snapshot, strategy, risk overview
- /risk-disclosure - Comprehensive risk disclosure (27 risk categories)
- /fund - Fund overview and investor journey
- /schedule - Book a discovery call or join an open session
- /investor - Submit an investor interest form
- /loi - Sign a Letter of Intent
- /apply - Apply as a land project or alliance partner
- /team - Meet the team
- /play - Learn about the Infinite Game
- /land - Learn about the land project path
- /ally - Learn about the alliance partner path
- /seasons - Learn about the seasonal accelerator model

## STRICT GUARDRAILS - NEVER DO THESE
1. NEVER state specific financial numbers: no IRR targets, return projections, fee percentages, carry rates, minimums, or fund size. The page carries them, labelled as proposals. Point there. Never repeat a target as though it were a result, and never present a proposed term as an agreed one.
2. NEVER name a securities exemption, and never say the fund operates under one. No exemption has been chosen. The offering structure is settled at the founding event with counsel. If asked, say exactly that. "We intend to rely on 506(c)" is the same claim in a softer voice, so do not say that either. The only thing you may say about the offering is: "${FUND.offeringDisclaimer}"
3. NEVER fabricate lock-up periods, redemption terms, or liquidity provisions. Say these details are in the fund documents and suggest a discovery call.
4. NEVER fabricate details about Season 1 outcomes, project results, portfolio holdings, or how many Letters of Intent have been signed. The fund has made no investments, because it does not exist yet. Say Season 2 is the upcoming public intake period, without a date: the dates on the site disagree with each other and none of them is confirmed here.
5. NEVER make claims about $RCivics token tradability, exchange listings, or securities classification. Say the team can discuss token mechanics in detail.
6. NEVER provide legal, tax, or compliance advice. Suggest consulting their own advisors.
7. NEVER disparage competitors or other funds.
8. If asked about topics unrelated to ReGen Civics, politely decline and redirect.

## WHEN DISCUSSING RISKS
Always mention the /risk-disclosure page. Acknowledge that all investments carry risk, including potential loss of capital. Mention the diversification strategy as a risk mitigation approach but never as a guarantee.

## WHEN ASKED ABOUT FUND TERMS
Lead with the status: the fund is in formation and the terms are a proposal, not an offer. Then direct them to: (1) the investment thesis at /opportunity, (2) booking a discovery call at /schedule, or (3) submitting an investor interest form at /investor. A Letter of Intent is non-binding and carries no obligation.`;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Only accept same-origin relative paths as return targets. Everything else
 * (absolute URLs, protocol-relative URLs, schemes) is dropped silently so a
 * malicious state param can't redirect the player off-site after login.
 */
function normalizeReturnTo(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null; // protocol-relative
  if (trimmed.startsWith("/\\")) return null; // some browsers normalize to protocol-relative
  if (/[\r\n\t]/.test(trimmed)) return null;
  // Defense against the OAuth state error-recycle loop: a returnTo that
  // contains `error=auth_failed` (or similar) usually means the user clicked
  // Sign In while sitting on an error page from a previous failed attempt.
  // Honoring it would bounce them BACK to the error page after OAuth
  // succeeds, making the new login look broken. Drop these and fall through
  // to the post-OAuth default ("/"). Client also strips this in
  // resolveReturnTo, but we belt-and-suspender it here for safety.
  if (/[?&](error|auth_failed)=/i.test(trimmed)) return null;
  return trimmed;
}

// ─── Signed OAuth state (login-CSRF binding) ─────────────────────────────────
//
// The OAuth `state` param used to be a bare base64url encoding of returnTo:
// unsigned, so it carried no anti-forgery guarantee (see
// .ai/docs/security/OWASP-TOP10.md A01). We now HMAC-sign the state with
// JWT_SECRET (ENV.cookieSecret) so an attacker cannot forge a valid state or
// tamper with the embedded returnTo, and we stamp an issued-at time so an old
// captured state cannot be replayed past STATE_TTL_MS. Every login callback
// (Google, Apple) and the GitHub link callback rejects any state that fails
// the signature or freshness check.
//
// Scope note: HMAC signing makes state unforgeable and non-replayable. Fully
// binding the round-trip to the initiating browser would additionally require
// a nonce cookie, but Apple's cross-site `form_post` callback does not send a
// SameSite=lax cookie and this codebase deliberately avoids SameSite=none
// (iPhone Safari drops it — see cookies.ts). So HMAC-signed state is the
// correct step here; a cookie-bound nonce for the Google-only GET flow is a
// possible future hardening.
const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Build a signed `state` value. Payload carries the (already-normalized)
 * returnTo, a random nonce, and an issued-at timestamp; the trailing segment
 * is an HMAC-SHA256 over the payload keyed by JWT_SECRET. Always call this
 * when initiating an OAuth redirect, even with no returnTo, so the callback
 * always has an anti-forgery token to verify.
 */
function signState(returnTo: string | null): string {
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        r: returnTo ?? "",
        n: crypto.randomBytes(16).toString("hex"),
        t: Date.now(),
      }),
      "utf8"
    )
  );
  const sig = b64url(crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verify a signed `state`. Returns `{ ok: true, returnTo }` only when the
 * HMAC matches (constant-time compare) AND the state is younger than
 * STATE_TTL_MS. returnTo is re-run through normalizeReturnTo so a forged
 * or off-site path still can't slip through. Any failure returns
 * `{ ok: false }`, which callers treat as a login-CSRF / expired-flow error.
 */
function verifyState(state: string | undefined | null): { ok: boolean; returnTo: string | null } {
  if (!state || typeof state !== "string") return { ok: false, returnTo: null };
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return { ok: false, returnTo: null };
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest());
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, returnTo: null };
  }
  try {
    const data = JSON.parse(b64urlDecode(payload).toString("utf8")) as { r?: string; t?: number };
    if (typeof data.t !== "number" || Date.now() - data.t > STATE_TTL_MS) {
      return { ok: false, returnTo: null };
    }
    return { ok: true, returnTo: normalizeReturnTo(data.r ?? null) };
  } catch {
    return { ok: false, returnTo: null };
  }
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

/**
 * Fetch Google's OAuth token endpoint with a 10s timeout and full error
 * surfacing. On non-2xx we capture Google's response body (typically
 * JSON like `{"error": "invalid_client", "error_description": "..."}`)
 * so Railway logs show exactly what's wrong instead of a bare status code.
 *
 * The most common failure modes seen in production:
 *   - 401 invalid_client : GOOGLE_CLIENT_SECRET on Railway is stale
 *     (rotated in Google Cloud Console without updating Railway), or
 *     has whitespace/newline corruption.
 *   - 401 unauthorized_client : OAuth consent screen not approved for
 *     this client, or grant type not enabled.
 *   - 400 invalid_grant : code already used or expired (>10min stale),
 *     or redirect_uri at /token doesn't match what was used at /auth.
 *   - 400 redirect_uri_mismatch : APP_URL on Railway doesn't match a
 *     registered redirect URI in the Google Cloud Console.
 *
 * See `.ai/docs/security/OPS-PLAYBOOK.md` Procedure 11 for the env-var
 * check + rotation procedure.
 */
async function getGoogleTokens(code: string, redirectUri: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort("timeout"), 10_000);
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Capture the full response body so we know exactly what Google said.
      // Google returns JSON like {"error":"invalid_client","error_description":"..."}.
      // Railway's stdout log parser strips JSON-like substrings, so we replace
      // braces with [[ / ]] and quotes with ` to keep the diagnostic visible.
      const body = await res.text().catch(() => "(unreadable body)");
      const safeBody = body
        .slice(0, 500)
        .replace(/\{/g, "[[")
        .replace(/\}/g, "]]")
        .replace(/"/g, "`");
      throw new Error(
        `Google token exchange failed: status=${res.status} redirectUri=${redirectUri} body=${safeBody}`
      );
    }
    return res.json() as Promise<{ access_token: string; id_token: string }>;
  } finally {
    clearTimeout(timeout);
  }
}

async function getGoogleUserInfo(accessToken: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort("timeout"), 10_000);
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable body)");
      throw new Error(`Google userinfo failed: status=${res.status} body=${body.slice(0, 300)}`);
    }
    return res.json() as Promise<{ id: string; email: string; name: string }>;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Apple OAuth ─────────────────────────────────────────────────────────────

async function getAppleUserInfo(idToken: string) {
  // Verify Apple's JWT signature using their public JWKS
  try {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    });
    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch (err) {
    console.error("[Apple OAuth] JWT verification failed:", err);
    throw new Error("Apple authentication failed: invalid token");
  }
}

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

async function getGithubTokens(code: string, redirectUri: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort("timeout"), 10_000);
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: ENV.githubClientId,
        client_secret: ENV.githubClientSecret,
        redirect_uri: redirectUri,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable body)");
      throw new Error(`GitHub token exchange failed: status=${res.status} body=${body.slice(0, 300)}`);
    }
    const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
    if (data.error || !data.access_token) {
      throw new Error(`GitHub token exchange error: ${data.error} — ${data.error_description}`);
    }
    return data as { access_token: string };
  } finally {
    clearTimeout(timeout);
  }
}

async function getGithubUserInfo(accessToken: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort("timeout"), 10_000);
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable body)");
      throw new Error(`GitHub user info failed: status=${res.status} body=${body.slice(0, 300)}`);
    }
    return res.json() as Promise<{ id: number; login: string; name?: string | null; created_at: string }>;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {

  // ── Google: Initiate login ──────────────────────────────────────────────────
  // Accepts an optional `?returnTo=<relative-path>` query param. The path is
  // passed through Google's `state` parameter so the callback can redirect
  // the player back to where they started. Server-side state is more robust
  // than sessionStorage on iPhone Safari, where Intelligent Tracking
  // Prevention can drop client storage across the OAuth hop.
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/oauth/google/callback`;
    const returnTo = normalizeReturnTo(getQueryParam(req, "returnTo"));
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    // Always attach a signed state so the callback can verify the round-trip,
    // even when there is no returnTo to carry.
    params.set("state", signState(returnTo));
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // ── Google: Callback ────────────────────────────────────────────────────────
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const rawState = getQueryParam(req, "state");
    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }
    // Reject forged/expired state before doing any token work: this is the
    // login-CSRF guard. A valid state proves we minted it within STATE_TTL_MS.
    const { ok: stateOk, returnTo } = verifyState(rawState);
    if (!stateOk) {
      console.warn("[OAuth] Google callback rejected: invalid/expired state");
      res.redirect("/?error=auth_failed&reason=bad_state");
      return;
    }

    try {
      const redirectUri = `${ENV.appUrl}/api/oauth/google/callback`;
      const tokens = await getGoogleTokens(code, redirectUri);
      const userInfo = await getGoogleUserInfo(tokens.access_token);

      const openId = `google:${userInfo.id}`;

      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      linkContributionsBestEffort(openId, userInfo.email ?? null);

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Clear any stale session-cookie variants (host-only, no-leading-dot,
      // sameSite=none from prior deploys) before setting the fresh one. Without
      // this, browsers that accumulated multiple `app_session_id` cookies
      // across deploys send all of them on the next request and the server
      // reads whichever one the browser ordered first, which may not be ours.
      clearAllSessionCookies(req, res);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo ?? "/");
    } catch (error) {
      // Log the full error chain so Railway logs surface what Google said.
      // Common cases (see getGoogleTokens jsdoc): stale GOOGLE_CLIENT_SECRET,
      // redirect_uri mismatch, code already used.
      const message = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Google callback failed:", message);
      // Pass a coarse reason hint to the client so we can show something
      // more useful than a generic error. Client UI doesn't render this
      // today; the URL param is for grep + future UX work.
      const reason = /token exchange failed: status=401/i.test(message)
        ? "google_401"
        : /token exchange failed: status=400/i.test(message)
        ? "google_400"
        : /timeout/i.test(message)
        ? "timeout"
        : "callback_error";
      res.redirect(`/?error=auth_failed&reason=${reason}`);
    }
  });

  // ── Apple: Initiate login ───────────────────────────────────────────────────
  app.get("/api/oauth/apple", (req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/oauth/apple/callback`;
    const returnTo = normalizeReturnTo(getQueryParam(req, "returnTo"));
    const params = new URLSearchParams({
      client_id: ENV.appleClientId,
      redirect_uri: redirectUri,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "name email",
    });
    params.set("state", signState(returnTo));
    res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  });

  // ── Apple: Callback ─────────────────────────────────────────────────────────
  app.post("/api/oauth/apple/callback", async (req: Request, res: Response) => {
    const idToken = req.body?.id_token;
    const userJson = req.body?.user; // only sent on first login
    const rawState = typeof req.body?.state === "string" ? req.body.state : undefined;

    if (!idToken) {
      res.status(400).json({ error: "Missing id_token" });
      return;
    }
    // Login-CSRF guard: reject forged/expired state before verifying the token.
    const { ok: stateOk, returnTo } = verifyState(rawState);
    if (!stateOk) {
      console.warn("[OAuth] Apple callback rejected: invalid/expired state");
      res.redirect("/?error=auth_failed&reason=bad_state");
      return;
    }

    try {
      const appleUser = await getAppleUserInfo(idToken);
      const openId = `apple:${appleUser.id}`;

      // Apple sends name only on the very first login
      let name: string | null = null;
      if (userJson) {
        try {
          const parsed = JSON.parse(userJson);
          const fn = parsed?.name?.firstName ?? "";
          const ln = parsed?.name?.lastName ?? "";
          name = [fn, ln].filter(Boolean).join(" ") || null;
        } catch {}
      }

      await db.upsertUser({
        openId,
        name,
        email: appleUser.email ?? null,
        loginMethod: "apple",
        lastSignedIn: new Date(),
      });

      linkContributionsBestEffort(openId, appleUser.email ?? null);

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // See Google callback above for rationale on the multi-variant clear.
      clearAllSessionCookies(req, res);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo ?? "/");
    } catch (error) {
      console.error("[OAuth] Apple callback failed", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // ── GitHub: Link account (requires existing session; not a login flow) ─────
  // The player clicks "Link GitHub" on their profile. We redirect to GitHub
  // OAuth with a state param encoding the user's session so the callback
  // can identify them. This is NOT a login flow — the player must already
  // be signed in. On success, we write githubHandle + githubId to player_profiles.
  app.get("/api/oauth/github/link", (req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/oauth/github/callback`;
    if (!ENV.githubClientId) {
      // Redirect back to the profile with an error rather than dumping raw JSON,
      // so the player lands where they started with a clear message.
      res.redirect("/profile?tab=tasks&error=github_not_configured");
      return;
    }
    const params = new URLSearchParams({
      client_id: ENV.githubClientId,
      redirect_uri: redirectUri,
      scope: "read:user",
    });
    // Signed state binds this link round-trip so the callback can reject a
    // forged/replayed request even though this flow relies on the session cookie.
    params.set("state", signState(null));
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  // ── GitHub: Callback (account linking only) ─────────────────────────────────
  app.get("/api/oauth/github/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    if (!code) {
      res.redirect("/profile?tab=tasks&error=github_no_code");
      return;
    }
    // Reject forged/expired state before doing any token work.
    const { ok: stateOk } = verifyState(getQueryParam(req, "state"));
    if (!stateOk) {
      res.redirect("/profile?tab=tasks&error=github_bad_state");
      return;
    }
    // Require an existing session — this endpoint only links, not logs in
    const sessionCookie = req.cookies?.[COOKIE_NAME];
    if (!sessionCookie) {
      res.redirect("/profile?tab=tasks&error=github_auth_required");
      return;
    }
    try {
      const redirectUri = `${ENV.appUrl}/api/oauth/github/callback`;
      const tokens = await getGithubTokens(code, redirectUri);
      const ghUser = await getGithubUserInfo(tokens.access_token);
      // Resolve the current logged-in user from the session cookie
      const session = await sdk.verifySession(sessionCookie);
      if (!session?.openId) {
        res.redirect("/profile?tab=tasks&error=github_auth_required");
        return;
      }
      const linked = await db.linkGithubToProfile(session.openId, {
        githubId: ghUser.id,
        githubHandle: ghUser.login,
        githubLinkedAt: new Date(),
      });
      if (!linked) {
        res.redirect("/profile?tab=tasks&error=github_already_linked");
        return;
      }
      res.redirect("/profile?tab=tasks&github=linked");
    } catch (err) {
      console.error("[OAuth] GitHub callback failed:", err);
      // Surface the underlying reason to the player so a failure is diagnosable.
      const reason = err instanceof Error ? err.message.slice(0, 120) : "unknown";
      res.redirect(`/profile?tab=tasks&error=github_failed&reason=${encodeURIComponent(reason)}`);
    }
  });

  // ── Email magic link: Request ───────────────────────────────────────────────
  app.post("/api/auth/email/request", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }

    try {
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await db.createEmailToken({ email: email.toLowerCase().trim(), token, expiresAt });

      const verifyUrl = `${ENV.appUrl}/api/auth/email/verify?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Your ReGen Civics login link",
        html: `
          <h2 style="color:#1a472a;margin-top:0;">Log in to ReGen Civics</h2>
          <p style="color:#333;line-height:1.6;">Click the button below to log in. This link expires in 15 minutes.</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${verifyUrl}" style="display:inline-block;background:#7dd87d;color:#1a472a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Log In to ReGen Civics</a>
          </div>
          <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Email magic link failed:", error);
      res.status(500).json({ error: "Failed to send login email" });
    }
  });

  // ── Email magic link: Verify ────────────────────────────────────────────────
  app.get("/api/auth/email/verify", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    if (!token) {
      res.redirect("/?error=invalid_token");
      return;
    }

    try {
      const emailToken = await db.findAndConsumeEmailToken(token);
      if (!emailToken) {
        res.redirect("/?error=expired_token");
        return;
      }

      const openId = `email:${emailToken.email}`;

      await db.upsertUser({
        openId,
        email: emailToken.email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Link any pending role invites sent to this email to the now-real user.
      try {
        const database = await db.getDb();
        const linkedUser = await db.getUserByOpenId(openId);
        if (database && linkedUser?.id) {
          await linkPendingMembersByEmail(database, linkedUser.id, emailToken.email);
        }
      } catch (e) {
        console.error("[Auth] pending-invite link failed:", e);
      }

      linkContributionsBestEffort(openId, emailToken.email);

      const sessionToken = await sdk.createSessionToken(openId, {
        name: "",
        expiresInMs: ONE_YEAR_MS,
      });

      // See Google callback above for rationale on the multi-variant clear.
      clearAllSessionCookies(req, res);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Email verify failed:", error);
      res.redirect("/?error=auth_failed");
    }
  });
}
