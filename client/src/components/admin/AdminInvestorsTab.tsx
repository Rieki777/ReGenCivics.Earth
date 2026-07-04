import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TrendingUp, Download, Search, Filter, DollarSign, Clock, ChevronRight, CheckCheck, Loader2 } from "lucide-react";
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
  investors: any[] | undefined;
  filteredInvestors: any[];
  investorSearch: string;
  setInvestorSearch: (v: string) => void;
  investorStatusFilter: string;
  setInvestorStatusFilter: (v: string) => void;
  investorRangeCounts: Record<string, number>;
  duplicateInvestorEmails: Set<string>;
  updateInvestorMutation: any;
  getInvestorPriority: (investor: any) => { score: number; label: string; color: string };
  exportToCSV: (data: any[], filename: string) => void;
  EmailHistoryPanelComp: React.ComponentType<{ email: string }>;
  ContactNotesPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  ContactTagsPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  ReminderPanelComp: React.ComponentType<{ contactType: string; contactId: number }>;
  AssigneeSelectComp: React.ComponentType<{ contactType: string; contactId: number }>;
}

export function AdminInvestorsTab({
  investors,
  filteredInvestors,
  investorSearch,
  setInvestorSearch,
  investorStatusFilter,
  setInvestorStatusFilter,
  investorRangeCounts,
  duplicateInvestorEmails,
  updateInvestorMutation,
  getInvestorPriority,
  exportToCSV,
  EmailHistoryPanelComp,
  ContactNotesPanelComp,
  ContactTagsPanelComp,
  ReminderPanelComp,
  AssigneeSelectComp,
}: Props) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Investor Inquiries
            </CardTitle>
            <CardDescription className="mt-1">
              {investors?.length || 0} total · {investors?.filter((i: any) => i.status === 'new' || i.status === 'pending').length || 0} pending review
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#7dd87d] text-[#1a472a] w-fit"
            onClick={() => exportToCSV(investors || [], 'investor_inquiries')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        {/* Investment Range Breakdown */}
        {Object.keys(investorRangeCounts).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1a472a]/10 mt-3">
            {Object.entries(investorRangeCounts)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .map(([range, count]) => (
                <span key={range} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <DollarSign className="w-3 h-3" />
                  {range}: <strong>{count as number}</strong>
                </span>
              ))}
          </div>
        )}
        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/65" />
            <input
              type="text"
              data-search-input
              placeholder="Search by name, email, range, or org..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/65 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
            />
          </div>
          <Select value={investorStatusFilter} onValueChange={setInvestorStatusFilter}>
            <SelectTrigger className="sm:w-44 h-9 text-sm">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="in_discussion">In Discussion</SelectItem>
              <SelectItem value="committed">Committed</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredInvestors.length !== (investors?.length || 0) && (
          <p className="text-xs text-[#1a472a]/70 pt-1">
            Showing {filteredInvestors.length} of {investors?.length || 0} investors
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {investors && investors.length > 0 ? (
          filteredInvestors.length === 0 ? (
            <div className="p-8 text-center text-[#1a472a]/70">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No investors match your search</p>
              <button onClick={() => { setInvestorSearch(''); setInvestorStatusFilter('all'); }} className="text-[#7dd87d] text-sm mt-2 hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
          <div className="divide-y divide-[#1a472a]/10">
            {filteredInvestors.map((investor: any) => (
              <Sheet key={investor.id}>
                <SheetTrigger asChild>
                  <div className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a472a]">{investor.fullName}</p>
                          <p className="text-sm text-[#1a472a]/80">{investor.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {investor.investmentRange && (
                              <Badge variant="outline" className="text-xs">
                                {investor.investmentRange}
                              </Badge>
                            )}
                            {investor.investorType && (
                              <Badge variant="outline" className="text-xs">
                                {investor.investorType}
                              </Badge>
                            )}
                          </div>
                          {investor.motivation && (
                            <p className="text-sm text-[#1a472a]/70 mt-2 line-clamp-2">
                              {investor.motivation}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={
                          investor.status === 'new' || investor.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          investor.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          investor.status === 'in_discussion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          investor.status === 'committed' ? 'bg-green-100 text-green-800 border-green-200' :
                          investor.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {investor.status?.replace(/_/g, ' ')}
                        </Badge>
                        {(() => {
                          const age = getAgeInfo(investor.createdAt);
                          return (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${age.bg} ${age.color}`}>
                              {age.isOverdue && <Clock className="w-2.5 h-2.5 inline mr-0.5" />}
                              {age.label}
                            </span>
                          );
                        })()}
                        {(() => {
                          const p = getInvestorPriority(investor);
                          return (
                            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${p.color}`} title={`Priority score: ${p.score}`}>
                              {p.label} priority
                            </span>
                          );
                        })()}
                        {duplicateInvestorEmails.has(investor.email) && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                            Duplicate email
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#1a472a]/55" />
                      </div>
                    </div>
                  </div>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <span className="text-[#1a472a]">{investor.fullName}</span>
                        <p className="text-sm font-normal text-[#1a472a]/80">Investor Inquiry</p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-6 py-4">
                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">Email</p>
                        <a href={`mailto:${investor.email}`} className="text-[#4a7c59] hover:underline break-all">
                          {investor.email}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">Status</p>
                        <Badge className={
                          investor.status === 'new' || investor.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          investor.status === 'contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          investor.status === 'in_discussion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          investor.status === 'committed' ? 'bg-green-100 text-green-800 border-green-200' :
                          investor.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {investor.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">Submitted</p>
                        <p className="text-[#1a472a]">{new Date(investor.createdAt).toLocaleString()}</p>
                      </div>
                      {investor.organization && (
                        <div>
                          <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide">Organization</p>
                          <p className="text-[#1a472a]">{investor.organization}</p>
                        </div>
                      )}
                    </div>

                    {/* Investment Details */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-3">Investment Details</p>
                      <div className="grid grid-cols-2 gap-4">
                        {investor.investmentRange && (
                          <div>
                            <p className="text-xs text-amber-600 font-medium">Investment Range</p>
                            <p className="text-amber-900 font-semibold">{investor.investmentRange}</p>
                          </div>
                        )}
                        {investor.investorType && (
                          <div>
                            <p className="text-xs text-amber-600 font-medium">Investor Type</p>
                            <p className="text-amber-900 font-semibold capitalize">{investor.investorType?.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {investor.timeline && (
                          <div>
                            <p className="text-xs text-amber-600 font-medium">Timeline</p>
                            <p className="text-amber-900 font-semibold capitalize">{investor.timeline?.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {investor.accreditedStatus && (
                          <div>
                            <p className="text-xs text-amber-600 font-medium">Accredited Status</p>
                            <p className="text-amber-900 font-semibold capitalize">{investor.accreditedStatus?.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Primary Interest */}
                    {investor.primaryInterest && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">Primary Interest</p>
                        <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
                          {investor.primaryInterest?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}

                    {/* Motivation */}
                    {investor.motivation && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">Motivation</p>
                        <div className="bg-[#f0ebe3] rounded-lg p-4">
                          <p className="text-[#1a472a] whitespace-pre-wrap">{investor.motivation}</p>
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {investor.experience && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">Investment Experience</p>
                        <div className="bg-[#f0ebe3] rounded-lg p-4">
                          <p className="text-[#1a472a] whitespace-pre-wrap">{investor.experience}</p>
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    {investor.questions && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">Questions</p>
                        <div className="bg-[#f0ebe3] rounded-lg p-4">
                          <p className="text-[#1a472a] whitespace-pre-wrap">{investor.questions}</p>
                        </div>
                      </div>
                    )}

                    {/* How They Heard */}
                    {investor.howHeard && (
                      <div>
                        <p className="text-xs font-medium text-[#1a472a]/70 uppercase tracking-wide mb-2">How They Heard About Us</p>
                        <p className="text-[#1a472a]">{investor.howHeard}</p>
                      </div>
                    )}

                    {/* Activity Timeline */}
                    <Suspense fallback={null}><ActivityTimeline email={investor.email} contactType="investor" contactId={investor.id} /></Suspense>

                    {/* Email History */}
                    <EmailHistoryPanelComp email={investor.email} />

                    {/* Internal Notes */}
                    <ContactNotesPanelComp contactType="investor" contactId={investor.id} />
                    <ContactTagsPanelComp contactType="investor" contactId={investor.id} />
                    <ReminderPanelComp contactType="investor" contactId={investor.id} />
                  </div>

                  <SheetFooter className="flex-col gap-3">
                    {/* Assignee */}
                    <AssigneeSelectComp contactType="investor" contactId={investor.id} />
                    {/* Status update */}
                    <div className="w-full flex items-center gap-2">
                      <span className="text-xs text-[#1a472a]/80 shrink-0">Status:</span>
                      <Select
                        value={investor.status}
                        onValueChange={(newStatus: any) => {
                          const prevStatus = investor.status;
                          updateInvestorMutation.mutate({ id: investor.id, status: newStatus });
                          toast('Status updated', {
                            action: { label: 'Undo', onClick: () => updateInvestorMutation.mutate({ id: investor.id, status: prevStatus }) },
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
                          <SelectItem value="in_discussion">In Discussion</SelectItem>
                          <SelectItem value="committed">Committed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full flex flex-col sm:flex-row gap-2">
                      <EmailTemplateSelector
                        recipientEmail={investor.email}
                        recipientName={investor.fullName}
                        contextSubject="Investment Inquiry"
                        inquiryType="investor"
                        className="w-full sm:flex-1"
                      />
                      <Button
                        className="bg-[#1a472a] hover:bg-[#2d5a3d] w-full sm:flex-1"
                        disabled={updateInvestorMutation.isPending}
                        onClick={() => {
                          const prevStatus = investor.status;
                          updateInvestorMutation.mutate({ id: investor.id, status: 'contacted' });
                          toast('Marked as reviewed', {
                            action: { label: 'Undo', onClick: () => updateInvestorMutation.mutate({ id: investor.id, status: prevStatus }) },
                            duration: 5000,
                          });
                        }}
                      >
                        {updateInvestorMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCheck className="w-4 h-4 mr-1" />
                        )}
                        Mark as Reviewed
                      </Button>
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ))}
          </div>
          )
        ) : (
          <div className="p-8 text-center text-[#1a472a]/70">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No investor inquiries yet</p>
            <p className="text-xs mt-2">Investor inquiries will appear here when submitted</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
