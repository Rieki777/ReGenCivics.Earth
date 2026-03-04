/**
 * Admin Moderation Panel
 * Manage moderators, review reports, ban users
 * Only accessible to admin users
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  Shield, Users, Flag, Ban, ArrowLeft, Plus, 
  Trash2, Check, X, AlertTriangle, Eye, Clock
} from "lucide-react";

type Tab = 'reports' | 'moderators' | 'bans';

export default function AdminModeration() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('reports');
  const [reportFilter, setReportFilter] = useState<string | undefined>('pending');
  const [newModUserId, setNewModUserId] = useState('');
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('');

  // Check admin access
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400/40 mx-auto mb-4" />
          <h2 className="text-white/60 text-lg mb-2">Access Denied</h2>
          <p className="text-white/40 text-sm mb-4">Admin access required for moderation tools.</p>
          <Link href="/community" className="text-[#7dd87d] hover:underline text-sm">Back to Forum</Link>
        </div>
      </div>
    );
  }

  const reportsQuery = trpc.moderation.reports.useQuery({ status: reportFilter });
  const moderatorsQuery = trpc.moderation.moderators.useQuery();
  const bannedUsersQuery = trpc.moderation.bannedUsers.useQuery();

  const updateReportMutation = trpc.moderation.updateReport.useMutation({
    onSuccess: () => reportsQuery.refetch(),
  });
  const addModMutation = trpc.moderation.addModerator.useMutation({
    onSuccess: () => { moderatorsQuery.refetch(); setNewModUserId(''); },
  });
  const removeModMutation = trpc.moderation.removeModerator.useMutation({
    onSuccess: () => moderatorsQuery.refetch(),
  });
  const banMutation = trpc.moderation.banUser.useMutation({
    onSuccess: () => { bannedUsersQuery.refetch(); setBanUserId(''); setBanReason(''); setBanDays(''); },
  });
  const unbanMutation = trpc.moderation.unbanUser.useMutation({
    onSuccess: () => bannedUsersQuery.refetch(),
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'reports', label: 'Reports', icon: <Flag className="w-4 h-4" />, count: reportsQuery.data?.length },
    { key: 'moderators', label: 'Moderators', icon: <Shield className="w-4 h-4" />, count: moderatorsQuery.data?.length },
    { key: 'bans', label: 'Banned Users', icon: <Ban className="w-4 h-4" />, count: bannedUsersQuery.data?.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title="Forum Moderation | Admin | ReGen Civics" description="Moderate the community forum" />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-[#7dd87d]/70 hover:text-[#7dd87d] text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-[#7dd87d]" />
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Forum Moderation
            </h1>
            <p className="text-white/50 text-sm">Manage reports, moderators, and user bans</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[#7dd87d] text-[#1a472a]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-[#1a472a]/20' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['pending', 'reviewed', 'actioned', 'dismissed', undefined].map((status) => (
                <button
                  key={status || 'all'}
                  onClick={() => setReportFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    reportFilter === status
                      ? 'bg-[#7dd87d] text-[#1a472a] font-semibold'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {reportsQuery.isLoading ? (
                <div className="text-white/40 text-center py-8">Loading reports...</div>
              ) : reportsQuery.data?.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="w-12 h-12 text-[#7dd87d]/40 mx-auto mb-3" />
                  <p className="text-white/50">No {reportFilter || ''} reports</p>
                </div>
              ) : (
                reportsQuery.data?.map((report) => (
                  <div key={report.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            report.reason === 'spam' ? 'bg-yellow-500/20 text-yellow-400' :
                            report.reason === 'harassment' ? 'bg-red-500/20 text-red-400' :
                            report.reason === 'inappropriate' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {report.reason}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            report.status === 'actioned' ? 'bg-green-500/20 text-green-400' :
                            'bg-white/10 text-white/40'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm">
                          Reported by <span className="text-white font-medium">{report.reporterName}</span>
                          {report.postId && <span> on post #{report.postId}</span>}
                          {report.replyId && <span> on reply #{report.replyId}</span>}
                        </p>
                        {report.details && (
                          <p className="text-white/50 text-xs mt-1">{report.details}</p>
                        )}
                        <p className="text-white/30 text-xs mt-1">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => updateReportMutation.mutate({ id: report.id, status: 'actioned' })}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 h-8 px-2"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Action
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportMutation.mutate({ id: report.id, status: 'dismissed' })}
                            className="border-white/20 text-white/50 hover:bg-white/10 h-8 px-2"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Moderators Tab */}
        {activeTab === 'moderators' && (
          <div>
            {/* Add Moderator */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-white font-medium text-sm mb-3">Add Moderator</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newModUserId}
                  onChange={(e) => setNewModUserId(e.target.value)}
                  placeholder="User ID"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                />
                <Button
                  onClick={() => newModUserId && addModMutation.mutate({ userId: parseInt(newModUserId) })}
                  disabled={!newModUserId || addModMutation.isPending}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b]"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <p className="text-white/30 text-xs mt-2">Enter the user ID from the database to grant moderator privileges.</p>
            </div>

            {/* Moderator List */}
            <div className="space-y-2">
              {moderatorsQuery.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No moderators assigned yet</p>
                </div>
              ) : (
                moderatorsQuery.data?.map((mod) => (
                  <div key={mod.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{mod.userName}</p>
                      <p className="text-white/40 text-xs">User ID: {mod.userId} | Added {new Date(mod.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeModMutation.mutate({ userId: mod.userId })}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bans Tab */}
        {activeTab === 'bans' && (
          <div>
            {/* Ban User Form */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-white font-medium text-sm mb-3">Ban User</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={banUserId}
                    onChange={(e) => setBanUserId(e.target.value)}
                    placeholder="User ID"
                    className="w-32 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                  />
                  <input
                    type="number"
                    value={banDays}
                    onChange={(e) => setBanDays(e.target.value)}
                    placeholder="Days (empty = permanent)"
                    className="w-48 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                  />
                </div>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason for ban"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                />
                <Button
                  onClick={() => banUserId && banMutation.mutate({
                    userId: parseInt(banUserId),
                    reason: banReason || undefined,
                    days: banDays ? parseInt(banDays) : undefined,
                  })}
                  disabled={!banUserId || banMutation.isPending}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <Ban className="w-4 h-4 mr-1" /> Ban User
                </Button>
              </div>
            </div>

            {/* Banned Users List */}
            <div className="space-y-2">
              {bannedUsersQuery.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-10 h-10 text-[#7dd87d]/40 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No banned users</p>
                </div>
              ) : (
                bannedUsersQuery.data?.map((ban) => (
                  <div key={ban.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{ban.userName}</p>
                      <p className="text-white/40 text-xs">
                        Banned by {ban.bannedByName} | {ban.reason || 'No reason given'}
                      </p>
                      <p className="text-white/30 text-xs">
                        {ban.expiresAt ? `Expires: ${new Date(ban.expiresAt).toLocaleDateString()}` : 'Permanent'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unbanMutation.mutate({ userId: ban.userId })}
                      className="border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10 h-8"
                    >
                      Unban
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
