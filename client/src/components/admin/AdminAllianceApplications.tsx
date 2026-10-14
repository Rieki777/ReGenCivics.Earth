/**
 * Admin > Alliance: Alliance Partner applications (ADR-72), reviewed the way
 * land project applications are. A list, one application's answers and
 * timeline, the note the applicant sees, status changes with the approve
 * dialog (the Circle vote invite on by default), the invite panel and the
 * backlog banner. Approval goes through setAllianceApplicationStatus, which
 * registers the organization, signs them up for the Interoperability Circle
 * and emails the invite, once.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Handshake, Loader2 } from "lucide-react";
import { adminStatusChipClass } from "@/lib/adminContrast";
import { ALLIANCE_ROLES, ALLIANCE_STATUSES, cleanRoles, type AllianceStatus } from "@shared/allianceApplication";
import { VoteInviteBacklogBar, VoteInvitePanel } from "./VoteInvitePanel";

const STATUS_LABEL: Record<AllianceStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  active: "Active",
  inactive: "Paused",
  rejected: "Declined",
  changes_requested: "Changes requested",
};

type HandoffSummary = { organisation: string; circle: string; tools?: number; invite: string } | null;

/** One line on what an approval did, for the toast. */
export function allianceApprovalSummary(handoff: HandoffSummary): string | null {
  if (!handoff) return null;
  const parts: string[] = [];
  if (handoff.circle === "joined") parts.push("signed up for the Circle");
  else if (handoff.circle === "no_sessions") parts.push("no Circle weeks are on the calendar yet");
  else if (handoff.circle === "failed") parts.push("the Circle sign-up failed");
  if (handoff.tools) parts.push(`${handoff.tools} tool${handoff.tools === 1 ? "" : "s"} listed in the library`);
  if (handoff.invite === "sent") parts.push("vote invite sent");
  else if (handoff.invite === "not_requested") parts.push("approved without email");
  else if (handoff.invite !== "already_sent") parts.push("vote invite not sent, see the invite panel");
  return parts.join(", ");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#1a472a]/75">{label}</p>
      <div className="whitespace-pre-wrap text-sm text-[#1a472a]">{value}</div>
    </div>
  );
}

