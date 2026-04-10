/**
 * Privy server-side integration.
 *
 * Lazy-inits the Privy client so the app boots even without credentials.
 * Used by context.ts for dual-auth (Privy Bearer token + legacy JWT cookie).
 */
import { PrivyClient } from "@privy-io/server-auth";
import { ENV } from "./env";

let privyClient: PrivyClient | null = null;

/** Lazy-init so the app boots even without Privy credentials. */
export function getPrivyClient(): PrivyClient | null {
  if (privyClient) return privyClient;
  if (!ENV.privyAppId || !ENV.privyAppSecret) return null;
  privyClient = new PrivyClient(ENV.privyAppId, ENV.privyAppSecret);
  return privyClient;
}

export type PrivyAuthResult = {
  privyDid: string;
};

/**
 * Verify a Privy access token from the Authorization header.
 * Returns the decoded DID or null if invalid/missing.
 */
export async function verifyPrivyToken(
  authHeader: string | undefined
): Promise<PrivyAuthResult | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = getPrivyClient();
  if (!client) return null;

  try {
    const claims = await client.verifyAuthToken(token);
    return { privyDid: claims.userId };
  } catch (err) {
    console.warn("[Privy] Token verification failed:", String(err));
    return null;
  }
}

/**
 * Fetch full Privy user profile (linked accounts, wallets, email).
 * Used during first-login linking.
 */
export async function getPrivyUser(privyDid: string) {
  const client = getPrivyClient();
  if (!client) return null;
  try {
    return await client.getUser(privyDid);
  } catch (err) {
    console.warn("[Privy] Failed to fetch user:", String(err));
    return null;
  }
}
