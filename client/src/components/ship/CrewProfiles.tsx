/**
 * Crew profiles + sponsorship for the Maiden Voyage Quest.
 *
 * Two pieces:
 *  - CrewProfileEditor: the signed-in crew fills in a card (name, photo, bio,
 *    what they intend to do, an optional video). It publishes only once the crew
 *    is in the draw. This is the prompt shown on entering the draw.
 *  - CrewsSection: the public band of crew cards, each with a progress bar and a
 *    Sponsor button. Anyone can put money toward a crew's voyage so they can book
 *    their week. Goal is the full voyage ask; partial contributions are welcome.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Anchor, Heart, Play } from "lucide-react";
import { ShipEyebrow } from "@/pages/ship/shipShared";

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ── The editor (shown to the signed-in crew) ──────────────────────────────────
export function CrewProfileEditor({
  inTheDraw,
  existing,
  onSaved,
}: {
  inTheDraw: boolean;
  existing: { displayName?: string | null; bio?: string | null; intent?: string | null; photoUrl?: string | null; videoUrl?: string | null; isPublic?: boolean } | null;
  onSaved: () => void;
}) {
  const upsert = trpc.ship.crew.upsert.useMutation();
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [intent, setIntent] = useState(existing?.intent ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl ?? "");
  const [open, setOpen] = useState(false);

  async function save(makePublic: boolean) {
    if (displayName.trim().length < 2) {
      toast.error("Add a crew name first.");
      return;
    }
    try {
      await upsert.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        intent: intent.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        isPublic: makePublic,
      });
      toast.success(makePublic ? "Your crew card is sailing." : "Saved. Publish when you are ready.");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save your crew profile.");
    }
  }

  const hasProfile = Boolean(existing?.displayName);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#2f5d3a] hover:bg-[#264a2f]">
          {hasProfile ? "Edit your crew profile" : "Make your crew profile"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Your crew profile</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Who you are and what you intend to do on your voyage. A short video is the strongest pitch: 60 seconds on who you are and what you will bring to the Renaissance. Sponsors read these to choose a crew to back.
        </p>
        <div className="space-y-3 mt-1">
          <div>
            <Label htmlFor="crew-name">Crew name</Label>
            <Input id="crew-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name or crew name" maxLength={200} />
          </div>
          <div>
            <Label htmlFor="crew-photo">Photo URL</Label>
            <Input id="crew-photo" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" maxLength={512} />
          </div>
          <div>
            <Label htmlFor="crew-bio">Short bio</Label>
            <Textarea id="crew-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few lines about you." maxLength={2000} rows={3} />
          </div>
          <div>
            <Label htmlFor="crew-intent">What you intend to do on your voyage</Label>
            <Textarea id="crew-intent" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Where you will go, what you will plant, who you will visit." maxLength={2000} rows={3} />
          </div>
          <div>
            <Label htmlFor="crew-video">Video URL (YouTube or Loom)</Label>
            <Input id="crew-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" maxLength={512} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button onClick={() => save(true)} disabled={upsert.isPending || !inTheDraw} className="bg-[#2f5d3a] hover:bg-[#264a2f]">
            {inTheDraw ? "Publish my crew card" : "Reach 150 points to publish"}
          </Button>
          <Button onClick={() => save(false)} disabled={upsert.isPending} variant="outline">
            Save draft
          </Button>
        </div>
        {!inTheDraw && (
          <p className="text-xs text-muted-foreground">You can save a draft now. Your card goes public once you reach 150 points and enter the draw.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sponsor button + dialog ───────────────────────────────────────────────────
const PRESETS = [2500, 10000, 25000, 50000];

function SponsorButton({ crew, sponsorEnabled }: { crew: { id: number; displayName: string }; sponsorEnabled: boolean }) {
  const sponsor = trpc.ship.crew.sponsor.useMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(2500);

  async function go() {
    try {
      const res = await sponsor.mutateAsync({ crewProfileId: crew.id, amountCents: amount });
      if (res.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Sponsorship is not live yet.");
    }
  }

  if (!sponsorEnabled) {
    return <Button size="sm" variant="outline" disabled className="w-full">Sponsorship opens soon</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-[#ffd700] text-[#2f5d3a] hover:bg-[#ffcc00]">
          <Heart className="w-4 h-4 mr-1" /> Sponsor this voyage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sponsor {crew.displayName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Put anything toward this crew's week. When the goal is met, the church books their voyage.</p>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold ${amount === p ? "border-[#2f5d3a] bg-[#4a7c59]/15" : "border-border"}`}
            >
              {usd(p)}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="sponsor-amount">Or enter an amount (USD)</Label>
          <Input
            id="sponsor-amount"
            type="number"
            min={5}
            max={2100}
            value={amount / 100}
            onChange={(e) => setAmount(Math.round(Math.max(5, Math.min(2100, Number(e.target.value) || 0)) * 100))}
          />
        </div>
        <Button onClick={go} disabled={sponsor.isPending} className="bg-[#2f5d3a] hover:bg-[#264a2f] mt-1">
          Continue to secure checkout
        </Button>
        <p className="text-xs text-muted-foreground">A gift to the Church of the Regenerative Earth. Card handled by Stripe; we never see it.</p>
      </DialogContent>
    </Dialog>
  );
}

// ── The public crew cards band ────────────────────────────────────────────────
type Crew = {
  id: number;
  displayName: string;
  bio: string | null;
  intent: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  status: string;
  sponsoredCents: number;
  goalCents: number;
  percent: number;
  goalReached: boolean;
};

function CrewCard({ crew, sponsorEnabled }: { crew: Crew; sponsorEnabled: boolean }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-gradient-to-br from-[#2f5d3a] via-[#4a7c59] to-[#d4a574] relative">
        {crew.photoUrl ? (
          <img src={crew.photoUrl} alt={crew.displayName} loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-4xl" aria-hidden="true">⚓</div>
        )}
        {crew.videoUrl && (
          <a href={crew.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-black/60 text-white text-xs rounded-full px-2 py-1 hover:bg-black/80">
            <Play className="w-3 h-3" /> Watch
          </a>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold">{crew.displayName}</h3>
        {crew.intent && <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{crew.intent}</p>}
        {crew.bio && !crew.intent && <p className="text-sm text-foreground/80 mt-1 line-clamp-3">{crew.bio}</p>}
        <div className="mt-3">
          <Progress value={crew.percent} className="h-2" />
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span><b className="text-[#2f5d3a] dark:text-[#9de89d]">{usd(crew.sponsoredCents)}</b> of {usd(crew.goalCents)}</span>
            <span>{crew.percent}%</span>
          </div>
        </div>
        <div className="mt-auto pt-3">
          {crew.goalReached ? (
            <div className="inline-flex items-center gap-1 text-sm font-semibold text-[#2f5d3a] dark:text-[#9de89d]"><Anchor className="w-4 h-4" /> Fully sponsored. This crew sails.</div>
          ) : (
            <SponsorButton crew={crew} sponsorEnabled={sponsorEnabled} />
          )}
        </div>
      </div>
    </div>
  );
}

export function CrewsSection({ sponsorEnabled }: { sponsorEnabled: boolean }) {
  const crews = trpc.ship.crew.listPublished.useQuery(undefined, { staleTime: 30_000 });
  const list = (crews.data ?? []) as Crew[];

  return (
    <>
      <ShipEyebrow>The crews</ShipEyebrow>
      <h2 className="text-2xl font-bold mb-2">Meet the crews sailing for a voyage</h2>
      <p className="text-foreground/80 mb-6 max-w-2xl">Everyone in the draw can raise a crew card. Sponsor a crew and you help them book their week outright, no waiting on the draw.</p>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#4a7c59]/40 bg-[#4a7c59]/5 p-8 text-center">
          <p className="text-muted-foreground">Reach 150 points and your crew card sails here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <CrewCard key={c.id} crew={c} sponsorEnabled={sponsorEnabled} />
          ))}
        </div>
      )}
    </>
  );
}
