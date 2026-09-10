/**
 * Broadcast compose channels. Shared so the admin composer, char counters,
 * and Harvest-aware drafting agree on ids, labels, and length caps.
 *
 * Posting still sends one body to every selected Buffer profile; the caps
 * here are for drafting and the compose counter, not a claim that Buffer
 * will enforce them.
 */
export const BROADCAST_CHANNEL_IDS = [
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "bluesky",
  "farcaster",
] as const;

export type BroadcastChannelId = (typeof BROADCAST_CHANNEL_IDS)[number];

export const BROADCAST_CHANNELS: ReadonlyArray<{
  id: BroadcastChannelId;
  label: string;
  maxChars: number;
}> = [
  { id: "twitter", label: "X / Twitter", maxChars: 280 },
  { id: "linkedin", label: "LinkedIn", maxChars: 3000 },
  { id: "facebook", label: "Facebook", maxChars: 2000 },
  { id: "instagram", label: "Instagram", maxChars: 2200 },
  { id: "bluesky", label: "Bluesky", maxChars: 300 },
  { id: "farcaster", label: "Farcaster", maxChars: 320 },
];

export function broadcastChannelById(id: string) {
  return BROADCAST_CHANNELS.find((c) => c.id === id);
}

/** Tightest selected-channel cap. Empty selection keeps the historical 280. */
export function strictestBroadcastLimit(channelIds: string[]): number {
  const limits = channelIds
    .map((id) => broadcastChannelById(id)?.maxChars)
    .filter((n): n is number => typeof n === "number");
  return limits.length > 0 ? Math.min(...limits) : 280;
}

export function isBroadcastChannelId(id: string): id is BroadcastChannelId {
  return (BROADCAST_CHANNEL_IDS as readonly string[]).includes(id);
}

/** Assistant "Use this in Broadcast" action fills the compose box. */
export const BROADCAST_FILL_EVENT = "admin-broadcast-fill";
