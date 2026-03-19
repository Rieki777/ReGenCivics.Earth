import { useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ParallaxSectionProps {
  imageSrc: string;
  children: React.ReactNode;
  className?: string;
  overlay?: string;
}

export function ParallaxSection({
  imageSrc,
  children,
  className = "",
  overlay
}: ParallaxSectionProps) {
  const skipAnim = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section 
      ref={sectionRef}
      className={`relative py-20 overflow-hidden ${className}`}
    >
      {/* Fixed Background with CSS-only parallax - no JavaScript needed */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${imageSrc})`,
          backgroundAttachment: skipAnim ? "scroll" : "fixed",
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
        {!overlay && <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/50 to-white/80" />}
      </div>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
