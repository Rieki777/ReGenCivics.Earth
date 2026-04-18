import { type ReactNode } from "react";

type Weight = "hero" | "mid" | "small";

const WEIGHT_CLASS: Record<Weight, string> = {
  hero: "bento-hero",
  mid: "bento-mid",
  small: "bento-small",
};

export function BentoGrid({ children }: { children: ReactNode }) {
  return <div className="bento-grid">{children}</div>;
}

export function BentoCard({
  weight = "small",
  children,
  className = "",
}: {
  weight?: Weight;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${WEIGHT_CLASS[weight]} group bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-shadow hover:shadow-lg focus-within:shadow-lg ${className}`}
      data-weight={weight}
    >
      {children}
    </div>
  );
}

export function assignWeight(index: number): Weight {
  if (index === 0) return "hero";
  if (index % 5 === 1) return "mid";
  return "small";
}
