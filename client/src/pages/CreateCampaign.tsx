/**
 * Crowd Pooling Campaign Creator
 * Lets a project's stewards list everything the project needs: land,
 * equipment, roles, other needs, and the money it asks for.
 *
 * Money (build spec 2026-09-25, sections 11 and 14.1): the Money step asks
 * for an explicit choice between an amount and "This project asks for no
 * money". There is no silent default any more (the old 20% fallback is gone);
 * no money sends 0. The money-share note ("Money is 42% of your whole ask",
 * and the 10 to 30 percent line outside the usual band) is guidance and never
 * blocks. Money routes (Ma Earth, Steward) the project already holds go in
 * the same step and wait for a ReGen Civics admin to check them.
 *
 * Needs carry when they are wanted and, for things, whether the project would
 * take them as a gift, on loan, or both (campaigns.create neededFrom,
 * neededUntil, acceptsGift, acceptsLoan, workMode).
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import SEO, { pageSEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lock, 
  MapPin, 
  Tractor, 
  Users, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  Video,
  FileText,
  Lightbulb,
  Mountain,
  Droplets,
  TreePine,
  Home,
  Wheat,
  Sun,
  Wind,
  Waves,
  Target,
  Calculator,
  Sparkles,
  Check,
  Info,
  Package,
  Wrench,
  Building,
  Car,
  Hammer,
  Leaf,
  Heart,
  Brain,
  Megaphone,
  Code,
  PenTool,
  Shield,
  BookOpen,
  Coins,
  HelpCircle,
  Sprout,
  ChevronsUpDown,
  Calendar,
  Camera,
  Laptop,
  Compass,
  Palette,
  HeartPulse,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  CAPITAL_TYPES,
  CAPITAL_LABELS,
  CONTRIBUTION_CATEGORIES,
  ROLE_TEMPLATES_BY_CAPITAL,
  NEED_KINDS,
  categoryForKey,
  type CapitalType,
  type NeedKind,
  type RoleTemplate,
} from '@shared/crowdpoolingTaxonomy';
import {
  STEP_TIPS,
  valuationForRole,
  valuationForLand,
  valuationBandForValue,
  type ValuationBand,
  type CoachNeedInput,
} from '@shared/crowdpoolCoach';
// Navigation is rendered globally in App.tsx
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CAMPAIGN_TEMPLATES } from '@/data/campaignTemplates';
import { MAX_ROLE_HOURS, fullTimeLabel } from "@shared/roleCapacity";
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { estimateLandPrice, estimateEquipmentPrice, suggestHourlyRate, EQUIPMENT_BASE_PRICES, ROLE_SKILL_LEVELS } from '@/data/regionalCostData';
import { BackButton } from "@/components/BackButton";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cdnImg } from "@/lib/utils";
import { CapitalBalanceMeter } from '@/components/crowdpool/CapitalBalanceMeter';
import { TeachingTip } from '@/components/crowdpool/TeachingTip';
import { DesignCompanion, type CompanionSuggestion } from '@/components/crowdpool/DesignCompanion';
import { EligibilityQuiz, partnerForRecommendation } from '@/components/crowdpool/EligibilityQuiz';
import { moneySharePct, moneyShareNote, suggestedMoneyAsk } from '@shared/campaignProgress';
import { roleTimeLine, thingWindowLine } from '@shared/crowdpoolNeedAction';
import { MONEY_STEP, NEED_FORM } from '@shared/crowdpoolCopy';
import { CASH_SHARE } from '@shared/crowdpoolModel';
// The server's own route check (pure, no server dependencies), run here so a
// mistyped link is caught before the campaign is sent. The server runs it again.
import { validateRouteUrl, type RoutePartner } from '../../../server/lib/partner-links';

// Types
type WorkMode = 'on_site' | 'remote' | 'either';

/** When a thing is needed and how it may come. Dates are 'YYYY-MM-DD'. */
interface ThingTerms {
  neededFrom?: string;
  neededUntil?: string;
  acceptsGift?: boolean;
  acceptsLoan?: boolean;
}

interface LandRequirement {
  id: string;
  hectares: number;
  regions: string[];
  features: string[];
  description: string;
  videoUrl: string;
  estimatedValue: number;
  customValue: number | null;
}

interface EquipmentItem extends ThingTerms {
  id: string;
  category: string;
  name: string;
  quantity: number;
  description: string;
  estimatedValue: number;
  customValue: number | null;
}

interface RoleRequirement {
  id: string;
  title: string;
  category: string;
  /** Which of the 9 capitals this role feeds. Set from the template; custom roles default to experiential. */
  capitalType?: CapitalType;
  description: string;
  hoursPerWeek: number;
  weeksNeeded: number;
  hourlyRate: number;
  estimatedValue: number;
  customValue: number | null;
  /** 'YYYY-MM-DD'. With it the role card shows when it ends and the hours in all. */
  startsOn?: string;
  workMode?: WorkMode;
}

interface OtherNeed extends ThingTerms {
  id: string;
  category: string;
  /** Capital + need kind carried from the taxonomy category. */
  capitalType?: CapitalType;
  kind?: NeedKind;
  title: string;
  description: string;
  estimatedValue: number;
  customValue: number | null;
  /** Knowledge sessions: where they happen. */
  workMode?: WorkMode;
}

// Constants
const LAND_FEATURES = [
  { id: 'water', label: 'Water Access', icon: Droplets, description: 'Rivers, streams, or wells' },
  { id: 'hills', label: 'Hills/Elevation', icon: Mountain, description: 'Varied terrain' },
  { id: 'ocean', label: 'Ocean Access', icon: Waves, description: 'Coastal property' },
  { id: 'farmland', label: 'Farmland', icon: Wheat, description: 'Arable soil' },
  { id: 'forest', label: 'Forest', icon: TreePine, description: 'Existing trees' },
  { id: 'solar', label: 'Solar Potential', icon: Sun, description: 'Good sun exposure' },
  { id: 'wind', label: 'Wind Potential', icon: Wind, description: 'Wind energy viable' },
  { id: 'buildings', label: 'Existing Buildings', icon: Home, description: 'Structures on site' },
  { id: 'road', label: 'Road Access', icon: Car, description: 'Accessible by road' },
  { id: 'permits', label: 'Building Permits', icon: FileText, description: 'Permits available or obtained' },
  { id: 'raw', label: 'Raw Land', icon: Leaf, description: 'Undeveloped land' },
  { id: 'renovation', label: 'Renovating Existing Buildings', icon: Hammer, description: 'Buildings need renovation' },
  { id: 'dwelling', label: 'Existing Dwelling Spaces', icon: Home, description: 'Ready-to-use living spaces' },
  { id: 'business', label: 'Operational Business', icon: Building, description: 'Active business on property' },
];

const REGIONS = [
  'North America - Pacific Northwest',
  'North America - Southwest',
  'North America - Southeast',
  'North America - Northeast',
  'North America - Midwest',
  'Central America - Costa Rica',
  'Central America - Guatemala',
  'Central America - Panama',
  'South America - Brazil',
  'South America - Colombia',
  'South America - Ecuador',
  'South America - Peru',
  'Europe - Portugal',
  'Europe - Spain',
  'Europe - France',
  'Europe - Italy',
  'Europe - Greece',
  'Europe - Eastern Europe',
  'Europe - Scandinavia',
  'Africa - Morocco',
  'Africa - Kenya',
  'Africa - South Africa',
  'Asia - Thailand',
  'Asia - Bali/Indonesia',
  'Asia - Philippines',
  'Asia - India',
  'Oceania - Australia',
  'Oceania - New Zealand',
  'Other / Flexible',
];

const EQUIPMENT_TEMPLATES = [
  { category: 'Agriculture', items: [
    { name: 'Tractor (Small)', estimatedValue: 25000 },
    { name: 'Tractor (Medium)', estimatedValue: 45000 },
    { name: 'Tractor (Large)', estimatedValue: 85000 },
    { name: 'Irrigation System', estimatedValue: 15000 },
    { name: 'Greenhouse (Small)', estimatedValue: 8000 },
    { name: 'Greenhouse (Large)', estimatedValue: 25000 },
    { name: 'Seeds & Seedlings Starter Kit', estimatedValue: 5000 },
    { name: 'Composting System', estimatedValue: 3000 },
    { name: 'Tool Shed with Basic Tools', estimatedValue: 5000 },
  ]},
  { category: 'Vehicles', items: [
    { name: 'Pickup Truck', estimatedValue: 35000 },
    { name: 'Utility Vehicle (UTV)', estimatedValue: 15000 },
    { name: 'Van (Cargo)', estimatedValue: 30000 },
    { name: 'Bus (Community)', estimatedValue: 45000 },
    { name: 'Electric Golf Cart', estimatedValue: 8000 },
  ]},
  { category: 'Construction', items: [
    { name: 'Excavator (Mini)', estimatedValue: 35000 },
    { name: 'Concrete Mixer', estimatedValue: 5000 },
    { name: 'Power Tools Set', estimatedValue: 3000 },
    { name: 'Scaffolding System', estimatedValue: 4000 },
    { name: 'Generator (Backup)', estimatedValue: 5000 },
  ]},
  { category: 'Energy', items: [
    { name: 'Solar Panel System (5kW)', estimatedValue: 15000 },
    { name: 'Solar Panel System (10kW)', estimatedValue: 25000 },
    { name: 'Solar Panel System (25kW)', estimatedValue: 50000 },
    { name: 'Battery Storage System', estimatedValue: 20000 },
    { name: 'Wind Turbine (Small)', estimatedValue: 15000 },
  ]},
  { category: 'Water', items: [
    { name: 'Well Drilling', estimatedValue: 15000 },
    { name: 'Water Filtration System', estimatedValue: 8000 },
    { name: 'Rainwater Harvesting System', estimatedValue: 5000 },
    { name: 'Water Storage Tanks', estimatedValue: 3000 },
  ]},
  { category: 'Community', items: [
    { name: 'Commercial Kitchen Equipment', estimatedValue: 25000 },
    { name: 'Laundry Facilities', estimatedValue: 10000 },
    { name: 'Workshop Equipment', estimatedValue: 15000 },
    { name: 'Office/Coworking Setup', estimatedValue: 10000 },
  ]},
];

// Role templates now come from the shared taxonomy (ROLE_TEMPLATES_BY_CAPITAL),
// grouped by the capital each role feeds. The old flat ROLE_TEMPLATES list is gone.

// Maps taxonomy icon names (strings) to the actual lucide components.
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TreePine,
  Coins,
  Car,
  Tractor,
  Wrench,
  Hammer,
  Laptop,
  Home,
  Sprout,
  BookOpen,
  Compass,
  Users,
  Palette,
  Sparkles,
  HeartPulse,
  Package,
};

// The Other Needs picker: every taxonomy category except land (its own step)
// and crypto (money is never a need: the Money step holds the money ask).
const WIZARD_NEED_CATEGORIES = CONTRIBUTION_CATEGORIES.filter(
  (c) => c.key !== 'land' && c.key !== 'crypto' && c.kind !== 'crypto' && c.kind !== 'financial_link'
);

// Other Needs categories a project would usually take on loan as well as a
// gift: equipment and vehicles. Every other thing starts as a gift only.
const LOANABLE_NEED_CATEGORIES = ['vehicles', 'farming', 'tools'];

// Which teaching tip belongs at the top of each wizard step. Photos has none,
// and the Money step carries its own intro (the coach's old financial tip
// described crypto tracked here, which this step no longer does).
const STEP_TIP_KEYS: (string | null)[] = [
  'land',       // 0 Land
  'equipment',  // 1 Equipment
  'roles',      // 2 Roles
  'otherNeeds', // 3 Other Needs
  null,         // 4 Photos
  null,         // 5 Money
];

const isCapitalType = (value: unknown): value is CapitalType =>
  typeof value === 'string' && (CAPITAL_TYPES as readonly string[]).includes(value);

const isNeedKind = (value: unknown): value is NeedKind =>
  typeof value === 'string' && (NEED_KINDS as readonly string[]).includes(value);

// Picks a sensible Other Needs category key for a capital, so a coach-added
// need shows a matching icon. Falls back to "other".
const otherNeedCategoryForCapital = (capital: CapitalType): string =>
  WIZARD_NEED_CATEGORIES.find((c) => c.capital === capital)?.key ?? 'other';

