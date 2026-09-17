/**
 * Deterministic post-session Outbound letter markdown (draft only — never sends).
 * Uses siteContext canonical URLs for the primary CTA.
 */
import { pickAudienceCta, type AudienceCta } from "./audienceCta";

export const POST_SESSION_LETTER_KEY_PREFIX = "post-session-letter:rec:";

export function postSessionLetterIdempotencyKey(recordingId: number): string {
  return `${POST_SESSION_LETTER_KEY_PREFIX}${recordingId}`;
}

/** @deprecated Prefer pickAudienceCta — same heuristic, shared with Schedule past cards. */
export type PostSessionCta = AudienceCta;

/**
 * Same as pickAudienceCta (siteContext allowlist). Kept for post-session letter callers.
 */
export function pickPostSessionCta(event?: {
  type?: string | null;
  season?: string | null;
  title?: string | null;
} | null): PostSessionCta {
  return pickAudienceCta(event);
}

export type PostSessionLetterInput = {
  recordingId: number;
  title: string;
  sessionDate?: Date | string | null;
  overview?: string | null;
  aiSummary?: string | null;
  actionItems?: Array<{ owner?: string; item?: string } | string> | null;
  chapters?: Array<{ tSeconds?: number; title?: string }> | null;
  watchUrl?: string | null;
  event?: { type?: string | null; season?: string | null; title?: string | null } | null;
};

function formatSessionDate(d: Date | string | null | undefined): string {
  if (!d) return "Recent session";
  const date = d instanceof Date ? d : new Date(d);
  if (!Number.isFinite(date.getTime())) return "Recent session";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}

function normalizeActionItems(
  items: PostSessionLetterInput["actionItems"],
): Array<{ owner: string; item: string }> {
  if (!Array.isArray(items)) return [];
  const out: Array<{ owner: string; item: string }> = [];
  for (const row of items) {
    if (typeof row === "string") {
      const t = row.trim();
      if (t) out.push({ owner: "Team", item: t });
      continue;
    }
    if (row && typeof row === "object") {
      const item = String(row.item ?? "").trim();
      if (!item) continue;
      out.push({ owner: String(row.owner ?? "Team").trim() || "Team", item });
    }
  }
  return out;
}

/**
 * Build subject + markdown body for an Outbound draft.
 * Never HTML. Never auto-send — caller upserts status=draft only.
 */
export function buildPostSessionLetter(input: PostSessionLetterInput): {
  subject: string;
  body: string;
  layout: "announcement";
  templateKey: string;
  cta: PostSessionCta;
} {
  const title = (input.title || "Community session").trim();
  const dateLabel = formatSessionDate(input.sessionDate);
  const covered = (input.overview ?? input.aiSummary ?? "").trim();
  const actions = normalizeActionItems(input.actionItems);
  const chapters = Array.isArray(input.chapters) ? input.chapters : [];
  const watch = (input.watchUrl ?? "").trim();
  const cta = pickPostSessionCta(input.event);
  const templateKey = postSessionLetterIdempotencyKey(input.recordingId);

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`*${dateLabel}*`);
  lines.push("");
  lines.push("Friends,");
  lines.push("");
  lines.push("Thank you for being with us. Here is a short wrap of the session.");
  lines.push("");
  lines.push("## What we covered");
  lines.push("");
  if (covered) {
    lines.push(covered);
  } else {
    lines.push("_Summary landing after processing — admin can fill this in Write._");
  }
  lines.push("");

  if (actions.length > 0) {
    lines.push("## Follow-ups");
    lines.push("");
    for (const a of actions) {
      lines.push(`- **${a.owner}:** ${a.item}`);
    }
    lines.push("");
  }

  if (watch) {
    lines.push("## Watch");
    lines.push("");
    lines.push(`[Watch the session](${watch})`);
    lines.push("");
  }

  if (chapters.length > 0 && watch) {
    lines.push("## Chapters");
    lines.push("");
    for (const c of chapters) {
      const t = typeof c.tSeconds === "number" ? c.tSeconds : 0;
      const label = String(c.title ?? "Chapter").trim() || "Chapter";
      const sep = watch.includes("?") ? "&" : "?";
      lines.push(`- [${fmtTs(t)} — ${label}](${watch}${sep}t=${Math.max(0, Math.floor(t))}s)`);
    }
    lines.push("");
  } else if (chapters.length > 0) {
    lines.push("## Chapters");
    lines.push("");
    for (const c of chapters) {
      const t = typeof c.tSeconds === "number" ? c.tSeconds : 0;
      const label = String(c.title ?? "Chapter").trim() || "Chapter";
      lines.push(`- ${fmtTs(t)} — ${label}`);
    }
    lines.push("");
  }

  lines.push("## Next step");
  lines.push("");
  lines.push(`[${cta.label}](${cta.url})`);
  lines.push("");
  lines.push("With care,");
  lines.push("ReGen Civics");
  lines.push("");

  return {
    subject: `Session wrap: ${title}`.slice(0, 300),
    body: lines.join("\n").slice(0, 50000),
    layout: "announcement",
    templateKey,
    cta,
  };
}
