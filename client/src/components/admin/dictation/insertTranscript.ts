/**
 * Caret-aware insert for admin dictation.
 *
 * If start/end are missing, the transcript is appended. A selected range is
 * replaced. A space is added when joining onto an existing word.
 */
export function insertTranscript(
  value: string,
  transcript: string,
  start?: number | null,
  end?: number | null,
): { value: string; caret: number } {
  const piece = transcript.replace(/\s+/g, " ").trim();
  if (!piece) return { value, caret: typeof start === "number" ? start : value.length };

  const hasCaret = typeof start === "number" && Number.isFinite(start) && start >= 0;
  const from = hasCaret ? Math.min(Math.max(0, start), value.length) : value.length;
  const rawEnd = typeof end === "number" && Number.isFinite(end) ? end : from;
  const to = Math.min(Math.max(from, rawEnd), value.length);

  const before = value.slice(0, from);
  const after = value.slice(to);
  const needSpaceBefore = before.length > 0 && !/\s$/.test(before);
  const needSpaceAfter = after.length > 0 && !/^\s/.test(after) && !/^[.,!?;:]/.test(after);
  const inserted = `${needSpaceBefore ? " " : ""}${piece}${needSpaceAfter ? " " : ""}`;
  const next = before + inserted + after;
  return { value: next, caret: before.length + inserted.length - (needSpaceAfter ? 1 : 0) };
}
