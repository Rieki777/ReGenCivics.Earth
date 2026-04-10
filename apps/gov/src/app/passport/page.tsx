"use client";

import { UserCircle, Shield, Vote, BookOpen, CheckCircle2, ArrowRight, Wallet } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";

/**
 * Passport page (Sprint 5).
 * Governance identity card, delegation status, governance handbook link.
 * Uses mock data until tRPC is wired.
 */

const QUESTS = [
  { slug: "read-handbook", title: "Read the Governance Handbook", done: false },
  { slug: "first-comment", title: "Comment on a proposal", done: false },
  { slug: "first-vote", title: "Cast your first vote", done: false },
  { slug: "create-proposal", title: "Create a proposal", done: false },
  { slug: "delegate", title: "Delegate your voice", done: false },
  { slug: "propose-upgrade", title: "Propose a dashboard upgrade", done: false },
];

export default function PassportPage() {
  const tier = "Explorer";
  const handle = "@rye";
  const questsDone = 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle className="w-7 h-7 text-[#7dd87d]" />
        <div>
          <h1 className="text-3xl font-bold text-white">Governance Passport</h1>
          <p className="text-white/55 text-sm">Your identity in the governance system</p>
        </div>
      </div>

      {/* Identity card */}
      <GlassCard className="bg-gradient-to-br from-[rgba(26,71,42,0.9)] to-[rgba(13,40,24,0.9)] border-[#7dd87d]/30">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-10 h-10 text-[#7dd87d]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xl">{handle}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7dd87d]/15 text-[#7dd87d] border border-[#7dd87d]/30 font-bold uppercase tracking-wider">
                {tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <p className="text-white font-bold text-lg">0</p>
                <p className="text-white/55 text-[10px]">Proposals created</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">0</p>
                <p className="text-white/55 text-[10px]">Votes cast</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{questsDone}/6</p>
                <p className="text-white/55 text-[10px]">Quests done</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Governance quests */}
        <GlassCard>
          <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-4">
            Governance Quest Chain
          </h2>
          <p className="text-white/55 text-xs mb-4">
            Six quests that teach you how the deliberation system works. Complete them to level up your governance passport.
          </p>
          <ul className="space-y-2">
            {QUESTS.map((q) => (
              <li key={q.slug} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                {q.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-white/30 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${q.done ? "text-white/55 line-through" : "text-white"}`}>
                  {q.title}
                </span>
                {!q.done && <ArrowRight className="w-3 h-3 text-white/55" />}
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Delegation + handbook */}
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-[10px] uppercase tracking-widest text-[#d4a574] font-bold mb-4">
              Delegation
            </h2>
            <div className="text-center py-4">
              <Vote className="w-10 h-10 text-[#d4a574]/50 mx-auto mb-2" />
              <p className="text-white/65 text-sm">You haven't delegated your voice yet.</p>
              <p className="text-white/45 text-xs mt-1">
                Delegation lets a trusted community member vote on your behalf for specific topics. You can override any delegated vote by voting directly.
              </p>
              <PillButton variant="secondary" className="mt-4 text-xs px-4 py-2">
                Set up delegation
              </PillButton>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-[10px] uppercase tracking-widest text-[#7dd87d] font-bold mb-3">
              Living Governance Handbook
            </h2>
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white/80 text-sm">
                  How decisions work, what the tiers mean, how seasonal festivals run, and why we built it this way.
                </p>
                <PillButton variant="secondary" className="mt-3 text-xs px-4 py-2">
                  Read the handbook
                </PillButton>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-[10px] uppercase tracking-widest text-[#d4a574] font-bold mb-3">
              Base Wallet
            </h2>
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-[#d4a574] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white/80 text-sm">
                  Your embedded Privy wallet on Base. Used for claiming governance tokens to Hypha when you cross the threshold.
                </p>
                <p className="text-white/45 text-xs mt-2 font-mono">
                  (Connect via the Privy login to see your wallet address)
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
