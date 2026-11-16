/**
 * /ship/quest - the ship's quest. Ways to earn points toward the 150-point
 * line, the quest board, the crew cards you can sponsor, and the nomination
 * track. Since 15 Nov 2026 the ship is rented (book a voyage) or bought into,
 * and this page promises no prize.
 */
import { useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Anchor, Check, Share2 } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow, ShipImage, useShipFlags } from "./shipShared";
import { CrewProfileEditor, CrewsSection } from "@/components/ship/CrewProfiles";
import { CrewPooling } from "@/components/ship/CrewPooling";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Item 10: the referral share button on the "Refer a land project" action.
 * Generates the user's /apply?ref=<handle> link and opens the native share
 * sheet with a pre-filled message. Signing in first is required so the referral
 * is attributed (the server matches ?ref against the user's handle).
 */
function ReferralShareButton() {
  const { isAuthenticated, user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const handle = (user as { handle?: string } | null)?.handle;

  async function share() {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (!handle) {
      toast.error("Set a handle on your profile first, so your referral tracks to you.");
      return;
    }
    const url = `${window.location.origin}/apply?ref=${encodeURIComponent(handle)}`;
    const message = "Hey, I think you'd be interested in this for your project";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "ReGen Civics", text: message, url });
      } else {
        await navigator.clipboard.writeText(`${message}: ${url}`);
        toast.success("Referral link copied. Send it to a land project.");
      }
    } catch {
      // The user dismissed the share sheet; nothing to do.
    }
  }

  return (
    <div className="mt-3">
      <Button size="sm" onClick={share} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
        <Share2 className="w-4 h-4 mr-1.5" aria-hidden="true" /> Share my referral link
      </Button>
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground mt-2">Sign in first so your referral is tracked to you.</p>
      )}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onLogin={() => setAuthOpen(false)}
        title="Sign in so your referral is tracked"
      />
    </div>
  );
}

