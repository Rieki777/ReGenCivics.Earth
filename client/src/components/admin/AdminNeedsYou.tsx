/**
 * AdminNeedsYou / Operator Pulse: daily "Needs you today" stack on Overview.
 * Counts + deep links come from admin.operatorPulse (server of truth).
 */
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Megaphone,
  Scissors,
  ScrollText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminHrefExtras } from "@/lib/adminNav";
import { canonicalizeAdminTab, parseOutboundSurface } from "@/lib/adminNav";
import { formatRelativeAge } from "@/lib/adminFreshness";
import type { OperatorPulseItem, OperatorPulseSeverity } from "@shared/operatorPulse";

type SelectTab = (tab: string, extras?: AdminHrefExtras) => void;

const ICONS: Record<string, LucideIcon> = {
  "outbound-failed": Megaphone,
  "call-tasks": ScrollText,
  applications: Building2,
  investors: TrendingUp,
  "recordings-need-cut": Scissors,
  "past-events-no-watch": Calendar,
};

function severityStyles(severity: OperatorPulseSeverity): string {
  if (severity === "high") return "bg-red-50 border-red-200 text-red-700";
  if (severity === "medium") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-[#1a472a]/[0.06] border-[#1a472a]/15 text-[#1a472a]";
}

function parseHref(href: string): { tab: string; extras?: AdminHrefExtras; path?: string } {
  if (href.startsWith("/") && !href.startsWith("/admin")) {
    return { tab: href, path: href };
  }
  try {
    const url = new URL(href, "https://example.local");
    const rawTab = url.searchParams.get("tab") || "overview";
    const canon = canonicalizeAdminTab(rawTab);
    const extras: AdminHrefExtras = {};
    const type = url.searchParams.get("type");
    const open = url.searchParams.get("open");
    const status = url.searchParams.get("status");
    const view = url.searchParams.get("view");
    const surface = url.searchParams.get("surface") ?? canon.surface;
    const filter = url.searchParams.get("filter");
    if (type) extras.type = type;
    if (open) extras.open = open;
    if (status) extras.status = status;
    if (view) extras.view = view;
    if (surface) extras.surface = parseOutboundSurface(surface) ?? surface;
    if (filter) extras.filter = filter;
    return { tab: canon.tab, extras };
  } catch {
    return { tab: "overview" };
  }
}

export function AdminNeedsYou({
  onSelectTab,
  onInvestorFilter,
}: {
  onSelectTab?: SelectTab;
  /** @deprecated Pulse no longer needs list props; kept for call-site compat. */
  inquiries?: unknown[];
  applications?: unknown[];
  investors?: unknown[];
  onInvestorFilter?: (filter: string) => void;
}) {
  const { data, isLoading } = trpc.admin.operatorPulse.useQuery(undefined, { staleTime: 60_000 });
  const [, navigate] = useLocation();

  if (isLoading && !data) {
    return (
      <div className="rounded-3xl border border-[#1a472a]/12 bg-white p-5 md:p-6 animate-pulse">
        <div className="h-6 w-40 bg-[#1a472a]/10 rounded mb-3" />
        <div className="h-12 bg-[#1a472a]/[0.04] rounded-xl" />
      </div>
    );
  }

  const items: OperatorPulseItem[] = data?.items ?? [];
  const total = items.reduce((s, i) => s + i.count, 0);
  const fresh = data?.generatedAt
    ? formatRelativeAge(data.generatedAt).relativeLabel
    : null;

  const runItem = (item: OperatorPulseItem) => {
    const parsed = parseHref(item.href);
    if (parsed.path) {
      navigate(parsed.path);
      return;
    }
    // Write deep link before the target tab mounts so it can read ?filter=.
    try {
      if (item.href.startsWith("/admin")) {
        window.history.pushState(null, "", item.href);
      }
    } catch { /* history unavailable */ }
    if (item.id === "investors") {
      onInvestorFilter?.(parsed.extras?.filter || "needs_action");
    }
    onSelectTab?.(parsed.tab, parsed.extras);
  };

  return (
    <div className="rounded-3xl border border-[#1a472a]/12 bg-white p-5 md:p-6" data-testid="admin-operator-pulse">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <h3
          className="text-[#1a472a] font-bold text-lg"
          style={{ fontFamily: "var(--font-display, serif)" }}
        >
          Needs you today
        </h3>
        {total > 0 && (
          <span className="text-xs font-bold text-white bg-[#1a472a] rounded-full px-2 py-0.5 tabular-nums">
            {total}
          </span>
        )}
        {fresh && (
          <span className="text-xs text-[#1a472a]/55 ml-auto tabular-nums" title={data?.generatedAt}>
            Updated {fresh}
          </span>
        )}
      </div>
      <p className="text-sm text-[#1a472a]/70 mb-3">
        The morning stack — tap a row to jump into the right admin filter.
      </p>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-[#1a472a]/75 text-sm py-3" data-testid="admin-operator-pulse-clear">
          <CheckCircle2 className="w-5 h-5 text-[#4a7c59] flex-shrink-0" />
          You're clear — nothing waiting.
        </div>
      ) : (
        <ul className="divide-y divide-[#1a472a]/[0.08]">
          {items.map((i) => {
            const Icon = ICONS[i.id] ?? AlertTriangle;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => runItem(i)}
                  data-testid={`admin-operator-pulse-${i.id}`}
                  className="w-full flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl text-left hover:bg-[#1a472a]/[0.03] transition-colors group min-h-[52px]"
                >
                  <span
                    className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${severityStyles(i.severity)}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 text-[#1a472a] font-semibold text-sm">{i.label}</span>
                  <span className="text-xl font-bold text-[#1a472a] tabular-nums">
                    {i.count.toLocaleString()}
                  </span>
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
