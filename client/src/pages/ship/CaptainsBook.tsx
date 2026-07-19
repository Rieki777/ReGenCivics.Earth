/**
 * /ship/voyage — The Captain's Book (SHIP_MAINTAINER_INVENTORY Section 1.5).
 *
 * The active voyager's hub: the Shipwright, the maintenance log, the captain's
 * manual, the voyage log, crew roles, and the pre-sail checklist. Unlocked while
 * a booking is confirmed or active; a signed-out or crewless visitor gets a warm
 * pointer to book or sign in.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Wrench, Anchor, ClipboardCheck, Users, ScrollText, AlertTriangle, Flame } from "lucide-react";
import { ShipSection, ShipEyebrow, ShipNavRow, BookNowButton } from "./shipShared";
import { AskShipwright } from "@/components/ship/AskShipwright";
import { GearManifest } from "@/components/ship/GearManifest";
import { GalleyStrip } from "@/components/ship/GalleyStrip";
import { RiteOfTruthDeck } from "@/components/ship/RiteOfTruthDeck";

const ROLES = [
  { key: "captain", label: "The Captain", desc: "The driver, head of the ship, fully responsible for her under way." },
  { key: "navigator", label: "The Navigator", desc: "Right seat. Charts the route, works the treasure map, keeps good order." },
  { key: "quartermaster", label: "The Quartermaster", desc: "Provisions, water levels, tanks, the inventory bag. Crews of three or more." },
  { key: "bosun", label: "The Bosun", desc: "Setup and breakdown: slides, jacks, hookups, awning, securing the deck. Crews of three or more." },
  { key: "seedKeeper", label: "The Seed Keeper", desc: "Guards the treasure chest, logs every planting, stamps the passport. Often a kid." },
] as const;

const PRE_SAIL = [
  "Exterior doors locked",
  "Windows closed",
  "Roof vents down",
  "Jacks retracted (one is manual, see her quirks)",
  "Slides in",
  "Counters and surfaces cleared",
  "Loose items stowed",
  "Water, propane, and power disconnected",
  "Full walk-around done",
];

export default function CaptainsBook() {
  const voyage = trpc.ship.myVoyage.useQuery();
  const cases = trpc.ship.shipwright.myCases.useQuery();
  const setRoles = trpc.ship.voyage.setRoles.useMutation();
  const logPreSail = trpc.ship.voyage.logPreSail.useMutation();

  const booking = voyage.data?.booking ?? null;
  const existingRoles = (booking?.crewRoles as Record<string, string> | null) ?? {};
  const [roles, setRolesState] = useState<Record<string, string>>({});
  const roleValue = (k: string) => roles[k] ?? existingRoles[k] ?? "";

  const [checks, setChecks] = useState<boolean[]>(() => PRE_SAIL.map(() => false));
  const [driverName, setDriverName] = useState("");
  const allChecked = checks.every(Boolean);

  // Deep link from the Saturday Rite of Truth card lands at #rite-of-truth.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#rite-of-truth") return;
    const t = window.setTimeout(() => {
      document.getElementById("rite-of-truth")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);
  const preSailRuns = useMemo(() => (Array.isArray(booking?.preSailLog) ? (booking!.preSailLog as Array<{ at: string; byName: string }>) : []), [booking]);

  async function saveRoles() {
    try {
      await setRoles.mutateAsync({
        captain: roleValue("captain") || undefined,
        navigator: roleValue("navigator") || undefined,
        quartermaster: roleValue("quartermaster") || undefined,
        bosun: roleValue("bosun") || undefined,
        seedKeeper: roleValue("seedKeeper") || undefined,
      });
      toast.success("Crew roles set for this voyage.");
      voyage.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save roles.");
    }
  }

  async function completePreSail() {
    if (!allChecked) return toast.error("Walk the whole list before you roll.");
    if (driverName.trim().length < 1) return toast.error("Who is driving? Add a name for the log.");
    try {
      await logPreSail.mutateAsync({ byName: driverName.trim() });
      toast.success("Pre-sail check logged. Fair winds, captain.");
      setChecks(PRE_SAIL.map(() => false));
      voyage.refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not log the check.");
    }
  }

  return (
    <PageWrapper>
      <SEO title="The Captain's Book" description="Your active-voyage hub aboard the ReGen Ship: the Shipwright, the maintenance log, crew roles, and the pre-sail checklist." url="/ship/voyage" />
      <ShipNavRow />

      <ShipSection>
        <ShipEyebrow>The Captain's Book</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#4a7c59] dark:text-[#7dd87d] shrink-0" aria-hidden="true" />
          Everything you need mid-voyage
        </h1>
        {voyage.isLoading ? (
          <p className="text-muted-foreground">Opening the book…</p>
        ) : !booking ? (
          <div className="max-w-2xl rounded-2xl border border-[#d4a574]/50 bg-[#d4a574]/10 p-5">
            <p className="text-foreground/85">The Captain's Book opens once you have a voyage aboard her. When your booking is confirmed, come back here for the Shipwright, the pre-sail checklist, your crew roles, and your log.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <BookNowButton />
              <Link href="/ship/log"><Button variant="outline">Read the fleet's log</Button></Link>
            </div>
          </div>
        ) : (
          <p className="text-foreground/80 max-w-2xl">Your voyage boards {booking.startDate}. This is your book for the week: ask the Shipwright, hold your roles, and run the pre-sail checklist before every drive.</p>
        )}
      </ShipSection>

      {/* The Rite of Truth deck (Saturday rite). Open to everyone, so the deep
          link from the theme page lands on a real deck whether or not a voyage
          is booked yet. */}
      <ShipSection id="rite-of-truth" className="pt-0">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Flame className="w-6 h-6 text-[#ffd700]" aria-hidden="true" /> The Rite of Truth deck</h2>
        <RiteOfTruthDeck />
      </ShipSection>

      {booking && (
        <>
          {/* 1. The Shipwright */}
          <ShipSection className="pt-0">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Wrench className="w-6 h-6 text-[#9c8a7c]" aria-hidden="true" /> Ask the Shipwright</h2>
            <div className="max-w-3xl"><AskShipwright /></div>
          </ShipSection>

          {/* 2. The Maintenance Log */}
          <ShipSection className="pt-0">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><ScrollText className="w-6 h-6 text-[#9c8a7c]" aria-hidden="true" /> The maintenance log</h2>
            <p className="text-foreground/80 max-w-2xl mb-4">Every question you ask the Shipwright is logged here so the Keeper and the next crew see her running health. Add anything you notice, even small things.</p>
            <div className="max-w-2xl space-y-2">
              {cases.isLoading ? (
                <p className="text-sm text-muted-foreground">Reading the log…</p>
              ) : (cases.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet. She is running clean.</p>
              ) : (
                (cases.data ?? []).map((c) => (
                  <div key={c.id} className={`rounded-xl border p-3 text-sm ${c.isEscalation ? "border-red-500/40 bg-red-500/5" : "bg-card"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.isEscalation && <AlertTriangle className="inline w-4 h-4 text-red-500 mr-1" aria-hidden="true" />}{c.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{c.system} · {c.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ShipSection>

          {/* 3 + 4. The Captain's Manual + the Log */}
          <ShipSection className="pt-0">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Anchor className="w-5 h-5 text-[#2f5d3a] dark:text-[#7dd87d]" aria-hidden="true" /> The Captain's Manual</h2>
                <p className="text-sm text-foreground/80 mb-3">How to run her well: the water doctrine, spring water, driving, and turnover. Rye's videos land here as he records them.</p>
                <Link href="/ship/guide" className="text-[#2f5d3a] dark:text-[#7dd87d] font-medium underline">Open the voyage guide</Link>
              </div>
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><ScrollText className="w-5 h-5 text-[#2f5d3a] dark:text-[#7dd87d]" aria-hidden="true" /> Your log</h2>
                <p className="text-sm text-foreground/80 mb-3">{(voyage.data?.logEntries ?? []).length} entries so far. Keep the daily log as you sail; it becomes part of the fleet's story.</p>
                <Link href="/ship/log" className="text-[#2f5d3a] dark:text-[#7dd87d] font-medium underline">Open the voyage log</Link>
              </div>
            </div>
          </ShipSection>

          {/* The Galley strip: this voyage's hauls + favorite remixes */}
          <ShipSection className="pt-0">
            <div className="max-w-2xl"><GalleyStrip bookingId={booking.id} /></div>
          </ShipSection>

          {/* Gear manifest */}
          <ShipSection className="pt-0">
            <div className="max-w-2xl"><GearManifest /></div>
          </ShipSection>

          {/* 5. Crew roles */}
          <ShipSection className="pt-0">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><Users className="w-6 h-6 text-[#9c8a7c]" aria-hidden="true" /> Crew roles</h2>
            <p className="text-foreground/80 max-w-2xl mb-4">Every voyage assigns roles, playfully but truly. A solo couple wears several hats. Name who holds what for this voyage.</p>
            <div className="max-w-2xl space-y-3">
              {ROLES.map((r) => (
                <div key={r.key} className="rounded-xl border bg-card p-3">
                  <Label htmlFor={`role-${r.key}`} className="font-semibold">{r.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{r.desc}</p>
                  <Input id={`role-${r.key}`} value={roleValue(r.key)} onChange={(e) => setRolesState((s) => ({ ...s, [r.key]: e.target.value }))} placeholder="Name" maxLength={120} className="text-base" />
                </div>
              ))}
              <Button onClick={saveRoles} disabled={setRoles.isPending} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">{setRoles.isPending ? "Saving…" : "Set the crew roles"}</Button>
            </div>
          </ShipSection>

          {/* 6. Pre-sail checklist */}
          <ShipSection className="pt-0">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-[#9c8a7c]" aria-hidden="true" /> The pre-sail checklist</h2>
            <p className="text-foreground/80 max-w-2xl mb-4">You are about to take your house through an earthquake. Secure everything that can fall, because it will. Walk this before every drive.</p>
            <div className="max-w-2xl rounded-2xl border bg-card p-5 space-y-3">
              {PRE_SAIL.map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checks[i]} onCheckedChange={(v) => setChecks((c) => c.map((x, j) => (j === i ? Boolean(v) : x)))} />
                  <span className="text-sm leading-snug">{item}</span>
                </label>
              ))}
              <div className="pt-2 border-t">
                <Label htmlFor="driver-name" className="text-sm">Who is driving?</Label>
                <Input id="driver-name" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver's name" maxLength={120} className="text-base max-w-xs" />
              </div>
              <Button onClick={completePreSail} disabled={logPreSail.isPending || !allChecked} className="min-h-11 bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d]">
                {logPreSail.isPending ? "Logging…" : "She's secured, log the check"}
              </Button>
              {preSailRuns.length > 0 && (
                <p className="text-xs text-muted-foreground">{preSailRuns.length} pre-sail {preSailRuns.length === 1 ? "check" : "checks"} logged this voyage. Last by {preSailRuns[preSailRuns.length - 1].byName}.</p>
              )}
            </div>
          </ShipSection>
        </>
      )}
    </PageWrapper>
  );
}
