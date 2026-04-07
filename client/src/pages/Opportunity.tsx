/**
 * Opportunity Page - Institutional-Quality Investment Opportunity
 * REBUILT: Full content overhaul with collapsible sections, new imagery,
 * enhanced animations, and comprehensive investment memorandum.
 * Design: Enchanted Forest theme with institutional finance credibility
 */

import { useState, useEffect, useRef, ReactNode, lazy, Suspense, useCallback } from "react";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { MobileTableOfContents } from "@/components/MobileTableOfContents";
const AllocationCalculator = lazy(() => import("@/components/AllocationCalculator"));
import { useLocation } from "wouter";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useCountUp } from "@/hooks/useCountUp";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Mail, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Globe,
  TrendingUp,
  Leaf,
  Building,
  Target,
  CheckCircle2,
  FileText,
  MapPin,
  Wallet,
  Sparkles,
  BarChart3,
  Scale,
  Clock,
  DollarSign,
  AlertTriangle,
  Briefcase,
  ArrowRight,
  CircleDot,
  Layers,
  ArrowLeftRight,
  Network,
  Handshake,
  Eye,
  Lock,
  Zap,
  Coins,
  TreePine,
  Heart,
  BookOpen,
  HelpCircle,
  Vote,
  Landmark,
  Workflow,
  LayoutGrid
} from "lucide-react";
import { AnimatedSection, StaggeredContainer } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";

// =============================================
// REUSABLE COMPONENTS
// =============================================

