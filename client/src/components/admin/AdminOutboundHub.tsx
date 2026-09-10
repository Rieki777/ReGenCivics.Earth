/**
 * Outbound hub: email + social in one admin section.
 */
import { useMemo, useState } from "react";
import { Mail, Radio, Users, FileText, Send, Download, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AdminBroadcastPanel } from "@/components/AdminBroadcastPanel";
import { AdminOutboundWrite } from "@/components/admin/AdminOutboundWrite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OUTBOUND_SURFACES,
  type OutboundSurface,
} from "@/lib/adminNav";
import {
  NEWSLETTER_SOURCES,
  filterNewsletterAudience,
  newsletterAudienceCsv,
  newsletterSourceLabel,
  type NewsletterAudienceRow,
  type SubscriberStatusFilter,
} from "@/lib/outboundAudience";
import {
  defaultScheduleLocal,
  formatPacificSchedule,
  pacificDatetimeLocalToUtc,
  utcToPacificDatetimeLocal,
} from "@shared/outboundSchedule";

const SURFACE_META: Record<OutboundSurface, { label: string; icon: typeof Mail; blurb: string }> = {
  write: { label: "Write", icon: Mail, blurb: "Draft a letter" },
  social: { label: "Social", icon: Radio, blurb: "Post to channels" },
  people: { label: "People", icon: Users, blurb: "Subscribers" },
  templates: { label: "Templates", icon: FileText, blurb: "Saved letters" },
  sent: { label: "Sent", icon: Send, blurb: "Issue history" },
};

