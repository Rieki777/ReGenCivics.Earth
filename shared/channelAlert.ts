/**
 * Telegram and WhatsApp copy. Every message carries a page on the site
 * where someone can leave the chat and take part.
 */
import { hasSessionBoard } from "./sessionBoard";

function rootOf(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function recordingReadyChannelMessage(input: {
  title: string;
  watchUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  forumUrl?: string | null;
}): string {
  const sourceUrl = input.sourceUrl.trim();
  const sourceLabel = input.sourceLabel.trim() || "Season 2";
  if (!sourceUrl) {
    throw new Error("recording channel message needs a game source link");
  }
  let message =
    `*Recording ready*\n\n` +
    `*${input.title}*\n\n` +
    `Watch: ${input.watchUrl}\n` +
    `${sourceLabel}: ${sourceUrl}`;
  if (input.forumUrl) {
    message += `\nDiscussion: ${input.forumUrl}`;
  }
  return message;
}

export function newEventChannelMessage(input: {
  title: string;
  seasonTag: string;
  when: string;
  joinUrl: string;
  baseUrl: string;
  week: number | null;
}): string {
  const root = rootOf(input.baseUrl);
  const source = input.week != null && hasSessionBoard(input.week)
    ? { label: `Week ${input.week} board`, url: `${root}/season2/week/${input.week}` }
    : { label: "Season 2", url: `${root}/season2` };
  return (
    `*New event added${input.seasonTag}*\n\n` +
    `*${input.title}*\n` +
    `${input.when}\n\n` +
    `Join: ${input.joinUrl}\n` +
    `${source.label}: ${source.url}\n` +
    `Full schedule: ${root}/schedule`
  );
}

export function shipConflictChannelMessage(conflicts: string[], baseUrl: string): string {
  const root = rootOf(baseUrl);
  const lines = conflicts.slice(0, 10).map((c) => `- ${c}`).join("\n");
  const more = conflicts.length > 10 ? `\n...and ${conflicts.length - 10} more` : "";
  return (
    `*Ship calendar conflict*\n\n` +
    `An Outdoorsy booking overlaps a week that is already held on regencivics.earth. ` +
    `The dates are blocked either way, so nothing is oversold. Two guests may both ` +
    `think the week is theirs.\n\n` +
    `${lines}${more}\n\n` +
    `Ship book: ${root}/ship/book\n` +
    `Ship admin: ${root}/admin/ship`
  );
}

/** Keeps a free-form ops ping pointed at a page on the site. */
export function operatorPulseChannelMessage(message: string, baseUrl: string): string {
  const root = rootOf(baseUrl);
  if (message.includes(root)) return message;
  return `${message}\n\nOverview: ${root}/admin`;
}
