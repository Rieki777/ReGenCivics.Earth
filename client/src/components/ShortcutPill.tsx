/**
 * ShortcutPill — subtle ⌘K prompt that appears briefly for first-time visitors,
 * then stays as a small hint in the corner. Clicking it opens the CommandPalette.
 */
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface ShortcutPillProps {
  onOpen: () => void;
}

export function ShortcutPill({ onOpen }: ShortcutPillProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Only show if not seen recently
    const lastSeen = localStorage.getItem('shortcutPillSeen');
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (!lastSeen || parseInt(lastSeen) < dayAgo) {
      setVisible(true);
      setExpanded(true);
      localStorage.setItem('shortcutPillSeen', String(Date.now()));
      // Collapse after 4 seconds
      setTimeout(() => setExpanded(false), 4000);
    } else {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={onOpen}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#1a472a]/90 backdrop-blur-sm text-[#7dd87d] border border-[#7dd87d]/30 rounded-full shadow-lg hover:bg-[#1a472a] transition-all duration-500 ${expanded ? 'px-4 py-2' : 'p-2'}`}
      aria-label="Open search (⌘K)"
      title="Search (⌘K)"
    >
      <Search className="w-4 h-4 shrink-0" />
      {expanded && (
        <span className="text-xs font-medium whitespace-nowrap">
          Search <kbd className="ml-1 text-[10px] bg-[#7dd87d]/20 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </span>
      )}
    </button>
  );
}