export function AdminOutboundHub({
  surface,
  onSurfaceChange,
}: {
  surface: OutboundSurface;
  onSurfaceChange: (surface: OutboundSurface) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Outbound
        </h2>
        <p className="text-sm text-[#1a472a]/80">
          Letters to subscribers and posts to social channels, in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outbound sections">
        {OUTBOUND_SURFACES.map((id) => {
          const meta = SURFACE_META[id];
          const Icon = meta.icon;
          const active = surface === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSurfaceChange(id)}
              className={`min-h-11 px-3 rounded-xl border inline-flex items-center gap-2 text-sm font-medium ${
                active
                  ? "border-[#1a472a] bg-[#1a472a]/5 text-[#1a472a]"
                  : "border-[#1a472a]/15 bg-white text-[#1a472a]/80 hover:border-[#1a472a]/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {surface === "write" && <AdminOutboundWrite />}
      {surface === "social" && <AdminBroadcastPanel />}
      {surface === "people" && <PeoplePanel />}
      {surface === "templates" && <TemplatesStub />}
      {surface === "sent" && <SentPanel />}
    </div>
  );
}

function TemplatesStub() {
  const savedQuery = trpc.email.getCustomTemplates.useQuery();
  const letters = (savedQuery.data ?? []).filter((row) => row.kind === "newsletter" && row.bodyFormat === "markdown");
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Newsletter templates
        </CardTitle>
        <CardDescription>
          Saved Outbound letters: full markdown layouts with CTA buttons and images.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {savedQuery.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-[#7dd87d]" />
        ) : letters.length === 0 ? (
          <p className="text-sm text-[#1a472a]/80">No newsletter templates yet. Save one from Write.</p>
        ) : (
          <ul className="space-y-2">
            {letters.map((row) => (
              <li key={row.templateKey} className="rounded-lg border border-[#1a472a]/10 p-3">
                <p className="font-medium text-[#1a472a]">{row.label || row.templateKey}</p>
                <p className="text-xs text-[#1a472a]/70">{row.customSubject || "No subject"}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

type IssueStatusFilter = "all" | "scheduled" | "sent" | "failed";

function issueStatusLabel(status: string): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "sending") return "Sending";
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Draft";
}

function SentPanel() {
  const issues = trpc.outbound.listIssues.useQuery();
  const cancelScheduled = trpc.outbound.cancelScheduled.useMutation();
  const reschedule = trpc.outbound.reschedule.useMutation();
  const [filter, setFilter] = useState<IssueStatusFilter>("all");
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleLocal, setRescheduleLocal] = useState(() => defaultScheduleLocal());

  const rows = useMemo(() => {
    const list = issues.data ?? [];
    const filtered = list.filter((row) => {
      if (filter === "all") return true;
      if (filter === "scheduled") return row.status === "scheduled";
      if (filter === "sent") return row.status === "sent" || row.status === "sending";
      return row.status === "failed";
    });
    return [...filtered].sort((a, b) => {
      if (a.status === "scheduled" && b.status !== "scheduled") return -1;
      if (a.status !== "scheduled" && b.status === "scheduled") return 1;
      return 0;
    });
  }, [issues.data, filter]);

  const scheduledCount = (issues.data ?? []).filter((row) => row.status === "scheduled").length;

  async function handleCancel(issueId: number) {
    try {
      await cancelScheduled.mutateAsync({ issueId });
      toast.success("Scheduled send cancelled.");
      await issues.refetch();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Cancel refused.");
    }
  }

  async function handleReschedule(issueId: number) {
    try {
      const scheduledFor = pacificDatetimeLocalToUtc(rescheduleLocal).toISOString();
      const r = await reschedule.mutateAsync({ issueId, scheduledFor });
      toast.success(`Rescheduled for ${formatPacificSchedule(new Date(r.scheduledFor))}.`);
      setRescheduleId(null);
      await issues.refetch();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Reschedule refused.");
    }
  }

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          Sent issues
        </CardTitle>
        <CardDescription>
          Scheduled newsletter letters wait here until send time. Cancel or reschedule before they go out. Event call reminders live on Events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Issue status filter">
          {([
            ["all", "All"],
            ["scheduled", scheduledCount ? `Scheduled (${scheduledCount})` : "Scheduled"],
            ["sent", "Sent"],
            ["failed", "Failed"],
          ] as const).map(([id, label]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`min-h-11 px-3 rounded-xl border text-sm font-medium ${
                  active
                    ? "border-[#1a472a] bg-[#1a472a]/5 text-[#1a472a]"
                    : "border-[#1a472a]/15 bg-white text-[#1a472a]/80 hover:border-[#1a472a]/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {issues.isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-[#7dd87d]" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#1a472a]/80">
            {filter === "scheduled" ? "No letters waiting to send." : "Nothing sent from Outbound yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const when = row.scheduledFor ? formatPacificSchedule(new Date(row.scheduledFor)) : null;
              const sentWhen = row.sentAt ? formatPacificSchedule(new Date(row.sentAt)) : null;
              return (
                <li key={row.id} className="rounded-lg border border-[#1a472a]/10 p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1a472a]">{row.subject}</p>
                      <p className="text-xs text-[#1a472a]/70">
                        {issueStatusLabel(row.status)}
                        {row.status === "scheduled" && when ? ` · ${when}` : ""}
                        {row.status === "sent" && sentWhen ? ` · ${sentWhen}` : ""}
                        {row.status !== "scheduled" ? ` · ${row.sentCount}/${row.recipientCount} sent` : ` · ${row.recipientCount} recipient${row.recipientCount === 1 ? "" : "s"}`}
                        {row.failedCount ? ` · ${row.failedCount} failed` : ""}
                      </p>
                    </div>
                    {row.status === "scheduled" && (
                      <Badge variant="outline" className="text-xs shrink-0">Queued</Badge>
                    )}
                  </div>
                  {row.status === "scheduled" && (
                    <div className="flex flex-wrap items-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#1a472a]/30 text-[#1a472a]"
                        disabled={cancelScheduled.isPending}
                        onClick={() => void handleCancel(row.id)}
                      >
                        Cancel send
                      </Button>
                      {rescheduleId === row.id ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor={`reschedule-${row.id}`} className="text-[#1a472a] text-xs">
                              New time (Pacific)
                            </Label>
                            <Input
                              id={`reschedule-${row.id}`}
                              type="datetime-local"
                              value={rescheduleLocal}
                              onChange={(e) => setRescheduleLocal(e.target.value)}
                              className="bg-white min-w-[12rem] border-[#1a472a]/20"
                            />
                          </div>
                          <Button
                            type="button"
                            className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white"
                            disabled={reschedule.isPending || !rescheduleLocal}
                            onClick={() => void handleReschedule(row.id)}
                          >
                            {reschedule.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CalendarClock className="w-4 h-4 mr-2" />
                            )}
                            Save time
                          </Button>
                          <Button type="button" variant="ghost" className="text-[#2d5a3d]" onClick={() => setRescheduleId(null)}>
                            Close
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-[#2d5a3d]"
                          onClick={() => {
                            setRescheduleId(row.id);
                            setRescheduleLocal(
                              row.scheduledFor
                                ? utcToPacificDatetimeLocal(new Date(row.scheduledFor))
                                : defaultScheduleLocal(),
                            );
                          }}
                        >
                          Reschedule
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PeoplePanel() {
  const { data: subscribers, isLoading } = trpc.newsletter.list.useQuery();
  const [status, setStatus] = useState<SubscriberStatusFilter>("active");
  const [source, setSource] = useState("all");

  const filtered = useMemo(
    () => filterNewsletterAudience((subscribers ?? []) as NewsletterAudienceRow[], { status, source }),
    [subscribers, status, source],
  );

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const csv = newsletterAudienceCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle
              className="text-[#1a472a] flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Mail className="w-5 h-5" />
              Subscribers
            </CardTitle>
            <CardDescription>People who signed up to receive updates</CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-[#1a472a]/30 text-[#1a472a]"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-[#1a472a] text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubscriberStatusFilter)}>
              <SelectTrigger className="bg-white min-w-[10rem] border-[#1a472a]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[#1a472a] text-xs">Signup source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-white min-w-[12rem] border-[#1a472a]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {NEWSLETTER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {newsletterSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-[#1a472a]/75">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{subscribers && subscribers.length > 0 ? "No subscribers match this filter." : "No newsletter subscribers yet."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#1a472a]/80 pb-2 border-b border-[#1a472a]/10">
              {filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}
              {status === "active" ? " (active)" : ""}
            </p>
            {filtered.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#f0ebe3]/50 border border-[#1a472a]/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#1a472a]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a472a] truncate">{subscriber.email}</p>
                    <p className="text-xs text-[#1a472a]/75">
                      Subscribed {new Date(subscriber.createdAt).toLocaleDateString()}
                      {subscriber.source ? ` via ${newsletterSourceLabel(subscriber.source)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {subscriber.isActive !== 1 && (
                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {newsletterSourceLabel(subscriber.source || "other")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminOutboundHub;
