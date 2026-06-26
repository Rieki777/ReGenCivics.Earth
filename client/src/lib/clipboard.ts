/**
 * copyToClipboard — safe cross-browser copy with execCommand fallback.
 *
 * navigator.clipboard.writeText requires a secure context and an unbroken
 * user-gesture chain. iOS Safari rejects it when the gesture chain is broken
 * by an async operation. The execCommand("copy") fallback covers those cases.
 *
 * Returns true if the copy succeeded, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
