import { useEffect, useState } from "react";

/**
 * The value, once it has stopped changing for `delayMs`.
 *
 * For anything a keystroke should not trigger on its own: a search query sent
 * to the server, a draft written to storage, an expensive filter. The field
 * itself stays bound to the live value so typing never waits.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
