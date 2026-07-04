/**
 * AdminCommandPalette: ⌘K / Ctrl+K jump-to-section for the admin.
 *
 * The public CommandPalette is disabled in admin mode, so this gives the
 * operator the same fast keyboard navigation across every admin section.
 * Sections come from the shared AdminSidebar NAV_GROUPS, so the palette and
 * the sidebar never drift. Route items open their page; tab items switch tabs.
 */
import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { NAV_GROUPS, type NavItem } from "./AdminSidebar";

export function AdminCommandPalette({ onSelectTab }: { onSelectTab: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("open-admin-command-palette", onEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("open-admin-command-palette", onEvent);
    };
  }, []);

  if (!open) return null;

  const run = (item: NavItem) => {
    setOpen(false);
    setQuery("");
    if (item.route) navigate(item.route);
    else onSelectTab(item.id);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[#7dd87d]/30 bg-[#0d2818] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Admin command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Jump to admin section"
          className="[&_[cmdk-group-heading]]:text-[#7dd87d]/75 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#7dd87d]/20">
            <Search className="w-4 h-4 text-[#7dd87d]/80 shrink-0" />
            <Command.Input
              placeholder="Jump to a section…"
              autoFocus
              value={query}
              onValueChange={setQuery}
              className="flex-1 bg-transparent text-white placeholder-white/55 text-sm outline-none"
            />
            <kbd className="hidden sm:inline text-[10px] text-white/40 border border-white/15 rounded px-1.5 py-0.5">esc</kbd>
            <button onClick={() => setOpen(false)} aria-label="Close command palette" className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-white/60 text-sm">No section found.</Command.Empty>
            {NAV_GROUPS.map((group) => (
              <Command.Group key={group.label} heading={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${group.label} ${item.label} ${item.id}`}
                      onSelect={() => run(item)}
                      className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#7dd87d] shrink-0" />
                      <span className="flex-1 min-w-0 font-medium">{item.label}</span>
                      {item.route && <span className="text-[10px] text-white/40">page</span>}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

export default AdminCommandPalette;
