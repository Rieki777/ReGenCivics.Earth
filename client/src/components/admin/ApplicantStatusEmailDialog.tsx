/**
 * Compose and send a bulk email to land-project applicants in one review status.
 * Sends through the existing email.sendBulk procedure (Resend).
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { emailTemplates, type TemplateType } from "@/components/EmailTemplateSelector";
import { sourceIdForStatus } from "@/lib/applicationEmailSources";
import { Loader2, Mail, Send } from "lucide-react";

const DEFAULT_TEMPLATE: Record<string, TemplateType> = {
  submitted: "follow_up",
  under_review: "follow_up",
  approved: "land_project_accepted",
  rejected: "rejection",
  changes_requested: "more_info",
};

const templateTypeMap: Record<TemplateType, string> = {
  follow_up: "follow_up",
  acceptance: "acceptance",
  rejection: "not_selected",
  more_info: "request_info",
  schedule_call: "schedule_call",
  land_project_accepted: "land_project_accepted",
  custom: "custom",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string;
  statusLabel: string;
  applicationCount: number;
}

export function ApplicantStatusEmailDialog({
  open,
  onOpenChange,
  status,
  statusLabel,
  applicationCount,
}: Props) {
  const [templateId, setTemplateId] = useState<TemplateType>("follow_up");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const recipientsQuery = trpc.applications.listEmailRecipients.useQuery(
    { status: status as "submitted" | "under_review" | "approved" | "rejected" | "changes_requested" },
    { enabled: open },
  );

  const sendBulk = trpc.email.sendBulk.useMutation();

  const recipients = recipientsQuery.data ?? [];
  const skipped = Math.max(0, applicationCount - recipients.length);
  const capped = recipients.slice(0, 100);
  const overCap = recipients.length > 100;

  const loadTemplate = (id: TemplateType) => {
    setTemplateId(id);
    const tpl = emailTemplates.find((t) => t.id === id);
    if (!tpl) return;
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  useEffect(() => {
    if (!open) return;
    loadTemplate(DEFAULT_TEMPLATE[status] || "follow_up");
    // loadTemplate is stable enough for dialog open; status is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

  const recipientPreview = useMemo(
    () => capped.map((r) => `${r.name} <${r.email}>`).join("\n"),
    [capped],
  );

  const composerHref = `/admin?tab=settings&emailSource=${sourceIdForStatus(status) ?? "approved_projects"}`;

  const handleSend = async () => {
    if (capped.length === 0) {
      toast.error("No contact emails for this status.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in both subject and body.");
      return;
    }
    setSending(true);
    try {
      const result = await sendBulk.mutateAsync({
        recipients: capped.map((r) => ({
          email: r.email,
          name: r.name,
          projectName: r.projectName,
        })),
        templateType: templateTypeMap[templateId] as
          | "follow_up"
          | "acceptance"
          | "not_selected"
          | "request_info"
          | "schedule_call"
          | "custom"
          | "land_project_accepted",
        customSubject: subject,
        customBody: body,
      });
      toast.success(`Sent ${result.totalSent} of ${result.totalSent + result.totalFailed} emails.`);
      if (result.totalFailed === 0) onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Send failed.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#1a472a] flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email {statusLabel} applicants
          </DialogTitle>
          <DialogDescription className="text-[#1a472a]/75">
            Draft a message to the land projects in this status. Each contact gets their own copy.
            Use {"{{name}}"}, {"{{email}}"}, and {"{{projectName}}"} to fill in their details.
          </DialogDescription>
        </DialogHeader>

        {recipientsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#1a472a]/75 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading contact emails...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#1a472a]">
              {capped.length} recipient{capped.length === 1 ? "" : "s"} with a contact email
              {skipped > 0 ? `. ${skipped} skipped (no email on the applicant account).` : "."}
              {overCap ? " Only the first 100 will be sent." : ""}
            </p>
            {capped.length > 0 && (
              <textarea
                readOnly
                value={recipientPreview}
                className="w-full h-24 text-xs font-mono bg-[#f8faf8] border border-[#4a7c59]/20 rounded-md p-2 text-[#1a472a]"
                aria-label="Recipient list"
              />
            )}

            <div className="space-y-1">
              <Label className="text-[#1a472a]">Template</Label>
              <Select value={templateId} onValueChange={(v) => loadTemplate(v as TemplateType)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="applicant-email-subject" className="text-[#1a472a]">Subject</Label>
              <Input
                id="applicant-email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="applicant-email-body" className="text-[#1a472a]">Body</Label>
              <Textarea
                id="applicant-email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="bg-white min-h-[180px] text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <a
            href={composerHref}
            className="text-sm text-[#4a7c59] hover:underline self-center"
          >
            Open in email composer
          </a>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#1a472a]/30 text-[#1a472a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || capped.length === 0 || !subject.trim() || !body.trim()}
              className="bg-[#4a7c59] hover:bg-[#3d6849] text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to {capped.length}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
