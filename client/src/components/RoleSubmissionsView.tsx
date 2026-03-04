/**
 * RoleSubmissionsView Component
 * Enhanced admin dashboard for exploring role submissions
 * Displays role applications with filtering, sorting, and detailed views
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, User, Briefcase, Calendar, MapPin, ExternalLink, Search, Filter, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RoleSubmission {
  id: number;
  email: string;
  fullName: string | null;
  status: string;
  pathType: string;
  formData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const roleArchetypes = [
  { id: "steward", name: "Steward", color: "bg-green-100 text-green-800" },
  { id: "facilitator", name: "Facilitator", color: "bg-blue-100 text-blue-800" },
  { id: "builder", name: "Builder", color: "bg-orange-100 text-orange-800" },
  { id: "healer", name: "Healer", color: "bg-pink-100 text-pink-800" },
  { id: "visionary", name: "Visionary", color: "bg-purple-100 text-purple-800" },
  { id: "connector", name: "Connector", color: "bg-yellow-100 text-yellow-800" },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-yellow-100 text-yellow-800",
  shortlisted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  accepted: "bg-emerald-100 text-emerald-800",
};

export function RoleSubmissionsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<RoleSubmission | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch role submissions (general inquiries with pathType = "role")
  const { data: allInquiries = [] } = trpc.generalInquiries.list.useQuery();
  
  const roleSubmissions = useMemo(() => {
    return allInquiries
      .filter((inquiry: any) => inquiry.pathType === "role")
      .map((inquiry: any) => ({
        ...inquiry,
        formData: inquiry.formData ? JSON.parse(inquiry.formData) : {},
      }));
  }, [allInquiries]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return roleSubmissions.filter((submission: RoleSubmission) => {
      const matchesSearch =
        !searchTerm ||
        submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || submission.status === statusFilter;

      const matchesRole = !roleFilter || 
        (submission.formData?.roleArchetypes?.includes(roleFilter));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleSubmissions, searchTerm, statusFilter, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: roleSubmissions.length,
      new: roleSubmissions.filter((s: RoleSubmission) => s.status === "new").length,
      reviewing: roleSubmissions.filter((s: RoleSubmission) => s.status === "reviewing").length,
      shortlisted: roleSubmissions.filter((s: RoleSubmission) => s.status === "shortlisted").length,
      accepted: roleSubmissions.filter((s: RoleSubmission) => s.status === "accepted").length,
    };
  }, [roleSubmissions]);

  const handleViewDetails = (submission: RoleSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["Email", "Name", "Status", "Roles", "Created", "Updated"];
    const rows = filteredSubmissions.map((s: RoleSubmission) => [
      s.email,
      s.fullName || "N/A",
      s.status,
      s.formData?.roleArchetypes?.join(", ") || "N/A",
      new Date(s.createdAt).toLocaleDateString(),
      new Date(s.updatedAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell: any) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `role-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1a472a]">Role Submissions</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and review role applications</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a472a]">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Reviewing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.reviewing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Shortlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.shortlisted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? null : v)}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleArchetypes.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications ({filteredSubmissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No role submissions match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Applicant</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Roles</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Applied</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission: RoleSubmission) => (
                    <tr key={submission.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{submission.fullName || "Unknown"}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {submission.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[submission.status] || "bg-gray-100 text-gray-800"}>
                          {submission.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {submission.formData?.roleArchetypes?.slice(0, 2).map((role: string) => {
                            const roleData = roleArchetypes.find((r) => r.id === role);
                            return (
                              <Badge key={role} className={roleData?.color || "bg-gray-100 text-gray-800"}>
                                {roleData?.name || role}
                              </Badge>
                            );
                          })}
                          {submission.formData?.roleArchetypes?.length > 2 && (
                            <Badge variant="outline">+{submission.formData.roleArchetypes.length - 2}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(submission)}
                          className="text-[#4a7c59] hover:text-[#1a472a]"
                        >
                          View
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>Role Application Details</DialogTitle>
                <DialogDescription>{selectedSubmission.email}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Name</label>
                      <p className="text-sm font-medium mt-1">{selectedSubmission.fullName || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
                      <p className="text-sm font-medium mt-1">{selectedSubmission.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Status</label>
                      <Badge className={statusColors[selectedSubmission.status] || "bg-gray-100 text-gray-800"} >
                        {selectedSubmission.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Applied</label>
                      <p className="text-sm font-medium mt-1">
                        {new Date(selectedSubmission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  {selectedSubmission.formData && Object.keys(selectedSubmission.formData).length > 0 ? (
                    <div className="space-y-3">
                      {selectedSubmission.formData.roleArchetypes && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Interested Roles</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedSubmission.formData.roleArchetypes.map((role: string) => {
                              const roleData = roleArchetypes.find((r) => r.id === role);
                              return (
                                <Badge key={role} className={roleData?.color || "bg-gray-100 text-gray-800"}>
                                  {roleData?.name || role}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {selectedSubmission.formData.roleInterest && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Role Interest</label>
                          <p className="text-sm mt-1 text-gray-700">{selectedSubmission.formData.roleInterest}</p>
                        </div>
                      )}
                      {selectedSubmission.formData.whyIdeal && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Why Ideal</label>
                          <p className="text-sm mt-1 text-gray-700">{selectedSubmission.formData.whyIdeal}</p>
                        </div>
                      )}
                      {selectedSubmission.formData.cvWebsite && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">CV / Website</label>
                          <a
                            href={selectedSubmission.formData.cvWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#4a7c59] hover:underline flex items-center gap-1 mt-1"
                          >
                            {selectedSubmission.formData.cvWebsite}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {selectedSubmission.formData.additionalNotes && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Additional Notes</label>
                          <p className="text-sm mt-1 text-gray-700">{selectedSubmission.formData.additionalNotes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No additional details provided</p>
                  )}
                </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Submission ID</label>
                      <p className="font-mono text-xs mt-1">{selectedSubmission.id}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Created</label>
                      <p className="text-xs mt-1">{new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Updated</label>
                      <p className="text-xs mt-1">{new Date(selectedSubmission.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
