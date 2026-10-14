/**
 * The vote invite on one approved application: whether it went out, and a
 * button to send it (or send it again). Approval sends it automatically
 * (server/lib/approvalHandoff.ts); this panel is for the quiet approvals, the
 * ones the hourly email limit held back, and anyone who lost the email.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Send } from "lucide-react";

const APPROVED = new Set(["approved", "active"]);

function when(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function VoteInvitePanel({ applicationId, status }: { applicationId: number; status: string | null | undefined }) {
  const approved = APPROVED.has(status ?? "");
  const utils = trpc.useUtils();
  const state = trpc.applications.voteInviteState.useQuery({ id: applicationId }, { enabled: approved });
  const send = trpc.applications.sendVoteInvite.useMutation({
    onSuccess: (res) => {
      if (res.outcome === "sent") toast.success(res.label);
      else toast.error(res.label);
      utils.applications.voteInviteState.invalidate({ id: applicationId });
      utils.applications.voteInviteBacklog.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!approved) return null;
  const sentAt = state.data?.sentAt ?? null;
  const lastFailed = state.data?.lastStatus && !["sent", "delivered"].includes(state.data.lastStatus);

  return (
    <div className="rounded-lg border border-[#1a472a]/15 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#1a472a]">
        <CalendarCheck className="h-4 w-4" aria-hidden="true" />
        Call time vote invite
      </p>
      <p className="mt-1 text-sm text-[#1a472a]/80">
        {state.isLoading
          ? "Checking…"
          : sentAt
            ? `Sent ${when(sentAt)}. It links to the Season Schedule vote and explains how to join the calls.`
            : lastFailed
              ? `Not sent yet. The last try on ${when(state.data?.lastAttemptAt)} ended as "${state.data?.lastStatus}".`
              : "Not sent yet. It links to the Season Schedule vote and explains how to join the calls."}
      </p>
      <Button
        type="button"
        size="sm"
        variant={sentAt ? "outline" : "default"}
        className="mt-3 min-h-11"
        disabled={send.isPending || state.isLoading}
        onClick={() => {
          if (sentAt && !window.confirm("This project already got the invite. Send it again?")) return;
          send.mutate({ id: applicationId, force: !!sentAt });
        }}
      >
        {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        {sentAt ? "Send again" : "Send the vote invite"}
      </Button>
    </div>
  );
}

/**
 * The approved projects that never got the invite through, with one button to
 * send them all. Hidden when there are none.
 */
export function VoteInviteBacklogBar() {
  const utils = trpc.useUtils();
  const backlog = trpc.applications.voteInviteBacklog.useQuery();
  const sendAll = trpc.applications.sendVoteInviteBacklog.useMutation({
    onSuccess: (res) => {
      const parts = [`${res.sent} sent`];
      if (res.failed) parts.push(`${res.failed} failed`);
      if (res.noEmail) parts.push(`${res.noEmail} with no email address`);
      if (res.stoppedBy === "rate_limited") parts.push("stopped at the hourly email limit, send the rest later");
      if (res.stoppedBy === "held") parts.push("outbound email is paused (EMAIL_HOLD)");
      (res.stoppedBy || res.failed ? toast.error : toast.success)(`Vote invites: ${parts.join(", ")}.`);
      utils.applications.voteInviteBacklog.invalidate();
      utils.applications.voteInviteState.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = backlog.data ?? [];
  if (rows.length === 0) return null;
  const names = rows.slice(0, 4).map((r) => r.projectName).join(", ");

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[#d4a574]/50 bg-[#fffaf0] p-3 text-sm text-[#1a472a] sm:flex-row sm:items-center sm:justify-between">
      <p>
        <strong>{rows.length}</strong> approved project{rows.length === 1 ? " has" : "s have"} not had the call time vote invite: {names}
        {rows.length > 4 ? ` and ${rows.length - 4} more` : ""}.
      </p>
      <Button
        type="button"
        size="sm"
        className="min-h-11 shrink-0"
        disabled={sendAll.isPending}
        onClick={() => {
          if (!window.confirm(`Email the call time vote invite to ${rows.length} approved project${rows.length === 1 ? "" : "s"}?`)) return;
          sendAll.mutate();
        }}
      >
        {sendAll.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Send {rows.length === 1 ? "it" : `all ${rows.length}`}
      </Button>
    </div>
  );
}
