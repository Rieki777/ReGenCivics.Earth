export function navigateWithTransition(
  setLocation: (to: string, opts?: { replace?: boolean }) => void,
  to: string,
  replace = false
) {
  const doc = document as { startViewTransition?: (cb: () => void) => void };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => setLocation(to, { replace }));
  } else {
    setLocation(to, { replace });
  }
}
