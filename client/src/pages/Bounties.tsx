/**
 * /bounties — the public Bounty Board. Open and completed work the community
 * can pull from, with transparent rewards. The board is empty in production
 * today, so the recruiting empty state is the first thing most people see;
 * it is written to be warm and clear.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, Coins, Users, ArrowRight, Plus, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { AnimatedSection } from "@/components/AnimatedSection";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BountyBoard } from "@/components/bounty/BountyBoard";
import { RecentlyCompleted } from "@/components/bounty/RecentlyCompleted";

function ProposeBountyDialog() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState<"trivial" | "small" | "medium" | "large">("small");

  const propose = trpc.bounties.propose.useMutation({
    onSuccess: () => {
      toast.success("Proposed. A maintainer will review and open it.");
      utils.bounties.listBoard.invalidate();
      setOpen(false);
      setTitle(""); setBody("");
    },
    onError: (e) => toast.error(e.message),
  });

  const inputCls = "w-full rounded-md bg-[#0f2417] border border-white/15 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#7dd87d]/50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"><Plus className="w-4 h-4 mr-1" /> Propose a bounty</Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d2818] border-[#7dd87d]/25 text-white">
        <DialogHeader><DialogTitle style={{ fontFamily: "var(--font-display)" }}>Propose a bounty</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/60">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} className={inputCls} placeholder="What needs doing?" />
          </div>
          <div>
            <label className="text-xs text-white/60">Details</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="The outcome, and why it matters." />
          </div>
          <div>
            <label className="text-xs text-white/60">Size</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} className={inputCls}>
              <option value="trivial">Trivial, a quick favor</option>
              <option value="small">Small, one clear deliverable</option>
              <option value="medium">Medium, a real piece of work</option>
              <option value="large">Large, a substantial build</option>
            </select>
          </div>
          <p className="text-[11px] text-white/60">A maintainer confirms the size and impact, and the engine sets a transparent reward before it opens for claiming.</p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => propose.mutate({ sourceType: "call_task", title, body, tier })}
            disabled={!title.trim() || !body.trim() || propose.isPending}
            className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
          >
            {propose.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Bounties() {
  const { isAuthenticated } = useAuth();
  const [counts, setCounts] = useState({ count: 0, totalReward: 0, circles: 0 });
  const mine = trpc.bounties.listMine.useQuery({}, { enabled: isAuthenticated, staleTime: 60_000 });
  const activeMine = (mine.data ?? []).filter((r: any) => ["filled", "payable", "held"].includes(r.payStatus)).length;

  const recruitingEmptyState = (
    <div className="text-center py-16 px-4 border border-[#7dd87d]/20 rounded-2xl bg-[#7dd87d]/[0.04]">
      <Sparkles className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>The board is quiet right now</h3>
      <p className="text-white/65 max-w-md mx-auto mb-6">
        Bounties are born from community sessions: someone names a real need on a call, and it becomes paid work anyone can claim.
        Come to a session or host one, and watch the board fill.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/quest" className="inline-flex items-center gap-1 rounded-lg bg-[#7dd87d] text-[#1a472a] font-semibold px-4 py-2 text-sm hover:bg-[#9de89d]">
          Explore quests <ArrowRight className="w-4 h-4" />
        </Link>
        {isAuthenticated ? <ProposeBountyDialog /> : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Bounties | ReGen Civics"
        description="Claim a bounty and earn $ReGen for real regenerative work. Open work from community sessions, with transparent, community-governed rewards."
        url="/bounties"
      />
      <BackButton />

      <section className="relative pt-24 pb-8 px-4">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto text-center">
            <Sparkles className="w-10 h-10 text-[#7dd87d] mx-auto mb-4" />
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>Bounties</h1>
            <p className="text-white/70 max-w-2xl mx-auto">
              Real work the movement needs, with a transparent reward for each. Claim what fits your role, ship it, get paid in $ReGen.
            </p>
            {/* Live stats strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-white/80"><Sparkles className="w-4 h-4 text-[#7dd87d]" /> {counts.count} open</span>
              <span className="inline-flex items-center gap-1.5 text-white/80"><Coins className="w-4 h-4 text-[#7dd87d]" /> {counts.totalReward.toLocaleString()} $ReGen available</span>
              {counts.circles > 0 ? <span className="inline-flex items-center gap-1.5 text-white/80"><Users className="w-4 h-4 text-[#7dd87d]" /> {counts.circles} circles need help</span> : null}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* My work rail */}
      {isAuthenticated && activeMine > 0 ? (
        <section className="max-w-6xl mx-auto px-4 mb-4">
          <Link href="/profile?tab=tasks" className="flex items-center justify-between rounded-xl border border-[#7dd87d]/25 bg-[#7dd87d]/[0.06] px-4 py-3 text-sm hover:bg-[#7dd87d]/10">
            <span className="text-white/85">You are working on {activeMine} {activeMine === 1 ? "bounty" : "bounties"}</span>
            <span className="inline-flex items-center gap-1 text-[#7dd87d]">Go to your Tasks <ArrowRight className="w-4 h-4" /></span>
          </Link>
        </section>
      ) : null}

      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-end mb-4">{isAuthenticated ? <ProposeBountyDialog /> : null}</div>
        <BountyBoard emptyState={recruitingEmptyState} onCounts={setCounts} />
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24">
        <RecentlyCompleted />
      </section>
    </div>
  );
}
