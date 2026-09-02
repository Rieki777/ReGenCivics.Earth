/**
 * AdminNeedsYou: one prioritized action queue for the admin landing.
 *
 * Merges every "something is waiting on you" signal (pending applications,
 * inquiries to reply to, open forum reports, new investors, live governance)
 * into a single list so the operator never has to hunt tab by tab. Each row
 * deep-links to the section that clears it. Reuses the cached ecosystem
 * snapshot (same query the C-suite briefing runs), so it costs no extra fetch.
 */
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Building2, Inbox, Shield, TrendingUp, Vote, ChevronRight, CheckCircle2 } from "lucide-react";

export function AdminNeedsYou({ onSelectTab }: { onSelectTab?: (tab: string) => void }) {
  const { data: snap } = trpc.admin.ecosystemSnapshot.useQuery(undefined, { staleTime: 60_000 });
  const [, navigate] = useLocation();
  if (!snap) return null;

  const go = (target: string) => (target.startsWith("/") ? navigate(target) : onSelectTab?.(target));

  // Fixed priority order, most time-sensitive first. Only non-empty buckets show.
  const items = [
    { key: "apps", label: "Applications to review", count: snap.applications.pending, target: "applications", icon: Building2 },
    { key: "mod", label: "Forum reports open", count: snap.moderation?.pendingReports ?? 0, target: "/admin/moderation", icon: Shield },
    { key: "inq", label: "Inquiries needing a reply", count: snap.inquiries.needsReview, target: "kanban", icon: Inbox },
    { key: "inv", label: "New investors to contact", count: snap.investors.new, target: "investors", icon: TrendingUp },
    { key: "gov", label: "Governance proposals live", count: snap.governance?.openProposals ?? 0, target: "/assembly", icon: Vote },
  ].filter((i) => i.count > 0);

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="rounded-3xl border border-[#1a472a]/12 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[#1a472a] font-bold text-lg" style={{ fontFamily: "var(--font-display, serif)" }}>Needs you</h3>
        {total > 0 && (
          <span className="text-xs font-bold text-white bg-[#1a472a] rounded-full px-2 py-0.5 tabular-nums">{total}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-[#1a472a]/75 text-sm py-3">
          <CheckCircle2 className="w-5 h-5 text-[#4a7c59] flex-shrink-0" />
          You're all caught up. Nothing is waiting on you right now.
        </div>
      ) : (
        <ul className="divide-y divide-[#1a472a]/[0.08]">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <li key={i.key}>
                <button
                  type="button"
                  onClick={() => go(i.target)}
                  className="w-full flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl text-left hover:bg-[#1a472a]/[0.03] transition-colors group min-h-[52px]"
                >
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 text-[#1a472a] font-semibold text-sm">{i.label}</span>
                  <span className="text-xl font-bold text-[#1a472a] tabular-nums">{i.count.toLocaleString()}</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-[#1a472a]/30 group-hover:text-[#1a472a]/75 group-hover:translate-x-0.5 transition-all" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AdminNeedsYou;
