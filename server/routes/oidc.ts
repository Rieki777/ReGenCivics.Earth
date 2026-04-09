/**
 * Minimal OIDC provider for shared auth between regencivics.earth and Loomio
 * at gov.regencivics.earth.
 *
 * Endpoints:
 *   GET  /api/auth/oidc/.well-known/openid-configuration   discovery doc
 *   GET  /api/auth/oidc/jwks                               JSON Web Key Set
 *   GET  /api/auth/oidc/authorize                          reads session, returns code
 *   POST /api/auth/oidc/token                              exchanges code for id_token
 *   GET  /api/auth/oidc/userinfo                           returns regencivics claims block
 *
 * Spec: FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md sections "Shared auth" + 1004.
 *
 * RS256 signing key is loaded from OIDC_PRIVATE_KEY_JWK env var. If unset on
 * boot in development, a fresh key pair is generated and logged so the dev can
 * paste it into .env.local.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { generateKeyPair, exportJWK, importJWK, SignJWT, jwtVerify, type JWK } from "jose";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { users, playerProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const ISSUER = process.env.OIDC_ISSUER ?? "https://regencivics.earth";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "rc_session";
const CLIENT_ID = process.env.OIDC_LOOMIO_CLIENT_ID ?? "loomio-gov";
const CLIENT_SECRET = process.env.OIDC_LOOMIO_CLIENT_SECRET ?? "";
const REDIRECT_URIS = (process.env.OIDC_LOOMIO_REDIRECT_URIS ?? "https://gov.regencivics.earth/auth/oidc/callback").split(",").map((s) => s.trim());

// In-memory authorization-code store. Codes are single-use, expire in 60s.
// Production should move this to Redis if multi-instance, but Loomio is the
// only consumer and a single Node process is fine for the volume.
interface AuthCode {
  userId: number;
  clientId: string;
  redirectUri: string;
  nonce?: string;
  scope: string;
  expiresAt: number;
}
const authCodes = new Map<string, AuthCode>();

// Lazy-loaded RS256 signing key. Generated on first request if not in env.
let signingKeyPromise: Promise<{ privateJwk: JWK; publicJwk: JWK; kid: string }> | null = null;

async function getSigningKey() {
  if (signingKeyPromise) return signingKeyPromise;
  signingKeyPromise = (async () => {
    const env = process.env.OIDC_PRIVATE_KEY_JWK;
    if (env) {
      try {
        const privateJwk = JSON.parse(env) as JWK;
        const kid = privateJwk.kid ?? "rc-oidc-key-1";
        // Build the public counterpart by stripping the private fields
        const publicJwk: JWK = {
          kty: privateJwk.kty,
          n: privateJwk.n,
          e: privateJwk.e,
          alg: privateJwk.alg ?? "RS256",
          use: "sig",
          kid,
        };
        return { privateJwk, publicJwk, kid };
      } catch (err) {
        console.error("[oidc] OIDC_PRIVATE_KEY_JWK parse failed, generating ephemeral key:", err);
      }
    }
    // Generate a fresh key pair (dev / first run)
    const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
    const publicJwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig", kid: "rc-oidc-key-1" } as JWK;
    const privateJwk = { ...(await exportJWK(privateKey)), alg: "RS256", use: "sig", kid: "rc-oidc-key-1" } as JWK;
    if (process.env.NODE_ENV !== "production") {
      console.log("[oidc] Generated ephemeral RS256 key. Add to .env to persist:");
      console.log("OIDC_PRIVATE_KEY_JWK=" + JSON.stringify(privateJwk));
    }
    return { privateJwk, publicJwk, kid: "rc-oidc-key-1" };
  })();
  return signingKeyPromise;
}

function genCode(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function pruneExpiredCodes() {
  const now = Date.now();
  for (const [k, v] of authCodes.entries()) {
    if (v.expiresAt < now) authCodes.delete(k);
  }
}

async function getUserClaims(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userRows.length === 0) return null;
  const user = userRows[0] as any;
  const profileRows = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  const profile = profileRows[0] ?? null;

  let bioregions: string[] = [];
  try {
    if (user.bioregions) {
      bioregions = typeof user.bioregions === "string" ? JSON.parse(user.bioregions) : (Array.isArray(user.bioregions) ? user.bioregions : []);
    }
  } catch { /* ignore */ }

  return {
    sub: `rc_user_${user.id}`,
    name: profile?.displayName ?? user.name ?? "",
    email: user.email ?? "",
    email_verified: !!user.email,
    picture: profile?.avatarUrl ?? null,
    preferred_username: user.handle ?? null,
    regencivics: {
      userId: user.id,
      handle: user.handle ?? null,
      citizenshipTier: profile?.citizenshipTier ?? "explorer",
      rcVoiceWeight: user.rcVoiceWeight ?? 1,
      rgVoiceWeight: user.rgVoiceWeight ?? 1,
      bioregions,
      roles: [user.role],
      isBanned: false,
      availableAsStoryteller: !!user.availableAsStoryteller,
    },
  };
}

