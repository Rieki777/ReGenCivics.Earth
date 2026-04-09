/**
 * Navigation Header Component
 * Restructured menu:
 * - "4 Paths" dropdown: Fund (Investors), Land (Projects), Ally (Alliance), Play (Players)
 * - "Play the Game" dropdown: Game Overview, Start Questing, Crowd Pool Campaigns
 *   + Calculators: Crowd Pool Calculator, Contribution Calculator
 *   + Player Profile
 * - "Seasons + Schedule" dropdown: Seasons, Schedule
 * - Map, Team, Participate CTA
 * - "Explore + Connect" dropdown: Learn + Blog, Community Forum, social links
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronUp, Menu, X, Users, Calendar, Layers, BookOpen, Calculator, UsersRound, User, LogIn, LogOut, Settings, Sparkles, Globe, Coins, Sprout, Handshake, Heart, MessageCircle, Search, Lightbulb, Wrench, TrendingUp, SlidersHorizontal } from "lucide-react";
import { Drawer } from "vaul";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuthDialog } from "@/components/AuthDialog";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { FlowerOfLifeIcon } from "@/components/FlowerOfLifeIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { WizardsFamilyIcon } from "@/components/icons/WizardsFamilyIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOCIAL_LINKS } from "@/components/SocialLinks";
import { cdnImg } from "@/lib/utils";
import SmartBottomNav from "@/components/SmartBottomNav";
import MobileTabBar from "@/components/mobile/MobileTabBar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Prefetch a route chunk on hover  -  import() is cached by the module system
const prefetch = (path: string) => {
  const routes: Record<string, () => Promise<unknown>> = {
    "/fund": () => import("@/pages/Fund"),
    "/land": () => import("@/pages/Land"),
    "/ally": () => import("@/pages/Ally"),
    "/play": () => import("@/pages/Play"),
    "/opportunity": () => import("@/pages/Opportunity"),
    "/game": () => import("@/pages/Game"),
    "/quest": () => import("@/pages/Quest"),
    "/seasons": () => import("@/pages/Seasons"),
    "/schedule": () => import("@/pages/Schedule"),
    "/team": () => import("@/pages/Team"),
    "/map": () => import("@/pages/Map"),
    "/blog": () => import("@/pages/Blog"),
    "/community": () => import("@/pages/Community"),
    "/apply": () => import("@/pages/Apply"),
  };
  routes[path]?.();
};

export default function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobile4PathsOpen, setMobile4PathsOpen] = useState(false);
  const [mobilePlayGameOpen, setMobilePlayGameOpen] = useState(false);
  const [mobileSeasonsOpen, setMobileSeasonsOpen] = useState(false);
  const [mobileSocialsOpen, setMobileSocialsOpen] = useState(false);
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const { data: _msgUnreadData } = trpc.messages.unreadCount.useQuery(
    undefined,
    { enabled: !!user && isAuthenticated, refetchInterval: 10_000 }
  );
  const messagesUnreadCount = _msgUnreadData?.count ?? 0;

  const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user && isAuthenticated,
    staleTime: 300_000,
  });
  const avatarUrl = userProfile?.avatarUrl;

  // Convert SOCIAL_LINKS to array format for dropdown
  const socialLinks = Object.entries(SOCIAL_LINKS).map(([key, value]) => ({
    name: value.name,
    icon: value.icon,
    href: value.url,
    color: key === 'socials' ? 'text-green-400' : key === 'youtube' ? 'text-red-500' : 'text-green-500',
  }));

  // Check if current location is in 4 Paths section
  const is4PathsActive = location === '/fund' || location === '/land' || location === '/ally' || location === '/play';
  
  // Check if current location is in Play the Game section
  const isPlayGameActive = location === '/game' || location === '/play' || location === '/calculator' || location === '/profile' || location === '/quest' || location === '/crowd-pooling-projects' || location === '/crowd-pooling' || location === '/create-campaign' || location.startsWith('/campaign/') || location === '/local-food-economy' || location === '/tools' || location.startsWith('/tools/');
  
  // Check if current location is in Seasons + Schedule section
  const isSeasonsActive = location === '/seasons' || location === '/schedule';

  // Check if current location is in Explore + Connect
  const isSocialsBlogActive = location === '/blog' || location.startsWith('/blog/') || location === '/socials' || location.startsWith('/community') || location === '/economy' || location === '/bionomics' || location === '/tokenomics' || location === '/game-mechanics';

  return (
    <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-[#7dd87d] focus:text-[#1a472a] focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
    >
      Skip to main content
    </a>
    <header className="sticky top-0 z-50 bg-[#1a472a]/95 backdrop-blur-sm border-b border-[#7dd87d]/20" role="banner">
      <div className="container">
        <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
          {/* Logo / Brand */}
          <Link 
            href="/"
            className="flex items-center gap-2 text-[#7dd87d] hover:text-[#9de89d] transition-colors"
          >
            <img
              src="/icon-192.webp"
              alt="ReGen Civics"
              width="40"
              height="40"
              className="w-10 h-10 object-contain md:hidden"
              loading="eager"
              onError={(e) => { e.currentTarget.style.display = 'none'; const span = e.currentTarget.nextElementSibling as HTMLElement; if (span) span.classList.remove('hidden', 'md:block'); }}
            />
            <span className="hidden md:block text-lg font-bold bg-gradient-to-r from-[#d4a574] to-[#ffd700] bg-clip-text text-transparent">
              ReGen Civics
            </span>
          </Link>

          {/* Mobile Participate Button - centered with gold glow */}
          <Link
            href="/connect"
            className="md:hidden"
          >
            <Button
              className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] hover:from-[#e0b88a] hover:to-[#ffe44d] rounded-full px-5 py-1.5 text-sm font-bold shadow-[0_0_15px_rgba(255,215,0,0.4),0_0_30px_rgba(212,165,116,0.2)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6),0_0_40px_rgba(212,165,116,0.3)] transition-all"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Participate
            </Button>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">

            {/* 4 Paths Dropdown - NEW */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 rounded-full px-4 ${
                    is4PathsActive
                      ? 'bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d] hover:text-[#1a472a]'
                      : 'text-white hover:bg-[#ffd700]/20 hover:text-[#ffd700]'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                  onMouseEnter={() => { prefetch("/fund"); prefetch("/land"); prefetch("/ally"); prefetch("/play"); }}
                >
                  <SeedOfLifeIcon className="w-4 h-4" />
                  4 Paths
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[220px]"
              >
                <DropdownMenuItem 
                  className="text-white hover:bg-[#ffd700]/20 focus:bg-[#ffd700]/20 cursor-pointer"
                  onClick={() => window.location.href = '/fund'}
                >
                  <Coins className="w-5 h-5 mr-3 text-[#ffd700]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Investors</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/land'}
                >
                  <Sprout className="w-5 h-5 mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Land Projects</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-cyan-400/20 focus:bg-cyan-400/20 cursor-pointer"
                  onClick={() => window.location.href = '/ally'}
                >
                  <Handshake className="w-5 h-5 mr-3 text-cyan-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Alliance Network</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-pink-400/20 focus:bg-pink-400/20 cursor-pointer"
                  onClick={() => window.location.href = '/play'}
                >
                  <Heart className="w-5 h-5 mr-3 text-pink-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>ReGen Players</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Play the Game Dropdown - ghost variant of the gold Participate CTA */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 rounded-full px-4 border-2 transition-all ${
                    isPlayGameActive
                      ? 'bg-[#7dd87d] text-[#1a472a] border-[#7dd87d] hover:bg-[#7dd87d] hover:text-[#1a472a]'
                      : 'text-[#ffd700] border-[#ffd700]/60 hover:bg-[#ffd700]/10 hover:text-[#ffd700] hover:border-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.15)]'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                  onMouseEnter={() => { prefetch("/game"); prefetch("/quest"); prefetch("/play"); }}
                >
                  <FlowerOfLifeIcon className="w-4 h-4" size={16} />
                  Play the Game
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[220px]"
              >
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/game'}
                >
                  <FlowerOfLifeIcon className="w-5 h-5 mr-3 text-[#7dd87d]" size={20} />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Game Overview</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/play'}
                >
                  <Heart className="w-5 h-5 mr-3 text-purple-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Play</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[#7dd87d] bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer my-1 mx-1 font-semibold"
                  onClick={() => window.location.href = '/quest'}
                >
                  <WizardsFamilyIcon size={20} className="mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Explore Quests</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/crowd-pooling-projects'}
                >
                  <UsersRound className="w-5 h-5 mr-3 text-blue-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Crowd Pool Campaigns</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/tools'}
                >
                  <Wrench className="w-5 h-5 mr-3 text-amber-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Tools Library</span>
                  <span className="ml-auto text-[9px] bg-[#7dd87d]/30 text-[#7dd87d] px-1.5 py-0.5 rounded-full">New</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/local-food-economy'}
                >
                  <Sprout className="w-5 h-5 mr-3 text-green-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Local Food Economy</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/crowd-pooling'}
                >
                  <Calculator className="w-5 h-5 mr-3 text-green-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Crowd Pool Calculator</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/calculator'}
                >
                  <Calculator className="w-5 h-5 mr-3 text-amber-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Contribution Calculator</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/regen-games'}
                >
                  <span className="text-lg mr-3">🏅</span>
                  <span style={{ fontFamily: 'var(--font-accent)' }}>The ReGen Games</span>
                  <span className="ml-auto text-[9px] bg-[#d4a574]/30 text-[#d4a574] px-1.5 py-0.5 rounded-full">Soon</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/custom-games'}
                >
                  <span className="text-lg mr-3">🗺️</span>
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Custom Land Games</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/profile'}
                >
                  <User className="w-5 h-5 mr-3 text-purple-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Player Profile</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Seasons + Schedule Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 rounded-full px-4 ${
                    isSeasonsActive
                      ? 'bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d] hover:text-[#1a472a]' 
                      : 'text-white hover:bg-[#ffd700]/20 hover:text-[#ffd700]'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <Layers className="w-4 h-4" />
                  Seasons + Schedule
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="center" 
                className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[200px]"
              >
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/seasons'}
                >
                  <Layers className="w-5 h-5 mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Seasons</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/schedule'}
                >
                  <Calendar className="w-5 h-5 mr-3 text-amber-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Schedule</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Global Map Link */}
            <Link 
              href="/map"
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                location === '/map' 
                  ? 'bg-[#7dd87d] text-[#1a472a]' 
                  : 'text-white hover:bg-[#ffd700]/20 hover:text-[#ffd700]'
              }`}
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              <Globe className="w-4 h-4" />
              Map
            </Link>

            {/* Team Link */}
            <Link 
              href="/team"
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                location === '/team' 
                  ? 'bg-[#7dd87d] text-[#1a472a]' 
                  : 'text-white hover:bg-[#ffd700]/20 hover:text-[#ffd700]'
              }`}
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              <Users className="w-4 h-4" />
              Team
            </Link>

            {/* Desktop Participate CTA with gold glow */}
            <Link href="/connect">
              <Button
                className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] hover:from-[#e0b88a] hover:to-[#ffe44d] rounded-full px-5 font-bold shadow-[0_0_15px_rgba(255,215,0,0.4),0_0_30px_rgba(212,165,116,0.2)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6),0_0_40px_rgba(212,165,116,0.3)] transition-all"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Participate
              </Button>
            </Link>

            {/* Explore + Connect Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center gap-2 rounded-full px-4 ${
                    isSocialsBlogActive
                      ? 'bg-[#7dd87d] text-[#1a472a] hover:bg-[#7dd87d] hover:text-[#1a472a]' 
                      : 'text-white hover:bg-[#ffd700]/20 hover:text-[#ffd700]'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <Users className="w-4 h-4" />
                  Explore + Connect
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[200px]"
              >
                <DropdownMenuItem 
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/blog'}
                >
                  <BookOpen className="w-5 h-5 mr-3 text-amber-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Learn + Blog</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/community'}
                >
                  <MessageCircle className="w-5 h-5 mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Community Forum</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                <div className="px-2 pt-2 pb-1 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                    <circle cx="12" cy="12" r="11" fill="#0d2818" stroke="#7dd87d" strokeWidth="0.6" />
                    <path d="M12 1 a11 11 0 0 1 0 22 a5.5 5.5 0 0 1 0 -11 a5.5 5.5 0 0 0 0 -11 z" fill="#d4a574" />
                    <circle cx="12" cy="6.5" r="1.4" fill="#0d2818" />
                    <circle cx="12" cy="17.5" r="1.4" fill="#7dd87d" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider text-white/55" style={{ fontFamily: 'var(--font-accent)' }}>
                    The Two Sides of the Bridge
                  </span>
                </div>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/tokenomics'}
                >
                  <Coins className="w-5 h-5 mr-3 text-[#d4a574]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Tokenomics <span className="text-white/65 text-xs ml-1">(the Fund)</span></span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/bionomics'}
                >
                  <TrendingUp className="w-5 h-5 mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Bionomics <span className="text-white/65 text-xs ml-1">(the Game)</span></span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/game-mechanics'}
                >
                  <SlidersHorizontal className="w-5 h-5 mr-3 text-[#7dd87d]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Game Mechanics</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/governance'}
                >
                  <Globe className="w-5 h-5 mr-3 text-[#4a9f9f]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Governance</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/glossary'}
                >
                  <BookOpen className="w-5 h-5 mr-3 text-[#c084fc]" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Glossary</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                  onClick={() => window.location.href = '/features'}
                >
                  <Lightbulb className="w-5 h-5 mr-3 text-amber-400" />
                  <span style={{ fontFamily: 'var(--font-accent)' }}>Suggest a Feature</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#7dd87d]/20" />
                {socialLinks.map((social) => (
                  <DropdownMenuItem
                    key={social.name}
                    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                    onClick={() => window.open(social.href, '_blank')}
                  >
                    <social.icon className={`w-5 h-5 mr-3 ${social.color}`} />
                    <span style={{ fontFamily: 'var(--font-accent)' }}>{social.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>



            {/* Language Switcher */}
            <LanguageSwitcher compact />

            {/* Notification Bell */}
            {isAuthenticated && user && <NotificationBell />}

            {/* Messages icon */}
            {isAuthenticated && user && (
              <Link href="/messages">
                <button
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                  {messagesUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#7dd87d] text-[#1a472a] text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {messagesUnreadCount > 9 ? '9+' : messagesUnreadCount}
                    </span>
                  )}
                </button>
              </Link>
            )}

            {/* Sign In / User Dropdown */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-white hover:bg-[#7dd87d]/20 hover:text-white rounded-full px-3"
                    aria-label="Your profile"
                  >
                    {avatarUrl ? (
                      <img
                        src={cdnImg(avatarUrl, 64)}
                        alt={user.name || 'Profile'}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded-full bg-[#7dd87d] flex items-center justify-center text-[#1a472a] font-bold text-sm ${avatarUrl ? 'hidden' : ''}`}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[200px]"
                >
                  <div className="px-3 py-2 border-b border-[#7dd87d]/20">
                    <p className="text-white font-medium text-sm">{user.name}</p>
                    <p className="text-white/60 text-xs truncate">{user.openId}</p>
                  </div>
                  <DropdownMenuItem 
                    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                    onClick={() => window.location.href = '/profile'}
                  >
                    <User className="w-5 h-5 mr-3 text-[#7dd87d]" />
                    <span style={{ fontFamily: 'var(--font-accent)' }}>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                    onClick={() => window.location.href = '/profile?tab=quests'}
                  >
                    <BookOpen className="w-5 h-5 mr-3 text-[#7dd87d]" />
                    <span style={{ fontFamily: 'var(--font-accent)' }}>Personal Quests</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                    onClick={() => window.location.href = '/profile?tab=contributions'}
                  >
                    <Calculator className="w-5 h-5 mr-3 text-amber-400" />
                    <span style={{ fontFamily: 'var(--font-accent)' }}>My Contributions</span>
                  </DropdownMenuItem>
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <DropdownMenuItem 
                      className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
                      onClick={() => window.location.href = '/admin'}
                    >
                      <Settings className="w-5 h-5 mr-3 text-purple-400" />
                      <span style={{ fontFamily: 'var(--font-accent)' }}>Admin Panel</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 cursor-pointer"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span style={{ fontFamily: 'var(--font-accent)' }}>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] hover:text-[#1a472a] rounded-full px-4"
                style={{ fontFamily: 'var(--font-accent)' }}
                onClick={() => setAuthDialogOpen(true)}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Cmd+K Search  -  mobile & desktop */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-command-palette"));
            }}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </nav>
      </div>

      {/* Mobile Drawer  -  slides in from right */}
      <Drawer.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[60] md:hidden" />
          <Drawer.Content
            id="mobile-nav-drawer"
            className="fixed inset-y-0 right-0 z-[70] w-[min(85vw,320px)] bg-[#0d2818] border-l border-[#7dd87d]/20 flex flex-col overflow-hidden md:hidden focus:outline-none"
            aria-label="Mobile navigation"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#7dd87d]/20 bg-[#1a472a]">
              <span className="text-[#7dd87d] font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                ReGen Civics
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/60 hover:text-white p-2.5 -mr-1 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1 p-3">


              {/* 4 Paths Dropdown - Mobile */}
              <div className="flex flex-col">
                <button
                  onClick={() => setMobile4PathsOpen(!mobile4PathsOpen)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    is4PathsActive
                      ? 'bg-[#7dd87d] text-[#1a472a]' 
                      : 'text-white hover:bg-[#7dd87d]/20'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <div className="flex items-center gap-2">
                    <SeedOfLifeIcon className="w-5 h-5" />
                    4 Paths
                  </div>
                  {mobile4PathsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {mobile4PathsOpen && (
                  <div className="flex flex-col gap-1 mt-1">
                    <Link 
                      href="/fund"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/fund' 
                          ? 'bg-[#ffd700] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#ffd700]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Coins className="w-4 h-4 text-[#ffd700]" />
                      Investors
                    </Link>
                    <Link 
                      href="/land"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/land' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Sprout className="w-4 h-4 text-[#7dd87d]" />
                      Land Projects
                    </Link>
                    <Link 
                      href="/ally"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/ally' 
                          ? 'bg-cyan-400 text-[#1a472a]' 
                          : 'text-white/70 hover:bg-cyan-400/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Handshake className="w-4 h-4 text-cyan-400" />
                      Alliance Network
                    </Link>
                    <Link 
                      href="/play"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/play' 
                          ? 'bg-pink-400 text-[#1a472a]' 
                          : 'text-white/70 hover:bg-pink-400/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Heart className="w-4 h-4 text-pink-400" />
                      ReGen Players
                    </Link>
                  </div>
                )}
              </div>

              {/* Play the Game Dropdown - Mobile */}
              <div className="flex flex-col">
                <button
                  onClick={() => setMobilePlayGameOpen(!mobilePlayGameOpen)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isPlayGameActive
                      ? 'bg-[#7dd87d] text-[#1a472a]' 
                      : 'text-white hover:bg-[#7dd87d]/20'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <div className="flex items-center gap-2">
                    <FlowerOfLifeIcon className="w-5 h-5" size={20} />
                    Play the Game
                  </div>
                  {mobilePlayGameOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {mobilePlayGameOpen && (
                  <div className="flex flex-col gap-1 mt-1">
                    <Link 
                      href="/game"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/game' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FlowerOfLifeIcon className="w-4 h-4" size={16} />
                      Game Overview
                    </Link>
                    <Link 
                      href="/play"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/play' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Heart className="w-4 h-4" />
                      Play
                    </Link>
                    <Link
                      href="/quest"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/quest'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <WizardsFamilyIcon size={18} />
                      Explore Quests
                    </Link>
                    <Link 
                      href="/crowd-pooling-projects"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/crowd-pooling-projects' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <UsersRound className="w-4 h-4" />
                      Crowd Pool Campaigns
                    </Link>
                    <div className="mx-10 my-1 border-t border-[#7dd87d]/20" />
                    <Link 
                      href="/crowd-pooling"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/crowd-pooling' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calculator className="w-4 h-4" />
                      Crowd Pool Calculator
                    </Link>
                    <Link 
                      href="/calculator"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/calculator' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calculator className="w-4 h-4" />
                      Contribution Calculator
                    </Link>
                    <div className="mx-10 my-1 border-t border-[#7dd87d]/20" />
                    <Link
                      href="/regen-games"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/regen-games'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">🏅</span>
                      The ReGen Games
                      <span className="ml-auto text-[9px] bg-[#d4a574]/30 text-[#d4a574] px-1.5 py-0.5 rounded-full">Soon</span>
                    </Link>
                    <Link
                      href="/custom-games"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/custom-games'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-lg">🗺️</span>
                      Custom Land Games
                    </Link>
                    <div className="mx-10 my-1 border-t border-[#7dd87d]/20" />
                    <Link
                      href="/profile"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/profile'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Player Profile
                    </Link>
                    <Link
                      href="/profile?tab=quests"
                      className="flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all text-white/70 hover:bg-[#7dd87d]/20 hover:text-white"
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BookOpen className="w-4 h-4 text-[#7dd87d]" />
                      Personal Quests
                    </Link>
                  </div>
                )}
              </div>

              {/* Seasons + Schedule Dropdown - Mobile */}
              <div className="flex flex-col">
                <button
                  onClick={() => setMobileSeasonsOpen(!mobileSeasonsOpen)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isSeasonsActive
                      ? 'bg-[#7dd87d] text-[#1a472a]' 
                      : 'text-white hover:bg-[#7dd87d]/20'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Seasons + Schedule
                  </div>
                  {mobileSeasonsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {mobileSeasonsOpen && (
                  <div className="flex flex-col gap-1 mt-1">
                    <Link 
                      href="/seasons"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/seasons' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Layers className="w-4 h-4" />
                      Seasons
                    </Link>
                    <Link 
                      href="/schedule"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/schedule' 
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </Link>
                  </div>
                )}
              </div>

              <Link 
                href="/map"
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  location === '/map' 
                    ? 'bg-[#7dd87d] text-[#1a472a]' 
                    : 'text-white hover:bg-[#7dd87d]/20'
                }`}
                style={{ fontFamily: 'var(--font-accent)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Globe className="w-5 h-5" />
                Map
              </Link>

              <Link 
                href="/team"
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  location === '/team' 
                    ? 'bg-[#7dd87d] text-[#1a472a]' 
                    : 'text-white hover:bg-[#7dd87d]/20'
                }`}
                style={{ fontFamily: 'var(--font-accent)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                Team
              </Link>
              
              {/* Explore + Connect Collapsible - Mobile */}
              <div className="flex flex-col">
                <button
                  onClick={() => setMobileSocialsOpen(!mobileSocialsOpen)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    isSocialsBlogActive
                      ? 'bg-[#7dd87d] text-[#1a472a]' 
                      : 'text-white hover:bg-[#7dd87d]/20'
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Explore + Connect
                  </div>
                  {mobileSocialsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {mobileSocialsOpen && (
                  <div className="flex flex-col gap-1 mt-1">
                    <Link 
                      href="/blog"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/blog' || location.startsWith('/blog/')
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      Learn + Blog
                    </Link>
                    <Link 
                      href="/community"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location.startsWith('/community')
                          ? 'bg-[#7dd87d] text-[#1a472a]' 
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <MessageCircle className="w-4 h-4 text-[#7dd87d]" />
                      Community Forum
                    </Link>
                    <Link
                      href="/game-mechanics"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/game-mechanics'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <SlidersHorizontal className="w-4 h-4 text-[#7dd87d]" />
                      Game Mechanics
                    </Link>
                    <div className="px-4 pl-10 pt-3 pb-1 flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                        <circle cx="12" cy="12" r="11" fill="#0d2818" stroke="#7dd87d" strokeWidth="0.6" />
                        <path d="M12 1 a11 11 0 0 1 0 22 a5.5 5.5 0 0 1 0 -11 a5.5 5.5 0 0 0 0 -11 z" fill="#d4a574" />
                        <circle cx="12" cy="6.5" r="1.4" fill="#0d2818" />
                        <circle cx="12" cy="17.5" r="1.4" fill="#7dd87d" />
                      </svg>
                      <span className="text-[10px] uppercase tracking-wider text-white/55" style={{ fontFamily: 'var(--font-accent)' }}>
                        The Two Sides of the Bridge
                      </span>
                    </div>
                    <Link
                      href="/tokenomics"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/tokenomics'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Coins className="w-4 h-4 text-[#d4a574]" />
                      Tokenomics <span className="text-white/65 text-xs">(the Fund)</span>
                    </Link>
                    <Link
                      href="/bionomics"
                      className={`flex items-center gap-2 px-4 py-3 pl-10 rounded-xl transition-all ${
                        location === '/bionomics'
                          ? 'bg-[#7dd87d] text-[#1a472a]'
                          : 'text-white/70 hover:bg-[#7dd87d]/20 hover:text-white'
                      }`}
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <TrendingUp className="w-4 h-4 text-[#7dd87d]" />
                      Bionomics <span className="text-white/65 text-xs">(the Game)</span>
                    </Link>
                    <div className="mx-10 my-1 border-t border-[#7dd87d]/20" />
                    {socialLinks.map((social) => (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 pl-10 text-white/70 hover:bg-[#7dd87d]/20 hover:text-white rounded-xl transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <social.icon className={`w-5 h-5 ${social.color}`} />
                        <span style={{ fontFamily: 'var(--font-accent)' }}>{social.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Language Switcher */}
              <div className="mt-4 pt-4 border-t border-[#7dd87d]/20 px-4">
                <LanguageSwitcher />
              </div>

              {/* Mobile Sign In / User Section */}
              <div className="mt-4 pt-4 border-t border-[#7dd87d]/20">
                {loading ? (
                  <div className="px-4 py-3">
                    <div className="w-full h-10 rounded-xl bg-[#7dd87d]/20 animate-pulse" />
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-3 flex items-center gap-3">
                      {avatarUrl ? (
                        <img
                          src={cdnImg(avatarUrl, 64)}
                          alt={user.name || 'Profile'}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            el.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center text-[#1a472a] font-bold ${avatarUrl ? 'hidden' : ''}`}>
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{user.name}</p>
                        <p className="text-white/60 text-xs">Signed in</p>
                      </div>
                    </div>
                    <Link 
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-[#7dd87d]/20 rounded-xl transition-all"
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-5 h-5 text-[#7dd87d]" />
                      My Profile
                    </Link>
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <Link 
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-3 text-white hover:bg-[#7dd87d]/20 rounded-xl transition-all"
                        style={{ fontFamily: 'var(--font-accent)' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="w-5 h-5 text-purple-400" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      className="flex items-center gap-2 px-4 py-3 w-full text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                      style={{ fontFamily: 'var(--font-accent)' }}
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    className="flex items-center justify-center gap-2 mx-4 py-3 w-[calc(100%-2rem)] bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] rounded-xl transition-all font-medium"
                    style={{ fontFamily: 'var(--font-accent)' }}
                    onClick={() => {
                      setAuthDialogOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </button>
                )}

              </div>
            </div>
            </div>{/* end scrollable */}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onLogin={() => setAuthDialogOpen(false)}
      />
    </header>

      {/* Mobile bottom nav: 5-slot tab bar (Home, Quests, Community, Profile, More) */}
      <MobileTabBar />
      {/* Desktop keeps the legacy adaptive bottom nav with music + tool panel */}
      <div className="hidden md:block">
        <SmartBottomNav />
      </div>
    </>
  );
}