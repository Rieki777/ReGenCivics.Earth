/**
 * MobileMoreMenu: full-screen overlay launched from the bottom nav "More" button.
 *
 * Layout (top to bottom):
 *   1. Header band with the wizards hero icon
 *   2. Search input (jumps to anything via the existing CommandPalette)
 *   3. Next-quest card (context-aware)
 *   4. Play section (cards)
 *   5. Learn section (collapsed)
 *   6. Invest & Apply section (collapsed)
 *   7. Footer strip
 *
 * Body scroll is locked while open.
 */
import { useEffect, useState } from "react";
import { X, ChevronDown, Search, SkipBack, SkipForward, Play, Pause, Music, ListMusic, Plus } from "lucide-react";
import { MOBILE_MENU_SECTIONS, MOBILE_MENU_FOOTER } from "@/config/mobileMenu";
import { MenuCard } from "./MenuCard";
import { NextQuestCard } from "./NextQuestCard";
import { MobilePlaylistPanel } from "./MobilePlaylistPanel";
import { CopyLinkButton } from "@/components/audio/CopyLinkButton";
import { useSeasonTint } from "@/hooks/useSeasonTint";
import { Link } from "wouter";
import { useAudio } from "@/contexts/AudioContext";

type Props = { open?: boolean; onClose?: () => void };

/**
 * Self-contained version: also listens for the global "open-mobile-more"
 * custom event so it can be triggered from anywhere without prop drilling.
 */
export function MobileMoreMenu({ open: openProp, onClose: onCloseProp }: Props = {}) {
  const tint = useSeasonTint();
  const audio = useAudio();
  const [internalOpen, setInternalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const open = openProp ?? internalOpen;
  const onClose = onCloseProp ?? (() => setInternalOpen(false));

  useEffect(() => {
    const handler = () => setInternalOpen(true);
    window.addEventListener("open-mobile-more", handler);
    return () => window.removeEventListener("open-mobile-more", handler);
  }, []);

  // Initialize collapsed defaults from config on mount
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const section of MOBILE_MENU_SECTIONS) {
      init[section.id] = !section.collapsed;
    }
    setExpanded(init);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Open the existing command palette for site-wide search
  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0d2818] overflow-y-auto" role="dialog" aria-modal="true" aria-label="More menu">
      {/* Header band with wizards hero + close */}
      <div className={`relative bg-gradient-to-br ${tint.bgGradient} px-4 pt-5 pb-6`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <img
            src="/images/logos/regencivics-logo-light-transparent-rounded.webp"
            alt="ReGen Civics"
            width={80}
            height={80}
            className="rounded-2xl shadow-lg object-contain"
            loading="eager"
            decoding="async"
          />
          <h2 className="text-white text-xl font-bold mt-2" style={{ fontFamily: "var(--font-display)" }}>
            ReGen Civics
          </h2>
          <p className="text-white/70 text-xs">{tint.season} season</p>
        </div>
      </div>

      <div className="px-4 pb-12 -mt-4 space-y-5">
        {/* Search input (opens command palette) */}
        <button
          onClick={openSearch}
          className="w-full flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3 text-left text-white/60 hover:bg-white/15 transition-colors"
        >
          <Search className="w-4 h-4 text-[#7dd87d]" />
          <span className="text-sm">Jump to anything</span>
        </button>

        {/* Music player row + actions + playlist */}
        <div className="space-y-2">
          {/* Music player row */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-4 py-3">
            <Music className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
            <span className="flex-1 min-w-0 text-white/70 text-sm truncate">
              {audio.currentSong?.title ?? "Hymns for the ReGeneration"}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={audio.prevSong} className="p-1.5 text-white/60 hover:text-white" aria-label="Previous track">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={audio.togglePlay} className="p-2 text-[#7dd87d] hover:text-[#9de89d]" aria-label={audio.isPlaying ? "Pause" : "Play"}>
                {audio.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={audio.nextSong} className="p-1.5 text-white/60 hover:text-white" aria-label="Next track">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Three action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPlaylistOpen((s) => !s)}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl py-2.5 text-white text-xs font-semibold transition-colors"
              aria-expanded={playlistOpen}
              aria-controls="mobile-playlist-panel"
            >
              <ListMusic className="w-4 h-4 text-[#7dd87d]" />
              {playlistOpen ? "Hide" : "Playlist"}
            </button>
            <Link
              href="/hymn-book#add-your-voice"
              onClick={onClose}
              className="flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] rounded-2xl py-2.5 text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add song
            </Link>
            <CopyLinkButton song={audio.currentSong} variant="mobile" />
          </div>

          {/* Inline playlist panel */}
          {playlistOpen && (
            <div id="mobile-playlist-panel">
              <MobilePlaylistPanel onSelect={onClose} />
            </div>
          )}
        </div>

        {/* Next quest card */}
        <NextQuestCard onSelect={onClose} />

        {/* Sections */}
        {MOBILE_MENU_SECTIONS.map((section) => {
          const isOpen = expanded[section.id];
          return (
            <section key={section.id}>
              <button
                onClick={() => setExpanded((s) => ({ ...s, [section.id]: !s[section.id] }))}
                className="w-full flex items-center justify-between mb-2"
              >
                <h3 className="text-[#7dd87d] text-[10px] uppercase tracking-widest font-bold">
                  {section.heading}
                </h3>
                <ChevronDown className={`w-4 h-4 text-white/65 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 gap-2">
                  {section.cards.map((card) => (
                    <MenuCard key={card.href} {...card} onSelect={onClose} />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Footer strip */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-2">
          {MOBILE_MENU_FOOTER.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="text-white/50 hover:text-[#7dd87d] text-xs"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
