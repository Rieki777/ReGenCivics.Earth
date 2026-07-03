/**
 * Assembly
 * Route: /assembly
 *
 * The Game's community-governed space: one stacked page where forum ideas
 * become proposals, the community signals where it stands, and ratified
 * outcomes are recorded with their full trail. Replaces /proposals and
 * /community/decisions (both redirect here).
 *
 * Phase 1 (skeleton): scope banner, Needs You (decision queue + load),
 * Forming (existing signaling proposals), Last Call placeholder, Deciding
 * mirror, Record (recently ratified), delegation footer. Every empty state
 * teaches the flow. The Signal, synthesis, and lifecycle lanes land in
 * later phases.
 *
 * Spec: ASSEMBLY_PAGE_SPEC.md
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Link } from "wouter";
import {
  Vote, Activity, CheckCircle2, AlertTriangle, Sparkles, ArrowRight,
  Landmark, Hourglass, Users, MessageCircle, ExternalLink,
} from "lucide-react";
import { SignalControl, SignalReadout } from "@/components/assembly/SignalControl";

const HYPHA_DHO_URL = "https://app.hypha.earth/en/dho/regen-games/";
const HYPHA_MEMBERS_URL = "https://app.hypha.earth/en/dho/regen-games/members/";

const TRACK_LABEL: Record<string, string> = {
  fund: "Fund",
  game: "Game",
  both: "Fund + Game",
};

function SectionShell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 max-w-5xl mx-auto mb-8">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="font-bold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Assembly() {
  const { isAuthenticated } = useAuth();

  const queueQuery = trpc.governance.myDecisionQueue.useQuery(undefined, { enabled: isAuthenticated });
  const loadQuery = trpc.governance.communityLoad.useQuery();
  const formingQuery = trpc.assembly.forming.useQuery(undefined, { refetchInterval: 15_000, staleTime: 10_000 });
  const decidingQuery = trpc.proposals.list.useQuery({ status: "in_governance", limit: 25 });
  const recentlyRatifiedQuery = trpc.governance.recentlyRatified.useQuery({ limit: 8 });

  const load = loadQuery.data;
  const loadLevelColor = load?.level === "critical"
    ? "text-red-300"
    : load?.level === "warning"
      ? "text-amber-300"
      : "text-[#7dd87d]";

  const forming = (formingQuery.data as any[]) ?? [];
  const deciding = (decidingQuery.data as any[]) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Assembly | ReGen Civics"
        description="The Game's community-governed space. Raise a proposal, signal where you stand, and help decide what advances to an on-chain vote."
        url="/assembly"
      />
      <BackButton />

      {/* Header */}
      <section className="pt-20 pb-4 px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Landmark className="w-7 h-7 text-[#7dd87d]" />
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Assembly
          </h1>
        </div>
      </section>

      {/* Scope banner, always visible */}
      <section className="px-4 max-w-5xl mx-auto mb-8">
        <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/35 rounded-2xl p-4">
          <p className="text-white/85 text-sm leading-relaxed safe-prose">
            <strong className="text-white">This is the Game's community-governed space.</strong>{" "}
            Anyone in the community can raise a proposal, signal where they stand, and help decide
            what advances to an on-chain vote. The Fund is governed separately.
          </p>
        </div>
      </section>

      {/* Needs you (logged-in only) */}
      {isAuthenticated && (
        <SectionShell icon={<Vote className="w-4 h-4 text-[#7dd87d]" />} title="Needs you">
          {queueQuery.isLoading ? (
            <p className="text-white/70 text-sm">Loading...</p>
          ) : (queueQuery.data?.length ?? 0) === 0 ? (
            <p className="text-white/65 text-sm">
              Nothing is waiting on you right now. When a decision opens that needs your voice, it lands here.
            </p>
          ) : (
            <ul className="space-y-2">
              {(queueQuery.data ?? []).map((d: any) => (
                <li key={d.id}>
                  <Link
                    href={`/community/post/${d.forumPostId}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0 safe-prose">
                      <p className="text-white text-sm font-semibold truncate">Decision #{d.id}</p>
                      <p className="text-white/70 text-xs">
                        {TRACK_LABEL[d.track] ?? d.track} track
                        {d.closesAt && ` · closes ${new Date(d.closesAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7dd87d]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {load && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
              <Activity className={`w-3.5 h-3.5 ${loadLevelColor}`} />
              <span className="text-white/70">
                Community load: <span className={loadLevelColor}>{load.rolling30Day} decisions in 30 days</span>
                {" "}(warning at {load.warning}, critical at {load.critical})
              </span>
              {load.level === "critical" && <AlertTriangle className="w-3.5 h-3.5 text-red-300" />}
            </div>
          )}
        </SectionShell>
      )}

      {/* Forming */}
      <SectionShell icon={<Users className="w-4 h-4 text-[#7dd87d]" />} title="Forming">
        {formingQuery.isLoading ? (
          <p className="text-white/70 text-sm">Loading...</p>
        ) : forming.length === 0 ? (
          <div className="text-white/65 text-sm safe-prose space-y-2">
            <p>
              Proposals gathering support live here. Every proposal starts as a conversation:
              raise an idea in the <Link href="/community" className="text-[#7dd87d] hover:underline">forum</Link>,
              let the room weigh in, then shape it into a proposal.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {forming.map((p: any) => (
              <li key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px] safe-prose">
                    <p className="text-white text-sm font-semibold">{p.title}</p>
                    {p.description && (
                      <p className="text-white/65 text-xs mt-1 leading-relaxed">{String(p.description).slice(0, 180)}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/70">
                      <span className="capitalize">{String(p.category ?? "").replace(/_/g, " ")}</span>
                      {p.forumThreadId && (
                        <Link href={`/community/post/${p.forumThreadId}`} className="text-[#7dd87d] hover:underline inline-flex items-center gap-1">
                          <MessageCircle className="w-2.5 h-2.5" /> Read the conversation
                        </Link>
                      )}
                    </div>
                  </div>
                  <SignalReadout signal={p.signal} />
                </div>
                <div className="mt-3">
                  <SignalControl proposalId={p.id} signal={p.signal} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* Last call */}
      <SectionShell icon={<Hourglass className="w-4 h-4 text-amber-300" />} title="Last call">
        <p className="text-white/65 text-sm safe-prose">
          Proposals about to move to a binding vote pause here for a final 48 hours, one last chance
          for a late objection before the vote opens. When a proposal reaches this stage it appears
          here with its countdown.
        </p>
      </SectionShell>

      {/* Deciding */}
      <SectionShell icon={<Vote className="w-4 h-4 text-[#7dd87d]" />} title="Deciding">
        {decidingQuery.isLoading ? (
          <p className="text-white/70 text-sm">Loading...</p>
        ) : deciding.length === 0 ? (
          <p className="text-white/65 text-sm safe-prose">
            Proposals at a binding vote show here as a mirror. The vote itself lives on{" "}
            <a href={HYPHA_DHO_URL} target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] hover:underline">Hypha</a>,
            the Game's agreement ledger on Base.
          </p>
        ) : (
          <ul className="space-y-2">
            {deciding.map((p: any) => (
              <li key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0 safe-prose">
                  <p className="text-white text-sm font-semibold">{p.title}</p>
                  <p className="text-white/70 text-[11px] capitalize">{String(p.category ?? "").replace(/_/g, " ")}</p>
                </div>
                <a
                  href={HYPHA_DHO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7dd87d] hover:text-[#9de89d] transition-colors flex-shrink-0"
                >
                  Vote on Hypha <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* Record */}
      <SectionShell icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} title="Record">
        {recentlyRatifiedQuery.isLoading ? (
          <p className="text-white/70 text-sm">Loading...</p>
        ) : (recentlyRatifiedQuery.data?.length ?? 0) === 0 ? (
          <p className="text-white/65 text-sm safe-prose">
            Ratified outcomes and their full trail (conversation, proposal, vote, execution) are
            recorded here so the community can always trace how the Game changed.
          </p>
        ) : (
          <ul className="space-y-2">
            {(recentlyRatifiedQuery.data ?? []).map((d: any) => (
              <li key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 safe-prose">
                  <Link href={`/community/post/${d.forumPostId}`} className="text-white text-sm font-semibold hover:text-[#7dd87d] transition-colors">
                    Decision #{d.id}
                  </Link>
                  {d.outcomeSummary && (
                    <p className="text-white/65 text-xs mt-1 leading-relaxed">{String(d.outcomeSummary).slice(0, 200)}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-white/70">
                    <span className="capitalize">{TRACK_LABEL[d.track] ?? d.track}</span>
                    {d.closedAt && <span>· {new Date(d.closedAt).toLocaleDateString()}</span>}
                    {d.hyphaBridgeId && (
                      <Link href={`/bridge/hypha/${d.hyphaBridgeId}`} className="text-amber-300 hover:underline inline-flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Bridge to Hypha
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* Delegation footer */}
      <section className="px-4 max-w-5xl mx-auto pb-12">
        <div className="text-center">
          <a
            href={HYPHA_MEMBERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#7dd87d] transition-colors"
          >
            Delegate your voice on Hypha <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
