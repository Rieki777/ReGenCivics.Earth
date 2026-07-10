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
            {verified && <Check className="w-4 h-4 text-[#2f5d3a]" />}
            <h3 className="font-semibold">{action.title}</h3>
          </div>
          {action.description && <p className="text-sm text-foreground/80 mt-1">{action.description}</p>}
        </div>
        <span className="shrink-0 text-sm font-bold text-[#2f5d3a] bg-[#ffd700]/30 rounded-full px-3 py-1">{action.points} pts</span>
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
      {pending && <p className="text-xs text-amber-700 mt-2">Submitted. Waiting on verification.</p>}
    </div>
  );
}

export default function ShipQuest() {
  const actions = trpc.ship.quest.actions.useQuery();
  const leaderboard = trpc.ship.quest.leaderboard.useQuery();
  const myProgress = trpc.ship.quest.myProgress.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const myByAction = new Map<number, string>((myProgress.data?.completions ?? []).map((c: any) => [c.actionId, c.status]));
  const remaining = leaderboard.data?.remainingSlots ?? 3;

  function refresh() {
    void utils.ship.quest.myProgress.invalidate();
    void utils.ship.quest.leaderboard.invalidate();
  }

  return (
    <PageWrapper>
      <SEO title="The Maiden Voyage Quest" description="The first three to complete the quest sail free. Open to everyone." url="/ship/quest" image="/images/ship/ship-quest-banner.jpg" />
      <ShipNavRow current="/ship/quest" />

      {/* Hero */}
      <section className="relative min-h-[46vh] flex items-center justify-center text-center overflow-hidden">
        <ShipImage name="ship-quest-banner.jpg" alt="A trail across Cascadia toward the coast under a rainbow." rounded={false} className="absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-white">
          <p className="uppercase tracking-widest text-sm font-semibold text-[#ffd700] mb-3">The Maiden Voyage Quest</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Her first crews are earned, not chosen</h1>
          <p className="text-lg text-white/90">The first three to complete the quest win a maiden-voyage-season voyage, free.</p>
          <p className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2"><Trophy className="w-5 h-5 text-[#ffd700]" /> {remaining} of 3 crews still to be claimed</p>
        </div>
      </section>

      {/* Story */}
      <ShipSection>
        <p className="text-foreground/90 text-lg max-w-3xl">The ship sets sail on her maiden voyage this August, through Cascadia, anchored at The Sanctuary in Ashland. The quest is open to everyone, and every action in it grows the movement. It announces ReGen Civics, launches Season 2, and fills the treasure map. Finish order is the timestamp of your last verified required action. Finisher one picks their week first.</p>
        <div className="mt-4 flex gap-3">
          <Button asChild variant="outline"><Link href="/ship/quest/rules">Read the official rules</Link></Button>
          <Button asChild variant="outline"><Link href="/ship/nominate">Nominate a crew member</Link></Button>
        </div>
      </ShipSection>

      {/* Checklist */}
      <ShipSection className="bg-[#4a7c59]/8">
        <ShipEyebrow>The checklist</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-5">Seven actions to earn your voyage</h2>
        {myProgress.isError && <p className="text-sm text-amber-700 mb-4">Sign in to track your progress and submit proofs.</p>}
        <div className="space-y-3">
          {(actions.data ?? []).map((a) => (
            <ActionRow key={a.id} action={a} myStatus={myByAction.get(a.id)} onSubmitted={refresh} />
          ))}
          {actions.isLoading && <p className="text-sm text-muted-foreground">Loading the checklist…</p>}
          {!actions.isLoading && (actions.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">The quest opens with the announcement. Check back shortly.</p>}
        </div>
      </ShipSection>

      {/* Leaderboard */}
      <ShipSection>
        <ShipEyebrow>The leaderboard</ShipEyebrow>
        <h2 className="text-2xl font-bold mb-5">Three crews will sail</h2>
        <div className="space-y-2">
          {(leaderboard.data?.standings ?? []).map((s: any, i: number) => (
            <div key={s.userId} className="flex items-center gap-3 rounded-lg border p-3">
              <span className="w-8 text-center font-bold text-muted-foreground">{i + 1}</span>
              <div className="flex-1">
                <span className="font-medium">{s.handle ? `@${s.handle}` : s.name}</span>
                {s.isFinisher && <span className="ml-2 text-xs bg-[#2f5d3a] text-white rounded-full px-2 py-0.5">Finisher</span>}
                {s.winnerRank && <span className="ml-2 inline-flex items-center gap-1 text-xs bg-[#ffd700]/40 rounded-full px-2 py-0.5"><Anchor className="w-3 h-3" /> Voyage {s.winnerRank}</span>}
              </div>
              <span className="text-sm font-semibold text-[#2f5d3a]">{s.verifiedPoints} pts</span>
            </div>
          ))}
          {(leaderboard.data?.standings?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No verified actions yet. Be the first to set sail.</p>}
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
