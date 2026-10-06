/**
 * Join a week-board browser to a person without storing the raw key.
 *
 * The key is a bearer credential. Admin tags keep the first 32 hex characters
 * of sha256(identity), where identity is "k:<key>" or "u:<id>".
 */

export const BOARD_KEY_TAG_PREFIX = "board-key:";

export async function identityKeyHash(identity: string): Promise<string> {
  const data = new TextEncoder().encode(identity);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** contact_tags value for one identity. */
export async function boardKeyTagFor(identity: string): Promise<string> {
  const hex = await identityKeyHash(identity);
  return `${BOARD_KEY_TAG_PREFIX}${hex.slice(0, 32)}`;
}

/** The 32-hex body of a board-key tag, or null. */
export function parseBoardKeyTag(tag: string | null | undefined): string | null {
  if (typeof tag !== "string") return null;
  const match = /^board-key:([0-9a-f]{32})$/.exec(tag.trim());
  return match ? match[1] : null;
}

export function isBoardKeyTag(tag: string | null | undefined): boolean {
  return parseBoardKeyTag(tag) != null;
}

/** "Guest 3f9a2c". Six hex characters, never the raw key. */
export function guestLabel(hashHex: string): string {
  return `Guest ${hashHex.slice(0, 6)}`;
}
