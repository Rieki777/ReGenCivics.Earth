/**
 * TractionStrip — a row of living numbers that count up when scrolled into
 * view. Built to show honest movement momentum (projects mapped, quests done,
 * bioregions touched, community members), not fund performance, since the
 * fund is in formation.
 *
 * Fully config-driven via `stats`. Count-up respects prefers-reduced-motion
 * (it snaps to the final value). Live values should be passed in from real
 * data; this component never invents numbers.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TractionStat {
  /** The number to count up to. */
  value: number;
  /** Optional prefix (e.g. "$") and suffix (e.g. "+", "k"). */
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface TractionStripProps {
  eyebrow?: string;
  stats: TractionStat[];
  tone?: "forest" | "cream";
  className?: string;
}

function useCountUp(target: number, run: boolean, durationMs = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setValue(target); return; }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, durationMs]);
  return value;
}

function StatItem({ stat, run, accent, label }: { stat: TractionStat; run: boolean; accent: string; label: string }) {
  const v = useCountUp(stat.value, run);
  const display = Math.round(v).toLocaleString();
  return (
    <div className="text-center px-4">
      <div className={cn("text-4xl md:text-5xl font-bold tabular-nums leading-none", accent)} style={{ fontFamily: "var(--font-display, serif)" }}>
        {stat.prefix}{display}{stat.suffix}
      </div>
      <div className={cn("mt-2 text-sm font-medium", label)}>{stat.label}</div>
    </div>
  );
}

export function TractionStrip({ eyebrow, stats, tone = "forest", className }: TractionStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) { setRun(true); io.disconnect(); }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isForest = tone === "forest";
  const sectionTone = isForest ? "bg-[#0d2818] text-white" : "bg-[#f0ebe3] text-[#1a472a]";
  const accent = isForest ? "text-[#7dd87d]" : "text-[#1a472a]";
  const labelTone = isForest ? "text-white/60" : "text-[#1a472a]/75";
  const eyebrowTone = isForest ? "text-[#7dd87d]/80" : "text-[#1a472a]/75";
  const divide = isForest ? "divide-white/10" : "divide-[#1a472a]/10";

  return (
    <section ref={ref} className={cn("py-14 px-4", sectionTone, className)}>
      <div className="container max-w-5xl mx-auto">
        {eyebrow && (
          <p className={cn("text-center text-[11px] font-bold uppercase tracking-[0.2em] mb-8", eyebrowTone)}>
            {eyebrow}
          </p>
        )}
        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-y-8 md:divide-x", divide)}>
          {stats.map((s, i) => (
            <StatItem key={i} stat={s} run={run} accent={accent} label={labelTone} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TractionStrip;
