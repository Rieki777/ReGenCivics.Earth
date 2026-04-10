"use client";

import { GlassCard } from "./GlassCard";
import { Globe, Users, ArrowRight } from "lucide-react";
import { PillButton } from "./PillButton";

// Sprint 1: placeholder data. Sprint 3 wires real bioregion data.
const SAMPLE_BIOREGIONS = [
  { slug: "cascadia", name: "Cascadia", memberCount: 47 },
  { slug: "great-lakes", name: "Great Lakes", memberCount: 23 },
  { slug: "south-bay", name: "South Bay Area", memberCount: 12 },
];

interface Props {
  /** User's primary bioregion slug, null if none. */
  userBioregion?: string | null;
}

export function BioregionCard({ userBioregion }: Props) {
  const joined = userBioregion ? SAMPLE_BIOREGIONS.find((b) => b.slug === userBioregion) : null;

  return (
    <GlassCard>
      <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-3">
        Your Bioregion
      </h2>

      {joined ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{joined.name}</p>
            <p className="text-white/55 text-xs flex items-center gap-1">
              <Users className="w-3 h-3" /> {joined.memberCount} members
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/55" />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-white/65 text-sm mb-3">Join a bioregion to participate in local governance.</p>
          {SAMPLE_BIOREGIONS.map((b) => (
            <div key={b.slug} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
              <Globe className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{b.name}</p>
                <p className="text-white/55 text-xs">{b.memberCount} members</p>
              </div>
              <PillButton variant="secondary" className="text-xs px-3 py-1">
                Join
              </PillButton>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
