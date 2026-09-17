/**
 * Parse /apply Gardener companionTranscript JSON for admin review.
 *
 * Stored on `applications.companionTranscript` (MEDIUMTEXT, migration 0188) as
 * a JSON array of `{ role: "user" | "assistant", content: string }` turns.
 * Returns null when missing/unreadable so UI can skip the section.
 */

export type CompanionTranscriptTurn = {
  role: string;
  content: string;
  /** Human label for admin UI. */
  speakerLabel: string;
};

export function speakerLabelForRole(role: string): string {
  const r = role.toLowerCase();
  if (r === "user" || r === "applicant" || r === "human") return "Applicant";
  if (r === "assistant" || r === "gardener" || r === "companion") return "Gardener";
  return role || "Unknown";
}

/**
 * Parse companionTranscript JSON text (or already-parsed array).
 * @returns turns, or null if the field is absent / not valid JSON turns.
 */
export function parseCompanionTranscript(raw: unknown): CompanionTranscriptTurn[] | null {
  if (raw == null) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  const turns: CompanionTranscriptTurn[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const role = String((item as { role?: unknown }).role ?? "").trim();
    const contentRaw = (item as { content?: unknown }).content;
    const content =
      typeof contentRaw === "string"
        ? contentRaw
        : contentRaw == null
          ? ""
          : String(contentRaw);
    if (!role && !content.trim()) continue;
    turns.push({
      role: role || "unknown",
      content,
      speakerLabel: speakerLabelForRole(role || "unknown"),
    });
  }
  return turns.length > 0 ? turns : null;
}

/** True when a record has a renderable companion transcript. */
export function hasCompanionTranscript(record: Record<string, unknown> | null | undefined): boolean {
  if (!record) return false;
  return parseCompanionTranscript(record.companionTranscript) != null;
}