function ActionRow({ action, myStatus, onSubmitted }: { action: any; myStatus?: string; onSubmitted: () => void }) {
  const submit = trpc.ship.quest.submit.useMutation();
  const verified = myStatus === "verified";
  const pending = myStatus === "pending";
  const auto = action.verificationType === "auto";
  const threadUrl = action.forumPostId ? `/community/${action.forumPostId}` : null;
  // Multi-submission quests stay actionable after the first verify (up to the cap).
  const canAct = !verified || (action.maxSubmissions ?? 1) > 1;

  async function checkGameQuest() {
    try {
      const res = await submit.mutateAsync({ actionId: action.id });
      toast.success(res.status === "verified" ? "Verified. Well sailed." : "Not yet. Finish the Food Foresting quest first, then check again.");
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message ?? "Please sign in to enter the quest.");
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${verified ? "bg-[#4a7c59]/10 border-[#4a7c59]" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {verified && <Check className="w-4 h-4 text-[#2f5d3a] dark:text-[#9de89d]" />}
            <h3 className="font-semibold">{action.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${auto ? "bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#9de89d]" : "bg-[#ffd700]/25 text-[#8a6a0b] dark:text-[#ffe07a]"}`}>
              {auto ? "Auto-verified" : "Crew-verified"}
            </span>
          </div>
          {action.description && <p className="text-sm text-foreground/80 mt-1">{action.description}</p>}
        </div>
        <span className="shrink-0 text-sm font-bold text-[#2f5d3a] dark:text-[#9de89d] bg-[#ffd700]/30 rounded-full px-3 py-1">
          {action.points} pts{(action.maxSubmissions ?? 1) > 1 ? " each" : ""}
        </span>
      </div>
      {canAct && (
        <div className="mt-3">
          {threadUrl ? (
            <Button asChild size="sm" className="bg-[#2f5d3a] hover:bg-[#264a2f]">
              <Link href={threadUrl}>{auto ? "Post in the thread" : "Post your proof in the thread"}</Link>
            </Button>
          ) : action.slug === "refer-land-project" ? (
            <ReferralShareButton />
          ) : action.proofType === "game_quest" ? (
            <Button size="sm" onClick={checkGameQuest} disabled={submit.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f]">Check my progress</Button>
          ) : (
            <p className="text-sm text-muted-foreground">Verifies automatically when you use the Galley.</p>
          )}
        </div>
      )}
      {pending && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Posted. Waiting on a crew member to verify.</p>}
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
  const threshold = leaderboard.data?.entryThreshold ?? myProgress.data?.entryThreshold ?? 150;
  const myPoints = myProgress.data?.standing?.verifiedPoints ?? 0;
  const qualified = Boolean(myProgress.data?.qualified);
  const signedIn = !myProgress.isError && myProgress.data != null;

  function refresh() {
    void utils.ship.quest.myProgress.invalidate();
    void utils.ship.quest.leaderboard.invalidate();
    void utils.ship.crew.listPublished.invalidate();
  }

  return (
    <PageWrapper>
      <SEO title="The ReGen Ship Quest" description="Earn points with actions that grow the movement. Reach 150 points and your crew card goes public, where sponsors can back your week aboard the ReGen Ship." url="/ship/quest" image="/images/ship/ship-quest-banner.jpg" />
      <ShipNavRow current="/ship/quest" />

      {/* Hero */}
      <section className="relative min-h-[46vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-quest-banner.jpg" alt="A trail across Cascadia toward the coast under a rainbow." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-white">
          <p data-reveal className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-3">The ReGen Ship Quest</p>
          <h1 data-reveal data-reveal-delay="80" className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Reach {threshold} points and raise your crew card.</h1>
          <p data-reveal data-reveal-delay="160" className="text-lg text-white drop-shadow">Every action grows the movement. Past the line, your crew card goes public, where sponsors can back your week aboard.</p>
        </div>
      </section>

      {/* Your progress toward the threshold (signed in) */}
      {signedIn && (
        <ShipSection className="py-8">
          <div data-reveal className="rounded-2xl border bg-card p-5 max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="text-lg font-bold">{qualified ? "You are past the line" : "Your points so far"}</h2>
              <span className="text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{myPoints} / {threshold} points</span>
            </div>
            <div className="h-2 rounded-full bg-[#4a7c59]/15 overflow-hidden">
              <div className="h-full bg-[#ffd700]" style={{ width: `${Math.min(100, Math.round((myPoints / threshold) * 100))}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {qualified
                ? "You are past the line. Now make your crew card so sponsors can find you."
                : `${Math.max(0, threshold - myPoints)} more points and your crew card can go public. Any mix of the actions below gets you there.`}
            </p>
            <div className="mt-4">
              <CrewProfileEditor qualified={qualified} existing={myProgress.data?.crewProfile ?? null} onSaved={refresh} />
            </div>
          </div>
        </ShipSection>
      )}

      {/* Crew pooling (item 13): qualified crews pool + get matched by open weeks. */}
      {isAuthenticated && (
        <ShipSection className="py-8">
          <CrewPooling />
        </ShipSection>
      )}

      {/* Story */}
      <ShipSection>
        <p data-reveal className="text-foreground/90 text-lg max-w-3xl">The ship sets sail on her maiden voyage the last full week of July, through Cascadia, anchored at The Sanctuary in Ashland. The quest is open to everyone, and every action in it grows the movement. It announces ReGen Civics, launches Season 2, and fills the treasure map. No single action is required. Reach {threshold} points any way you like.</p>
        <div data-reveal data-reveal-delay="80" className="mt-4 flex flex-wrap gap-3">
          <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f]"><Link href="/blog/the-regen-ship">Read the full story</Link></Button>
          <Button asChild variant="outline"><Link href="/ship/nominate">Nominate a crew member</Link></Button>
        </div>
      </ShipSection>

      {/* The seven ways to earn points */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>The ways to earn</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-2">{(actions.data?.length ?? 0) > 0 ? `${actions.data?.length} ways to earn points` : "Ways to earn points"}</h2>
        <p className="text-foreground/80 mb-5 max-w-3xl">Reach {threshold} points and your crew card can go public. No single action is required, so pick the ones that fit you. Six of them come from her current docking, <Link href="/ship/theme" className="underline decoration-2 underline-offset-4 font-semibold">The Sanctuary of Love</Link>.</p>
        {!isAuthenticated && <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">Sign in to track your progress and submit proofs.</p>}
        <div className="space-y-3">
          {(actions.data ?? []).map((a) => (
            <ActionRow key={a.id} action={a} myStatus={myByAction.get(a.id)} onSubmitted={refresh} />
          ))}
          {actions.isLoading && <p className="text-sm text-muted-foreground">Loading the ways to earn…</p>}
          {!actions.isLoading && (actions.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">The quest opens with the announcement. Check back shortly.</p>}
        </div>
      </ShipSection>

      {/* The quest board (threshold line) */}
      <ShipSection>
        <ShipEyebrow>The quest board</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-1">Reach {threshold} points and your crew card can go public</h2>
        <p className="text-sm text-muted-foreground mb-5">The line marks {threshold} points.</p>
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
                      ? <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#ffd700]/40 rounded-full px-2 py-0.5"><Anchor className="w-3 h-3" /> Past the line</span>
                      : <span className="ml-2 text-xs bg-[#4a7c59]/15 rounded-full px-2 py-0.5 text-muted-foreground">On the way</span>}
                  </div>
                  <span className="text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]">{s.verifiedPoints} pts</span>
                </div>
              </div>
            ));
          })()}
          {(leaderboard.data?.standings?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No crews yet. Be the first on the board.</p>}
        </div>
      </ShipSection>

      {/* The crews (sponsorable cards) */}
      <ShipSection className="bg-[#4a7c59]/8">
        <CrewsSection sponsorEnabled={Boolean(flags.sponsor)} />
      </ShipSection>

      {/* Nomination callout */}
      <ShipSection className="bg-[#2f5d3a] text-white">
        <h2 className="text-2xl font-bold mb-2">The nomination track</h2>
        <p className="text-white/85 mb-4 max-w-2xl">Anyone can nominate anyone, including themselves, who would be a vital resource touring a bioregion: builders, mediators, food forest designers, storytellers. If you are nominated and approved by the ReGen Civics and CORE teams, you can raise a crew card for sponsors, no quest required.</p>
        <Button asChild variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20"><Link href="/ship/nominate">Nominate someone</Link></Button>
      </ShipSection>
    </PageWrapper>
  );
}
