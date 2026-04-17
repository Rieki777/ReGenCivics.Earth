import { useMemo } from "react";

type Slice = { label: string; share: number; color: string };

const slices: Slice[] = [
  { label: "Stewardship Council", share: 40, color: "#4a7c59" },
  { label: "Investors",           share: 20, color: "#7dd87d" },
  { label: "Land Projects",       share: 20, color: "#f0ebe3" },
  { label: "Alliance Partners",   share: 20, color: "#ffd166" },
];

export function WhoHoldsVoteChart() {
  const total = slices.reduce((s, x) => s + x.share, 0);
  const paths = useMemo(() => {
    let acc = 0;
    const r = 100, cx = 110, cy = 110;
    return slices.map((s) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += s.share;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const large = s.share / total > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const labelAngle = (start + end) / 2;
      const lx = cx + r * 0.65 * Math.cos(labelAngle);
      const ly = cy + r * 0.65 * Math.sin(labelAngle);
      return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: s.color, label: s.label, share: s.share, lx, ly };
    });
  }, []);

  return (
    <figure className="bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-2xl p-4 md:p-6">
      <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto h-auto" role="img" aria-label="Fund governance weight: Stewardship Council 40%, Investors 20%, Land Projects 20%, Alliance Partners 20%">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="#0d2818" strokeWidth={1.5} />
        ))}
        {paths.map((p, i) => (
          <text key={`t-${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" className="fill-[#0d2818] text-[10px] font-bold pointer-events-none">
            {p.share}%
          </text>
        ))}
      </svg>
      <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/80">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
            <span className="flex-1">{s.label}</span>
            <span className="font-mono text-[#7dd87d]">{s.share}%</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-white/50">
        These four actor classes together hold voice over Fund decisions: capital deployment, partner acceptance, and stewardship policy. Game governance (RGVoice) follows a separate structure on the ReGen Games side of the bridge. Percentages evolve with each season.
      </figcaption>
    </figure>
  );
}
