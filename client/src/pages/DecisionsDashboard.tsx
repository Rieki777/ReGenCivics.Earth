/**
 * DecisionsDashboard
 * Route: /community/decisions
 *
 * Mission control for the governance pipeline. Five panels:
 *   1. Your queue (open decisions waiting on you)
 *   2. Open across all tracks
 *   3. Recently ratified
 *   4. Community load indicator
 *   5. Your tenants
 *
 * Spec: archive/FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md section 2.9 (superseded by ADR-23)
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { Link } from "wouter";
import {
  Vote, Activity, CheckCircle2, AlertTriangle, Layers, Sparkles, ArrowRight,
} from "lucide-react";

const TRACK_LABEL: Record<string, string> = {
  fund: "Fund",
  game: "Game",
  both: "Fund + Game",
};

export default function DecisionsDashboard() {
  const { isAuthenticated } = useAuth();

  const queueQuery = trpc.governance.myDecisionQueue.useQuery(undefined, { enabled: isAuthenticated });
  const recentlyRatifiedQuery = trpc.governance.recentlyRatified.useQuery({ limit: 8 });
  const loadQuery = trpc.governance.communityLoad.useQuery();
  const tenantsQuery = trpc.governance.myTenants.useQuery(undefined, { enabled: isAuthenticated });

  const load = loadQuery.data;
  const loadColor = load?.level === "critical"
    ? "from-red-500/30 to-red-500/10 border-red-500/50 text-red-200"
    : load?.level === "warning"
      ? "from-amber-500/25 to-amber-500/10 border-amber-500/50 text-amber-200"
      : "from-[#7dd87d]/20 to-[#7dd87d]/8 border-[#7dd87d]/50 text-[#7dd87d]";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Decisions | ReGen Civics" description="Governance load dashboard for the ReGen Civics community." />
      <BackButton />

      <section className="pt-20 pb-6 px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Vote className="w-7 h-7 text-[#7dd87d]" />
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Decisions
          </h1>
        </div>
        <p className="text-white/65 text-sm max-w-2xl safe-prose">
          Mission control for the governance pipeline. Forum threads become formal decisions, ratified outcomes become agreements, and decisions that move tokens cross the Hypha Bridge to Base.
        </p>
      </section>

      {/* Community load indicator */}
      <section className="px-4 max-w-5xl mx-auto mb-8">
        <div className={`bg-gradient-to-br rounded-2xl border p-5 ${loadColor}`}>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5" />
            <h2 className="font-bold text-base">Community governance load</h2>
          </div>
          {load && (
            <>
              <p className="text-2xl font-bold mb-1">{load.rolling30Day} decisions in the last 30 days</p>
              <div className="text-xs opacity-85 mb-3">
                Warning at {load.warning} · Critical at {load.critical}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-current rounded-full transition-all"
                  style={{ width: `${Math.min(100, (load.rolling30Day / Math.max(load.critical, 1)) * 100)}%` }}
                />
              </div>
              {load.level === "critical" && (
                <p className="text-xs mt-3 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Community is over-capacity. Consider holding off on new decisions or consolidating related ones.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Your queue */}
      {isAuthenticated && (
        <section className="px-4 max-w-5xl mx-auto mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Vote className="w-4 h-4 text-[#7dd87d]" />
              <h2 className="font-bold text-white text-base">Your queue</h2>
              <span className="text-xs text-white/70 ml-auto">{queueQuery.data?.length ?? 0} open</span>
            </div>
            {queueQuery.isLoading ? (
              <p className="text-white/70 text-sm">Loading...</p>
            ) : (queueQuery.data?.length ?? 0) === 0 ? (
              <p className="text-white/65 text-sm">No decisions waiting on you right now.</p>
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
          </div>
        </section>
      )}

      {/* Recently ratified */}
      <section className="px-4 max-w-5xl mx-auto mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-white text-base">Recently ratified</h2>
          </div>
          {recentlyRatifiedQuery.isLoading ? (
            <p className="text-white/70 text-sm">Loading...</p>
          ) : (recentlyRatifiedQuery.data?.length ?? 0) === 0 ? (
            <p className="text-white/65 text-sm">No ratified decisions yet. Promote a forum thread to start the pipeline.</p>
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
                      <p className="text-white/65 text-xs mt-1 leading-relaxed">{d.outcomeSummary.slice(0, 200)}</p>
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
        </div>
      </section>

      {/* Your tenants */}
      {isAuthenticated && (tenantsQuery.data?.length ?? 0) > 0 && (
        <section className="px-4 max-w-5xl mx-auto mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-[#7dd87d]" />
              <h2 className="font-bold text-white text-base">Your governance spaces</h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {(tenantsQuery.data ?? []).map((t: any) => (
                <li key={t.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white text-sm font-semibold">{t.displayName}</p>
                  <p className="text-white/70 text-[11px] capitalize">{t.tenantType.replace("_", " ")} · role: {t.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </div>
  );
}
