import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Server time for one clock on the board, ticking every 500ms while
 * `running`. Each clock owns its tick: a page-wide clock re-rendered the whole
 * board, and the stage people were typing on, twice a second
 * (STEERING.md section 13). A layout effect, so a clock that starts again
 * ("Back to live", a resumed share) paints the current time at once, not the
 * time it stopped at.
 */
export function useBoardClock(serverNow: () => number, running = true): number {
  const [now, setNow] = useState(serverNow);
  useLayoutEffect(() => {
    setNow(serverNow());
    if (!running) return;
    const t = setInterval(() => setNow(serverNow()), 500);
    return () => clearInterval(t);
  }, [serverNow, running]);
  return now;
}

/**
 * True once server time reaches `at`; false while `at` is null. Re-renders
 * only when it flips. It re-checks at least every 5s instead of trusting one
 * long timeout: serverNow() leans on a clock offset that a later fetch can
 * correct (after an optimistic "+5 min", for one), and the flag has to follow
 * the corrected time. A flag set for an earlier `at` never counts for a new one.
 */
export function useServerTimePassed(serverNow: () => number, at: number | null): boolean {
  const [state, setState] = useState(() => ({ at, passed: at != null && serverNow() >= at }));
  useEffect(() => {
    if (at == null) {
      setState({ at, passed: false });
      return;
    }
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const wait = at - serverNow();
      setState((s) => (s.at === at && s.passed === wait <= 0 ? s : { at, passed: wait <= 0 }));
      if (wait > 0) t = setTimeout(check, Math.min(wait, 5_000));
    };
    check();
    return () => clearTimeout(t);
  }, [serverNow, at]);
  return state.at === at ? state.passed : at != null && serverNow() >= at;
}
