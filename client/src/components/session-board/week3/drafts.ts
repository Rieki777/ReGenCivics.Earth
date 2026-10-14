/**
 * Words typed on a stage and not saved yet, kept in this page's memory only:
 * no request, no localStorage or sessionStorage, nothing in the URL. When the
 * room moves on and a stage unmounts, its fields read them back, so the
 * private card and a half-written line survive a stage change. A reload or a
 * closed tab forgets them, which keeps the private card's promise that its
 * words stay on this screen.
 */
const drafts = new Map<string, string>();

export function readDraft(key: string): string | undefined {
  return drafts.get(key);
}

export function writeDraft(key: string, text: string): void {
  if (text) drafts.set(key, text);
  else drafts.delete(key);
}

export function dropDraft(key: string): void {
  drafts.delete(key);
}
