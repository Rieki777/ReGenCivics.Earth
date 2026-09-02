/**
 * Email Template Selector Component
 * Provides pre-written email templates for common admin responses.
 * Opens an inline compose form  -  select a template, edit subject/body, then send.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, X, Loader2, CheckCircle, XCircle, Clock, HelpCircle, Calendar, MessageSquare, Zap, AlarmClock } from "lucide-react";
import { EmailMarkdownComposer, EMAIL_FIELD_CLASS } from "@/components/admin/EmailMarkdownComposer";
import { EmailDraftAgent } from "@/components/admin/EmailDraftAgent";

const QUICK_REPLIES = [
  "We'll be in touch within 48 hours.",
  "Thank you for your interest in ReGen Civics!",
  "Let's schedule a call: https://calendly.com/rieki-cordon/30min",
  "We've received your submission and will review it shortly.",
  "Could you share more details about your project timeline?",
];

// Email template types
export type TemplateType =
  | "follow_up"
  | "acceptance"
  | "rejection"
  | "more_info"
  | "schedule_call"
  | "land_project_accepted"
  | "custom";

// Template configuration
interface EmailTemplate {
  id: TemplateType;
  label: string;
  icon: React.ElementType;
  subject: string;
  body: string;
}

// Pre-written email templates
const emailTemplates: EmailTemplate[] = [
  {
    id: "follow_up",
    label: "Follow Up",
    icon: Clock,
    subject: "Following Up - ReGen Civics",
    body: `Hi {{name}},

I hope this message finds you well! I wanted to follow up on your recent inquiry with ReGen Civics.

We're excited about the possibility of working together and would love to learn more about your interests and how we might collaborate.

Do you have any questions I can help answer? Or would you like to schedule a call to discuss further?

Looking forward to hearing from you!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "acceptance",
    label: "Acceptance",
    icon: CheckCircle,
    subject: "Welcome to ReGen Civics!",
    body: `Hi {{name}},

Great news! We're thrilled to welcome you to the ReGen Civics community!

Your application has passed our initial quality check, and we're glad to have you in the next incubator season.

Here's what happens next:
1. Your participation in the upcoming season will be determined through our community governance process
2. We encourage you to follow along regardless of selection - completing all steps may still make you eligible for joining the alliance
3. Join our community calls to connect with other regenerators

If you have any questions, don't hesitate to reach out. We're here to support you every step of the way!

Welcome aboard!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "rejection",
    label: "Not Selected",
    icon: XCircle,
    subject: "ReGen Civics Application Update",
    body: `Hi {{name}},

Thank you so much for your interest in ReGen Civics and for taking the time to share your vision with us.

After careful consideration, we've decided not to move forward with your application at this time. This decision doesn't reflect on the value of your work - we simply have limited capacity and must make difficult choices.

We encourage you to:
- Stay connected with our community through our newsletter and events
- Reapply in future seasons as your project evolves
- Explore other ways to participate in the regenerative movement

Thank you for being part of the ReGenerative Renaissance. We wish you all the best in your journey!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "more_info",
    label: "Request More Info",
    icon: HelpCircle,
    subject: "Additional Information Needed - ReGen Civics",
    body: `Hi {{name}},

Thank you for your submission to ReGen Civics! We're excited about what you've shared so far.

To help us better understand your project and how we might work together, could you please provide some additional information?

Specifically, we'd love to learn more about:
- [Add specific questions here]
- [Add specific questions here]

Please reply to this email with the requested details at your earliest convenience.

Thank you for your patience, and we look forward to learning more!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "schedule_call",
    label: "Schedule a Call",
    icon: Calendar,
    subject: "Let's Connect - ReGen Civics",
    body: `Hi {{name}},

Thank you for your interest in ReGen Civics! We'd love to connect with you directly to discuss your inquiry in more detail.

Please use the link below to schedule a call at a time that works for you:
https://calendly.com/rieki-cordon/30min

During our call, we can:
- Answer any questions you have about ReGen Civics
- Discuss how your project or interests align with our mission
- Explore potential collaboration opportunities

Looking forward to speaking with you soon!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "land_project_accepted",
    label: "Project Quality Check Passed",
    icon: CheckCircle,
    subject: "Congratulations! Your Project Passed Our Quality Check - ReGen Civics",
    body: `Hi {{name}},

Great news! Your land project has passed our first quality check for ReGen Civics Season 2.

What this means:
- Your project meets our criteria for regenerative land projects
- Final participation in the season is dependent on the community governance process
- We highly encourage you to follow along the journey regardless of the final selection

Important: If you complete all the steps in our process, you may still be eligible for joining the alliance even if not selected in this round!

Next steps:
1. Join our Open Sessions to stay connected
2. Complete any remaining application materials
3. Participate in the governance process

Schedule a call to discuss: https://calendly.com/rieki-cordon/30min

We are excited about your project and look forward to the journey ahead!

Warm regards,
The ReGen Civics Team`,
  },
  {
    id: "custom",
    label: "Custom Email",
    icon: MessageSquare,
    subject: "ReGen Civics",
    body: `Hi {{name}},

[Write your custom message here]

Warm regards,
The ReGen Civics Team`,
  },
];

// Backend template type mapping (used for logging only; content always sent via customSubject/customBody)
const templateTypeMap: Record<TemplateType, string> = {
  follow_up: "follow_up",
  acceptance: "acceptance",
  rejection: "not_selected",
  more_info: "request_info",
  schedule_call: "schedule_call",
  land_project_accepted: "land_project_accepted",
  custom: "custom",
};

interface EmailTemplateSelectorProps {
  recipientEmail: string;
  recipientName: string;
  contextSubject?: string;
  variant?: "default" | "outline";
  className?: string;
  inquiryType?: "investor" | "alliance" | "project" | "general";
}

export function EmailTemplateSelector({
  recipientEmail,
  recipientName,
  contextSubject,
  variant = "outline",
  className = "",
  inquiryType = "general",
}: EmailTemplateSelectorProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateType>("follow_up");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(`email_draft_${recipientEmail}`));
  const { toast } = useToast();

  const draftKey = `email_draft_${recipientEmail}`;

  // Persist draft to localStorage while composing
  useEffect(() => {
    if (!isComposing || (!subject && !body)) return;
    localStorage.setItem(draftKey, JSON.stringify({ subject, body, templateId: selectedTemplateId }));
  }, [isComposing, subject, body, selectedTemplateId, draftKey]);

  const sendEmailMutation = trpc.email.sendDirect.useMutation();
  const scheduleEmailMutation = trpc.scheduledEmails.schedule.useMutation();

  const loadTemplate = (templateId: TemplateType) => {
    setSelectedTemplateId(templateId);
    const tpl = emailTemplates.find((t) => t.id === templateId);
    if (tpl) {
      const name = recipientName || "there";
      const subj = contextSubject
        ? `${tpl.subject} - ${contextSubject}`
        : tpl.subject;
      setSubject(subj);
      setBody(tpl.body.replace(/\{\{name\}\}/g, name));
    }
  };

  const handleOpen = () => {
    setIsComposing(true);
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setSubject(draft.subject || '');
        setBody(draft.body || '');
        setSelectedTemplateId(draft.templateId || 'custom');
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 3000);
        return;
      } catch {}
    }
    loadTemplate("follow_up");
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both subject and body.", variant: "destructive" });
      return;
    }

    // Schedule mode
    if (isScheduleMode && scheduledFor) {
      try {
        setIsSending(true);
        await scheduleEmailMutation.mutateAsync({
          recipientEmail,
          recipientName: recipientName || "there",
          subject,
          body,
          inquiryType,
          scheduledFor: new Date(scheduledFor).toISOString(),
        });
        toast({ title: "Email Scheduled!", description: `Will send to ${recipientName || recipientEmail} on ${new Date(scheduledFor).toLocaleString()}` });
        localStorage.removeItem(draftKey);
        setHasDraft(false);
        setIsComposing(false);
        setIsScheduleMode(false);
        setScheduledFor('');
      } catch (error: any) {
        toast({ title: "Schedule Failed", description: error.message || "Failed to schedule email.", variant: "destructive" });
      } finally {
        setIsSending(false);
      }
      return;
    }

    setIsSending(true);
    try {
      await sendEmailMutation.mutateAsync({
        to: recipientEmail,
        recipientName: recipientName || "there",
        templateType: "custom",
        customSubject: subject,
        customBody: body,
        inquiryType,
        bodyFormat: "markdown",
      });
      toast({ title: "Email Sent!", description: `Successfully sent to ${recipientName || recipientEmail}` });
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setIsComposing(false);
    } catch (error: any) {
      toast({ title: "Email Failed", description: error.message || "Failed to send email. Please try again.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isComposing) {
    return (
      <div className={`w-full border border-[#1a472a]/20 rounded-lg p-3 bg-[#f8faf8] space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#1a472a] flex items-center gap-1.5">
            <Mail className="w-3 h-3" />
            To: {recipientName || recipientEmail} &lt;{recipientEmail}&gt;
            {draftRestored && <span className="text-[10px] text-amber-600 font-normal flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Draft restored</span>}
          </p>
          <button
            onClick={() => setIsComposing(false)}
            className="text-[#1a472a]/80 hover:text-[#1a472a] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-[#1a472a]/80 uppercase tracking-wide">Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={(v) => loadTemplate(v as TemplateType)}
            >
              <SelectTrigger className={`h-8 text-xs ${EMAIL_FIELD_CLASS}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t) => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3 h-3" />
                        {t.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-[#1a472a]/80 uppercase tracking-wide">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line..."
              className={`h-8 text-xs ${EMAIL_FIELD_CLASS}`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-[#1a472a]/80 uppercase tracking-wide">
              Body (markdown)
            </Label>
            <span className="text-[10px] text-[#1a472a]/80 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Quick inserts:
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mb-1">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => setBody((prev) => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + qr)}
                className="px-2 py-0.5 rounded-full bg-[#f0f7f0] border border-[#4a7c59]/20 text-[10px] text-[#4a7c59] hover:bg-[#4a7c59]/10 transition-colors max-w-[200px] truncate"
                title={qr}
              >
                {qr.length > 35 ? qr.slice(0, 33) + '…' : qr}
              </button>
            ))}
          </div>
          <EmailMarkdownComposer
            subject={subject}
            body={body}
            onSubjectChange={setSubject}
            onBodyChange={setBody}
            showSubject={false}
            minHeightClass="min-h-[140px]"
            bodyId="email-direct-body"
          />
        </div>

        <EmailDraftAgent
          currentSubject={subject}
          currentBody={body}
          statusLabel="one contact"
          recipientCount={1}
          onApply={({ subject: nextSubject, body: nextBody }) => {
            setSubject(nextSubject);
            setBody(nextBody);
          }}
        />

        {/* Schedule toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsScheduleMode(m => !m)}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${isScheduleMode ? 'bg-[#4a7c59]/10 border-[#4a7c59]/40 text-[#4a7c59]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-[#4a7c59]/30'}`}
          >
            <AlarmClock className="w-2.5 h-2.5" />
            Send Later
          </button>
          {isScheduleMode && (
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              className="h-7 text-xs bg-white flex-1"
            />
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || (isScheduleMode && !scheduledFor)}
            className="bg-[#1a472a] hover:bg-[#2d5a3d] text-white flex-1"
            size="sm"
          >
            {isSending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : isScheduleMode ? (
              <AlarmClock className="w-3 h-3 mr-1" />
            ) : (
              <Send className="w-3 h-3 mr-1" />
            )}
            {isScheduleMode ? 'Schedule Send' : 'Send Email'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComposing(false)}
            className="border-[#1a472a]/20"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      className={`border-[#1a472a]/30 ${className} relative`}
      onClick={handleOpen}
      disabled={!recipientEmail}
    >
      <Mail className="w-4 h-4 mr-2" />
      Send Email
      {hasDraft && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" title="Unsaved draft" />}
    </Button>
  );
}

// Export templates and types for use in bulk email flows
export { emailTemplates };
export type { EmailTemplate };
