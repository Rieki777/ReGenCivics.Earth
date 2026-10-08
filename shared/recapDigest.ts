/**
 * Digest blocks for the recording letters: a short gist, the top call
 * insights, and the next steps. A section with nothing to say is omitted.
 */
import { EMAIL_BODY_TEXT, EMAIL_MUTED_TEXT } from "./emailChrome";
import { chapterWatchUrl } from "./youtubeChapters";

export type RecapItem = {
  text: string;
  href?: string;
  /** Speaker or other short attribution. Omitted when empty. */
  note?: string;
};

const INSIGHT_RANK: Record<string, number> = {
  decision: 0,
  commitment: 1,
  strategic_move: 2,
  wisdom: 3,
  idea: 4,
  role_change: 5,
};

const OPEN_TASK = new Set(["proposed", "accepted", "open"]);

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clipLine(value: string, max = 160): string {
  const clean = value.replace(/\s*[‒–—―]\s*/g, ", ").replace(/\s+/g, " ").replace(/[.]+\s*$/, "").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 70 ? cut.slice(0, space) : cut).trim();
}

function sentenceList(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** 3 to 5 short lines from a summary. Fewer when the source is shorter. None when it is empty. */
export function gistBullets(summary: string | null | undefined, max = 5): string[] {
  const text = (summary ?? "").replace(/\s*[‒–—―]\s*/g, ", ").trim();
  if (!text) return [];
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  const source = lines.length >= 2 ? lines : sentenceList(text);
  const bullets = source.map((line) => clipLine(line)).filter((line) => line.length >= 8);
  return bullets.slice(0, max);
}

export function pickTopInsights<T extends { kind: string; content: string; status?: string | null }>(
  rows: T[],
  limit = 3,
): T[] {
  return rows
    .filter((row) => row.status !== "dismissed" && row.content.trim().length > 0)
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const rank = (INSIGHT_RANK[a.row.kind] ?? 9) - (INSIGHT_RANK[b.row.kind] ?? 9);
      return rank || a.index - b.index;
    })
    .slice(0, limit)
    .map((entry) => entry.row);
}

export function insightItems(
  rows: Array<{
    kind: string;
    content: string;
    status?: string | null;
    speaker?: string | null;
    timestampSecs?: number | null;
  }>,
  videoId: string | null,
  limit = 3,
): RecapItem[] {
  return pickTopInsights(rows, limit).map((row) => {
    const speaker = row.speaker?.trim() || "";
    const stamp = row.timestampSecs && row.timestampSecs > 0 ? Math.round(row.timestampSecs) : 0;
    return {
      text: clipLine(row.content, 180),
      note: speaker || undefined,
      href: videoId && stamp ? chapterWatchUrl(videoId, stamp) : undefined,
    };
  });
}

function actionLines(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const row of items) {
    if (typeof row === "string") {
      const text = row.trim();
      if (text) out.push(text);
      continue;
    }
    if (row && typeof row === "object" && "item" in row) {
      const text = String((row as { item?: unknown }).item ?? "").trim();
      if (text) out.push(text);
    }
  }
  return out;
}

/**
 * Up to five participant actions. A proposed task links to its bounty page.
 * An action item links to the week board when that page exists.
 */
export function nextSteps(input: {
  tasks?: Array<{ id?: number; title: string; workStatus?: string | null }>;
  actionItems?: unknown;
  weekBoardHref?: string | null;
  origin?: string;
  limit?: number;
}): RecapItem[] {
  const limit = input.limit ?? 5;
  const origin = (input.origin ?? "").replace(/\/$/, "");
  const board = input.weekBoardHref?.trim() || "";
  const tasks = (input.tasks ?? []).filter((task) => {
    const title = task.title?.trim();
    if (!title) return false;
    if (!task.workStatus) return true;
    return OPEN_TASK.has(task.workStatus);
  });
  if (tasks.length) {
    return tasks.slice(0, limit).map((task) => ({
      text: clipLine(task.title, 120),
      href: task.id && origin ? `${origin}/bounties/${task.id}` : board || undefined,
    }));
  }
  return actionLines(input.actionItems).slice(0, limit).map((text) => ({
    text: clipLine(text, 120),
    href: board || undefined,
  }));
}

function itemHtml(item: RecapItem): string {
  const label = esc(item.text);
  const inner = item.href
    ? `<a href="${esc(item.href)}" style="color:${EMAIL_BODY_TEXT};text-decoration:underline;">${label}</a>`
    : label;
  const note = item.note
    ? ` <span class="rc-muted" style="color:${EMAIL_MUTED_TEXT};">(${esc(item.note)})</span>`
    : "";
  return `<li class="rc-text" style="color:${EMAIL_BODY_TEXT};margin:0 0 8px 0;line-height:1.45;">${inner}${note}</li>`;
}

function section(title: string, items: RecapItem[]): string {
  if (!items.length) return "";
  return `<p class="rc-heading" style="color:${EMAIL_BODY_TEXT};font-weight:700;font-size:16px;margin:0 0 8px;">${esc(title)}</p><ul style="margin:0 0 20px;padding:0 0 0 18px;">${items.map(itemHtml).join("")}</ul>`;
}

/** The three digest sections, in reading order. Empty sections are left out. */
export function recapSectionsHtml(input: {
  gist?: string[];
  insights?: RecapItem[];
  steps?: RecapItem[];
}): string {
  const gist = (input.gist ?? []).filter((line) => line.trim()).map((text) => ({ text: text.trim() }));
  const insights = input.insights ?? [];
  const steps = input.steps ?? [];
  return [
    section("The gist", gist),
    section("Key insights", insights),
    section("Your next steps", steps),
  ].join("");
}
