/**
 * The Evolution Engine, on the page (ASSEMBLY_PAGE_SPEC.md section 7.3 step 4).
 *
 * Two pieces:
 * - EvolutionEngineSection: the public status panel. The autonomy tier, the
 *   launch window, the human approval requirement, the circuit breaker, and
 *   any in-flight machine ships with a pause control. All of it reads from
 *   assembly.evolutionStatus, which reads community-governed game variables:
 *   this panel is the community watching its own machine.
 * - HyphaLinkRow: the one-paste link on a Deciding proposal. The on-chain
 *   ratification log carries only Hypha's numeric proposal id, so the
 *   proposer pastes their Hypha proposal link once and the outcome then
 *   arrives machine-to-machine (assembly.recordHyphaProposal).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bot, Gauge, Hourglass, ShieldCheck, OctagonPause, Link2, Check, ChevronDown, Sparkles } from "lucide-react";

/** Plain-language meaning of each autonomy tier, shown under the ladder. */
const TIER_MEANING: Record<number, string> = {
  0: "People make every change by hand.",
  1: "The Game changes its own numbers on its own. New features still wait for a person.",
  2: "The Game updates its own words and content on its own too. (Designed, not built yet.)",
  3: "The Game builds and ships its own new features, start to finish, through safety checks.",
};

/** One concrete, everyday example of what each tier actually does. */
const TIER_EXAMPLE: Record<number, string> = {
  0: "A passed vote sits in a list until someone types the change in by hand.",
  1: "The community votes to raise how much support a proposal needs, and the moment the vote passes, the rule changes itself.",
  2: "A vote reworks the wording of a quest, and the new words appear on the site on their own.",
  3: "A vote asks for a new button on a page. The machine writes it, tests it, and ships it while the community watches.",
};

