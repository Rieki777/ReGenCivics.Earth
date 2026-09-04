/**
 * The ReGen Civics Team identity used for official, non-personal posts.
 *
 * Seed scripts and migration 0121 already provision this user as
 * team@regencivics.earth. Land Project catalog threads belong to this
 * identity, not to the admin who imported or approved the project.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";

export const TEAM_USER_EMAIL = "team@regencivics.earth";
export const TEAM_USER_OPEN_ID = "team@regencivics.earth";
export const TEAM_USER_NAME = "ReGen Civics Team";
export const TEAM_USER_HANDLE = "regen-civics-team";

/** Forum category that holds official land project catalog threads. */
export const LAND_PROJECTS_CATEGORY_SLUG = "land-projects";

/** Public brand mark used when a land project thread has no team avatar. */
export const TEAM_USER_AVATAR = "/brand/regen_logo.svg";

/** Display fields for Land Projects catalog threads. */
export function landProjectTeamAttribution(
  categorySlug: string | null | undefined,
): { authorName: string; authorHandle: string; authorAvatar: string } | null {
  if (categorySlug !== LAND_PROJECTS_CATEGORY_SLUG) return null;
  return {
    authorName: TEAM_USER_NAME,
    authorHandle: TEAM_USER_HANDLE,
    authorAvatar: TEAM_USER_AVATAR,
  };
}

export type TeamUserLike = {
  email?: string | null;
  handle?: string | null;
  openId?: string | null;
  name?: string | null;
};

export function isTeamUser(user: TeamUserLike | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email ?? "").trim().toLowerCase();
  if (email === TEAM_USER_EMAIL) return true;
  if ((user.handle ?? "").trim().toLowerCase() === TEAM_USER_HANDLE) return true;
  if ((user.openId ?? "").trim() === TEAM_USER_OPEN_ID) return true;
  return false;
}

/** schema.org author node: Organization for the team, Person otherwise. */
export function jsonLdAuthor(user: TeamUserLike | null | undefined): {
  "@type": "Organization" | "Person";
  name: string;
} {
  const name = (user?.name ?? "").trim() || (isTeamUser(user) ? TEAM_USER_NAME : "Anonymous");
  return {
    "@type": isTeamUser(user) ? "Organization" : "Person",
    name,
  };
}

async function findTeamUser() {
  const database = await getDb();
  if (!database) return undefined;

  const byEmail = await database
    .select()
    .from(users)
    .where(eq(users.email, TEAM_USER_EMAIL))
    .limit(1);
  if (byEmail[0]) return byEmail[0];

  const byOpenId = await database
    .select()
    .from(users)
    .where(eq(users.openId, TEAM_USER_OPEN_ID))
    .limit(1);
  if (byOpenId[0]) return byOpenId[0];

  const byHandle = await database
    .select()
    .from(users)
    .where(eq(users.handle, TEAM_USER_HANDLE))
    .limit(1);
  return byHandle[0];
}

/**
 * Look up the team user, creating it once if missing. Idempotent.
 * Prefers the existing production row (email team@regencivics.earth).
 */
export async function getOrCreateTeamUserId(): Promise<number | null> {
  const database = await getDb();
  if (!database) return null;

  const existing = await findTeamUser();
  if (existing) return existing.id;

  try {
    await database.insert(users).values({
      openId: TEAM_USER_OPEN_ID,
      name: TEAM_USER_NAME,
      email: TEAM_USER_EMAIL,
      handle: TEAM_USER_HANDLE,
      loginMethod: "system",
      role: "admin",
    });
  } catch {
    // Unique-constraint race, or handle already taken. Retry without handle.
    try {
      await database.insert(users).values({
        openId: TEAM_USER_OPEN_ID,
        name: TEAM_USER_NAME,
        email: TEAM_USER_EMAIL,
        loginMethod: "system",
        role: "admin",
      });
    } catch {
      // Fall through to re-read; another writer likely won.
    }
  }

  const created = await findTeamUser();
  return created?.id ?? null;
}
