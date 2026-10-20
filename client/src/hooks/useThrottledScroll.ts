import { useEffect, useRef } from 'react'

export function useThrottledScroll(handler: () => void, delay = 100) {
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        handler()
        rafRef.current = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      // Clear the id too: a cancelled frame left here would block every
      // later scroll once the effect runs again.
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [handler])
}
