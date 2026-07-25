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
import { Bot, Gauge, Hourglass, ShieldCheck, OctagonPause, Link2, Check } from "lucide-react";

const TIER_MEANING: Record<number, string> = {
  0: "Humans apply ratified changes by hand.",
  1: "Ratified variable and bounds changes apply themselves. Features wait for humans.",
  2: "Ratified content changes apply themselves too. (Designed, not yet built.)",
  3: "Ratified features build and ship themselves through gated machinery.",
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
      <p className="text-white/75 text-sm leading-relaxed safe-prose">
        Ratified decisions execute themselves. How much power the machine holds is a game
        variable this community raises and lowers by vote, the same as any other rule.
      </p>

      {/* The tier ladder */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-[#7dd87d]" />
          <span className="text-white text-sm font-semibold">Autonomy tier: {tier} of 3</span>
        </div>
        <div className="flex gap-1.5 mb-2" role="img" aria-label={`Autonomy tier ${tier} of 3`}>
          {[0, 1, 2, 3].map((t) => (
            <div
              key={t}
              className={`h-1.5 flex-1 rounded-full ${t <= tier ? "bg-[#7dd87d]" : "bg-white/15"}`}
            />
          ))}
        </div>
        <p className="text-white/70 text-xs leading-relaxed">{TIER_MEANING[tier] ?? TIER_MEANING[1]}</p>
      </div>

      {/* The guardrails, at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <Hourglass className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">Launch window</p>
            <p className="text-white/65 mt-0.5">
              A machine-built feature waits {s.launchWindowHours} hours in the open before it can
              ship. Any Steward can pause it.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">Human approval</p>
            <p className="text-white/65 mt-0.5">
              {s.launchRequireApproval
                ? "Required. A human approves every machine-built feature before it ships. The community can vote this off when trust is earned."
                : "Voted off. Machine-built features ship on gates and the launch window alone."}
            </p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
          <OctagonPause className="w-3.5 h-3.5 text-red-300 flex-shrink-0 mt-0.5" />
          <div className="safe-prose">
            <p className="text-white font-semibold">Circuit breaker</p>
            <p className="text-white/65 mt-0.5">
              {s.circuitBreakerFailures} failed ships in a row drop the machine back to tier 1
              automatically. Code-enforced.
            </p>
          </div>
        </div>
      </div>

      {/* In-flight machine ships */}
      {inFlight.length === 0 ? (
        <p className="text-white/60 text-xs safe-prose flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-white/60" />
          Nothing is in flight. At tier {tier}, ratified features park here and wait for
          {tier < 3 ? " the community to raise the tier." : " their launch window."}
        </p>
      ) : (
        <ul className="space-y-2">
          {inFlight.map((e: any) => {
            const detail = typeof e.detail === "string" ? safeParse(e.detail) : (e.detail ?? {});
            return (
              <li key={e.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Bot className="w-3.5 h-3.5 text-[#7dd87d]" />
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
                {isAuthenticated && e.status === "shipping" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={pauseReason[e.id] ?? ""}
                      onChange={(ev) => setPauseReason((r) => ({ ...r, [e.id]: ev.target.value }))}
                      placeholder="Why pause this ship?"
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/60"
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
          className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/60"
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