// Fund Status Banner - minimizes on scroll
function FundStatusBanner() {
  const [minimized, setMinimized] = useState(false);

  const handleScroll = useCallback(() => {
    setMinimized(window.scrollY > 200);
  }, []);

  useThrottledScroll(handleScroll);
  
  if (minimized) {
    return (
      <div className="fixed top-[73px] right-4 z-40">
        <Link href="/loi">
          <button
            className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] transition-all flex items-center gap-2"
            style={{ fontFamily: 'var(--font-accent)' }}
          >
            <FileText className="w-4 h-4" />
            Submit LOI
          </button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="fixed top-[73px] left-0 right-0 z-40 bg-gradient-to-r from-[#d4a574] via-[#ffd700] to-[#d4a574] border-b-2 border-[#ffd700]/50 shadow-[0_4px_15px_rgba(255,215,0,0.3)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[#1a472a]">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
            <PulsingDot color="#1a472a" />
            <span>Fund In Formation  -  Currently Accepting Letters of Intent</span>
          </div>
          <span className="hidden sm:inline text-[#1a472a]/60">|</span>
          <Link href="/loi">
            <Button 
              size="sm" 
              className="bg-[#1a472a] hover:bg-[#0d2818] text-white text-xs sm:text-sm px-3 py-1 h-auto"
            >
              Submit LOI
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Collapsible section component with smooth animation
// On desktop (1024px+): sections default open for scannable reading
// On mobile: sections default closed so users can scan headers on the 47k+ px page
function CollapsibleSection({
  title,
  children,
  defaultOpen,
  icon: Icon,
  id
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  id?: string;
}) {
  const isDesktopSection = useMediaQuery('(min-width: 1024px)');
  const resolvedDefault = defaultOpen ?? false;
  const [isOpen, setIsOpen] = useState(resolvedDefault);

  return (
    <AnimatedSection animation="slide-up" className="mb-6">
      <div id={id} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 md:px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-[#7dd87d]" />}
            <h2
              className="text-lg md:text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
          </div>
          <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-[#7dd87d]" />
          </div>
        </button>
        <div
          style={{
            maxHeight: isOpen ? '9999px' : '0',
            overflow: isOpen ? 'visible' : 'hidden',
            transition: 'max-height 300ms ease',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="px-5 md:px-6 pb-6 text-white/80 leading-relaxed text-[15px] md:text-base">
            {children}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

// Stat box for the investment snapshot
function SnapshotStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="text-center p-3 md:p-4">
      <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg md:text-xl font-bold text-[#7dd87d]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      {note && <p className="text-[11px] text-white/60 mt-0.5">{note}</p>}
    </div>
  );
}

// Inline FAQ item
function FAQItem({ question, children }: { question: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-start justify-between text-left hover:text-[#7dd87d] transition-colors gap-3"
      >
        <span className="font-semibold text-white text-[15px] md:text-base leading-relaxed">{question}</span>
        <div className={`transform transition-transform duration-300 flex-shrink-0 mt-1 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-4 h-4 text-[#7dd87d]" />
        </div>
      </button>
      <div 
        className={`transition-all duration-400 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 pb-4' : 'max-h-0 opacity-0'}`}
      >
        <div className="text-white/70 text-sm md:text-[15px] leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// Glowing divider
function GlowDivider() {
  return (
    <div className="my-10 md:my-14 flex items-center justify-center">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
      <div className="mx-4 w-2 h-2 rounded-full bg-[#7dd87d]/50 shadow-[0_0_8px_rgba(125,216,125,0.5)]" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
    </div>
  );
}

// Pulsing live indicator dot
function PulsingDot({ color = '#7dd87d' }: { color?: string }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 flex-shrink-0">
      <span 
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span 
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// Highlight card for key callouts
function HighlightCard({ icon: Icon, title, children, accent = false }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 border transition-all duration-300 hover:scale-[1.01] ${
      accent 
        ? 'bg-gradient-to-br from-[#7dd87d]/15 to-[#4a9f4a]/10 border-[#7dd87d]/40 shadow-[0_0_20px_rgba(125,216,125,0.08)]' 
        : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
          accent ? 'bg-[#7dd87d]/20' : 'bg-white/10'
        }`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-[#7dd87d]' : 'text-white/70'}`} />
        </div>
      )}
      <h4 className={`font-bold text-sm mb-1.5 ${accent ? 'text-[#7dd87d]' : 'text-white'}`}
        style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h4>
      <div className="text-white/60 text-xs leading-relaxed">{children}</div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

// Milestone item with IntersectionObserver reveal
function MilestoneItem({ milestone, index }: { milestone: typeof MILESTONES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.unobserve(el);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-20px)',
        transition: `all 0.5s ease ${index * 100}ms`,
      }}
    >
      <div className="absolute -left-[11px] w-5 h-5 rounded-full border-2 border-[#7dd87d] bg-[#0d2818] flex items-center justify-center" style={{ top: 'auto' }}>
        <span className="w-2 h-2 rounded-full bg-[#7dd87d]" />
      </div>
      <div className={`rounded-xl p-4 border ${milestone.highlight ? 'border-[#ffd700]/40 bg-[#ffd700]/5' : 'border-white/10 bg-white/5'}`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${milestone.highlight ? 'text-[#ffd700]' : 'text-[#7dd87d]'}`}>{milestone.year}</span>
        <p className="text-white/70 text-sm mt-1">{milestone.text}</p>
      </div>
    </div>
  );
}

// Magnetic LOI button
function MagneticLOIButton() {
  const btnRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.15;
    const dy = (e.clientY - cy) * 0.15;
    btnRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = 'translate(0, 0)';
  };

  return (
    <a
      ref={btnRef}
      href="/loi"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.2s ease', display: 'inline-flex' }}
      className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-6 py-3 rounded-xl text-base hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-shadow items-center gap-2"
    >
      <FileText className="w-5 h-5" />
      Submit Letter of Intent
    </a>
  );
}

// MobileLOI sticky bar
function MobileLOIBar() {
  const [visible, setVisible] = useState(false);

  const handler = useCallback(() => {
    setVisible(window.scrollY > 400);
  }, []);

  useThrottledScroll(handler, 150);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-[#ffd700] text-[#1a1a00] px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Ready to move forward?</span>
        <a href="/loi" className="bg-[#1a1a00] text-[#ffd700] text-sm font-bold px-4 py-1.5 rounded-lg">Submit LOI</a>
      </div>
    </div>
  );
}

// Milestones for Track Record timeline
const MILESTONES = [
  { year: '2017', text: 'Published the SEEDS whitepaper: a PhD-level dissertation on regenerative economic systems for the blockchain age. The intellectual foundation.' },
  { year: '2019', text: 'Launched SEEDS: a live digital economy and governance system on the blockchain.' },
  { year: '2020', text: 'SEEDS grows to 10,000 people across 40+ countries and 300+ organizations. Launched Hypha, the DAO and governance tooling powering the ecosystem.' },
  { year: '2021', text: 'Launched Season 1 of ReGen Civics. The game begins.' },
  { year: '2021-2025', text: 'Four years building relationships, refining technology, and conducting research. Preparing for the right window.' },
  { year: '2026', text: 'Fund I opens. The window is now.', highlight: true },
];

// Count-up stat box with IntersectionObserver trigger
function CountUpStat({ label, value, note, numericValue, suffix = '' }: {
  label: string;
  value: string;
  note?: string;
  numericValue?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const count = useCountUp(numericValue ?? 0, 1200, triggered && numericValue !== undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTriggered(true);
        obs.unobserve(el);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const displayValue = (triggered && numericValue !== undefined) ? `${count}${suffix}` : value;

  return (
    <div ref={ref} className="text-center p-3 md:p-4">
      <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg md:text-xl font-bold text-[#7dd87d]" style={{ fontFamily: 'var(--font-display)' }}>{displayValue}</p>
      {note && <p className="text-[11px] text-white/60 mt-0.5">{note}</p>}
    </div>
  );
}

// Allocation donut chart
const allocationData = [
  { name: 'Land Projects', value: 60, color: '#4ade80' },
  { name: 'Operations', value: 30, color: '#86efac' },
  { name: 'Reserve', value: 10, color: '#bbf7d0' },
];

// Market bars with animation on IntersectionObserver
function MarketBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTriggered(true);
        obs.unobserve(el);
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const items = [
    { label: 'Urban Regeneration', value: '$2.3T', width: '23%' },
    { label: 'Green Building', value: '$1.4T', width: '14%' },
    { label: 'Sustainable Assets', value: '$35T+', width: '100%' },
  ];

  return (
    <div ref={ref} className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70">{item.label}</span>
            <span className="text-green-400 font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
              style={{
                width: triggered ? item.width : '0%',
                transition: 'width 1200ms ease-out',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Case study placeholder card
function CaseStudyCard() {
  return (
    <div className="relative rounded-xl border border-white/10 bg-white/5 p-5 overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-10 rounded-xl">
        <Lock className="w-6 h-6 text-white/60 mb-2" />
        <p className="text-white/70 text-xs text-center px-4">Full case study available after LOI submission</p>
      </div>
      <div className="opacity-30 select-none">
        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Case Study</p>
        <h4 className="font-bold text-white text-base mb-1">Regenerative Land Project (In Review)</h4>
        <p className="text-white/60 text-xs"><MapPin className="w-3 h-3 inline mr-1" />Costa Rica</p>
        <p className="text-white/60 text-xs mt-2">Preview only</p>
      </div>
    </div>
  );
}

// LP Dispatch email signup section
function LPDispatch() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    subscribeMutation.mutate({ email, name: name || undefined, source: 'other' });
  };

  return (
    <AnimatedSection animation="slide-up">
      <div className="mb-10 rounded-2xl border border-[#7dd87d]/20 bg-white/[0.03] p-6 md:p-8 hover:border-[#7dd87d]/40 transition-colors group">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-[#7dd87d]" />
          <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>LP Dispatch</h3>
        </div>
        <p className="text-white/60 text-sm mb-4">Get quarterly fund updates and co-investment opportunities.</p>
        {done ? (
          <p className="text-[#7dd87d] text-sm font-semibold">You are subscribed. Updates incoming.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              className="bg-[#7dd87d] text-[#1a472a] font-bold px-5 py-2 rounded-lg text-sm hover:bg-[#6cc86c] transition-colors whitespace-nowrap"
            >
              {subscribeMutation.isPending ? 'Joining...' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </AnimatedSection>
  );
}

export default function Opportunity() {
  const [, setLocation] = useLocation();
  const [investorName, setInvestorName] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Server-authoritative gate: check if logged-in user has submitted
  const { data: submittedData, isLoading: submittedLoading } = trpc.investorInquiries.hasSubmitted.useQuery(
    undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    const name = localStorage.getItem('investor_name');
    if (name) setInvestorName(name);
  }, []);

  // Gate logic
  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return;

    if (user) {
      // Logged in + loading server check: do not redirect yet
      if (submittedLoading) return;

      if (submittedData?.submitted) {
        // Server says yes: resync localStorage
        localStorage.setItem('investor_verified', 'true');
        sessionStorage.setItem('investor_verified', 'true');
        return;
      }

      // Server says not submitted: check localStorage fallback
      const localVerified =
        sessionStorage.getItem('investor_verified') === 'true' ||
        localStorage.getItem('investor_verified') === 'true';
      if (!localVerified) {
        setLocation('/investor');
      }
    } else {
      // Not logged in: localStorage-only logic
      const isVerified =
        sessionStorage.getItem('investor_verified') === 'true' ||
        localStorage.getItem('investor_verified') === 'true';
      if (!isVerified) {
        setLocation('/investor');
      }
    }
  }, [user, authLoading, submittedData, submittedLoading, setLocation]);

  // Show spinner while verifying
  const isVerifying =
    authLoading ||
    (!!user && submittedLoading);

  // Also check local storage to avoid flash
  const localVerified =
    typeof sessionStorage !== 'undefined' &&
    (sessionStorage.getItem('investor_verified') === 'true' ||
      localStorage.getItem('investor_verified') === 'true');

  if (isVerifying && !localVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7dd87d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      {investorName && (
        <div className="text-center py-2 text-sm text-[#7dd87d]/70">
          Welcome back, {investorName.split(" ")[0]}
        </div>
      )}
      <SEO {...pageSEO.opportunity} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Investment Opportunity", url: "/opportunity" }]} />
      {isDesktop ? <TableOfContents /> : <MobileTableOfContents />}
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-md border-b border-[#ffd700]/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-[#ffd700] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Home</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-2 border-[#ffd700]/50 text-[#ffd700] hover:bg-[#ffd700]/10"
              onClick={() => {
                window.open('https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/regen-civics-investor-deck-v3_b8e3b334.pdf', '_blank');
              }}
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Download Slides</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10"
              onClick={() => window.open('https://calendly.com/rieki-cordon/30min', '_blank')}
            >
              <Calendar className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Book Call</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Fund Status Notice Banner */}
      <FundStatusBanner />

      {/* Main Content */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* On large screens, shift content left to make room for TOC sidebar (w-72 + 2rem gap = ~320px) */}
          <div className="max-w-4xl mx-auto lg:mr-80 xl:mr-80">

            {/* ===== LEGAL BANNER ===== */}
            <AnimatedSection animation="fade-in">
              <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/30 border-2 border-[#ffd700]/50 rounded-2xl p-5 md:p-6 backdrop-blur-sm mb-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-[#ffd700] flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-[#ffd700] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                      NOT AN OFFER TO SELL SECURITIES
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed">
                      This is not an offer to sell securities. An offering will only be made through a confidential private placement memorandum to accredited investors in compliance with applicable securities laws. Past performance does not guarantee future results. Projected returns are estimates and may not be achieved.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Back to Investor Form link */}
            <div className="mb-8 text-center">
              <Link href="/investor" className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#ffd700] transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Investor Form (update your information)</span>
              </Link>
            </div>

            {/* ===== ALLIANCE MARQUEE ===== */}
            <div className="overflow-hidden whitespace-nowrap border-y border-white/10 py-2 bg-white/5 mb-6 -mx-4">
              <div className="animate-marquee inline-block">
                {['Hypha', 'SEEDS', 'Kinship Earth', 'Closer.earth', 'Impact Hub', 'OASA.earth', 'New Earth Summit', 'Planetary Party', 'Holomovement'].map(name => (
                  <span key={name} className="mx-8 text-sm text-white/50">{name}</span>
                ))}
                {['Hypha', 'SEEDS', 'Kinship Earth', 'Closer.earth', 'Impact Hub', 'OASA.earth', 'New Earth Summit', 'Planetary Party', 'Holomovement'].map(name => (
                  <span key={name + '2'} className="mx-8 text-sm text-white/50">{name}</span>
                ))}
              </div>
            </div>

            {/* ===== HERO SECTION ===== */}
            <AnimatedSection animation="slide-up" delay={100}>
              <div className="hero-grain relative text-center mb-10 rounded-2xl py-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7dd87d]/70 mb-3 relative z-10">Accredited Investors Only</p>
                <h1
                  className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight relative z-10"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  The Regenerative Transition, <span className="text-[#7dd87d]">As an Asset Class</span>
                </h1>
                <p className="text-base md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed relative z-10">
                  A pioneering hybrid REIT + VC fund combining land-backed stability with venture growth across the full regenerative ecosystem: startup villages, regenerative communities, and the organizations rethinking housing, infrastructure, energy, governance, and other core services needed for thriving regenerative civilizations. Targeting 12-18% net IRR while financing systemic change.
                </p>
                <p className="text-sm text-white/50 max-w-2xl mx-auto mt-3 relative z-10">
                  Intention: an <strong className="text-white/70">index fund for the regenerative transition</strong>; with regenerative land and communities as a foundation, growing into a full ecosystem of services for regenerative civilizations.
                </p>
              </div>
            </AnimatedSection>

            {/* ===== TRACK RECORD TIMELINE ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10">
                <h2 className="text-lg md:text-xl font-bold text-white mb-5" style={{ fontFamily: 'var(--font-display)' }}>The Track Record</h2>
                <div className="relative pl-6 border-l border-[#7dd87d]/30 space-y-6">
                  {MILESTONES.map((m, i) => (
                    <MilestoneItem key={i} milestone={m} index={i} />
                  ))}
                </div>
              </div>
            </AnimatedSection>

            {/* ===== WHAT IS THE ALLIANCE? ===== */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="mb-10">
                <div className="relative rounded-2xl overflow-hidden mb-6">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/opp-alliance-ecosystem-LaVJzzkbc3FU9b3WSBHhgG.webp"
                    alt="The ReGen Civics Alliance ecosystem - interconnected regenerative villages, organizations, and governance infrastructure"
                    className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
                    width="1200"
                    height="800"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818]/80 via-transparent to-transparent rounded-2xl" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                      What Is "The Alliance"?
                    </h2>
                  </div>
                </div>
                <p className="text-white/80 text-[15px] md:text-base leading-relaxed mb-5">
                  The ReGen Civics Alliance is three things:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                      <Wallet className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold text-white text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>The Fund</h3>
                    <p className="text-white/60 text-sm">The investment vehicle you're investing in</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                      <Network className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold text-white text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>The Network</h3>
                    <p className="text-white/60 text-sm">Land projects + organizations working together across global jurisdictions</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                      <Workflow className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3 className="font-bold text-white text-base mb-1" style={{ fontFamily: 'var(--font-display)' }}>The Infrastructure</h3>
                    <p className="text-white/60 text-sm">Governance technology coordinating billions towards regeneration</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm mt-4 text-center italic">
                  When we say "Alliance," we mean this entire ecosystem, not just the fund.
                </p>
              </div>
            </AnimatedSection>

            {/* ===== FUND SNAPSHOT ===== */}
            <AnimatedSection animation="scale-in" delay={100}>
              <div className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] border-2 border-[#7dd87d]/40 rounded-2xl p-5 md:p-6 mb-10 shadow-[0_0_30px_rgba(125,216,125,0.08)]">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <BarChart3 className="w-5 h-5 text-[#7dd87d]" />
                  <h2 className="text-base font-bold text-[#7dd87d] uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                    Fund Snapshot
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden">
                  <div className="bg-[#1a472a] rounded-none"><CountUpStat label="Fund Size Target" value="$25M-$50M" note="Fund I" /></div>
                  <div className="bg-[#1a472a] rounded-none"><CountUpStat label="Minimum Investment" value="$250,000" numericValue={250} suffix="K" note="Accredited investors" /></div>
                  <div className="bg-[#1a472a] rounded-none"><CountUpStat label="Target Net IRR" value="12-18%" note="Net to LPs" /></div>
                  <div className="bg-[#1a472a] rounded-none"><CountUpStat label="Fund Term" value="Perpetual" note="Permanent capital vehicle" /></div>
                </div>
                <div className="mt-px">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden">
                    <div className="bg-[#0d2818] rounded-none"><CountUpStat label="Asset Allocation" value="60 / 30 / 10" note="Land / Alliance / Innovation" /></div>
                    <div className="bg-[#0d2818] rounded-none"><CountUpStat label="Geographic Focus" value="Global" note="Multi-jurisdictional diversification" /></div>
                    <div className="bg-[#0d2818] rounded-none"><CountUpStat label="Fund Structure" value="Alliance" note="On-chain governance via Base" /></div>
                    <div className="bg-[#0d2818] rounded-none"><CountUpStat label="Status" value="Formation" note="Accepting LOIs until $20M committed" /></div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 text-center">
                  <p className="text-xs text-white/60">
                    Offered pursuant to Reg D 506(c). Available to accredited investors only. Fee structure: 1.5% management fee, 20% carried interest above 8% preferred return (applies to distributions and asset sales; does not apply to secondary market token trading).
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== WHY ON-CHAIN GOVERNANCE (collapsible, default closed) ===== */}
            <CollapsibleSection title="Why On-Chain Governance?" icon={Eye} id="governance">
              <p className="text-white/80 text-[15px] md:text-base leading-relaxed mb-5">
                Traditional multi-asset funds struggle with transparency and coordination costs across global portfolios. By using blockchain as our single source of truth, we achieve:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Eye, text: "Real-time portfolio visibility for all investors" },
                  { icon: Zap, text: "Automated distribution of returns (no waiting on fund administrator delays)" },
                  { icon: Lock, text: "Verifiable governance (all votes recorded immutably)" },
                  { icon: DollarSign, text: "Lower operational costs (smart contracts vs. manual processes)" },
                  { icon: Globe, text: "Unified oversight across multiple legal jurisdictions" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-4">
                    <item.icon className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <p className="text-white/80 text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/50 text-sm mt-4 italic text-center">
                Modern technology solving century-old coordination problems in global investing.
              </p>
            </CollapsibleSection>

            {/* ===== HOW CARRIED INTEREST WORKS (collapsible, default closed) ===== */}
            <CollapsibleSection title="How Carried Interest Works" icon={Coins} id="carried-interest">
              <h3 className="text-base font-bold text-white mb-3">Understanding GP vs LP in Our Structure</h3>
              <p className="mb-4">
                <strong className="text-white">Traditional funds:</strong> The General Partner (GP) is a separate entity with full control. Limited Partners (LPs) are passive investors with no operational voice.
              </p>
              <p className="mb-4">
                <strong className="text-white">ReGen Civics Alliance:</strong> The GP is the ReGen Civics governance system on Hypha, a decentralized structure governed by all RCVoice holders. As an investor, you play dual roles:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm"><strong className="text-[#7dd87d]">As LP:</strong> You receive financial returns ($RCivics tokens representing proportional claim on distributions and profits)</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm"><strong className="text-[#7dd87d]">As GP participant:</strong> You hold RCVoice governance tokens, giving you active voice in all fund decisions</p>
                </div>
              </div>
              <p className="mb-4 text-sm">
                The "GP" that receives carried interest isn't a separate controlling entity. It's the collective governance system where Council holds 40% voice, and Land Projects, Alliance Organizations, and Investors each hold 20% voice. You participate in GP decisions and can delegate your voice to trusted Council members if you prefer not to vote on every decision.
              </p>
              <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20 mb-6">
                <p className="text-sm text-white/90">
                  <strong className="text-[#7dd87d]">Key insight:</strong> When we say "GP receives 20% carry," we mean the governance treasury receives it. That treasury is controlled by all RCVoice holders (including you) and is used to fund operations, worker proposals, and ecosystem development as determined by collective governance. You're not paying carry to a distant fund manager; you're contributing to a collectively-governed treasury that supports the ecosystem you're invested in.
                </p>
              </div>

              <h3 className="text-base font-bold text-white mb-3">Carried Interest Structure</h3>
              <p className="mb-4 text-sm">
                The General Partner (governance treasury) receives 20% carried interest on profits above an 8% annualized preferred return to Limited Partners. Carry is calculated and distributed in two scenarios only:
              </p>

              {/* Tier 1 */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <h4 className="font-bold text-[#7dd87d] mb-2 flex items-center gap-2">
                  <CircleDot className="w-4 h-4" /> 1. Quarterly Distributions (Tier 1 Carry)
                </h4>
                <p className="text-sm mb-3">Whenever the fund makes cash distributions to $RCivics token holders from portfolio operations, the distribution follows this waterfall:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">First:</span> <span>Return of Limited Partner capital contributions</span></div>
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">Second:</span> <span>8% preferred return to Limited Partners (cumulative catch-up)</span></div>
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">Third:</span> <span>Remaining proceeds split 80% to Limited Partners, 20% to governance treasury</span></div>
                </div>
                <p className="text-xs text-white/50 mt-3 italic">
                  Example: Portfolio generates $500K in quarterly distribution. After returning capital and meeting 8% preferred return, $100K remains. You receive $80K, governance treasury receives $20K (which you help govern via RCVoice).
                </p>
              </div>

              {/* Tier 2 */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <h4 className="font-bold text-[#7dd87d] mb-2 flex items-center gap-2">
                  <CircleDot className="w-4 h-4" /> 2. Asset Realizations (Tier 2 Carry)
                </h4>
                <p className="text-sm mb-3">When the fund realizes value through asset sales, refinancings, or exits, proceeds follow the same waterfall:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">First:</span> <span>Return of capital allocable to that asset</span></div>
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">Second:</span> <span>8% preferred return (cumulative catch-up)</span></div>
                  <div className="flex items-start gap-2"><span className="text-[#7dd87d] font-bold">Third:</span> <span>Remaining proceeds split 80% to Limited Partners, 20% to governance treasury</span></div>
                </div>
                <p className="text-xs text-white/50 mt-3 italic">
                  Example: Alliance organization invested at $2M exits for $6M in Year 5. After returning $2M capital and calculating preferred return, the $4M gain splits 80/20. You receive $3.2M, governance treasury receives $800K.
                </p>
              </div>

              {/* No Carry on Secondary */}
              <div className="bg-[#7dd87d]/10 rounded-xl p-5 border border-[#7dd87d]/30 mb-4">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#7dd87d]" /> 3. Secondary Market Token Trading (No Carry)
                </h4>
                <p className="text-sm mb-3">
                  <strong className="text-white">Critical:</strong> Gains realized by Limited Partners through the sale of $RCivics tokens on secondary markets (crypto exchanges, peer-to-peer transfers) do <strong className="text-white">not</strong> trigger carried interest.
                </p>
                <p className="text-sm mb-3">When you sell your tokens on Coinbase or other exchanges, you retain 100% of the appreciation. The governance treasury does not receive carry on token trading.</p>
                <div className="bg-white/10 rounded-lg p-3 text-xs">
                  <p className="text-white/70"><strong className="text-white">Example:</strong> You invest $250,000 in Year 1. Year 7: Your $RCivics tokens are worth $500,000 on exchanges. You sell for $500,000. You keep the entire $250,000 gain (no carry to governance treasury).</p>
                </div>
              </div>

              <h4 className="font-bold text-white mb-2 mt-6">On-Chain Transparency</h4>
              <p className="text-sm mb-3">All carry calculations occur on-chain via smart contract. Every distribution event is publicly verifiable on the Base blockchain. No GP discretion in carry computation; the waterfall executes automatically.</p>
              
              <h4 className="font-bold text-white mb-2 mt-4">Why This Structure</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Aligned Incentives: Governance treasury compensated for generating cash and realizing asset value",
                  "No Extraction: Individual investors don't pay carry on token trading gains",
                  "Perpetual Compatible: Doesn't require forced exits",
                  "Collective Benefit: Carry funds the governance treasury which supports operations and ecosystem development",
                  "You Have Voice: Unlike traditional funds, you participate in decisions about how carry funds are deployed",
                  "Transparent: Smart contract enforces waterfall automatically, no hidden fees"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-white/5 rounded-lg p-3">
                    <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span className="text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* ===== FUND STRUCTURE: PERPETUAL ALLIANCE (collapsible, default closed) ===== */}
            <CollapsibleSection title="Fund Structure: Perpetual Alliance" icon={Landmark} id="fund-structure">
              <h3 className="text-base font-bold text-white mb-3">Permanent Capital for Permanent Infrastructure</h3>
              <p className="mb-4">
                ReGen Civics Alliance is building infrastructure to coordinate billions towards systemic regeneration. We hold exceptional regenerative assets indefinitely while providing investor liquidity through progressive mechanisms.
              </p>
              
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-5">
                <h4 className="font-bold text-[#7dd87d] mb-2">Why Perpetual?</h4>
                <p className="text-sm mb-3">Traditional fund structures force premature exits. A 10-year fund must sell at year 10, regardless of market conditions. This forces liquidation of appreciating assets just as regenerative practices mature, misaligned with the multi-generational timeline of ecosystem restoration and incompatible with building permanent civilizational infrastructure.</p>
                <h4 className="font-bold text-[#7dd87d] mb-2">Our Approach</h4>
                <p className="text-sm mb-2">We hold exceptional regenerative assets indefinitely while providing investor liquidity through:</p>
                <div className="space-y-1 text-sm">
                  {[
                    "Crypto exchange listings for $RCivics tokens (target: Year 7)",
                    "Quarterly distributions from portfolio cash flows (beginning Year 3)",
                    "Limited redemption windows (after Year 7, subject to 5% annual cap)",
                    "Token-based flexibility unavailable to traditional funds"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#7dd87d]">&#8226;</span>
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Three-Phase Liquidity Model */}
              <h3 className="text-base font-bold text-white mb-4">Three-Phase Liquidity Model</h3>
              <div className="space-y-4 mb-6">
                {[
                  {
                    phase: "Phase 1: Building",
                    years: "Years 1-3",
                    status: "Capital deployed, ecosystem forming",
                    liquidity: "Extremely limited",
                    distributions: "None (reinvestment phase)",
                    focus: "Deploy capital, build portfolio, establish governance",
                    receive: "Governance participation via RCVoice tokens, quarterly/seasonal portfolio updates, project visit rights"
                  },
                  {
                    phase: "Phase 2: Maturing",
                    years: "Years 3-7",
                    status: "Portfolio generating cash flows, alliance ecosystem operating",
                    liquidity: "Limited redemptions (5% annual cap, pro-rata if oversubscribed)",
                    distributions: "Quarterly/seasonal distributions from portfolio cash flows",
                    focus: "Optimize operations, grow alliance network, prepare token liquidity",
                    receive: "Cash distributions from land projects, success fee distributions as alliance organizations exit/refinance, annual redemption windows (at NAV less 5% discount)"
                  },
                  {
                    phase: "Phase 3: Liquid Ecosystem",
                    years: "Year 7-10 (target)",
                    status: "$RCivics targeting exchange listings (contingent on ecosystem maturity)",
                    liquidity: "Liquidity via exchange listings (target Year 7-10), targeting Coinbase and other top-tier centralized exchanges and decentralized exchanges",
                    distributions: "Ongoing quarterly distributions",
                    focus: "Expand ecosystem, launch derivative instruments, scale impact",
                    receive: "Sell $RCivics tokens on exchanges at market price, ongoing portfolio cash flows, ability to use $RCivics as collateral or stake for yield"
                  }
                ].map((phase, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#7dd87d] font-bold text-sm">{phase.phase}</span>
                      <span className="text-white/60 text-xs">({phase.years})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                      <div><strong className="text-white/60">Status:</strong> <span className="text-white/80">{phase.status}</span></div>
                      <div><strong className="text-white/60">Liquidity:</strong> <span className="text-white/80">{phase.liquidity}</span></div>
                      <div><strong className="text-white/60">Distributions:</strong> <span className="text-white/80">{phase.distributions}</span></div>
                      <div><strong className="text-white/60">Focus:</strong> <span className="text-white/80">{phase.focus}</span></div>
                    </div>
                    <p className="text-xs text-white/50 italic">What investors receive: {phase.receive}</p>
                  </div>
                ))}
              </div>

              {/* Secondary Market Liquidity Strategy */}
              <h3 className="text-base font-bold text-white mb-3">Secondary Market Liquidity Strategy</h3>
              <p className="text-sm mb-3">
                <strong className="text-[#7dd87d]">Target: Year 7-10 Token Listing.</strong> We project sufficient ecosystem maturity to launch $RCivics on public markets between Year 7 and Year 10, contingent on portfolio scale, governance maturity, and regulatory clarity.
              </p>
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <h4 className="font-bold text-white text-sm mb-2">Prerequisites for Liquidity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {[
                    "100+ land projects in portfolio (critical mass)",
                    "50+ alliance organizations operating profitably",
                    "$250M+ in total assets under management (conservative target)",
                    "Proven track record of distributions to token holders",
                    "Transparent on-chain governance established",
                    "Third-party audits and NAV verification",
                    "Regulatory clarity on token structure"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <h4 className="font-bold text-white text-sm mb-2">Exchange Listing Strategy</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { step: "1", label: "Decentralized Exchanges (DEX)", desc: "List on Base-native DEX platforms (Uniswap, Aerodrome)" },
                    { step: "2", label: "Tier-1 Centralized Exchanges", desc: "Pursue listings on Coinbase, Kraken, and other top-tier exchanges" },
                    { step: "3", label: "Liquidity Pools", desc: "Seed initial pools ($RCivics/USDC, $RCivics/ETH)" },
                    { step: "4", label: "Market Making", desc: "Partnership with crypto market makers for depth" },
                    { step: "5", label: "Specialized Platforms", desc: "Explore RWA (real-world asset) focused exchanges" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] text-xs flex items-center justify-center flex-shrink-0">{item.step}</span>
                      <div><strong className="text-white">{item.label}:</strong> <span className="text-white/70">{item.desc}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Path to Scale - Conservative Decade-Long Trajectory */}
              <h3 className="text-base font-bold text-white mb-3 mt-6">A Conservative, Decade-Long Path to Scale</h3>
              <p className="text-sm mb-4">We're building for permanence, not a quick exit. Here's our realistic trajectory over the next decade and beyond:</p>
              <div className="space-y-3 mb-6">
                {[
                  { period: "Years 1-3", title: "Fund I Launch & Deployment", aum: "$25-50M", details: "Close Fund I, deploy capital to 15-25 proven, revenue-generating land projects, invest in 10-15 established alliance organizations, build governance infrastructure and track record." },
                  { period: "Years 4-6", title: "Fund II & First Returns", aum: "$75-125M cumulative", details: "Launch Fund II ($50-75M) as Fund I shows results. First quarterly distributions begin (likely Year 3). Alliance network expands to 30+ organizations. Governance model refined through real experience." },
                  { period: "Years 7-9", title: "Institutional Entry & Fund III", aum: "$150-250M cumulative", details: "Fund III ($75-125M) attracts institutional allocators. Strong distribution history de-risks for larger investors. Portfolio matures to 50-75 land projects. Token listing preparation begins." },
                  { period: "Year 10+", title: "Liquid Ecosystem & Perpetual Growth", aum: "$250M+ cumulative", details: "$RCivics token listing targets Year 7-10 (contingent on ecosystem maturity). Ecosystem network effects fully operational. Fund continues indefinitely as perpetual vehicle." }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#7dd87d] font-bold text-sm">{item.period}: {item.title}</span>
                      <span className="text-white/60 text-xs">{item.aum}</span>
                    </div>
                    <p className="text-xs text-white/70">{item.details}</p>
                  </div>
                ))}
              </div>

              {/* Why $RCivics Is Valuable */}
              <h3 className="text-base font-bold text-white mb-3">Why $RCivics Is Valuable</h3>
              <p className="text-sm mb-3">$RCivics has four sources of value that create demand on secondary markets:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { icon: DollarSign, title: "Cash Flow Rights", desc: "Proportional claim on portfolio distributions (quarterly) and success fees (on exits/refinances)" },
                  { icon: TreePine, title: "Ecosystem Backing", desc: "Every token backed by regenerating land + growing alliance network. As ecosystems mature, backing increases." },
                  { icon: Network, title: "Network Utility", desc: "$RCivics becomes interchange token for regenerative economy. Alliance organizations accept it for services." },
                  { icon: Sparkles, title: "Future Instrument Access", desc: "Foundation for rSeeds stablecoins, ReGen Game tokens, lending collateral, derivatives, and other financial innovations." }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="w-4 h-4 text-[#7dd87d]" />
                      <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    </div>
                    <p className="text-xs text-white/70">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Multi-Jurisdiction Legal Structure */}
              <h3 className="text-base font-bold text-white mb-3">Multi-Jurisdiction Legal Structure</h3>
              <p className="text-sm mb-3">
                ReGen Civics Alliance operates with legal presence across multiple global jurisdictions. Each major investment is structured through a Special Purpose Vehicle (SPV) in its local jurisdiction, optimizing for tax efficiency, regulatory compliance, and asset protection.
              </p>
              <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20 mb-4">
                <h4 className="font-bold text-white text-sm mb-2">Our Innovation: Attaching Legal Entities to Digital Governance</h4>
                <p className="text-xs text-white/80 mb-2">Each SPV is governed by the ReGen Civics Alliance using Hypha technology operating on Base (Coinbase's blockchain) as the official source of truth:</p>
                <div className="space-y-1 text-xs">
                  {[
                    "Single governance layer controls all SPVs across all jurisdictions",
                    "Transparent on-chain voting and decision-making",
                    "Immutable record of all governance actions",
                    "Real-time coordination across global portfolio",
                    "Reduced administrative overhead compared to traditional multi-entity structures"
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/50 italic mb-4">
                Example: A land project in Costa Rica has a Costa Rican SPV. A project in Portugal has a Portuguese SPV. Both are governed by the same on-chain ReGen Civics Alliance governance framework, creating unified oversight with local legal compliance.
              </p>

              {/* Comparison Table */}
              <h3 className="text-base font-bold text-white mb-3 mt-6">Comparison to Traditional Structures</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Feature</th>
                      <th className="text-left py-2 px-3 text-white/60">Traditional REIT</th>
                      <th className="text-left py-2 px-3 text-white/60">10-Year VC Fund</th>
                      <th className="text-left py-2 px-3 text-white/60">Crypto Index</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">$RCivics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Backing", "Single asset class", "Startups only", "Digital assets", "Land + Ecosystem"],
                      ["Returns", "8-12%", "20%+ (or zero)", "Volatile", "12-18% + token appreciation"],
                      ["Liquidity", "Daily (public) / None (private)", "10-year lock", "Instant", "Year 7-10 exchange listings (target)"],
                      ["Governance", "None", "Limited LP voice", "Token voting", "On-chain via RCVoice"],
                      ["Distributions", "Quarterly", "On exit only", "Staking yield", "Quarterly + success fees"],
                      ["Impact", "Limited", "Variable", "None", "Verified regeneration"],
                      ["Utility", "None", "None", "Speculative", "Network interchange token"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 font-semibold text-white/80">{row[0]}</td>
                        <td className="py-2 px-3 text-white/50">{row[1]}</td>
                        <td className="py-2 px-3 text-white/50">{row[2]}</td>
                        <td className="py-2 px-3 text-white/50">{row[3]}</td>
                        <td className="py-2 px-3 text-[#7dd87d] font-semibold">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <GlowDivider />


            {/* ===== SECTION 1: THE OPPORTUNITY (collapsible, default open) ===== */}
            <CollapsibleSection title="The Opportunity" icon={Sparkles} defaultOpen={true} id="opportunity">
              <p className="mb-5">
                ReGen Civics Alliance represents a pioneering investment vehicle that combines the best of traditional real estate investment trusts (REITs), venture capital funds, and blockchain technology to create a purpose-built structure for financing the regenerative economy. We are building infrastructure to coordinate billions towards systemic regeneration. Our mission is to provide capital partners with a permanent vehicle to support land-backed systemic change while generating reliable returns through a tokenized structure that enables progressive liquidity without forced liquidations.
              </p>
              <p className="mb-5">
                The fund operates at the intersection of multiple converging mega-trends reshaping how humanity lives on Earth. Beyond regenerative agriculture, we're backing the fundamental transformation of real estate, community development, housing, infrastructure, energy, education, and sustainable living. We invest in both the <strong className="text-white">land projects</strong> (startup villages, towns, and micro-cities) and the <strong className="text-white">alliance organizations</strong> that support them (those rethinking housing, infrastructure, energy, waste management, governance, and other core services needed for a village or town to thrive regeneratively), creating a synergistic ecosystem with the intention of becoming an <strong className="text-[#7dd87d]">index fund for the transition to regenerative civilizations</strong>.
              </p>
              <p className="mb-5">
                The regenerative agriculture market itself is projected to grow from $9.2 billion in 2025 to $18.3 billion by 2031, a 14.5% CAGR (Mordor Intelligence, 2026). Yet the estimated annual financing gap remains between $200-450 billion. Less than 5% of the capital needed is currently deployed.
              </p>

              {/* Network Effect */}
              <div className="my-6">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/opp-network-effect_bd42f6b7.jpg"
                  alt="Network effect: capital circulating within the regenerative ecosystem"
                  className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
                  width="1200"
                  height="800"
                  loading="lazy"
                />
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">The Network Effect in Action</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="bg-white/5 rounded-xl p-4 border border-red-500/20">
                  <h4 className="font-bold text-red-400 text-sm mb-2">Traditional Model</h4>
                  <p className="text-xs text-white/60">Land Project &#8594; Hires External Consultants &#8594; Money Leaves Ecosystem &#8594; No Shared Value</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-[#7dd87d]/20">
                  <h4 className="font-bold text-[#7dd87d] text-sm mb-2">ReGen Civics Model</h4>
                  <p className="text-xs text-white/60">Land Project &#8594; Hires Alliance Organization &#8594; Money Stays in Network &#8594; Both Profit &#8594; Both Hold $RCivics &#8594; Value Accrues to All Token Holders</p>
                </div>
              </div>
              <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20 mb-6 text-sm">
                <p className="text-white/80">
                  <strong className="text-[#7dd87d]">Example:</strong> A Costa Rican village needs solar installation. Instead of hiring a conventional solar company, they engage an alliance organization (who also holds $RCivics). The land project gets specialized service from regenerative experts, the solar company grows its revenue, and every $RCivics holder benefits from both successes through distributions and token value appreciation. Capital circulates within the ecosystem rather than leaking out to conventional providers.
                </p>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">The Emerging Multi-Trillion Dollar Opportunity</h3>
              <p className="mb-4 text-sm">
                We are witnessing the emergence of a new asset class at the convergence of several massive markets. While traditional metrics focus on the <strong className="text-white">$310 billion regenerative landscapes opportunity</strong> (BCG 2025), the true scope is far larger:
              </p>
              <div className="mb-5">
                <MarketBars />
                <p className="text-[10px] text-white/30 mt-2">Sources: Forbes/Analysts 2025, Global Wellness Institute, Precedence Research, Global Sustainable Investment Review</p>
              </div>
              <p className="mb-5 text-sm">
                The market for regenerative communities, eco-villages, and sustainable land development sits at the intersection of all these trends. ReGen Civics is positioned at the frontier of this emerging market, providing the infrastructure, governance tools, and capital pathways that regenerative land projects need to succeed. BCG research confirms that commercial investors can expect <strong className="text-white">15-30% IRR</strong> in regenerative landscapes.
              </p>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">A $4.5 Trillion Financing Gap</h3>
              <p className="mb-4 text-sm">
                Global agrifood systems require <strong className="text-white">$1.1 trillion in annual investment</strong> over the next five years (Bain & Company, 2025). Closing the current financing gap in regenerative agriculture alone would open <strong className="text-white">$4.5 trillion in new investment opportunities per year</strong> and avoid $5.7 trillion in costs from environmental degradation (AgFunder News, 2024).
              </p>
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-5">
                <h4 className="font-bold text-white mb-3">Why This Gap Exists</h4>
                <div className="space-y-3 text-sm">
                  {[
                    { title: "High failure rates.", desc: "Regenerative land projects face 80% failure rates (slightly less than typical startup rates) when attempting to launch without adequate support systems, making individual investments unattractive to institutional capital." },
                    { title: "Due diligence burden.", desc: "Most investors lack the time, expertise, or desire to evaluate small-scale land projects individually. The cost of diligence often exceeds the investment size." },
                    { title: "No ecosystem support.", desc: "Projects fail because they operate in isolation without shared infrastructure, governance frameworks, or collective resilience mechanisms." },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <p><strong className="text-white">{item.title}</strong> {item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">The ReGen Civics Solution</h3>
              <p className="mb-4 text-sm">
                ReGen Civics Alliance inverts the failure rate by providing an ecosystem of support: shared governance, collective resources, quality control standards, and a diversified portfolio approach.
              </p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Challenge</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">ReGen Civics Solution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["High individual project failure rates", "Portfolio diversification + alliance support network"],
                      ["Due diligence costs exceed investment size", "Shared evaluation standards + council expertise"],
                      ["Projects operate in isolation", "Integrated alliance network providing infrastructure"],
                      ["No exit liquidity for investors", "Token-based secondary markets + ongoing distributions"],
                      ["Difficult to measure impact", "On-chain verification + third-party auditing"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white/60">{row[0]}</td>
                        <td className="py-2 px-3 text-white/80">{row[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* ===== WHY NOW? ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10 bg-gradient-to-br from-amber-900/20 to-transparent rounded-2xl p-6 md:p-8 border border-[#ffd700]/20">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-[#ffd700]" />
                  <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    Why Now? The Window of Opportunity
                  </h2>
                </div>
                <p className="text-white/80 text-sm mb-5">Several converging factors make the next 12-18 months critical:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  {[
                    { title: "Land Market Dynamics", items: ["Prime regenerative land still available at reasonable valuations", "Target regions seeing 15-25% annual appreciation", "Quality projects seeking capital partners before institutional competition intensifies"] },
                    { title: "Regulatory Arbitrage", items: ["On-chain governance frameworks still experimental and flexible", "Opportunity to pioneer before regulatory frameworks crystallize", "First-mover advantage in coordinating regenerative infrastructure"] },
                    { title: "Ecosystem Maturation", items: ["40+ alliance organizations ready for coordination infrastructure", "50+ pipeline projects seeking support to scale proven models", "rSeeds foundation built on 10 years of SEEDS experimentation with 10,000+ participants"] },
                    { title: "Competitive Landscape", items: ["BlackRock launched natural capital fund", "Brookfield raised $15B for transition investing", "Window for pioneering coordination infrastructure narrows"] },
                  ].map((section, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="font-bold text-[#ffd700] text-sm mb-2">{section.title}</h4>
                      <div className="space-y-1">
                        {section.items.map((item, j) => (
                          <p key={j} className="text-xs text-white/60 flex items-start gap-2">
                            <span className="text-[#ffd700] mt-0.5">&#8226;</span>
                            <span>{item}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#ffd700]/10 rounded-xl p-4 border border-[#ffd700]/20">
                  <h4 className="font-bold text-[#ffd700] text-sm mb-2">Early Investor Advantages</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                    {[
                      "Lower entry valuation (1 CHF = 1 $RCivics in early years)",
                      "Priority allocation in subsequent fund vintages",
                      "Governance voice while structure is forming",
                      "Access to best land projects before institutional competition",
                      "Shape the coordination infrastructure while initial conditions are being set"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <CheckCircle2 className="w-3 h-3 text-[#ffd700] mt-0.5 flex-shrink-0" />
                        <span className="text-white/70">{item}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/50 mt-3 italic text-center">
                    Early investors gain returns AND control of coordination infrastructure before it becomes obvious.
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== SECTION 2: INVESTMENT THESIS (collapsible, default open) ===== */}
            <CollapsibleSection title="Investment Thesis" icon={Target} id="investment-thesis">
              {/* Three-Tier Strategy Image */}
              <div className="mb-6">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/opp-three-tier-strategy_c9173437.jpg"
                  alt="Three-tier portfolio strategy: Land Projects 60%, Alliance Organizations 30%, Innovation Fund 10%"
                  className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
                  width="1200"
                  height="800"
                  loading="lazy"
                />
                <p className="text-xs text-white/60 mt-2 text-center">Three-tier portfolio strategy balancing stability, growth, and innovation</p>
              </div>

              {/* Animated allocation donut chart */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 bg-white/5 rounded-xl p-5 border border-white/10">
                <PieChart width={200} height={200}>
                  <Pie data={allocationData} cx={100} cy={100} innerRadius={60} outerRadius={90} dataKey="value" isAnimationActive>
                    {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
                <div className="space-y-2 flex-1">
                  {allocationData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-white/70">{d.name}</span>
                      <span className="ml-auto font-bold" style={{ color: d.color }}>{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Three-Tier Portfolio Strategy</h3>

              {/* Tier 1: Land Projects */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-5 h-5 text-[#7dd87d]" />
                  <h4 className="font-bold text-white">Tier 1: Land Projects (60% allocation)</h4>
                </div>
                <p className="text-sm mb-3 text-[#7dd87d] font-semibold">Fund I Focus: Proven, Revenue-Generating Projects</p>
                <p className="text-sm mb-3">
                  For Fund I and potentially Fund II, we invest minority stakes (typically 10-40%) in existing, operating regenerative land projects with demonstrated revenue and viable models. We won't be building from scratch or investing in startups or ideas; we're partnering with projects that need capital to expand or replicate their proven approaches.
                </p>
                <p className="text-sm mb-2"><strong className="text-white">What They Are:</strong> Established startup villages, regenerative communities, eco-developments, retreat centers, and educational campuses already generating revenue and seeking growth capital.</p>
                
                <p className="text-sm mb-2 mt-3"><strong className="text-white">Revenue Streams (already operational):</strong></p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs mb-3">
                  {["Housing (memberships, leases, sales)", "Agriculture (farming, food forests)", "Education (workshops, courses)", "Retreats (eco-tourism, wellness)", "Ecological credits (emerging upside)"].map((item, i) => (
                    <div key={i} className="flex items-start gap-1 bg-white/5 rounded-lg p-2">
                      <Leaf className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Sample Investment Profile */}
                <div className="bg-[#7dd87d]/10 rounded-lg p-4 border border-[#7dd87d]/20 mt-4">
                  <h5 className="font-bold text-[#7dd87d] text-sm mb-2">Sample Investment Profile (Illustrative)</h5>
                  <p className="text-xs text-white/60 mb-2">Established regenerative village in Costa Rica (fictional example for illustration)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><strong className="text-white/80">Operating:</strong> <span className="text-white/60">4 years</span></div>
                    <div><strong className="text-white/80">Members:</strong> <span className="text-white/60">25 residents, 50 acres</span></div>
                    <div><strong className="text-white/80">Revenue:</strong> <span className="text-white/60">$450K/year</span></div>
                    <div><strong className="text-white/80">Investment:</strong> <span className="text-white/60">$1.2M for 30% stake</span></div>
                  </div>
                  <div className="border-t border-[#7dd87d]/20 pt-2 text-xs">
                    <p className="text-white/60 mb-1"><strong className="text-white/80">Year 3 Pro Forma:</strong> $1.11M revenue, $560K NOI, 14% cash yield on investment</p>
                    <p className="text-white/60"><strong className="text-white/80">Year 5 Exit:</strong> Project valued at $9M (2.25x growth), Total Return $3.12M, <strong className="text-[#7dd87d]">21% IRR</strong></p>
                  </div>
                  <p className="text-[10px] text-white/60 mt-2 italic">This is an illustrative example. Actual projects vary. Blended portfolio targets 12-18% net IRR across all land investments.</p>
                </div>

                <p className="text-xs text-white/50 mt-3">
                  <strong className="text-white/70">Fund III+ Evolution:</strong> Once we've partnered with the highest-quality existing projects, later funds may shift toward acquiring 100% ownership of greenfield developments, purchasing land and building new regenerative communities from inception.
                </p>
              </div>

              {/* Tier 2: Alliance Organizations */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-5 h-5 text-[#7dd87d]" />
                  <h4 className="font-bold text-white">Tier 2: Alliance Organizations (30% allocation)</h4>
                </div>
                <p className="text-sm mb-3">Organizations building the infrastructure regenerative communities need, operating companies with revenue, customers, and growth trajectories.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs mb-3">
                  {["Housing innovation", "Energy systems", "Governance tools", "Waste to Resource", "Education platforms", "Legal/Financial", "Technology"].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 text-center text-white/60">{item}</div>
                  ))}
                </div>
                <div className="bg-[#7dd87d]/10 rounded-lg p-3 border border-[#7dd87d]/20 text-xs mb-2">
                  <p className="text-white/80"><strong className="text-[#7dd87d]">Network Circulation Effect:</strong> Land projects preferentially hire alliance organizations for services. Capital flows within the ecosystem. As land projects grow, alliance organizations grow. Both hold $RCivics, creating aligned incentives across the entire network.</p>
                </div>
                <p className="text-xs text-white/50"><strong className="text-white/70">Target Returns:</strong> 15-25% from revenue growth + equity appreciation</p>
              </div>

              {/* Tier 3: Innovation Fund */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                  <h4 className="font-bold text-white">Tier 3: Innovation Fund (10% allocation)</h4>
                </div>
                <p className="text-sm mb-2">Strategic VC investments in companies accelerating the regenerative transition.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs mb-2">
                  {["AgTech", "Climate tech", "PropTech", "FinTech", "GovTech"].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 text-center text-white/60">{item}</div>
                  ))}
                </div>
                <p className="text-xs text-white/50"><strong className="text-white/70">Stage Focus:</strong> Series A-B (proven revenue, scaling phase). <strong className="text-white/70">Target Returns:</strong> 20-30% from successful exits.</p>
              </div>
            </CollapsibleSection>

            {/* ===== WHAT COULD GO WRONG? (collapsible, default closed) ===== */}
            <CollapsibleSection title="What Could Go Wrong? (And Why We're Still Confident)" icon={Shield} id="risk-factors">
              <p className="mb-5 text-sm">
                Sophisticated investors rightfully question any opportunity promising 12-18% returns, impact, liquidity, and land backing. Let's address the risks directly:
              </p>
              {[
                { q: "If land projects fail to generate revenue:", a: "We invest in already-operating, revenue-generating projects for Fund I. These aren't speculative startups; they're proven models seeking expansion capital. Historical data shows diversified land portfolios have <5% total loss rates compared to ~80% failure rates for individual projects launching from scratch. Our alliance support structure and quality control standards further reduce risk. Even if 20% of projects underperform, the portfolio structure absorbs this." },
                { q: "If alliance organizations don't adopt $RCivics:", a: "We're starting with committed partners (40+ already in the ecosystem). Network effects create strong incentives: once critical mass is reached, being outside the alliance means missing access to land project customers, coordination infrastructure, and shared resources. Even without full adoption, land asset backing provides downside protection. The token is a coordination tool, not the entire investment thesis." },
                { q: "If crypto markets experience severe downturn:", a: "Our returns derive from tangible land and operating communities generating actual revenue, not token speculation. Token price may fluctuate, but underlying asset value and cash distributions continue independently. We're using crypto rails for coordination efficiency, not betting on crypto market sentiment. If blockchain technology disappeared tomorrow, our land projects would still exist, still generate revenue, and still distribute returns." },
                { q: "If regulations restrict on-chain governance:", a: "We maintain traditional legal structures (LPs, SPVs) with on-chain governance as a coordination layer. If forced to abandon blockchain tools, we can operate through conventional fund administration (just less efficiently and transparently). Legal compliance is primary, technology is secondary." },
                { q: "If we can't reach $400M AUM by Year 7:", a: "The path to $400M is sequential fundraising across multiple vintage years, not one giant fund. Token listing prerequisites are flexible; we can list with $200M AUM if ecosystem maturity supports it. The perpetual structure means no forced timeline; we build at the pace the market supports." },
                { q: "If token liquidity markets don't develop:", a: "We have multiple liquidity pathways: exchange listings (primary plan), annual tender offers (fund buys back at NAV), increased redemption caps, or strategic buyer for entire fund. Token markets are the preferred mechanism but not the only mechanism. Investors should assume limited liquidity and invest with long-term horizon regardless." },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 mb-3">
                  <h4 className="font-bold text-amber-400 text-sm mb-2">{item.q}</h4>
                  <p className="text-xs text-white/70 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </CollapsibleSection>

            {/* ===== SECTION 3: IMPACT FRAMEWORK (collapsible, default open) ===== */}
            <CollapsibleSection title="Impact Framework" icon={Heart} id="impact">
              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Measurable Regeneration</h3>
              <p className="mb-4 text-sm">
                Our impact isn't aspirational; it's measurable, verified, and core to our investment thesis. Healthier land and communities create more valuable assets.
              </p>
              <div className="bg-[#7dd87d]/10 rounded-xl p-5 border border-[#7dd87d]/20 mb-5">
                <h4 className="font-bold text-white mb-2">Core Philosophy</h4>
                <p className="text-sm text-white/80">
                  Rather than chasing trends in ecological credit markets (carbon, biodiversity, water), we focus on fundamentals: creating exceptional quality of life for people who live at our land projects. By building communities based on the healthiest land producing the healthiest food, raising the healthiest humans, we know demand and value will grow organically. Ecological credits provide upside as markets mature, but aren't required for our base case returns.
                </p>
              </div>

              <h4 className="font-bold text-white mb-3">Target Impact Metrics (per $50M deployed in Fund I)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {[
                  { value: "3,000+", label: "Acres Transitioned", desc: "to regenerative management" },
                  { value: "30,000+", label: "Tons CO2", desc: "sequestered over 10 years" },
                  { value: "75+", label: "Rural Jobs", desc: "created at living wages" },
                  { value: "1.5B+", label: "Gallons Water", desc: "conserved annually" },
                  { value: "20+", label: "Communities", desc: "supported with alliance infrastructure" },
                  { value: "500+", label: "Families", desc: "accessing regenerative living" },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                    <p className="text-lg font-bold text-[#7dd87d]" style={{ fontFamily: 'var(--font-display)' }}>{item.value}</p>
                    <p className="text-xs font-semibold text-white/80">{item.label}</p>
                    <p className="text-[10px] text-white/60">{item.desc}</p>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-white mb-2">Measurement & Verification</h4>
              <div className="space-y-1 text-xs mb-4">
                {[
                  "Impact measured using established frameworks (HEIST, IRIS+, GRI, or equivalent)",
                  "Third-party annual verification by independent auditors",
                  "Seasonal impact reports alongside financial statements",
                  "On-chain recording of verified metrics (transparent, immutable)",
                  "Community-reported data validated by alliance organizations"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span className="text-white/70">{item}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-2">Theory of Change</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  {["Capital Deployed", "Regenerative Practices Scaled", "Environmental Outcomes + Financial Returns", "More Capital Available", "Ecosystem Grows", "Network Effects Amplify", "Regenerative Economy Strengthens"].map((step, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className="bg-[#7dd87d]/20 text-[#7dd87d] px-2 py-1 rounded-full text-[10px] font-semibold">{step}</span>
                      {i < 6 && <ArrowRight className="w-3 h-3 text-[#7dd87d]/40" />}
                    </span>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            {/* ===== SECTION 4: STRATEGY DEEP DIVE (collapsible) ===== */}
            <CollapsibleSection title="Investment Strategy Deep Dive" icon={Layers} id="strategy">
              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Portfolio Construction</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {[
                  { title: "Geographic", desc: "Global presence across multiple continents and climate zones" },
                  { title: "Project Stage", desc: "Majority in operating/expansion phase (Fund I-II), some greenfield (Fund III+)" },
                  { title: "Revenue Mix", desc: "Housing, agriculture, education, retreats balanced across portfolio" },
                  { title: "Project Size", desc: "Range from 5-acre intensive sites to 5000+ acre regenerative farms" },
                  { title: "Community Type", desc: "Villages, retreat centers, education campuses, co-living developments" },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10 text-xs">
                    <strong className="text-[#7dd87d]">{item.title}:</strong> <span className="text-white/70">{item.desc}</span>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-white mb-2">Quality Control Standards</h4>
              <p className="text-sm mb-2">All land projects must demonstrate:</p>
              <div className="space-y-1 text-xs mb-5">
                {[
                  "Minimum 2 years successful operation (for Fund I-II)",
                  "Clear governance structure and community agreements",
                  "Viable financial model with diversified revenue",
                  "Commitment to regenerative practices (verified by alliance partners)",
                  "Alignment with alliance values and coordination frameworks"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span className="text-white/70">{item}</span>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-white mb-2">Deal Sourcing & Due Diligence</h4>
              <p className="text-sm mb-3">
                Our network of 40+ alliance organizations and 50+ pipeline projects creates access institutional investors can't replicate. We have been operating in this space and building relationships since 2011.
              </p>
              <div className="space-y-2 mb-5">
                {[
                  { step: "1", title: "Initial Screening", desc: "Alliance compatibility, operational status, financial viability" },
                  { step: "2", title: "On-Site Visit", desc: "Team assessment, community health, land quality verification" },
                  { step: "3", title: "Financial Analysis", desc: "Revenue models, expense structure, growth projections" },
                  { step: "4", title: "Impact Verification", desc: "Regenerative practices validation by alliance partners" },
                  { step: "5", title: "Council Review", desc: "Domain experts evaluate fit and opportunity" },
                  { step: "6", title: "Governance Vote", desc: "On-chain approval by RCVoice holders (90% unity threshold)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-6 h-6 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] flex items-center justify-center flex-shrink-0 text-xs font-bold">{item.step}</span>
                    <div><strong className="text-white">{item.title}:</strong> <span className="text-white/70">{item.desc}</span></div>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-white mb-2">Earmarking Option</h4>
              <p className="text-sm mb-2">
                Investors can direct up to 90% of capital toward specific land projects (10% remains in diversified fund). If earmarked project passes diligence and council vote, those funds deploy to that project.
              </p>
              <p className="text-xs text-white/50 mb-4">
                <strong className="text-white/70">Due Diligence Fee:</strong> If earmarked project doesn't pass, we return the majority of funds. We retain 3% or $20,000 (whichever is less) to cover evaluation costs.
              </p>
            </CollapsibleSection>

            {/* ===== SECTION 5: RISK FACTORS (collapsible) ===== */}
            <CollapsibleSection title="Risk Factors & Mitigation" icon={AlertTriangle} id="risk-factors">
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Risk Category</th>
                      <th className="text-left py-2 px-3 text-white/60">Description</th>
                      <th className="text-left py-2 px-3 text-white/60">Mitigation Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Market Risk", "Land value decline", "Diversified portfolio across global jurisdictions; land-backed collateral"],
                      ["Operational Risk", "Project failure", "Alliance support network; quality control standards; invest in proven models"],
                      ["Regulatory Risk", "Changing land use laws or crypto regulations", "Multi-jurisdictional diversification; traditional legal structures primary; local counsel"],
                      ["Liquidity Risk", "Capital lock-up", "$RCivics token secondary markets; multiple liquidity pathways; long-term investor mindset"],
                      ["Governance Risk", "Decision-making delays", "90% unity requirement ensures broad conviction; on-chain transparency"],
                      ["Ecological Credit Risk", "Carbon/biodiversity market volatility", "Conservative underwriting; credits treated as upside, not core returns"],
                      ["Technology Risk", "Blockchain infrastructure failure", "Traditional fund administration as backup; legal structures independent of technology"],
                      ["Currency Risk", "Multi-jurisdiction exposure", "Natural hedging across global portfolio; SPV structures optimize local currency exposure"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 font-semibold text-white/80">{row[0]}</td>
                        <td className="py-2 px-3 text-white/50">{row[1]}</td>
                        <td className="py-2 px-3 text-white/60">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-white/60 italic">
                This is not a complete list of risks. Investors should review the confidential private placement memorandum for a full discussion of risk factors before making any investment decision.
              </p>
              <div className="mt-4">
                <Link href="/risk-disclosure" className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#ffd700] transition-colors text-sm">
                  <Shield className="w-4 h-4" />
                  <span>View Full Risk Disclosure Statement</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Regeneration is our foundation */}
              <div className="mt-6 bg-[#0d2818]/70 border border-[#7dd87d]/30 rounded-2xl p-5 md:p-6">
                <h4 className="text-base md:text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Regeneration is our foundation
                </h4>
                <p className="text-white/85 text-sm md:text-base leading-relaxed">
                  Every month we hold a project, we are doing the work. Planting fruiting trees,
                  healing soil, building infrastructure, making the land more abundant and more
                  valuable. So if any individual project fails to deliver its planned returns,
                  we can sell the land. Because of the regenerative work we have done, the land
                  is presumably worth more than when we acquired it. That sale becomes a return
                  for investors. Successful projects create ongoing yield. Failed projects, in
                  our model, can also become a source of returns. The land itself is the floor.
                </p>
              </div>
            </CollapsibleSection>


            {/* ===== SECTION 6: TEAM & OPERATING MODEL (collapsible) ===== */}
            <CollapsibleSection title="Team & Operating Model" icon={Users} id="team">
              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Leadership</h3>
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-5">
                <h4 className="font-bold text-white mb-1">Rieki Cordon, Catalyst</h4>
                <p className="text-sm mb-3">
                  Co-founder of SEEDS and Hypha, with a decade of experience building regenerative economic systems, decentralized governance frameworks, and impact-focused financial infrastructure. Led the design of novel financial tools serving 10,000+ people across regenerative communities worldwide spanning 40+ countries over a 7-year exploration in decentralized governance.
                </p>
                <p className="text-sm mb-2">Background in systems design, regenerative economics, and community governance. Track record of building and scaling decentralized organizations.</p>
                <p className="text-xs text-white/50 italic">
                  Role: Setting up the initial conditions of the coordination infrastructure. Explore the <Link href="/governance" className="text-[#7dd87d] hover:underline">governance page</Link> to learn how the Fund is actually governed.
                </p>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Operating Model</h3>
              <p className="text-sm mb-3">Rather than building large overhead at launch, the fund works with specialized partners to maintain capital efficiency while accessing institutional-quality expertise.</p>
              <div className="overflow-x-auto mb-5">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Function</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Partner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Governance Platform", "Base (Coinbase blockchain) + Hypha"],
                      ["Legal Counsel", "Specializing in crypto and real world asset investments (to be announced)"],
                      ["Community & Land Management", "Regional operators and community stewards"],
                      ["Impact Verification", "Third-party ESG measurement (to be selected at first close)"],
                      ["Fund Administration", "Institutional-grade administrator (to be selected)"],
                      ["Alliance Network", "40+ organizations providing infrastructure and services"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white/80 font-medium">{row[0]}</td>
                        <td className="py-2 px-3 text-white/60">{row[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Governance: Your Dual Role as LP and GP Participant</h3>
              <p className="text-sm mb-3 font-semibold text-white">You're not just a passive investor.</p>
              <p className="text-sm mb-4">ReGen Civics uses two distinct but complementary governance systems that give you both financial returns AND operational voice:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-bold text-[#7dd87d] text-sm mb-2">As Limited Partner (LP):</h4>
                  <div className="space-y-1 text-xs text-white/70">
                    <p>You receive <strong className="text-white">$RCivics tokens</strong> representing your proportional claim on distributions and profits</p>
                    <p>You benefit from quarterly cash flows and asset appreciation</p>
                    <p>You can exit via token markets (Year 7+) or limited redemptions</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-bold text-[#7dd87d] text-sm mb-2">As GP Participant:</h4>
                  <div className="space-y-1 text-xs text-white/70">
                    <p>You receive <strong className="text-white">RCVoice governance tokens</strong> giving you active voice in fund decisions</p>
                    <p>You vote on: project approvals, asset sales, alliance partnerships, strategic direction</p>
                    <p>You can delegate your voice to trusted Council members if you prefer</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
                <h4 className="font-bold text-white text-sm mb-3">Who is the "GP"?</h4>
                <p className="text-sm mb-3">The General Partner is not a single controlling entity. It's the collective governance system where:</p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <PieChart width={160} height={160}>
                    <Pie
                      data={[
                        { name: 'Council of Domain Experts', value: 40, color: '#4ade80' },
                        { name: 'Land Projects', value: 20, color: '#86efac' },
                        { name: 'Alliance Organizations', value: 20, color: '#bbf7d0' },
                        { name: 'Investors (YOU)', value: 20, color: '#ffd700' },
                      ]}
                      cx={80} cy={80} innerRadius={45} outerRadius={75} dataKey="value" isAnimationActive
                    >
                      {[
                        { name: 'Council of Domain Experts', value: 40, color: '#4ade80' },
                        { name: 'Land Projects', value: 20, color: '#86efac' },
                        { name: 'Alliance Organizations', value: 20, color: '#bbf7d0' },
                        { name: 'Investors (YOU)', value: 20, color: '#ffd700' },
                      ].map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                  <div className="space-y-1.5 flex-1 text-xs">
                    {[
                      { pct: '40%', label: 'Council of Domain Experts', color: '#4ade80' },
                      { pct: '20%', label: 'Land Projects', color: '#86efac' },
                      { pct: '20%', label: 'Alliance Organizations', color: '#bbf7d0' },
                      { pct: '20%', label: 'Investors (YOU)', color: '#ffd700' },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ color: d.color }} className="font-bold">{d.pct}</span>
                        <span className="text-white/70">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/20 mb-4">
                <h4 className="font-bold text-white text-sm mb-2">What happens to "GP" carry?</h4>
                <p className="text-sm text-white/80 mb-2">When the governance treasury receives 20% carried interest, those funds support:</p>
                <div className="space-y-1 text-xs text-white/70">
                  {["Operational expenses (legal, administration, infrastructure)", "Worker proposals approved by RCVoice holders", "Ecosystem development initiatives", "Reserve for future opportunities"].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-400 font-semibold mt-2">YOU vote on how carry funds are deployed through governance proposals.</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="font-bold text-white text-sm mb-2">Time Commitment</h4>
                <p className="text-sm text-white/70">To fully participate in your GP role it would require a few hours during the 4 week discussion to provide input. Then a few hours a day during the 1 week festival event that happens every season. Seasons are 2-3 times a year. You can delegate this responsibility if you choose.</p>
              </div>
            </CollapsibleSection>


            {/* ===== SECTION 7: COMPETITIVE POSITIONING (collapsible) ===== */}
            <CollapsibleSection title="Competitive Positioning" icon={Scale} id="competitive">
              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Comparison to Traditional Impact Funds</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Feature</th>
                      <th className="text-left py-2 px-3 text-white/60">Traditional Impact Fund</th>
                      <th className="text-left py-2 px-3 text-white/60">Typical Land Fund</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">ReGen Civics Alliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Asset Focus", "Public equities or bonds", "Farmland only", "Land + Infrastructure Ecosystem"],
                      ["Impact Verification", "Self-reported ESG scores", "Organic certification", "On-chain + third-party verified"],
                      ["Investor Transparency", "Quarterly PDF reports", "Annual statements", "Real-time on-chain dashboard"],
                      ["Governance Rights", "None", "Limited LP advisory", "Active on-chain voting"],
                      ["Distribution Speed", "60-90 days post-quarter", "Manual processing", "Automated smart contract"],
                      ["Geographic Scope", "Global public markets", "Single country/region", "Multi-jurisdictional coordination"],
                      ["Liquidity", "Daily (if mutual fund)", "10-year lock", "Token markets (Year 7+)"],
                      ["Fee Structure", "1-2% + 10-20% carry", "1-2% + 20% carry", "1.5% + 20% carry (transparent on-chain)"],
                      ["Ecosystem Play", "Portfolio of separate investments", "Land holdings only", "Network effects between projects"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white/80 font-medium">{row[0]}</td>
                        <td className="py-2 px-3 text-white/50">{row[1]}</td>
                        <td className="py-2 px-3 text-white/50">{row[2]}</td>
                        <td className="py-2 px-3 text-[#7dd87d] font-semibold">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Comparison to REITs and VC Funds</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Feature</th>
                      <th className="text-left py-2 px-3 text-white/60">Farmland REIT</th>
                      <th className="text-left py-2 px-3 text-white/60">Impact VC Fund</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">ReGen Civics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Target IRR", "8-12%", "20-30%", "12-18%"],
                      ["Current Yield", "4-6%", "0%", "6-8%"],
                      ["Liquidity", "Quarterly", "7-10 yr lock", "Token secondary market (Year 7-10 target)"],
                      ["Downside Protection", "High", "Low", "Medium-High"],
                      ["Impact Measurement", "Limited", "Variable", "Third-party verified"],
                      ["Growth Exposure", "Low", "High", "Medium-High"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white/80 font-medium">{row[0]}</td>
                        <td className="py-2 px-3 text-white/50">{row[1]}</td>
                        <td className="py-2 px-3 text-white/50">{row[2]}</td>
                        <td className="py-2 px-3 text-[#7dd87d] font-semibold">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Comparable Funds Bar Chart */}
              <div className="mt-5">
                <h3 className="text-base font-bold text-[#7dd87d] mb-3">Target IRR vs Comparable Funds</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { name: 'PE Sustainable\nReal Assets', irr: 14, color: '#86efac' },
                      { name: 'Venture Capital', irr: 18, color: '#86efac' },
                      { name: 'ReGen Civics\n(Target)', irr: 15, color: '#ffd700' },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(value) => `${value}% IRR`} />
                    <Bar dataKey="irr" radius={[4, 4, 0, 0]}>
                      {[
                        { color: '#86efac' },
                        { color: '#86efac' },
                        { color: '#ffd700' },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-white/30 text-center mt-1">Sources: Industry benchmarks. ReGen Civics target IRR is projected, not guaranteed.</p>
              </div>
            </CollapsibleSection>


            {/* ===== SECTION 8: PORTFOLIO OVERVIEW (collapsible) ===== */}
            <CollapsibleSection title="Portfolio Overview" icon={LayoutGrid} id="portfolio">
              <div className="bg-amber-900/20 rounded-xl p-4 border border-[#ffd700]/20 mb-5">
                <p className="text-sm text-white/80">
                  <strong className="text-[#ffd700]">Important:</strong> These are Season 1 land projects and represent potential investments. No investments have been made. Capital deployment begins when $20M is committed to the fund. The final portfolio will be determined through governance processes with investor participation.
                </p>
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Season 1 Land Projects (Potential Portfolio)</h3>
              <div className="overflow-x-auto mb-5">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#7dd87d]/30">
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Project</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Location</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Size</th>
                      <th className="text-left py-2 px-3 text-[#7dd87d] font-semibold">Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["La Tierra", "Costa Rica", "432 acres", "Blue Zone regenerative village"],
                      ["StarSeed Village", "Guatemala", "385 acres", "Regenerative community"],
                      ["The Nyx", "Bali, Indonesia", "5 acres", "Co-living & creative residency"],
                      ["Our NeighbourGood", "New Zealand", "100+ acres", "Ecovillage"],
                      ["Highland Lake CampUS", "NC, USA", "100-120 acres", "ReFi/ReGov incubator"],
                      ["Liminal Village", "Italy", "Various", "Regenerative eco-village"],
                      ["Heartland Retreat", "California, USA", "Various", "Eco-healing sanctuary"],
                      ["Traditional Dream Factory", "Portugal", "Various", "Web3 regenerative village"],
                      ["Ubuntu", "Various", "Various", "Community-led regeneration"],
                      ["Finca Sagrada", "Latin America", "Various", "Biodynamic community farm"],
                      ["Tabi", "Various", "Various", "Regenerative land project"],
                      ["Tioga", "Various", "Various", "Ecological restoration"],
                      ["LaLa Gardens Cooperative", "Various", "Various", "Cooperative garden community"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white/80 font-medium">{row[0]}</td>
                        <td className="py-2 px-3 text-white/60">{row[1]}</td>
                        <td className="py-2 px-3 text-white/60">{row[2]}</td>
                        <td className="py-2 px-3 text-white/60">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-white/50 mb-5">Portfolio spans multiple countries across multiple continents, providing natural diversification against regional economic, political, and climate risks.</p>

              <h4 className="font-bold text-white mb-2">Pipeline: 50+ Interested Projects</h4>
              <p className="text-xs text-white/60 mb-5 leading-relaxed">
                Quantum Cacao, Commons Hub, Ecosphere, Villa Gaia, Sanctura, Granja Tzikin, Neal Columbia, Diamonte Luz, Shanti Vasti, Tahoe NZ, Los Higuerones, Ancient Future, Spirit Land, Eden SD, Sand Angel, New Earth Retreats, Aquarella, New Earth Seed, Forever Green, Harmonia, 7 Springs, Ecopi Island, Egg Temple, Earth Heart, Heart of Being, Laulima, Avano, Regenerosa
              </p>

              <h4 className="font-bold text-white mb-2">Alliance Ecosystem: 40+ Organizations</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Hypha, SEEDS, Nestr.io, Kinship Earth, Open Future Coalition, UP.Game, Gaia Union BioLab, Closer.earth, OASA.earth, Planetary Party, Universe Club, DESA, Permatours, Maptio, LocalScale, Ecophi, WeFi, Sacred Ohms, Vision Development, Leads, Impact Hub, Nera | Unify, Re-Tribalize AI, Impact Ledger, New Earth Summit, Tetra, Luna Capital, Powerbee, Colibri, RCF, LATAM Impact, Gaia Commons, Holomovement, Mettaculture, Global Unity, Rewoven
              </p>
            </CollapsibleSection>


            {/* ===== IS THIS RIGHT FOR YOU? ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10 bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-6 md:p-8 border border-white/10">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Is This Right for You?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <h3 className="font-bold text-[#7dd87d] text-sm mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> This Investment Is Ideal For:
                    </h3>
                    <div className="space-y-2 text-xs">
                      {[
                        "Impact investors seeking measurable regeneration with financial returns",
                        "Crypto-native investors wanting real-world asset exposure",
                        "Family offices looking for uncorrelated alternative assets",
                        "Accredited investors with long-term time horizon",
                        "Those who understand both traditional finance AND blockchain innovation",
                        "Investors excited about pioneering coordination infrastructure",
                        "People who want active governance participation, not passive management"
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                          <span className="text-white/70">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-red-400 text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> This Investment Is NOT For:
                    </h3>
                    <div className="space-y-2 text-xs">
                      {[
                        "Those needing liquidity in next 5-7 years",
                        "Investors uncomfortable with blockchain/crypto technology",
                        "Those seeking guaranteed returns or principal protection",
                        "Investors wanting only traditional and confidential quarterly PDF statements"
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-white/70">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/60 mt-4 text-center">
                  <strong className="text-white/80">Minimum Commitment:</strong> $250,000. We provide deep partnership and active governance participation, not transactional investment management given the time commitment we have a higher bar than normal to participate.
                </p>
              </div>
            </AnimatedSection>

            {/* ===== SECTION 9: INVESTMENT PROCESS (collapsible, default open) ===== */}
            <CollapsibleSection title="Investment Process" icon={Workflow} id="investment-process">
              <div className="mb-6">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/opp-investment-journey_e2ffa537.jpg"
                  alt="Your journey as an alliance investor"
                  className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
                  width="1200"
                  height="800"
                  loading="lazy"
                />
              </div>

              <h3 className="text-base font-bold text-[#7dd87d] mb-3">Your Journey as an Alliance Investor</h3>

              {/* Stage 1 */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-xs font-bold">1</span>
                  <h4 className="font-bold text-white">Letter of Intent Phase (Now - Until $20M Committed)</h4>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { step: "Discovery", desc: "Review this opportunity page, download slides, explore governance documentation" },
                    { step: "Submit LOI", desc: "Express investment interest and indicated amount (non-binding)" },
                    { step: "Initial Conversations", desc: "Schedule call with Catalyst and Council members" },
                    { step: "Due Diligence", desc: "Receive materials, ask questions, visit land projects if desired" },
                    { step: "LOI Confirmation", desc: "Confirm or adjust your intended commitment" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="text-[#7dd87d] font-bold text-sm flex-shrink-0 w-6 h-6 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{item.step}</p>
                        <p className="text-white/70 text-xs mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#7dd87d] mt-3 font-semibold">Target: Collect $20M in Letters of Intent from accredited investors</p>
              </div>

              {/* Stage 2 */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-xs font-bold">2</span>
                  <h4 className="font-bold text-white">Governance Design Event (Once $20M LOIs Secured)</h4>
                </div>
                <p className="text-sm mb-3">When we reach $20M in committed Letters of Intent, we'll host a multi-day event bringing together all stakeholders.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <h5 className="font-bold text-[#7dd87d] text-xs mb-1">Attendees</h5>
                    <p className="text-xs text-white/60">All LOI investors, land project representatives, alliance organization leaders, council members and advisors</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <h5 className="font-bold text-[#7dd87d] text-xs mb-1">Purpose</h5>
                    <p className="text-xs text-white/60">Finalize governance model, review fund terms, establish relationships, vote on initial allocations</p>
                  </div>
                </div>
                <div className="bg-[#7dd87d]/10 rounded-lg p-3 border border-[#7dd87d]/20 text-xs">
                  <p className="text-white/80"><strong className="text-[#7dd87d]">Investor Decision Point:</strong> After the event, investors can commit fully, adjust commitment, or withdraw if finalized governance doesn't align with expectations.</p>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center text-xs font-bold">3</span>
                  <h4 className="font-bold text-white">Fund Launch & Onboarding (Post-Governance Event)</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { step: "Commitment", desc: "Submit subscription agreement, specify any project earmarking preferences" },
                    { step: "Wire Capital", desc: "Transfer funds to custodian account" },
                    { step: "Receive Tokens", desc: "Get $RCivics tokens + RCVoice governance tokens to your wallet" },
                    { step: "Access Portal", desc: "Real-time portfolio dashboard and on-chain transparency" },
                    { step: "Join Network", desc: "Alliance communication channels, monthly calls, community access" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-[#7dd87d] font-bold text-xs mt-0.5">{i + 1}.</span>
                      <p><strong className="text-white">{item.step}</strong> - <span className="text-white/70">{item.desc}</span></p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <h4 className="font-bold text-white mb-3">What to Expect Over Time</h4>
              <div className="space-y-3 mb-4">
                {[
                  { period: "Year 1: Deployment", items: "Watch capital deploy to first 15-25 land projects via on-chain voting. Participate in governance decisions. Quarterly updates. No distributions yet." },
                  { period: "Years 2-3: Maturation", items: "Portfolio generating revenue, alliance ecosystem expanding. First quarterly distributions begin (likely Year 3). Vote on Fund II launch and terms." },
                  { period: "Years 4-7: Growth & Liquidity Prep", items: "Distributions increasing as projects mature. Secondary fund raises (priority allocation for existing LPs). Participation in major governance decisions. Preparation for $RCivics token listing." },
                  { period: "Year 7-10: Liquid Ecosystem", items: "$RCivics listed on crypto exchanges (target, contingent on ecosystem maturity). Option to sell tokens for liquidity or hold for ongoing distributions. Participate in derivative instrument launches (rSeeds stablecoins, lending protocols)." },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="font-bold text-[#7dd87d] text-sm mb-1">{item.period}</h5>
                    <p className="text-xs text-white/60">{item.items}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/60 italic text-center">
                We're not designing this as a typical fund and passive investment. This is active partnership in building regenerative coordination infrastructure.
              </p>
            </CollapsibleSection>


            {/* ===== SECTION 10: FAQ (collapsible) ===== */}
            <CollapsibleSection title="Frequently Asked Questions" icon={HelpCircle} id="faq">
              <div className="divide-y divide-white/10">
                <FAQItem question="How is this different from a traditional farmland REIT?">
                  <p>Three key differences. First, our land projects aren't just farms; they're startup villages, regenerative communities, retreats, and eco-developments with diversified revenue from housing, agriculture, education, and more. Second, we add strategic venture equity exposure (30% allocation) into the alliance organizations building the infrastructure these communities need: housing, energy, governance, waste management, and education. Third, the alliance structure creates a synergistic ecosystem where land projects and support organizations strengthen each other, reducing failure rates and increasing returns. Think of it as an index fund for the regenerative transition, not just a farmland bet.</p>
                </FAQItem>

                <FAQItem question="What happens if regenerative practices don't improve yields?">
                  <p>Our underwriting assumes conventional yields as baseline for Fund I investments in already-operating projects. Regenerative improvements provide upside, not core assumptions. Critically, our land projects generate revenue from multiple streams beyond agriculture: housing, retreats, education programs, eco-tourism, and community memberships. This diversification means no single revenue source needs to outperform for the project to succeed.</p>
                </FAQItem>

                <FAQItem question="How liquid is my investment?">
                  <p><strong className="text-white">Years 1-3:</strong> Extremely limited. Capital is deployed to land projects and alliance organizations. No distributions. Limited annual redemptions (5% cap) for hardship cases only.</p>
                  <p><strong className="text-white">Years 3-7:</strong> Moderate liquidity. Quarterly distributions from portfolio cash flows. Limited annual redemptions (5% cap, NAV less 5% discount, pro-rata if oversubscribed).</p>
                  <p><strong className="text-white">Year 7-10:</strong> Liquidity via crypto exchange listings (target range), targeting Coinbase and other top-tier centralized exchanges plus decentralized exchanges on Base network. This is contingent on ecosystem maturity, not a guarantee.</p>
                  <p className="text-xs text-white/50 italic">Unlike traditional funds that force exits at year 10, our perpetual structure means you're never forced to sell appreciating assets. However, you should invest with a long-term mindset. Year 7-10 listing is a target range, not a guarantee.</p>
                </FAQItem>

                <FAQItem question="What is your deal flow advantage?">
                  <p>Our network of 40+ alliance organizations and 50+ pipeline projects provides proprietary access institutional investors can't replicate independently. The ecosystem approach means projects seek us out for coordination infrastructure and support network, not just capital. We're invited into opportunities because we bring the entire alliance ecosystem, not just money.</p>
                </FAQItem>

                <FAQItem question="How do you value ecological credits given market volatility?">
                  <p>We underwrite ecological credit revenue (carbon, biodiversity, water, and other emerging credits) conservatively and treat them as upside, not core returns. We focus on fundamentals: creating high quality of life for people who live at land projects. By creating healthier lifestyles based on the healthiest land and food, we know demand and value for our offerings and ecosystem will only grow. Ecological credits provide additional yield as markets develop, but are not required for base case projections.</p>
                </FAQItem>

                <FAQItem question="How does the 20% carry work if I sell my tokens on an exchange?">
                  <p>It doesn't. Carried interest only applies to two scenarios: (1) quarterly distributions from portfolio operations, and (2) when the fund actually sells or refinances assets. If you sell your $RCivics tokens on Coinbase or another exchange at a profit, you keep 100% of that gain. No carry to the governance treasury. However, you would be selling your rights to future distributions.</p>
                  <p><strong className="text-white">Example:</strong> You invest $250K. In Year 8, your tokens are worth $600K on exchanges (2.4x). You sell for $600K. You keep the entire $350K gain. Meanwhile, over those 8 years, you also received $140K in quarterly distributions (from which the governance treasury collected carry after preferred return, and you participated in governing how that carry was deployed). Two separate value streams.</p>
                </FAQItem>

                <FAQItem question="What is the 3% due diligence fee?">
                  <p>If an earmarked project doesn't pass our due diligence or council vote, we return the majority of funds. We retain 3% or $20,000 (whichever is less) to cover evaluation costs including financial analysis, governance review, council presentation, and on-site visits.</p>
                </FAQItem>

                <FAQItem question="How does earmarking work?">
                  <p>Investors can direct up to 90% of their capital toward a specific land project. The remaining 10% stays in the diversified fund. If the earmarked project passes diligence and council vote, those funds are deployed to that project. If the project doesn't pass, funds are returned (less 3% due diligence fee) or can be redirected to another project.</p>
                </FAQItem>

                <FAQItem question="Who manages the communities and land projects day-to-day?">
                  <p>Each land project has its own experienced community stewards and operators. For Fund I-II, we invest minority stakes in already-operating projects; they retain operational control and community governance. The alliance network provides critical operational support across housing, energy, governance, waste management, and agriculture. ReGen Civics provides capital, coordination infrastructure, and alliance access, not micromanagement.</p>
                </FAQItem>

                <FAQItem question="What if you don't reach the target fund size?">
                  <p>We won't accept any capital until we have &gt;$20M committed  -  at that point we'll have all investors wire the funds and start operations. Until then, your Letter of Intent is a non-binding expression of interest; no money moves. Above minimum, we can deploy effectively with adjusted portfolio allocation across fewer but well-diversified projects. The fund can operate successfully anywhere between $20M and $50M.</p>
                </FAQItem>

                <FAQItem question="Why is the minimum investment $250,000?">
                  <p>We provide significant time and attention to each capital partner, including personalized onboarding, direct access to Rieki and the Council, quarterly portfolio reviews, governance participation, and invitation to annual gatherings. This high-touch partnership model means we can only serve a focused group of committed partners effectively.</p>
                </FAQItem>

                <FAQItem question="What is the exit strategy?">
                  <p>Unlike traditional funds, ReGen Civics is a perpetual vehicle; we don't plan to exit. We hold exceptional regenerative assets indefinitely while providing investor liquidity through token markets. The fund employs continuous distributions from land project cash flows and success fees from alliance organization growth. Investors can exit their position via crypto exchange listings (target Year 7-10, contingent on ecosystem maturity) or limited redemption windows, but the fund itself continues building regenerative infrastructure across generations.</p>
                </FAQItem>

                <FAQItem question="What makes this an 'ecosystemic' investment?">
                  <p>Most impact funds invest in either land or technology. We invest in both simultaneously, creating a synergistic ecosystem. Our land projects create built-in demand for our alliance organizations. And our alliance organizations make the land projects more resilient, valuable, and scalable. This dual-arm approach is designed as an 'index fund' for the transition to regenerative civilizations.</p>
                </FAQItem>

                <FAQItem question="Do I have to participate in governance?">
                  <p>You can choose your level of involvement. <strong className="text-white">Active governance:</strong> Vote directly on all proposals. <strong className="text-white">Delegated voice:</strong> Delegate your RCVoice to a trusted Council member. <strong className="text-white">Minimal engagement:</strong> Simply delegate and focus on financial returns. We anticipate most investors to choose delegation, similar to how shareholders might vote with management or a proxy.</p>
                </FAQItem>

                <FAQItem question="Why perpetual instead of a traditional 10-year fund?">
                  <p>Traditional fund timelines force premature exits. A 10-year fund must liquidate at year 10 regardless of market conditions, often just as regenerative practices reach maturity. Soil regeneration takes 5-10 years. Communities need 7-15 years to establish. By using a perpetual structure with progressive token liquidity, we align capital with the actual timeline of regenerative transformation.</p>
                </FAQItem>

                <FAQItem question="If the fund never exits, when does the governance treasury receive carry?">
                  <p><strong className="text-white">Ongoing:</strong> Quarterly distributions from portfolio operations trigger carry after preferred return is met. <strong className="text-white">Episodic:</strong> When individual assets are refinanced or sold, those proceeds trigger carry. The perpetual structure creates better alignment: the collective is incentivized to optimize operations for maximum distributions and selectively refinance/exit assets when timing is optimal.</p>
                </FAQItem>

                <FAQItem question="What if the secondary market doesn't develop by Year 7-10?">
                  <p>We maintain multiple liquidity pathways: <strong className="text-white">Plan A:</strong> Exchange listings. <strong className="text-white">Plan B:</strong> Annual tender offers at NAV. <strong className="text-white">Plan C:</strong> Increased redemption caps (from 5% to 10-15% annually). <strong className="text-white">Plan D:</strong> Strategic buyer for entire fund. You're never permanently trapped, but you should invest assuming limited liquidity and a long-term horizon.</p>
                </FAQItem>

                <FAQItem question="What makes $RCivics valuable on secondary markets?">
                  <p>Four value drivers: (1) <strong className="text-white">Cash flow rights</strong> - proportional claim on quarterly distributions. (2) <strong className="text-white">Asset backing</strong> - every token backed by appreciating regenerative land. (3) <strong className="text-white">Network utility</strong> - $RCivics becomes payment token for alliance services. (4) <strong className="text-white">Infrastructure access</strong> - foundation for future rSeeds stablecoins, lending, and DeFi instruments.</p>
                </FAQItem>

                <FAQItem question="How does this compare to holding Bitcoin or Ethereum?">
                  <p>Different value propositions entirely. Bitcoin and Ethereum are digital assets with no underlying cash flows or tangible backing. $RCivics is backed by appreciating regenerative land and operating communities that generate actual revenue. It produces quarterly cash flows from operations. Better comparison: $RCivics resembles a tokenized REIT + VC fund with network utility, while BTC/ETH resemble digital commodities.</p>
                </FAQItem>

                <FAQItem question="What future financial instruments could be built on $RCivics?">
                  <p>As the ecosystem matures (Year 10+): (1) <strong className="text-white">Land-backed stablecoins (rSeeds)</strong> building on 10 years of SEEDS experimentation. (2) <strong className="text-white">Regenerative lending protocols</strong> using $RCivics as collateral. (3) <strong className="text-white">Alliance interchange network</strong> for closed-loop regenerative economy. (4) <strong className="text-white">Regenerative derivatives</strong> for risk management. (5) <strong className="text-white">Fractionalized ownership</strong> of individual land projects.</p>
                </FAQItem>

                <FAQItem question="I don't trust crypto. Why should I invest in something using blockchain?">
                  <p>Understandable concern. We're a real estate and venture fund with tangible land and operating communities. The blockchain is a coordination tool, not a speculative investment. We use it because coordinating 100+ land projects across global jurisdictions through traditional structures requires armies of lawyers and administrators. On-chain governance provides transparent, auditable, efficient coordination. The practical test: If blockchain technology disappeared tomorrow, our land projects would still exist, still generate revenue, and still distribute returns. You don't need to understand TCP/IP protocols to trust email. You don't need to be a blockchain maximalist to benefit from transparent, automated coordination.</p>
                </FAQItem>

                <FAQItem question="What's the governance event about?">
                  <p>The current governance model is a starting point to demonstrate our thinking. The actual governance structure will be designed collaboratively by all stakeholders at a multi-day event once we secure $20M in Letters of Intent. This ensures everyone has voice in the structure before capital is committed. After the event, investors can proceed, adjust, or withdraw.</p>
                </FAQItem>

                <FAQItem question="Are you investing in farmland or communities? I'm confused.">
                  <p>Both, but not traditional farmland. For Fund I-II, we invest minority stakes in existing, operating regenerative land projects. These might be: startup villages with agriculture, housing, education, and retreat components; regenerative communities with food forests, co-living, and wellness programs; educational campuses teaching regenerative practices; or retreat centers on regenerative land. They're operating communities with multiple revenue streams, not commodity farmland. Think regenerative villages, not industrial agriculture.</p>
                </FAQItem>
              </div>
            </CollapsibleSection>


            {/* ===== VISION 2040 ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10">
                <div className="relative rounded-2xl overflow-hidden mb-6">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/opp-vision-2040_5214eaf3.jpg"
                    alt="Vision 2040: A thriving regenerative civilization with interconnected communities"
                    className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
                    width="1920"
                    height="1080"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818]/90 via-[#0d2818]/40 to-transparent rounded-2xl" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                      The Vision: 2040
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20">
                    <h3 className="font-bold text-[#7dd87d] text-sm mb-2">For Investors</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Your $RCivics tokens are worth multiples of your original investment, not from speculation, but from demonstrated land appreciation and thriving communities across global jurisdictions. You receive quarterly distributions from 200+ regenerative projects. You use your tokens as collateral for loans to start your own regenerative project. You participate in governance of a multi-billion dollar ecosystem coordinating regeneration globally.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20">
                    <h3 className="font-bold text-[#7dd87d] text-sm mb-2">For Communities</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Thousands of regenerative villages exist worldwide, all supported by alliance infrastructure. Modular Hempcrete houses that easily scale and heal land. Solar panels from alliance energy partners. Governance tools from alliance tech builders. Every service keeping capital circulating within the regenerative economy.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20">
                    <h3 className="font-bold text-[#7dd87d] text-sm mb-2">For the Planet</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Millions of acres transitioned from degradation to regeneration. Carbon sequestered. Biodiversity restored. Water cycles healed. Soil rebuilt. Not through charity or government mandates, but through profitable coordination infrastructure that makes regeneration the most valuable use of land.
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20">
                    <h3 className="font-bold text-[#7dd87d] text-sm mb-2">For the Economy</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      $RCivics is recognized across the regenerative economy as coordination currency. rSeeds (land-backed stablecoins building on a decade of SEEDS experimentation) are used for everyday transactions in regenerative communities. The coordination infrastructure we're building today is the foundation of how regenerative civilization orchestrates value.
                    </p>
                  </div>
                </div>
                <div className="text-center mt-6">
                  <p className="text-white/60 text-sm italic">
                    The question isn't "Can this work?" The question is "Who will build the coordination layer for the regenerative transition?"
                  </p>
                  <p className="text-[#7dd87d] font-bold text-lg mt-2" style={{ fontFamily: 'var(--font-display)' }}>
                    Join us.
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <GlowDivider />

            {/* ===== FOOTER CTA ===== */}
            <AnimatedSection animation="scale-in">
              <div className="text-center bg-gradient-to-br from-[#7dd87d]/10 to-transparent rounded-2xl p-8 md:p-12 border border-[#7dd87d]/30 mb-10">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Ready to Invest in the Regenerative Transition?
                </h2>
                <p className="text-white/70 text-sm md:text-base mb-6 max-w-2xl mx-auto">
                  Join the investment vehicle backing regenerative land projects and the organizations building the infrastructure for thriving communities. Submit a Letter of Intent or schedule a due diligence call.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <MagneticLOIButton />
                  <Button
                    variant="outline"
                    className="border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-6 py-3 rounded-xl text-base"
                    onClick={() => window.open('https://calendly.com/rieki-cordon/30min', '_blank')}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Schedule Discovery Call
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <a href="mailto:Rieki@pm.me" className="text-white/60 hover:text-[#7dd87d] transition-colors flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Rieki@pm.me
                  </a>
                </div>
                <p className="text-xs text-white/60 mt-6">
                  This investment opportunity is available to accredited investors only. By proceeding, you confirm your accredited investor status under SEC Regulation D.
                </p>
              </div>
            </AnimatedSection>

            {/* ===== SEC COMPLIANCE STRIP ===== */}
            <div className="text-center py-3 border-t border-white/5 text-xs text-white/30 tracking-wider mb-6">
              Regulation D 506(c) &nbsp;&middot;&nbsp; Accredited Investors Only &nbsp;&middot;&nbsp; SEC-Exempt Offering
            </div>

            {/* ===== DOCUMENT VAULT ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10">
                <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>Document Vault</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <a
                    href="https://d2xsxph8kpxj0f.cloudfront.net/310519663294072435/kP95yWoqdEQdQYEQLAKGck/regen-civics-investor-deck-v3_b8e3b334.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-[#7dd87d]/40 transition-colors flex flex-col items-center gap-3 text-center group"
                  >
                    <FileText className="w-8 h-8 text-[#7dd87d] group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="font-bold text-white text-sm">Pitch Deck</p>
                      <p className="text-white/50 text-xs">Download PDF</p>
                    </div>
                  </a>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10 flex flex-col items-center gap-3 text-center opacity-60 cursor-not-allowed">
                    <BookOpen className="w-8 h-8 text-[#7dd87d]" />
                    <div>
                      <p className="font-bold text-white text-sm">Executive Summary</p>
                      <p className="text-white/50 text-xs">Coming soon</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10 flex flex-col items-center gap-3 text-center">
                    <Lock className="w-8 h-8 text-white/30" />
                    <div>
                      <p className="font-bold text-white text-sm">Term Sheet</p>
                      <p className="text-white/50 text-xs">Available after LOI submission</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== CASE STUDY PLACEHOLDER ===== */}
            <AnimatedSection animation="slide-up">
              <div className="mb-10">
                <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>Case Studies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CaseStudyCard />
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10 flex items-center justify-center">
                    <p className="text-white/60 text-sm text-center">More case studies published as fund progresses.</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== LP DISPATCH ===== */}
            <LPDispatch />

            {/* ===== ALLOCATION CALCULATOR ===== */}
            <AnimatedSection animation="slide-up">
              <Suspense fallback={
                <div className="bg-[#1a472a]/30 rounded-2xl p-8 text-center">
                  <div className="animate-pulse text-[#7dd87d]/60 text-sm">Loading calculator...</div>
                </div>
              }>
                <AllocationCalculator />
              </Suspense>
            </AnimatedSection>

            {/* ===== RELATED CONTENT ===== */}
            <AnimatedSection animation="fade-in">
              <RelatedContent pages={relatedContentMap.opportunity.pages} blog={relatedContentMap.opportunity.blog} />
            </AnimatedSection>

          </div>
        </div>
      </section>

      <ReadingProgress />
      <MobileLOIBar />
    </div>
  );
}