export function registerOidcRoutes(app: Express) {
  // ─── Discovery ────────────────────────────────────────────────────────────
  app.get("/api/auth/oidc/.well-known/openid-configuration", (_req, res) => {
    res.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/api/auth/oidc/authorize`,
      token_endpoint: `${ISSUER}/api/auth/oidc/token`,
      userinfo_endpoint: `${ISSUER}/api/auth/oidc/userinfo`,
      jwks_uri: `${ISSUER}/api/auth/oidc/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      claims_supported: [
        "sub",
        "name",
        "email",
        "email_verified",
        "picture",
        "preferred_username",
        "regencivics",
      ],
    });
  });

  // ─── JWKS ─────────────────────────────────────────────────────────────────
  app.get("/api/auth/oidc/jwks", async (_req, res) => {
    const { publicJwk } = await getSigningKey();
    res.json({ keys: [publicJwk] });
  });

  // ─── Authorize: read session, mint a code, redirect with ?code= ──────────
  app.get("/api/auth/oidc/authorize", async (req: Request, res: Response) => {
    try {
      const { client_id, redirect_uri, response_type, scope, state, nonce } = req.query as Record<string, string>;

      if (response_type !== "code") {
        return res.status(400).json({ error: "unsupported_response_type" });
      }
      if (client_id !== CLIENT_ID) {
        return res.status(400).json({ error: "unauthorized_client", description: "Unknown client_id" });
      }
      if (!redirect_uri || !REDIRECT_URIS.includes(redirect_uri)) {
        return res.status(400).json({ error: "invalid_redirect_uri" });
      }

      // Read session cookie
      const cookieHeader = req.headers.cookie ?? "";
      const cookieValue = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE_NAME + "="))?.slice(COOKIE_NAME.length + 1);
      if (!cookieValue) {
        // No session: bounce to login. The site's existing OAuth handles login.
        const returnTo = encodeURIComponent(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
        return res.redirect(`/login?returnTo=${returnTo}`);
      }
      const session = await sdk.verifySession(decodeURIComponent(cookieValue));
      if (!session) {
        const returnTo = encodeURIComponent(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
        return res.redirect(`/login?returnTo=${returnTo}`);
      }

      // Resolve user ID
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "server_error" });
      const userRows = await db.select().from(users).where(eq(users.openId, session.openId)).limit(1);
      if (userRows.length === 0) return res.status(401).json({ error: "user_not_found" });
      const userId = userRows[0].id;

      pruneExpiredCodes();
      const code = genCode();
      authCodes.set(code, {
        userId,
        clientId: client_id,
        redirectUri: redirect_uri,
        nonce,
        scope: scope ?? "openid",
        expiresAt: Date.now() + 60_000,
      });

      const url = new URL(redirect_uri);
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);
      return res.redirect(url.toString());
    } catch (err: any) {
      console.error("[oidc] authorize error", err);
      return res.status(500).json({ error: "server_error", description: err.message });
    }
  });

  // ─── Token: exchange the code for an id_token + access_token ─────────────
  app.post("/api/auth/oidc/token", async (req: Request, res: Response) => {
    try {
      const { grant_type, code, redirect_uri, client_id, client_secret } = (req.body ?? {}) as Record<string, string>;

      if (grant_type !== "authorization_code") {
        return res.status(400).json({ error: "unsupported_grant_type" });
      }

      // Client auth: prefer Authorization header, fall back to body
      let providedSecret = client_secret;
      let providedClientId = client_id;
      const authHeader = req.header("authorization");
      if (authHeader?.startsWith("Basic ")) {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
        const [u, p] = decoded.split(":");
        providedClientId = u;
        providedSecret = p;
      }
      if (providedClientId !== CLIENT_ID || providedSecret !== CLIENT_SECRET || !CLIENT_SECRET) {
        return res.status(401).json({ error: "invalid_client" });
      }

      const stored = code ? authCodes.get(code) : undefined;
      if (!stored) return res.status(400).json({ error: "invalid_grant", description: "Code not found or expired" });
      if (stored.expiresAt < Date.now()) {
        authCodes.delete(code);
        return res.status(400).json({ error: "invalid_grant", description: "Code expired" });
      }
      if (stored.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: "invalid_grant", description: "redirect_uri mismatch" });
      }
      authCodes.delete(code); // single-use

      const claims = await getUserClaims(stored.userId);
      if (!claims) return res.status(400).json({ error: "invalid_grant", description: "User not found" });

      const { privateJwk, kid } = await getSigningKey();
      const privateKey = await importJWK(privateJwk, "RS256");
      const now = Math.floor(Date.now() / 1000);

      const idToken = await new SignJWT({
        ...claims,
        nonce: stored.nonce,
      } as any)
        .setProtectedHeader({ alg: "RS256", kid })
        .setIssuer(ISSUER)
        .setAudience(CLIENT_ID)
        .setSubject(claims.sub)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

      // Access token: short-lived JWT for /userinfo. We use the same key, scope claims down.
      const accessToken = await new SignJWT({ sub: claims.sub, scope: stored.scope } as any)
        .setProtectedHeader({ alg: "RS256", kid })
        .setIssuer(ISSUER)
        .setAudience(CLIENT_ID)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

      return res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        id_token: idToken,
        scope: stored.scope,
      });
    } catch (err: any) {
      console.error("[oidc] token error", err);
      return res.status(500).json({ error: "server_error", description: err.message });
    }
  });

  // ─── UserInfo: verify access token, return claims ────────────────────────
  app.get("/api/auth/oidc/userinfo", async (req: Request, res: Response) => {
    try {
      const auth = req.header("authorization");
      if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "invalid_token" });
      const token = auth.slice(7);

      const { publicJwk } = await getSigningKey();
      const publicKey = await importJWK(publicJwk, "RS256");
      const { payload } = await jwtVerify(token, publicKey, { issuer: ISSUER, audience: CLIENT_ID });
      const sub = payload.sub as string;
      const userIdMatch = sub.match(/^rc_user_(\d+)$/);
      if (!userIdMatch) return res.status(401).json({ error: "invalid_token" });
      const userId = parseInt(userIdMatch[1], 10);

      const claims = await getUserClaims(userId);
      if (!claims) return res.status(404).json({ error: "user_not_found" });
      return res.json(claims);
    } catch (err: any) {
      console.warn("[oidc] userinfo failed", err.message);
      return res.status(401).json({ error: "invalid_token", description: err.message });
    }
  });
}
