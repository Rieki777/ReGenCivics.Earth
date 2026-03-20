import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 1200, triggered: boolean = true) {
  const [current, setCurrent] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!triggered || startedRef.current) return
    startedRef.current = true
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, triggered])

  return current
}
