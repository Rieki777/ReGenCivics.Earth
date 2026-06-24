/**
 * NavCustomizeSheet - Bottom sheet for customizing Smart Nav slots
 * Shows a grid of available pages. User taps to replace the long-pressed slot.
 */

import { X, RotateCcw } from "lucide-react";
import { saveCustomSlot, clearCustomSlots } from "@/hooks/useSmartNav";
import { NavIcon } from "./SmartBottomNav";

const AVAILABLE_PAGES = [
  { path: "/quest", icon: "Scroll", label: "Quests", category: "Game" },
  { path: "/play", icon: "Sprout", label: "Play", category: "Game" },
  { path: "/game", icon: "Leaf", label: "Game", category: "Game" },
  { path: "/community", icon: "Users", label: "Community", category: "Game" },
  { path: "/fund", icon: "TrendingUp", label: "Fund", category: "Paths" },
  { path: "/land", icon: "Mountain", label: "Land", category: "Paths" },
  { path: "/ally", icon: "Handshake", label: "Alliance", category: "Paths" },
  { path: "/connect", icon: "MessageCircle", label: "Connect", category: "Paths" },
  { path: "/opportunity", icon: "FileText", label: "Opportunity", category: "Resources" },
  { path: "/seasons", icon: "Sun", label: "Seasons", category: "Resources" },
  { path: "/schedule", icon: "Calendar", label: "Schedule", category: "Resources" },
  { path: "/blog", icon: "BookOpen", label: "Blog", category: "Resources" },
  { path: "/governance", icon: "Vote", label: "Governance", category: "Resources" },
  { path: "/loi", icon: "PenLine", label: "Submit LOI", category: "Actions" },
  { path: "/apply", icon: "Clipboard", label: "Apply", category: "Actions" },
  { path: "/map", icon: "Globe", label: "Map", category: "Resources" },
  { path: "/", icon: "Compass", label: "Explore", category: "Resources" },
];

interface NavCustomizeSheetProps {
  slotKey: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  onReset: () => void;
}

export function NavCustomizeSheet({ slotKey, onSelect, onClose, onReset }: NavCustomizeSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-customize-title"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#1a472a] rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a472a] border-b border-[#7dd87d]/20 px-4 py-4 flex items-center justify-between z-10">
          <h3 id="nav-customize-title" className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Choose a Page
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearCustomSlots(); onReset(); }}
              className="text-white/60 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2 p-4 pb-8">
          {AVAILABLE_PAGES.map((page) => (
            <button
              key={page.path}
              onClick={() => {
                saveCustomSlot(slotKey, page.path);
                onSelect(page.path);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-[#7dd87d]/20 transition-colors"
            >
              <NavIcon name={page.icon} className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-white text-xs font-medium text-center leading-tight">{page.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
