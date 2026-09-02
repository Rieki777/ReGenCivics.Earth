import { useEffect, useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { recordAdminVisit, topAdminDestinations } from "@/lib/adminUsage";
import { writeAdminContinue, type NavItem } from "@/lib/adminNav";

export function AdminSpeedDial({
  onAsk,
  onNavigate,
}: {
  onAsk: () => void;
  onNavigate: (item: NavItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<NavItem[]>([]);

  useEffect(() => {
    setDestinations(topAdminDestinations(4));
  }, [open]);

  const run = (item: NavItem) => {
    recordAdminVisit(item.id);
    writeAdminContinue(item);
    onNavigate(item);
    setOpen(false);
  };

  return (
    <div className="md:hidden fixed z-50 right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          <button
            type="button"
            onClick={() => { onAsk(); setOpen(false); }}
            className="min-h-11 pl-4 pr-3 rounded-full bg-white border border-[#1a472a]/20 shadow-lg text-[#1a472a] text-sm font-semibold inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#4a7c59]" />
            Ask
          </button>
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => run(item)}
                className="min-h-11 pl-4 pr-3 rounded-full bg-white border border-[#1a472a]/20 shadow-lg text-[#1a472a] text-sm font-semibold inline-flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-[#4a7c59]" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-[#1a472a] text-[#7dd87d] shadow-lg inline-flex items-center justify-center"
        aria-label={open ? "Close quick access" : "Open quick access"}
        aria-expanded={open}
        data-testid="admin-speed-dial"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
