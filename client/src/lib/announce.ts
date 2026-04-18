export function announce(message: string) {
  const el = document.getElementById("live-announcer");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = message; });
}
