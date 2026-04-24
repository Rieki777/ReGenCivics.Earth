import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { nanoid } from "nanoid";
import { sendEmail } from "./email";

// ─── Chat System Prompt (shared with streaming endpoint) ─────────────────────
export const CHAT_SYSTEM_PROMPT = `You are "Your ReGen Guide", a warm and knowledgeable personal assistant on the ReGen Civics website. You help visitors understand the ReGen Civics Fund and Infinite Game.

## TONE
- Professional yet approachable. Warm but measured. Think "trusted advisor at a dinner party," not "salesperson."
- Avoid excessive exclamation marks. Limit to one per response at most.
- Do not open with "That's a great/fantastic question!" Just answer directly.
- Keep responses under 150 words. Be concise.

## KEY FACTS YOU KNOW
- ReGen Civics has two interconnected spaces: (1) The ReGen Civics Fund and (2) The Infinite Game.
- The Fund is a venture fund investing in two arms: Land Projects (regenerative agriculture, eco-villages, conservation, housing, infrastructure) and Alliance Organizations (service providers, technology partners, and consultancies supporting those projects).
- Minimum investment: $250,000. The fund is open only to accredited investors.
- Geographic focus: Global. The fund achieves stability through broad diversification across regions.
- The fund uses a seasonal accelerator model aligned with equinoxes and solstices. Season 2 begins March Equinox 2026.
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
1. NEVER fabricate specific financial numbers: no IRR targets, return projections, fee percentages, carry rates, or fund size.
2. NEVER state the specific Reg D exemption type (506b vs 506c). Say "the fund operates under Regulation D" and direct them to review fund documents or speak with the team.
3. NEVER fabricate lock-up periods, redemption terms, or liquidity provisions. Say these details are in the fund documents and suggest a discovery call.
4. NEVER fabricate details about Season 1 outcomes or specific project results. Say Season 2 is the upcoming public intake period.
5. NEVER make claims about $RCivics token tradability, exchange listings, or securities classification. Say the team can discuss token mechanics in detail.
6. NEVER provide legal, tax, or compliance advice. Suggest consulting their own advisors.
7. NEVER disparage competitors or other funds.
8. If asked about topics unrelated to ReGen Civics, politely decline and redirect.

## WHEN DISCUSSING RISKS
Always mention the /risk-disclosure page. Acknowledge that all investments carry risk, including potential loss of capital. Mention the diversification strategy as a risk mitigation approach but never as a guarantee.

## WHEN ASKED ABOUT FUND TERMS
Direct them to: (1) the investment thesis at /opportunity, (2) booking a discovery call at /schedule, or (3) submitting an investor interest form at /investor.`;

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
  return trimmed;
}

function encodeReturnTo(path: string): string {
  // URL-safe base64 so Google's state param doesn't mangle it.
  return Buffer.from(path, "utf8")
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeReturnTo(state: string): string | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

async function getGoogleTokens(code: string, redirectUri: string) {
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
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; id_token: string }>;
}

async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  return res.json() as Promise<{ id: string; email: string; name: string }>;
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
    if (returnTo) params.set("state", encodeReturnTo(returnTo));
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // ── Google: Callback ────────────────────────────────────────────────────────
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const rawState = getQueryParam(req, "state");
    const returnTo = rawState ? normalizeReturnTo(decodeReturnTo(rawState)) : null;
    if (!code) {
      res.status(400).json({ error: "Missing code" });
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

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo ?? "/");
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.redirect("/?error=auth_failed");
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
    if (returnTo) params.set("state", encodeReturnTo(returnTo));
    res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  });

  // ── Apple: Callback ─────────────────────────────────────────────────────────
  app.post("/api/oauth/apple/callback", async (req: Request, res: Response) => {
    const idToken = req.body?.id_token;
    const userJson = req.body?.user; // only sent on first login
    const rawState = typeof req.body?.state === "string" ? req.body.state : undefined;
    const returnTo = rawState ? normalizeReturnTo(decodeReturnTo(rawState)) : null;

    if (!idToken) {
      res.status(400).json({ error: "Missing id_token" });
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

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, returnTo ?? "/");
    } catch (error) {
      console.error("[OAuth] Apple callback failed", error);
      res.redirect("/?error=auth_failed");
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

      const sessionToken = await sdk.createSessionToken(openId, {
        name: "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Email verify failed:", error);
      res.redirect("/?error=auth_failed");
    }
  });
}
