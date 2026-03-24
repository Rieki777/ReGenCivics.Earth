/**
 * SmartBottomNav - Adaptive mobile bottom navigation
 * 4 slots: Quests (fixed) | Adaptive | Adaptive | Contextual CTA
 * Supports long-press customization on slots 2-4.
 * Mobile only (hidden on md+).
 */

import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Scroll, Sprout, Leaf, Sun, FileText, TrendingUp, PenLine,
  Clipboard, Handshake, MessageCircle, Users, Compass, UserCircle,
  BookOpen, Vote, Mountain, Globe, Calendar, Coins, Sparkles,
} from "lucide-react";
import { useSmartNav, type NavSlot } from "@/hooks/useSmartNav";
import { NavCustomizeSheet } from "./NavCustomizeSheet";

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

  const handleLongPressStart = useCallback((slotIndex: number) => {
    if (slotIndex === 0) return; // slot 1 (Quests) not customizable
    longPressTimer.current = setTimeout(() => {
      setPressedSlot(slotIndex);
      setCustomizeSlot(`slot${slotIndex + 1}`);
      // Haptic feedback if available
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

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1a472a]/95 backdrop-blur-sm border-t border-[#7dd87d]/20 safe-area-pb"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-4 h-16">
          {slots.map((slot, i) => {
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
                  {/* Contextual CTA indicator dot */}
                  {slot.isContextual && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffd700] rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{slot.label}</span>
              </Link>
            );
          })}
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
