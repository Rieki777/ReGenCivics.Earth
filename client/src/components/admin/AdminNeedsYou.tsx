/**
 * AdminNeedsYou / Operator Pulse: daily "Needs you today" stack on Overview.
 * Counts + deep links come from admin.operatorPulse (server of truth).
 * "Connect chat alerts" teaches Telegram group + WhatsApp destination setup
 * for morning pulse / recording-ready / event announces (server/_core/notify.ts).
 */
import { useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Megaphone,
  MessageCircle,
  Radio,
  Scissors,
  ScrollText,
  Sprout,
  TrendingUp,
  AlertTriangle,
  FileText,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminHrefExtras } from "@/lib/adminNav";
import { canonicalizeAdminTab, parseOutboundSurface } from "@/lib/adminNav";
import { formatRelativeAge } from "@/lib/adminFreshness";
import type { OperatorPulseItem, OperatorPulseSeverity } from "@shared/operatorPulse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SelectTab = (tab: string, extras?: AdminHrefExtras) => void;

const ICONS: Record<string, LucideIcon> = {
  "reminder-cron": Clock,
  "past-events-no-watch": Calendar,
  "recordings-need-cut": Scissors,
  "live-runbook": Radio,
  "call-tasks": ScrollText,
  investors: TrendingUp,
  "outbound-failed": Megaphone,
  "outbound-drafts": FileText,
  outreach: Sprout,
  applications: Building2,
  "money-routes": Wallet,
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

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={ok ? `${label} configured` : `${label} not configured`}>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-400"}`}
        aria-hidden
      />
      <span className="text-[10px] font-medium text-[#1a472a]/65">{label}</span>
    </span>
  );
}

