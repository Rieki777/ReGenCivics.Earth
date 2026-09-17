/**
 * Deterministic post-session Outbound letter markdown (draft only — never sends).
 * Uses siteContext canonical URLs for the primary CTA.
 */
import { absoluteSiteUrl } from "./siteContext";

export const POST_SESSION_LETTER_KEY_PREFIX = "post-session-letter:rec:";

export function postSessionLetterIdempotencyKey(recordingId: number): string {
  return `${POST_SESSION_LETTER_KEY_PREFIX}${recordingId}`;
}

export type PostSessionCta = {
  path: string;
  label: string;
  url: string;
};

/**
 * Simple heuristic from event type / season. Falls back to /connect placeholder.
 * Paths must stay inside siteContext allowlist.
 */
export function pickPostSessionCta(event?: {
  type?: string | null;
  season?: string | null;
  title?: string | null;
} | null): PostSessionCta {
  const type = (event?.type ?? "").toLowerCase();
  const season = (event?.season ?? "").toLowerCase();
  const title = (event?.title ?? "").toLowerCase();
  const blob = `${type} ${season} ${title}`;

  if (type === "episode" || season.includes("season 2") || blob.includes("season 2") || blob.includes("s2")) {
    return { path: "/season2", label: "Explore Season 2", url: absoluteSiteUrl("/season2") };
  }
  if (blob.includes("claim") && blob.includes("seed")) {
    return { path: "/claim-seeds", label: "Claim SEEDS", url: absoluteSiteUrl("/claim-seeds") };
  }
  if (blob.includes("loi") || blob.includes("letter of intent")) {
    return { path: "/loi", label: "Share a letter of intent", url: absoluteSiteUrl("/loi") };
  }
  if (blob.includes("apply") || blob.includes("application")) {
    return { path: "/apply", label: "Apply to join", url: absoluteSiteUrl("/apply") };
  }
  if (type === "open" || blob.includes("open access")) {
    return { path: "/schedule", label: "See upcoming sessions", url: absoluteSiteUrl("/schedule") };
  }
  // Admin can swap in Write; connect is a safe default CTA.
  return { path: "/connect", label: "Connect with us", url: absoluteSiteUrl("/connect") };
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
