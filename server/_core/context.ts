import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyPrivyToken, getPrivyUser } from "./privy";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authMethod: "privy" | "legacy" | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authMethod: "privy" | "legacy" | null = null;

  // 1. Try Privy auth (Authorization: Bearer <privy-access-token>)
  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const privyResult = await verifyPrivyToken(authHeader);
    if (privyResult) {
      // Look up user by privyDid
      const existing = await db.getUserByPrivyDid(privyResult.privyDid);
      if (existing) {
        user = existing as User;
        authMethod = "privy";
      } else {
        // First login via Privy: fetch Privy profile, create/link user
        const privyProfile = await getPrivyUser(privyResult.privyDid);
        if (privyProfile) {
          const linked = await db.linkOrCreatePrivyUser(privyResult.privyDid, privyProfile);
          if (linked) {
            user = linked as User;
            authMethod = "privy";
          }
        }
      }
      if (user) {
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      }
    }
  }

  // 2. Fall back to legacy JWT cookie
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
      if (user) authMethod = "legacy";
    } catch {
      user = null;
    }
  }

  return { req: opts.req, res: opts.res, user, authMethod };
}
