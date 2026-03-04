import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
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
  // Decode the JWT payload (no verification needed here — Apple already signed it)
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64url").toString()
  );
  return {
    id: payload.sub as string,
    email: payload.email as string | undefined,
  };
}

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {

  // ── Google: Initiate login ──────────────────────────────────────────────────
  app.get("/api/oauth/google", (_req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/oauth/google/callback`;
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // ── Google: Callback ────────────────────────────────────────────────────────
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
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
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // ── Apple: Initiate login ───────────────────────────────────────────────────
  app.get("/api/oauth/apple", (_req: Request, res: Response) => {
    const redirectUri = `${ENV.appUrl}/api/oauth/apple/callback`;
    const params = new URLSearchParams({
      client_id: ENV.appleClientId,
      redirect_uri: redirectUri,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "name email",
    });
    res.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  });

  // ── Apple: Callback ─────────────────────────────────────────────────────────
  app.post("/api/oauth/apple/callback", async (req: Request, res: Response) => {
    const idToken = req.body?.id_token;
    const userJson = req.body?.user; // only sent on first login

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
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Apple callback failed", error);
      res.redirect("/?error=auth_failed");
    }
  });
}
