/**
 * /ship/quest - The Maiden Voyage Quest. The heart of the announcement.
 * Full story, the 7-action checklist with submission, the live leaderboard
 * (finish order + top-3 winner slots), and the nomination track callout.
 */
import { useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trophy, Anchor, Check } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow, ShipImage } from "./shipShared";

function ActionRow({ action, myStatus, onSubmitted }: { action: any; myStatus?: string; onSubmitted: () => void }) {
  const submit = trpc.ship.quest.submit.useMutation();
  const [proofUrl, setProofUrl] = useState("");
  const verified = myStatus === "verified";
  const pending = myStatus === "pending";

  async function doSubmit() {
    try {
      const res = await submit.mutateAsync({ actionId: action.id, proofUrl: proofUrl || undefined });
      toast.success(res.status === "verified" ? "Verified. Well sailed." : "Submitted for verification.");
      setProofUrl("");
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message ?? "Please sign in to enter the quest.");
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${verified ? "bg-[#4a7c59]/10 border-[#4a7c59]" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {verified && <Check className="w-4 h-4 text-[#2f5d3a] dark:text-[#9de89d]" />}
            <h3 className="font-semibold">{action.title}</h3>
          </div>
          {action.description && <p className="text-sm text-foreground/80 mt-1">{action.description}</p>}
        </div>
        <span className="shrink-0 text-sm font-bold text-[#2f5d3a] dark:text-[#9de89d] bg-[#ffd700]/30 rounded-full px-3 py-1">{action.points} pts</span>
      </div>
      {!verified && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          {(action.proofType === "link" || action.proofType === "photo" || action.proofType === "forum") && (
            <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Paste your proof link" className="text-sm" />
          )}
          <Button size="sm" onClick={doSubmit} disabled={submit.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f] shrink-0">
            {pending ? "Resubmit" : "Submit"}
          </Button>
        </div>
      )}
      {pending && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Submitted. Waiting on verification.</p>}
    </div>
  );
}

