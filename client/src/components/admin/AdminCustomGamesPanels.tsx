import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gamepad2, Mail, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function AdminCustomGameWaitlist() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: inquiries, refetch } = trpc.customGameInquiries.list.useQuery({});
  const updateMut = trpc.customGameInquiries.updateStatus.useMutation({ onSuccess: () => refetch() });

  const filtered = (inquiries ?? []).filter(
    (i: any) => statusFilter === "all" || i.status === statusFilter
  );

  const STATUS_COLORS: Record<string, string> = {
    waitlist: "bg-[#1a3a5c] text-[#f8f5f0] border-[#1a3a5c]",
    intro_scheduled: "bg-[#6b3f12] text-[#f8f5f0] border-[#6b3f12]",
    in_progress: "bg-[#3d2a5c] text-[#f8f5f0] border-[#3d2a5c]",
    declined: "bg-[#8b1e1e] text-[#f8f5f0] border-[#8b1e1e]",
    completed: "bg-[#1a472a] text-[#f8f5f0] border-[#1a472a]",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1a472a]">Custom Game Waitlist</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value="all" className="bg-[#1a472a] text-white">All</option>
          <option value="waitlist" className="bg-[#1a472a] text-white">Waitlist</option>
          <option value="intro_scheduled" className="bg-[#1a472a] text-white">Intro Scheduled</option>
          <option value="in_progress" className="bg-[#1a472a] text-white">In Progress</option>
          <option value="declined" className="bg-[#1a472a] text-white">Declined</option>
          <option value="completed" className="bg-[#1a472a] text-white">Completed</option>
        </select>
      </div>

      {!filtered.length && (
        <p className="text-[#1a472a]/75 text-sm py-8 text-center">No submissions yet.</p>
      )}

      <div className="space-y-3">
        {filtered.map((inq: any) => (
          <div
            key={inq.id}
            className="bg-white border border-[#1a472a]/15 rounded-xl overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-[#f0ebe3]/60 transition-colors"
              onClick={() => setExpanded(expanded === inq.id ? null : inq.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1a472a] text-sm">{inq.fullName}</p>
                  <a href={`mailto:${inq.email}`} className="text-[#1a472a] text-xs underline">{inq.email}</a>
                  <p className="text-[#1a472a]/80 text-sm mt-0.5">{inq.projectName}{inq.websiteOrSocial && <a href={inq.websiteOrSocial} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#1a472a] underline text-xs">↗ site</a>}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[inq.status] ?? "bg-white/10 text-white/60 border-white/10"}`}>
                    {inq.status}
                  </span>
                  <span className="text-[#1a472a]/80 text-sm">{inq.timeline}</span>
                  {inq.budgetConfirmed ? <span className="text-green-400 text-xs">✓ Budget</span> : <span className="text-red-400 text-xs">✗ Budget</span>}
                </div>
              </div>

              {expanded === inq.id && (
                <div className="mt-4 space-y-3 border-t border-[#1a472a]/10 pt-3">
                  <div>
                    <p className="text-[#1a472a]/80 text-sm font-medium mb-1">Land Status</p>
                    <p className="text-[#1a472a] text-sm">{inq.landStatus}</p>
                  </div>
                  <div>
                    <p className="text-[#1a472a]/80 text-sm font-medium mb-1">Community Stage</p>
                    <p className="text-[#1a472a] text-sm">{inq.communityStage}</p>
                  </div>
                  <div>
                    <p className="text-[#1a472a]/80 text-sm font-medium mb-1">Primary Goal</p>
                    <p className="text-[#1a472a] text-sm leading-relaxed">{inq.primaryGoal}</p>
                  </div>
                  {inq.additionalNotes && (
                    <div>
                      <p className="text-[#1a472a]/80 text-sm font-medium mb-1">Additional Notes</p>
                      <p className="text-[#1a472a] text-sm">{inq.additionalNotes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-[#1a472a]/80 text-sm">Status:</label>
                    <select
                      value={inq.status}
                      onChange={(e) => updateMut.mutate({ id: inq.id, status: e.target.value })}
                      className="bg-[#1a472a] border border-white/30 rounded px-2 py-1 text-white text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="waitlist">Waitlist</option>
                      <option value="intro_scheduled">Intro Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="declined">Declined</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin: Custom Game Applications (Sylva intake queue) ─────────────────────
// One row per /custom-games/apply submission. Filterable by status, sortable by
// score, expandable to the blueprint draft summary + the Sylva transcript

export function AdminCustomGameApplications() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "newest">("score");
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: apps, refetch } = trpc.customGameApplications.list.useQuery({});
  const updateMut = trpc.customGameApplications.updateStatus.useMutation({ onSuccess: () => refetch() });
  const { data: expandedApp } = trpc.customGameApplications.get.useQuery(
    { id: expanded ?? 0 },
    { enabled: expanded !== null }
  );

  const filtered = (apps ?? [])
    .filter((a: any) => statusFilter === "all" || a.status === statusFilter)
    .sort((a: any, b: any) =>
      sortBy === "score"
        ? (b.score ?? 0) - (a.score ?? 0)
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-[#3d4a3d] text-[#f8f5f0] border-[#3d4a3d]",
    submitted: "bg-[#1a3a5c] text-[#f8f5f0] border-[#1a3a5c]",
    reviewing: "bg-[#6b3f12] text-[#f8f5f0] border-[#6b3f12]",
    in_conversation: "bg-[#3d2a5c] text-[#f8f5f0] border-[#3d2a5c]",
    accepted: "bg-[#1a472a] text-[#f8f5f0] border-[#1a472a]",
    declined: "bg-[#8b1e1e] text-[#f8f5f0] border-[#8b1e1e]",
  };

  const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "reviewing", label: "Reviewing" },
    { value: "in_conversation", label: "In Conversation" },
    { value: "accepted", label: "Accepted" },
    { value: "declined", label: "Declined" },
  ];

  const scoreColor = (score: number) =>
    score >= 70 ? "text-[#1a472a]" : score >= 40 ? "text-[#6b3f12]" : "text-[#1a472a]/70";

  /** Pull the reviewable facts out of a blueprint draft. */
  const draftSummary = (bp: any): Array<{ label: string; value: string }> => {
    if (!bp || typeof bp !== "object") return [];
    const rows: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: unknown) => {
      if (value === undefined || value === null || value === "") return;
      rows.push({ label, value: String(value) });
    };
    push("Role", bp.applicant?.role);
    push("Location", bp.identity?.location);
    push("Land status", bp.identity?.landStatus);
    push("Acreage", bp.identity?.acreage);
    push("Stage", bp.identity?.stage);
    push("Website", bp.identity?.website);
    push("Vision", typeof bp.content?.vision === "string" ? bp.content.vision.slice(0, 400) : undefined);
    push("Goals", Array.isArray(bp.content?.goals) ? bp.content.goals.join("; ") : undefined);
    push("Pains", Array.isArray(bp.content?.problems) ? bp.content.problems.join(" | ").slice(0, 600) : undefined);
    push("Personas", Array.isArray(bp.personas) ? bp.personas.map((p: any) => p.label || p.id).join(", ") : undefined);
    push("Member name", bp.language?.memberName);
    push("Currency", bp.language?.currencyName);
    push("Guide", bp.language?.guideName);
    push("Guide voice", bp.language?.guideVoice);
    push("Team hours/week", bp.team?.hoursPerWeek);
    push("Team size", bp.team?.size);
    push("Technical comfort", bp.team?.technicalComfort);
    push("Hosting", bp.deployment?.hosting);
    push("Domain", bp.deployment?.domain);
    push("Timeline", bp.deployment?.timelineEstimate);
    push("Budget confirmed", bp.deployment?.budgetConfirmed === undefined ? undefined : bp.deployment.budgetConfirmed ? "yes" : "no");
    push("Referral", bp.deployment?.referralSource);
    push("LLM provider", bp.integrations?.llmProvider);
    push("Email provider", bp.integrations?.emailProvider);
    push("Links", Array.isArray(bp.generationInputs?.uploads) ? bp.generationInputs.uploads.join(" ") : undefined);
    return rows;
  };

  const parseTranscript = (raw: unknown): Array<{ role: string; content: string }> => {
    if (typeof raw !== "string" || !raw) return [];
    try {
      const turns = JSON.parse(raw);
      return Array.isArray(turns) ? turns : [];
    } catch { return []; }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#1a472a]">Custom Game Applications</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            <option value="all" className="bg-[#1a472a] text-white">All</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#1a472a] text-white">{o.label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "score" | "newest")}
            className="bg-[#1a472a] border border-white/30 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            <option value="score" className="bg-[#1a472a] text-white">By score</option>
            <option value="newest" className="bg-[#1a472a] text-white">Newest first</option>
          </select>
        </div>
      </div>

      {!filtered.length && (
        <p className="text-[#1a472a]/75 text-sm py-8 text-center">No applications yet.</p>
      )}

      <div className="space-y-3">
        {filtered.map((app: any) => (
          <div
            key={app.id}
            className="bg-white border border-[#1a472a]/15 rounded-xl overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-[#f0ebe3]/60 transition-colors"
              onClick={() => setExpanded(expanded === app.id ? null : app.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1a472a] text-sm">{app.applicantName} <span className="text-[#1a472a]/70 font-normal">({app.applicantRole})</span></p>
                  <a href={`mailto:${app.applicantEmail}`} onClick={(e) => e.stopPropagation()} className="text-[#1a472a] text-xs underline">{app.applicantEmail}</a>
                  <p className="text-[#1a472a]/80 text-sm mt-0.5">{app.projectName}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${scoreColor(app.score ?? 0)}`}>{app.score ?? 0}/100</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[app.status] ?? "bg-[#3d4a3d] text-[#f8f5f0]"}`}>
                    {app.status}
                  </span>
                  <span className="text-[#1a472a]/70 text-xs">{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {expanded === app.id && (
                <div className="mt-4 space-y-4 border-t border-[#1a472a]/10 pt-3" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <p className="text-[#1a472a]/80 text-sm font-medium mb-2">Blueprint draft</p>
                    {draftSummary(app.blueprintDraft).length === 0 && (
                      <p className="text-[#1a472a]/75 text-sm">No draft fields captured.</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {draftSummary(app.blueprintDraft).map(({ label, value }) => (
                        <div key={label} className="text-sm">
                          <span className="text-[#1a472a]/75">{label}: </span>
                          <span className="text-[#1a472a] break-words">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[#1a472a]/80 text-sm font-medium mb-2">Sylva transcript</p>
                    {expandedApp && expandedApp.id === app.id ? (
                      parseTranscript(expandedApp.transcript).length > 0 ? (
                        <div className="max-h-80 overflow-y-auto space-y-1.5 bg-[#f0ebe3] border border-[#1a472a]/15 rounded-lg p-3">
                          {parseTranscript(expandedApp.transcript).map((t, i) => (
                            <p key={i} className="text-sm leading-relaxed">
                              <span className={t.role === "assistant" ? "text-[#1a472a] font-medium" : "text-[#6b3f12] font-medium"}>
                                {t.role === "assistant" ? "Sylva" : "Applicant"}:
                              </span>{" "}
                              <span className="text-[#1a472a]">{t.content}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#1a472a]/75 text-sm">No conversation; they typed the form.</p>
                      )
                    ) : (
                      <p className="text-[#1a472a]/75 text-sm">Loading transcript...</p>
                    )}
                  </div>

                  {app.internalNotes && (
                    <div>
                      <p className="text-[#1a472a]/80 text-sm font-medium mb-1">Internal notes</p>
                      <p className="text-[#1a472a] text-sm whitespace-pre-wrap">{app.internalNotes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <label className="text-[#1a472a]/80 text-sm">Status:</label>
                    <select
                      value={app.status}
                      onChange={(e) => updateMut.mutate({ id: app.id, status: e.target.value as any })}
                      className="bg-[#1a472a] border border-white/30 rounded px-2 py-1 text-white text-xs"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <a
                      href={`mailto:${app.applicantEmail}?subject=${encodeURIComponent(`Your custom game: ${app.projectName}`)}`}
                      className="text-[#1a472a] text-xs underline"
                    >
                      Email {app.applicantName.split(" ")[0]}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADMIN_PASSWORD = "333";

