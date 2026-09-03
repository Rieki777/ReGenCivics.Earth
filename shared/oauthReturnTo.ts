/**
 * Same-origin relative paths only. Absolute URLs, protocol-relative
 * URLs, and schemes are dropped so a poisoned returnTo cannot send
 * the player off-site after OAuth.
 */
export function normalizeReturnTo(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/\\")) return null;
  if (/[\r\n\t]/.test(trimmed)) return null;
  if (/[?&](error|auth_failed)=/i.test(trimmed)) return null;
  return trimmed;
}
