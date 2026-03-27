/**
 * SmartBottomNav - Adaptive bottom navigation with music controls
 * 5 slots: Quests (fixed) | Adaptive | Adaptive | Music | Expand Panel
 * Supports long-press customization on slots 2-3.
 * Visible on all screen sizes.
 */

import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Scroll, Sprout, Leaf, Sun, FileText, TrendingUp, PenLine,
  Clipboard, Handshake, MessageCircle, Users, Compass, UserCircle,
  BookOpen, Vote, Mountain, Globe, Calendar, Coins, Sparkles,
  PlayCircle, PauseCircle, ChevronUp,
} from "lucide-react";
import { useSmartNav, type NavSlot } from "@/hooks/useSmartNav";
import { NavCustomizeSheet } from "./NavCustomizeSheet";
import { useAudio } from "@/contexts/AudioContext";
import { CommandPanel } from "./CommandPanel";

// Icon component resolver
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scroll, Sprout, Leaf, Sun, FileText, TrendingUp, PenLine,
  Clipboard, Handshake, MessageCircle, Users, Compass, UserCircle,
  BookOpen, Vote, Mountain, Globe, Calendar, Coins, Sparkles,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <Compass className={className} />;
  return <Icon className={className} />;
}

export default function SmartBottomNav() {
  const [location] = useLocation();
  const { slots } = useSmartNav();
  const [customizeSlot, setCustomizeSlot] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressedSlot, setPressedSlot] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { isPlaying, togglePlay, currentSong } = useAudio();

  const handleLongPressStart = useCallback((slotIndex: number) => {
    if (slotIndex === 0) return; // slot 1 (Quests) not customizable
    longPressTimer.current = setTimeout(() => {
      setPressedSlot(slotIndex);
      setCustomizeSlot(`slot${slotIndex + 1}`);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const currentPath = location.split("?")[0].replace(/\/$/, "") || "/";

  // Only use first 3 nav slots to make room for music + expand
  const navSlots = slots.slice(0, 3);

  return (
    <>
      <CommandPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-sm border-t border-[#7dd87d]/20 safe-area-pb"
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto">
          {navSlots.map((slot, i) => {
            const isActive = currentPath === slot.path;
            return (
              <Link
                key={`${slot.path}-${i}`}
                href={slot.path}
                className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  isActive ? "text-[#7dd87d]" : "text-white/40 hover:text-white/70"
                }`}
                onTouchStart={() => handleLongPressStart(i)}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(i)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                <div className="relative">
                  <NavIcon name={slot.icon} className="w-5 h-5" />
                  {slot.isContextual && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffd700] rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{slot.label}</span>
              </Link>
            );
          })}

          {/* Music play/pause slot */}
          <button
            onClick={togglePlay}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isPlaying ? 'text-[#7dd87d]' : 'text-white/40 hover:text-white/70'
            }`}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
            <span className="text-[10px] font-medium truncate max-w-[60px]">
              {isPlaying && currentSong ? currentSong.title.split(' ')[0] : 'Music'}
            </span>
          </button>

          {/* Expand panel slot */}
          <button
            onClick={() => setPanelOpen(p => !p)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              panelOpen ? 'text-[#7dd87d]' : 'text-white/40 hover:text-white/70'
            }`}
            aria-label={panelOpen ? 'Close player' : 'Open player'}
          >
            <ChevronUp className={`w-5 h-5 transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Long-press customization sheet */}
      {customizeSlot && (
        <NavCustomizeSheet
          slotKey={customizeSlot}
          onSelect={() => {
            setCustomizeSlot(null);
            setPressedSlot(null);
          }}
          onClose={() => {
            setCustomizeSlot(null);
            setPressedSlot(null);
          }}
          onReset={() => {
            setCustomizeSlot(null);
            setPressedSlot(null);
          }}
        />
      )}
    </>
  );
}
