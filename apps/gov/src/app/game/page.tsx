"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gamepad2, Calendar, ArrowRight, Sprout, Users } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PillButton } from "@/components/PillButton";
import { ContributorCard } from "@/components/ContributorCard";
import { fetchFromMainSite } from "@/lib/api";

export default function GameHomePage() {
  const [contributors, setContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFromMainSite<any[]>("claims.listContributors", { limit: 8 })
      .then((rows) => setContributors(rows ?? []))
      .catch((err) => console.error("Failed to load contributors:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <GlassCard className="p-8 md:p-12 text-center">
        <Gamepad2 className="w-10 h-10 text-[#7dd87d] mx-auto mb-4" />
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display, system-ui)" }}>
          Show Us What You've Got
        </h1>
        <p className="text-white/75 text-base md:text-lg max-w-2xl mx-auto mb-3">
          You've been doing this work. Maybe for months, maybe for decades. This is where we start to count it.
        </p>
        <p className="text-white/60 text-sm max-w-2xl mx-auto mb-8">
          Answer some questions, tell a piece of your story, find the shape of your contribution in the ReGen network. Your work gets recognized in $ReGen tokens and lands you on the Contributors page.
        </p>
        <Link href="/game/claim">
          <PillButton className="text-base">
            Claim Your Contributions <ArrowRight className="w-4 h-4 ml-1 inline" />
          </PillButton>
        </Link>
      </GlassCard>

      <GlassCard className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[#7dd87d]" />
          <h2 className="text-xl font-bold text-white">Timeline</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl p-4 bg-[#7dd87d]/10 border border-[#7dd87d]/30">
            <div className="text-[#7dd87d] text-xs font-semibold uppercase tracking-wide mb-1">Open now</div>
            <div className="text-white font-semibold mb-1">Claims are open</div>
            <div className="text-white/60 text-xs">Start your claim any time.</div>
          </div>
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="text-white/55 text-xs font-semibold uppercase tracking-wide mb-1">June Solstice</div>
            <div className="text-white font-semibold mb-1">First Proposal Parties</div>
            <div className="text-white/60 text-xs">Where claims are brought to the circle and confirmed together.</div>
          </div>
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="text-white/55 text-xs font-semibold uppercase tracking-wide mb-1">September Equinox</div>
            <div className="text-white font-semibold mb-1">Claim window closes</div>
            <div className="text-white/60 text-xs">This round of Historical Contribution Accounting ends.</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 md:p-8">
        <h2 className="text-xl font-bold text-white mb-4">How it works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-[#7dd87d] text-3xl font-bold mb-1">1</div>
            <div className="text-white font-semibold mb-1">Answer some questions</div>
            <div className="text-white/60 text-sm">14 short screens. About 15 minutes.</div>
          </div>
          <div>
            <div className="text-[#7dd87d] text-3xl font-bold mb-1">2</div>
            <div className="text-white font-semibold mb-1">Get your tier</div>
            <div className="text-white/60 text-sm">A starting suggestion, not a verdict. You can push back.</div>
          </div>
          <div>
            <div className="text-[#7dd87d] text-3xl font-bold mb-1">3</div>
            <div className="text-white font-semibold mb-1">Join a Proposal Party</div>
            <div className="text-white/60 text-sm">Share a piece of your story and the community confirms together.</div>
          </div>
        </div>
      </GlassCard>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7dd87d]" />
            <h2 className="text-xl font-bold text-white">Contributors</h2>
          </div>
          <Link href="/game/contributors" className="text-[#7dd87d] text-sm hover:underline">See all</Link>
        </div>
        {loading ? (
          <GlassCard className="text-center py-8 text-white/55 text-sm">Loading...</GlassCard>
        ) : contributors.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Sprout className="w-10 h-10 text-[#7dd87d]/40 mx-auto mb-3" />
            <p className="text-white/75 text-sm mb-2">The first Proposal Parties start at the June Solstice.</p>
            <p className="text-white/50 text-xs">Claim your contributions now. We'll notify you when the parties begin.</p>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {contributors.slice(0, 4).map((c) => (
              <ContributorCard key={c.id} contributor={c} />
            ))}
          </div>
        )}
      </div>

      <GlassCard className="p-6 text-center">
        <Calendar className="w-6 h-6 text-[#7dd87d] mx-auto mb-2" />
        <p className="text-white text-sm mb-3">Add our calendar to know when the first Proposal Parties are scheduled</p>
        <a
          href="webcal://calendar.regencivics.earth/proposal-parties.ics"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm border border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/10 transition-colors"
        >
          Subscribe to Proposal Parties
        </a>
      </GlassCard>
    </div>
  );
}
