import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, ChevronDown, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 },
];

function formatRelativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function AdminAuditLogTab() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: entries, isLoading } = trpc.admin.auditLog.useQuery({ limit: 100 });

  const now = Date.now();
  const filtered = (entries ?? []).filter((entry: any) => {
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    if (dateRangeDays > 0) {
      const age = now - new Date(entry.createdAt).getTime();
      if (age > dateRangeDays * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const uniqueActions = Array.from(new Set((entries ?? []).map((e: any) => e.action as string))).sort();

  return (
    <Card className="bg-white border border-[#1a472a]/10">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <ClipboardList className="w-5 h-5" />
            Audit Log
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-white border border-[#1a472a]/20 rounded-lg px-3 py-1.5 text-[#1a472a] text-sm"
            >
              <option value="all">All actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={dateRangeDays}
              onChange={e => setDateRangeDays(Number(e.target.value))}
              className="bg-white border border-[#1a472a]/20 rounded-lg px-3 py-1.5 text-[#1a472a] text-sm"
            >
              {DATE_RANGE_OPTIONS.map(o => (
                <option key={o.days} value={o.days}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#1a472a]/40" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-[#1a472a]/50 text-sm py-12">No admin actions recorded yet.</p>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a472a]/10 text-xs uppercase tracking-wide text-[#1a472a]/50">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Admin</th>
                  <th className="text-left px-4 py-2.5 font-medium">Action</th>
                  <th className="text-left px-4 py-2.5 font-medium">Entity</th>
                  <th className="text-left px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a472a]/5">
                {filtered.map((entry: any) => {
                  const createdAt = new Date(entry.createdAt);
                  const isExpanded = expandedRow === entry.id;
                  return (
                    <>
                      <tr
                        key={entry.id}
                        className="hover:bg-[#f5f9f5] cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                      >
                        <td className="px-4 py-3 text-[#1a472a]/70 whitespace-nowrap">
                          <span title={createdAt.toLocaleString()}>
                            {formatRelativeTime(createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a472a]/70">#{entry.adminUserId}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-[#1a472a]/10 text-[#1a472a] text-xs px-2 py-0.5 rounded font-mono">
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a472a]/70">
                          {entry.entityType && (
                            <span>
                              {entry.entityType}
                              {entry.entityId ? ` #${entry.entityId}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#1a472a] max-w-xs truncate">
                          {entry.description ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          {entry.metadata && (
                            <ChevronDown
                              className={`w-4 h-4 text-[#1a472a]/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          )}
                        </td>
                      </tr>
                      {isExpanded && entry.metadata && (
                        <tr key={`${entry.id}-meta`} className="bg-[#f0f7f0]">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-xs text-[#1a472a]/80 whitespace-pre-wrap font-mono bg-white border border-[#1a472a]/10 rounded-lg p-3 overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
