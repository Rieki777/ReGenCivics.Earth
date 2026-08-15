/**
 * Public projections: what an anonymous caller is allowed to see.
 *
 * Several tables in this schema keep member PII in the same row as the
 * content a public page renders: `player_profiles` carries email and wallet
 * next to the avatar, `events` carries the check-in token next to the title,
 * `local_food_applications` carries a contact email next to the producer
 * name. A `publicProcedure` that returns a whole row therefore publishes all
 * of it, and the leak is invisible in review because the resolver looks like
 * one honest line.
 *
 * The rule this module encodes: a public read names its fields.
 *
 * `pickPublic` builds the response by PICKING from an allowlist rather than
 * deleting from the row. That direction matters. A delete-list silently
 * reopens the hole the day someone adds a column; a pick-list keeps the new
 * column private until a human adds its name on purpose. It also leaves
 * private keys ABSENT rather than null, so a scraper cannot even confirm the
 * field exists, and `Object.keys()` becomes a thing tests can assert on.
 *
 * Where the underlying query is raw SQL, prefer narrowing the SELECT itself
 * so the private column never leaves the database. Use `pickPublic` for
 * Drizzle rows and for shapes that are already in memory.
 */
import type { TrpcContext } from "../_core/context";

type SessionUser = TrpcContext["user"] | undefined;

/** Copy exactly the allowlisted fields out of a row. */
export function pickPublic<T extends object, K extends readonly (keyof T)[]>(
  row: T,
  fields: K,
): Pick<T, K[number]> {
  const out: Partial<Record<keyof T, unknown>> = {};
  for (const field of fields) out[field] = row[field];
  return out as Pick<T, K[number]>;
}

/** `pickPublic` over a list. */
export function pickPublicList<T extends object, K extends readonly (keyof T)[]>(
  rows: T[],
  fields: K,
): Array<Pick<T, K[number]>> {
  return rows.map((row) => pickPublic(row, fields));
}

/** Admins and superadmins. The hub has no other elevated role for reads. */
export function isAdminUser(user: SessionUser): boolean {
  return !!user && (user.role === "admin" || user.role === "superadmin");
}

/**
 * Who gets the unredacted row: the record's own owner, and admins. Uses the
 * existing session context; this is not a new permission system.
 */
export function canSeeFullRecord(user: SessionUser, ownerUserId: number | null | undefined): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return ownerUserId != null && user.id === ownerUserId;
}
