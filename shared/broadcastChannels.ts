/**
 * Broadcast compose channels. Shared so the admin composer, char counters,
 * and Harvest-aware drafting agree on ids, labels, and length caps.
 *
 * Posting sends each selected Buffer profile its own body (per-channel
 * editors or master fallback). Caps here guide drafting and counters;
 * Buffer may still enforce its own limits.
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

/**
 * Social compose lives on Outbound Social. Legacy `?tab=broadcast` still counts
 * so assistant actions and Harvest grounding keep working after the hub merge.
 */
export function isBroadcastComposeSurface(tab?: string, surface?: string): boolean {
  if (tab === "broadcast") return true;
  return tab === "outbound" && surface === "social";
}

/**
 * Deterministic clip so a long LinkedIn draft cannot overflow X.
 * Prefers sentence boundaries, then word boundaries.
 */
export function clipToBroadcastLimit(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
    cut.lastIndexOf("\n"),
  );
  if (lastStop >= Math.floor(maxChars * 0.5)) {
    return cut.slice(0, lastStop + 1).trim();
  }
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * Prefer an explicit per-channel body when non-empty; otherwise the master draft.
 */
export function resolveChannelBody(
  masterText: string,
  channelBodies: Record<string, string>,
  channelId: string,
): string {
  const own = channelBodies[channelId];
  if (typeof own === "string" && own.trim().length > 0) return own;
  return masterText;
}

export type BufferProfileLike = {
  id: string;
  service: string;
};

export type BufferPostTarget = {
  profileId: string;
  channelId: string;
  text: string;
};

const DEFAULT_BUFFER_CHANNEL = (id: string) => id !== "farcaster";

/** All Buffer profiles whose service matches a compose channel id. */
export function profilesForChannel(
  profiles: BufferProfileLike[],
  channelId: string,
): BufferProfileLike[] {
  const needle = channelId.toLowerCase();
  return profiles.filter((p) => p.service.toLowerCase() === needle);
}

/**
 * Map selected compose channels → Buffer profiles with the body that should
 * post to each. Missing profiles are listed separately (caller surfaces errors).
 *
 * When `selectedProfileIds` is provided, only those profiles are used (supports
 * multiple Buffer profiles on one network). When omitted, keeps the historical
 * first-match-per-network behavior for callers that have not opted in.
 */
export function buildBufferPostTargets(opts: {
  selectedChannelIds: string[];
  masterText: string;
  channelBodies: Record<string, string>;
  profiles: BufferProfileLike[];
  selectedProfileIds?: string[];
  isBufferChannel?: (channelId: string) => boolean;
}): { targets: BufferPostTarget[]; missingChannels: string[] } {
  const isBuffer = opts.isBufferChannel ?? DEFAULT_BUFFER_CHANNEL;
  const targets: BufferPostTarget[] = [];
  const missingChannels: string[] = [];
  const allow =
    opts.selectedProfileIds !== undefined
      ? new Set(opts.selectedProfileIds)
      : null;

  for (const channelId of opts.selectedChannelIds) {
    if (!isBuffer(channelId)) continue;
    const matches = profilesForChannel(opts.profiles, channelId);
    let chosen: BufferProfileLike[];
    if (allow) {
      chosen = matches.filter((p) => allow.has(p.id));
    } else if (matches.length > 0) {
      chosen = [matches[0]!];
    } else {
      chosen = [];
    }
    if (chosen.length === 0) {
      missingChannels.push(channelId);
      continue;
    }
    const text = resolveChannelBody(
      opts.masterText,
      opts.channelBodies,
      channelId,
    ).trim();
    for (const profile of chosen) {
      targets.push({ profileId: profile.id, channelId, text });
    }
  }

  return { targets, missingChannels };
}

/**
 * Copy or length-adapt the master draft into each selected channel body.
 * `adapt` clips to that channel's catalog cap; `copy` pastes the master as-is.
 */
export function fillChannelBodiesFromMaster(
  masterText: string,
  channelIds: string[],
  mode: "copy" | "adapt",
): Record<string, string> {
  const out: Record<string, string> = {};
  const master = masterText.trim();
  for (const id of channelIds) {
    const max = broadcastChannelById(id)?.maxChars ?? 280;
    out[id] = mode === "adapt" ? clipToBroadcastLimit(master, max) : master;
  }
  return out;
}

/** True when every selected channel has a non-empty body within its cap. */
export function broadcastBodiesReady(
  selectedChannelIds: string[],
  masterText: string,
  channelBodies: Record<string, string>,
): boolean {
  if (selectedChannelIds.length === 0) return false;
  return selectedChannelIds.every((id) => {
    const body = resolveChannelBody(masterText, channelBodies, id).trim();
    const max = broadcastChannelById(id)?.maxChars ?? 280;
    return body.length > 0 && body.length <= max;
  });
}
