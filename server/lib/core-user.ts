/**
 * Forum identity for automated posts from the recording pipeline and event threads.
 * People keep their own name. AI Elders keep theirs. This account is the system.
 */
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

export const CORE_USER_EMAIL = "core@regencivics.earth";
export const CORE_USER_OPEN_ID = "core@regencivics.earth";
export const CORE_USER_NAME = "ReGen Civics Core";
export const CORE_USER_HANDLE = "regen-civics-core";

export type CoreUserLike = {
  email?: string | null;
  handle?: string | null;
  openId?: string | null;
  name?: string | null;
};

export function isCoreUser(user: CoreUserLike | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email ?? "").trim().toLowerCase();
  if (email === CORE_USER_EMAIL) return true;
  if ((user.handle ?? "").trim().toLowerCase() === CORE_USER_HANDLE) return true;
  if ((user.openId ?? "").trim() === CORE_USER_OPEN_ID) return true;
  if ((user.name ?? "").trim() === CORE_USER_NAME) return true;
  return false;
}

async function findCoreUser() {
  const database = await getDb();
  if (!database) return undefined;

  const byEmail = await database
    .select()
    .from(users)
    .where(eq(users.email, CORE_USER_EMAIL))
    .limit(1);
  if (byEmail[0]) return byEmail[0];

  const byOpenId = await database
    .select()
    .from(users)
    .where(eq(users.openId, CORE_USER_OPEN_ID))
    .limit(1);
  if (byOpenId[0]) return byOpenId[0];

  const byHandle = await database
    .select()
    .from(users)
    .where(eq(users.handle, CORE_USER_HANDLE))
    .limit(1);
  return byHandle[0];
}

/**
 * Look up ReGen Civics Core, creating the row once if it is missing.
 * Idempotent. The first automated post is what creates it.
 */
export async function getOrCreateCoreUserId(): Promise<number | null> {
  const database = await getDb();
  if (!database) return null;

  const existing = await findCoreUser();
  if (existing) return existing.id;

  try {
    await database.insert(users).values({
      openId: CORE_USER_OPEN_ID,
      name: CORE_USER_NAME,
      email: CORE_USER_EMAIL,
      handle: CORE_USER_HANDLE,
      loginMethod: "system",
      role: "user",
    });
  } catch {
    try {
      await database.insert(users).values({
        openId: CORE_USER_OPEN_ID,
        name: CORE_USER_NAME,
        email: CORE_USER_EMAIL,
        loginMethod: "system",
        role: "user",
      });
    } catch {
      // Unique-constraint race. Another writer likely won.
    }
  }

  const created = await findCoreUser();
  return created?.id ?? null;
}
