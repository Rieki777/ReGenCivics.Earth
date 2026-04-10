"use client";

import { Vote, Plus, Clock, CheckCircle2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import Link from "next/link";

/**
 * Proposals list page (Sprint 2 UI + Sprint 6 polish).
 * Shows active proposals grouped by status. Skeleton states for empty lists.
 * Uses sample data until the gov app has its own tRPC client.
 */

type ProposalSummary = {
  id: number;
  title: string;
  status: string;
  track: string;
  authorHandle: string;
  voteCount: number;
  commentCount: number;
  createdAt: string;
};

const SAMPLE_PROPOSALS: ProposalSummary[] = [
  { id: 1, title: "Fund the Skagit Seed Library for $2,500", status: "polling", track: "fund", authorHandle: "@lea", voteCount: 18, commentCount: 23, createdAt: "2026-04-05" },
  { id: 2, title: "Adopt soil health reporting standard for all bioregions", status: "discussion", track: "operational", authorHandle: "@rye", voteCount: 0, commentCount: 8, createdAt: "2026-04-07" },
  { id: 3, title: "Create a courier role for the local food economy game", status: "staged", track: "game", authorHandle: "@jordan", voteCount: 34, commentCount: 47, createdAt: "2026-03-28" },
];

const STATUS_STYLE: Record<string, { color: string; Icon: typeof Vote; label: string }> = {
  draft: { color: "text-white/55", Icon: Clock, label: "Draft" },
  discussion: { color: "text-blue-300", Icon: Vote, label: "Discussion" },
  polling: { color: "text-[#7dd87d]", Icon: Vote, label: "Polling" },
  staged: { color: "text-amber-300", Icon: Sparkles, label: "Staged for season" },
  ratified: { color: "text-emerald-300", Icon: CheckCircle2, label: "Ratified" },
  declined: { color: "text-red-300", Icon: XCircle, label: "Declined" },
};

export default function ProposalsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Vote className="w-7 h-7 text-[#7dd87d]" />
          <h1 className="text-3xl font-bold text-white">Proposals</h1>
        </div>
        <PillButton className="text-sm">
          <Plus className="w-4 h-4 mr-1 inline" />
          New Proposal
        </PillButton>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "discussion", "polling", "staged", "ratified"].map((status) => (
          <button
            key={status}
            className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-white/65 hover:bg-white/10 transition-colors capitalize"
          >
            {status === "all" ? "All active" : status}
          </button>
        ))}
      </div>

      {/* Proposal cards */}
      {SAMPLE_PROPOSALS.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Vote className="w-10 h-10 text-[#7dd87d]/40 mx-auto mb-3" />
          <p className="text-white/65 text-sm mb-2">No proposals yet.</p>
          <p className="text-white/45 text-xs">Start a conversation in the forum, then promote it here.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {SAMPLE_PROPOSALS.map((p) => {
            const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
            const Icon = style.Icon;
            return (
              <GlassCard key={p.id} className="hover:border-[rgba(125,216,125,0.3)] cursor-pointer">
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-white font-bold text-base">{p.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/55 flex-wrap">
                      <span className={`${style.color} font-bold capitalize`}>{style.label}</span>
                      <span className="capitalize px-2 py-0.5 rounded-full bg-white/10">{p.track}</span>
                      <span>by {p.authorHandle}</span>
                      <span>{p.voteCount} votes</span>
                      <span>{p.commentCount} comments</span>
                      <span>{p.createdAt}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/55 flex-shrink-0 mt-1" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
