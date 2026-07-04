/**
 * GratitudeTab — the profile's Gratitude hub.
 *
 * Spec: GRATITUDE_TAB_BUILD_SPEC.md (Part II). Hero band with live moon
 * phase, glass stat trio (power meter / received + sparkline / $ReGen
 * progress ring), and the Gratitude Wall of parchment notes. Mobile-first:
 * everything stacks in one column below `sm`.
 *
 * Design rules honored here:
 *  - No reciprocity affordances (spec §12.5): no send-back, no pair counts.
 *    Sending always starts from a blank recipient search.
 *  - Deep link: ?highlight=<gratitudeId> scrolls to the note and blooms it.
 *  - All motion respects prefers-reduced-motion.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Send, Sparkles, ExternalLink, Search, Moon, Share2, Download, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { XShareButton, LinkedinShareButton, FacebookShareButton, BlueskyShareButton } from "react-share";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { SendGratitudeModal } from "@/components/SendGratitudeModal";
import { moonPhaseName } from "@shared/lunar";
import { copyToClipboard } from "@/lib/clipboard";
import { Link } from "wouter";

/* ─── Small pieces ──────────────────────────────────────────────────── */

function useReducedMotion() {
  return useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
}

/** Count-up number for the hero signature line. */
function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 800);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <span className="text-[#ffd700]">{shown}</span>;
}

/** Live moon rendered from the real phase fraction (0 = new, 0.5 = full). */
function MoonIcon({ phase, size = 22 }: { phase: number; size?: number }) {
  const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2; // 0 new -> 1 full
  const waxing = phase < 0.5;
  return (
    <div
      className="rounded-full relative overflow-hidden border border-[#f0ebe3]/30 bg-[#0a1f14] flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={moonPhaseName(phase)}
      role="img"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at ${waxing ? 72 : 28}% 50%, rgba(255,248,230,${0.15 + illum * 0.85}) 0%, rgba(255,248,230,${0.1 + illum * 0.5}) ${Math.round(illum * 55)}%, rgba(255,248,230,0.04) ${Math.round(40 + illum * 55)}%)`,
        }}
      />
    </div>
  );
}

/** Power meter: green to the golden full-power notch, amber past it. */
function PowerMeter({ sent, threshold }: { sent: number; threshold: number }) {
  const maxShown = threshold * 2;
  const ratio = Math.min(sent / maxShown, 1);
  const atFullPower = sent >= threshold;
  return (
    <div className="mt-3">
      <div className="relative h-2.5 bg-white/10 rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${ratio * 100}%`,
            background: sent <= threshold
              ? "linear-gradient(90deg,#4a7c59,#7dd87d)"
              : "linear-gradient(90deg,#7dd87d,#ffd700)",
            boxShadow: sent > 0 ? "0 0 10px rgba(125,216,125,0.5)" : "none",
          }}
        />
        <div
          className="absolute -top-1 w-0.5 h-4.5 rounded"
          style={{ left: "50%", height: 18, top: -4, background: "#ffd700", boxShadow: atFullPower ? "0 0 8px #ffd700" : "none", opacity: atFullPower ? 1 : 0.6 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#f0ebe3]/50 mt-1">
        <span>0</span>
        <span className="text-[#ffd700]/80 font-semibold">{threshold} full power</span>
        <span>{maxShown}+</span>
      </div>
    </div>
  );
}

/** Circular progress toward the claim threshold. Gold when complete. */
function ProgressRing({ value, max, size = 104 }: { value: number; max: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.min(value / Math.max(max, 1), 1);
  const complete = value >= max;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={complete ? "#ffd700" : "#7dd87d"} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} strokeLinecap="round"
          className="transition-all duration-700"
          style={complete ? { filter: "drop-shadow(0 0 6px rgba(255,215,0,0.6))" } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: complete ? "#ffd700" : "#fff" }}>
          {Math.round(value)}
        </span>
        <span className="text-[10px] text-[#f0ebe3]/60">of {max}</span>
      </div>
    </div>
  );
}

