/**
 * Email Template Selector Component
 * Provides pre-written email templates for common admin responses
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, ChevronDown, CheckCircle, XCircle, Clock, HelpCircle, Calendar, MessageSquare } from "lucide-react";

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
The ReGen Civics Team`
  },
  {
    id: "acceptance",
    label: "Acceptance",
    icon: CheckCircle,
    subject: "Welcome to ReGen Civics!",
    body: `Hi {{name}},

Great news! We're thrilled to welcome you to the ReGen Civics community!

Your application has passed our initial quality check, and we're excited to have you join us on this regenerative journey.

Here's what happens next:
1. Your participation in the upcoming season will be determined through our community governance process
2. We encourage you to follow along regardless of selection - completing all steps may still make you eligible for joining the alliance
3. Join our community calls to connect with other regenerators

If you have any questions, don't hesitate to reach out. We're here to support you every step of the way!

Welcome aboard!

Warm regards,
The ReGen Civics Team`
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

Thank you for being part of the regenerative renaissance. We wish you all the best in your journey!

Warm regards,
The ReGen Civics Team`
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
The ReGen Civics Team`
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
The ReGen Civics Team`
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
The ReGen Civics Team`
  },
  {
    id: "custom",
    label: "Custom Email",
    icon: MessageSquare,
    subject: "ReGen Civics",
    body: `Hi {{name}},

[Write your custom message here]

Warm regards,
The ReGen Civics Team`
  }
];

interface EmailTemplateSelectorProps {
  recipientEmail: string;
  recipientName: string;
  contextSubject?: string; // Additional context for subject line
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
  inquiryType = "general"
}: EmailTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const sendEmailMutation = trpc.email.sendDirect.useMutation();

  // Replace template placeholders with actual values
  const processTemplate = (template: EmailTemplate) => {
    const name = recipientName || "there";
    const subject = contextSubject 
      ? `${template.subject} - ${contextSubject}`
      : template.subject;
    
    const body = template.body
      .replace(/\{\{name\}\}/g, name)
      .replace(/\n/g, "%0D%0A"); // URL encode line breaks
    
    return {
      subject: encodeURIComponent(subject),
      body: body
    };
  };

  const handleSelectTemplate = async (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    setIsSending(true);
    
    try {
      // Map template IDs to backend template types
      const templateTypeMap: Record<TemplateType, string> = {
        follow_up: "follow_up",
        acceptance: "acceptance",
        rejection: "not_selected",
        more_info: "request_info",
        schedule_call: "schedule_call",
        land_project_accepted: "land_project_accepted",
        custom: "custom"
      };
      
      const name = recipientName || "there";
      const subject = contextSubject 
        ? `${template.subject} - ${contextSubject}`
        : template.subject;
      const body = template.body.replace(/\{\{name\}\}/g, name);
      
      await sendEmailMutation.mutateAsync({
        to: recipientEmail,
        recipientName: name,
        templateType: templateTypeMap[template.id] as any,
        customSubject: template.id === "custom" ? subject : undefined,
        customBody: template.id === "custom" ? body : undefined,
        inquiryType: inquiryType
      });
      
      toast({
        title: "Email Sent!",
        description: `Successfully sent ${template.label} email to ${recipientName}`,
      });
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          className={`border-[#1a472a]/30 ${className}`}
          disabled={isSending}
        >
          <Mail className="w-4 h-4 mr-2" />
          {isSending ? "Sending..." : "Send Email"}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Choose a Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {emailTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <DropdownMenuItem
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="cursor-pointer"
            >
              <Icon className={`w-4 h-4 mr-2 ${
                template.id === "acceptance" ? "text-green-600" :
                template.id === "land_project_accepted" ? "text-emerald-500" :
                template.id === "rejection" ? "text-red-500" :
                template.id === "follow_up" ? "text-amber-500" :
                template.id === "more_info" ? "text-blue-500" :
                template.id === "schedule_call" ? "text-purple-500" :
                "text-gray-500"
              }`} />
              {template.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export templates for use elsewhere if needed
export { emailTemplates };
export type { EmailTemplate };