// Currency options
const currencies = [
  // Major currencies
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  // Americas
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'CO$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon' },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba' },
  { code: 'PAB', symbol: 'B/', name: 'Panamanian Balboa' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad Dollar' },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano' },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani' },
  // Europe
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona' },
  { code: 'RSD', symbol: 'din', name: 'Serbian Dinar' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  // Asia & Pacific
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip' },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik' },
  { code: 'KZT', symbol: '₸', name: 'Kazakh Tenge' },
  { code: 'UZS', symbol: 'сўм', name: 'Uzbek Som' },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar' },
  // Middle East
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'MAD', symbol: 'د.م', name: 'Moroccan Dirham' },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar' },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
  { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
  // Crypto-adjacent / stablecoins (for regenerative projects)
  { code: 'SEEDS', symbol: 'Ŝ', name: 'SEEDS' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin' },
  { code: 'USDT', symbol: 'USDT', name: 'Tether' },
  { code: 'DAI', symbol: 'DAI', name: 'Dai Stablecoin' },
  { code: 'BTC', symbol: '₿', name: 'Bitcoin' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum' },
];

// Helper functions
/** Whole hours a week for a role: rounded, at least 1, at most MAX_ROLE_HOURS. */
function wholeRoleHours(raw: string | number): number {
  const n = Math.round(Number(raw) || 0);
  return Math.min(MAX_ROLE_HOURS, Math.max(1, n));
}

const generateId = () => Math.random().toString(36).substring(2, 9);

/** 'YYYY-MM-DD' plus n days, in UTC so no timezone shifts the date. */
export function addDaysToDay(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** A role's start and end, from its start date and weeks. */
function roleWindow(role: RoleRequirement): { neededFrom?: string; neededUntil?: string } {
  if (!role.startsOn) return {};
  const weeks = Math.max(1, Math.round(role.weeksNeeded || 0));
  return { neededFrom: role.startsOn, neededUntil: addDaysToDay(role.startsOn, weeks * 7) };
}

/** The summary a thing row shows: "Needed 1 Mar to 30 Jun. Give or lend." */
function thingSummary(t: ThingTerms, defaultLoan: boolean): string | null {
  return thingWindowLine({
    kind: 'item',
    neededFrom: t.neededFrom || null,
    neededUntil: t.neededUntil || null,
    acceptsGift: t.acceptsGift ?? true,
    acceptsLoan: t.acceptsLoan ?? defaultLoan,
  });
}

function workModeLabel(mode: WorkMode): string {
  return mode === 'remote' ? NEED_FORM.remote : mode === 'either' ? NEED_FORM.either : NEED_FORM.onTheLand;
}

/** The money choice the Money step requires before sending. */
export type MoneyChoice = 'money' | 'none';

const formatCurrency = (amount: number, symbol: string) => {
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
};

// Using imported estimateLandPrice from regionalCostData

export default function CreateCampaign() {
  const { user } = useAuth();

  // Applicant search for campaign creation
  const [applicantSearch, setApplicantSearch] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const { data: applicants, isLoading: applicantsLoading } = trpc.applicantsForCampaign.list.useQuery(
    { search: applicantSearch },
    { enabled: !!user }
  );
  
  // Fetch user's own applications for quick access
  const { data: userApplications } = trpc.applications.myApplications.useQuery(
    undefined,
    { enabled: !!user }
  );
  // The server starts a campaign only for an application that is approved
  // or active (campaigns.create). Offer those; name the ones still in review.
  const campaignReadyApps = (userApplications ?? []).filter((app: any) => ['approved', 'active'].includes(app.status));
  const appsInReview = (userApplications ?? []).filter((app: any) => ['submitted', 'under_review'].includes(app.status));
  
  // Campaign data
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [daoLink, setDaoLink] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  
  // Application data fields (from project application)
  const [projectLocation, setProjectLocation] = useState('');
  const [projectVision, setProjectVision] = useState('');
  const [landStatus, setLandStatus] = useState('');
  const [projectSizeHectares, setProjectSizeHectares] = useState<number | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [teamDescription, setTeamDescription] = useState('');
  const [regenerativePractices, setRegenerativePractices] = useState('');
  const [governanceApproach, setGovernanceApproach] = useState('');
  const [communityEngagement, setCommunityEngagement] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const currencySymbol = currencies.find(c => c.code === currency)?.symbol || '$';
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Land', 'Equipment', 'Roles', 'Other Needs', 'Photos', MONEY_STEP.stepLabel];
  
  // Land requirements
  const [landRequirements, setLandRequirements] = useState<LandRequirement[]>([]);
  const [showLandForm, setShowLandForm] = useState(false);
  const [editingLand, setEditingLand] = useState<LandRequirement | null>(null);
  
  // Equipment
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  
  // Roles
  const [roles, setRoles] = useState<RoleRequirement[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRequirement | null>(null);
  
  // Other needs
  const [otherNeeds, setOtherNeeds] = useState<OtherNeed[]>([]);
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [editingOther, setEditingOther] = useState<OtherNeed | null>(null);
  
  // Money: an explicit choice, then an amount when the project asks for money.
  const [moneyChoice, setMoneyChoice] = useState<MoneyChoice | null>(null);
  const [financialTarget, setFinancialTarget] = useState(0);
  const [moneyError, setMoneyError] = useState<string | null>(null);
  const [maEarthUrl, setMaEarthUrl] = useState('');
  const [stewardUrl, setStewardUrl] = useState('');
  const [routeErrors, setRouteErrors] = useState<Partial<Record<RoutePartner, string>>>({});
  const moneyChoiceRef = useRef<HTMLDivElement>(null);
  const [durationDays, setDurationDays] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The soft money-share band (guidance only; nothing blocks on it).
  const { data: crowdpoolSettings } = trpc.campaigns.crowdpoolSettings.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const moneyBand = crowdpoolSettings?.moneyShare ?? CASH_SHARE;

  // tRPC mutation for creating campaign
  const createCampaignMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success('Campaign created successfully!');
      // The project page, focused on the new campaign, at the steward tools.
      window.location.href = `${data.path}#steward-tools`;
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
      setIsSubmitting(false);
    },
  });
  
  // Calculate totals
  const landTotal = useMemo(() => 
    landRequirements.reduce((sum, l) => sum + (l.customValue ?? l.estimatedValue), 0),
    [landRequirements]
  );
  
  const equipmentTotal = useMemo(() => 
    equipment.reduce((sum, e) => sum + ((e.customValue ?? e.estimatedValue) * e.quantity), 0),
    [equipment]
  );
  
  const rolesTotal = useMemo(() => 
    roles.reduce((sum, r) => sum + ((r.customValue ?? r.estimatedValue)), 0),
    [roles]
  );
  
  const otherTotal = useMemo(() => 
    otherNeeds.reduce((sum, o) => sum + (o.customValue ?? o.estimatedValue), 0),
    [otherNeeds]
  );
  
  // The in-kind ask: everything listed in the need steps. Money is separate.
  const grandTotal = landTotal + equipmentTotal + rolesTotal + otherTotal;
  const moneyAsk = moneyChoice === 'money' ? financialTarget : 0;

  // The live needs array the capital coach reads: every item mapped to its
  // capital, kind, title, and current value. Powers the balance meter and the
  // design companion, and updates as needs are added across every step.
  const draftNeeds = useMemo<Array<CoachNeedInput & { title: string }>>(() => [
    ...landRequirements.map((l) => ({
      title: `${l.hectares} hectares${l.regions[0] ? ` in ${l.regions[0]}` : ''}`.trim(),
      capitalType: 'living' as CapitalType,
      kind: 'item',
      estimatedValue: l.customValue ?? l.estimatedValue,
    })),
    ...equipment.map((e) => ({
      title: e.name || 'Equipment',
      capitalType: 'material' as CapitalType,
      kind: 'item',
      estimatedValue: (e.customValue ?? e.estimatedValue) * e.quantity,
    })),
    ...roles.map((r) => ({
      title: r.title || 'Role',
      capitalType: (r.capitalType ?? 'experiential') as CapitalType,
      kind: 'role',
      estimatedValue: r.customValue ?? r.estimatedValue,
    })),
    ...otherNeeds.map((o) => {
      const cat = categoryForKey(o.category);
      return {
        title: o.title || cat?.label || 'Need',
        capitalType: (o.capitalType ?? cat?.capital ?? 'material') as CapitalType,
        kind: (o.kind ?? cat?.kind ?? 'item') as string,
        estimatedValue: o.customValue ?? o.estimatedValue,
      };
    }),
  ], [landRequirements, equipment, roles, otherNeeds]);

  // Region hint for fair-value bands: prefer the first land region, else the
  // project location. The coach matches loosely, so either form is fine.
  const coachRegion = landRequirements[0]?.regions?.[0] || projectLocation || '';

  // Adds a coach suggestion to the right wizard list. A role/shift becomes a
  // role; everything else becomes an other-need. Never auto-called; it only
  // fires when the builder taps "Add" in the panel.
  const handleAddSuggestion = useCallback((s: CompanionSuggestion) => {
    if (s.kind === 'role' || s.kind === 'shift') {
      const hoursPerWeek = Math.max(1, Math.round(s.hoursPerWeek ?? 5));
      const weeksNeeded = Math.max(1, Math.round(s.weeks ?? 52));
      const hourlyRate =
        s.estimatedValue > 0
          ? Math.max(1, Math.round(s.estimatedValue / (hoursPerWeek * weeksNeeded)))
          : 30;
      const capital = isCapitalType(s.capitalType) ? s.capitalType : 'experiential';
      setRoles((prev) => [
        ...prev,
        {
          id: generateId(),
          title: s.title,
          category: CAPITAL_LABELS[capital].label,
          capitalType: capital,
          description: s.rationale || '',
          hoursPerWeek,
          weeksNeeded,
          hourlyRate,
          estimatedValue: hoursPerWeek * weeksNeeded * hourlyRate,
          customValue: null,
        },
      ]);
    } else {
      const capital = isCapitalType(s.capitalType) ? s.capitalType : 'material';
      const suggested = isNeedKind(s.kind) ? s.kind : 'item';
      // Money is never a need; the Money step holds the money ask.
      if (suggested === 'crypto' || suggested === 'financial_link') {
        toast.info(MONEY_STEP.notANeed);
        return;
      }
      // A thing to borrow is an item that takes loans (never kind 'loan' for new needs).
      const lend = suggested === 'loan';
      setOtherNeeds((prev) => [
        ...prev,
        {
          id: generateId(),
          category: otherNeedCategoryForCapital(capital),
          capitalType: capital,
          kind: lend ? 'item' : suggested,
          title: s.title,
          description: s.rationale || '',
          estimatedValue: Math.max(0, Math.round(s.estimatedValue || 0)),
          customValue: null,
          ...(lend ? { acceptsGift: false, acceptsLoan: true } : {}),
        },
      ]);
    }
    toast.success(`Added "${s.title}" to your campaign`);
  }, []);

  // Handle campaign submission
  const handleSubmitCampaign = async () => {
    if (!campaignName || !campaignDescription) {
      toast.error('Please provide a campaign name and description');
      return;
    }
    
    if (!daoLink) {
      toast.error('Please provide your DAO link for proposal submissions');
      return;
    }
    
    if (landRequirements.length === 0 && equipment.length === 0 && roles.length === 0 && otherNeeds.length === 0) {
      toast.error('Please add at least one need to your campaign');
      return;
    }

    // Money needs an explicit choice. Nothing is filled in for the project.
    const showMoneyError = (message: string) => {
      setMoneyError(message);
      setCurrentStep(5);
      // The Create button only shows on the Money step, so the choice is on screen to scroll to.
      moneyChoiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (moneyChoice === null) {
      showMoneyError(MONEY_STEP.chooseOne);
      return;
    }
    if (moneyChoice === 'money' && !(financialTarget > 0)) {
      showMoneyError(MONEY_STEP.addAmount);
      return;
    }
    setMoneyError(null);

    // Money routes, checked the way the server checks them.
    const moneyRoutes: Array<{ partner: RoutePartner; url: string }> = [];
    if (moneyChoice === 'money') {
      const errors: Partial<Record<RoutePartner, string>> = {};
      for (const [partner, raw] of [['maearth', maEarthUrl], ['gosteward', stewardUrl]] as const) {
        if (!raw.trim()) continue;
        const checked = validateRouteUrl(partner, raw);
        if (checked.ok) moneyRoutes.push({ partner, url: checked.url });
        else errors[partner] = checked.message;
      }
      setRouteErrors(errors);
      if (Object.keys(errors).length > 0) {
        setCurrentStep(5);
        const first = errors.maearth ? 'route-maearth' : 'route-gosteward';
        document.getElementById(first)?.focus();
        return;
      }
    }

    // A need window can't end before it starts (the server says the same).
    const endsEarly = [...equipment, ...otherNeeds].some((t) => t.neededFrom && t.neededUntil && t.neededUntil < t.neededFrom);
    if (endsEarly) {
      toast.error(NEED_FORM.endsBeforeStart);
      return;
    }

    setIsSubmitting(true);
    
    // Prepare campaign items. Every item carries kind + capitalType from the
    // shared taxonomy so the needs registry can group by capital.
    const items = [
      // Land items
      ...landRequirements.map(land => ({
        category: 'land' as const,
        kind: 'item' as const,
        capitalType: 'living' as const,
        hectares: land.hectares,
        region: land.regions[0] || '',
        features: land.features,
        videoUrl: land.videoUrl,
        landDescription: land.description,
        estimatedValue: land.customValue ?? land.estimatedValue,
      })),
      // Equipment items: when they are needed, and gift, loan or both
      ...equipment.map(eq => ({
        category: 'equipment' as const,
        kind: 'item' as const,
        capitalType: 'material' as const,
        equipmentName: eq.name,
        equipmentQuantity: eq.quantity,
        equipmentCategory: eq.category,
        estimatedValue: (eq.customValue ?? eq.estimatedValue) * eq.quantity,
        neededFrom: eq.neededFrom || undefined,
        neededUntil: eq.neededUntil || undefined,
        acceptsGift: eq.acceptsGift ?? true,
        acceptsLoan: eq.acceptsLoan ?? false,
      })),
      // Role items: capital comes from the template, custom roles default to experiential
      ...roles.map(role => ({
        category: 'role' as const,
        kind: 'role' as const,
        capitalType: role.capitalType ?? ('experiential' as const),
        roleTitle: role.title,
        // Whole hours a week the role needs (the server requires 1 to 10000).
        hoursPerWeek: Math.min(MAX_ROLE_HOURS, Math.max(1, Math.round(role.hoursPerWeek || 0))),
        durationMonths: Math.round((role.weeksNeeded || 0) / 4.33), // Convert weeks to months
        roleDescription: role.description,
        estimatedValue: role.customValue ?? role.estimatedValue,
        // A start date gives the role card its end date and hours in all.
        ...roleWindow(role),
        workMode: role.workMode ?? ('on_site' as const),
      })),
      // Other needs: kind + capital carried from the taxonomy category
      ...otherNeeds.map(need => {
        const cat = categoryForKey(need.category);
        const kind = need.kind ?? cat?.kind ?? ('item' as const);
        return {
          category: 'resource' as const,
          kind,
          capitalType: need.capitalType ?? cat?.capital ?? ('material' as const),
          resourceName: need.title,
          resourceQuantity: 1,
          resourceUnit: need.category,
          resourceDescription: need.description,
          estimatedValue: need.customValue ?? need.estimatedValue,
          // Things: when, and gift, loan or both. Knowledge: where it happens.
          ...(kind === 'item'
            ? {
                neededFrom: need.neededFrom || undefined,
                neededUntil: need.neededUntil || undefined,
                acceptsGift: need.acceptsGift ?? true,
                acceptsLoan: need.acceptsLoan ?? LOANABLE_NEED_CATEGORIES.includes(need.category),
              }
            : {}),
          ...(kind === 'knowledge' ? { workMode: need.workMode ?? ('either' as const) } : {}),
        };
      }),
    ];
    
    // Submit campaign with all rich project data
    createCampaignMutation.mutate({
      title: campaignName,
      description: campaignDescription,
      projectName: campaignName,
      location: projectLocation || landRequirements[0]?.regions?.[0] || undefined,
      // No money sends 0. There is no default share filled in for the project.
      financialTarget: moneyAsk,
      currency,
      applicationId: selectedApplication?.id,
      vision: projectVision || undefined,
      landStatus: landStatus || undefined,
      landSize: projectSizeHectares ? `${projectSizeHectares} hectares` : undefined,
      teamSize: teamSize || undefined,
      teamDescription: teamDescription || undefined,
      regenerativePractices: regenerativePractices || undefined,
      governanceModel: governanceApproach || undefined,
      communityEngagement: communityEngagement || undefined,
      websiteUrl: websiteUrl || undefined,
      videoUrl: videoUrl || undefined,
      daoLink: daoLink || undefined,
      durationDays,
      items,
      ...(moneyRoutes.length > 0 ? { moneyRoutes } : {}),
    });
  };
  
  // Auto-populate from selected application
  const handleSelectApplication = useCallback((app: any) => {
    setSelectedApplication(app);
    setCampaignName(app.projectName || '');
    setCampaignDescription(app.vision || '');
    setProjectLocation(app.location || '');
    setProjectVision(app.vision || '');
    setLandStatus(app.landStatus || '');
    setProjectSizeHectares(app.projectSizeHectares ? parseFloat(app.projectSizeHectares) : null);
    setTeamSize(app.teamSize || null);
    setTeamDescription(app.teamDescription || '');
    setRegenerativePractices(app.regenerativePractices || '');
    setGovernanceApproach(app.governanceModel || app.governanceApproach || '');
    setCommunityEngagement(app.communityEngagement || '');
    setWebsiteUrl(app.websiteUrl || '');
    setVideoUrl(app.videoUrl || '');
    toast.success(`Project "${app.projectName}" loaded! Review and customize your campaign details.`);
  }, []);

  // Every hook above runs on every render. The sign-in gate sits here, after
  // the last hook: returning before the hooks (as this page used to, twice)
  // made React throw "Rendered more hooks than during the previous render"
  // the moment auth resolved. The old shared-password gate is gone; the
  // server checks that the caller stewards an approved application.
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 text-center">
          <Lock className="w-10 h-10 text-[#1a472a] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
            Sign In Required
          </h2>
          <p className="text-sm text-[#1a472a]/80 mb-4">You need to be signed in to create campaigns.</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-[#4a7c59] hover:bg-[#1a472a] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Project selection screen (replaces password)
  if (!selectedApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7f0] to-[#f0f7f0]">
        <BackButton />
        
        {/* Hero Image */}
        <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden">
          <img
            src={cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")}
            alt="Crowd Pooling - Create your campaign"
            className="w-full h-full object-cover object-center"
            width={1200}
            height={350}
            loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f0f7f0] via-transparent to-transparent" />
        </div>

        <div className="container py-8 -mt-12 relative z-10">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-[#7dd87d]/30">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7dd87d]/20 mb-4">
                  <Sparkles className="w-8 h-8 text-[#4a7c59]" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                  Create Your Campaign
                </h1>
                <p className="text-[#1a472a]/75 mt-2 max-w-md mx-auto">
                  Select your project from the list of season applicants. Your application data will be automatically loaded into the campaign.
                </p>
              </div>

              {/* Search */}
              <div className="mb-4">
                <Input
                  value={applicantSearch}
                  onChange={(e) => setApplicantSearch(e.target.value)}
                  placeholder="Search by project name, contact, or location..."
                  className="bg-white border-[#7dd87d]/30"
                />
              </div>

              {/* Your Applications (quick access) */}
              {user && appsInReview.length > 0 && (
                <div className="mb-4 rounded-xl bg-[#f0f7f0] border border-[#7dd87d]/30 p-3 text-sm text-[#1a472a]/85">
                  {appsInReview.map((app: any) => app.projectName).join(', ')}{' '}
                  {appsInReview.length === 1 ? 'is' : 'are'} still in review. You can start a campaign once the application is approved.
                </div>
              )}
              {user && campaignReadyApps.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#4a7c59] uppercase tracking-wider mb-2">Your Applications</p>
                  <div className="space-y-2">
                    {campaignReadyApps
                      .map((app: any) => (
                        <button
                          key={`my-${app.id}`}
                          onClick={() => handleSelectApplication(app)}
                          className="w-full p-4 text-left bg-[#f0f7f0] hover:bg-[#d4edda] rounded-xl border-2 border-[#7dd87d]/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-[#1a472a] group-hover:text-[#1a472a]">{app.projectName}</div>
                              <div className="text-xs text-[#1a472a]/80 mt-1">
                                {app.location} {app.projectType === 'early_stage' ? '(Early Stage)' : '(Mature)'}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#4a7c59] group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {user && campaignReadyApps.length > 0 && applicants && applicants.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#7dd87d]/30" />
                  <span className="text-xs text-[#1a472a]/80">or select from all applicants</span>
                  <div className="flex-1 h-px bg-[#7dd87d]/30" />
                </div>
              )}

              {/* All Applicants */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {applicantsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#7dd87d]/30 border-t-[#4a7c59] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-[#1a472a]/80">Loading applicants...</p>
                  </div>
                ) : applicants && applicants.length > 0 ? (
                  applicants
                    .filter((app: any) => {
                      // Exclude user's own apps (already shown above)
                      return !campaignReadyApps.some((ua: any) => ua.id === app.id);
                    })
                    .map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => handleSelectApplication(app)}
                        className="w-full p-4 text-left bg-white hover:bg-[#f0f7f0] rounded-xl border border-[#7dd87d]/30 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#1a472a] group-hover:text-[#1a472a] truncate">{app.projectName}</div>
                            <div className="text-xs text-[#1a472a]/80 mt-1 truncate">
                              {app.location}
                            </div>
                            {app.vision && (
                              <p className="text-xs text-[#1a472a]/80 mt-1 line-clamp-2">{app.vision}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-[#4a7c59] flex-shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#1a472a]/80">
                      {applicantSearch ? 'No projects match your search.' : 'No applicants available yet.'}
                    </p>
                    <p className="text-xs text-[#1a472a]/80 mt-2">
                      Projects must first apply for the current season at <a href="/apply" className="text-[#4a7c59] underline">/apply</a> before creating a campaign.
                    </p>
                  </div>
                )}
              </div>

              {!user && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-[#1a472a]/80 mb-3">
                    Please sign in to access the campaign creator.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/api/oauth/login'}
                    className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main campaign creator
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7f0] to-[#f0f7f0]">
      <SEO {...pageSEO.createCampaign} />
      
      {/* Hero Image */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
        <img
          src={cdnImg("https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg")}
          alt="Crowd Pooling - We don't need as much money as we think we do!"
          className="w-full h-full object-cover object-center"
          width={1200}
          height={400}
          loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f0f7f0] via-transparent to-transparent" />
      </div>
      
      <div className="container py-8 -mt-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#7dd87d]/30">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Create Your Crowd Pooling Campaign
          </h1>
          <p className="text-[#1a472a]/75 max-w-2xl mx-auto mb-4">
            We don't need as much money as we think we do! Pool diverse forms of capital from your community: land, equipment, roles, skills, and more. Skip straight to what your project actually needs to launch.
          </p>
          <p className="text-sm text-[#4a7c59] max-w-xl mx-auto">
            List everything your project needs to succeed. We'll help you estimate values and create a compelling campaign that attracts contributors who can offer more than just money.
          </p>
        </div>
        
        {/* Live Total Tracker */}
        <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-[#7dd87d]/30 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-base font-bold text-[#1a472a]">
                  <TrendingUp className="w-5 h-5 text-[#4a7c59] shrink-0" aria-hidden="true" />
                  {MONEY_STEP.inKindAsk(formatCurrency(grandTotal, currencySymbol))}
                </p>
                {moneyChoice && (
                  <p className="text-sm text-[#1a472a]/85 pl-7" data-testid="tracker-money">
                    {MONEY_STEP.moneyLine(formatCurrency(moneyAsk, currencySymbol), String(moneySharePct(grandTotal, moneyAsk)))}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-[#f0f7f0] rounded-full text-[#4a7c59]">
                Land: {formatCurrency(landTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#f0f7f0] rounded-full text-[#4a7c59]">
                Equipment: {formatCurrency(equipmentTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#f0f7f0] rounded-full text-[#4a7c59]">
                Roles: {formatCurrency(rolesTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#f0f7f0] rounded-full text-[#4a7c59]">
                Other: {formatCurrency(otherTotal, currencySymbol)}
              </span>
            </div>
          </div>
          {/* Capital balance meter: live read of how many of the nine forms are covered */}
          <div className="mt-3 pt-3 border-t border-[#7dd87d]/20">
            <CapitalBalanceMeter needs={draftNeeds} />
            <TeachingTip text={STEP_TIPS.capitals} className="mt-2" />
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-[#7dd87d]/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Campaign Details
            </h2>
            <div className="flex gap-2">
            {/* Template Selector */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#d4a017] text-[#d4a017] text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose a Campaign Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-[#1a472a]/75">
                    Start with a pre-filled template for common project types:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {CAMPAIGN_TEMPLATES.map((template) => {
                      const IconComponent = template.icon === 'home' ? Home : template.icon === 'tree' ? TreePine : Wheat;
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            // Load template data
                            setCampaignName(template.name);
                            setCampaignDescription(template.description);
                            
                            // Load land
                            const landId = generateId();
                            setLandRequirements([{
                              id: landId,
                              hectares: template.land.hectares,
                              regions: template.land.regions,
                              features: template.land.features,
                              description: template.land.description,
                              videoUrl: '',
                              estimatedValue: estimateLandPrice(template.land.hectares, template.land.regions),
                              customValue: null
                            }]);
                            
                            // Load equipment: equipment templates take a gift or a loan
                            setEquipment(template.equipment.map(eq => ({
                              ...eq,
                              id: generateId(),
                              customValue: null,
                              acceptsGift: true,
                              acceptsLoan: true,
                            })));
                            
                            // Load roles
                            setRoles(template.roles.map(role => ({
                              ...role,
                              id: generateId(),
                              estimatedValue: role.hoursPerWeek * role.weeksNeeded * role.hourlyRate,
                              customValue: null
                            })));
                            
                            // Load other needs
                            setOtherNeeds(template.otherNeeds.map(need => ({
                              ...need,
                              id: generateId(),
                              customValue: null
                            })));
                            
                            setShowTemplateDialog(false);
                            toast.success(`${template.name} template loaded! Customize as needed.`);
                          }}
                          className="flex flex-col items-start gap-3 p-4 bg-gradient-to-br from-[#f0f7f0] to-white rounded-xl border-2 border-[#7dd87d]/30 hover:border-[#d4a017] transition-all text-left group"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#d4a017]/20 transition-colors">
                            <IconComponent className="w-6 h-6 text-[#4a7c59] group-hover:text-[#d4a017]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1a472a] mb-1">{template.name}</h3>
                            <p className="text-xs text-[#1a472a]/80 leading-relaxed">{template.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-[#f0f7f0] text-[#4a7c59] rounded-full">
                              {template.equipment.length} equipment items
                            </span>
                            <span className="px-2 py-1 bg-[#f0f7f0] text-[#4a7c59] rounded-full">
                              {template.roles.length} roles
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {user && userApplications && userApplications.length > 0 && (
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#7dd87d] text-[#4a7c59] text-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Import from Application
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Import from Application</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    <p className="text-sm text-[#1a472a]/75">
                      Select an application to pre-fill your campaign details:
                    </p>
                    {userApplications.map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => {
                          // Import application data
                          setCampaignName(app.projectName || '');
                          setCampaignDescription(app.vision || '');
                          setProjectLocation(app.location || '');
                          setProjectVision(app.vision || '');
                          setLandStatus(app.landStatus || '');
                          setProjectSizeHectares(app.projectSizeHectares || null);
                          setTeamSize(app.teamSize || null);
                          setTeamDescription(app.teamDescription || '');
                          setRegenerativePractices(app.regenerativePractices || '');
                          setGovernanceApproach(app.governanceApproach || '');
                          setCommunityEngagement(app.communityEngagement || '');
                          setWebsiteUrl(app.websiteUrl || '');
                          setVideoUrl(app.videoUrl || '');
                          setShowImportDialog(false);
                          toast.success('Application data imported!');
                        }}
                        className="w-full p-3 text-left bg-[#f0f7f0] hover:bg-[#f0f7f0] rounded-lg border border-[#7dd87d]/30 transition-colors"
                      >
                        <div className="font-medium text-[#1a472a]">{app.projectName}</div>
                        <div className="text-xs text-[#1a472a]/80">
                          {app.location} - {app.status}
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Campaign Name</label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Terra Nova Regenerative Farm"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Currency</label>
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currencyOpen}
                    className="w-full justify-between bg-white border-[#7dd87d]/30 text-left font-normal"
                  >
                    {(() => {
                      const c = currencies.find(c => c.code === currency);
                      return c ? `${c.symbol} ${c.name} (${c.code})` : 'Select currency...';
                    })()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search currency..." />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        {currencies.map(c => (
                          <CommandItem
                            key={c.code}
                            value={`${c.code} ${c.name} ${c.symbol}`}
                            onSelect={() => {
                              setCurrency(c.code);
                              setCurrencyOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${currency === c.code ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="font-medium mr-2">{c.symbol}</span>
                            <span>{c.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{c.code}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Description</label>
              <Textarea
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Describe your project vision and goals..."
                className="bg-white border-[#7dd87d]/30 min-h-[100px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#1a472a] mb-1">
                DAO Link for Proposals <span className="text-red-500">*</span>
              </label>
              <Input
                value={daoLink}
                onChange={(e) => setDaoLink(e.target.value)}
                placeholder="https://app.hypha.earth/en/dho/your-project/agreements/create/propose-contribution"
                className="bg-white border-[#7dd87d]/30"
              />
              <p className="text-xs text-[#1a472a]/80 mt-1">
                This is where contributors will submit their proposals. Required for listing your project.
              </p>
            </div>
            
            {/* Additional Project Info - Collapsible */}
            <div className="md:col-span-2 mt-4">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#4a7c59] hover:text-[#1a472a] flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  Additional Project Information (from application)
                </summary>
                <div className="mt-4 space-y-4 pl-6 border-l-2 border-[#7dd87d]/30">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Location</label>
                      <Input
                        value={projectLocation}
                        onChange={(e) => setProjectLocation(e.target.value)}
                        placeholder="e.g., Costa Rica, Guanacaste Province"
                        className="bg-white border-[#7dd87d]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Land Status</label>
                      <Select value={landStatus} onValueChange={setLandStatus}>
                        <SelectTrigger className="bg-white border-[#7dd87d]/30">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owned">Owned</SelectItem>
                          <SelectItem value="leased">Leased</SelectItem>
                          <SelectItem value="committed">Committed</SelectItem>
                          <SelectItem value="seeking">Seeking Land</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Project Size (hectares)</label>
                      <Input
                        type="number"
                        value={projectSizeHectares || ''}
                        onChange={(e) => setProjectSizeHectares(parseFloat(e.target.value) || null)}
                        placeholder="e.g., 150"
                        className="bg-white border-[#7dd87d]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Team Size</label>
                      <Input
                        type="number"
                        value={teamSize || ''}
                        onChange={(e) => setTeamSize(parseInt(e.target.value) || null)}
                        placeholder="e.g., 12"
                        className="bg-white border-[#7dd87d]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a472a] mb-1">Project Vision</label>
                    <Textarea
                      value={projectVision}
                      onChange={(e) => setProjectVision(e.target.value)}
                      placeholder="Describe your project's long-term vision..."
                      className="bg-white border-[#7dd87d]/30 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a472a] mb-1">Team Description</label>
                    <Textarea
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      placeholder="Describe your team's background and expertise..."
                      className="bg-white border-[#7dd87d]/30 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a472a] mb-1">Regenerative Practices</label>
                    <Textarea
                      value={regenerativePractices}
                      onChange={(e) => setRegenerativePractices(e.target.value)}
                      placeholder="What regenerative practices will you implement?"
                      className="bg-white border-[#7dd87d]/30 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a472a] mb-1">Governance Approach</label>
                    <Textarea
                      value={governanceApproach}
                      onChange={(e) => setGovernanceApproach(e.target.value)}
                      placeholder="How will decisions be made in your community?"
                      className="bg-white border-[#7dd87d]/30 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a472a] mb-1">Community Engagement</label>
                    <Textarea
                      value={communityEngagement}
                      onChange={(e) => setCommunityEngagement(e.target.value)}
                      placeholder="How do you engage with the broader community?"
                      className="bg-white border-[#7dd87d]/30 min-h-[80px]"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Website URL</label>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourproject.com"
                        className="bg-white border-[#7dd87d]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1a472a] mb-1">Video URL</label>
                      <Input
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                        className="bg-white border-[#7dd87d]/30"
                      />
                      <p className="text-xs text-[#1a472a]/75 mt-1">Supports YouTube, Vimeo, Dailymotion, Wistia, Loom, and direct .mp4 links</p>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
        
        {/* Step Navigation - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          {steps.map((step, index) => (
            <button
              key={step}
              onClick={() => setCurrentStep(index)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                currentStep === index
                  ? 'bg-[#4a7c59] text-white'
                  : 'bg-white text-[#1a472a] hover:bg-[#f0f7f0] border border-[#7dd87d]/30'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                currentStep === index ? 'bg-white/20' : 'bg-[#7dd87d]/20'
              }`}>
                {index + 1}
              </span>
              <span className="truncate">{step}</span>
            </button>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30 min-h-[500px]">
          {/* Per-step teaching tip, drawn from the shared coach */}
          {STEP_TIP_KEYS[currentStep] && (
            <TeachingTip text={STEP_TIPS[STEP_TIP_KEYS[currentStep] as string]} className="mb-5" />
          )}
          {/* Step 1: Land */}
          {currentStep === 0 && (
            <LandSection
              requirements={landRequirements}
              setRequirements={setLandRequirements}
              currencySymbol={currencySymbol}
              total={landTotal}
            />
          )}
          
          {/* Step 2: Equipment */}
          {currentStep === 1 && (
            <EquipmentSection
              equipment={equipment}
              setEquipment={setEquipment}
              currencySymbol={currencySymbol}
              total={equipmentTotal}
            />
          )}
          
          {/* Step 3: Roles */}
          {currentStep === 2 && (
            <RolesSection
              roles={roles}
              setRoles={setRoles}
              currencySymbol={currencySymbol}
              total={rolesTotal}
              region={coachRegion}
            />
          )}
          
          {/* Step 4: Other Needs */}
          {currentStep === 3 && (
            <OtherNeedsSection
              needs={otherNeeds}
              setNeeds={setOtherNeeds}
              currencySymbol={currencySymbol}
              total={otherTotal}
            />
          )}
          
          {/* Step 5: Photos */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-[#f0f7f0] rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-bold text-[#1a472a] mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                  <Camera className="w-5 h-5 text-[#4a7c59]" />
                  Project Photos
                </h3>
                <p className="text-sm text-[#1a472a]/75 mb-4">
                  Add photos of your land, team, and progress to help contributors understand your project.
                  The first image will be used as your campaign cover photo.
                </p>
                <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/30">
                  <p className="text-sm text-[#1a472a]/80 mb-4">
                    You can upload photos now or add them later from your campaign management page after submission.
                    Photos help build trust and show contributors the real impact of your project.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {['Land & Property', 'Team Members', 'Progress & Construction', 'Infrastructure', 'Community Events', 'Nature & Wildlife'].map((category) => (
                      <div key={category} className="bg-[#f8f5f0] rounded-lg p-3 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-2">
                          <Camera className="w-5 h-5 text-[#4a7c59]" />
                        </div>
                        <p className="text-xs font-medium text-[#1a472a]">{category}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Tip:</strong> Photos will be available to upload after your campaign is created.
                      Go to your Campaign Management page to add photos organized by category.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 6: Money */}
          {currentStep === 5 && (
            <FinancialTargetSection
              inKindTotal={grandTotal}
              landTotal={landTotal}
              equipmentTotal={equipmentTotal}
              rolesTotal={rolesTotal}
              otherTotal={otherTotal}
              currency={currency}
              currencySymbol={currencySymbol}
              moneyChoice={moneyChoice}
              onMoneyChoice={(choice) => { setMoneyChoice(choice); setMoneyError(null); }}
              financialTarget={financialTarget}
              setFinancialTarget={(n) => { setFinancialTarget(n); setMoneyError(null); }}
              moneyError={moneyError}
              choiceRef={moneyChoiceRef}
              band={moneyBand}
              maEarthUrl={maEarthUrl}
              setMaEarthUrl={(v) => { setMaEarthUrl(v); setRouteErrors((e) => ({ ...e, maearth: undefined })); }}
              stewardUrl={stewardUrl}
              setStewardUrl={(v) => { setStewardUrl(v); setRouteErrors((e) => ({ ...e, gosteward: undefined })); }}
              routeErrors={routeErrors}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
            />
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            variant="outline"
            className="rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10"
          >
            Previous
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitCampaign}
              disabled={isSubmitting || !campaignName || !campaignDescription || !daoLink}
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          )}
        </div>
        {currentStep === steps.length - 1 && (
          <p className="text-xs text-[#1a472a]/80 mt-3 text-center">
            Your campaign will be reviewed before going live
          </p>
        )}
      </div>

      {/* Design coach: opens at any step, suggests, never blocks a launch */}
      <button
        type="button"
        onClick={() => setCompanionOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-[#4a7c59] hover:bg-[#1a472a] text-white pl-4 pr-5 py-3 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#7dd87d] focus:ring-offset-2"
        aria-label="Open the design coach"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-semibold">Design coach</span>
      </button>

      <DesignCompanion
        open={companionOpen}
        onOpenChange={setCompanionOpen}
        draft={{
          projectName: campaignName,
          location: projectLocation,
          region: coachRegion,
          vision: projectVision,
          needs: draftNeeds,
        }}
        onAddSuggestion={handleAddSuggestion}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}

// Land Section Component
function LandSection({ 
  requirements, 
  setRequirements, 
  currencySymbol, 
  total 
}: {
  requirements: LandRequirement[];
  setRequirements: React.Dispatch<React.SetStateAction<LandRequirement[]>>;
  currencySymbol: string;
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<LandRequirement>>({
    hectares: 0,
    regions: [],
    features: [],
    description: '',
    videoUrl: '',
  });
  // Fair-value band from area and a regional per-hectare price, when asked.
  const [landBand, setLandBand] = useState<ValuationBand | null>(null);

  const estimatedValue = estimateLandPrice(formData.hectares || 0, formData.regions || []);
  
  const handleAddLand = () => {
    const newLand: LandRequirement = {
      id: generateId(),
      hectares: formData.hectares || 0,
      regions: formData.regions || [],
      features: formData.features || [],
      description: formData.description || '',
      videoUrl: formData.videoUrl || '',
      estimatedValue: estimatedValue,
      customValue: null,
    };
    setRequirements([...requirements, newLand]);
    setFormData({ hectares: 0, regions: [], features: [], description: '', videoUrl: '' });
    setLandBand(null);
    setShowForm(false);
    toast.success('Land requirement added');
  };
  
  const handleRemove = (id: string) => {
    setRequirements(requirements.filter(r => r.id !== id));
    toast.success('Land requirement removed');
  };
  
  const toggleFeature = (featureId: string) => {
    const current = formData.features || [];
    if (current.includes(featureId)) {
      setFormData({ ...formData, features: current.filter(f => f !== featureId) });
    } else {
      setFormData({ ...formData, features: [...current, featureId] });
    }
  };
  
  const toggleRegion = (region: string) => {
    const current = formData.regions || [];
    if (current.includes(region)) {
      setFormData({ ...formData, regions: current.filter(r => r !== region) });
    } else {
      setFormData({ ...formData, regions: [...current, region] });
    }
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <MapPin className="w-6 h-6 text-[#4a7c59]" />
            Land Requirements
          </h2>
          <p className="text-sm text-[#1a472a]/80 mt-1">
            Define the land you need for your project
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#1a472a]/80">Section Total</p>
          <p className="text-xl font-bold text-[#4a7c59]">{formatCurrency(total, currencySymbol)}</p>
        </div>
      </div>
      
      {/* Existing Requirements */}
      {requirements.length > 0 && (
        <div className="space-y-3 mb-6">
          {requirements.map((req) => (
            <div key={req.id} className="bg-[#f0f7f0] rounded-xl p-4 border border-[#7dd87d]/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-[#1a472a]">{req.hectares} hectares</p>
                  <p className="text-sm text-[#1a472a]/80">{req.regions.join(', ') || 'Flexible location'}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {req.features.map(f => (
                      <span key={f} className="text-xs bg-white px-2 py-0.5 rounded-full text-[#4a7c59]">
                        {LAND_FEATURES.find(lf => lf.id === f)?.label || f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1a472a]">
                    {formatCurrency(req.customValue ?? req.estimatedValue, currencySymbol)}
                  </span>
                  <Button
                    onClick={() => handleRemove(req.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Form */}
      {showForm ? (
        <div className="bg-[#f8f5f0] rounded-xl p-6 border border-[#7dd87d]/30">
          <h3 className="font-medium text-[#1a472a] mb-4">Add Land Requirement</h3>
          
          <div className="space-y-4">
            {/* Hectares */}
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">
                Size (hectares)
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={formData.hectares || ''}
                  onChange={(e) => setFormData({ ...formData, hectares: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 50"
                  className="bg-white border-[#7dd87d]/30 w-32"
                />
                <span className="text-sm text-[#1a472a]/80">
                  = {((formData.hectares || 0) * 2.471).toFixed(1)} acres
                </span>
              </div>
            </div>
            
            {/* Regions */}
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-2">
                Preferred Regions (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {REGIONS.map(region => (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      (formData.regions || []).includes(region)
                        ? 'bg-[#4a7c59] text-white'
                        : 'bg-white text-[#1a472a] hover:bg-[#f0f7f0]'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-2">
                Required Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {LAND_FEATURES.map(feature => {
                  const Icon = feature.icon;
                  const isSelected = (formData.features || []).includes(feature.id);
                  return (
                    <button
                      key={feature.id}
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? 'bg-[#4a7c59] text-white'
                          : 'bg-white text-[#1a472a] hover:bg-[#f0f7f0]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {feature.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">
                Description (optional)
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your ideal land in detail..."
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            
            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">
                Video URL (optional)
              </label>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#1a472a]/80" />
                <Input
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="bg-white border-[#7dd87d]/30"
                />
              </div>
              <p className="text-xs text-[#1a472a]/75 mt-1 ml-6">Supports YouTube, Vimeo, Dailymotion, Wistia, Loom, and direct .mp4 links</p>
            </div>
            
            {/* Estimated Value */}
            <div className="bg-white rounded-lg p-4 border border-[#7dd87d]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#4a7c59]" />
                  <span className="text-sm text-[#1a472a]">Estimated Value:</span>
                </div>
                <span className="text-xl font-bold text-[#4a7c59]">
                  {formatCurrency(estimatedValue, currencySymbol)}
                </span>
              </div>
              <p className="text-xs text-[#1a472a]/80 mb-3">
                Based on average land prices in selected regions. You can edit this value if you have better figures.
              </p>
              {/* Fair-value helper: a band from area and a regional per-hectare price */}
              <div className="mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLandBand(
                      valuationForLand({
                        hectares: formData.hectares || 0,
                        region: (formData.regions || [])[0] || '',
                      })
                    )
                  }
                  className="text-xs border-[#7dd87d] text-[#4a7c59] hover:bg-[#4a7c59]/10"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1.5" />
                  Suggest a fair value
                </Button>
                {landBand && (
                  <div className="mt-2 rounded-lg bg-[#f8f5f0] border border-[#7dd87d]/30 p-3">
                    <p className="text-xs text-[#1a472a]/80 leading-relaxed">{landBand.note}</p>
                    {landBand.mid > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setFormData({ ...formData, customValue: landBand.mid })}
                        className="mt-2 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg h-8 text-xs"
                      >
                        Use {formatCurrency(landBand.mid, currencySymbol)}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-1">Custom Value (optional)</label>
                <Input
                  type="number"
                  value={formData.customValue || ''}
                  onChange={(e) => setFormData({ ...formData, customValue: parseFloat(e.target.value) || null })}
                  placeholder={`Leave empty to use ${formatCurrency(estimatedValue, currencySymbol)}`}
                  className="bg-white border-[#7dd87d]/30"
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowForm(false)}
                variant="outline"
                className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLand}
                disabled={(formData.hectares || 0) <= 0}
                className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
              >
                Add Land Requirement
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full rounded-xl border-dashed border-2 border-[#7dd87d]/50 text-[#4a7c59] hover:bg-[#f0f7f0] py-8"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Land Requirement
        </Button>
      )}
    </div>
  );
}

// Equipment Section Component
function EquipmentSection({ 
  equipment, 
  setEquipment, 
  currencySymbol, 
  total 
}: {
  equipment: EquipmentItem[];
  setEquipment: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
  currencySymbol: string;
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const emptyForm: Partial<EquipmentItem> = {
    category: '',
    name: '',
    quantity: 1,
    description: '',
    estimatedValue: 0,
    acceptsGift: true,
    acceptsLoan: false,
  };
  const [formData, setFormData] = useState<Partial<EquipmentItem>>(emptyForm);

  // Equipment and vehicle templates start as "gift or loan": a tool lent for
  // a season is worth as much to the project as one given.
  const handleAddFromTemplate = (category: string, item: { name: string; estimatedValue: number }) => {
    const newEquipment: EquipmentItem = {
      id: generateId(),
      category,
      name: item.name,
      quantity: 1,
      description: '',
      estimatedValue: item.estimatedValue,
      customValue: null,
      acceptsGift: true,
      acceptsLoan: true,
    };
    setEquipment([...equipment, newEquipment]);
    toast.success(`${item.name} added`);
  };
  
  const handleAddCustom = () => {
    const newEquipment: EquipmentItem = {
      id: generateId(),
      category: formData.category || 'Other',
      name: formData.name || '',
      quantity: formData.quantity || 1,
      description: formData.description || '',
      estimatedValue: formData.estimatedValue || 0,
      customValue: null,
      neededFrom: formData.neededFrom,
      neededUntil: formData.neededUntil,
      acceptsGift: formData.acceptsGift ?? true,
      acceptsLoan: formData.acceptsLoan ?? false,
    };
    setEquipment([...equipment, newEquipment]);
    setFormData(emptyForm);
    setShowForm(false);
    toast.success('Equipment added');
  };

  const updateTerms = (id: string, patch: ThingTerms) => {
    setEquipment(equipment.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  
  const handleRemove = (id: string) => {
    setEquipment(equipment.filter(e => e.id !== id));
    toast.success('Equipment removed');
  };
  
  const updateQuantity = (id: string, quantity: number) => {
    setEquipment(equipment.map(e => e.id === id ? { ...e, quantity: Math.max(1, quantity) } : e));
  };
  
  const updateValue = (id: string, value: number) => {
    setEquipment(equipment.map(e => e.id === id ? { ...e, customValue: value } : e));
  };
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Tractor className="w-6 h-6 text-[#4a7c59]" />
            Equipment & Materials
          </h2>
          <p className="text-sm text-[#1a472a]/80 mt-1">
            Select from templates or add custom equipment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImportDialog
            type="equipment"
            onImport={(data) => {
              const newEquipment = data.map(item => ({ ...item, id: generateId() }));
              setEquipment([...equipment, ...newEquipment]);
            }}
          />
          <div className="text-right">
            <p className="text-sm text-[#1a472a]/80">Section Total</p>
            <p className="text-xl font-bold text-[#4a7c59]">{formatCurrency(total, currencySymbol)}</p>
          </div>
        </div>
      </div>
      
      {/* Existing Equipment */}
      {equipment.length > 0 && (
        <div className="space-y-2 mb-6">
          {equipment.map((item) => (
            <div key={item.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-[#4a7c59] flex-shrink-0">
                    {item.category}
                  </span>
                  <span className="font-medium text-[#1a472a] truncate">{item.name}</span>
                </div>
                <Button
                  onClick={() => handleRemove(item.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded bg-white text-[#1a472a] hover:bg-[#f0f7f0] text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center rounded bg-white text-[#1a472a] hover:bg-[#f0f7f0] text-sm"
                  >
                    +
                  </button>
                  <span className="text-xs text-[#1a472a]/80 mx-1">x</span>
                  <div className="flex items-center">
                    <span className="text-sm text-[#1a472a]/80 mr-1">{currencySymbol}</span>
                    <Input
                      type="number"
                      value={item.customValue ?? item.estimatedValue}
                      onChange={(e) => updateValue(item.id, parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-sm bg-white border-[#7dd87d]/30 text-right"
                    />
                  </div>
                </div>
                <span className="font-bold text-[#1a472a] text-right">
                  = {formatCurrency((item.customValue ?? item.estimatedValue) * item.quantity, currencySymbol)}
                </span>
              </div>
              {thingSummary(item, false) && (
                <p className="text-xs text-[#1a472a]/85 mt-2">{thingSummary(item, false)}</p>
              )}
              <details className="mt-1">
                <summary className="cursor-pointer min-h-11 flex items-center text-sm font-medium text-[#4a7c59]">
                  {NEED_FORM.whenAndHow}
                </summary>
                <div className="mt-2 pb-1">
                  <ThingTermsFields
                    idBase={`equipment-${item.id}`}
                    terms={item}
                    defaultLoan={false}
                    onChange={(patch) => updateTerms(item.id, patch)}
                  />
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
      
      {/* Template Categories */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-[#1a472a] flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#d4a017]" />
          Suggested Equipment (click to add)
        </h3>
        
        {EQUIPMENT_TEMPLATES.map((cat) => (
          <div key={cat.category} className="border border-[#7dd87d]/30 rounded-xl overflow-hidden">
            <button
              onClick={() => setSelectedCategory(selectedCategory === cat.category ? '' : cat.category)}
              className="w-full px-4 py-3 bg-white hover:bg-[#f0f7f0] flex items-center justify-between transition-colors"
            >
              <span className="font-medium text-[#1a472a]">{cat.category}</span>
              {selectedCategory === cat.category ? (
                <ChevronUp className="w-4 h-4 text-[#1a472a]/80" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#1a472a]/80" />
              )}
            </button>
            {selectedCategory === cat.category && (
              <div className="p-3 bg-[#f8f5f0] grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddFromTemplate(cat.category, item)}
                    className="flex items-center justify-between px-3 py-2 bg-white rounded-lg hover:bg-[#f0f7f0] transition-colors text-left"
                  >
                    <span className="text-sm text-[#1a472a]">{item.name}</span>
                    <span className="text-sm font-medium text-[#4a7c59]">
                      {formatCurrency(item.estimatedValue, currencySymbol)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Custom Equipment Form */}
      {showForm ? (
        <div className="bg-[#f8f5f0] rounded-xl p-6 border border-[#7dd87d]/30">
          <h3 className="font-medium text-[#1a472a] mb-4">Add Custom Equipment</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Category</label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Agriculture"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Name</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Custom Tractor"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Estimated Value ({currencySymbol})</label>
              <Input
                type="number"
                value={(formData.customValue ?? formData.estimatedValue) || ''}
                onChange={(e) => setFormData({ ...formData, customValue: parseFloat(e.target.value) || null })}
                placeholder="Enter value"
                className="bg-white border-[#7dd87d]/30"
              />
              <p className="text-xs text-[#1a472a]/80 mt-1">You can edit this value if you have better figures</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Quantity</label>
              <Input
                type="number"
                value={formData.quantity || 1}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                min={1}
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div className="md:col-span-2">
              <ThingTermsFields
                idBase="equipment-new"
                terms={formData}
                defaultLoan={false}
                onChange={(patch) => setFormData({ ...formData, ...patch })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">            <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
              Cancel
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={!formData.name}
              className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
            >
              Add Equipment
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full rounded-xl border-dashed border-2 border-[#7dd87d]/50 text-[#4a7c59] hover:bg-[#f0f7f0] py-4"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Custom Equipment
        </Button>
      )}
    </div>
  );
}

// Roles Section Component
function RolesSection({
  roles,
  setRoles,
  currencySymbol,
  total,
  region,
}: {
  roles: RoleRequirement[];
  setRoles: React.Dispatch<React.SetStateAction<RoleRequirement[]>>;
  currencySymbol: string;
  total: number;
  region: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  // Fair-value band for the custom role, filled when the coach is asked.
  const [roleBand, setRoleBand] = useState<ValuationBand | null>(null);
  const [formData, setFormData] = useState<Partial<RoleRequirement>>({
    title: '',
    category: '',
    description: '',
    hoursPerWeek: 20,
    weeksNeeded: 52,
    hourlyRate: 30,
    workMode: 'on_site',
  });
  
  const calculatedValue = (formData.hoursPerWeek || 0) * (formData.weeksNeeded || 0) * (formData.hourlyRate || 0);
  
  const handleAddFromTemplate = (capital: CapitalType, role: RoleTemplate) => {
    const newRole: RoleRequirement = {
      id: generateId(),
      title: role.title,
      category: CAPITAL_LABELS[capital].label,
      capitalType: capital,
      description: role.description,
      hoursPerWeek: role.defaultHoursPerWeek,
      weeksNeeded: 52, // Default to 1 year
      hourlyRate: role.defaultHourlyRate,
      estimatedValue: role.defaultHoursPerWeek * 52 * role.defaultHourlyRate,
      customValue: null,
    };
    setRoles([...roles, newRole]);
    toast.success(`${role.title} added`);
  };

  const handleAddCustom = () => {
    const newRole: RoleRequirement = {
      id: generateId(),
      title: formData.title || '',
      category: formData.category || 'Other',
      capitalType: 'experiential', // Custom roles default to experiential
      description: formData.description || '',
      hoursPerWeek: formData.hoursPerWeek || 20,
      weeksNeeded: formData.weeksNeeded || 52,
      hourlyRate: formData.hourlyRate || 30,
      estimatedValue: calculatedValue,
      customValue: null,
      startsOn: formData.startsOn,
      workMode: formData.workMode ?? 'on_site',
    };
    setRoles([...roles, newRole]);
    setFormData({ title: '', category: '', description: '', hoursPerWeek: 20, weeksNeeded: 52, hourlyRate: 30, workMode: 'on_site' });
    setRoleBand(null);
    setShowForm(false);
    toast.success('Role added');
  };
  
  const handleRemove = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
    toast.success('Role removed');
  };

  const updateRoleTerms = (id: string, patch: Partial<RoleRequirement>) => {
    setRoles(roles.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  
  const updateRole = (id: string, field: keyof RoleRequirement, value: number) => {
    setRoles(roles.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Recalculate estimated value when any rate field changes
      if (['hoursPerWeek', 'weeksNeeded', 'hourlyRate'].includes(field)) {
        updated.estimatedValue = updated.hoursPerWeek * updated.weeksNeeded * updated.hourlyRate;
        updated.customValue = null; // Reset custom value when recalculating
      }
      return updated;
    }));
  };
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-6 h-6 text-[#4a7c59]" />
            Roles & Team
          </h2>
          <p className="text-sm text-[#1a472a]/80 mt-1">
            Define the roles needed for your project to succeed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImportDialog
            type="roles"
            onImport={(data) => {
              const newRoles = data.map(item => ({ ...item, id: generateId() }));
              setRoles([...roles, ...newRoles]);
            }}
          />
          <div className="text-right">
            <p className="text-sm text-[#1a472a]/80">Section Total</p>
            <p className="text-xl font-bold text-[#4a7c59]">{formatCurrency(total, currencySymbol)}</p>
          </div>
        </div>
      </div>
      
      {/* Existing Roles */}
      {roles.length > 0 && (
        <div className="space-y-2 mb-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-[#4a7c59]">
                      {role.category}
                    </span>
                    <span className="font-medium text-[#1a472a]">{role.title}</span>
                  </div>
                  <Button
                    onClick={() => handleRemove(role.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_ROLE_HOURS}
                      step={1}
                      aria-label="Hours a week this role needs"
                      value={role.hoursPerWeek}
                      onChange={(e) => updateRole(role.id, 'hoursPerWeek', wholeRoleHours(e.target.value))}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/80" title={fullTimeLabel(role.hoursPerWeek)}>h/wk</span>
                  </div>
                  <span className="text-[#1a472a]/80">x</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={role.weeksNeeded}
                      onChange={(e) => updateRole(role.id, 'weeksNeeded', parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/80">wks</span>
                  </div>
                  <span className="text-[#1a472a]/80">@</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[#1a472a]/80">{currencySymbol}</span>
                    <Input
                      type="number"
                      value={role.hourlyRate}
                      onChange={(e) => updateRole(role.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/80">/h</span>
                  </div>
                  <span className="text-[#1a472a]/80">=</span>
                  <span className="font-bold text-[#1a472a]">
                    {formatCurrency(role.customValue ?? role.estimatedValue, currencySymbol)}
                  </span>
                </div>
                <p className="text-xs text-[#1a472a]/85">{roleSummary(role)}</p>
                <details>
                  <summary className="cursor-pointer min-h-11 flex items-center text-sm font-medium text-[#4a7c59]">
                    {NEED_FORM.whenAndWhere}
                  </summary>
                  <div className="mt-2 pb-1">
                    <RoleTermsFields idBase={`role-${role.id}`} role={role} onChange={(patch) => updateRoleTerms(role.id, patch)} />
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Role templates from the shared taxonomy, grouped by the capital they feed */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-[#1a472a] flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#d4a017]" />
          Roles a community needs held (click to add)
        </h3>

        {CAPITAL_TYPES.map((capital) => {
          const info = CAPITAL_LABELS[capital];
          const templates = ROLE_TEMPLATES_BY_CAPITAL[capital];
          return (
            <div key={capital} className="border border-[#7dd87d]/30 rounded-xl overflow-hidden">
              <button
                onClick={() => setSelectedCategory(selectedCategory === capital ? '' : capital)}
                className="w-full px-4 py-3 bg-white hover:bg-[#f0f7f0] flex items-center justify-between transition-colors"
              >
                <div className="text-left">
                  <span className="font-medium text-[#1a472a]">{info.label} Capital</span>
                  <p className="text-xs text-[#1a472a]/75">{info.blurb}</p>
                </div>
                {selectedCategory === capital ? (
                  <ChevronUp className="w-4 h-4 text-[#1a472a]/80 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#1a472a]/80 flex-shrink-0" />
                )}
              </button>
              {selectedCategory === capital && (
                <div className="p-3 bg-[#f8f5f0] space-y-2">
                  {templates.map((role) => (
                    <button
                      key={role.title}
                      onClick={() => handleAddFromTemplate(capital, role)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg hover:bg-[#f0f7f0] transition-colors text-left"
                    >
                      <div>
                        <span className="text-sm font-medium text-[#1a472a]">{role.title}</span>
                        <p className="text-xs text-[#1a472a]/80">
                          {role.defaultHoursPerWeek}h/week @ {formatCurrency(role.defaultHourlyRate, currencySymbol)}/h · {role.description}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-[#4a7c59] flex-shrink-0 ml-2">
                        {formatCurrency(role.defaultHoursPerWeek * 52 * role.defaultHourlyRate, currencySymbol)}/yr
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Custom Role Form */}
      {showForm ? (
        <div className="bg-[#f8f5f0] rounded-xl p-6 border border-[#7dd87d]/30">
          <h3 className="font-medium text-[#1a472a] mb-4">Add Custom Role</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Role Title</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Sustainability Coordinator"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Category</label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Operations"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label htmlFor="role-hours-needed" className="block text-sm font-medium text-[#1a472a] mb-1">Hours a week this role needs</label>
              <Input
                id="role-hours-needed"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_ROLE_HOURS}
                step={1}
                value={formData.hoursPerWeek || ''}
                onChange={(e) => {
                  // Empty while typing is fine; Add falls back to 20.
                  const raw = e.target.value;
                  setFormData({ ...formData, hoursPerWeek: raw === '' ? 0 : wholeRoleHours(raw) });
                }}
                className="bg-white border-[#7dd87d]/30"
              />
              <p className="text-xs text-[#1a472a]/80 mt-1">
                40 hours a week is about one full-time person. 120 is about three. Several people can share a role.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Weeks Needed</label>
              <Input
                type="number"
                value={formData.weeksNeeded || ''}
                onChange={(e) => setFormData({ ...formData, weeksNeeded: parseInt(e.target.value) || 0 })}
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Hourly Rate ({currencySymbol})</label>
              <Input
                type="number"
                value={formData.hourlyRate || ''}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <div className="bg-white rounded-lg p-3 border border-[#7dd87d]/30 mb-2">
                <p className="text-xs text-[#1a472a]/80">Calculated Value:</p>
                <p className="text-lg font-bold text-[#4a7c59]">{formatCurrency(calculatedValue, currencySymbol)}</p>
              </div>
              {/* Fair-value helper: a defensible band from hours, weeks, rate, and region */}
              <div className="mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRoleBand(
                      valuationForRole({
                        capital: 'experiential',
                        hoursPerWeek: formData.hoursPerWeek || 0,
                        weeks: formData.weeksNeeded || 0,
                        region,
                        hourlyRate: formData.hourlyRate || undefined,
                      })
                    )
                  }
                  className="text-xs border-[#7dd87d] text-[#4a7c59] hover:bg-[#4a7c59]/10"
                >
                  <Calculator className="w-3.5 h-3.5 mr-1.5" />
                  Suggest a fair value
                </Button>
                {roleBand && (
                  <div className="mt-2 rounded-lg bg-white border border-[#7dd87d]/30 p-3">
                    <p className="text-xs text-[#1a472a]/80 leading-relaxed">{roleBand.note}</p>
                    {roleBand.mid > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setFormData({ ...formData, customValue: roleBand.mid })}
                        className="mt-2 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg h-8 text-xs"
                      >
                        Use {formatCurrency(roleBand.mid, currencySymbol)}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-1">Custom Value (optional)</label>
                <Input
                  type="number"
                  value={formData.customValue || ''}
                  onChange={(e) => setFormData({ ...formData, customValue: parseFloat(e.target.value) || null })}
                  placeholder={`Leave empty to use ${formatCurrency(calculatedValue, currencySymbol)}`}
                  className="bg-white border-[#7dd87d]/30"
                />
                <p className="text-xs text-[#1a472a]/80 mt-1">You can edit this value if you have better figures</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#1a472a] mb-1">Description</label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the role responsibilities..."
              className="bg-white border-[#7dd87d]/30"
            />
          </div>
          <div className="mt-4">
            <RoleTermsFields idBase="role-new" role={formData} onChange={(patch) => setFormData({ ...formData, ...patch })} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
              Cancel
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={!formData.title}
              className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
            >
              Add Role
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full rounded-xl border-dashed border-2 border-[#7dd87d]/50 text-[#4a7c59] hover:bg-[#f0f7f0] py-4"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Custom Role
        </Button>
      )}
    </div>
  );
}

// Other Needs Section Component
function OtherNeedsSection({ 
  needs, 
  setNeeds, 
  currencySymbol, 
  total 
}: {
  needs: OtherNeed[];
  setNeeds: React.Dispatch<React.SetStateAction<OtherNeed[]>>;
  currencySymbol: string;
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<OtherNeed>>({
    category: 'other',
    title: '',
    description: '',
    estimatedValue: 0,
  });
  const formRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  // Fair-value band around the figure entered, filled when the coach is asked.
  const [otherBand, setOtherBand] = useState<ValuationBand | null>(null);

  const openFormWithCategory = (categoryKey: string) => {
    const cat = categoryForKey(categoryKey);
    setFormData({
      ...formData,
      category: categoryKey,
      title: cat?.label || '',
      neededFrom: undefined,
      neededUntil: undefined,
      acceptsGift: true,
      acceptsLoan: LOANABLE_NEED_CATEGORIES.includes(categoryKey),
      workMode: cat?.kind === 'knowledge' ? 'either' : undefined,
    });
    setShowForm(true);
    // Scroll to form after a tick so it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleAdd = () => {
    const cat = categoryForKey(formData.category || 'other');
    const kind = cat?.kind ?? 'item';
    const newNeed: OtherNeed = {
      id: generateId(),
      category: formData.category || 'other',
      capitalType: cat?.capital ?? 'material',
      kind,
      title: formData.title || '',
      description: formData.description || '',
      estimatedValue: formData.estimatedValue || 0,
      customValue: null,
      ...(kind === 'item'
        ? {
            neededFrom: formData.neededFrom,
            neededUntil: formData.neededUntil,
            acceptsGift: formData.acceptsGift ?? true,
            acceptsLoan: formData.acceptsLoan ?? LOANABLE_NEED_CATEGORIES.includes(formData.category || 'other'),
          }
        : {}),
      ...(kind === 'knowledge' ? { workMode: formData.workMode ?? 'either' } : {}),
    };
    setNeeds([...needs, newNeed]);
    setFormData({ category: 'other', title: '', description: '', estimatedValue: 0 });
    setOtherBand(null);
    setShowForm(false);
    toast.success('Item added');
    // Scroll back to the category list so user can keep adding
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };
  
  const handleRemove = (id: string) => {
    setNeeds(needs.filter(n => n.id !== id));
    toast.success('Item removed');
  };

  const updateNeed = (id: string, patch: Partial<OtherNeed>) => {
    setNeeds(needs.map(n => n.id === id ? { ...n, ...patch } : n));
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Package className="w-6 h-6 text-[#4a7c59]" />
            Other Needs
          </h2>
          <p className="text-sm text-[#1a472a]/80 mt-1">
            Permits, insurance, training, and anything else your project needs
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#1a472a]/80">Section Total</p>
          <p className="text-xl font-bold text-[#4a7c59]">{formatCurrency(total, currencySymbol)}</p>
        </div>
      </div>
      
      {/* Existing Needs */}
      {needs.length > 0 && (
        <div className="space-y-2 mb-6">
          {needs.map((need) => {
            const catInfo = categoryForKey(need.category);
            const Icon = (catInfo?.icon && CATEGORY_ICONS[catInfo.icon]) || HelpCircle;
            const capital = need.capitalType ?? catInfo?.capital;
            const needKind = need.kind ?? catInfo?.kind ?? 'item';
            const defaultLoan = LOANABLE_NEED_CATEGORIES.includes(need.category);
            const summary = needKind === 'item'
              ? thingSummary(need, defaultLoan)
              : needKind === 'knowledge' ? workModeLabel(need.workMode ?? 'either') : null;
            return (
              <div key={need.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 text-[#4a7c59]" />
                    <div>
                      <span className="font-medium text-[#1a472a]">{need.title}</span>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[#1a472a]/80">{catInfo?.label || need.category}</p>
                        {capital && (
                          <span className="text-xs bg-white px-2 py-0.5 rounded-full text-[#4a7c59]">
                            {CAPITAL_LABELS[capital].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1a472a]">
                      {formatCurrency(need.customValue ?? need.estimatedValue, currencySymbol)}
                    </span>
                    <Button
                      onClick={() => handleRemove(need.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {summary && <p className="text-xs text-[#1a472a]/85 mt-2">{summary}</p>}
                {(needKind === 'item' || needKind === 'knowledge') && (
                  <details className="mt-1">
                    <summary className="cursor-pointer min-h-11 flex items-center text-sm font-medium text-[#4a7c59]">
                      {needKind === 'item' ? NEED_FORM.whenAndHow : NEED_FORM.whereDone}
                    </summary>
                    <div className="mt-2 pb-1">
                      {needKind === 'item' ? (
                        <ThingTermsFields
                          idBase={`need-${need.id}`}
                          terms={need}
                          defaultLoan={defaultLoan}
                          onChange={(patch) => updateNeed(need.id, patch)}
                        />
                      ) : (
                        <WorkModeField
                          idBase={`need-${need.id}`}
                          value={need.workMode ?? 'either'}
                          onChange={(m) => updateNeed(need.id, { workMode: m })}
                        />
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category picker from the shared taxonomy, each mapped to a capital */}
      <div className="mb-6" ref={listRef}>
        <h3 className="font-medium text-[#1a472a] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#d4a017]" />
          What does your project need?
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {WIZARD_NEED_CATEGORIES.map((cat) => {
            const Icon = (cat.icon && CATEGORY_ICONS[cat.icon]) || HelpCircle;
            return (
              <button
                key={cat.key}
                onClick={() => openFormWithCategory(cat.key)}
                className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#7dd87d]/30 hover:bg-[#f0f7f0] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#4a7c59]" />
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-[#1a472a] text-sm block">{cat.label}</span>
                  <span className="text-xs bg-[#f0f7f0] px-2 py-0.5 rounded-full text-[#4a7c59] inline-block mt-1">
                    {CAPITAL_LABELS[cat.capital].label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Add Form */}
      {showForm && (
        <div ref={formRef} className="bg-[#f8f5f0] rounded-xl p-6 border border-[#7dd87d]/30">
          <h3 className="font-medium text-[#1a472a] mb-4">
            Add {categoryForKey(formData.category || 'other')?.label || 'Item'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Title</label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Building Permits"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this covers..."
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Estimated Value ({currencySymbol})</label>
              <Input
                type="number"
                value={formData.estimatedValue || ''}
                onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="bg-white border-[#7dd87d]/30"
              />
            </div>
            {categoryForKey(formData.category || 'other')?.kind === 'knowledge' ? (
              <WorkModeField
                idBase="need-new"
                value={formData.workMode ?? 'either'}
                onChange={(m) => setFormData({ ...formData, workMode: m })}
              />
            ) : (categoryForKey(formData.category || 'other')?.kind ?? 'item') === 'item' ? (
              <ThingTermsFields
                idBase="need-new"
                terms={formData}
                defaultLoan={LOANABLE_NEED_CATEGORIES.includes(formData.category || 'other')}
                onChange={(patch) => setFormData({ ...formData, ...patch })}
              />
            ) : null}
            {/* Fair-value helper: a plus-or-minus band around the figure entered */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOtherBand(valuationBandForValue(formData.estimatedValue || 0))}
                className="text-xs border-[#7dd87d] text-[#4a7c59] hover:bg-[#4a7c59]/10"
              >
                <Calculator className="w-3.5 h-3.5 mr-1.5" />
                Suggest a fair range
              </Button>
              {otherBand && (
                <div className="mt-2 rounded-lg bg-white border border-[#7dd87d]/30 p-3">
                  <p className="text-xs text-[#1a472a]/80 leading-relaxed">{otherBand.note}</p>
                  {otherBand.mid > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setFormData({ ...formData, estimatedValue: otherBand.mid })}
                      className="mt-2 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg h-8 text-xs"
                    >
                      Use {formatCurrency(otherBand.mid, currencySymbol)}
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.title}
                className="flex-1 bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-xl"
              >
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Need terms: when a need is wanted, how a thing may come, where work happens

const toggleClass = (on: boolean) =>
  `min-h-11 px-4 rounded-xl border text-sm font-medium transition-colors ${
    on ? 'bg-[#4a7c59] text-white border-[#4a7c59]' : 'bg-white text-[#1a472a] border-[#1a472a]/20 hover:border-[#4a7c59]/60'
  }`;

/** Dates and give-or-lend toggles for a thing need. At least one mode stays on. */
export function ThingTermsFields({
  idBase,
  terms,
  defaultLoan,
  onChange,
}: {
  idBase: string;
  terms: ThingTerms;
  /** Whether loans are on when the need has not said. */
  defaultLoan: boolean;
  onChange: (patch: ThingTerms) => void;
}) {
  const gift = terms.acceptsGift ?? true;
  const loan = terms.acceptsLoan ?? defaultLoan;
  const [modeError, setModeError] = useState(false);
  const endsEarly = !!terms.neededFrom && !!terms.neededUntil && terms.neededUntil < terms.neededFrom;
  const toggle = (which: 'gift' | 'loan') => {
    const nextGift = which === 'gift' ? !gift : gift;
    const nextLoan = which === 'loan' ? !loan : loan;
    if (!nextGift && !nextLoan) {
      setModeError(true);
      return;
    }
    setModeError(false);
    onChange({ acceptsGift: nextGift, acceptsLoan: nextLoan });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idBase}-from`} className="block text-sm font-medium text-[#1a472a] mb-1">{NEED_FORM.neededFrom}</label>
        <Input
          id={`${idBase}-from`}
          type="date"
          value={terms.neededFrom ?? ''}
          onChange={(e) => onChange({ neededFrom: e.target.value || undefined })}
          className="min-h-11 bg-white border-[#7dd87d]/30 text-base md:text-sm"
        />
      </div>
      <div>
        <label htmlFor={`${idBase}-until`} className="block text-sm font-medium text-[#1a472a] mb-1">{NEED_FORM.neededUntil}</label>
        <Input
          id={`${idBase}-until`}
          type="date"
          min={terms.neededFrom || undefined}
          value={terms.neededUntil ?? ''}
          onChange={(e) => onChange({ neededUntil: e.target.value || undefined })}
          aria-invalid={endsEarly}
          aria-describedby={endsEarly ? `${idBase}-until-error` : undefined}
          className="min-h-11 bg-white border-[#7dd87d]/30 text-base md:text-sm"
        />
      </div>
      {endsEarly && (
        <p id={`${idBase}-until-error`} role="alert" className="sm:col-span-2 text-sm text-red-700">{NEED_FORM.endsBeforeStart}</p>
      )}
      <div role="group" aria-labelledby={`${idBase}-modes`} className="sm:col-span-2">
        <p id={`${idBase}-modes`} className="text-sm font-medium text-[#1a472a] mb-1">{NEED_FORM.howTake}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={gift} onClick={() => toggle('gift')} className={toggleClass(gift)}>
            {NEED_FORM.asGift}
          </button>
          <button type="button" aria-pressed={loan} onClick={() => toggle('loan')} className={toggleClass(loan)}>
            {NEED_FORM.onLoan}
          </button>
        </div>
        {modeError && <p role="alert" className="mt-1 text-sm text-red-700">{NEED_FORM.chooseMode}</p>}
      </div>
    </div>
  );
}

/** On the land, remote, or either. */
function WorkModeField({ idBase, value, onChange }: { idBase: string; value: WorkMode; onChange: (m: WorkMode) => void }) {
  const modes: WorkMode[] = ['on_site', 'remote', 'either'];
  return (
    <fieldset>
      <legend className="text-sm font-medium text-[#1a472a] mb-1">{NEED_FORM.whereDone}</legend>
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <label
            key={m}
            className={`inline-flex items-center cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1a472a] ${toggleClass(value === m)}`}
          >
            <input
              type="radio"
              name={`${idBase}-where`}
              value={m}
              checked={value === m}
              onChange={() => onChange(m)}
              className="sr-only"
            />
            {workModeLabel(m)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A role's start date and where it is done. The end date follows from its weeks. */
function RoleTermsFields({
  idBase,
  role,
  onChange,
}: {
  idBase: string;
  role: Pick<RoleRequirement, 'startsOn' | 'workMode'>;
  onChange: (patch: Partial<RoleRequirement>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${idBase}-start`} className="block text-sm font-medium text-[#1a472a] mb-1">{NEED_FORM.startsOn}</label>
        <Input
          id={`${idBase}-start`}
          type="date"
          value={role.startsOn ?? ''}
          onChange={(e) => onChange({ startsOn: e.target.value || undefined })}
          aria-describedby={`${idBase}-start-help`}
          className="min-h-11 bg-white border-[#7dd87d]/30 text-base md:text-sm sm:max-w-xs"
        />
        <p id={`${idBase}-start-help`} className="text-xs text-[#1a472a]/80 mt-1">{NEED_FORM.startsOnHelper}</p>
      </div>
      <WorkModeField idBase={idBase} value={role.workMode ?? 'on_site'} onChange={(m) => onChange({ workMode: m })} />
    </div>
  );
}

/** The line a role row shows: its time line once it has a start date, and where it is done. */
function roleSummary(role: RoleRequirement): string {
  const line = role.startsOn
    ? roleTimeLine({
        kind: 'role',
        capacityUnit: 'hours_per_week',
        quantityWanted: role.hoursPerWeek,
        ...roleWindow(role),
      })
    : null;
  return [line, workModeLabel(role.workMode ?? 'on_site')].filter(Boolean).join(' · ');
}

// ── The Money step (build spec 2026-09-25, sections 11 and 14.1) ─────────────

/**
 * Money this project needs. A choice is required, nothing is selected at
 * first, and no money sends 0. The money-share note is guidance for the
 * project's stewards only and never blocks sending. Exported for tests.
 */
export function FinancialTargetSection({
  inKindTotal,
  landTotal,
  equipmentTotal,
  rolesTotal,
  otherTotal,
  currency,
  currencySymbol,
  moneyChoice,
  onMoneyChoice,
  financialTarget,
  setFinancialTarget,
  moneyError,
  choiceRef,
  band,
  maEarthUrl,
  setMaEarthUrl,
  stewardUrl,
  setStewardUrl,
  routeErrors,
  durationDays,
  setDurationDays,
}: {
  inKindTotal: number;
  landTotal: number;
  equipmentTotal: number;
  rolesTotal: number;
  otherTotal: number;
  currency: string;
  currencySymbol: string;
  moneyChoice: MoneyChoice | null;
  onMoneyChoice: (choice: MoneyChoice) => void;
  financialTarget: number;
  setFinancialTarget: (value: number) => void;
  moneyError: string | null;
  choiceRef?: React.RefObject<HTMLDivElement | null>;
  band: { softMinPct: number; softMaxPct: number; defaultPct: number };
  maEarthUrl: string;
  setMaEarthUrl: (value: string) => void;
  stewardUrl: string;
  setStewardUrl: (value: string) => void;
  routeErrors: Partial<Record<RoutePartner, string>>;
  durationDays: number;
  setDurationDays: (value: number) => void;
}) {
  const asksMoney = moneyChoice === 'money';
  const share = moneySharePct(inKindTotal, asksMoney ? financialTarget : 0);
  const note = asksMoney && financialTarget > 0
    ? moneyShareNote({ inKindAsk: inKindTotal, moneyAsk: financialTarget, asksNone: false, band })
    : { line: null, outside: false };
  const suggested = suggestedMoneyAsk(inKindTotal, band.defaultPct);
  const sliderPct = Math.min(50, share);
  const setFromSlider = (s: number) => {
    if (s <= 0) return setFinancialTarget(0);
    setFinancialTarget(Math.round((inKindTotal * s) / (100 - s)));
  };
  const focusRoute = (partner: RoutePartner) =>
    document.getElementById(`route-${partner}`)?.focus();

  return (
    <div>
      <div className="mb-6">
        <h2 id="money-step-heading" className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Target className="w-6 h-6 text-[#4a7c59]" aria-hidden="true" />
          {MONEY_STEP.heading}
        </h2>
        <p className="text-sm text-[#1a472a]/85 mt-1">{MONEY_STEP.intro}</p>
      </div>

      {/* Summary of the in-kind ask */}
      <div className="bg-gradient-to-br from-[#4a7c59] to-[#1a472a] rounded-2xl p-6 text-white mb-6">
        <h3 className="text-lg font-medium mb-4 opacity-90">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs opacity-80">Land</p>
            <p className="text-xl font-bold">{formatCurrency(landTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Equipment</p>
            <p className="text-xl font-bold">{formatCurrency(equipmentTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Roles</p>
            <p className="text-xl font-bold">{formatCurrency(rolesTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-80">Other</p>
            <p className="text-xl font-bold">{formatCurrency(otherTotal, currencySymbol)}</p>
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg">{MONEY_STEP.summaryInKind}</span>
            <span className="text-3xl font-bold">{formatCurrency(inKindTotal, currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* The money choice: required, nothing selected at first */}
      <div
        ref={choiceRef}
        role="radiogroup"
        aria-labelledby="money-step-heading"
        aria-describedby={moneyError ? 'money-choice-error' : undefined}
        aria-invalid={!!moneyError}
        className={`rounded-2xl p-4 sm:p-6 mb-6 border scroll-mt-24 ${moneyError ? 'border-red-400 bg-red-50/40' : 'border-[#7dd87d]/30 bg-white'}`}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['money', MONEY_STEP.asksMoney],
            ['none', MONEY_STEP.asksNone],
          ] as const).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-center gap-3 min-h-11 rounded-xl border px-4 py-3 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1a472a] ${
                moneyChoice === value ? 'border-[#4a7c59] bg-[#f0f7f0]' : 'border-[#1a472a]/20 bg-white'
              }`}
            >
              <input
                type="radio"
                name="money-choice"
                value={value}
                checked={moneyChoice === value}
                onChange={() => onMoneyChoice(value)}
                className="h-5 w-5 shrink-0 accent-[#4a7c59]"
              />
              <span className="text-sm font-semibold text-[#1a472a]">{label}</span>
            </label>
          ))}
        </div>
        {moneyError && (
          <p id="money-choice-error" role="alert" className="mt-2 text-sm font-medium text-red-700">{moneyError}</p>
        )}

        {asksMoney && (
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="money-amount" className="block text-sm font-medium text-[#1a472a] mb-2">
                {MONEY_STEP.howMuch(currency)}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#1a472a]/80" aria-hidden="true">
                  {currencySymbol}
                </span>
                <Input
                  id="money-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={financialTarget || ''}
                  onChange={(e) => setFinancialTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-describedby="money-share-note"
                  className="w-full bg-white border-[#7dd87d]/30 text-xl font-bold pl-12 h-14"
                />
              </div>
              <p
                id="money-share-note"
                className={`mt-2 text-sm ${note.outside ? 'text-[#1a472a] font-medium' : 'text-[#1a472a]/80'}`}
                aria-live="polite"
              >
                {note.line}
              </p>
            </div>

            {suggested > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-[#1a472a]/85">
                  {MONEY_STEP.suggestion(String(band.defaultPct), formatCurrency(suggested, currencySymbol))}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFinancialTarget(suggested)}
                  className="min-h-11 border-[#4a7c59] text-[#1a472a]"
                >
                  {MONEY_STEP.useAmount(formatCurrency(suggested, currencySymbol))}
                </Button>
              </div>
            )}

            {inKindTotal > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[#1a472a]/80">
                  <span>0%</span>
                  <span id="money-slider-label">{MONEY_STEP.sliderLabel}</span>
                  <span>50%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={sliderPct}
                  onChange={(e) => setFromSlider(parseInt(e.target.value, 10) || 0)}
                  aria-labelledby="money-slider-label"
                  aria-valuetext={`${sliderPct}%`}
                  className="w-full h-11 cursor-pointer accent-[#4a7c59]"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Where people can put money in: routes the project already holds */}
      {asksMoney && (
        <div className="bg-[#f8f5f0] rounded-2xl p-4 sm:p-6 border border-[#7dd87d]/30 mb-6 space-y-5">
          <h3 className="font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>{MONEY_STEP.whereHeading}</h3>
          <EligibilityQuiz
            embedded
            idPrefix="wizard-route-quiz"
            currencySymbol={currencySymbol}
            onResult={(rec) => focusRoute(partnerForRecommendation(rec))}
          />
          {([
            ['maearth', MONEY_STEP.maEarthField, maEarthUrl, setMaEarthUrl, 'https://maearth.com/...'],
            ['gosteward', MONEY_STEP.stewardField, stewardUrl, setStewardUrl, 'https://gosteward.com/...'],
          ] as const).map(([partner, label, value, setValue, placeholder]) => (
            <div key={partner}>
              <label htmlFor={`route-${partner}`} className="block text-sm font-medium text-[#1a472a] mb-1">{label}</label>
              <Input
                id={`route-${partner}`}
                type="url"
                inputMode="url"
                autoComplete="off"
                maxLength={512}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                aria-invalid={!!routeErrors[partner]}
                aria-describedby={`routes-helper${routeErrors[partner] ? ` route-${partner}-error` : ''}`}
                className="min-h-11 bg-white border-[#7dd87d]/30 text-base md:text-sm"
              />
              {routeErrors[partner] && (
                <p id={`route-${partner}-error`} role="alert" className="mt-1 text-sm text-red-700">{routeErrors[partner]}</p>
              )}
            </div>
          ))}
          <p id="routes-helper" className="text-sm text-[#1a472a]/80">{MONEY_STEP.routesHelper}</p>
        </div>
      )}

      {/* Campaign Duration */}
      <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30 mb-6">
        <h3 className="font-medium text-[#1a472a] mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4a7c59]" />
          Campaign Duration
        </h3>
        <p className="text-sm text-[#1a472a]/80 mb-4">
          How long should your campaign run? Choose between 1 and 365 days.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Input
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => {
                const val = Math.min(365, Math.max(1, parseInt(e.target.value) || 90));
                setDurationDays(val);
              }}
              className="w-24 bg-white border-[#7dd87d]/30 text-center text-lg font-bold"
            />
            <span className="text-[#1a472a]/75">days</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 120, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDurationDays(d)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  durationDays === d
                    ? 'bg-[#4a7c59] text-white'
                    : 'bg-[#f0f7f0] text-[#4a7c59] hover:bg-[#e0efe0]'
                }`}
              >
                {d <= 90 ? `${d}d` : d === 120 ? '4mo' : d === 180 ? '6mo' : '1yr'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <input
            type="range"
            min={1}
            max={365}
            value={durationDays}
            onChange={(e) => setDurationDays(parseInt(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-[#f0f7f0] to-[#4a7c59] rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#1a472a]/80 mt-1">
            <span>1 day</span>
            <span className="text-[#4a7c59] font-medium">
              {durationDays} day{durationDays !== 1 ? 's' : ''}
              {durationDays >= 30 ? ` (~${Math.round(durationDays / 30)} month${Math.round(durationDays / 30) !== 1 ? 's' : ''})` : ''}
            </span>
            <span>1 year</span>
          </div>
        </div>
      </div>
    </div>
  );
}
