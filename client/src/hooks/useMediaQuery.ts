import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    // Re-sync before subscribing. `matches` was computed during render, and two
    // things can invalidate it before this effect commits: the viewport can
    // cross the breakpoint in between, and a changed `query` leaves the state
    // holding the previous query's answer. In both cases the only thing that
    // would correct it is the next change event, which may never arrive, so the
    // component can sit on a stale answer indefinitely.
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}
