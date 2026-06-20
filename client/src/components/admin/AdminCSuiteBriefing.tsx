/**
 * AdminCSuiteBriefing: the front door of the admin Overview.
 *
 * Surfaces the ecosystem's key metrics at a glance and, on demand, asks the
 * "leadership team" (AI) to brief the CEO C-suite style: a one-line headline
 * plus each chief's bullet updates, the decisions that need the CEO, and the
 * actions the team recommends.
 *
 * Phase 1: read-only briefing + KPIs (mobile-first, no horizontal overflow).
 * Action execution and self-learning automations come in later phases; for now
 * a recommended action hands off to the admin AI assistant via a window event.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Loader2, RefreshCw, Building2, TrendingUp, Inbox, Users, Megaphone,
  AlertCircle, ChevronRight, Vote, Shield, Mail,
} from "lucide-react";

type Snapshot = {
  generatedAt: string;
  applications: { total: number; pending: number; approved: number; active: number; hectares: number };
  investors: { total: number; new: number; contacted: number; inDiscussion: number; committed: number };
  inquiries: { total: number; needsReview: number };
  community: { forumPosts: number; forumReplies: number; players: number; newsletterActive: number };
  moderation: { pendingReports: number };
  governance: { openProposals: number };
  events: { upcoming: number; recordings: number };
  campaigns: { total: number };
  weekly: { newApplications: number; newForumPosts: number; newForumReplies: number; newPlayers: number };
};

type Chief = {
  role: string;
  bullets: string[];
  decisions?: string[];
  actions?: { label: string; detail?: string }[];
};
type Briefing = { headline?: string; chiefs?: Chief[] };

function Kpi({ icon: Icon, label, value, sub, attention }: {
  icon: React.ElementType; label: string; value: number; sub?: string; attention?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${attention ? "border-amber-400/50 bg-amber-50" : "border-[#1a472a]/12 bg-white"}`}>
      <div className="flex items-center gap-1.5 text-[#1a472a]/60 mb-1">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#1a472a] tabular-nums leading-none">{value.toLocaleString()}</div>
      {sub && <div className={`text-xs mt-1 truncate ${attention ? "text-amber-700 font-semibold" : "text-[#1a472a]/55"}`}>{sub}</div>}
    </div>
  );
}

export function AdminCSuiteBriefing() {
  const snapQuery = trpc.admin.ecosystemSnapshot.useQuery(undefined, { staleTime: 60_000 });
  const brief = trpc.admin.briefing.useMutation();
  const automations = trpc.adminActions.suggestAutomations.useQuery(undefined, { staleTime: 120_000 });

  const [focus, setFocus] = useState("");

  const snap = (brief.data?.snapshot ?? snapQuery.data) as Snapshot | null | undefined;
  const briefing = brief.data?.briefing as Briefing | undefined;

  const runBrief = () => brief.mutate(focus.trim() ? { focus: focus.trim() } : {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0d2818] to-[#1a472a] text-white p-5 md:p-7">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[#7dd87d] text-[11px] font-bold uppercase tracking-[0.2em]">C-suite standup</p>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-display, serif)" }}>
              Your ecosystem at a glance
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Tap Brief me and your team reports what changed, what needs you, and what to do next.
            </p>
          </div>
          <button
            type="button"
            onClick={runBrief}
            disabled={brief.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#7dd87d] text-[#0d2818] font-bold px-5 py-3 min-h-[48px] shadow-lg hover:bg-[#9de89d] transition-colors disabled:opacity-70"
          >
            {brief.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : briefing ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {brief.isPending ? "Gathering updates" : briefing ? "Refresh brief" : "Brief me"}
          </button>
        </div>

        {/* Optional focus for this briefing */}
        <div className="mt-4 flex items-center gap-2">
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runBrief(); }}
            placeholder="Optional: focus this briefing (e.g. the fund pipeline)"
            className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 text-sm text-white placeholder-white/45 focus:outline-none focus:border-[#7dd87d]"
          />
        </div>
      </div>

      {/* This week (what changed since last check-in) */}
      {snap?.weekly && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#1a472a]/70 px-1">
          <span className="font-bold text-[#1a472a]">This week</span>
          <span>+{snap.weekly.newApplications} applications</span>
          <span>+{(snap.weekly.newForumPosts + snap.weekly.newForumReplies).toLocaleString()} forum activity</span>
          <span>+{snap.weekly.newPlayers} players</span>
        </div>
      )}

      {/* KPI grid */}
      {snap && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Kpi icon={Building2} label="Applications" value={snap.applications.total} sub={`${snap.applications.pending} pending review`} attention={snap.applications.pending > 0} />
          <Kpi icon={TrendingUp} label="Investors" value={snap.investors.total} sub={`${snap.investors.new} new`} attention={snap.investors.new > 0} />
          <Kpi icon={Inbox} label="Inquiries" value={snap.inquiries.total} sub={`${snap.inquiries.needsReview} need review`} attention={snap.inquiries.needsReview > 0} />
          <Kpi icon={Shield} label="Moderation" value={snap.moderation?.pendingReports ?? 0} sub={`${snap.moderation?.pendingReports ?? 0} reports open`} attention={(snap.moderation?.pendingReports ?? 0) > 0} />
          <Kpi icon={Users} label="Players" value={snap.community.players} sub={`${snap.community.forumPosts.toLocaleString()} forum posts`} />
          <Kpi icon={Vote} label="Governance" value={snap.governance?.openProposals ?? 0} sub="open proposals" attention={(snap.governance?.openProposals ?? 0) > 0} />
          <Kpi icon={Mail} label="Newsletter" value={snap.community?.newsletterActive ?? 0} sub="active subscribers" />
          <Kpi icon={Megaphone} label="Campaigns" value={snap.campaigns.total} sub={`${snap.events?.upcoming ?? 0} events upcoming`} />
        </div>
      )}

      {/* Self-learning: patterns the team repeats, surfaced as automations. */}
      {(automations.data?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-[#7dd87d]/30 bg-[#7dd87d]/[0.08] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#1a472a]" />
            <h3 className="text-[#1a472a] font-bold text-sm">Patterns worth automating</h3>
          </div>
          <p className="text-[#1a472a]/60 text-xs mb-3">Your assistants noticed you do these often. Tap to have one set it up.</p>
          <div className="flex flex-wrap gap-2">
            {automations.data!.map((a) => (
              <button
                key={a.actionId}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("admin-ea-prompt", { detail: { prompt: `I run "${a.label}" often (${a.count} times recently). Suggest how to automate it and help me set it up.` } }))}
                className="inline-flex items-center gap-2 rounded-full border border-[#1a472a]/20 bg-white hover:bg-[#1a472a]/5 text-[#1a472a] text-xs font-semibold px-3 py-2 min-h-[40px] transition-colors"
              >
                <span className="truncate max-w-[60vw]">{a.label}</span>
                <span className="text-[#1a472a]/45 tabular-nums">×{a.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Briefing */}
      {brief.isPending && (
        <div className="rounded-2xl border border-[#1a472a]/12 bg-white p-8 text-center text-[#1a472a]/60">
          <Loader2 className="w-7 h-7 mx-auto mb-3 animate-spin text-[#7dd87d]" />
          <p className="font-medium">Your leadership team is reviewing the numbers…</p>
        </div>
      )}

      {brief.isError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">The briefing could not be generated.</p>
            <p className="text-sm mt-0.5">Try again in a moment. {brief.error?.message}</p>
          </div>
        </div>
      )}

      {briefing && !brief.isPending && (
        <div className="space-y-4">
          {briefing.headline && (
            <div className="rounded-2xl bg-[#7dd87d]/12 border border-[#7dd87d]/30 p-4">
              <p className="text-[#1a472a] text-base md:text-lg font-semibold leading-snug">{briefing.headline}</p>
            </div>
          )}

          {(briefing.chiefs ?? []).map((chief, i) => (
            <div key={i} className="rounded-2xl border border-[#1a472a]/12 bg-white p-5 min-w-0">
              <h3 className="text-[#1a472a] font-bold text-base mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-[#7dd87d]" />
                {chief.role}
              </h3>

              <ul className="space-y-1.5 mb-3">
                {chief.bullets.map((b, j) => (
                  <li key={j} className="text-[#1a472a]/85 text-sm leading-relaxed flex gap-2 break-words">
                    <span className="text-[#7dd87d] flex-shrink-0">•</span>
                    <span className="min-w-0">{b}</span>
                  </li>
                ))}
              </ul>

              {chief.decisions && chief.decisions.length > 0 && (
                <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1">Decisions for you</p>
                  <ul className="space-y-1">
                    {chief.decisions.map((d, j) => (
                      <li key={j} className="text-amber-900 text-sm leading-snug break-words">{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {chief.actions && chief.actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {chief.actions.map((a, j) => (
                    <button
                      key={j}
                      type="button"
                      title={a.detail}
                      onClick={() => window.dispatchEvent(new CustomEvent("admin-ea-prompt", { detail: { prompt: a.detail || a.label } }))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#1a472a]/20 bg-[#1a472a]/5 hover:bg-[#1a472a]/10 text-[#1a472a] text-xs font-semibold px-3 py-2 min-h-[40px] transition-colors max-w-full"
                    >
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{a.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCSuiteBriefing;