/** Received-per-cycle sparkline. */
function Sparkline({ points }: { points: Array<{ cycleNumber: number; people: number }> }) {
  if (points.length < 2) return null;
  const w = 180, h = 34, max = Math.max(...points.map((p) => p.people), 1);
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - 4 - (p.people / max) * (h - 8)}`);
  const last = coords[coords.length - 1]!.split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 mt-2" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={coords.join(" ")} fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="#ffd700" />
    </svg>
  );
}

/* ─── Journal entry types (mirror gratitude.myJournal) ─────────────────── */

interface JournalEntry {
  id: number;
  message: string;
  sourceType: string | null;
  createdAt: string | Date;
  otherUserId: number;
  otherHandle: string | null;
  otherName: string | null;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  forum_post: "on a forum post",
  forum_reply: "on a forum reply",
  profile: "on your profile",
  command_center: "from the command center",
  bounty: "on a call task",
};

function timeAgo(d: string | Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

function initials(entry: JournalEntry): string {
  const n = entry.otherDisplayName || entry.otherName || entry.otherHandle || "?";
  return n.trim().charAt(0).toUpperCase();
}

/** One parchment note on the wall. */
function NoteCard({ entry, direction, highlighted, index }: {
  entry: JournalEntry;
  direction: "received" | "sent";
  highlighted: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);
  const name = entry.otherDisplayName || entry.otherName || `@${entry.otherHandle ?? entry.otherUserId}`;
  return (
    <div
      ref={ref}
      className={`break-inside-avoid mb-3.5 rounded-2xl bg-[#f8f5f0] border border-black/5 shadow-lg p-4 relative transition-transform hover:-translate-y-0.5 motion-reduce:transform-none ${highlighted ? "gratitude-bloom" : ""}`}
      style={{ transform: highlighted ? undefined : `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)`, scrollMarginTop: 120 }}
    >
      {highlighted && (
        <span className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase tracking-wide bg-[#ffd700] text-[#0a1f14] px-2.5 py-0.5 rounded-full" style={{ fontFamily: "var(--font-display)" }}>
          Just arrived
        </span>
      )}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ring-2 ring-[#7dd87d]/40 overflow-hidden" style={{ background: "#4a7c59", fontFamily: "var(--font-display)" }}>
          {entry.otherAvatarUrl ? (
            <img src={entry.otherAvatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : initials(entry)}
        </div>
        <div className="min-w-0">
          <Link href={`/profile/${entry.otherUserId}`} className="block text-sm font-bold text-[#1a472a] hover:underline truncate" style={{ fontFamily: "var(--font-display)" }}>
            {direction === "sent" ? `To ${name}` : name}
          </Link>
          <span className="text-[11px] text-[#8a8577]">{timeAgo(entry.createdAt)}</span>
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-[#243026] font-medium">"{entry.message}"</p>
      {entry.sourceType && SOURCE_LABEL[entry.sourceType] && (
        <span className="inline-block mt-2.5 text-[10.5px] font-semibold text-[#4a7c59] bg-[#4a7c59]/10 px-2.5 py-1 rounded-full" style={{ fontFamily: "var(--font-display)" }}>
          {SOURCE_LABEL[entry.sourceType]}
        </span>
      )}
    </div>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────── */

export function GratitudeTab({ userId }: { userId?: number }) {
  const [direction, setDirection] = useState<"received" | "sent">("received");
  const [search, setSearch] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<JournalEntry[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);

  const highlightId = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("highlight");
    return raw ? Number(raw) : null;
  }, []);

  const utils = trpc.useUtils();
  const overview = trpc.gratitude.myOverview.useQuery();
  const journal = trpc.gratitude.myJournal.useQuery({ direction, cursor, limit: 20 });

  const requestClaim = trpc.playerProfiles.requestClaim.useMutation();
  const runClaim = async () => {
    setClaimError(null);
    // Open a tab synchronously on the gesture so iOS Safari allows the
    // eventual redirect to Hypha (same pattern as TokenDetailDialog).
    const w = window.open("about:blank", "_blank", "noopener,noreferrer");
    try {
      const res: any = await requestClaim.mutateAsync({ tokens: ["regen"] });
      if (res?.hyphaUrl && w) w.location.href = res.hyphaUrl;
      else if (w) w.close();
      toast.success("Claim started on Hypha");
      utils.gratitude.myOverview.invalidate();
      utils.playerProfiles.getMyTokens?.invalidate?.();
    } catch (err: any) {
      if (w) w.close();
      setClaimError(err?.message ?? "Could not start the claim. Try again.");
    }
  };

  // Accumulate pages; reset on direction change.
  useEffect(() => { setCursor(undefined); setAccumulated([]); }, [direction]);
  useEffect(() => {
    if (journal.data?.entries) {
      setAccumulated((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...(journal.data!.entries as JournalEntry[]).filter((e) => !seen.has(e.id))];
      });
    }
  }, [journal.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return accumulated;
    const q = search.toLowerCase();
    return accumulated.filter((e) =>
      e.message.toLowerCase().includes(q) ||
      (e.otherName ?? "").toLowerCase().includes(q) ||
      (e.otherDisplayName ?? "").toLowerCase().includes(q) ||
      (e.otherHandle ?? "").toLowerCase().includes(q),
    );
  }, [accumulated, search]);

  const o = overview.data;

  return (
    <div className="space-y-5">
      {/* ── Hero band ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#7dd87d]/20 px-5 py-6 sm:px-7 sm:py-7"
        style={{ background: "radial-gradient(90% 130% at 80% 10%, rgba(255,215,0,0.22), transparent 55%), linear-gradient(120deg,#10331f 0%, #123f27 46%, #0e2b1b 100%)" }}>
        <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd700]" style={{ fontFamily: "var(--font-display)" }}>
          You are appreciated
        </div>
        {overview.isLoading ? (
          <div className="h-9 sm:h-11 w-64 max-w-full bg-white/10 rounded-lg animate-pulse mt-2" />
        ) : (
          <h2 className="mt-1.5 text-white leading-tight text-[26px] sm:text-4xl" style={{ fontFamily: "var(--font-accent)", textShadow: "0 2px 14px rgba(0,0,0,0.3)" }}>
            {o && o.received.lifetimeTimes > 0 ? (
              <><CountUp value={o.received.lifetimeTimes} /> thanks from <CountUp value={o.received.lifetimePeople} /> people</>
            ) : (
              <>Your gratitude story starts here</>
            )}
          </h2>
        )}
        <div className="mt-3.5 flex items-center gap-3 flex-wrap">
          {o && (
            <>
              <MoonIcon phase={o.cycle.moonPhase} />
              <span className="text-[13px] font-semibold text-[#d4a574]" style={{ fontFamily: "var(--font-display)" }}>
                {moonPhaseName(o.cycle.moonPhase)} · new moon in {o.cycle.daysRemaining}d
              </span>
            </>
          )}
          <Button
            size="sm"
            onClick={() => setSendOpen(true)}
            className="ml-auto bg-[#ffd700] hover:bg-[#ffdf33] text-[#0a1f14] font-bold rounded-xl min-h-[44px] px-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Sparkles className="w-4 h-4 mr-1.5" /> Send gratitude
          </Button>
        </div>
      </div>

      {/* ── Cycle urgency band ── */}
      {o && <CycleBand overview={o} onSend={() => setSendOpen(true)} />}

      {/* ── Stat trio ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Power this cycle */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#f0ebe3]/60 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            <span className="w-2 h-2 rounded-full bg-[#7dd87d]" /> Power this cycle
          </div>
          <p className="text-3xl font-bold text-white mt-2.5" style={{ fontFamily: "var(--font-display)" }}>
            {o?.sends.peopleThisCycle ?? "–"}
          </p>
          <p className="text-xs text-[#f0ebe3]/60">people acknowledged</p>
          {o && <PowerMeter sent={o.sends.peopleThisCycle} threshold={o.sends.fullPowerThreshold} />}
          {o && (
            <p className="text-xs text-[#f0ebe3]/70 mt-2">
              <span className="text-[#7dd87d] font-bold">{o.sends.perPersonShare} $ReGen each</span>
              {o.sends.fullPowerRemaining > 0
                ? ` · ${o.sends.fullPowerRemaining} full-power sends left`
                : " · full power reached"}
            </p>
          )}
          {o && o.streak.cycles > 0 && (
            <p className="text-xs text-[#ffd700] mt-1">{o.streak.cycles} cycle streak (+{o.streak.bonusPct}%)</p>
          )}
        </div>

        {/* Received */}
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#f0ebe3]/60 font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            <span className="w-2 h-2 rounded-full bg-[#ffd700]" /> Received
          </div>
          <p className="text-3xl font-bold text-white mt-2.5" style={{ fontFamily: "var(--font-display)" }}>
            {o?.received.peopleLastCycle ?? "–"}
          </p>
          <p className="text-xs text-[#f0ebe3]/60">people last cycle</p>
          {o && <Sparkline points={o.received.trend} />}
          {o && (
            <p className="text-xs text-[#f0ebe3]/60 mt-2">
              Lifetime · {o.received.lifetimePeople} people, {o.received.lifetimeTimes} times
            </p>
          )}
        </div>

        {/* $ReGen earned */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col items-center">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#f0ebe3]/60 font-semibold self-start" style={{ fontFamily: "var(--font-display)" }}>
            <span className="w-2 h-2 rounded-full bg-[#d4a017]" /> $ReGen earned
          </div>
          <div className="mt-2">
            {o ? <ProgressRing value={o.regen.earnedFromGratitude} max={o.regen.claimThreshold} /> : <div className="w-[104px] h-[104px] rounded-full bg-white/5 animate-pulse" />}
          </div>
          {o && (
            (o.regen.claimEligible || o.regen.canClaimNow) ? (
              <div className="mt-3 flex flex-col items-center gap-1 w-full">
                <Button
                  size="sm"
                  onClick={runClaim}
                  disabled={requestClaim.isPending}
                  className="w-full bg-[#ffd700] hover:bg-[#ffdf33] text-[#0a1f14] font-bold rounded-xl min-h-[44px] animate-[gratitude-bloom-pulse_2.2s_ease-out]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {requestClaim.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Starting…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1.5" /> Claim your $ReGen on Hypha</>
                  )}
                </Button>
                <p className="text-[10.5px] text-[#f0ebe3]/55 text-center leading-tight mt-0.5">
                  Moves your earned $ReGen on-chain through Hypha.
                </p>
                {claimError && <p className="text-[11px] text-[#ef6f6c] text-center">{claimError}</p>}
              </div>
            ) : (
              <p className="text-xs text-[#f0ebe3]/70 mt-2 text-center">
                <span className="text-[#7dd87d] font-bold">{o.regen.moreToClaim}</span> more to unlock your claim
              </p>
            )
          )}
        </div>
      </div>

      {/* ── Wall header: filters ── */}
      <div className="sticky top-16 z-10 -mx-1 px-1 py-2 backdrop-blur-md bg-[#0d2818]/70 rounded-xl flex items-center gap-2.5 flex-wrap">
        <h3 className="text-base sm:text-lg font-bold text-white mr-1 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Heart className="w-4.5 h-4.5 text-[#ffd700]" style={{ width: 18, height: 18 }} /> Gratitude wall
        </h3>
        <div className="inline-flex bg-white/5 border border-[#7dd87d]/20 rounded-xl p-0.5">
          {(["received", "sent"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-3.5 py-2 min-h-[40px] rounded-[10px] text-xs font-semibold capitalize transition-colors ${direction === d ? "bg-[#7dd87d] text-[#0a1f14]" : "text-[#f0ebe3]/60 hover:text-white"}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px] max-w-[240px] ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#f0ebe3]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className="pl-8 h-10 bg-white/5 border-[#7dd87d]/20 text-sm text-white placeholder:text-[#f0ebe3]/40 rounded-xl"
          />
        </div>
      </div>

      {/* ── The wall ── */}
      {journal.isLoading && accumulated.length === 0 ? (
        <div className="sm:columns-2 gap-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="break-inside-avoid mb-3.5 rounded-2xl bg-[#f8f5f0]/10 h-32 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <Heart className="w-8 h-8 text-[#7dd87d]/50 mx-auto mb-3" />
          {direction === "received" ? (
            <>
              <p className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Gratitude you receive shows up here
              </p>
              <p className="text-sm text-[#f0ebe3]/60 mt-1.5 max-w-sm mx-auto">
                The fastest way to be appreciated is to appreciate. Acknowledge someone whose work moved you.
              </p>
            </>
          ) : (
            <>
              <p className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {o ? `Your cycle budget is ${o.sends.effectiveBudget}` : "Your gratitude sends show up here"}
              </p>
              <p className="text-sm text-[#f0ebe3]/60 mt-1.5 max-w-sm mx-auto">
                {o ? `Acknowledge up to ${o.sends.fullPowerThreshold} people at full power before the new moon.` : "Acknowledge someone whose work moved you."}
              </p>
            </>
          )}
          <Button
            size="sm"
            onClick={() => setSendOpen(true)}
            className="mt-4 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0a1f14] font-bold rounded-xl min-h-[44px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Express some gratitude
          </Button>
        </div>
      ) : (
        <>
          <div className="sm:columns-2 gap-3.5">
            {filtered.map((entry, i) => (
              <NoteCard
                key={entry.id}
                entry={entry}
                direction={direction}
                index={i}
                highlighted={direction === "received" && highlightId === entry.id}
              />
            ))}
          </div>
          {journal.data?.nextCursor && !search && (
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setCursor(journal.data!.nextCursor!)}
                disabled={journal.isFetching}
                className="text-[#7dd87d] hover:text-white hover:bg-[#7dd87d]/10 min-h-[44px] rounded-xl"
              >
                {journal.isFetching ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Shareable gratitude summary ── */}
      {userId != null && <ShareCard userId={userId} />}

      <SendGratitudeModal open={sendOpen} onOpenChange={setSendOpen} />
    </div>
  );
}

/* ─── Cycle urgency band ────────────────────────────────────────────── */

interface CycleBandData {
  sends: { peopleThisCycle: number; fullPowerThreshold: number; fullPowerRemaining: number };
  cycle: { daysRemaining: number };
}

function CycleBand({ overview, onSend }: { overview: CycleBandData; onSend: () => void }) {
  const { sends, cycle } = overview;
  const urgent = cycle.daysRemaining <= 3;
  let line: React.ReactNode;
  if (sends.peopleThisCycle === 0) {
    line = <>Your gratitude budget resets at the new moon. Acknowledge up to <b className="text-white">{sends.fullPowerThreshold}</b> people at full power.</>;
  } else if (sends.fullPowerRemaining > 0) {
    line = <><b className="text-white">{sends.fullPowerRemaining}</b> full-power {sends.fullPowerRemaining === 1 ? "send" : "sends"} left before the new moon.</>;
  } else {
    line = <>You've spent your {sends.fullPowerThreshold} full-power sends. More still land, at a lighter touch.</>;
  }
  return (
    <div
      className="rounded-2xl border px-4 py-3 sm:px-5 flex items-center gap-3 flex-wrap"
      style={{
        borderColor: urgent ? "rgba(255,215,0,0.4)" : "rgba(125,216,125,0.28)",
        background: urgent
          ? "linear-gradient(90deg, rgba(255,215,0,0.14), rgba(212,160,23,0.08))"
          : "linear-gradient(90deg, rgba(125,216,125,0.1), rgba(74,124,89,0.06))",
      }}
    >
      <Moon className="w-5 h-5 flex-shrink-0" style={{ color: urgent ? "#ffd700" : "#7dd87d" }} />
      <div className="flex-1 min-w-[180px]">
        <p className="text-sm text-[#f0ebe3] leading-snug">{line}</p>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: urgent ? "#ffd700" : "#d4a574", fontFamily: "var(--font-display)" }}>
          {urgent ? "Cycle closes" : "New moon"} in {cycle.daysRemaining} {cycle.daysRemaining === 1 ? "day" : "days"}
        </p>
      </div>
      <Button
        size="sm"
        onClick={onSend}
        className={`min-h-[44px] rounded-xl font-bold px-4 ${urgent ? "bg-[#ffd700] hover:bg-[#ffdf33] text-[#0a1f14]" : "bg-[#7dd87d] hover:bg-[#9de89d] text-[#0a1f14]"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Send className="w-4 h-4 mr-1.5" /> Send gratitude
      </Button>
    </div>
  );
}

/* ─── Shareable summary card ────────────────────────────────────────── */

function ShareCard({ userId }: { userId: number }) {
  const themesQ = trpc.gratitude.myThemes.useQuery();
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [bust, setBust] = useState(0);

  const data = themesQ.data;
  const activeThemes = useMemo(
    () => (data?.themes ?? []).filter((t) => !disabled.has(t.key)),
    [data, disabled],
  );

  if (themesQ.isLoading) {
    return <div className="glass-panel rounded-2xl h-40 animate-pulse" />;
  }
  if (!data || data.messageCount === 0) {
    return null; // nothing to summarize yet — the empty wall already teaches
  }

  const themeKeys = activeThemes.map((t) => t.key).join(",");
  const imgUrl = `/api/og?type=gratitude&id=${userId}${themeKeys ? `&themes=${themeKeys}` : ""}&v=${bust}`;
  const shareText = caption ?? data.blurb;
  const shareUrl = "https://regencivics.earth";

  const toggle = (key: string) =>
    setDisabled((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const copyCaption = () =>
    copyToClipboard(`${shareText} ${shareUrl}`).then((ok) => {
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    });

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="w-4 h-4 text-[#ffd700]" />
        <h3 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Share your gratitude</h3>
      </div>
      <p className="text-xs text-[#f0ebe3]/60 mb-3">
        A summary of what people keep thanking you for. No names, no quotes — just the themes. Tune it, then share.
      </p>

      {/* Live preview */}
      <div className="rounded-xl overflow-hidden border border-[#7dd87d]/20 bg-[#0a1f14] mb-3">
        <img
          key={imgUrl}
          src={imgUrl}
          alt="Your gratitude summary card"
          className="w-full block"
          style={{ aspectRatio: "1200 / 630" }}
          loading="lazy"
        />
      </div>

      {/* Theme toggles */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(data.themes ?? []).map((t) => {
          const on = !disabled.has(t.key);
          return (
            <button
              key={t.key}
              onClick={() => { toggle(t.key); setBust((b) => b + 1); }}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${on ? "bg-[#7dd87d]/15 border-[#7dd87d]/40 text-[#a8e6a8]" : "bg-white/5 border-white/10 text-[#f0ebe3]/40 line-through"}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Editable caption */}
      <label className="block text-[11px] uppercase tracking-wider text-[#f0ebe3]/50 font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
        Caption
      </label>
      <textarea
        value={shareText}
        onChange={(e) => setCaption(e.target.value)}
        rows={2}
        maxLength={280}
        className="w-full text-sm text-white bg-white/5 border border-[#7dd87d]/20 rounded-xl p-2.5 resize-none focus:outline-none focus:border-[#7dd87d]/50"
      />
      <div className="flex items-center justify-between mt-1 mb-3">
        <button
          onClick={() => { setCaption(data.blurb); setBust((b) => b + 1); }}
          className="text-[11px] text-[#7dd87d] hover:text-white inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Reset to suggested
        </button>
        <span className="text-[10.5px] text-[#f0ebe3]/40">{shareText.length}/280</span>
      </div>

      {/* Share actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <XShareButton url={shareUrl} title={shareText}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]" style={{ fontFamily: "var(--font-display)" }}>Post to X</span>
        </XShareButton>
        <LinkedinShareButton url={shareUrl} title={shareText} summary={shareText}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]" style={{ fontFamily: "var(--font-display)" }}>LinkedIn</span>
        </LinkedinShareButton>
        <BlueskyShareButton url={shareUrl} title={shareText}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]" style={{ fontFamily: "var(--font-display)" }}>Bluesky</span>
        </BlueskyShareButton>
        <FacebookShareButton url={shareUrl}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]" style={{ fontFamily: "var(--font-display)" }}>Facebook</span>
        </FacebookShareButton>
        <button
          onClick={copyCaption}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-[#7dd87d]" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
        <a
          href={imgUrl}
          download="my-gratitude.png"
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/8 hover:bg-white/14 border border-white/10 text-[#f0ebe3] rounded-xl px-3 min-h-[40px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Download className="w-3.5 h-3.5" /> Image
        </a>
      </div>
    </div>
  );
}
