/**
 * Crowd Pooling Projects Page. Fix 150 World-Class Revamp
 * All 20 upgrades implemented.
 */

import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Users, MapPin, Target, Calendar, Sparkles, Clock,
  FileText, Send, DollarSign, TrendingUp, CheckCircle2, Loader2,
  Upload, X, ExternalLink, Briefcase, Home, Leaf, GraduationCap,
  Heart, Globe, Building, Copy, ChevronDown, ChevronUp, Play,
  Share2, Twitter, MessageCircle, Filter, SortAsc, Lock,
  Hourglass, AlertTriangle, Star, LayoutGrid, Map as MapIcon,
  Bell, CheckCircle, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SEO, pageSEO } from "@/components/SEO";
import { pageCopy } from "@/data/pageCopy";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BackButton } from "@/components/BackButton";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountUp } from "@/hooks/useCountUp";
import { cdnImg } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────────
// Project data, enhanced with lat/lng, phases, impact formula, momentum
// ────────────────────────────────────────────────────────────────────────────────
const sampleProjects = [
  {
    id: 1,
    name: "Harmony Valley Ecovillage",
    location: "Costa Rica, Guanacaste Province",
    lat: 10.4,
    lng: -85.5,
    description: "A 150-acre regenerative community focused on permaculture, food forests, and sustainable housing for 50 families.",
    targetAmount: 500000,
    currentAmount: 312000,
    financialAmount: 85000,
    proposedTotal: 425000,
    proposedFinancial: 120000,
    currency: "USD",
    contributors: 23,
    pendingContributors: 8,
    deadline: "June 2026",
    image: cdnImg("https://assets.regencivics.earth/ptLdEEmSgyEQKzmF.jpg"),
    tags: ["Permaculture", "Housing", "Food Forest"],
    status: "active",
    season: "Season 2",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "https://youtu.be/jxKR-WneJp0",
    recentContributions: 8,
    phases: ["Planning", "Infrastructure", "Occupation"],
    currentPhaseIndex: 1,
    impactFormula: { acres: 150, families: 50 },
    applicationData: {
      vision: "Create a thriving regenerative community where 50 families live in harmony with nature, growing their own food, sharing resources, and demonstrating that sustainable living is not only possible but beautiful.",
      landSize: "150 acres",
      landStatus: "Owned",
      currentPhase: "Infrastructure Development",
      timeline: "5 years to full development",
      legalStructure: "Non-profit Foundation + Land Trust",
      governanceModel: "Sociocracy with consent-based decision making",
      membershipModel: "Equity buy-in with sliding scale options",
      housingPlans: "50 eco-homes using natural building techniques",
      foodSystems: "Food forest, market garden, aquaponics, community kitchen",
      waterSystems: "Rainwater harvesting, greywater recycling, constructed wetlands",
      energySystems: "100% solar with battery backup, biogas from composting",
      educationPrograms: "Permaculture Design Course, Natural Building workshops, Children's forest school",
      communityEngagement: "Monthly open days, volunteer program, local farmer partnerships",
      impactMetrics: "Carbon sequestration, biodiversity increase, water retention, community wellbeing surveys",
      challenges: "Initial infrastructure costs, navigating local regulations, building community trust",
      teamSize: 12,
      teamExperience: "Combined 50+ years in permaculture, community development, and sustainable building"
    },
    openRoles: [
      {
        id: "role-1",
        title: "Permaculture Design Lead",
        description: "Lead the design and implementation of food forests and regenerative agriculture systems",
        weeks: 26, hoursPerWeek: 20, hourlyRate: 35, totalValue: 18200,
        skills: ["Permaculture Design Certificate", "Food Forest Experience", "Team Leadership"],
        responsibilities: ["Design food forest zones", "Train community members", "Manage planting schedules"]
      },
      {
        id: "role-2",
        title: "Natural Building Coordinator",
        description: "Coordinate natural building projects and train volunteers in cob, straw bale, and earthbag techniques",
        weeks: 52, hoursPerWeek: 30, hourlyRate: 30, totalValue: 46800,
        skills: ["Natural Building Experience", "Project Management", "Teaching Skills"],
        responsibilities: ["Plan building projects", "Source local materials", "Lead workshops"]
      },
      {
        id: "role-3",
        title: "Community Outreach Manager",
        description: "Build relationships with local communities, manage volunteer program, and coordinate events",
        weeks: 52, hoursPerWeek: 15, hourlyRate: 25, totalValue: 19500,
        skills: ["Community Development", "Event Planning", "Spanish Fluency"],
        responsibilities: ["Organize open days", "Manage volunteer applications", "Local partnerships"]
      }
    ]
  },
  {
    id: 2,
    name: "Terra Nova Regenerative Farm",
    location: "Portugal, Alentejo Region",
    lat: 38.2,
    lng: -8.1,
    description: "Converting 200 hectares of degraded farmland into a thriving regenerative agriculture demonstration site.",
    targetAmount: 350000,
    currentAmount: 245000,
    financialAmount: 65000,
    proposedTotal: 310000,
    proposedFinancial: 90000,
    currency: "EUR",
    contributors: 15,
    pendingContributors: 5,
    deadline: "September 2026",
    image: cdnImg("https://assets.regencivics.earth/wwnJXOsxkrlwtDre.jpg"),
    tags: ["Agriculture", "Land Restoration", "Education"],
    status: "active",
    season: "Season 2",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "",
    recentContributions: 3,
    phases: ["Assessment", "Soil Restoration", "Production"],
    currentPhaseIndex: 1,
    impactFormula: { acres: 494, families: 20 },
    applicationData: {
      vision: "Transform degraded agricultural land into a model of regenerative farming that restores soil health, increases biodiversity, and provides sustainable livelihoods.",
      landSize: "200 hectares",
      landStatus: "Long-term lease (50 years)",
      currentPhase: "Soil Restoration",
      timeline: "7 years to full productivity",
      legalStructure: "Cooperative",
      governanceModel: "Democratic cooperative with one member, one vote",
      membershipModel: "Worker-owner cooperative shares",
      housingPlans: "Renovated farmhouse + 10 new eco-cabins",
      foodSystems: "Silvopasture, market garden, olive groves, cork oak restoration",
      waterSystems: "Keyline design, swales, dam restoration",
      energySystems: "Solar panels, wind turbine, biomass heating",
      educationPrograms: "Regenerative agriculture courses, intern program",
      communityEngagement: "Farm-to-table restaurant, agritourism",
      impactMetrics: "Soil organic matter increase, water infiltration rates, crop yields",
      challenges: "Drought conditions, initial soil degradation, market access",
      teamSize: 8,
      teamExperience: "Agricultural scientists, experienced farmers, business developers"
    },
    openRoles: [
      {
        id: "role-4",
        title: "Soil Scientist",
        description: "Monitor and improve soil health through testing and regenerative practices",
        weeks: 40, hoursPerWeek: 25, hourlyRate: 40, totalValue: 40000,
        skills: ["Soil Science Degree", "Lab Analysis", "Regenerative Agriculture"],
        responsibilities: ["Soil testing", "Amendment recommendations", "Progress tracking"]
      }
    ]
  },
  {
    id: 3,
    name: "Pachamama Learning Village",
    location: "Ecuador, Andes Mountains",
    lat: -1.8,
    lng: -78.2,
    description: "An indigenous-led project creating a learning center for traditional ecological knowledge and modern regenerative practices.",
    targetAmount: 250000,
    currentAmount: 186000,
    financialAmount: 45000,
    proposedTotal: 230000,
    proposedFinancial: 68000,
    currency: "USD",
    contributors: 31,
    pendingContributors: 12,
    deadline: "December 2026",
    image: cdnImg("https://assets.regencivics.earth/qDMEazGCLoNCuxiS.jpg"),
    tags: ["Indigenous", "Education", "Traditional Knowledge"],
    status: "active",
    season: "Season 2",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "",
    recentContributions: 12,
    phases: ["Planning", "Construction", "Operations"],
    currentPhaseIndex: 1,
    impactFormula: { acres: 80, families: 30 },
    applicationData: {
      vision: "Bridge ancient wisdom and modern sustainability by creating a learning center where indigenous knowledge keepers share traditional ecological practices.",
      landSize: "80 acres",
      landStatus: "Community-owned ancestral land",
      currentPhase: "Learning Center Construction",
      timeline: "3 years to operational",
      legalStructure: "Indigenous Community Foundation",
      governanceModel: "Traditional council with elder guidance",
      membershipModel: "Community membership with visitor programs",
      housingPlans: "Traditional construction methods, 20 guest cabins",
      foodSystems: "Chakra gardens, medicinal plants, traditional crops",
      waterSystems: "Spring-fed systems, traditional irrigation",
      energySystems: "Micro-hydro, solar",
      educationPrograms: "Traditional medicine, sustainable agriculture, language preservation",
      communityEngagement: "Cultural exchanges, research partnerships",
      impactMetrics: "Knowledge preservation, youth engagement, biodiversity",
      challenges: "Preserving traditions while adapting to change, funding sustainability",
      teamSize: 25,
      teamExperience: "Elders, traditional healers, educators, young leaders"
    },
    openRoles: [
      {
        id: "role-5",
        title: "Documentation Specialist",
        description: "Record and preserve traditional knowledge through video, audio, and written documentation",
        weeks: 30, hoursPerWeek: 20, hourlyRate: 28, totalValue: 16800,
        skills: ["Video Production", "Cultural Sensitivity", "Spanish/Kichwa"],
        responsibilities: ["Interview elders", "Create educational materials", "Archive management"]
      }
    ]
  },
  {
    id: 4,
    name: "Rewild Britain Sanctuary",
    location: "Scotland, Highlands",
    lat: 57.4,
    lng: -4.1,
    description: "A 500-acre rewilding project restoring native forests and creating wildlife corridors in the Scottish Highlands.",
    targetAmount: 750000,
    currentAmount: 510000,
    financialAmount: 150000,
    proposedTotal: 620000,
    proposedFinancial: 210000,
    currency: "GBP",
    contributors: 42,
    pendingContributors: 15,
    deadline: "March 2027",
    image: cdnImg("https://assets.regencivics.earth/FuQmXVqMDIJIpIbl.jpg"),
    tags: ["Rewilding", "Conservation", "Wildlife"],
    status: "active",
    season: "Season 2",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "",
    recentContributions: 6,
    phases: ["Baseline Survey", "Tree Planting", "Wildlife Return"],
    currentPhaseIndex: 1,
    impactFormula: { acres: 500, families: 10 },
    applicationData: {
      vision: "Restore the Scottish Highlands to their natural state, bringing back native forests, wildlife, and creating corridors for species to thrive.",
      landSize: "500 acres",
      landStatus: "Purchased through community buyout",
      currentPhase: "Native Tree Planting",
      timeline: "20 years for full forest establishment",
      legalStructure: "Community Land Trust",
      governanceModel: "Community board with expert advisors",
      membershipModel: "Supporter membership with voting rights",
      housingPlans: "Minimal footprint: ranger station, research cabin",
      foodSystems: "Wild foraging education, no agriculture",
      waterSystems: "Natural watershed restoration",
      energySystems: "Off-grid solar for minimal facilities",
      educationPrograms: "Rewilding courses, wildlife monitoring training, school visits",
      communityEngagement: "Volunteer tree planting days, wildlife watching tours",
      impactMetrics: "Tree survival rates, wildlife sightings, carbon sequestration",
      challenges: "Deer management, long timeline, climate uncertainty",
      teamSize: 6,
      teamExperience: "Ecologists, foresters, community organizers"
    },
    openRoles: [
      {
        id: "role-6",
        title: "Wildlife Ecologist",
        description: "Monitor wildlife populations and design habitat improvements",
        weeks: 52, hoursPerWeek: 35, hourlyRate: 32, totalValue: 58240,
        skills: ["Ecology Degree", "Wildlife Monitoring", "Data Analysis"],
        responsibilities: ["Camera trap monitoring", "Species surveys", "Habitat assessment"]
      },
      {
        id: "role-7",
        title: "Tree Nursery Manager",
        description: "Manage native tree nursery and coordinate planting programs",
        weeks: 40, hoursPerWeek: 30, hourlyRate: 22, totalValue: 26400,
        skills: ["Horticulture", "Native Species Knowledge", "Volunteer Coordination"],
        responsibilities: ["Seed collection", "Nursery management", "Planting events"]
      }
    ]
  }
];

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", PHP: "₱", JPY: "¥", INR: "₹"
};

