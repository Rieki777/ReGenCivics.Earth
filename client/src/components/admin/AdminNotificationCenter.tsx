import React from "react";
import { trpc } from "@/lib/trpc";
import { X, Archive, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatAge(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminNotificationCenter({ open, onClose }: Props) {
  const { data: notifications = [], refetch } = trpc.admin.notifications.list.useQuery(undefined, {
    enabled: open,
    refetchInterval: open ? 30000 : false,
  });

  const handleMutation = trpc.admin.notifications.handle.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Notification archived");
    },
  });

  const snoozeMutation = trpc.admin.notifications.snooze.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      toast.success(`Snoozed for ${vars.days} day${vars.days !== 1 ? "s" : ""}`);
    },
  });

  if (!open) return null;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const urgent = notifications.filter((n: any) => {
    const age = now - new Date(n.createdAt).getTime();
    return age > 2 * oneDayMs;
  });
  const upcoming = notifications.filter((n: any) => {
    const age = now - new Date(n.createdAt).getTime();
    return age <= 2 * oneDayMs && age > oneDayMs;
  });
  const recent = notifications.filter((n: any) => {
    const age = now - new Date(n.createdAt).getTime();
    return age <= oneDayMs;
  });

  function NotifCard({ notif }: { notif: any }) {
    return (
      <div className="bg-white border border-[#1a472a]/10 rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[#1a472a] font-medium flex-1">{notif.message}</p>
          <span className="text-[10px] text-[#1a472a]/80 whitespace-nowrap">
            {notif.createdAt ? formatAge(notif.createdAt) : ""}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => handleMutation.mutate({ id: notif.id })}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[#1a472a]/20 text-[#1a472a]/80 hover:bg-[#1a472a]/5 transition-colors"
          >
            <Archive className="w-2.5 h-2.5" />
            Archive
          </button>
          {[1, 3, 7].map((days) => (
            <button
              key={days}
              onClick={() => snoozeMutation.mutate({ id: notif.id, days })}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Clock className="w-2.5 h-2.5" />
              Snooze {days}d
            </button>
          ))}
        </div>
      </div>
    );
  }

  function Section({ title, color, items }: { title: string; color: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</h3>
        {items.map((n: any) => <NotifCard key={n.id} notif={n} />)}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-[#f8f5f0] border-l border-[#1a472a]/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#1a472a]/10 bg-white">
          <div>
            <h2 className="font-semibold text-[#1a472a]">Notification Center</h2>
            <p className="text-xs text-[#1a472a]/80">{notifications.length} unhandled</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1a472a]/5 text-[#1a472a]/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <p className="text-sm font-medium text-[#1a472a]/70">All caught up</p>
              <p className="text-xs text-[#1a472a]/80 mt-1">No pending notifications</p>
            </div>
          ) : (
            <>
              <Section title="Needs Action Now" color="text-red-600" items={urgent} />
              <Section title="Coming Up" color="text-amber-600" items={upcoming} />
              <Section title="Recent" color="text-[#1a472a]/80" items={recent} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
