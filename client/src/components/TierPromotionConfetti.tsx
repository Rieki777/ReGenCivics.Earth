import { useEffect, useState } from "react";

const COLORS = ["#7dd87d", "#ffd700", "#f0ebe3", "#4a7c59", "#d4a574"];

export function TierPromotionConfetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
    }));
    setParticles(p);
    const t = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: `${p.x}%`,
            top: "-5%",
            backgroundColor: p.color,
            animation: `confetti-fall 2.5s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
