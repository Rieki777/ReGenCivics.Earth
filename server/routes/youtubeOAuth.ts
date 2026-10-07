/**
 * One-time connect for the YouTube channel that owns session recordings.
 * Separate from player sign-in so everyday Google login does not ask for
 * youtube.force-ssl.
 */
import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { isAdminRole } from "@shared/adminRole";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { redactOauthSecrets } from "../../shared/youtubeCaptions";
import { saveYoutubeChannelConnection } from "../lib/youtubeOwnerAuth";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const STATE_TTL_MS = 15 * 60 * 1000;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function youtubeRedirectUri(): string {
  return `${ENV.appUrl}/api/youtube/oauth/callback`;
}

function signConnectState(): string {
  const payload = b64url(Buffer.from(JSON.stringify({
    p: "yt-owner",
    n: crypto.randomBytes(16).toString("hex"),
    t: Date.now(),
  }), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest());
  return `${payload}.${sig}`;
}

function verifyConnectState(state: string | undefined): boolean {
  if (!state || !ENV.cookieSecret) return false;
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = b64url(crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest());
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p?: string; t?: number };
    if (data.p !== "yt-owner") return false;
    if (typeof data.t !== "number" || Date.now() - data.t > STATE_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

async function requesterIsAdmin(req: Request): Promise<boolean> {
  try {
    const user = await sdk.authenticateRequest(req);
    return isAdminRole(user.role);
  } catch {
    return false;
  }
}

function back(reason?: string): string {
  if (!reason) return "/admin?tab=recordings&youtube=connected";
  return `/admin?tab=recordings&youtube=error&reason=${encodeURIComponent(reason)}`;
}

export function registerYoutubeOAuthRoutes(app: Express) {
  app.get("/api/youtube/oauth/start", async (req: Request, res: Response) => {
    if (!(await requesterIsAdmin(req))) {
      res.redirect(302, back("not_admin"));
      return;
    }
    if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.cookieSecret) {
      res.redirect(302, back("missing_client"));
      return;
    }
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: youtubeRedirectUri(),
      response_type: "code",
      scope: YOUTUBE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "false",
      state: signConnectState(),
    });
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/youtube/oauth/callback", async (req: Request, res: Response) => {
    if (!(await requesterIsAdmin(req))) {
      res.redirect(302, back("not_admin"));
      return;
    }
    const googleError = typeof req.query.error === "string" ? req.query.error : "";
    if (googleError === "access_denied") {
      res.redirect(302, back("denied"));
      return;
    }
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !verifyConnectState(state)) {
      res.redirect(302, back("bad_state"));
      return;
    }

    try {
      const tokens = await exchangeCode(code);
      if (!tokens.refreshToken) {
        res.redirect(302, back("no_refresh"));
        return;
      }
      const channel = await fetchOwnedChannel(tokens.accessToken);
      if (!channel) {
        res.redirect(302, back("no_channel"));
        return;
      }
      await saveYoutubeChannelConnection({
        refreshToken: tokens.refreshToken,
        channelId: channel.id,
        channelTitle: channel.title,
      });
      res.redirect(302, back());
    } catch (err) {
      const message = redactOauthSecrets(err instanceof Error ? err.message : "exchange failed");
      console.error("[YouTube OAuth] connect failed:", message);
      res.redirect(302, back("exchange"));
    }
  });
}

async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string | null }> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: youtubeRedirectUri(),
        grant_type: "authorization_code",
      }),
      signal: ctrl.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(redactOauthSecrets(`token exchange HTTP ${res.status} ${body}`).slice(0, 300));
    }
    const parsed = JSON.parse(body) as { access_token?: string; refresh_token?: string };
    if (!parsed.access_token) throw new Error("token exchange returned no access token");
    return { accessToken: parsed.access_token, refreshToken: parsed.refresh_token ?? null };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOwnedChannel(accessToken: string): Promise<{ id: string; title: string } | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(redactOauthSecrets(`channels.list HTTP ${res.status} ${body}`).slice(0, 300));
    }
    const parsed = JSON.parse(body) as {
      items?: Array<{ id?: string; snippet?: { title?: string } }>;
    };
    const item = parsed.items?.[0];
    if (!item?.id) return null;
    return { id: item.id, title: (item.snippet?.title || "YouTube channel").slice(0, 255) };
  } finally {
    clearTimeout(timeout);
  }
}
