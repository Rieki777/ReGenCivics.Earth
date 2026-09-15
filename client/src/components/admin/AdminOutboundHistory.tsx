/**
 * Outbound History: letters sent and scheduled, with Resend/email_logs stats.
 */
import { useMemo, useState } from "react";
import { History, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  NEWSLETTER_SOURCES,
  type NewsletterSource,
} from "@/lib/outboundAudience";
import { isLetterLayout, type LetterLayout } from "@shared/letterLayout";
import {
  audienceToWriteSource,
  formatPacificDateTime,
  formatPercent,
  historyCsvFilename,
  historyRecipientsCsv,
  pickHistoryBanner,
  type HistoryListItem,
  type HistoryRecipientRow,
} from "@shared/outboundHistory";
import type { OutboundWritePrefill } from "@/components/admin/AdminOutboundWrite";

function statusChipClass(label: string): string {
  if (label === "Failed") return "border-red-300 bg-red-50 text-[#7f1d1d]";
  if (label === "Partial") return "border-amber-300 bg-amber-50 text-amber-900";
  if (label === "Sent") return "border-[#7dd87d] bg-[#7dd87d]/25 text-[#1a472a]";
  return "border-[#1a472a]/20 bg-white text-[#1a472a]";
}

function downloadHistoryCsv(issueId: number, subjectDisplay: string, rows: HistoryRecipientRow[]) {
  if (rows.length === 0) {
    toast.error("No recipients to export");
    return;
  }
  const csv = historyRecipientsCsv(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = historyCsvFilename(issueId, subjectDisplay);
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

function writePrefillFromDetail(detail: {
  subjectDisplay: string;
  body: string;
  layout?: string | null;
  audience?: unknown;
}): OutboundWritePrefill {
  const sourceRaw = audienceToWriteSource(detail.audience);
  const source: NewsletterSource | "all" = (NEWSLETTER_SOURCES as readonly string[]).includes(sourceRaw)
    ? (sourceRaw as NewsletterSource)
    : "all";
  const layout: LetterLayout = isLetterLayout(detail.layout) ? detail.layout : "announcement";
  return {
    subject: detail.subjectDisplay,
    body: detail.body,
    layout,
    source,
  };
}

function HistoryBanner({
  rows,
  onWrite,
}: {
  rows: HistoryListItem[];
  onWrite: () => void;
}) {
  const banner = useMemo(() => pickHistoryBanner(rows, Date.now()), [rows]);

  if (banner.kind === "problems") {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
      >
        {banner.count === 1
          ? "1 letter had delivery problems in the last 7 days."
          : `${banner.count} letters had delivery problems in the last 7 days.`}
      </div>
    );
  }
  if (banner.kind === "upcoming") {
    return (
      <div role="status" className="rounded-xl border border-[#1a472a]/15 bg-[#f8f5f0] px-3 py-2.5 text-sm text-[#1a472a]">
        Next send: {formatPacificDateTime(banner.at)}
      </div>
    );
  }
  if (banner.kind === "last") {
    const rate = banner.openPercent == null ? null : formatPercent(banner.openPercent);
    return (
      <div role="status" className="rounded-xl border border-[#1a472a]/15 bg-[#f8f5f0] px-3 py-2.5 text-sm text-[#1a472a]">
        Last send: {formatPacificDateTime(banner.at)}
        {rate ? `. Open rate ${rate}.` : "."}
      </div>
    );
  }
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-[#1a472a]/20 bg-[#f8f5f0] px-3 py-2.5 text-sm text-[#1a472a] flex flex-wrap items-center justify-between gap-2"
    >
      <p>No letters sent or scheduled yet.</p>
      <Button type="button" size="sm" className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white" onClick={onWrite}>
        Write a letter
      </Button>
    </div>
  );
}

export function AdminOutboundHistory({
  onDuplicate,
  onWrite,
}: {
  onDuplicate: (draft: OutboundWritePrefill) => void;
  onWrite: () => void;
}) {
  const history = trpc.outbound.listHistory.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const detail = trpc.outbound.getHistoryDetail.useQuery(
    { issueId: selectedId ?? 0 },
    { enabled: selectedId != null },
  );
  const rows = history.data ?? [];

  async function exportLetter(issueId: number, subjectDisplay: string, recipients?: HistoryRecipientRow[]) {
    try {
      setExportingId(issueId);
      const rowsToExport = recipients ?? (await utils.outbound.getHistoryDetail.fetch({ issueId })).recipients;
      downloadHistoryCsv(issueId, subjectDisplay, rowsToExport);
    } catch {
      toast.error("Could not export recipients.");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle
          className="text-[#1a472a] flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <History className="w-5 h-5" aria-hidden="true" />
          History
        </CardTitle>
        <CardDescription>Letters sent and scheduled to subscribers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <HistoryBanner rows={rows} onWrite={onWrite} />

        {history.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#1a472a]/80">Nothing sent or scheduled from Outbound yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-[#1a472a]/10">
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="w-full text-left p-3 hover:bg-[#1a472a]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a472a] rounded-t-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-[#1a472a]">{row.subjectDisplay || "Untitled letter"}</p>
                    <Badge variant="outline" className={`text-xs ${statusChipClass(row.statusLabel)}`}>
                      {row.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#1a472a]/75 mt-1">
                    {row.audienceSummary}
                    {row.when ? ` · ${formatPacificDateTime(row.when)}` : ""}
                  </p>
                  <p className="text-xs text-[#1a472a]/75 mt-1">
                    {row.stats.delivered}/{row.stats.total || row.recipientCount} delivered
                    {" · "}
                    {formatPercent(row.stats.openPercent)} open
                    {" · "}
                    {formatPercent(row.stats.clickPercent)} click
                    {row.stats.bounceFailCount > 0 ? ` · ${row.stats.bounceFailCount} bounce/fail` : ""}
                  </p>
                </button>
                <div className="px-3 pb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#1a472a]/30 text-[#1a472a]"
                    disabled={exportingId === row.id}
                    onClick={() => void exportLetter(row.id, row.subjectDisplay)}
                  >
                    {exportingId === row.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Sheet open={selectedId != null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto bg-[#f8f5f0] text-[#1a472a]"
        >
          {detail.isLoading || !detail.data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
            </div>
          ) : (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-[#1a472a] pr-8">
                  {detail.data.subjectDisplay || "Untitled letter"}
                </SheetTitle>
                <SheetDescription className="text-[#1a472a]/80">
                  {detail.data.audienceSummary}
                  {detail.data.when ? ` · ${formatPacificDateTime(detail.data.when)}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${statusChipClass(detail.data.statusLabel)}`}>
                    {detail.data.statusLabel}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#1a472a]/30 text-[#1a472a]"
                    onClick={() => {
                      onDuplicate(writePrefillFromDetail(detail.data));
                      setSelectedId(null);
                    }}
                  >
                    Duplicate into Write
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#1a472a]/30 text-[#1a472a]"
                    disabled={exportingId === detail.data.id}
                    onClick={() => void exportLetter(detail.data.id, detail.data.subjectDisplay, detail.data.recipients)}
                  >
                    {exportingId === detail.data.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Delivered</dt>
                    <dd className="font-medium">{detail.data.stats.delivered}/{detail.data.stats.total || detail.data.recipientCount}</dd>
                  </div>
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Opened</dt>
                    <dd className="font-medium">{formatPercent(detail.data.stats.openPercent)}</dd>
                  </div>
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Clicked</dt>
                    <dd className="font-medium">{formatPercent(detail.data.stats.clickPercent)}</dd>
                  </div>
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Bounced</dt>
                    <dd className="font-medium">{detail.data.stats.bounced}</dd>
                  </div>
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Complained</dt>
                    <dd className="font-medium">{detail.data.stats.complained}</dd>
                  </div>
                  <div className="rounded-lg border border-[#1a472a]/10 bg-white p-2">
                    <dt className="text-xs text-[#1a472a]/70">Failed</dt>
                    <dd className="font-medium">{detail.data.failedCount}</dd>
                  </div>
                </dl>

                <div>
                  <h3 className="text-sm font-medium mb-2">Timeline</h3>
                  <ol className="space-y-1 text-sm text-[#1a472a]/80">
                    {detail.data.timeline.map((event) => (
                      <li key={`${event.label}-${String(event.at)}`}>
                        {event.label}: {formatPacificDateTime(event.at)}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Preview as sent</h3>
                  <iframe
                    title="Letter preview"
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={detail.data.html}
                    className="w-full min-h-[220px] bg-white rounded-md border border-[#1a472a]/15"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Recipients</h3>
                  <div className="overflow-x-auto rounded-lg border border-[#1a472a]/10 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[#1a472a]/70 border-b border-[#1a472a]/10">
                          <th className="p-2 font-medium">Email</th>
                          <th className="p-2 font-medium">Status</th>
                          <th className="p-2 font-medium">Opened</th>
                          <th className="p-2 font-medium">Clicked</th>
                          <th className="p-2 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.recipients.map((row) => (
                          <tr key={row.email} className="border-t border-[#1a472a]/10">
                            <td className="p-2">{row.email}</td>
                            <td className="p-2">{row.statusLabel}</td>
                            <td className="p-2">{row.opened ? "Yes" : "No"}</td>
                            <td className="p-2">{row.clicked ? "Yes" : "No"}</td>
                            <td className="p-2 text-[#1a472a]/75">{row.error || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
