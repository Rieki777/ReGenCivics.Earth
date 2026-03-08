/**
 * LiveStats  -  animated counters showing real-time platform stats.
 * Counts up from 0 when the element enters the viewport.
 */
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Sprout, FileText, Handshake } from "lucide-react";

function useCountUp(target: number, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!start || target === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  return value;
}

interface StatItemProps {
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  animate: boolean;
}

function StatItem({ icon: Icon, value, label, suffix = "+", animate }: StatItemProps) {
  const displayed = useCountUp(value, 1400, animate);
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 min-w-[120px]">
      <Icon className="w-5 h-5 text-[#7dd87d] mb-1" />
      <span className="text-2xl font-bold text-white tabular-nums">
        {displayed.toLocaleString()}{value > 0 ? suffix : ""}
      </span>
      <span className="text-xs text-white/60 text-center leading-tight">{label}</span>
    </div>
  );
}

export function LiveStats() {
  const { data } = trpc.stats.getPublicStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Use placeholder numbers until data loads; if DB is empty show minimum social proof values
  const stats = {
    applications: data?.applications ?? 0,
    members: data?.members ?? 0,
    landProjects: data?.landProjects ?? 0,
    investorsCommitted: data?.investorsCommitted ?? 0,
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#0d2818]/80 backdrop-blur-sm border-y border-[#7dd87d]/20"
    >
      <div className="container mx-auto">
        <div className="flex flex-wrap justify-center divide-x divide-[#7dd87d]/15">
          <StatItem
            icon={FileText}
            value={stats.applications}
            label="Applications Received"
            animate={animate}
          />
          <StatItem
            icon={Users}
            value={stats.members}
            label="Community Members"
            animate={animate}
          />
          <StatItem
            icon={Sprout}
            value={stats.landProjects}
            label="Active Land Projects"
            animate={animate}
          />
          <StatItem
            icon={Handshake}
            value={stats.investorsCommitted}
            label="Investors Committed"
            animate={animate}
          />
        </div>
      </div>
    </div>
  );
}
