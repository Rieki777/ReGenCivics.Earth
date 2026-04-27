import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ParallaxSectionProps {
  imageSrc: string;
  children: React.ReactNode;
  className?: string;
  overlay?: string;
  id?: string;
}

export function ParallaxSection({
  imageSrc,
  children,
  className = "",
  overlay,
  id,
}: ParallaxSectionProps) {
  const skipAnim = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // iOS Safari renders `background-attachment: fixed` as either blank or
  // wildly mis-scaled, which is why Rye's Tree Talk / Rite 9 page (and any
  // other ParallaxSection) was missing the seasons background entirely on
  // mobile. Detect a narrow viewport and switch to scroll attachment so the
  // image actually paints. The "parallax" effect is preserved on desktop.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    // Older Safari
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  const useFixedAttachment = !skipAnim && !isNarrow;

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative py-20 overflow-hidden ${className}`}
    >
      {/* CSS-only parallax on desktop, scroll attachment on mobile so iOS
          Safari renders the background image at all. */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundAttachment: useFixedAttachment ? "fixed" : "scroll",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat"
        }}
      />
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={overlay ? { backgroundColor: overlay } : undefined}
      >
        {!overlay && <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/30 to-white/60 backdrop-blur-[0.5px]" />}
      </div>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
