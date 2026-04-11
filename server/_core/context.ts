import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authMethod: "legacy" | null;
};

/**
 * tRPC context creator. Uses JWT cookie auth (Google OAuth, Apple OAuth, Email Magic Links).
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authMethod: "legacy" | null = null;

  // Legacy JWT cookie auth
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) authMethod = "legacy";
  } catch {
    user = null;
  }

  return { req: opts.req, res: opts.res, user, authMethod };
}
