/**
 * The badges beside a call time vote (ADR-72): who in the room is an accepted
 * land project, and who is an Alliance Partner. Both votes stay open to
 * everyone; a badge only says who someone is.
 *
 * Worked out when a tally is read, never stored with the vote, so a vote cast
 * before its voter was approved shows the badge as soon as they are.
 */
export type MemberBadge = "land_project" | "alliance_partner";

export const MEMBER_BADGES: readonly MemberBadge[] = ["land_project", "alliance_partner"];

export const MEMBER_BADGE_LABEL: Record<MemberBadge, string> = {
  land_project: "Accepted land project",
  alliance_partner: "Alliance Partner",
};

/** Union in a fixed order, once each. */
export function mergeBadges(...lists: ReadonlyArray<readonly MemberBadge[] | undefined>): MemberBadge[] {
  const seen = new Set<MemberBadge>();
  for (const list of lists) for (const b of list ?? []) seen.add(b);
  return MEMBER_BADGES.filter((b) => seen.has(b));
}

/** Project names compare ignoring case and spacing, the way the Season tally counts projects. */
export function projectNameKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}
