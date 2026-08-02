/**
 * FooterSearch - Search bar in the footer using cmdk command palette
 * Indexes all pages, key sections, and actions
 */
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ArrowRight, Leaf, Coins, Users, Map, BookOpen, Calendar, FileText, Shield, Globe, HelpCircle, Scroll } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

interface SearchItem {
  label: string;
  href: string;
  keywords?: string;
  icon?: React.ReactNode;
}

const searchItems: { group: string; items: SearchItem[] }[] = [
  {
    group: "Main Pages",
    items: [
      { label: "Home", href: "/", keywords: "home landing main", icon: <Leaf className="w-4 h-4" /> },
      { label: "Investors / Fund", href: "/fund", keywords: "invest fund money capital returns", icon: <Coins className="w-4 h-4" /> },
      { label: "Land Projects", href: "/land", keywords: "land projects ecovillage farm regenerative", icon: <Leaf className="w-4 h-4" /> },
      { label: "Alliance Partners", href: "/ally", keywords: "alliance partner organization ngo", icon: <Users className="w-4 h-4" /> },
      { label: "Players", href: "/play", keywords: "play player game tokens", icon: <Map className="w-4 h-4" /> },
      { label: "Game Overview", href: "/game", keywords: "game infinite quests tokens mechanics", icon: <Map className="w-4 h-4" /> },
      { label: "Investment Thesis", href: "/opportunity", keywords: "opportunity invest thesis memorandum", icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    group: "Participate",
    items: [
      { label: "Seasons / Incubator", href: "/seasons", keywords: "season incubator program apply", icon: <Calendar className="w-4 h-4" /> },
      { label: "Open Sessions", href: "/schedule", keywords: "schedule session event meeting call", icon: <Calendar className="w-4 h-4" /> },
      { label: "Apply", href: "/apply", keywords: "apply application join", icon: <FileText className="w-4 h-4" /> },
      { label: "Team", href: "/team", keywords: "team people roles jobs", icon: <Users className="w-4 h-4" /> },
      { label: "Community Forum", href: "/community", keywords: "forum community discuss gathering grove", icon: <Users className="w-4 h-4" /> },
      { label: "Connect / Contact", href: "/connect", keywords: "contact connect inquiry message", icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    group: "Game & Tools",
    items: [
      { label: "Start Questing", href: "/quest", keywords: "quest mission task earn tokens", icon: <Scroll className="w-4 h-4" /> },
      { label: "Bounties", href: "/bounties", keywords: "bounty task earn tokens work reward", icon: <Coins className="w-4 h-4" /> },
      { label: "Crowd Pooling", href: "/crowd-pooling", keywords: "crowd pool calculator contribute", icon: <Coins className="w-4 h-4" /> },
      { label: "Crowd Pool Campaigns", href: "/crowd-pooling-campaigns", keywords: "campaigns active crowd pool", icon: <Coins className="w-4 h-4" /> },
      { label: "Contribution Calculator", href: "/calculator", keywords: "calculator contribution 9 nine forms capital health", icon: <Coins className="w-4 h-4" /> },
      { label: "Governance", href: "/governance", keywords: "governance dao voting proposals", icon: <Shield className="w-4 h-4" /> },
      { label: "Project Showcase", href: "/showcase", keywords: "showcase projects approved portfolio", icon: <Leaf className="w-4 h-4" /> },
      { label: "Project Comparison", href: "/project-comparison", keywords: "compare projects side by side", icon: <Leaf className="w-4 h-4" /> },
      { label: "Map", href: "/map", keywords: "map locations projects geography", icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    group: "Learn",
    items: [
      { label: "Blog", href: "/blog", keywords: "blog articles posts news", icon: <BookOpen className="w-4 h-4" /> },
      { label: "Glossary", href: "/glossary", keywords: "glossary terms definitions vocabulary", icon: <HelpCircle className="w-4 h-4" /> },
      { label: "Socials", href: "/socials", keywords: "social media links youtube telegram", icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    group: "Legal",
    items: [
      { label: "Privacy Policy", href: "/privacy-policy", keywords: "privacy data policy", icon: <Shield className="w-4 h-4" /> },
      { label: "Terms of Use", href: "/terms-of-use", keywords: "terms conditions use", icon: <Shield className="w-4 h-4" /> },
      { label: "Risk Disclosure", href: "/risk-disclosure", keywords: "risk disclosure investment warning", icon: <Shield className="w-4 h-4" /> },
      { label: "Disclaimers", href: "/disclaimers", keywords: "disclaimer legal notice", icon: <Shield className="w-4 h-4" /> },
    ],
  },
];

export function FooterSearch() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate]
  );

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Search bar trigger in footer */}
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-md mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#7dd87d]/30 hover:bg-white/8 transition-all cursor-pointer group"
      >
        <Search className="w-4 h-4 text-white/70 group-hover:text-[#7dd87d] transition-colors" />
        <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
          Search pages, tools, and resources...
        </span>
        <kbd className="hidden sm:inline-flex ml-auto items-center gap-0.5 px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, tools, and resources..." />
        <CommandList>
          <CommandEmpty>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No results found.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords</p>
            </div>
          </CommandEmpty>
          {searchItems.map((group, i) => (
            <div key={group.group}>
              <CommandGroup heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords || ""}`}
                    onSelect={() => handleSelect(item.href)}
                    className="cursor-pointer"
                  >
                    <span className="text-muted-foreground mr-2">{item.icon}</span>
                    <span>{item.label}</span>
                    <ArrowRight className="ml-auto w-3 h-3 text-muted-foreground/50" />
                  </CommandItem>
                ))}
              </CommandGroup>
              {i < searchItems.length - 1 && <CommandSeparator />}
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default FooterSearch;
