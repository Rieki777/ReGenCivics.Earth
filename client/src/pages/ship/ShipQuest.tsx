/**
 * /ship/quest - The Free Passage Quest. The heart of the announcement.
 * Full story, seven ways to earn points toward the 150-point entry threshold,
 * the live draw board with the threshold line, the crew cards you can sponsor,
 * and the nomination track callout.
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
import { ShipSection, ShipEyebrow, ShipNavRow, ShipImage, useShipFlags } from "./shipShared";
import { FreeVoyageLadder } from "@/components/ship/FreeVoyageLadder";
import { CrewProfileEditor, CrewsSection } from "@/components/ship/CrewProfiles";
import { useAuth } from "@/_core/hooks/useAuth";

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
  // Only the signed-in view fires the protected myProgress query. Firing it
  // logged out trips the global auth redirect (main.tsx QueryCache handler),
  // which would bounce public visitors of this shareable page to sign-in.
  const { isAuthenticated } = useAuth();
  const actions = trpc.ship.quest.actions.useQuery();
  const leaderboard = trpc.ship.quest.leaderboard.useQuery();
  const myProgress = trpc.ship.quest.myProgress.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const flags = useShipFlags();
  const utils = trpc.useUtils();

  const myByAction = new Map<number, string>((myProgress.data?.completions ?? []).map((c: any) => [c.actionId, c.status]));
  const fv = leaderboard.data?.freeVoyage;
  const unlocked = fv?.freeVoyagesUnlocked ?? 1;
  const totalFree = fv?.freeVoyagesTotal ?? 6;
  const threshold = leaderboard.data?.entryThreshold ?? myProgress.data?.entryThreshold ?? 150;
  const myPoints = myProgress.data?.standing?.verifiedPoints ?? 0;
  const inTheDraw = Boolean(myProgress.data?.inTheDraw);
  const signedIn = !myProgress.isError && myProgress.data != null;

  function refresh() {
    void utils.ship.quest.myProgress.invalidate();
    void utils.ship.quest.leaderboard.invalidate();
    void utils.ship.crew.listPublished.invalidate();
  }

  return (
    <PageWrapper>
      <SEO title="The Free Passage Quest" description="Reach 150 points by August 16 and you are in the drawing for a free voyage. Every point above raises your odds. Winners pick their own dates, and more free voyages unlock as the year books up, up to six." url="/ship/quest" image="/images/ship/ship-quest-banner.jpg" />
      <ShipNavRow current="/ship/quest" />

      {/* Hero */}
      <section className="relative min-h-[46vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-quest-banner.jpg" alt="A trail across Cascadia toward the coast under a rainbow." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-3">The Free Passage Quest</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Reach {threshold} points to qualify for the drawing.</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg text-white drop-shadow">Qualify by August 16 to enter the drawing for a free voyage. Winners pick their own dates. More unlock as the first year books up, up to six.</p>
          <p data-reveal data-reveal-delay="240" className="mt-4 inline-flex items-center gap-2 bg-[#ffd700]/20 border border-[#ffd700]/50 rounded-full px-4 py-2 font-semibold"><Trophy className="w-5 h-5 text-[#ffd700]" /> {unlocked} of {totalFree} free voyages unlocked</p>
        </div>
      </section>

      {/* Your progress toward the threshold (signed in) */}
      {signedIn && (
        <ShipSection className="py-8">
          <div data-reveal className="rounded-2xl border bg-card p-5 max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-lg font-bold">{inTheDraw ? "You are in the draw" : "Your points so far"}</h2>
              <span className="text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{myPoints} / {threshold} points</span>
            </div>
            <div className="h-2 rounded-full bg-[#4a7c59]/15 overflow-hidden">
              <div className="h-full bg-[#ffd700]" style={{ width: `${Math.min(100, Math.round((myPoints / threshold) * 100))}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {inTheDraw
                ? "You are aboard the draw. Every point above the line raises your odds. Now make your crew card so sponsors can find you."
                : `${Math.max(0, threshold - myPoints)} more points and you are in every draw. Any mix of the actions below gets you there.`}
            </p>
            <div className="mt-4">
              <CrewProfileEditor inTheDraw={inTheDraw} existing={myProgress.data?.crewProfile ?? null} onSaved={refresh} />
            </div>
          </div>
        </ShipSection>
      )}

      {/* Story */}
      <ShipSection>
        <p data-reveal className="text-foreground/90 text-lg max-w-3xl">The ship sets sail on her maiden voyage the last full week of July, through Cascadia, anchored at The Sanctuary in Ashland. The quest is open to everyone, and every action in it grows the movement. It announces ReGen Civics, launches Season 2, and fills the treasure map. No single action is required. Reach {threshold} points any way you like.</p>
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
          <p className="text-foreground/85 max-w-3xl mb-4">Reach {threshold} points by August 16 and you are in the draw. On August 16 we hold the first drawing and pull a free voyage from everyone who has qualified. It is a weighted draw, so every point above {threshold} is another raffle ticket and the more you complete the better your odds. Winners pick their own dates from the open weeks. After that first draw, more free voyages unlock as the first year books up, at 40%, 60%, 75%, 85%, and 95% booked, up to six at a fully booked year.</p>

          <p className="text-sm text-muted-foreground max-w-3xl mb-6"><span className="font-semibold text-foreground/80">The fine print:</span> the first drawing does not happen until the whole crew has earned 5,000 points together, counted across everyone in the quest. That collective line is separate from your own {threshold} points. Your {threshold} qualifies you for the draw; the crew reaching 5,000 together is what opens it.</p>

          <div className="max-w-3xl">
            <FreeVoyageLadder />
          </div>
        </div>
      </ShipSection>

      {/* The seven ways to earn points */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>The ways to earn</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-2">{(actions.data?.length ?? 0) > 0 ? `${actions.data?.length} ways to earn your voyage` : "Ways to earn your voyage"}</h2>
        <p className="text-foreground/80 mb-5 max-w-3xl">Reach {threshold} points and you are in every draw. Every point above raises your odds. No single action is required, so pick the ones that fit you. Six of them come from her current docking, <Link href="/ship/theme" className="underline decoration-2 underline-offset-4 font-semibold">The Sanctuary of Love</Link>.</p>
        {!isAuthenticated && <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">Sign in to track your progress and submit proofs.</p>}
        <div className="space-y-3">
          {(actions.data ?? []).map((a) => (
            <ActionRow key={a.id} action={a} myStatus={myByAction.get(a.id)} onSubmitted={refresh} />
          ))}
          {actions.isLoading && <p className="text-sm text-muted-foreground">Loading the ways to earn…</p>}
          {!actions.isLoading && (actions.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">The quest opens with the announcement. Check back shortly.</p>}
        </div>
      </ShipSection>

      {/* The draw board (threshold line) */}
      <ShipSection>
        <ShipEyebrow>The draw board</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-1">Reach {threshold} points and you are aboard the draw</h2>
        <p className="text-sm text-muted-foreground mb-5">The line marks {threshold} points. Above it, you are in every draw. Your points are your raffle tickets.</p>
        <div className="space-y-2">
          {(() => {
            const standings = (leaderboard.data?.standings ?? []) as any[];
            const firstBelow = standings.findIndex((s) => !s.isEntered);
            return standings.map((s: any, i: number) => (
              <div key={s.userId}>
                {i === firstBelow && (
                  <div className="flex items-center gap-3 my-3" aria-hidden="true">
                    <div className="h-px flex-1 bg-[#ffd700]" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#b8860b] dark:text-[#ffd700]">{threshold}-point line</span>
                    <div className="h-px flex-1 bg-[#ffd700]" />
                  </div>
                )}
                <div data-reveal data-reveal-delay={Math.min(i, 8) * 40} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="w-8 text-center font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium">{s.handle ? `@${s.handle}` : s.name}</span>
                    {s.isEntered
                      ? <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#ffd700]/40 rounded-full px-2 py-0.5"><Anchor className="w-3 h-3" /> Aboard the draw</span>
                      : <span className="ml-2 text-xs bg-[#4a7c59]/15 rounded-full px-2 py-0.5 text-muted-foreground">On the way</span>}
                  </div>
                  <span className="text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{s.verifiedPoints} pts</span>
                </div>
              </div>
            ));
          })()}
          {(leaderboard.data?.standings?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No crews yet. Be the first aboard the draw.</p>}
        </div>
      </ShipSection>

      {/* The crews (sponsorable cards) */}
      <ShipSection className="bg-[#4a7c59]/8">
        <CrewsSection sponsorEnabled={Boolean(flags.sponsor)} />
      </ShipSection>

      {/* Nomination callout */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <h2 className="text-2xl font-bold mb-2">The nomination track</h2>
        <p className="text-white/85 mb-4 max-w-2xl">Anyone can nominate anyone, including themselves, who would be a vital resource touring a bioregion: builders, mediators, food forest designers, storytellers. If you are nominated and approved by the ReGen Civics and CORE teams, you are in the draw, no quest required.</p>
        <Button asChild variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20"><Link href="/ship/nominate">Nominate someone</Link></Button>
      </ShipSection>
    </PageWrapper>
  );
}
