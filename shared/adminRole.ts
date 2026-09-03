/**
 * Who may open /admin.
 *
 * The real lock is users.role (admin | superadmin) on the server
 * (adminProcedure). The client mirrors that check. A shared password
 * in localStorage is not a lock.
 *
 * Founder emails are promoted to admin on OAuth / magic-link upsert
 * so the first Google login as rieki.cordon@gmail.com is enough.
 */

export const FOUNDER_ADMIN_EMAILS = ["rieki.cordon@gmail.com"] as const;

export type AdminCapableRole = "admin" | "superadmin";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function emailGrantsAdmin(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return (FOUNDER_ADMIN_EMAILS as readonly string[]).includes(normalized);
}

/**
 * Whether a sign-in upsert should write role=admin.
 * Superadmin and admin are left alone. A payload role is never trusted here.
 */
export function shouldWriteAdminOnUpsert(args: {
  existingRole?: string | null;
  email?: string | null;
  openId?: string | null;
  ownerOpenId?: string | null;
}): boolean {
  if (isAdminRole(args.existingRole)) return false;
  const ownerHit = Boolean(args.openId && args.ownerOpenId && args.openId === args.ownerOpenId);
  return ownerHit || emailGrantsAdmin(args.email);
}