function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="space-y-2.5 list-none counter-reset-none">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm text-[#1a472a]/85 leading-relaxed">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1a472a]/10 text-[#1a472a] text-xs font-bold flex items-center justify-center tabular-nums mt-0.5">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function CodeChip({ children }: { children: ReactNode }) {
  return (
    <code className="text-[11px] sm:text-xs font-mono bg-[#1a472a]/[0.06] border border-[#1a472a]/12 rounded px-1.5 py-0.5 text-[#1a472a] break-all">
      {children}
    </code>
  );
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
  const { data: notifyStatus } = trpc.admin.opsNotifyStatus.useQuery(undefined, { staleTime: 120_000 });
  const [, navigate] = useLocation();
  const [setupOpen, setSetupOpen] = useState(false);

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

  const telegramOk = Boolean(notifyStatus?.telegramConfigured);
  const whatsappOk = Boolean(notifyStatus?.whatsappConfigured);
  const emailOk = Boolean(notifyStatus?.emailConfigured);

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSetupOpen(true)}
          data-testid="admin-ops-notify-setup"
          className="h-8 gap-1.5 border-[#1a472a]/20 text-[#1a472a] hover:bg-[#1a472a]/[0.04] hover:text-[#1a472a]"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect chat alerts</span>
          <span className="sm:hidden">Telegram / WhatsApp</span>
        </Button>
        {notifyStatus && (
          <span className="inline-flex items-center gap-2" data-testid="admin-ops-notify-status">
            <StatusDot ok={emailOk} label="Email" />
            <StatusDot ok={telegramOk} label="Telegram" />
            <StatusDot ok={whatsappOk} label="WhatsApp" />
          </span>
        )}
        {fresh && (
          <span className="text-xs text-[#1a472a]/55 ml-auto tabular-nums" title={data?.generatedAt}>
            Updated {fresh}
          </span>
        )}
      </div>
      <p className="text-sm text-[#1a472a]/70 mb-3">
        Morning ops arc — reminders → closeout → live runbook → tasks → investors → outbound → outreach. Tap a row to jump in.
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

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-[#f8f5f0] border-[#1a472a]/15 text-[#1a472a]">
          <DialogHeader>
            <DialogTitle
              className="text-[#1a472a] text-xl"
              style={{ fontFamily: "var(--font-display, serif)" }}
            >
              Route ops alerts to chat
            </DialogTitle>
            <DialogDescription className="text-[#1a472a]/70 text-sm">
              Morning pulse, recording-ready, and new-event pings go through{" "}
              <CodeChip>server/_core/notify.ts</CodeChip>. Set Railway variables on{" "}
              <strong>ReGenCivics.Earth</strong>, then redeploy. Missing vars skip that
              channel quietly — nothing breaks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-1 pb-2">
            {/* Status strip */}
            <div className="rounded-2xl border border-[#1a472a]/12 bg-white/70 px-3 py-2.5 flex flex-wrap gap-3 items-center">
              <span className="text-xs font-semibold text-[#1a472a]/55 uppercase tracking-wide">Status</span>
              <StatusDot ok={emailOk} label="Email" />
              <StatusDot ok={telegramOk} label="Telegram" />
              <StatusDot ok={whatsappOk} label="WhatsApp" />
              <span className="text-[11px] text-[#1a472a]/50">
                Green = env present · amber = not set yet
              </span>
            </div>

            {/* Telegram */}
            <section className="rounded-2xl border border-[#1a472a]/12 bg-white p-4 space-y-3">
              <h4 className="font-bold text-[#1a472a] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${telegramOk ? "bg-emerald-500" : "bg-amber-400"}`} />
                Telegram group
                <span className="text-xs font-normal text-[#1a472a]/55">(real group chat)</span>
              </h4>
              <p className="text-xs text-[#1a472a]/65">
                Telegram supports a true group: put the bot in your ReGen admin group and
                set <CodeChip>TELEGRAM_CHAT_ID</CodeChip> to that group&apos;s id (often starts with{" "}
                <CodeChip>-100…</CodeChip>).
              </p>
              <StepList
                steps={[
                  <>Create or open a Telegram <strong>group</strong> for ReGen admin (ops alerts).</>,
                  <>
                    Talk to <CodeChip>@BotFather</CodeChip> → <strong>/newbot</strong> → copy the{" "}
                    <strong>bot token</strong>.
                  </>,
                  <>Add the bot to the group and make sure it can post (not muted / restricted).</>,
                  <>
                    Get the <strong>group chat id</strong>: add{" "}
                    <CodeChip>@userinfobot</CodeChip> or <CodeChip>@getidsbot</CodeChip>, or call{" "}
                    <CodeChip>getUpdates</CodeChip> on the Bot API after the bot is in the group
                    and someone has messaged.
                  </>,
                  <>
                    In Railway → <strong>ReGenCivics.Earth</strong> → Variables, set:
                    <ul className="mt-1.5 space-y-1 list-disc pl-4">
                      <li>
                        <CodeChip>TELEGRAM_BOT_TOKEN</CodeChip> = bot token
                      </li>
                      <li>
                        <CodeChip>TELEGRAM_CHAT_ID</CodeChip> = group chat id
                      </li>
                    </ul>
                  </>,
                  <>
                    Redeploy (or wait for the next deploy). Test with the next morning pulse or a
                    recording-ready alert.
                  </>,
                ]}
              />
            </section>

            {/* WhatsApp */}
            <section className="rounded-2xl border border-[#1a472a]/12 bg-white p-4 space-y-3">
              <h4 className="font-bold text-[#1a472a] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${whatsappOk ? "bg-emerald-500" : "bg-amber-400"}`} />
                WhatsApp
                <span className="text-xs font-normal text-[#1a472a]/55">(one destination number)</span>
              </h4>
              <p className="text-xs text-[#1a472a]/65 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2">
                <strong>Honest limit:</strong> this stack uses Meta WhatsApp Cloud API and texts{" "}
                <em>one</em> destination number (<CodeChip>WHATSAPP_TO_NUMBER</CodeChip>). It does{" "}
                <strong>not</strong> blast a WhatsApp group natively. For a group feel: put an admin
                phone (or a bridge number) in the WhatsApp group and forward, or use{" "}
                <strong>Telegram</strong> for a true group blast.
              </p>
              <StepList
                steps={[
                  <>
                    Set up a Meta / WhatsApp Cloud API business app with a phone number (WhatsApp
                    Business Platform).
                  </>,
                  <>
                    Create your WhatsApp group for humans if you want one — but configure the API
                    to message a <strong>single E.164 number</strong> that can sit in that group and
                    share, or your personal admin phone.
                  </>,
                  <>
                    In Railway → <strong>ReGenCivics.Earth</strong> → Variables, set:
                    <ul className="mt-1.5 space-y-1 list-disc pl-4">
                      <li>
                        <CodeChip>WHATSAPP_PHONE_NUMBER_ID</CodeChip> — Cloud API phone number id
                      </li>
                      <li>
                        <CodeChip>WHATSAPP_ACCESS_TOKEN</CodeChip> — permanent / system user token
                      </li>
                      <li>
                        <CodeChip>WHATSAPP_TO_NUMBER</CodeChip> — destination digits only, E.164{" "}
                        <em>without</em> <CodeChip>+</CodeChip> (e.g. <CodeChip>1647…</CodeChip>)
                      </li>
                    </ul>
                  </>,
                  <>
                    Redeploy. The next morning pulse or recording-ready alert should land as a text
                    to that one number.
                  </>,
                ]}
              />
            </section>

            {/* Also note */}
            <section className="rounded-2xl border border-[#1a472a]/10 bg-[#1a472a]/[0.03] px-4 py-3 space-y-2 text-xs text-[#1a472a]/70">
              <p>
                <strong className="text-[#1a472a]">Also:</strong>{" "}
                <CodeChip>OWNER_EMAIL</CodeChip> already gets the fail-soft morning-pulse email
                (via Resend) — that is separate from Telegram / WhatsApp.
              </p>
              <p>
                <CodeChip>TELEGRAM_BRAIN_*</CodeChip> is a <strong>different</strong> bot (private
                Rye brain chat). Do not reuse those vars for group ops alerts — use{" "}
                <CodeChip>TELEGRAM_BOT_TOKEN</CodeChip> + <CodeChip>TELEGRAM_CHAT_ID</CodeChip> only.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminNeedsYou;
