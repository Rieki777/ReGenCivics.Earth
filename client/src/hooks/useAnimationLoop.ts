import { useEffect, useRef, type RefObject } from "react";
import { isTyping, onTypingChange } from "@/lib/stillWhileTyping";

/**
 * Calls `frame` once per animation frame, but only while `target` is on
 * screen and nobody is typing (STEERING.md section 13). A canvas loop asks for
 * a frame every vsync, and each one takes main-thread time that keystrokes
 * and taps need, so an off-screen or ignored loop should not run at all.
 * With prefers-reduced-motion it draws one still frame and stops.
 */
export function useAnimationLoop(target: RefObject<Element | null>, frame: (time: number) => void) {
  const draw = useRef(frame);
  draw.current = frame;

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      const still = requestAnimationFrame((time) => draw.current(time));
      return () => cancelAnimationFrame(still);
    }

    let id = 0;
    let onScreen = true;
    const tick = (time: number) => {
      draw.current(time);
      id = requestAnimationFrame(tick);
    };
    const sync = () => {
      const run = onScreen && !isTyping();
      if (run && !id) id = requestAnimationFrame(tick);
      if (!run && id) {
        cancelAnimationFrame(id);
        id = 0;
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(el);
    const offTyping = onTypingChange(sync);
    sync();
    return () => {
      io.disconnect();
      offTyping();
      if (id) cancelAnimationFrame(id);
    };
  }, [target]);
}
