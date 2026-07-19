import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { FileText, Mail, Building, TrendingUp, Calendar, DollarSign, Eye, Loader2 } from "lucide-react";
import { EmailTemplateSelector } from "@/components/EmailTemplateSelector";
import { toast } from "sonner";

export function LOIManager() {
  const [selectedLOI, setSelectedLOI] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: lois, isLoading, refetch } = trpc.loi.list.useQuery();
  const { data: stats } = trpc.loi.stats.useQuery();
  const updateStatus = trpc.loi.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("LOI status updated");
      refetch();
      setDetailOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    confirmed: "bg-green-500",
    withdrawn: "bg-gray-500",
    converted: "bg-blue-500",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    withdrawn: "Withdrawn",
    converted: "Converted",
  };

  const investorTypeLabels: Record<string, string> = {
    individual: "Individual",
    family_office: "Family Office",
    foundation: "Foundation",
    impact_fund: "Impact Fund",
    institutional: "Institutional",
    other: "Other",
  };

  const timelineLabels: Record<string, string> = {
    immediate: "Immediate",
    "3_months": "Within 3 months",
    "6_months": "Within 6 months",
    "1_year": "Within 1 year",
    flexible: "Flexible",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#7dd87d]/10 to-[#7dd87d]/5 border-2 border-[#7dd87d]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1a472a]/70">Total Pledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-2xl font-bold text-[#1a472a]">
                ${(stats?.totalAmount || 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1a472a]/70">Total LOIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1a472a]" />
              <span className="text-2xl font-bold text-[#1a472a]">{stats?.count || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1a472a]/70">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold text-[#1a472a]">{stats?.pending || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#1a472a]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1a472a]/70">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-[#1a472a]">{stats?.confirmed || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Activation Progress */}
      <Card className="bg-gradient-to-r from-[#d4a574]/10 to-[#d4a574]/5 border-2 border-[#d4a574]">
        <CardHeader>
          <CardTitle className="text-[#1a472a]">Fund Activation Progress</CardTitle>
          <CardDescription>Track progress toward fund activation requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[#1a472a]">LOI Target: $20M</span>
              <span className="text-sm font-bold text-[#7dd87d]">
                ${(stats?.totalAmount || 0).toLocaleString()} / $20,000,000
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-[#7dd87d] to-[#4a7c59] h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((stats?.totalAmount || 0) / 20000000) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-[#1a472a]/80 mt-1">
              {((stats?.totalAmount || 0) / 20000000 * 100).toFixed(1)}% of target reached
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-[#1a472a]/70">Core governance & council establishment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-[#1a472a]/70">13+ land projects & 20+ alliance partners</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LOI List */}
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <CardTitle className="text-[#1a472a]">Letters of Intent</CardTitle>
          <CardDescription>All submitted LOIs from capital partners</CardDescription>
        </CardHeader>
        <CardContent>
          {!lois || lois.length === 0 ? (
            <div className="text-center py-12 text-[#1a472a]/80">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No LOIs submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lois.map((loi: any) => (
                <div
                  key={loi.id}
                  className="p-4 border-2 border-[#1a472a]/10 rounded-lg hover:border-[#7dd87d]/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedLOI(loi);
                    setDetailOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLOI(loi); setDetailOpen(true); } }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-[#1a472a] truncate">{loi.fullName}</h3>
                        <Badge className={`${statusColors[loi.status]} text-white`}>
                          {statusLabels[loi.status]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#1a472a]/70">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{loi.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-[#7dd87d]">
                            ${loi.pledgeAmount.toLocaleString()}
                          </span>
                        </div>
                        {loi.organization && (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            <span className="truncate">{loi.organization}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>{investorTypeLabels[loi.investorType]}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLOI(loi);
                        setDetailOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LOI Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLOI && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1a472a]">Letter of Intent Details</DialogTitle>
                <DialogDescription>
                  Submitted on {new Date(selectedLOI.submittedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#1a472a]/70">Status:</span>
                  <Badge className={`${statusColors[selectedLOI.status]} text-white`}>
                    {statusLabels[selectedLOI.status]}
                  </Badge>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#1a472a]">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#1a472a]/80">Name:</span>
                      <p className="font-medium text-[#1a472a]">{selectedLOI.fullName}</p>
                    </div>
                    <div>
                      <span className="text-[#1a472a]/80">Email:</span>
                      <p className="font-medium text-[#1a472a]">{selectedLOI.email}</p>
                    </div>
                    {selectedLOI.phone && (
                      <div>
                        <span className="text-[#1a472a]/80">Phone:</span>
                        <p className="font-medium text-[#1a472a]">{selectedLOI.phone}</p>
                      </div>
                    )}
                    {selectedLOI.organization && (
                      <div>
                        <span className="text-[#1a472a]/80">Organization:</span>
                        <p className="font-medium text-[#1a472a]">{selectedLOI.organization}</p>
                      </div>
                    )}
                    {selectedLOI.role && (
                      <div>
                        <span className="text-[#1a472a]/80">Role:</span>
                        <p className="font-medium text-[#1a472a]">{selectedLOI.role}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Investment Details */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#1a472a]">Investment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#1a472a]/80">Pledge Amount:</span>
                      <p className="font-bold text-[#7dd87d] text-lg">
                        ${selectedLOI.pledgeAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#1a472a]/80">Investor Type:</span>
                      <p className="font-medium text-[#1a472a]">
                        {investorTypeLabels[selectedLOI.investorType]}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[#1a472a]/80">Investment Timeline:</span>
                      <p className="font-medium text-[#1a472a]">
                        {timelineLabels[selectedLOI.investmentTimeline]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                {(selectedLOI.geographicPreference || selectedLOI.sectorInterests) && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1a472a]">Preferences</h3>
                    {selectedLOI.geographicPreference && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Geographic Preference:</span>
                        <p className="text-[#1a472a]">{selectedLOI.geographicPreference}</p>
                      </div>
                    )}
                    {selectedLOI.sectorInterests && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Sector Interests:</span>
                        <p className="text-[#1a472a]">{selectedLOI.sectorInterests}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Information */}
                {(selectedLOI.motivations || selectedLOI.questionsForTeam || selectedLOI.additionalNotes) && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1a472a]">Additional Information</h3>
                    {selectedLOI.motivations && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Motivations:</span>
                        <p className="text-[#1a472a]">{selectedLOI.motivations}</p>
                      </div>
                    )}
                    {selectedLOI.questionsForTeam && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Questions:</span>
                        <p className="text-[#1a472a]">{selectedLOI.questionsForTeam}</p>
                      </div>
                    )}
                    {selectedLOI.additionalNotes && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Additional Notes:</span>
                        <p className="text-[#1a472a]">{selectedLOI.additionalNotes}</p>
                      </div>
                    )}
                    {selectedLOI.referralSource && (
                      <div>
                        <span className="text-[#1a472a]/80 text-sm">Referral Source:</span>
                        <p className="text-[#1a472a]">{selectedLOI.referralSource}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Update Actions */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-[#1a472a]">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedLOI.status === "pending" || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selectedLOI.id, status: "pending" })}
                    >
                      Mark as Pending
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={selectedLOI.status === "confirmed" || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selectedLOI.id, status: "confirmed" })}
                    >
                      Confirm LOI
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={selectedLOI.status === "converted" || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selectedLOI.id, status: "converted" })}
                    >
                      Mark as Converted
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-400 text-gray-600"
                      disabled={selectedLOI.status === "withdrawn" || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selectedLOI.id, status: "withdrawn" })}
                    >
                      Mark as Withdrawn
                    </Button>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="flex gap-2 pt-2">
                  <EmailTemplateSelector
                    recipientEmail={selectedLOI.email}
                    recipientName={selectedLOI.fullName}
                    contextSubject={`LOI - $${selectedLOI.pledgeAmount?.toLocaleString() || '0'}`}
                    inquiryType="investor"
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
