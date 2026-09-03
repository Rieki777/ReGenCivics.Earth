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
