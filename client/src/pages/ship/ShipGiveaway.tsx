/**
 * /ship/giveaway - the public entry page for the Free Voyage Giveaway.
 *
 * One email field enters the free draw. A confirmation link (?verify=token) lands
 * back here and opens the thank-you state: the one-tap funnel question, the
 * referral link, the optional bonus entries, and the entrant's standing. A
 * referral link carries ?crew=CODE, attributed on entry.
 *
 * Word discipline (campaign brief, STEERING section 1): this page says "entries"
 * and "the draw", never "raffle" or "tickets". Free sweepstakes, not a raffle.
 * It fires only public procedures, so a logged-out visitor is never redirected.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Anchor, Copy, Check, Users, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cdnImg } from "@/lib/utils";
import { toast } from "sonner";
import { ShipSection, ShipEyebrow, ShipNavRow } from "./shipShared";
import { FreeVoyageLadder } from "@/components/ship/FreeVoyageLadder";

const HERO_SRC = cdnImg("https://assets.regencivics.earth/ship/photo_2026-07-12_13-55-09.jpg", 1600);

type FunnelTag = "land" | "voyage" | "support" | "curious";
type GiveawayMe = {
  referralCode: string;
  referralUrl: string;
  verified: boolean;
  funnelTag: FunnelTag | null;
  needsTag: boolean;
  entries: number;
  bonus: { referrals: number; nomination: number; quest: number; ig: number; yt: number };
  referralCount: number;
  leaderboardPosition: number | null;
  credited?: boolean;
};

const TAG_CHOICES: Array<{ value: FunnelTag; label: string }> = [
  { value: "land", label: "I steward land, or want to" },
  { value: "voyage", label: "I want to sail her" },
  { value: "support", label: "I want to support the work" },
  { value: "curious", label: "Just curious" },
];

export default function ShipGiveaway() {
  const params = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    [],
  );
  const verifyToken = params.get("verify");
  const crewParam = params.get("crew");

  const stats = trpc.shipGiveaway.stats.useQuery(undefined, { staleTime: 30_000 });
  const enter = trpc.shipGiveaway.enter.useMutation();
  const verify = trpc.shipGiveaway.verify.useMutation();
  const tag = trpc.shipGiveaway.tag.useMutation();
  const bonus = trpc.shipGiveaway.bonus.useMutation();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sent" | "thanks" | "verifying">(verifyToken ? "verifying" : "form");
  const [me, setMe] = useState<GiveawayMe | null>(null);
  const [copied, setCopied] = useState(false);
  const [nomOpen, setNomOpen] = useState(false);
  const [nomName, setNomName] = useState("");
  const [nomWhy, setNomWhy] = useState("");

  // A confirmation link landed here: confirm the entry, then show the thanks state.
  useEffect(() => {
    if (!verifyToken) return;
    verify
      .mutateAsync({ token: verifyToken })
      .then((res) => {
        setMe(res as GiveawayMe);
        setPhase("thanks");
      })
      .catch(() => {
        setPhase("form");
        toast.error("This confirmation link is not valid or has expired. Enter again below.");
      });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rulesApproved = stats.data?.rulesApproved ?? false;
  const closed = stats.data?.entriesClosed ?? false;
  const canEnter = rulesApproved && !closed;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await enter.mutateAsync({ email: email.trim(), referredBy: crewParam || undefined, src: "giveaway_page" });
      setPhase("sent");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Something went wrong. Please try again.");
    }
  };

  const chooseTag = async (value: FunnelTag) => {
    if (!verifyToken) return;
    try {
      const res = await tag.mutateAsync({ token: verifyToken, funnelTag: value });
      setMe(res as GiveawayMe);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Could not save that. Please try again.");
    }
  };

  const addBonus = async (kind: "nomination" | "quest" | "instagram" | "youtube", extra?: { nomineeName: string; nominationText: string }) => {
    if (!verifyToken) return;
    try {
      const res = await bonus.mutateAsync({ token: verifyToken, kind, ...(extra ?? {}) });
      setMe(res as GiveawayMe);
      if ((res as GiveawayMe).credited) toast.success("Added to your entries.");
      else toast("Noted.");
      if (kind === "nomination") {
        setNomOpen(false);
        setNomName("");
        setNomWhy("");
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Could not add that. Please try again.");
    }
  };

  const copyLink = async () => {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.referralUrl);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Select the link to copy it.");
    }
  };

  return (
    <PageWrapper>
      <SEO
        title="Win a Free Voyage on the ReGen Ship"
        description="Enter free to win a week aboard the ReGen Ship, a solar vessel out of Ashland, Oregon. No purchase or donation necessary. One crew sails free."
        url="/ship/giveaway"
      />
      <ShipNavRow current="/ship/giveaway" />

      {/* Hero: the ridge photo over a warm gradient, so the page holds even if the
          photo is not uploaded to R2 yet (the img hides itself on error). */}
      <section className="relative min-h-[54vh] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#2f5d3a] via-[#4a7c59] to-[#0b2a17]" />
        <img
          src={HERO_SRC}
          alt="The ReGen Ship on a ridge above Crater Lake at golden hour."
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 -z-10 bg-black/45" />

        <div className="max-w-2xl mx-auto px-4 py-16 text-white">
          <ShipEyebrow>The Free Voyage Giveaway</ShipEyebrow>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow">One crew sails free.</h1>
          <p className="text-lg text-white/90 mb-6 max-w-xl mx-auto">
            We built a solar ship that carries more fire than she needs. To launch her first sailing year, we are giving
            one week away free. Enter with your email.
          </p>

          {crewParam && phase === "form" && (
            <p className="text-sm text-[#7dffa8] mb-3">A crewmate invited you. Enter and you both climb.</p>
          )}

          {phase === "form" && (
            <form onSubmit={onSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Your email address"
                  disabled={!canEnter || enter.isPending}
                  className="bg-white/95 text-[#08301c] placeholder:text-[#08301c]/50 border-white/40"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canEnter || enter.isPending}
                  className="bg-[#3ddc84] hover:bg-[#5ee89d] text-[#08301c] font-bold shadow-lg shadow-[#3ddc84]/25 whitespace-nowrap"
                >
                  <Anchor className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  {enter.isPending ? "Entering..." : "Enter the draw"}
                </Button>
              </div>
              {!rulesApproved && (
                <p className="text-sm text-white/85 mt-3">Entries open when the official rules publish. Check back soon.</p>
              )}
              {rulesApproved && closed && (
                <p className="text-sm text-white/85 mt-3">Entries for this draw have closed. Thank you for sailing with us.</p>
              )}
            </form>
          )}

          {phase === "sent" && (
            <div className="max-w-md mx-auto rounded-2xl bg-white/10 border border-white/25 p-6">
              <p className="text-lg font-semibold mb-1">Check your email.</p>
              <p className="text-white/85 text-sm">
                We sent a confirmation link. Click it to lock in your entry. If it is not there in a few minutes, check
                your spam folder.
              </p>
            </div>
          )}

          {phase === "verifying" && (
            <div className="flex items-center justify-center gap-2 text-white/90">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Confirming your entry...</span>
            </div>
          )}

          <p className="text-xs text-white/75 mt-5 max-w-md mx-auto">
            No purchase or donation necessary. Free entry only. Odds depend on entries received.{" "}
            <Link href="/ship/giveaway/rules" className="underline underline-offset-2 hover:text-white">
              Official rules
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Thank-you state: tag, referral link, bonus entries, standing. */}
      {phase === "thanks" && me && (
        <ShipSection>
          <div className="max-w-2xl mx-auto">
            <ShipEyebrow>You are in the draw</ShipEyebrow>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Your entry is confirmed.</h2>
            <p className="text-foreground/80 mb-6">
              You have {me.entries} {me.entries === 1 ? "entry" : "entries"} in the draw. Here is how to climb, and one
              quick question so we can point you the right way after the draw.
            </p>

            {me.needsTag ? (
              <div className="mb-8 rounded-2xl border border-[#4a7c59]/30 bg-[#4a7c59]/5 p-5">
                <p className="font-semibold mb-3">Which are you?</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {TAG_CHOICES.map((c) => (
                    <Button
                      key={c.value}
                      variant="outline"
                      disabled={tag.isPending}
                      onClick={() => chooseTag(c.value)}
                      className="justify-start text-left h-auto py-3 whitespace-normal"
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">One tap, and you can skip it.</p>
              </div>
            ) : (
              <p className="mb-8 text-sm text-[#2f5d3a] dark:text-[#7dd87d]">Thanks. We noted where you are headed.</p>
            )}

            {/* Referral link */}
            <div className="mb-8">
              <p className="font-semibold mb-2">Bring crewmates, climb the draw</p>
              <p className="text-sm text-foreground/75 mb-3">
                Every friend who enters through your link and confirms their email adds five entries, up to forty. Bring
                five and we mail you the ship's colors.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input readOnly value={me.referralUrl} aria-label="Your referral link" className="font-mono text-sm" />
                <Button onClick={copyLink} variant="secondary" className="whitespace-nowrap">
                  {copied ? <Check className="w-4 h-4 mr-1.5" aria-hidden="true" /> : <Copy className="w-4 h-4 mr-1.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-foreground/75">
                <Users className="w-4 h-4 text-[#4a7c59]" aria-hidden="true" />
                {me.referralCount > 0 ? (
                  <span>
                    {me.referralCount} confirmed {me.referralCount === 1 ? "crewmate" : "crewmates"}
                    {me.leaderboardPosition ? `, sitting at #${me.leaderboardPosition} on the leaderboard` : ""}.
                  </span>
                ) : (
                  <span>No crewmates yet. Share your link to start climbing.</span>
                )}
              </div>
            </div>

            {/* Bonus entries */}
            <div className="rounded-2xl border border-[#d4a574]/40 bg-[#d4a574]/10 p-5">
              <p className="font-semibold mb-3">More ways to add entries</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start justify-between gap-3">
                  <span>
                    <strong>Nominate a land project</strong> the ship should visit. Adds three entries, and the project
                    joins the treasure map.
                  </span>
                  {me.bonus.nomination > 0 ? (
                    <span className="text-[#2f5d3a] dark:text-[#7dd87d] font-semibold whitespace-nowrap">Added</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setNomOpen((v) => !v)} className="whitespace-nowrap">
                      Nominate
                    </Button>
                  )}
                </li>
                {nomOpen && me.bonus.nomination === 0 && (
                  <li className="rounded-xl bg-background/60 p-3 space-y-2">
                    <Input value={nomName} onChange={(e) => setNomName(e.target.value)} placeholder="Project name" aria-label="Project name" />
                    <textarea
                      value={nomWhy}
                      onChange={(e) => setNomWhy(e.target.value)}
                      placeholder="Why should the ship visit? (a sentence or two)"
                      aria-label="Why should the ship visit"
                      rows={3}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={bonus.isPending || nomName.trim().length < 2 || nomWhy.trim().length < 10}
                      onClick={() => addBonus("nomination", { nomineeName: nomName.trim(), nominationText: nomWhy.trim() })}
                    >
                      Submit nomination
                    </Button>
                  </li>
                )}
                <li className="flex items-start justify-between gap-3">
                  <span><strong>Follow on Instagram.</strong> Adds one entry.</span>
                  {me.bonus.ig > 0 ? (
                    <span className="text-[#2f5d3a] dark:text-[#7dd87d] font-semibold whitespace-nowrap">Added</span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={bonus.isPending} onClick={() => addBonus("instagram")} className="whitespace-nowrap">
                      I followed
                    </Button>
                  )}
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span><strong>Follow on YouTube.</strong> Adds one entry.</span>
                  {me.bonus.yt > 0 ? (
                    <span className="text-[#2f5d3a] dark:text-[#7dd87d] font-semibold whitespace-nowrap">Added</span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={bonus.isPending} onClick={() => addBonus("youtube")} className="whitespace-nowrap">
                      I followed
                    </Button>
                  )}
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span>
                    <strong>Do any action on the Ship's Quest.</strong> Adds two entries when you are signed in.{" "}
                    <Link href="/ship/quest" className="underline underline-offset-2">Open the quest</Link>.
                  </span>
                  {me.bonus.quest > 0 && <span className="text-[#2f5d3a] dark:text-[#7dd87d] font-semibold whitespace-nowrap">Added</span>}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">Every method is optional. Your free email entry is always enough.</p>
            </div>
          </div>
        </ShipSection>
      )}

      {/* The meter + the story, always shown below the fold. */}
      <ShipSection className="bg-[#4a7c59]/8">
        <div className="max-w-3xl mx-auto">
          <ShipEyebrow>Where she is headed</ShipEyebrow>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">The more she books, the more crews sail free</h2>
          <p className="text-foreground/80 mb-6">
            The ReGen Ship is a solar vessel that makes far more power than she needs, so we point the surplus at real
            work on the land: water pumps on dry ground, power tools for natural builds, light and sound for gatherings
            off the grid. One free voyage is in the draw now. More release as her first year books up.
          </p>
          <FreeVoyageLadder />
          <p className="text-sm text-foreground/70 mt-6">
            {typeof stats.data?.verifiedEntries === "number" && stats.data.verifiedEntries > 0
              ? `${stats.data.verifiedEntries.toLocaleString()} confirmed ${stats.data.verifiedEntries === 1 ? "entry" : "entries"} so far. `
              : ""}
            No purchase or donation necessary. Free entry only. Odds depend on entries received.{" "}
            <Link href="/ship/giveaway/rules" className="underline underline-offset-2">Official rules</Link>.
          </p>
        </div>
      </ShipSection>
    </PageWrapper>
  );
}
