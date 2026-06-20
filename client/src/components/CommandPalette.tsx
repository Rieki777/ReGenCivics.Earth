/**
 * CommandPalette - Cmd+K / Ctrl+K search palette.
 * Opens on keyboard shortcut or nav search button.
 * Powered by cmdk. Searches static pages + live blog/forum/campaign results.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "cmdk";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { blogPosts } from "@/data/blogPosts";
import {
  Coins, Sprout, Handshake, Heart, Users, Calendar,
  BookOpen, Globe, FileText, Shield, AlertTriangle, Map, MessageCircle,
  Layers, Search, X, Sparkles, Scroll, Wrench,
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
  { label: "Game Overview", description: "The Infinite Game explained", href: "/game", icon: <Map className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  { label: "Quests", description: "Start your questing journey", href: "/quest", icon: <Scroll className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  { label: "Crowd Pool Campaigns", description: "Browse active campaigns", href: "/crowd-pooling-projects", icon: <Users className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  { label: "Schedule", description: "Book a call or join a session", href: "/schedule", icon: <Calendar className="w-4 h-4 text-[#7dd87d]" />, group: "Play" },
  // Community
  { label: "Community Forum", description: "Join the discussion", href: "/community", icon: <MessageCircle className="w-4 h-4 text-[#7dd87d]" />, group: "Community" },
  { label: "Blog", description: "Learn about regeneration", href: "/blog", icon: <BookOpen className="w-4 h-4 text-amber-400" />, group: "Community" },
  { label: "Team", description: "Meet the ReGen Civics team", href: "/team", icon: <Users className="w-4 h-4 text-white" />, group: "Community" },
  { label: "Map", description: "Explore projects on the map", href: "/map", icon: <Map className="w-4 h-4 text-[#7dd87d]" />, group: "Community" },
  { label: "Tools", description: "Tools regenerative projects actually use", href: "/tools", icon: <Wrench className="w-4 h-4 text-[#7dd87d]" />, group: "Community" },
  // Seasons
  { label: "Seasons", description: "Seasonal accelerator model", href: "/seasons", icon: <Layers className="w-4 h-4 text-[#7dd87d]" />, group: "Seasons" },
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
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const { data: liveResults } = trpc.globalSearch.query.useQuery(
    { q: debouncedQ },
    { enabled: debouncedQ.length >= 2, staleTime: 30_000 }
  );

  // People search by handle / name. Only enabled when signed in since the
  // backend is a protectedProcedure and would otherwise throw on every keystroke.
  const { data: peopleResults } = trpc.gratitude.searchUsers.useQuery(
    { query: debouncedQ },
    { enabled: isAuthenticated && debouncedQ.length >= 2, staleTime: 30_000 }
  );

  // Blog posts filtered client-side
  const blogResults = debouncedQ.length >= 2
    ? blogPosts.filter(p =>
        p.title.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        (p.excerpt ?? '').toLowerCase().includes(debouncedQ.toLowerCase())
      ).slice(0, 4)
    : [];

  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    // Keyboard shortcut: Cmd+K / Ctrl+K
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") { setOpen(false); setQuery(''); setDebouncedQ(''); }
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
    setQuery('');
    setDebouncedQ('');
    navigate(href);
  };

  if (!open) return null;

  // Group pages
  const groups = Array.from(new Set(PAGES.map((p) => p.group)));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      role="presentation"
      onClick={() => { setOpen(false); setQuery(''); setDebouncedQ(''); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Palette. max-w-[calc(100vw-1rem)] keeps the modal inside the
           viewport on 320px-wide phones; max-h-[80vh] + overflow-y-auto
           prevents content from disappearing under the keyboard or below
           the fold. */}
      <div
        className="relative w-full max-w-lg max-w-[calc(100vw-1rem)] max-h-[80vh] overflow-y-auto rounded-2xl border border-[#7dd87d]/30 bg-[#0d2818] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Site search"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Search pages" className="[&_[cmdk-group-heading]]:text-[#7dd87d]/75 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#7dd87d]/20">
            <Search className="w-4 h-4 text-[#7dd87d]/80 shrink-0" />
            <Command.Input
              placeholder="Search pages, blog, forum..."
              autoFocus
              value={query}
              onValueChange={setQuery}
              className="flex-1 bg-transparent text-white placeholder-white/55 text-sm outline-none"
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close command palette"
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-white/60 text-sm">
              No results found.
            </Command.Empty>

            {/* Dynamic: Blog results */}
            {blogResults.length > 0 && (
              <Command.Group heading="Blog">
                {blogResults.map((post) => (
                  <Command.Item
                    key={post.slug}
                    value={`blog ${post.title}`}
                    onSelect={() => runCommand(`/blog/${post.slug}`)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{post.title}</span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Dynamic: People results */}
            {peopleResults && peopleResults.length > 0 && (
              <Command.Group heading="People">
                {peopleResults.map((p) => (
                  <Command.Item
                    key={`u-${p.id}`}
                    value={`person ${p.handle ?? ''} ${p.displayName ?? ''} ${p.name ?? ''}`}
                    onSelect={() => p.handle && runCommand(`/profile/${p.handle}`)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{p.displayName || p.name || 'Unnamed'}</span>
                      {p.handle && <span className="block text-xs text-[#7dd87d]/70 truncate">@{p.handle}</span>}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Dynamic: Forum results */}
            {liveResults && liveResults.forumPosts.length > 0 && (
              <Command.Group heading="Forum">
                {liveResults.forumPosts.map((post) => (
                  <Command.Item
                    key={`fp-${post.id}`}
                    value={`forum ${post.title}`}
                    onSelect={() => runCommand(post.url)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#7dd87d] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{post.title}</span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Dynamic: Campaign results */}
            {liveResults && liveResults.campaigns.length > 0 && (
              <Command.Group heading="Campaigns">
                {liveResults.campaigns.map((c) => (
                  <Command.Item
                    key={`cp-${c.id}`}
                    value={`campaign ${c.title}`}
                    onSelect={() => runCommand(c.url)}
                    className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm text-white/80 hover:text-white data-[selected=true]:bg-[#1a472a] data-[selected=true]:text-white transition-colors"
                  >
                    <Users className="w-4 h-4 text-[#7dd87d] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{c.title}</span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

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
                        <span className="block text-xs text-white/60 truncate">{page.description}</span>
                      )}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer hint */}
          <div className="border-t border-[#7dd87d]/20 px-4 py-2 flex items-center gap-3 text-[10px] text-white/70">
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