function ApplicationSheetBody({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const detail = trpc.allianceApplications.get.useQuery({ id });
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<AllianceStatus | null>(null);
  const [emailOnApprove, setEmailOnApprove] = useState(true);
  /** The pending library tools ticked to approve with the partner. */
  const [toolPick, setToolPick] = useState<Set<number>>(new Set());
  const setNoteMut = trpc.allianceApplications.setReviewNote.useMutation({
    onSuccess: () => { toast.success("Note saved. The applicant sees it on their status page."); utils.allianceApplications.get.invalidate({ id }); setNote(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.allianceApplications.updateStatus.useMutation({
    onSuccess: (res) => {
      const summary = allianceApprovalSummary(res.handoff as HandoffSummary);
      toast.success(res.changed ? `Status updated${summary ? `: ${summary}` : ""}.` : "Nothing changed: the status was already that, or someone changed it first.");
      utils.allianceApplications.list.invalidate();
      utils.allianceApplications.get.invalidate({ id });
      utils.allianceApplications.inviteState.invalidate({ id });
      utils.allianceApplications.inviteBacklog.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (detail.isLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" /></div>;
  if (!detail.data) return <p className="p-6 text-sm text-[#1a472a]">Could not load this application.</p>;
  const { app, events, tools } = detail.data;
  const pendingTools = tools.filter((t) => t.createdByApplication && t.status === "pending");
  const roles = cleanRoles(app.roles);
  const noteValue = note ?? app.reviewNote ?? "";

  function change(status: AllianceStatus) {
    const approving = (status === "approved" || status === "active") && !["approved", "active"].includes(app.status);
    if (approving) {
      setEmailOnApprove(true);
      setToolPick(new Set(pendingTools.map((t) => t.toolId)));
      setPending(status);
      return;
    }
    updateStatus.mutate({ id, status });
  }

  return (
    <div className="space-y-4 px-6 py-4">
      <VoteInvitePanel applicationId={id} status={app.status} kind="alliance" />

      <div className="space-y-3 rounded-lg border border-[#1a472a]/15 bg-white p-4">
        <Field label="Contact" value={`${app.contactName ?? ""} ${app.contactEmail}`.trim()} />
        <Field label="Link" value={app.organizationUrl ? <a className="underline" href={app.organizationUrl} target="_blank" rel="noopener noreferrer nofollow">{app.organizationUrl}</a> : null} />
        <Field label="Roles and support" value={roles.map((r) => ALLIANCE_ROLES.find((x) => x.id === r)?.name ?? r).join(", ")} />
        <Field label="Other support" value={app.otherSupport} />
        <Field label="Where" value={app.scope === "global" ? "Global" : [app.location, app.country].filter(Boolean).join(", ") || "Location-based"} />
        <Field label="How they support land projects" value={app.supportDescription} />
        <Field label="What they would like to build" value={app.partnershipDescription} />
        <Field label="Repo (older applications)" value={app.toolRepoUrl} />
        <Field
          label="Tools for the library"
          value={tools.length ? (
            <ul className="space-y-1">
              {tools.map((t) => (
                <li key={t.toolId}>
                  <a className="underline" href={t.websiteUrl} target="_blank" rel="noopener noreferrer nofollow">{t.name}</a>{" "}
                  <span className="text-xs text-[#1a472a]/70">
                    ({t.status === "approved" ? "listed" : t.status === "rejected" ? "not listed" : "waiting"}
                    {t.createdByApplication ? "" : ", already in the library"})
                  </span>
                  {t.shortSummary && <span className="block text-xs text-[#1a472a]/80">{t.shortSummary}</span>}
                </li>
              ))}
            </ul>
          ) : null}
        />
        <Field label="Converted from inquiry" value={app.sourceInquiryId ? `#${app.sourceInquiryId}` : null} />
      </div>

      <div className="rounded-lg border border-[#1a472a]/15 bg-white p-4">
        <p className="text-sm font-semibold text-[#1a472a]">Note for the applicant</p>
        <p className="text-xs text-[#1a472a]/75">Shown on their status page and form when you request changes or decline.</p>
        <Textarea value={noteValue} onChange={(e) => setNote(e.target.value)} className="mt-2 min-h-[90px] bg-white text-[#1a472a]" />
        <Button type="button" size="sm" className="mt-2 min-h-11" disabled={note == null || setNoteMut.isPending} onClick={() => setNoteMut.mutate({ id, note: noteValue })}>
          Save note
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-[#1a472a]/80">Status:</span>
        <Select value={app.status} onValueChange={(v) => change(v as AllianceStatus)}>
          <SelectTrigger className="min-h-11 flex-1 text-sm" aria-label="Application status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALLIANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-[#1a472a]/15 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-[#1a472a]">Timeline</p>
        {events.length === 0 ? (
          <p className="text-sm text-[#1a472a]/75">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm text-[#1a472a]">
                <span className="text-xs text-[#1a472a]/70">{new Date(e.createdAt).toLocaleString()}</span>
                <br />
                {e.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={pending != null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {app.organizationName || "this organization"}?</AlertDialogTitle>
            <AlertDialogDescription>
              They join the Alliance registry and are signed up for every Interoperability Circle week. With the email on,
              they also get the call time vote invite: a link to vote on the Circle's time and how to join the calls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex min-h-11 items-center gap-3 text-sm text-[#1a472a]">
            <Checkbox checked={emailOnApprove} onCheckedChange={(v) => setEmailOnApprove(v === true)} />
            Email them the call time vote invite
          </label>
          {pendingTools.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1a472a]">List these tools in the library</p>
              {pendingTools.map((t) => (
                <label key={t.toolId} className="flex min-h-11 items-center gap-3 text-sm text-[#1a472a]">
                  <Checkbox
                    checked={toolPick.has(t.toolId)}
                    onCheckedChange={(v) => setToolPick((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(t.toolId); else next.delete(t.toolId);
                      return next;
                    })}
                  />
                  {t.name}
                </label>
              ))}
              <p className="text-xs text-[#1a472a]/75">An unticked tool stays in Tools waiting for review.</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const status = pending;
                setPending(null);
                if (status) updateStatus.mutate({ id, status, notify: emailOnApprove, toolIds: [...toolPick] });
              }}
            >
              {emailOnApprove ? "Approve and email" : "Approve quietly"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminAllianceApplications() {
  const [showDrafts, setShowDrafts] = useState(false);
  const list = trpc.allianceApplications.list.useQuery({ includeDrafts: showDrafts });
  const rows = list.data ?? [];

  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>
          <Handshake className="h-5 w-5" />
          Alliance Partner Applications
        </CardTitle>
        <CardDescription>
          Applications from /apply/alliance and inquiries converted below. Approving one signs them up for the Interoperability Circle.
        </CardDescription>
        <VoteInviteBacklogBar kind="alliance" />
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-[#1a472a]">
          <Checkbox checked={showDrafts} onCheckedChange={(v) => setShowDrafts(v === true)} />
          Show unsent drafts
        </label>
      </CardHeader>
      <CardContent className="p-0">
        {list.isLoading ? (
          <div className="p-6"><Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" /></div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-[#1a472a]/75">No alliance applications yet.</p>
        ) : (
          <ul className="divide-y divide-[#1a472a]/10">
            {rows.map((app) => (
              <li key={app.id}>
                <Sheet>
                  <SheetTrigger asChild>
                    <button type="button" className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-[#f0ebe3]/50">
                      <div>
                        <p className="font-semibold text-[#1a472a]">{app.organizationName || "(no name yet)"}</p>
                        <p className="text-sm text-[#1a472a]/80">{app.contactName ?? ""} {app.contactEmail}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cleanRoles(app.roles).slice(0, 4).map((r) => (
                            <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                          ))}
                          {app.sourceInquiryId && <Badge variant="outline" className="text-xs">From inquiry</Badge>}
                        </div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold ${adminStatusChipClass(app.status)}`}>
                        {STATUS_LABEL[app.status as AllianceStatus] ?? app.status}
                      </span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex h-full w-full flex-col overflow-hidden bg-[#f8f5f0] p-0 text-[#1a472a] sm:max-w-xl">
                    <SheetHeader className="shrink-0 px-6 pt-6">
                      <SheetTitle className="text-[#1a472a]" style={{ fontFamily: "var(--font-display)" }}>{app.organizationName || "Alliance application"}</SheetTitle>
                      <SheetDescription className="text-[#1a472a]/80">
                        {app.submittedAt ? `Sent ${new Date(app.submittedAt).toLocaleDateString()}` : "Not sent yet"}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <ApplicationSheetBody id={app.id} />
                    </div>
                  </SheetContent>
                </Sheet>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Convert one alliance inquiry from /connect into an application (ADR-72).
 * The inquiry form has no organization-name field, so the admin types it.
 * Convert and approve (the default) sends the Circle vote invite and signs
 * them up for the Circle at once.
 */
export function ConvertInquiryButton({ inquiry }: { inquiry: { id: number; fullName?: string | null; organizationUrl?: string | null } }) {
  const utils = trpc.useUtils();
  const converted = trpc.allianceApplications.convertedInquiries.useQuery(undefined, { staleTime: 30_000 });
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [approve, setApprove] = useState(true);
  const convert = trpc.allianceApplications.convertInquiry.useMutation({
    onSuccess: (res) => {
      toast.success(res.label);
      setOpen(false);
      utils.allianceApplications.list.invalidate();
      utils.allianceApplications.convertedInquiries.invalidate();
      utils.generalInquiries.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const done = converted.data?.find((r) => r.inquiryId === inquiry.id);
  if (done) {
    return <p className="text-xs text-[#1a472a]/80">Converted into an Alliance Partner application. See Alliance Partner Applications above.</p>;
  }
  const guess = (() => {
    try { return inquiry.organizationUrl ? new URL(inquiry.organizationUrl).hostname.replace(/^www\./, "") : ""; } catch { return ""; }
  })();

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 w-full border-[#4a7c59] text-[#1a472a]" onClick={() => { setOrgName(guess); setApprove(true); setOpen(true); }}>
        <Handshake className="mr-2 h-4 w-4" /> Convert to Alliance Partner application
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert this inquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Everything they wrote carries over. The inquiry form never asked for the organization's name, so add it here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-sm text-[#1a472a]">
            Organization name
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block min-h-11 w-full rounded-md border border-[#1a472a]/25 bg-white px-3 text-[#1a472a]"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-[#1a472a]">
            <Checkbox checked={approve} onCheckedChange={(v) => setApprove(v === true)} />
            Approve now: sign them up for the Circle and email the call time vote invite
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!orgName.trim() || convert.isPending}
              onClick={(e) => {
                e.preventDefault();
                convert.mutate({ inquiryId: inquiry.id, organizationName: orgName.trim(), approve });
              }}
            >
              {convert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {approve ? "Convert and approve" : "Convert for review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
