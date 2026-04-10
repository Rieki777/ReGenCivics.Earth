"use client";

import { GlassCard } from "./GlassCard";
import { Vote, Handshake, Heart, Leaf } from "lucide-react";
import { PillButton } from "./PillButton";

type InboxItem = {
  type: "vote" | "cosign" | "gratitude";
  title: string;
  subtitle?: string;
  actionLabel: string;
  href?: string;
};

// For Sprint 1, this uses mock data. Sprint 2 will wire it to the real tRPC calls.
const MOCK_ITEMS: InboxItem[] = [];

const ICONS = {
  vote: Vote,
  cosign: Handshake,
  gratitude: Heart,
};

export function AttentionInbox() {
  const items = MOCK_ITEMS; // Will be replaced with real data

  return (
    <GlassCard>
      <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">
        Your Attention
      </h2>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <Leaf className="w-10 h-10 text-[#7dd87d]/40 mx-auto mb-3" />
          <p className="text-white/65 text-sm">You're caught up. Go plant something.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item, i) => {
            const Icon = ICONS[item.type];
            return (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                <Icon className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && <p className="text-white/55 text-xs truncate">{item.subtitle}</p>}
                </div>
                <PillButton variant="secondary" className="text-xs px-3 py-1.5">
                  {item.actionLabel}
                </PillButton>
              </li>
            );
          })}
          {items.length > 5 && (
            <p className="text-[#7dd87d] text-xs text-center cursor-pointer hover:underline">
              Show {items.length - 5} more
            </p>
          )}
        </ul>
      )}
    </GlassCard>
  );
}
