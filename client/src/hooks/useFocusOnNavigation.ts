import { useEffect } from 'react'
import { useLocation } from 'wouter'

export function useFocusOnNavigation() {
  const [location] = useLocation()
  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement
    if (main) {
      main.setAttribute('tabIndex', '-1')
      main.focus({ preventScroll: true })
    }
  }, [location])
}
