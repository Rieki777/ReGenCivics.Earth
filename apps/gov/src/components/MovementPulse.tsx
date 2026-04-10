"use client";

import { GlassCard } from "./GlassCard";
import { Users, Vote, BarChart3, Calendar } from "lucide-react";

// Sprint 1: placeholder stats. Sprint 2+ wires real data.
const STATS = [
  { label: "Players", value: "247", Icon: Users },
  { label: "Active proposals", value: "12", Icon: Vote },
  { label: "Participation", value: "68%", Icon: BarChart3 },
];

export function MovementPulse() {
  return (
    <GlassCard>
      <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-3">
        The Movement
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATS.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[100px]"
          >
            <Icon className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-sm">{value}</p>
              <p className="text-white/55 text-[10px]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-white/55 text-xs">
        <Calendar className="w-3.5 h-3.5" />
        <span>Spring 2026 · Connect beat · Festival in 47 days</span>
      </div>
    </GlassCard>
  );
}
