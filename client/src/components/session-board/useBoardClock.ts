import { useEffect, useState } from "react";

/**
 * Server time for one clock on the board, ticking every 500ms while
 * `running`. Each clock owns its tick: a page-wide clock re-rendered the whole
 * board, and the stage people were typing on, twice a second
 * (STEERING.md section 13).
 */
export function useBoardClock(serverNow: () => number, running = true): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(serverNow());
    if (!running) return;
    const t = setInterval(() => setNow(serverNow()), 500);
    return () => clearInterval(t);
  }, [serverNow, running]);
  return now;
}

/**
 * True once server time reaches `at`. Re-renders once, at that moment, and
 * never ticks; false while `at` is null.
 */
export function useServerTimePassed(serverNow: () => number, at: number | null): boolean {
  const [passed, setPassed] = useState(() => at != null && serverNow() >= at);
  useEffect(() => {
    if (at == null) {
      setPassed(false);
      return;
    }
    const wait = at - serverNow();
    if (wait <= 0) {
      setPassed(true);
      return;
    }
    setPassed(false);
    // setTimeout holds at most about 24.8 days.
    const t = setTimeout(() => setPassed(true), Math.min(wait, 2_147_483_647));
    return () => clearTimeout(t);
  }, [serverNow, at]);
  return passed;
}
