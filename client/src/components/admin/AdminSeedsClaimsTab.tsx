import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Download,
  Search,
  Filter,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  adminListPageToApiPage,
  formatClaimTokens,
  formatClaimUsd,
  parseEvidenceUrls,
} from "@/lib/seedsClaimsUi";

export type SeedsClaimRow = {
  id: number;
  seedsAccount: string;
  email: string;
  originalUsdTotal: number;
  spentUsdAmount: number;
  claimedUsdAmount: number;
  regenAmount: number;
  baseWalletAddress: string;
  isDispute: boolean;
  disputeReason: string | null;
  evidenceUrls: string | null;
  status: string;
  adminNotes: string | null;
  reviewedAt: string | Date | null;
  reviewedBy: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

function DetailField({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[#1a472a]/75 text-xs font-medium">{label}</div>
      <div className={`text-[#1a472a] text-sm mt-0.5 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function formatClaimDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SeedsClaimDetail({
  claim,
  onAction,
}: {
  claim: SeedsClaimRow;
  onAction: (claim: SeedsClaimRow, action: "approve" | "deny" | "flag") => void;
}) {
  const evidence = parseEvidenceUrls(claim.evidenceUrls);
  const hasVariance = claim.claimedUsdAmount !== claim.originalUsdTotal;

  return (
    <div className="p-6 bg-[#f0ebe3]/20 border-t border-[#1a472a]/10 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="font-medium text-[#1a472a] text-sm">Our Records</h4>
          <div className="space-y-2 p-3 bg-white rounded-lg border border-[#1a472a]/10">
            <div>
              <div className="text-[#1a472a]/75 text-xs">Original USD Total</div>
              <div className="text-xl font-bold text-[#1a472a]">
                ${formatClaimUsd(claim.originalUsdTotal)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-[#1a472a] text-sm">Their Claim</h4>
          <div className="space-y-2 p-3 bg-white rounded-lg border border-[#1a472a]/10">
            <div>
              <div className="text-[#1a472a]/75 text-xs">Claimed Amount</div>
              <div className="text-xl font-bold text-[#1a472a]">
                ${formatClaimUsd(claim.claimedUsdAmount)}
              </div>
            </div>
            {hasVariance && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Variance detected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-[#1a472a]/10 space-y-4">
        <h4 className="font-medium text-[#1a472a] text-sm">Submitted answers</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <DetailField label="Claim ID">{claim.id}</DetailField>
          <DetailField label="Status">{claim.status}</DetailField>
          <DetailField label="SEEDS Account Name" mono>
            {claim.seedsAccount || "-"}
          </DetailField>
          <DetailField label="Email Address">{claim.email || "-"}</DetailField>
          <DetailField label="Base Wallet Address" mono>
            {claim.baseWalletAddress || "-"}
          </DetailField>
          <DetailField label="Original USD Contribution">
            ${formatClaimUsd(claim.originalUsdTotal)}
          </DetailField>
          <DetailField label="Spent, sold, or transferred USD">
            ${formatClaimUsd(claim.spentUsdAmount)}
          </DetailField>
          <DetailField label="Claimed USD">
            ${formatClaimUsd(claim.claimedUsdAmount)}
          </DetailField>
          <DetailField label="$ReGen tokens">
            {formatClaimTokens(claim.regenAmount)}
          </DetailField>
          <DetailField label="Dispute">
            {claim.isDispute ? "Yes" : "No"}
          </DetailField>
          <DetailField label="Sold, spent, or transferred any SEEDS?">
            {claim.isDispute
              ? "Dispute path"
              : Number(claim.spentUsdAmount) > 0
                ? "Yes"
                : "No, still holds all SEEDS"}
          </DetailField>
        </div>

        <DetailField label="Explanation">
          {claim.disputeReason ? (
            <p className="whitespace-pre-wrap">{claim.disputeReason}</p>
          ) : (
            <span className="text-[#1a472a]/60">None</span>
          )}
        </DetailField>

        <DetailField label="Supporting Evidence">
          {evidence.length > 0 ? (
            <ul className="space-y-1">
              {evidence.map((url, i) => (
                <li key={`${url}-${i}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4a7c59] hover:underline inline-flex items-center gap-1 break-all"
                  >
                    {evidence.length === 1 ? "View evidence" : `Evidence ${i + 1}`}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[#1a472a]/60">None</span>
          )}
        </DetailField>
      </div>

      {claim.isDispute && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="font-medium text-amber-900 text-sm">Dispute flagged</h4>
              <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">
                {claim.disputeReason || "No explanation was provided."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <a
          href={`https://eosauthority.com/account/${claim.seedsAccount}?network=telos`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#4a7c59] hover:underline inline-flex items-center gap-1"
        >
          View on Telos Blockchain
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#1a472a]">Admin Notes</label>
        <textarea
          defaultValue={claim.adminNotes || ""}
          readOnly
          rows={3}
          className="w-full p-3 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] resize-none"
        />
      </div>

      <div className="text-xs text-[#1a472a]/75 space-y-1">
        <div>Submitted: {formatClaimDate(claim.createdAt)}</div>
        <div>Updated: {formatClaimDate(claim.updatedAt)}</div>
        {claim.reviewedAt && (
          <div>
            Reviewed: {formatClaimDate(claim.reviewedAt)}
            {claim.reviewedBy != null ? ` (admin #${claim.reviewedBy})` : ""}
          </div>
        )}
      </div>

      {claim.status === "pending" && (
        <div className="flex gap-2 pt-4 border-t border-[#1a472a]/10">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onAction(claim, "approve")}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => onAction(claim, "deny")}
          >
            <X className="w-4 h-4 mr-2" />
            Deny
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => onAction(claim, "flag")}
          >
            <Flag className="w-4 h-4 mr-2" />
            Flag
          </Button>
        </div>
      )}
    </div>
  );
}

function csvRow(cells: any[]) {
  return cells
    .map(
      (c: any) =>
        `"${String(c ?? "")
          .replace(/"/g, '""')
          .replace(/[\n\r]/g, " ")}"`
    )
    .join(",");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportToCSV(data: any[], filename: string) {
  if (!data.length) {
    toast.error("No data to export");
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => csvRow(headers.map((h) => row[h])));
  downloadCSV([csvRow(headers), ...rows].join("\n"), filename);
}

interface Props {
  // Stats will be fetched via TRPC
}

export function AdminSeedsClaimsTab({}: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDisputes, setShowDisputes] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [expandedClaimId, setExpandedClaimId] = useState<number | null>(null);
  const [selectedClaimForAction, setSelectedClaimForAction] = useState<any | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<"approve" | "deny" | "flag" | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  const PAGE_SIZE = 20;

  // Fetch stats
  const statsQuery = trpc.seedsClaims.adminStats.useQuery();

  // Fetch claims list
  const claimsQuery = trpc.seedsClaims.adminList.useQuery(
    {
      status: statusFilter === "all" ? undefined : (statusFilter as any),
      search: searchTerm || undefined,
      isDispute: showDisputes || undefined,
      page: adminListPageToApiPage(page),
      limit: PAGE_SIZE,
    },
    { enabled: true }
  );

  // Mutations
  const reviewMutation = trpc.seedsClaims.adminReview.useMutation();
  const exportQuery = trpc.seedsClaims.adminExport.useQuery(
    undefined,
    { enabled: false }
  );

  const stats = statsQuery.data || {
    total: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    flagged: 0,
    disputes: 0,
    totalRegenCommitted: "0",
  };

  const claims = (claimsQuery.data?.claims || []) as SeedsClaimRow[];
  const totalClaims = claimsQuery.data?.total || 0;
  const totalPages = Math.ceil(totalClaims / PAGE_SIZE);

  const handleAction = async (claim: any, action: "approve" | "deny" | "flag") => {
    setSelectedClaimForAction(claim);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedClaimForAction || !actionType) return;

    try {
      await reviewMutation.mutateAsync({
        claimId: selectedClaimForAction.id,
        status: actionType === "approve" ? "approved" : actionType === "deny" ? "denied" : "flagged",
        adminNotes: adminNotes || undefined,
      });

      toast.success(
        `Claim ${actionType === "approve" ? "approved" : actionType === "deny" ? "denied" : "flagged"}`
      );
      setActionDialogOpen(false);
      setAdminNotes("");
      setSelectedClaimForAction(null);
      setActionType(null);
      claimsQuery.refetch();
      statsQuery.refetch();
    } catch (error) {
      toast.error("Failed to update claim");
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const rows = (result.data as any[]).map((claim: any) => ({
          seedsAccount: claim.seedsAccount,
          email: claim.email,
          baseWalletAddress: claim.baseWalletAddress,
          originalUsdTotal: claim.originalUsdTotal,
          spentUsdAmount: claim.spentUsdAmount,
          claimedUsdAmount: claim.claimedUsdAmount,
          regenAmount: claim.regenAmount,
          isDispute: claim.isDispute,
          status: claim.status,
        }));
        exportToCSV(rows, "approved_seeds_claims");
      }
    } catch (error) {
      toast.error("Failed to export claims");
    } finally {
      setExportLoading(false);
    }
  };

  const truncateWallet = (wallet: string) => {
    if (!wallet) return "-";
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "approved":
        return "bg-green-50 border-green-200 text-green-800";
      case "denied":
        return "bg-red-50 border-red-200 text-red-800";
      case "flagged":
        return "bg-amber-50 border-amber-200 text-amber-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a472a]/5 to-transparent border-[#1a472a]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#1a472a]/75">
              Total Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a472a]">{(stats as any).totalClaims ?? (stats as any).total ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-transparent border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{(stats as any).pendingCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-transparent border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{(stats as any).approvedCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-transparent border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">
              Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{(stats as any).disputeCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-transparent border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{(stats as any).deniedCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-transparent border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{(stats as any).flaggedCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#7dd87d]/10 to-transparent border-[#7dd87d]/20 sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#4a7c59]">
              Total $ReGen Committed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1a472a]">
              ${parseFloat(String(stats.totalRegenCommitted)).toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border-2 border-[#1a472a]/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle
                className="text-[#1a472a] flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <DollarSign className="w-5 h-5 text-[#4a7c59]" />
                SEEDS Token Claims
              </CardTitle>
              <CardDescription className="mt-1">
                {totalClaims} claims total
                {showDisputes && <span> · Disputes only</span>}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#7dd87d] text-[#1a472a] w-fit"
              onClick={handleExport}
              disabled={exportLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? "Exporting..." : "Export Approved"}
            </Button>
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a472a]/75" />
              <input
                type="text"
                placeholder="Search by SEEDS account or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/30"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44 h-9 text-sm">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white hover:bg-[#f0ebe3]/30 cursor-pointer">
              <Checkbox
                checked={showDisputes}
                onCheckedChange={(checked) => {
                  setShowDisputes(checked as boolean);
                  setPage(1);
                }}
              />
              <span className="text-[#1a472a]">Disputes only</span>
            </label>
          </div>

          {claims.length !== totalClaims && (
            <p className="text-xs text-[#1a472a]/75 pt-2">
              Showing {claims.length} of {totalClaims} claims
            </p>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {claimsQuery.isLoading ? (
            <div className="p-8 text-center text-[#1a472a]/75">
              <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" />
              <p>Loading claims</p>
            </div>
          ) : claims.length > 0 ? (
            <div className="divide-y divide-[#1a472a]/10">
              {claims.map((claim) => (
                <div key={claim.id}>
                  <div
                    className="p-4 hover:bg-[#f0ebe3]/50 cursor-pointer"
                    onClick={() =>
                      setExpandedClaimId(
                        expandedClaimId === claim.id ? null : claim.id
                      )
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 text-sm">
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">Filed by</div>
                          <div className="text-[#1a472a] font-medium text-sm truncate">
                            {claim.email || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">SEEDS Account</div>
                          <div className="text-[#1a472a] font-medium text-sm truncate">
                            {claim.seedsAccount || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">Original USD</div>
                          <div className="text-[#1a472a] font-medium">
                            ${formatClaimUsd(claim.originalUsdTotal)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">Claimed USD</div>
                          <div className="text-[#1a472a] font-medium">
                            ${formatClaimUsd(claim.claimedUsdAmount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">$ReGen</div>
                          <div className="text-[#1a472a] font-medium">
                            {formatClaimTokens(claim.regenAmount)}
                          </div>
                        </div>
                        <div className="hidden lg:block">
                          <div className="text-[#1a472a]/75 text-xs font-medium">Wallet</div>
                          <div className="text-[#1a472a] font-mono text-xs">
                            {truncateWallet(claim.baseWalletAddress)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#1a472a]/75 text-xs font-medium">Status</div>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </Badge>
                        </div>
                      </div>
                      {expandedClaimId === claim.id ? (
                        <ChevronUp className="w-5 h-5 text-[#1a472a]/80" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#1a472a]/80" />
                      )}
                    </div>
                  </div>

                  {expandedClaimId === claim.id && (
                    <SeedsClaimDetail claim={claim} onAction={handleAction} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[#1a472a]/75">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No claims match your search</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setShowDisputes(false);
                  setPage(1);
                }}
                className="text-[#7dd87d] text-sm mt-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#1a472a]/10 flex items-center justify-between">
            <div className="text-sm text-[#1a472a]/75">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve"
                ? "Approve Claim"
                : actionType === "deny"
                  ? "Deny Claim"
                  : "Flag Claim"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedClaimForAction && (
                <div className="space-y-3 mt-4 text-left">
                  <div>
                    <span className="text-[#1a472a]/75 text-sm">SEEDS Account:</span>
                    <div className="font-medium text-[#1a472a]">
                      {selectedClaimForAction.seedsAccount}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#1a472a]/75 text-sm">Claimed Amount:</span>
                    <div className="font-medium text-[#1a472a]">
                      ${selectedClaimForAction.claimedUsdAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adminNotes" className="text-sm text-[#1a472a]/75">
                      Admin Notes (Optional)
                    </Label>
                    <textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full mt-2 p-2 text-sm border border-[#1a472a]/20 rounded-lg bg-white text-[#1a472a] resize-none"
                      placeholder="Add any notes about this decision..."
                    />
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "deny"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
              }
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === "approve"
                ? "Approve"
                : actionType === "deny"
                  ? "Deny"
                  : "Flag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