export function EvolutionEngineSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const statusQuery = trpc.assembly.evolutionStatus.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();
  const pauseMutation = trpc.assembly.pauseShip.useMutation({
    onSuccess: () => utils.assembly.evolutionStatus.invalidate(),
  });
  const [pauseReason, setPauseReason] = useState<Record<number, string>>({});

  const s = statusQuery.data;
  if (statusQuery.isLoading) return <p className="text-white/70 text-sm">Loading...</p>;
  if (!s) return null;

  const tier = s.tier ?? 1;
  const inFlight = (s.inFlight ?? []).filter((e: any) => e.status !== "shipped");
  const shippedRecently = (s.inFlight ?? []).filter((e: any) => e.status === "shipped").slice(0, 3);

  return (
    <div className="space-y-4">
      {/* The plain-language heart of it */}
      <div className="space-y-2.5 safe-prose">
        <p className="text-white/85 text-sm leading-relaxed">
          The Game grows by the hands of the people playing it. The community writes the rules and
          the community changes them, with no single person holding the final say.
        </p>
        <p className="text-white/75 text-sm leading-relaxed">
          When a proposal passes, our own automation can take it from there: build it, ship it, and
          let the Game evolve on its own. Right now a person still checks each step while we get the
          system trustworthy. As that trust builds, the community votes to give the machine more room.
        </p>
      </div>

      {/* The longer story, tucked away for anyone who wants it */}
      <details className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer list-none select-none hover:bg-white/[0.07] transition-colors">
          <Sparkles className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
          <span className="text-white text-sm font-semibold flex-1">How this works, in full</span>
          <ChevronDown className="w-4 h-4 text-white/50 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-3 text-sm text-white/70 leading-relaxed safe-prose border-t border-white/10">
          <p>
            Every change to the Game starts as a conversation in the community. An idea gets shaped
            into a proposal, people signal where they stand, and if it has the support it moves to a
            binding vote. The vote itself lives on Hypha, the Game's shared agreement ledger.
          </p>
          <p>
            Once a vote passes, the Evolution Engine carries out what the community decided. How much
            it is allowed to do on its own is set by three levels the community turns up and down by
            vote, the same way it changes any other rule:
          </p>
          <ol className="space-y-2 pl-1">
            {[1, 2, 3].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {t}
                </span>
                <span>
                  <span className="text-white/90 font-semibold">{TIER_MEANING[t]}</span>{" "}
                  <span className="text-white/60">For example: {TIER_EXAMPLE[t]}</span>
                </span>
              </li>
            ))}
          </ol>
          <p>
            The whole point is where this leads. Over time the community can decide it no longer
            needs individual engineers watching over every change, and the Game can keep evolving
            for the people who play it, on its own. We start slow, with a person checking each step,
            and hand the machine more only as it earns the trust.
          </p>
          <p className="text-white/60">
            Three safety rails always hold, and the community cannot vote them away: a waiting
            period in the open before anything ships, a person who can approve or pause any machine
            build, and an automatic stop that pulls the machine back the moment it starts to fail.
          </p>
        </div>
      </details>

      {/* The tier ladder */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#7dd87d]/[0.08] to-white/[0.03] border border-[#7dd87d]/20">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-[#7dd87d]" />
          <span className="text-white text-sm font-semibold">How much the Game runs itself: level {tier} of 3</span>
        </div>
        <div className="flex gap-1.5 mb-2.5" role="img" aria-label={`Self-running level ${tier} of 3`}>
          {[0, 1, 2, 3].map((t) => (
            <div
              key={t}
              className={`h-2 flex-1 rounded-full transition-colors ${t <= tier ? "bg-[#7dd87d] shadow-[0_0_8px_rgba(125,216,125,0.4)]" : "bg-white/12"}`}
            />
          ))}
        </div>
        <p className="text-white/75 text-xs leading-relaxed">{TIER_MEANING[tier] ?? TIER_MEANING[1]}</p>
        <p className="text-white/55 text-[11px] leading-relaxed mt-1.5">
          Where we are today: {TIER_EXAMPLE[tier] ?? TIER_EXAMPLE[1]}
        </p>
      </div>

      {/* The guardrails, at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <Hourglass className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">A waiting period</p>
            <p className="text-white/65 mt-0.5">
              Anything the machine builds waits {s.launchWindowHours} hours in the open before it can
              go live. Any Steward can pause it in that window.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">A person signs off</p>
            <p className="text-white/65 mt-0.5">
              {s.launchRequireApproval
                ? "For now, a person approves everything the machine builds before it ships. The community can vote this off once the machine has earned it."
                : "The community has voted this off. The machine ships on its safety checks and the waiting period alone."}
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <OctagonPause className="w-3.5 h-3.5 text-red-300 flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">An automatic stop</p>
            <p className="text-white/65 mt-0.5">
              {s.circuitBreakerFailures} failed ships in a row pull the machine back to level 1 on
              their own. Built into the code, not up for a vote.
            </p>
          </div>
        </div>
      </div>

      {/* In-flight machine ships */}
      {inFlight.length === 0 ? (
        <p className="text-white/60 text-xs safe-prose flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-white/40" />
          Nothing is being built right now. At level {tier}, a passed feature waits here until
          {tier < 3 ? " the community raises the level." : " its waiting period is up."}
        </p>
      ) : (
        <ul className="space-y-2">
          {inFlight.map((e: any) => {
            const detail = typeof e.detail === "string" ? safeParse(e.detail) : (e.detail ?? {});
            return (
              <li key={e.id} className={`p-3 rounded-xl border ${e.isExample ? "bg-[#7dd87d]/[0.06] border-dashed border-[#7dd87d]/30" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Bot className="w-3.5 h-3.5 text-[#7dd87d]" />
                  {e.isExample && <ExampleBadge />}
                  <span className="text-white font-semibold">Proposal #{e.proposalId}</span>
                  <span className={`capitalize font-semibold ${e.status === "paused" ? "text-amber-300" : "text-[#7dd87d]"}`}>{e.status}</span>
                  {detail?.prUrl && (
                    <a href={detail.prUrl} target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] hover:underline">
                      the code under review
                    </a>
                  )}
                  {detail?.launchWindowStartedAt && e.status === "shipping" && (
                    <span className="text-white/60">
                      window opened {new Date(detail.launchWindowStartedAt).toLocaleString()}
                    </span>
                  )}
                  {e.status === "paused" && detail?.pauseReason && (
                    <span className="text-white/60">paused: {detail.pauseReason}</span>
                  )}
                </div>
                {e.isExample && (
                  <ExampleNote>
                    A stand-in ship, here to show what this looks like when the machine is building
                    a real feature. It never goes live.
                  </ExampleNote>
                )}
                {isAuthenticated && !e.isExample && e.status === "shipping" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={pauseReason[e.id] ?? ""}
                      onChange={(ev) => setPauseReason((r) => ({ ...r, [e.id]: ev.target.value }))}
                      placeholder="Why pause this ship?"
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40"
                      maxLength={300}
                    />
                    <button
                      onClick={() => pauseMutation.mutate({ executionId: e.id, reason: pauseReason[e.id] ?? "" })}
                      disabled={pauseMutation.isPending || !(pauseReason[e.id] ?? "").trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-300/40 text-amber-200 text-xs font-bold hover:bg-amber-400/25 transition-colors disabled:opacity-40"
                    >
                      <OctagonPause className="w-3 h-3" /> Pause
                    </button>
                  </div>
                )}
                {pauseMutation.error && (
                  <p className="text-red-300 text-[11px] mt-1.5">{pauseMutation.error.message}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {shippedRecently.length > 0 && (
        <div className="text-[11px] text-white/60 safe-prose">
          Recently shipped by the machine:{" "}
          {shippedRecently.map((e: any, i: number) => (
            <span key={e.id}>{i > 0 && ", "}proposal #{e.proposalId}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

/** The badge that marks a seeded demonstration so no one mistakes it for a
 * live proposal. Shared across every Assembly section. */
export function ExampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] text-[10px] font-bold uppercase tracking-wide">
      <Sparkles className="w-2.5 h-2.5" /> Example
    </span>
  );
}

/** One-line caption under a demonstration card explaining why it is here. */
export function ExampleNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#7dd87d]/70 text-[11px] mt-1.5 leading-relaxed safe-prose italic">
      {children}
    </p>
  );
}

/** The one-paste link that arms machine ratification for a Deciding proposal.
 * Shown to the proposer (and admins). Idempotent: pasting again is safe. */
export function HyphaLinkRow({ proposal, currentUserId, isAdmin }: {
  proposal: { id: number; authorId?: number; hyphaBridgeKey?: string | null };
  currentUserId?: number | null;
  isAdmin?: boolean;
}) {
  const [link, setLink] = useState("");
  const [linked, setLinked] = useState(false);
  const linkMutation = trpc.assembly.recordHyphaProposal.useMutation({
    onSuccess: () => setLinked(true),
  });

  const canLink = !!proposal.hyphaBridgeKey && (isAdmin || (currentUserId != null && proposal.authorId === currentUserId));
  if (!canLink) return null;

  if (linked) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-[#7dd87d] mt-2">
        <Check className="w-3 h-3" /> Linked. When the Hypha vote concludes, the outcome applies itself.
      </p>
    );
  }

  return (
    <div className="mt-2 w-full">
      <p className="text-white/60 text-[11px] mb-1.5 safe-prose">
        Paste your Hypha proposal link so the outcome arrives on its own when the vote concludes.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://app.hypha.earth/..."
          className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40"
          maxLength={500}
        />
        <button
          onClick={() => linkMutation.mutate({ proposalId: proposal.id, hyphaProposal: link })}
          disabled={linkMutation.isPending || !link.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-bold hover:bg-[#7dd87d]/25 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <Link2 className="w-3 h-3" /> Link it
        </button>
      </div>
      {linkMutation.error && (
        <p className="text-red-300 text-[11px] mt-1">{linkMutation.error.message}</p>
      )}
    </div>
  );
}