// Unique tags from all projects
const ALL_TAGS = Array.from(new Set(sampleProjects.flatMap(p => p.tags)));

// Avatar color palette, deterministic from index
const AVATAR_COLORS = [
  "bg-[#7dd87d] text-[#1a472a]",
  "bg-amber-400 text-amber-900",
  "bg-sky-400 text-sky-900",
  "bg-purple-400 text-white",
  "bg-rose-400 text-white",
];
const AVATAR_INITIALS = ["RY", "JD", "AM", "KC", "SP"];

// ────────────────────────────────────────────────────────────────────────────────
// Helper: parse deadline string to Date
// ────────────────────────────────────────────────────────────────────────────────
function parseDeadline(deadline: string): Date | null {
  const d = new Date(deadline);
  if (!isNaN(d.getTime())) return d;
  // "June 2026" style
  const parsed = new Date(`1 ${deadline}`);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function daysLeft(deadline: string): number | null {
  const d = parseDeadline(deadline);
  if (!d) return null;
  const diff = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ────────────────────────────────────────────────────────────────────────────────
// Countdown Badge (150-15)
// ────────────────────────────────────────────────────────────────────────────────
function DeadlineCountdown({ deadline }: { deadline: string }) {
  const days = daysLeft(deadline);
  if (days === null) return <span>{deadline}</span>;
  const color = days <= 30 ? "text-red-400" : days <= 90 ? "text-amber-400" : "text-white/80";
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Hourglass className="w-3 h-3" />
      {days} days left
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Animated Progress Bar (150-2)
// ────────────────────────────────────────────────────────────────────────────────
function AnimatedProgressBar({
  label, totalValue, financialValue, targetAmount, currency,
  showProposed = false, proposedTotal = 0, proposedFinancial = 0,
  dark = false
}: {
  label: string;
  totalValue: number; financialValue: number; targetAmount: number;
  currency: string;
  showProposed?: boolean; proposedTotal?: number; proposedFinancial?: number;
  dark?: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2, triggerOnce: true });
  const symbol = currencySymbols[currency] || currency;
  const totalPct = Math.min((totalValue / targetAmount) * 100, 100);
  const financialPct = Math.min((financialValue / targetAmount) * 100, 100);
  const proposedTotalPct = showProposed ? Math.min((proposedTotal / targetAmount) * 100, 100) : 0;
  const proposedFinancialPct = showProposed ? Math.min((proposedFinancial / targetAmount) * 100, 100) : 0;

  const animatedTotal = useCountUp(totalPct, 1200, isVisible);
  const animatedFinancial = useCountUp(financialPct, 1200, isVisible);

  const isAlmostFunded = totalPct >= 80;
  const barGoldClass = isAlmostFunded ? "from-amber-400 to-amber-500" : "from-[#7dd87d] to-[#4a9f4a]";
  const labelColor = dark ? "text-white/80" : "text-[#1a472a]/80";
  const textColor = dark ? "text-[#7dd87d]" : "text-[#336644]";
  const amberTextColor = dark ? "text-amber-300" : "text-amber-600";
  const trackColor = dark ? "bg-white/10" : "bg-[#1a472a]/10";

  return (
    <div ref={ref} className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${dark ? "text-white/90" : "text-[#1a472a]"}`}>{label}</span>
          <span className={labelColor}>{symbol}{targetAmount.toLocaleString()} goal</span>
        </div>
      )}

      {/* Total bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className={`w-3 h-3 ${dark ? "text-[#7dd87d]" : "text-[#4a7c59]"}`} />
            <span className={labelColor}>Total Value</span>
          </div>
          <span className={`${textColor} font-medium`}>{symbol}{totalValue.toLocaleString()}</span>
        </div>
        <div className={`h-3 ${trackColor} rounded-full overflow-hidden relative`} style={{ willChange: "contents" }}>
          {showProposed && proposedTotal > totalValue && (
            <div
              className="absolute h-full bg-[#7dd87d]/40 rounded-full transition-all duration-1000"
              style={{ width: isVisible ? `${proposedTotalPct}%` : "0%" }}
            />
          )}
          <div
            className={`h-full bg-gradient-to-r ${barGoldClass} rounded-full relative z-10 ${isAlmostFunded && isVisible ? "animate-pulse-gold" : ""}`}
            style={{
              width: `${animatedTotal}%`,
              transition: "width 0.05s linear",
              willChange: "width"
            }}
          />
        </div>
        {showProposed && proposedTotal > totalValue && (
          <p className={`text-xs ${textColor} flex items-center gap-1`}>
            <span className="w-2 h-2 bg-[#7dd87d]/40 rounded-full inline-block" />
            +{symbol}{(proposedTotal - totalValue).toLocaleString()} proposed
          </p>
        )}
      </div>

      {/* Financial bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className={`w-3 h-3 ${dark ? "text-amber-300" : "text-amber-600"}`} />
            <span className={labelColor}>Cash, Crypto, etc.</span>
          </div>
          <span className={`${amberTextColor} font-medium`}>{symbol}{financialValue.toLocaleString()}</span>
        </div>
        <div className={`h-3 ${trackColor} rounded-full overflow-hidden relative`}>
          {showProposed && proposedFinancial > financialValue && (
            <div
              className="absolute h-full bg-amber-400/40 rounded-full transition-all duration-1000"
              style={{ width: isVisible ? `${proposedFinancialPct}%` : "0%" }}
            />
          )}
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full relative z-10"
            style={{
              width: `${animatedFinancial}%`,
              transition: "width 0.05s linear",
              willChange: "width"
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Avatar Stack (150-8)
// ────────────────────────────────────────────────────────────────────────────────
function AvatarStack({ contributors, projectName }: { contributors: number; projectName: string }) {
  const count = Math.min(contributors, 5);
  const extra = contributors > 5 ? contributors - 5 : 0;
  const tooltipNames = `Rye, Jordan, and ${contributors - 2} others are contributing.`;

  return (
    <div className="flex items-center gap-2" title={tooltipNames}>
      <div className="flex -space-x-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full border-2 border-[#0d2818] flex items-center justify-center text-[10px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
            style={{ zIndex: count - i }}
          >
            {AVATAR_INITIALS[i % AVATAR_INITIALS.length]}
          </div>
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full border-2 border-[#0d2818] bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Milestone Tracker (150-10)
// ────────────────────────────────────────────────────────────────────────────────
function MilestoneTracker({ phases, currentPhaseIndex }: { phases: string[]; currentPhaseIndex: number }) {
  return (
    <div className="flex items-center gap-0 mt-3">
      {phases.map((phase, i) => {
        const done = i < currentPhaseIndex;
        const active = i === currentPhaseIndex;
        return (
          <div key={phase} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all ${
                  done ? "bg-[#7dd87d] border-[#7dd87d] text-[#1a472a]" :
                  active ? "bg-[#1a472a] border-[#7dd87d] text-[#7dd87d] ring-2 ring-[#7dd87d]/30" :
                  "bg-white/10 border-white/20 text-white/60"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[8px] mt-0.5 text-center leading-tight max-w-[50px] ${active ? "text-[#7dd87d] font-medium" : "text-white/50"}`}>
                {phase}
              </span>
            </div>
            {i < phases.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 ${i < currentPhaseIndex ? "bg-[#7dd87d]" : "bg-white/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Momentum Badge (150-3)
// ────────────────────────────────────────────────────────────────────────────────
function MomentumBadge({ recentContributions }: { recentContributions: number }) {
  if (!recentContributions || recentContributions === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-[#7dd87d]/15 border border-[#7dd87d]/30 text-[#7dd87d] text-[10px] font-medium px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-[#7dd87d] rounded-full animate-pulse" />
      {recentContributions} contributions this week
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Impact Preview Overlay (150-13), slides up on hover
// ────────────────────────────────────────────────────────────────────────────────
function ImpactOverlay({ project }: { project: typeof sampleProjects[0] }) {
  const symbol = currencySymbols[project.currency] || project.currency;
  const perAcre = project.impactFormula.acres > 0 ? Math.round(project.targetAmount / project.impactFormula.acres) : 0;
  const perFamily = project.impactFormula.families > 0 ? Math.round(project.targetAmount / project.impactFormula.families) : 0;
  const sampleContrib = Math.min(5000, Math.round(project.targetAmount / 100));
  const acresFromContrib = perAcre > 0 ? +(sampleContrib / perAcre).toFixed(1) : 0;
  const familiesFromContrib = perFamily > 0 ? +(sampleContrib / perFamily).toFixed(1) : 0;

  return (
    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-black/90 via-black/80 to-transparent p-3 pointer-events-none">
      <p className="text-[11px] text-white/90 leading-snug">
        Contributing {symbol}{sampleContrib.toLocaleString()} contributes to approx.{" "}
        <strong className="text-[#7dd87d]">{acresFromContrib} acres</strong> protected
        {familiesFromContrib >= 1 && (
          <> + <strong className="text-[#7dd87d]">{Math.round(familiesFromContrib)} families</strong> housed</>
        )}{" "}
        (estimated)
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Share Sheet (150-11)
// ────────────────────────────────────────────────────────────────────────────────
function ProjectShareSheet({ project }: { project: typeof sampleProjects[0] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pct = Math.round((project.currentAmount / project.targetAmount) * 100);
  const url = `https://regencivics.earth/crowd-pooling-projects`;
  const shareText = `I'm contributing to ${project.name}. ${project.description} They're ${pct}% funded. ${url}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: project.name, text: shareText, url });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); handleNativeShare(); }}
        className="flex items-center gap-1 text-white/50 hover:text-[#7dd87d] transition-colors text-xs"
      >
        <Share2 className="w-3 h-3" />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[#0d2818] border border-[#7dd87d]/20 rounded-2xl p-6 w-full max-w-sm z-10"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white mb-4">Share {project.name}</h3>
            <div className="space-y-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                <Twitter className="w-4 h-4 text-sky-400" />
                Share on X / Twitter
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-400" />
                Share on WhatsApp
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 rounded-xl p-3 text-white transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-[#7dd87d]" /> : <Copy className="w-4 h-4 text-white/60" />}
                {copied ? "Link copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Role Card
// ────────────────────────────────────────────────────────────────────────────────
function RoleCard({
  role, currency, projectName, daoLink
}: {
  role: typeof sampleProjects[0]['openRoles'][0];
  currency: string; projectName: string; daoLink: string;
}) {
  const symbol = currencySymbols[currency] || currency;
  const [copied, setCopied] = useState(false);

  const copyToProposal = () => {
    const data = { type: "role", roleName: role.title, weeks: role.weeks, hoursPerWeek: role.hoursPerWeek, hourlyRate: role.hourlyRate, totalValue: role.totalValue, project: projectName };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    toast.success("Role copied to clipboard!", { description: "Paste this into the Crowd Pooling Tool to add to your proposal" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-xl p-4 hover:border-[#7dd87d]/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{role.title}</h4>
          <p className="text-sm text-white/70 mt-1">{role.description}</p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-400/30 flex-shrink-0">
          <Briefcase className="w-3 h-3 mr-1" />Role
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        {[["Weeks", role.weeks], ["Hrs/Week", role.hoursPerWeek], [`${symbol}/Hour`, role.hourlyRate]].map(([label, val]) => (
          <div key={label as string} className="bg-white/5 rounded-lg p-2 text-center">
            <p className="text-white/50">{label}</p>
            <p className="font-bold text-white">{val}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3 py-2 border-t border-b border-white/10">
        <span className="text-sm text-white/70">Total Value:</span>
        <span className="font-bold text-[#7dd87d]">{symbol}{role.totalValue.toLocaleString()}</span>
      </div>
      <div className="mb-3">
        <p className="text-xs text-white/50 mb-1">Required Skills:</p>
        <div className="flex flex-wrap gap-1">
          {role.skills.map((s, i) => (
            <Badge key={i} className="text-xs bg-[#7dd87d]/10 text-[#7dd87d] border border-[#7dd87d]/20">{s}</Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={copyToProposal}>
          <Copy className="w-3 h-3 mr-1" />{copied ? "Copied!" : "Add to Proposal"}
        </Button>
        <Button size="sm" className="flex-1 bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c]" onClick={() => window.open(daoLink, '_blank')}>
          <Send className="w-3 h-3 mr-1" />Apply in DAO
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Full-screen Kickstarter-style Detail Modal (150-20)
// ────────────────────────────────────────────────────────────────────────────────
function ProjectDetailModal({
  project, isOpen, onClose
}: {
  project: typeof sampleProjects[0];
  isOpen: boolean; onClose: () => void;
}) {
  const symbol = currencySymbols[project.currency] || project.currency;
  const [activeTab, setActiveTab] = useState("overview");
  const [sysOpen, setSysOpen] = useState(false);
  const [govOpen, setGovOpen] = useState(false);
  const [eduOpen, setEduOpen] = useState(false);
  const pct = Math.round((project.currentAmount / project.targetAmount) * 100);
  const isAlmostFunded = pct >= 80;
  const days = daysLeft(project.deadline);
  const dayColor = days !== null && days <= 30 ? "text-red-400" : days !== null && days <= 90 ? "text-amber-400" : "text-white/80";
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal panel */}
      <div
        className="relative bg-[#0a1f10] border border-[#7dd87d]/20 w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-t-2xl sm:rounded-2xl z-10 flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="sticky top-0 bg-gradient-to-br from-[#0d2818] to-[#1a472a] p-4 sm:p-6 z-10 border-b border-[#7dd87d]/20">
          <button
            onClick={onClose}
            aria-label="Close project details"
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-10">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className="bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 text-xs">
                  {(project as any).season || "Season 2"}
                </Badge>
                <Badge className={`text-xs ${project.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-white/60'}`}>
                  {project.status === 'active' ? 'Active' : project.status}
                </Badge>
                {isAlmostFunded && (
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs animate-pulse">
                    Almost There
                  </Badge>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {project.name}
              </h2>
              <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
                <MapPin className="w-3 h-3" />
                {project.location}
              </div>
            </div>
          </div>
        </div>

        {/* Body, two columns on desktop */}
        <div className="flex flex-col lg:flex-row overflow-auto">
          {/* Left column, 60% */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Hero image + optional video */}
            <div className="rounded-xl overflow-hidden aspect-video relative group">
              <img
                src={project.image || cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              {project.overviewVideoUrl && !videoPlaying && (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-[#1a472a] ml-1" />
                  </div>
                </button>
              )}
              {project.overviewVideoUrl && videoPlaying && (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${project.overviewVideoUrl.split("youtu.be/").pop()?.split("?")[0] || project.overviewVideoUrl.split("v=")[1]?.split("&")[0]}?autoplay=1`}
                  allow="autoplay; fullscreen"
                  title={project.name}
                />
              )}
            </div>

            <p className="text-white/80 leading-relaxed">{project.description}</p>

            {/* Vision */}
            {project.applicationData?.vision && (
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl p-4">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#7dd87d]" />Vision
                </h3>
                <p className="text-sm text-white/70">{project.applicationData.vision}</p>
              </div>
            )}

            {/* Milestone tracker */}
            <div>
              <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Project Phases</p>
              <MilestoneTracker phases={project.phases} currentPhaseIndex={project.currentPhaseIndex} />
            </div>

            {/* Collapsible. Regenerative Systems */}
            <Collapsible open={sysOpen} onOpenChange={setSysOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t border-white/10 text-white/80 hover:text-white transition-colors">
                <span className="flex items-center gap-2 font-medium"><Leaf className="w-4 h-4 text-[#7dd87d]" />Regenerative Systems</span>
                {sysOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 text-sm text-white/70 pb-2">
                {[["Housing", project.applicationData.housingPlans], ["Food", project.applicationData.foodSystems], ["Water", project.applicationData.waterSystems], ["Energy", project.applicationData.energySystems]].map(([k, v]) => (
                  <div key={k}><span className="text-white/60">{k}: </span>{v}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible. Governance */}
            <Collapsible open={govOpen} onOpenChange={setGovOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t border-white/10 text-white/80 hover:text-white transition-colors">
                <span className="flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-[#7dd87d]" />Governance & Membership</span>
                {govOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 text-sm text-white/70 pb-2">
                {[["Governance", project.applicationData.governanceModel], ["Membership", project.applicationData.membershipModel], ["Legal", project.applicationData.legalStructure], ["Team", `${project.applicationData.teamSize} core members: ${project.applicationData.teamExperience}`]].map(([k, v]) => (
                  <div key={k}><span className="text-white/60">{k}: </span>{v}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible. Education */}
            <Collapsible open={eduOpen} onOpenChange={setEduOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t border-white/10 text-white/80 hover:text-white transition-colors">
                <span className="flex items-center gap-2 font-medium"><GraduationCap className="w-4 h-4 text-[#7dd87d]" />Education & Community</span>
                {eduOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 text-sm text-white/70 pb-2">
                {[["Programs", project.applicationData.educationPrograms], ["Engagement", project.applicationData.communityEngagement], ["Impact", project.applicationData.impactMetrics], ["Challenges", project.applicationData.challenges]].map(([k, v]) => (
                  <div key={k}><span className="text-white/60">{k}: </span>{v}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Open Roles */}
            {project.openRoles && project.openRoles.length > 0 && (
              <div>
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#7dd87d]" />
                  Open Roles ({project.openRoles.length})
                </h3>
                <div className="space-y-4">
                  {project.openRoles.map(role => (
                    <RoleCard key={role.id} role={role} currency={project.currency} projectName={project.name} daoLink={project.daoLink} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column, 40%, sticky sidebar */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0 bg-[#0d2818]/80 border-t lg:border-t-0 lg:border-l border-[#7dd87d]/20 p-4 sm:p-6 space-y-5 overflow-y-auto">

            {/* Funding progress */}
            <AnimatedProgressBar
              label="Funding Progress"
              totalValue={project.currentAmount}
              financialValue={project.financialAmount}
              targetAmount={project.targetAmount}
              currency={project.currency}
              showProposed
              proposedTotal={project.proposedTotal}
              proposedFinancial={project.proposedFinancial}
              dark
            />

            {/* Almost funded callout */}
            {isAlmostFunded && (
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
                <p className="text-xs text-amber-300 font-medium">
                  Only {currencySymbols[project.currency]}{(project.targetAmount - project.currentAmount).toLocaleString()} more needed to fully fund this project.
                </p>
              </div>
            )}

            {/* Avatar stack + contributors */}
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Contributors</p>
              <div className="flex items-center gap-3">
                <AvatarStack contributors={project.contributors} projectName={project.name} />
                <div>
                  <p className="text-white font-bold">{project.contributors}</p>
                  <p className="text-white/50 text-xs">accepted{project.pendingContributors > 0 && ` (+${project.pendingContributors} pending)`}</p>
                </div>
              </div>
              {project.recentContributions > 0 && (
                <div className="mt-2">
                  <MomentumBadge recentContributions={project.recentContributions} />
                </div>
              )}
            </div>

            {/* Deadline countdown */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-white/60" />
              <DeadlineCountdown deadline={project.deadline} />
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Land", project.applicationData.landSize],
                ["Status", project.applicationData.landStatus],
                ["Phase", project.applicationData.currentPhase],
                ["Timeline", project.applicationData.timeline],
              ].map(([k, v]) => (
                <div key={k} className="bg-white/5 rounded-lg p-2">
                  <p className="text-white/60">{k}</p>
                  <p className="text-white font-medium text-[11px]">{v}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {project.tags.map(tag => (
                <Badge key={tag} className="bg-[#7dd87d]/10 text-[#7dd87d] border border-[#7dd87d]/20 text-xs">{tag}</Badge>
              ))}
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] font-bold text-base h-12"
                onClick={() => window.open(project.daoLink, '_blank')}
              >
                <Send className="w-4 h-4 mr-2" />
                Contribute via Hypha
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
              <div className="flex gap-2">
                <Link
                  href={`/crowd-pooling?project=${encodeURIComponent(project.name)}&target=${Math.round(project.targetAmount / (project.contributors || 10))}&currency=${project.currency}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                    <FileText className="w-3 h-3 mr-1" />Build Proposal
                  </Button>
                </Link>
                <div className="flex items-center justify-center px-3 border border-white/20 rounded-md hover:bg-white/10 cursor-pointer transition-colors">
                  <ProjectShareSheet project={project} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// How It Works + YouTube Facade (150-16)
// ────────────────────────────────────────────────────────────────────────────────
function HowCrowdPoolingWorks() {
  const [expanded, setExpanded] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const YT_ID = "jxKR-WneJp0";
  const THUMB = `https://img.youtube.com/vi/${YT_ID}/maxresdefault.jpg`;

  return (
    <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl overflow-hidden mb-8">
      <button
        className="flex items-center justify-between w-full p-5 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#7dd87d]" />
          <span className="font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            How Crowd Pooling Works
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* 3-step process */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: 1, title: "Explore Projects", body: "Browse active regenerative land projects seeking community contributions." },
              { n: 2, title: "Contribute via Hypha", body: "Submit your contribution proposal through the Hypha DAO for transparent on-chain governance." },
              { n: 3, title: "Project Deploys", body: "Once crowd pooling target is met, contributions are activated and the project begins." },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#7dd87d] font-bold text-sm">{n}</span>
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">{title}</h3>
                  <p className="text-xs text-white/60 mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* YouTube facade */}
          <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVideoActive(true); } }} className="rounded-xl overflow-hidden aspect-video relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50" onClick={() => setVideoActive(true)}>
            {!videoActive ? (
              <>
                <img
                  src={THUMB}
                  alt="Crowd Pooling explanation video"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <Play className="w-7 h-7 text-[#1a472a] ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs">
                  Watch: What is Crowd Pooling?
                </div>
              </>
            ) : (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1`}
                title="Crowd Pooling Explainer"
                allow="autoplay; fullscreen"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// "Get Notified" Email Capture (150-14)
// ────────────────────────────────────────────────────────────────────────────────
function GetNotifiedForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("You're on the list!", { description: "We'll notify you when new Season 2 projects open." });
    setSubmitted(true);
  };

  return (
    <div className="bg-gradient-to-br from-[#0d2818] to-[#1a472a] border border-[#7dd87d]/20 rounded-2xl p-6 sm:p-8 text-center">
      <Bell className="w-8 h-8 text-[#7dd87d] mx-auto mb-3" />
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        More projects join each season.
      </h2>
      <p className="text-white/60 text-sm mb-5 max-w-md mx-auto">
        Get notified when the next Season 2 project opens for crowd pooling contributions.
      </p>
      {submitted ? (
        <div className="flex items-center justify-center gap-2 text-[#7dd87d]">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">You're on the list!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
          />
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30"
          />
          <Button type="submit" className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] font-semibold whitespace-nowrap">
            Notify Me
          </Button>
        </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Total Combined Impact Footer Strip (150-17)
// ────────────────────────────────────────────────────────────────────────────────
function ImpactStrip({ projects }: { projects: typeof sampleProjects }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: true });
  const totalAcres = projects.reduce((s, p) => s + (p.impactFormula?.acres || 0), 0);
  const totalFamilies = projects.reduce((s, p) => s + (p.impactFormula?.families || 0), 0);
  const totalCountries = new Set(projects.map(p => p.location.split(",")[1]?.trim() || p.location)).size;

  const animAcres = useCountUp(totalAcres, 1400, isVisible);
  const animFamilies = useCountUp(totalFamilies, 1400, isVisible);
  const animCountries = useCountUp(totalCountries, 800, isVisible);

  return (
    <div ref={ref} className="bg-[#0d2818]/80 border border-[#7dd87d]/20 backdrop-blur-sm rounded-2xl py-6 px-8 mb-8">
      <p className="text-white/60 text-xs uppercase tracking-widest text-center mb-4">Combined impact across all active projects</p>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
        {[
          { value: animAcres, label: "acres", suffix: "" },
          { value: animFamilies, label: "families", suffix: "" },
          { value: animCountries, label: "countries", suffix: "" },
        ].map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-[#7dd87d]">{value.toLocaleString()}</p>
            <p className="text-white/50 text-sm">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────────────────────────────────────
export default function CrowdPoolingProjects() {
  const [, navigate] = useLocation();
  const [selectedProject, setSelectedProject] = useState<typeof sampleProjects[0] | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // 150-6: Filter + sort state
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"most-funded" | "ending-soon" | "newest" | "most-contributors">("most-funded");
  const [activeTab, setActiveTab] = useState<"active" | "upcoming" | "funded">("active");

  // Fetch real projects from database
  const { data: dbProjects, isLoading: dbLoading } = trpc.crowdPoolingProjects.list.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  const realProjects = useMemo(() => (dbProjects || []).map((p: any) => ({
    id: p.id + 10000,
    name: p.projectName,
    location: p.location || 'Location TBD',
    lat: 0, lng: 0,
    description: p.projectDescription || '',
    targetAmount: p.targetAmount,
    currentAmount: p.currentAmount || 0,
    financialAmount: p.currentAmount || 0,
    proposedTotal: 0, proposedFinancial: 0,
    currency: p.targetCurrency || 'USD',
    contributors: p.contributorCount || 0,
    pendingContributors: 0,
    deadline: p.endDate ? new Date(p.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Ongoing',
    image: p.projectImageUrl || '',
    tags: [] as string[],
    status: p.status,
    season: "Season 2",
    daoLink: p.projectUrl || 'https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution',
    overviewVideoUrl: '',
    recentContributions: 0,
    phases: ["Planning", "Development", "Launch"] as string[],
    currentPhaseIndex: 0,
    impactFormula: { acres: 0, families: 0 },
    applicationData: {
      vision: p.projectDescription || '',
      landSize: '', landStatus: '', currentPhase: '', timeline: '',
      legalStructure: '', governanceModel: '', membershipModel: '',
      housingPlans: '', foodSystems: '', waterSystems: '', energySystems: '',
      educationPrograms: '', communityEngagement: '', impactMetrics: '',
      challenges: '', teamSize: 0, teamExperience: ''
    },
    openRoles: [] as typeof sampleProjects[0]['openRoles'],
    isFromDatabase: true,
  })), [dbProjects]);

  const sortedProjects = useMemo(() => {
    const base = realProjects.length > 0
      ? [...realProjects, ...sampleProjects.map(p => ({ ...p, isFromDatabase: false }))]
      : sampleProjects.map(p => ({ ...p, isFromDatabase: false }));

    const tabFiltered = base.filter(p => {
      if (activeTab === "active") return p.status === "active";
      if (activeTab === "funded") return p.status === "completed" || p.status === "funded";
      return false;
    });

    const tagFiltered = activeTags.length === 0
      ? tabFiltered
      : tabFiltered.filter(p => activeTags.some(t => p.tags.includes(t)));

    return [...tagFiltered].sort((a, b) => {
      switch (sortBy) {
        case "most-funded": return (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount);
        case "most-contributors": return b.contributors - a.contributors;
        case "ending-soon": {
          const da = daysLeft(a.deadline) ?? 9999;
          const db2 = daysLeft(b.deadline) ?? 9999;
          return da - db2;
        }
        case "newest": return b.id - a.id;
        default: return 0;
      }
    });
  }, [realProjects, activeTab, activeTags, sortBy]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleOpenDetail = (project: typeof sampleProjects[0]) => {
    setSelectedProject(project);
    setDetailModalOpen(true);
  };

  // Aggregate stats for impact strip
  const activeProjects = sampleProjects.filter(p => p.status === "active");

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: "#0d2818",
        backgroundImage: `url('/images/crowd-pooling-hero.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/55 via-[#0a1f10]/65 to-[#0d2818]/85 pointer-events-none" />

      <SEO {...pageSEO.crowdPoolingProjects} />

      {/* Preload hero image */}
      <link rel="preload" as="image" href="/images/crowd-pooling-hero.webp" fetchPriority="high" />

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative text-white py-16 md:py-24 px-4 overflow-hidden">
          <div className="relative z-10 container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30">
                <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" size={20} />
                <span className="text-sm font-medium text-[#7dd87d]">Season 2 Projects</span>
              </div>
              <h1
                className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {pageCopy.crowdPoolingProjects.hero.heading}
              </h1>
              <p className="text-white/90 text-base md:text-lg mb-10 max-w-2xl mx-auto">
                {pageCopy.crowdPoolingProjects.hero.subtext}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                <Link href="/crowd-pooling">
                  <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] w-full sm:w-auto font-semibold">
                    <FileText className="w-4 h-4 mr-2" />
                    {pageCopy.crowdPoolingProjects.hero.CTAs.createProposal}
                  </Button>
                </Link>
                <Link href="/compare-projects">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                    <Target className="w-4 h-4 mr-2" />
                    {pageCopy.crowdPoolingProjects.hero.CTAs.compareProjects}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-white/20 text-white/50 cursor-not-allowed w-full sm:w-auto"
                  disabled
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {pageCopy.crowdPoolingProjects.hero.CTAs.listProject}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Example Data Notice Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-y border-amber-400/30 backdrop-blur-sm py-4 px-4">
          <div className="container">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-white/90 text-sm sm:text-base">
                  <span className="font-semibold text-amber-300">All example data.</span>{" "}
                  Our first season of crowd pooling goes live late 2026 / early 2027.
                </p>
              </div>
              <Link href="/newsletter">
                <Button size="sm" className="bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30 hover:text-white text-xs sm:text-sm whitespace-nowrap">
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Sign up for updates
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Aggregate Progress Banner (DB-sourced only) */}
        {dbProjects && dbProjects.length > 0 && (() => {
          const totalFunded = dbProjects.reduce((s: number, p: any) => s + (p.currentAmount || 0), 0);
          const totalTarget = dbProjects.reduce((s: number, p: any) => s + (p.targetAmount || 0), 0);
          const totalContributors = dbProjects.reduce((s: number, p: any) => s + (p.contributorCount || 0), 0);
          const activeCount = dbProjects.filter((p: any) => p.status === 'active').length;
          const pct = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0;
          const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;

          return (
            <div className="bg-[#0d2818]/80 border-b border-[#7dd87d]/20 backdrop-blur-sm py-4">
              <div className="container">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-6">
                    {[["Active Projects", activeCount], ["Pooled", fmtK(totalFunded)], ["Contributors", totalContributors], ["Avg Funded", `${pct}%`]].map(([label, val]) => (
                      <div key={label as string} className="text-center">
                        <p className="text-[#7dd87d] font-bold text-xl">{val}</p>
                        <p className="text-white/60 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-48 max-w-xs">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                      <span>Overall Progress</span>
                      <span>{fmtK(totalFunded)} / {fmtK(totalTarget)}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7dd87d] rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Main Content */}
        <main className="container py-8 md:py-12">

          {/* Explanatory callout */}
          <div className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 text-sm text-white/80 flex items-center gap-3">
            <Leaf className="w-4 h-4 text-[#7dd87d] flex-shrink-0" />
            <span>
              {pageCopy.crowdPoolingProjects.callout.text}{" "}
              <Link href="/crowd-pooling" className="font-medium text-[#7dd87d] hover:underline">
                {pageCopy.crowdPoolingProjects.callout.link}
              </Link>
            </span>
          </div>

          {/* How It Works collapsible (150-16) */}
          <HowCrowdPoolingWorks />

          {/* 150-19: Active / Upcoming / Funded tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[
              { key: "active", label: `Active (${sampleProjects.filter(p => p.status === "active").length})` },
              { key: "upcoming", label: "Upcoming: Season 2 Applications Open" },
              { key: "funded", label: "Funded (0, first closes coming)" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === key
                    ? "bg-[#7dd87d] text-[#1a472a]"
                    : "bg-white/5 border border-white/20 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 150-6: Sort + filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Tag pills */}
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    activeTags.includes(tag)
                      ? "bg-[#7dd87d] text-[#1a472a]"
                      : "bg-white/5 border border-white/20 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button
                  onClick={() => setActiveTags([])}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white/60 hover:text-white/70 underline transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <SortAsc className="w-3 h-3 text-white/60" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/5 border border-white/20 text-white/70 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#7dd87d]/50"
              >
                <option value="most-funded">Most Funded</option>
                <option value="ending-soon">Ending Soon</option>
                <option value="newest">Newest</option>
                <option value="most-contributors">Most Contributors</option>
              </select>
            </div>
          </div>

          {/* Upcoming tab content */}
          {activeTab === "upcoming" && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {[1, 2].map(i => (
                <div key={i} className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-[#0d2818]/80 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock className="w-8 h-8 text-white/30 mb-3" />
                    <p className="text-white/70 font-medium mb-1">Coming this season</p>
                    <p className="text-white/60 text-sm mb-4">
                      Our first round of Season 2 projects is live. More join as the season progresses.
                      Want to see your project here? Apply.
                    </p>
                    <Link href="/seasons">
                      <Button className="bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/30 text-sm">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                  <div className="h-52 bg-gradient-to-br from-[#1a472a]/30 to-[#0d2818] animate-pulse-subtle" />
                  <div className="p-5 blur-sm pointer-events-none select-none">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-4" />
                    <div className="h-2 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Project cards grid */}
          {activeTab !== "upcoming" && (
            <>
              {dbLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-72 p-6 space-y-4">
                      <div className="h-40 bg-[#1a472a]/40 rounded-xl" />
                      <div className="h-4 bg-[#7dd87d]/20 rounded w-3/4" />
                      <div className="h-3 bg-[#7dd87d]/10 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {sortedProjects.length === 0 && !dbLoading && (
                <div className="text-center py-16 text-white/60">
                  <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No projects match your current filters.</p>
                  <button onClick={() => setActiveTags([])} className="mt-2 text-[#7dd87d] underline text-sm">Clear filters</button>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {sortedProjects.map((project: any) => {
                  const pct = Math.round((project.currentAmount / project.targetAmount) * 100);
                  const isAlmost = pct >= 80;
                  const days = daysLeft(project.deadline);
                  const dayUrgent = days !== null && days <= 30;
                  const dayAmbient = days !== null && days > 30 && days <= 90;

                  return (
                    <div
                      key={project.id}
                      className={`group relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
                        ${isAlmost
                          ? "border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:shadow-[0_0_30px_rgba(251,191,36,0.25)]"
                          : "border-[#7dd87d]/20 hover:border-[#7dd87d]/50"
                        }
                        hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]`}
                      style={{ willChange: "transform" }}
                      onClick={() => handleOpenDetail(project)}
                    >
                      {/* Project Image */}
                      <div className="h-52 relative overflow-hidden">
                        {project.image ? (
                          <img
                            src={project.image}
                            alt={project.name}
                            width="400"
                            height="208"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            style={{ willChange: "transform" }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] flex items-center justify-center">
                            <SeedOfLifeIcon className="w-16 h-16 text-white/20" size={64} />
                          </div>
                        )}
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Impact hover overlay (150-13) */}
                        <ImpactOverlay project={project} />

                        {/* Funding % badge */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                          <span className={`font-bold text-base px-3 py-1 rounded-lg leading-tight ${isAlmost ? "bg-amber-400 text-amber-900" : "bg-[#7dd87d] text-[#1a472a]"}`}>
                            {pct}%
                          </span>
                          <span className="text-white text-sm font-medium drop-shadow-sm">funded</span>
                        </div>

                        {/* Status badge */}
                        <Badge className={`absolute top-3 right-3 ${project.status === 'active' ? 'bg-emerald-500/80 text-white' : 'bg-white/20 text-white'}`}>
                          {project.status === 'active' ? 'Active' : project.status}
                        </Badge>

                        {/* Season 2 label (150-12) */}
                        {(project as any).season && (
                          <Badge className="absolute top-3 left-3 bg-[#7dd87d]/80 text-[#1a472a] text-[10px]">
                            {(project as any).season}
                          </Badge>
                        )}

                        {/* Example badge */}
                        {!(project as any).isFromDatabase && (
                          <Badge className="absolute bottom-3 right-3 bg-amber-500/70 text-white text-[10px]">
                            Example
                          </Badge>
                        )}

                        {project.openRoles && project.openRoles.length > 0 && (
                          <Badge className="absolute top-10 left-3 bg-purple-500/80 text-white text-[10px]">
                            {project.openRoles.length} Open Roles
                          </Badge>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-5">
                        {/* Momentum badge (150-3) */}
                        {project.recentContributions > 0 && (
                          <div className="mb-2">
                            <MomentumBadge recentContributions={project.recentContributions} />
                          </div>
                        )}

                        {/* Almost funded treatment (150-7) */}
                        {isAlmost && (
                          <div className="mb-2 flex items-center gap-1.5 text-amber-300 text-xs font-medium">
                            <Star className="w-3 h-3 fill-amber-300" />
                            Almost There. Only {currencySymbols[project.currency]}{(project.targetAmount - project.currentAmount).toLocaleString()} more needed
                          </div>
                        )}

                        <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-white/50 mb-3">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </div>

                        <p className="text-sm text-white/70 mb-4 line-clamp-2">{project.description}</p>

                        {/* Animated Dual Progress Bars (150-2) */}
                        <div className="mb-4">
                          <AnimatedProgressBar
                            label="Funding Progress"
                            totalValue={project.currentAmount}
                            financialValue={project.financialAmount}
                            targetAmount={project.targetAmount}
                            currency={project.currency}
                            showProposed
                            proposedTotal={project.proposedTotal}
                            proposedFinancial={project.proposedFinancial}
                            dark
                          />
                        </div>

                        {/* Milestone tracker (150-10) */}
                        {project.phases && project.phases.length > 0 && (
                          <MilestoneTracker phases={project.phases} currentPhaseIndex={project.currentPhaseIndex || 0} />
                        )}

                        {/* Stats row */}
                        <div className="flex items-center justify-between text-xs text-white/50 mt-3 mb-3">
                          <div className="flex items-center gap-2">
                            <AvatarStack contributors={project.contributors} projectName={project.name} />
                            <span>{project.contributors} accepted{project.pendingContributors > 0 && ` +${project.pendingContributors} pending`}</span>
                          </div>
                          <DeadlineCountdown deadline={project.deadline} />
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tags.map((tag: string) => (
                            <Badge key={tag} className="text-xs bg-[#7dd87d]/10 text-[#7dd87d] border border-[#7dd87d]/20">{tag}</Badge>
                          ))}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2">
                          <Button
                            className={`flex-1 font-medium ${isAlmost ? "bg-amber-400 text-amber-900 hover:bg-amber-300" : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c]"}`}
                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(project); }}
                          >
                            View Details
                          </Button>
                          <div className="flex items-center gap-1 text-white/60 text-xs" onClick={e => e.stopPropagation()}>
                            <ProjectShareSheet project={project} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Coming Soon placeholder card (150-12) */}
                <div className="relative bg-white/5 border border-[#7dd87d]/20 rounded-2xl overflow-hidden">
                  <div className="h-52 bg-gradient-to-br from-[#1a472a]/20 to-[#0d2818]">
                    <div className="absolute inset-0 animate-pulse border-2 border-[#7dd87d]/20 rounded-2xl pointer-events-none" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/10 border border-[#7dd87d]/30 flex items-center justify-center mb-3 animate-pulse">
                      <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <p className="text-white/80 font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>More Coming This Season</p>
                    <p className="text-white/60 text-sm mb-4">
                      Our first round of Season 2 projects is live. More are joining as the season progresses. Want to see your project here? Apply.
                    </p>
                    <Link href="/seasons">
                      <Button className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/25 text-sm">
                        Apply for Season 2
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Total combined impact strip (150-17) */}
          <div className="mt-12">
            <ImpactStrip projects={activeProjects} />
          </div>

          {/* Get Notified (150-14) */}
          <div className="mt-8">
            <GetNotifiedForm />
          </div>

          {/* CTA Section */}
          <div className="mt-8 bg-gradient-to-br from-[#0d2818]/80 to-[#1a472a]/80 backdrop-blur-sm border border-[#7dd87d]/20 rounded-2xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Want Your Project Listed Here?
            </h2>
            <p className="text-white/70 max-w-lg mx-auto mb-6">
              If you are a land project looking to crowd pool contributions from your community,
              apply to join the ReGen Civics alliance and get access to our Crowd Pooling platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/seasons">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] w-full sm:w-auto font-semibold">
                  Apply for Season 2
                </Button>
              </Link>
              <Link href="/schedule">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                  Join Open Session
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Kickstarter-style detail modal (150-20) */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
}
