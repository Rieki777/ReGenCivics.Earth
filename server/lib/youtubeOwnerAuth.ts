/**
 * Channel-owner YouTube connection. The refresh token stays in
 * youtube_channel_auth as ciphertext. Status reads never return it.
 */
import { eq } from "drizzle-orm";
import { youtubeChannelAuth } from "../../drizzle/schema";
import { openSecret, sealSecret } from "../../shared/secretSeal";
import { redactOauthSecrets } from "../../shared/youtubeCaptions";
import { ENV } from "../_core/env";
import { getDb } from "../db";

const AUTH_ROW_ID = 1;

export type YoutubeConnectionStatus = {
  connected: boolean;
  channelTitle: string | null;
  channelId: string | null;
  migrationPending: boolean;
};

function missingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ER_NO_SUCH_TABLE|doesn't exist|no such table|Unknown column/i.test(msg);
}

export async function youtubeConnectionStatus(): Promise<YoutubeConnectionStatus> {
  const empty: YoutubeConnectionStatus = {
    connected: false,
    channelTitle: null,
    channelId: null,
    migrationPending: false,
  };
  const db = await getDb();
  if (!db) return empty;
  try {
    const [row] = await db
      .select({
        channelId: youtubeChannelAuth.channelId,
        channelTitle: youtubeChannelAuth.channelTitle,
      })
      .from(youtubeChannelAuth)
      .where(eq(youtubeChannelAuth.id, AUTH_ROW_ID))
      .limit(1);
    if (!row) return empty;
    return {
      connected: true,
      channelTitle: row.channelTitle,
      channelId: row.channelId,
      migrationPending: false,
    };
  } catch (err) {
    if (missingTable(err)) return { ...empty, migrationPending: true };
    throw err;
  }
}

export async function saveYoutubeChannelConnection(input: {
  refreshToken: string;
  channelId: string | null;
  channelTitle: string | null;
}): Promise<void> {
  if (!ENV.cookieSecret) throw new Error("server secret is not configured");
  const db = await getDb();
  if (!db) throw new Error("database unavailable");
  const refreshTokenEnc = sealSecret(input.refreshToken, ENV.cookieSecret);
  await db
    .insert(youtubeChannelAuth)
    .values({
      id: AUTH_ROW_ID,
      refreshTokenEnc,
      channelId: input.channelId,
      channelTitle: input.channelTitle?.slice(0, 255) ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        refreshTokenEnc,
        channelId: input.channelId,
        channelTitle: input.channelTitle?.slice(0, 255) ?? null,
      },
    });
  accessCache = null;
}

let accessCache: { token: string; expiresAt: number } | null = null;

async function readRefreshToken(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ refreshTokenEnc: youtubeChannelAuth.refreshTokenEnc })
    .from(youtubeChannelAuth)
    .where(eq(youtubeChannelAuth.id, AUTH_ROW_ID))
    .limit(1);
  if (!row?.refreshTokenEnc || !ENV.cookieSecret) return null;
  return openSecret(row.refreshTokenEnc, ENV.cookieSecret);
}

function googleError(status: number, body: string): string {
  return redactOauthSecrets(`YouTube owner request failed HTTP ${status} ${body}`).slice(0, 300);
}

export async function getYoutubeOwnerAccessToken(forceRefresh = false): Promise<
  | { ok: true; token: string }
  | { ok: false; connected: boolean; error: string }
> {
  if (!forceRefresh && accessCache && accessCache.expiresAt > Date.now() + 30_000) {
    return { ok: true, token: accessCache.token };
  }
  let refreshToken: string | null = null;
  try {
    refreshToken = await readRefreshToken();
  } catch (err) {
    if (missingTable(err)) {
      return { ok: false, connected: false, error: "YouTube channel table is not migrated yet" };
    }
    return { ok: false, connected: true, error: "stored YouTube connection could not be read" };
  }
  if (!refreshToken) return { ok: false, connected: false, error: "YouTube channel is not connected" };
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    return { ok: false, connected: true, error: "Google client is not configured" };
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: ctrl.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, connected: true, error: googleError(res.status, body) };
    }
    let parsed: { access_token?: string; expires_in?: number };
    try {
      parsed = JSON.parse(body) as { access_token?: string; expires_in?: number };
    } catch {
      return { ok: false, connected: true, error: "YouTube token response was not readable" };
    }
    if (!parsed.access_token) {
      return { ok: false, connected: true, error: "YouTube token response had no access token" };
    }
    const expiresIn = Number.isFinite(parsed.expires_in) ? (parsed.expires_in as number) : 3600;
    accessCache = { token: parsed.access_token, expiresAt: Date.now() + expiresIn * 1000 };
    return { ok: true, token: parsed.access_token };
  } catch (err) {
    const message = err instanceof Error ? err.message : "YouTube token refresh failed";
    return { ok: false, connected: true, error: redactOauthSecrets(message).slice(0, 300) };
  } finally {
    clearTimeout(timeout);
  }
}
