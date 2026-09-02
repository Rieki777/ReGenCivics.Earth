/**
 * Admin Kanban Board
 * Drag-and-drop status board for investors, general inquiries, and project applications.
 * Statuses are updated optimistically via tRPC mutations.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, TrendingUp, Sprout, ChevronDown } from "lucide-react";

// ─── Column definitions ────────────────────────────────────────────────────────

const INVESTOR_COLS = [
  { id: "new",           label: "New",           color: "bg-yellow-50 border-yellow-300" },
  { id: "contacted",     label: "Contacted",      color: "bg-blue-50 border-blue-300" },
  { id: "in_discussion", label: "In Discussion",  color: "bg-purple-50 border-purple-300" },
  { id: "committed",     label: "Committed",      color: "bg-green-50 border-green-300" },
  { id: "declined",      label: "Declined",       color: "bg-red-50 border-red-300" },
  { id: "archived",      label: "Archived",       color: "bg-gray-50 border-gray-300" },
];

const INQUIRY_COLS = [
  { id: "new",         label: "New",         color: "bg-yellow-50 border-yellow-300" },
  { id: "contacted",   label: "Contacted",   color: "bg-blue-50 border-blue-300" },
  { id: "in_progress", label: "In Progress", color: "bg-purple-50 border-purple-300" },
  { id: "completed",   label: "Completed",   color: "bg-green-50 border-green-300" },
  { id: "archived",    label: "Archived",    color: "bg-gray-50 border-gray-300" },
];

const APP_COLS = [
  { id: "submitted",         label: "Submitted",         color: "bg-yellow-50 border-yellow-300" },
  { id: "under_review",      label: "Under Review",      color: "bg-blue-50 border-blue-300" },
  { id: "changes_requested", label: "Changes Requested", color: "bg-orange-50 border-orange-300" },
  { id: "approved",          label: "Approved",          color: "bg-green-50 border-green-300" },
  { id: "rejected",          label: "Rejected",          color: "bg-red-50 border-red-300" },
];

// ─── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({
  id,
  name,
  subtitle,
  status,
  columns,
  onMove,
}: {
  id: string;
  name: string;
  subtitle?: string;
  status: string;
  columns: { id: string; label: string }[];
  onMove: (colId: string, itemId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
      className="bg-white border border-[#1a472a]/10 rounded-lg p-2.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none"
    >
      <p className="text-xs font-semibold text-[#1a472a] truncate">{name}</p>
      {subtitle && <p className="text-[10px] text-[#1a472a]/80 truncate mt-0.5">{subtitle}</p>}
      <label className="sr-only" htmlFor={`kanban-status-${id}`}>
        Status for {name}
      </label>
      <select
        id={`kanban-status-${id}`}
        value={status}
        onChange={(e) => onMove(e.target.value, id)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2 w-full min-h-11 text-xs border border-[#1a472a]/20 rounded-md bg-white text-[#1a472a] px-2"
      >
        {columns.map((col) => (
          <option key={col.id} value={col.id}>
            {col.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  items,
  columns,
  onDrop,
}: {
  col: { id: string; label: string; color: string };
  items: { id: string; name: string; subtitle?: string; status: string }[];
  columns: { id: string; label: string }[];
  onDrop: (colId: string, itemId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`flex-shrink-0 w-56 rounded-xl border-2 ${col.color} ${isDragOver ? 'ring-2 ring-[#7dd87d]' : ''} transition-all`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const itemId = e.dataTransfer.getData("text/plain");
        if (itemId) onDrop(col.id, itemId);
      }}
    >
      <div className="px-3 py-2 border-b border-inherit flex items-center justify-between">
        <span className="text-xs font-semibold text-[#1a472a]">{col.label}</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            id={item.id}
            name={item.name}
            subtitle={item.subtitle}
            status={item.status}
            columns={columns}
            onMove={onDrop}
          />
        ))}
        {items.length === 0 && (
          <div className="h-16 rounded-lg border-2 border-dashed border-[#1a472a]/10 flex items-center justify-center">
            <span className="text-[10px] text-[#1a472a]/75">Drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Board Sections ────────────────────────────────────────────────────────────

function InvestorBoard({ investors }: { investors: any[] }) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.investorInquiries.updateStatus.useMutation({
    onSuccess: () => utils.investorInquiries.list.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const handleDrop = (newStatus: string, itemId: string) => {
    const investor = investors.find((i) => String(i.id) === itemId);
    if (!investor || investor.status === newStatus) return;
    const prevStatus = investor.status;
    updateMutation.mutate({ id: investor.id, status: newStatus as any });
    toast(`Moved to ${newStatus.replace(/_/g, ' ')}`, {
      action: { label: 'Undo', onClick: () => updateMutation.mutate({ id: investor.id, status: prevStatus }) },
      duration: 5000,
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {INVESTOR_COLS.map((col) => (
        <KanbanColumn
          key={col.id}
          col={col}
          items={investors
            .filter((i) => (i.status || 'new') === col.id)
            .map((i) => ({
              id: String(i.id),
              name: i.fullName || i.email,
              subtitle: i.investmentRange,
              status: i.status || "new",
            }))}
          columns={INVESTOR_COLS}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

function InquiryBoard({ inquiries }: { inquiries: any[] }) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.generalInquiries.updateStatus.useMutation({
    onSuccess: () => utils.generalInquiries.list.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const handleDrop = (newStatus: string, itemId: string) => {
    const inquiry = inquiries.find((i) => String(i.id) === itemId);
    if (!inquiry || inquiry.status === newStatus) return;
    const prevStatus = inquiry.status;
    updateMutation.mutate({ id: inquiry.id, status: newStatus as any });
    toast(`Moved to ${newStatus.replace(/_/g, ' ')}`, {
      action: { label: 'Undo', onClick: () => updateMutation.mutate({ id: inquiry.id, status: prevStatus }) },
      duration: 5000,
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {INQUIRY_COLS.map((col) => (
        <KanbanColumn
          key={col.id}
          col={col}
          items={inquiries
            .filter((i) => (i.status || 'new') === col.id)
            .map((i) => ({
              id: String(i.id),
              name: i.fullName || i.email,
              subtitle: i.pathType?.replace(/_/g, ' '),
              status: i.status || "new",
            }))}
          columns={INQUIRY_COLS}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

function ApplicationBoard({ applications }: { applications: any[] }) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.applications.updateStatus.useMutation({
    onSuccess: () => utils.applications.list.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const handleDrop = (newStatus: string, itemId: string) => {
    const app = applications.find((a) => String(a.id) === itemId);
    if (!app || app.status === newStatus) return;
    const prevStatus = app.status;
    updateMutation.mutate({ id: app.id, status: newStatus as any });
    toast(`Moved to ${newStatus.replace(/_/g, ' ')}`, {
      action: { label: 'Undo', onClick: () => updateMutation.mutate({ id: app.id, status: prevStatus }) },
      duration: 5000,
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {APP_COLS.map((col) => (
        <KanbanColumn
          key={col.id}
          col={col}
          items={applications
            .filter((a) => (a.status || 'submitted') === col.id)
            .map((a) => ({
              id: String(a.id),
              name: a.projectName || a.contactName || 'Unknown',
              subtitle: a.location,
              status: a.status || "submitted",
            }))}
          columns={APP_COLS}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}

// ─── Collapsible section wrapper ───────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-[#1a472a] hover:text-[#2d5a3d] transition-colors"
      >
        <Icon className="w-4 h-4" />
        {title}
        <span className="text-xs font-normal text-[#1a472a]/80">({count})</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function AdminKanban({
  investors,
  inquiries,
  applications,
}: {
  investors: any[];
  inquiries: any[];
  applications: any[];
}) {
  return (
    <div className="space-y-6">
      <Section title="Investors" icon={TrendingUp} count={investors.length}>
        <InvestorBoard investors={investors} />
      </Section>
      <Section title="General Inquiries" icon={Users} count={inquiries.length}>
        <InquiryBoard inquiries={inquiries} />
      </Section>
      <Section title="Project Applications" icon={Sprout} count={applications.length}>
        <ApplicationBoard applications={applications} />
      </Section>
    </div>
  );
}