export default function ShipQuest() {
  const actions = trpc.ship.quest.actions.useQuery();
  const leaderboard = trpc.ship.quest.leaderboard.useQuery();
  const myProgress = trpc.ship.quest.myProgress.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const myByAction = new Map<number, string>((myProgress.data?.completions ?? []).map((c: any) => [c.actionId, c.status]));
  const fv = leaderboard.data?.freeVoyage;
  const unlocked = fv?.freeVoyagesUnlocked ?? 1;
  const totalFree = fv?.freeVoyagesTotal ?? 6;
  const percentBookedNow = fv?.percentBooked ?? 0;
  const poolSize = leaderboard.data?.poolSize ?? 0;

  function refresh() {
    void utils.ship.quest.myProgress.invalidate();
    void utils.ship.quest.leaderboard.invalidate();
  }

  return (
    <PageWrapper>
      <SEO title="The Maiden Voyage Quest" description="Complete the quest and you're in the draw. The maiden voyage sails free, and every 20% of the year that books unlocks another free voyage, up to six." url="/ship/quest" image="/images/ship/ship-quest-banner.jpg" />
      <ShipNavRow current="/ship/quest" />

      {/* Hero */}
      <section className="relative min-h-[46vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-quest-banner.jpg" alt="A trail across Cascadia toward the coast under a rainbow." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-3">The Maiden Voyage Quest</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Complete the quest. Sail free.</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg text-white drop-shadow">Everyone who completes the quest goes in the draw. The maiden voyage sails free, and every 20% of the year that books unlocks one more free voyage, up to six.</p>
          <p data-reveal data-reveal-delay="240" className="mt-4 inline-flex items-center gap-2 bg-[#ffd700]/20 border border-[#ffd700]/50 rounded-full px-4 py-2 font-semibold"><Trophy className="w-5 h-5 text-[#ffd700]" /> {unlocked} of {totalFree} free voyages unlocked</p>
        </div>
      </section>

      {/* Story */}
      <ShipSection>
        <p data-reveal className="text-foreground/90 text-lg max-w-3xl">The ship sets sail on her maiden voyage this August, through Cascadia, anchored at The Sanctuary in Ashland. The quest is open to everyone, and every action in it grows the movement. It announces ReGen Civics, launches Season 2, and fills the treasure map. It takes at least a week to complete, on purpose, so no one has to rush.</p>
        <div data-reveal data-reveal-delay="80" className="mt-4 flex flex-wrap gap-3">
          <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/blog/the-regen-ship">Read the full story</Link></Button>
          <Button asChild variant="outline"><Link href="/ship/quest/rules">Read the official rules</Link></Button>
          <Button asChild variant="outline"><Link href="/ship/nominate">Nominate a crew member</Link></Button>
        </div>
      </ShipSection>

      {/* How the free voyages are given away */}
      <ShipSection className="bg-[#4a7c59]/8">
        <div data-reveal>
          <ShipEyebrow>How the free voyages work</ShipEyebrow>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">The more we book, the more sail free</h2>
          <p className="text-foreground/85 max-w-3xl mb-6">Complete the quest and your name goes in the draw. The maiden voyage sails free right away. Then, for every 20% of the first year that gets booked, we draw one more free voyage from everyone who has completed the quest. At a full year booked, six crews sail free. If you want a better chance, help us get the word out: more bookings means more free voyages, and every completer is in every draw.</p>

          {/* Free-voyage meter */}
          <div className="rounded-2xl border bg-card p-6 max-w-3xl">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-semibold">Free voyages unlocked</span>
              <span className="text-2xl font-bold text-[#2f5d3a] dark:text-[#9de89d]">{unlocked} <span className="text-base font-normal text-muted-foreground">of {totalFree}</span></span>
            </div>
            <div className="flex gap-1.5 mb-4" aria-hidden="true">
              {Array.from({ length: totalFree }).map((_, i) => (
                <div key={i} className={`h-3 flex-1 rounded-full ${i < unlocked ? "bg-[#ffd700]" : "bg-[#4a7c59]/20"}`} />
              ))}
            </div>
            <div className="flex items-baseline justify-between text-sm text-muted-foreground mb-1">
              <span>First year booked</span>
              <span>{percentBookedNow}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#4a7c59]/15 overflow-hidden">
              <div className="h-full bg-[#4a7c59] transition-all duration-700" style={{ width: `${percentBookedNow}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-4">{poolSize} {poolSize === 1 ? "crew has" : "crews have"} completed the quest and {poolSize === 1 ? "is" : "are"} in the draw. Ties are always settled at random.</p>
          </div>
        </div>
      </ShipSection>

      {/* Checklist */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>The checklist</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-5">Seven actions to earn your voyage</h2>
        {myProgress.isError && <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">Sign in to track your progress and submit proofs.</p>}
        <div className="space-y-3">
          {(actions.data ?? []).map((a) => (
            <ActionRow key={a.id} action={a} myStatus={myByAction.get(a.id)} onSubmitted={refresh} />
          ))}
          {actions.isLoading && <p className="text-sm text-muted-foreground">Loading the checklist…</p>}
          {!actions.isLoading && (actions.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">The quest opens with the announcement. Check back shortly.</p>}
        </div>
      </ShipSection>

      {/* The draw pool */}
      <ShipSection>
        <ShipEyebrow>The crews</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-5">Everyone who completes the quest is in the draw</h2>
        <div className="space-y-2">
          {(leaderboard.data?.standings ?? []).map((s: any, i: number) => (
            <div key={s.userId} data-reveal data-reveal-delay={Math.min(i, 8) * 40} className="flex items-center gap-3 rounded-lg border p-3">
              <span className="w-8 text-center font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex-1">
                <span className="font-medium">{s.handle ? `@${s.handle}` : s.name}</span>
                {s.isFinisher
                  ? <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#ffd700]/40 rounded-full px-2 py-0.5"><Anchor className="w-3 h-3" /> In the draw</span>
                  : <span className="ml-2 text-xs bg-[#4a7c59]/15 rounded-full px-2 py-0.5 text-muted-foreground">On the way</span>}
              </div>
              <span className="text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{s.verifiedPoints} pts</span>
            </div>
          ))}
          {(leaderboard.data?.standings?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No crews yet. Be the first to set sail.</p>}
        </div>
      </ShipSection>

      {/* Nomination callout */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <h2 className="text-2xl font-bold mb-2">The nomination track</h2>
        <p className="text-white/85 mb-4 max-w-2xl">Anyone can nominate anyone, including themselves, who would be a vital resource touring a bioregion: builders, mediators, food forest designers, storytellers. The church council selects one nominee for a bonus crew slot.</p>
        <Button asChild variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20"><Link href="/ship/nominate">Nominate someone</Link></Button>
      </ShipSection>
    </PageWrapper>
  );
}
