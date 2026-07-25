import { Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HelpCircle, Clock, ChevronRight, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { EmailTemplateSelector } from "@/components/EmailTemplateSelector";

const ActivityTimeline = lazy(() =>
  import("@/components/ActivityTimeline").then((m) => ({ default: m.ActivityTimeline }))
);

function getAgeInfo(createdAt: string | Date): { label: string; color: string; bg: string; isOverdue: boolean } {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH < 24) return { label: `${Math.round(ageH)}h ago`, color: 'text-green-700', bg: 'bg-green-50 border-green-200', isOverdue: false };
  if (ageH < 48) return { label: `${Math.floor(ageH / 24)}d ago`, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', isOverdue: false };
  return { label: `${Math.floor(ageH / 24)}d  -  overdue`, color: 'text-red-700', bg: 'bg-red-50 border-red-200', isOverdue: true };
}

interface Props {
  inquiries: any[] | undefined;
  updateGeneralMutation: any;
  pathTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }>;
  EmailHistoryPanelComp: React.ComponentType<{ email: string }>;
  ContactNotesPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  ContactTagsPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  ReminderPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  AssigneeSelectComp: React.ComponentType<{ contactType: string; contactId: number }>;
}

export function AdminOtherInquiriesTab({
  inquiries,
  updateGeneralMutation,
  pathTypeConfig,
  EmailHistoryPanelComp,
  ContactNotesPanelComp,
  ContactTagsPanelComp,
  ReminderPanelComp,
  AssigneeSelectComp,
}: Props) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <HelpCircle className="w-5 h-5" />
          Other Inquiries
        </CardTitle>
        <CardDescription>
          Finance, Learn, and other general inquiries
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[#1a472a]/10">
          {inquiries?.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).map((inquiry: any) => {
            const config = pathTypeConfig[inquiry.pathType] || pathTypeConfig.other;
            const Icon = config.icon;
            const ageOther = getAgeInfo(inquiry.createdAt);
            return (
              <Sheet key={inquiry.id}>
                <SheetTrigger asChild>
                  <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-[#1a472a]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a472a]">{inquiry.fullName}</p>
                          <p className="text-sm text-[#1a472a]/80">{inquiry.email}</p>
                          <Badge variant="outline" className="mt-1 text-xs capitalize">
                            {inquiry.pathType?.replace(/_/g, ' ') || 'General'}
                          </Badge>
                          {inquiry.message && (
                            <p className="text-sm text-[#1a472a]/75 mt-2 line-clamp-2">
                              {inquiry.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={
                          inquiry.status === 'new' || inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          inquiry.status === 'in_progress' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          inquiry.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {inquiry.status?.replace(/_/g, ' ')}
                        </Badge>
                        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ageOther.bg} ${ageOther.color}`}>
                          {ageOther.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                          {ageOther.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#1a472a]/75" />
                      </div>
                    </div>
                  </div>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${config.color}/20 flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <div>
                        <span className="text-[#1a472a]">{inquiry.fullName}</span>
                        <p className="text-sm font-normal text-[#1a472a]/80 capitalize">{inquiry.pathType?.replace(/_/g, ' ') || 'General'} Inquiry</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-6 py-4">
                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Email</p>
                        <a href={`mailto:${inquiry.email}`} className="text-[#4a7c59] hover:underline">{inquiry.email}</a>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Status</p>
                        <Badge className={
                          inquiry.status === 'new' || inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          inquiry.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {inquiry.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Submitted</p>
                        <p className="text-[#1a472a]">{new Date(inquiry.createdAt).toLocaleString()}</p>
                      </div>
                      {inquiry.location && (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide">Location</p>
                          <p className="text-[#1a472a]">{inquiry.location}</p>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    {inquiry.message && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/75 uppercase tracking-wide mb-2">Message</p>
                        <div className="bg-[#f0ebe3] rounded-lg p-4">
                          <p className="text-[#1a472a] whitespace-pre-wrap">{inquiry.message}</p>
                        </div>
                      </div>
                    )}

                    <Suspense fallback={null}><ActivityTimeline email={inquiry.email} contactType="general_inquiry" contactId={inquiry.id} /></Suspense>
                    <EmailHistoryPanelComp email={inquiry.email} />
                    <ContactNotesPanelComp contactType="general_inquiry" contactId={inquiry.id} />
                    <ContactTagsPanelComp contactType="general_inquiry" contactId={inquiry.id} />
                    <ReminderPanelComp contactType="general_inquiry" contactId={inquiry.id} />
                  </div>

                  <SheetFooter className="flex-col gap-3">
                    <AssigneeSelectComp contactType="general_inquiry" contactId={inquiry.id} />
                    <div className="w-full flex items-center gap-2">
                      <span className="text-xs text-[#1a472a]/80 shrink-0">Status:</span>
                      <Select
                        value={inquiry.status}
                        onValueChange={(newStatus: any) => {
                          const prevStatus = inquiry.status;
                          updateGeneralMutation.mutate({ id: inquiry.id, status: newStatus });
                          toast('Status updated', {
                            action: { label: 'Undo', onClick: () => updateGeneralMutation.mutate({ id: inquiry.id, status: prevStatus }) },
                            duration: 5000,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full flex flex-col sm:flex-row gap-2">
                      <EmailTemplateSelector
                        recipientEmail={inquiry.email}
                        recipientName={inquiry.fullName || ''}
                        contextSubject="General Inquiry"
                        className="w-full sm:flex-1"
                      />
                      <Button
                        className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:flex-1"
                        disabled={updateGeneralMutation.isPending}
                        onClick={() => {
                          const prevStatus = inquiry.status;
                          updateGeneralMutation.mutate({ id: inquiry.id, status: 'contacted' });
                          toast('Marked as reviewed', {
                            action: { label: 'Undo', onClick: () => updateGeneralMutation.mutate({ id: inquiry.id, status: prevStatus }) },
                            duration: 5000,
                          });
                        }}
                      >
                        <CheckCheck className="w-4 h-4 mr-1" />
                        Mark as Reviewed
                      </Button>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            );
          })}
          {(!inquiries || inquiries.filter((i: any) => ['other', 'learn', 'finance'].includes(i.pathType)).length === 0) && (
            <div className="p-8 text-center text-[#1a472a]/75">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No other inquiries yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
