import { useEffect, useRef } from "react";

export function useParallax(factor = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.innerWidth < 768) return;
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      el.style.transform = `translate3d(0, ${window.scrollY * factor}px, 0)`;
    };
    let raf: number;
    const handler = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(onScroll); };
    window.addEventListener("scroll", handler, { passive: true });
    return () => { window.removeEventListener("scroll", handler); cancelAnimationFrame(raf); };
  }, [factor]);
  return ref;
}
