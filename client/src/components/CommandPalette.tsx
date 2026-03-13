/**
 * CommandPalette - Cmd+K / Ctrl+K search palette.
 * Opens on keyboard shortcut or nav search button.
 * Powered by cmdk.
 */
import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import {
  Coins, Sprout, Handshake, Heart, Gamepad2, Users, Calendar,
  BookOpen, Globe, FileText, Shield, AlertTriangle, Map, MessageCircle,
  Layers, Search, X,
} from "lucide-react";

type PageEntry = {
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  keywords?: string;
};

const PAGES: PageEntry[] = [
  // 4 Paths
  { label: "Investors", description: "Fund overview and investor journey", href: "/fund", icon: <Coins className="w-4 h-4 text-[#ffd700]" />, group: "4 Paths" },
  { label: "Land Projects", description: "Apply as a regenerative land project", href: "/land", icon: <Sprout className="w-4 h-4 text-[#7dd87d]" />, group: "4 Paths" },
  { label: "Alliance Network", description: "Become an alliance partner", href: "/ally", icon: <Handshake className="w-4 h-4 text-cyan-400" />, group: "4 Paths" },
  { label: "ReGen Players", description: "Play the Infinite Game", href: "/play", icon: <Heart className="w-4 h-4 text-pink-400" />, group: "4 Paths" },
  // Invest
  { label: "Investment Memorandum", description: "Full opportunity overview", href: "/opportunity", icon: <FileText className="w-4 h-4 text-[#ffd700]" />, group: "Invest", keywords: "opportunity thesis fund" },
  { label: "Letter of Intent", description: "Secure your investor spot", href: "/loi", icon: <FileText className="w-4 h-4 text-[#7dd87d]" />, group: "Invest" },
  { label: "Investor Form", description: "Submit investor interest", href: "/investor", icon: <Coins className="w-4 h-4 text-[#ffd700]" />, group: "Invest" },
  // Play
  { label: "Game Overview", description: "The Infinite Game explained", href: "/game", icon: <Gamepad2 className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  { label: "Quests", description: "Start your questing journey", href: "/quest", icon: <span className="text-sm">🧙</span>, group: "Play" },
  { label: "Crowd Pool Campaigns", description: "Browse active campaigns", href: "/crowd-pooling-projects", icon: <Users className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  // Community
  { label: "Community Forum", description: "Join the discussion", href: "/community", icon: <MessageCircle className="w-4 h-4 text-[#7dd87d]" />, group: "Community" },
  { label: "Blog", description: "Learn about regeneration", href: "/blog", icon: <BookOpen className="w-4 h-4 text-amber-400" />, group: "Community" },
  { label: "Team", description: "Meet the ReGen Civics team", href: "/team", icon: <Users className="w-4 h-4 text-white" />, group: "Community" },
  { label: "Map", description: "Explore projects on the map", href: "/map", icon: <Map className="w-4 h-4 text-[#7dd87d]" />, group: "Community" },
  // Seasons
  { label: "Seasons", description: "Seasonal accelerator model", href: "/seasons", icon: <Layers className="w-4 h-4 text-[#7dd87d]" />, group: "Seasons" },
  { label: "Schedule", description: "Book a call or join a session", href: "/schedule", icon: <Calendar className="w-4 h-4 text-[#7dd87d]" />, group: "Seasons" },
  // Apply
  { label: "Apply", description: "Apply as land project or alliance", href: "/apply", icon: <Sprout className="w-4 h-4 text-[#7dd87d]" />, group: "Apply" },
  // Legal
  { label: "Risk Disclosure", href: "/risk-disclosure", icon: <AlertTriangle className="w-4 h-4 text-red-400" />, group: "Legal" },
  { label: "Privacy Policy", href: "/privacy-policy", icon: <Shield className="w-4 h-4 text-[#7dd87d]" />, group: "Legal" },
  { label: "Terms of Use", href: "/terms-of-use", icon: <FileText className="w-4 h-4 text-[#7dd87d]" />, group: "Legal" },
  { label: "Disclaimers", href: "/disclaimers", icon: <Shield className="w-4 h-4 text-[#ffd700]" />, group: "Legal" },
  // Other
  { label: "Governance", href: "/governance", icon: <Globe className="w-4 h-4 text-[#4a9f9f]" />, group: "Other" },
  { label: "Tokenomics", href: "/tokenomics", icon: <Coins className="w-4 h-4 text-[#d4a574]" />, group: "Other" },
  { label: "Glossary", href: "/glossary", icon: <BookOpen className="w-4 h-4 text-white/60" />, group: "Other" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    // Keyboard shortcut: Cmd+K / Ctrl+K
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    // Custom event from nav search button
    const onEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onEvent);
    };
  }, [openPalette]);

  const runCommand = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  if (!open) return null;

  // Group pages
  const groups = Array.from(new Set(PAGES.map((p) => p.group)));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[#7dd87d]/30 bg-[#0d2818] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Search pages" className="[&_[cmdk-group-heading]]:text-[#7dd87d]/50 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#7dd87d]/20">
            <Search className="w-4 h-4 text-[#7dd87d]/60 shrink-0" />
            <Command.Input
              placeholder="Search pages..."
              autoFocus
              className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none"
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close command palette"
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-white/40 text-sm">
              No pages found.
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group key={group} heading={group}>
                {PAGES.filter((p) => p.group === group).map((page) => (
                  <Command.Item
                    key={page.href}
                    value={`${page.label} ${page.description ?? ""} ${page.keywords ?? ""}`}
                    onSelect={() => runCommand(page.href)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                  >
                    <span className="shrink-0">{page.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{page.label}</span>
                      {page.description && (
                        <span className="block text-xs text-white/40 truncate">{page.description}</span>
                      )}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer hint */}
          <div className="border-t border-[#7dd87d]/20 px-4 py-2 flex items-center gap-3 text-[10px] text-white/25">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

export default CommandPalette;
