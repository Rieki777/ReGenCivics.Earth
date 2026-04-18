function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function LandscapeSVG({ seed, className = "" }: { seed: string; className?: string }) {
  const rand = mulberry32(hashString(seed));
  const layers = Array.from({ length: 4 }).map((_, i) => {
    const amplitude = 20 + rand() * 40;
    const points = Array.from({ length: 12 }).map((_, p) => {
      const x = (p / 11) * 100;
      const y = 60 + i * 8 + Math.sin(p + rand() * 10) * amplitude * (1 - i * 0.15);
      return `${x},${y}`;
    });
    return { points: points.join(" "), opacity: 0.06 + i * 0.04 };
  });
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      {layers.map((l, i) => (
        <polygon key={i} points={`0,100 ${l.points} 100,100`} fill="currentColor" opacity={l.opacity} />
      ))}
    </svg>
  );
}
