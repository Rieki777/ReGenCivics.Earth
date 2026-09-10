const CREDENTIAL_AUTOCOMPLETE = new Set([
  "current-password",
  "new-password",
  "password",
  "one-time-code",
]);

/**
 * Password and other credential fields never take a mic. Call this before
 * starting recognition and on focusin so a stray tab into a secret field
 * stops listening.
 */
export function isSensitiveField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.dataset.dictation === "off" || el.dataset.sensitive === "true") return true;

  const type = (el.getAttribute("type") ?? "").toLowerCase();
  if (type === "password") return true;

  if (el instanceof HTMLInputElement) {
    if (el.type === "password") return true;
    const auto = (el.autocomplete ?? "").trim().toLowerCase();
    if (CREDENTIAL_AUTOCOMPLETE.has(auto)) return true;
  }

  return false;
}
