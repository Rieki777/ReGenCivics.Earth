/**
 * Crowd Pooling Campaign Creator
 * Password protected (111) comprehensive campaign creation tool
 * Allows projects to list everything they need: land, equipment, roles, and more
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
// Navigation is rendered globally in App.tsx
import { useAuth } from '@/_core/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CAMPAIGN_TEMPLATES } from '@/data/campaignTemplates';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { estimateLandPrice, estimateEquipmentPrice, suggestHourlyRate, EQUIPMENT_BASE_PRICES, ROLE_SKILL_LEVELS } from '@/data/regionalCostData';
import { BackButton } from "@/components/BackButton";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Types
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

interface EquipmentItem {
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
  description: string;
  hoursPerWeek: number;
  weeksNeeded: number;
  hourlyRate: number;
  estimatedValue: number;
  customValue: number | null;
}

interface OtherNeed {
  id: string;
  category: string;
  title: string;
  description: string;
  estimatedValue: number;
  customValue: number | null;
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

const ROLE_TEMPLATES = [
  { category: 'Leadership', roles: [
    { title: 'Project Director', hourlyRate: 50, hoursPerWeek: 40, description: 'Overall project leadership and vision' },
    { title: 'Operations Manager', hourlyRate: 40, hoursPerWeek: 40, description: 'Day-to-day operations coordination' },
    { title: 'Community Manager', hourlyRate: 35, hoursPerWeek: 30, description: 'Member relations and community building' },
  ]},
  { category: 'Agriculture', roles: [
    { title: 'Farm Manager', hourlyRate: 35, hoursPerWeek: 40, description: 'Agricultural operations oversight' },
    { title: 'Permaculture Designer', hourlyRate: 45, hoursPerWeek: 20, description: 'Land design and food forest planning' },
    { title: 'Gardener/Farmer', hourlyRate: 25, hoursPerWeek: 40, description: 'Hands-on cultivation work' },
    { title: 'Livestock Manager', hourlyRate: 30, hoursPerWeek: 35, description: 'Animal husbandry and care' },
  ]},
  { category: 'Construction', roles: [
    { title: 'Construction Manager', hourlyRate: 45, hoursPerWeek: 40, description: 'Building project oversight' },
    { title: 'Carpenter', hourlyRate: 35, hoursPerWeek: 40, description: 'Woodworking and structures' },
    { title: 'Electrician', hourlyRate: 40, hoursPerWeek: 30, description: 'Electrical systems installation' },
    { title: 'Plumber', hourlyRate: 40, hoursPerWeek: 25, description: 'Water and waste systems' },
    { title: 'Natural Builder', hourlyRate: 35, hoursPerWeek: 40, description: 'Earthen and natural construction' },
  ]},
  { category: 'Technology', roles: [
    { title: 'IT Manager', hourlyRate: 50, hoursPerWeek: 20, description: 'Technology infrastructure' },
    { title: 'Web Developer', hourlyRate: 45, hoursPerWeek: 25, description: 'Website and app development' },
    { title: 'Systems Administrator', hourlyRate: 40, hoursPerWeek: 15, description: 'Server and network management' },
  ]},
  { category: 'Marketing & Outreach', roles: [
    { title: 'Marketing Director', hourlyRate: 45, hoursPerWeek: 30, description: 'Brand and outreach strategy' },
    { title: 'Social Media Manager', hourlyRate: 30, hoursPerWeek: 20, description: 'Social presence management' },
    { title: 'Content Creator', hourlyRate: 35, hoursPerWeek: 25, description: 'Video, photos, and written content' },
    { title: 'Community Outreach', hourlyRate: 30, hoursPerWeek: 20, description: 'Local partnerships and events' },
  ]},
  { category: 'Education', roles: [
    { title: 'Education Director', hourlyRate: 40, hoursPerWeek: 30, description: 'Learning program development' },
    { title: 'Workshop Facilitator', hourlyRate: 35, hoursPerWeek: 20, description: 'Skills training and workshops' },
    { title: 'Children\'s Program Lead', hourlyRate: 30, hoursPerWeek: 25, description: 'Youth education and activities' },
  ]},
  { category: 'Wellness', roles: [
    { title: 'Wellness Coordinator', hourlyRate: 35, hoursPerWeek: 25, description: 'Health and wellness programs' },
    { title: 'Chef/Cook', hourlyRate: 30, hoursPerWeek: 40, description: 'Community meals preparation' },
    { title: 'Healthcare Provider', hourlyRate: 50, hoursPerWeek: 20, description: 'Basic medical care' },
  ]},
  { category: 'Finance & Admin', roles: [
    { title: 'Financial Manager', hourlyRate: 45, hoursPerWeek: 25, description: 'Budgets and accounting' },
    { title: 'Fundraising Coordinator', hourlyRate: 40, hoursPerWeek: 30, description: 'Grants and donations' },
    { title: 'Administrative Assistant', hourlyRate: 25, hoursPerWeek: 30, description: 'General admin support' },
    { title: 'Legal Advisor', hourlyRate: 75, hoursPerWeek: 10, description: 'Legal compliance and contracts' },
  ]},
];

const OTHER_CATEGORIES = [
  { id: 'engineering', label: 'Engineering Plans', icon: Wrench, suggested: true, description: 'Civil, structural, and site engineering plans' },
  { id: 'architectural', label: 'Architectural Plans', icon: Building, suggested: true, description: 'Building designs and architectural drawings' },
  { id: 'permaculture', label: 'Permaculture Site Plan', icon: Sprout, suggested: true, description: 'Holistic land design and ecosystem planning' },
  { id: 'financial', label: 'Financial Proformas', icon: Coins, suggested: true, description: 'Financial projections and business plans' },
  { id: 'permits', label: 'Permits & Legal', icon: FileText },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'training', label: 'Training & Education', icon: BookOpen },
  { id: 'marketing', label: 'Marketing & Branding', icon: Megaphone },
  { id: 'software', label: 'Software & Subscriptions', icon: Code },
  { id: 'events', label: 'Events & Gatherings', icon: Users },
  { id: 'travel', label: 'Travel & Transportation', icon: Car },
  { id: 'supplies', label: 'Supplies & Materials', icon: Package },
  { id: 'other', label: 'Other', icon: HelpCircle },
];

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
const generateId = () => Math.random().toString(36).substring(2, 9);

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
  const currencySymbol = currencies.find(c => c.code === currency)?.symbol || '$';
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Land', 'Equipment', 'Roles', 'Other Needs', 'Photos', 'Financial Target'];
  
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
  
  // Financial target
  const [financialTarget, setFinancialTarget] = useState(0);
  const [financialNotes, setFinancialNotes] = useState('');
  const [durationDays, setDurationDays] = useState(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // tRPC mutation for creating campaign
  const createCampaignMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success('Campaign created successfully!');
      // Redirect to campaign detail page
      window.location.href = `/campaign/${data.id}`;
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
  
  const grandTotal = landTotal + equipmentTotal + rolesTotal + otherTotal;
  const recommendedFinancial = Math.round(grandTotal * 0.2);
  
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
    
    setIsSubmitting(true);
    
    // Prepare campaign items
    const items = [
      // Land items
      ...landRequirements.map(land => ({
        category: 'land' as const,
        hectares: land.hectares,
        region: land.regions[0] || '',
        features: land.features,
        videoUrl: land.videoUrl,
        landDescription: land.description,
        estimatedValue: land.customValue ?? land.estimatedValue,
      })),
      // Equipment items
      ...equipment.map(eq => ({
        category: 'equipment' as const,
        equipmentName: eq.name,
        equipmentQuantity: eq.quantity,
        equipmentCategory: eq.category,
        estimatedValue: (eq.customValue ?? eq.estimatedValue) * eq.quantity,
      })),
      // Role items
      ...roles.map(role => ({
        category: 'role' as const,
        roleTitle: role.title,
        hoursPerWeek: role.hoursPerWeek,
        durationMonths: Math.round((role.weeksNeeded || 0) / 4.33), // Convert weeks to months
        roleDescription: role.description,
        estimatedValue: role.customValue ?? role.estimatedValue,
      })),
      // Resource items
      ...otherNeeds.map(need => ({
        category: 'resource' as const,
        resourceName: need.title,
        resourceQuantity: 1,
        resourceUnit: need.category,
        resourceDescription: need.description,
        estimatedValue: need.customValue ?? need.estimatedValue,
      })),
    ];
    
    // Submit campaign with all rich project data
    createCampaignMutation.mutate({
      title: campaignName,
      description: campaignDescription,
      projectName: campaignName,
      location: projectLocation || landRequirements[0]?.regions?.[0] || undefined,
      financialTarget: financialTarget || recommendedFinancial,
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

  // Project selection screen (replaces password)
  if (!selectedApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7f0] to-[#e8f5e9]">
        <BackButton />
        
        {/* Hero Image */}
        <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden">
          <img 
            src="https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg"
            alt="Crowd Pooling - Create your campaign"
            className="w-full h-full object-cover object-center"
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
                <p className="text-[#1a472a]/70 mt-2 max-w-md mx-auto">
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
              {user && userApplications && userApplications.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#4a7c59] uppercase tracking-wider mb-2">Your Applications</p>
                  <div className="space-y-2">
                    {userApplications
                      .filter((app: any) => ['submitted', 'approved', 'under_review'].includes(app.status))
                      .map((app: any) => (
                        <button
                          key={`my-${app.id}`}
                          onClick={() => handleSelectApplication(app)}
                          className="w-full p-4 text-left bg-[#e8f5e9] hover:bg-[#d4edda] rounded-xl border-2 border-[#7dd87d]/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-[#1a472a] group-hover:text-[#2e7d32]">{app.projectName}</div>
                              <div className="text-xs text-[#1a472a]/60 mt-1">
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
              {user && userApplications && userApplications.length > 0 && applicants && applicants.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#7dd87d]/30" />
                  <span className="text-xs text-[#1a472a]/40">or select from all applicants</span>
                  <div className="flex-1 h-px bg-[#7dd87d]/30" />
                </div>
              )}

              {/* All Applicants */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {applicantsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#7dd87d]/30 border-t-[#4a7c59] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-[#1a472a]/60">Loading applicants...</p>
                  </div>
                ) : applicants && applicants.length > 0 ? (
                  applicants
                    .filter((app: any) => {
                      // Exclude user's own apps (already shown above)
                      if (!userApplications) return true;
                      return !userApplications.some((ua: any) => ua.id === app.id);
                    })
                    .map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => handleSelectApplication(app)}
                        className="w-full p-4 text-left bg-white hover:bg-[#f0f7f0] rounded-xl border border-[#7dd87d]/30 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#1a472a] group-hover:text-[#2e7d32] truncate">{app.projectName}</div>
                            <div className="text-xs text-[#1a472a]/60 mt-1 truncate">
                              {app.contactName && <span>{app.contactName} - </span>}
                              {app.location}
                            </div>
                            {app.vision && (
                              <p className="text-xs text-[#1a472a]/50 mt-1 line-clamp-2">{app.vision}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-[#4a7c59] flex-shrink-0 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-[#1a472a]/60">
                      {applicantSearch ? 'No projects match your search.' : 'No applicants available yet.'}
                    </p>
                    <p className="text-xs text-[#1a472a]/40 mt-2">
                      Projects must first apply for the current season at <a href="/apply" className="text-[#4a7c59] underline">/apply</a> before creating a campaign.
                    </p>
                  </div>
                )}
              </div>

              {!user && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-[#1a472a]/60 mb-3">
                    Please sign in to access the campaign creator.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/api/oauth/login'}
                    className="bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
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
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7f0] to-[#e8f5e9]">
      
      {/* Hero Image */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
        <img 
          src="https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg"
          alt="Crowd Pooling - We don't need as much money as we think we do!"
          className="w-full h-full object-cover object-center"
        loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f0f7f0] via-transparent to-transparent" />
      </div>
      
      <div className="container py-8 -mt-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#7dd87d]/30">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Create Your Crowd Pooling Campaign
          </h1>
          <p className="text-[#1a472a]/70 max-w-2xl mx-auto mb-4">
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
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#4a7c59]" />
                <span className="text-sm text-[#1a472a]/60">Total Value:</span>
                <span className="text-xl font-bold text-[#1a472a]">{formatCurrency(grandTotal, currencySymbol)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-[#e8f5e9] rounded-full text-[#4a7c59]">
                Land: {formatCurrency(landTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#e8f5e9] rounded-full text-[#4a7c59]">
                Equipment: {formatCurrency(equipmentTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#e8f5e9] rounded-full text-[#4a7c59]">
                Roles: {formatCurrency(rolesTotal, currencySymbol)}
              </span>
              <span className="px-2 py-1 bg-[#e8f5e9] rounded-full text-[#4a7c59]">
                Other: {formatCurrency(otherTotal, currencySymbol)}
              </span>
            </div>
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
                <Button variant="outline" className="border-[#f59e0b] text-[#f59e0b] text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose a Campaign Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-[#1a472a]/70">
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
                            
                            // Load equipment
                            setEquipment(template.equipment.map(eq => ({
                              ...eq,
                              id: generateId(),
                              customValue: null
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
                          className="flex flex-col items-start gap-3 p-4 bg-gradient-to-br from-[#f0f7f0] to-white rounded-xl border-2 border-[#7dd87d]/30 hover:border-[#f59e0b] transition-all text-left group"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#f59e0b]/20 transition-colors">
                            <IconComponent className="w-6 h-6 text-[#4a7c59] group-hover:text-[#f59e0b]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1a472a] mb-1">{template.name}</h3>
                            <p className="text-xs text-[#1a472a]/60 leading-relaxed">{template.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-[#e8f5e9] text-[#4a7c59] rounded-full">
                              {template.equipment.length} equipment items
                            </span>
                            <span className="px-2 py-1 bg-[#e8f5e9] text-[#4a7c59] rounded-full">
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
                    <p className="text-sm text-[#1a472a]/70">
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
                        className="w-full p-3 text-left bg-[#f0f7f0] hover:bg-[#e8f5e9] rounded-lg border border-[#7dd87d]/30 transition-colors"
                      >
                        <div className="font-medium text-[#1a472a]">{app.projectName}</div>
                        <div className="text-xs text-[#1a472a]/60">
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
              <p className="text-xs text-[#1a472a]/60 mt-1">
                This is where contributors will submit their proposals. Required for listing your project.
              </p>
            </div>
            
            {/* Additional Project Info - Collapsible */}
            <div className="md:col-span-2 mt-4">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-[#4a7c59] hover:text-[#2e7d32] flex items-center gap-2">
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
                      <p className="text-xs text-[#4a7c59]/70 mt-1">Supports YouTube, Vimeo, Dailymotion, Wistia, Loom, and direct .mp4 links</p>
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
                <p className="text-sm text-[#1a472a]/70 mb-4">
                  Add photos of your land, team, and progress to help contributors understand your project.
                  The first image will be used as your campaign cover photo.
                </p>
                <div className="bg-white rounded-xl p-4 border border-[#7dd87d]/30">
                  <p className="text-sm text-[#1a472a]/60 mb-4">
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
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Tip:</strong> Photos will be available to upload after your campaign is created.
                      Go to your Campaign Management page to add photos organized by category.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 6: Financial Target */}
          {currentStep === 5 && (
            <FinancialTargetSection
              grandTotal={grandTotal}
              recommendedFinancial={recommendedFinancial}
              financialTarget={financialTarget}
              setFinancialTarget={setFinancialTarget}
              financialNotes={financialNotes}
              setFinancialNotes={setFinancialNotes}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              currencySymbol={currencySymbol}
              landTotal={landTotal}
              equipmentTotal={equipmentTotal}
              rolesTotal={rolesTotal}
              otherTotal={otherTotal}
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
              className="bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitCampaign}
              disabled={isSubmitting || !campaignName || !campaignDescription || !daoLink}
              className="bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-xs text-[#1a472a]/60 mt-3 text-center">
            Your campaign will be reviewed before going live
          </p>
        )}
      </div>
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
          <p className="text-sm text-[#1a472a]/60 mt-1">
            Define the land you need for your project
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#1a472a]/60">Section Total</p>
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
                  <p className="text-sm text-[#1a472a]/60">{req.regions.join(', ') || 'Flexible location'}</p>
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
                <span className="text-sm text-[#1a472a]/60">
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
                        : 'bg-white text-[#1a472a] hover:bg-[#e8f5e9]'
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
                          : 'bg-white text-[#1a472a] hover:bg-[#e8f5e9]'
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
                <Video className="w-4 h-4 text-[#1a472a]/40" />
                <Input
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="bg-white border-[#7dd87d]/30"
                />
              </div>
              <p className="text-xs text-[#4a7c59]/70 mt-1 ml-6">Supports YouTube, Vimeo, Dailymotion, Wistia, Loom, and direct .mp4 links</p>
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
              <p className="text-xs text-[#1a472a]/60 mb-3">
                Based on average land prices in selected regions. You can edit this value if you have better figures.
              </p>
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
                className="flex-1 bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
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
  const [formData, setFormData] = useState<Partial<EquipmentItem>>({
    category: '',
    name: '',
    quantity: 1,
    description: '',
    estimatedValue: 0,
  });
  
  const handleAddFromTemplate = (category: string, item: { name: string; estimatedValue: number }) => {
    const newEquipment: EquipmentItem = {
      id: generateId(),
      category,
      name: item.name,
      quantity: 1,
      description: '',
      estimatedValue: item.estimatedValue,
      customValue: null,
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
    };
    setEquipment([...equipment, newEquipment]);
    setFormData({ category: '', name: '', quantity: 1, description: '', estimatedValue: 0 });
    setShowForm(false);
    toast.success('Equipment added');
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
          <p className="text-sm text-[#1a472a]/60 mt-1">
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
            <p className="text-sm text-[#1a472a]/60">Section Total</p>
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
                    className="w-7 h-7 rounded bg-white text-[#1a472a] hover:bg-[#e8f5e9] text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded bg-white text-[#1a472a] hover:bg-[#e8f5e9] text-sm"
                  >
                    +
                  </button>
                  <span className="text-xs text-[#1a472a]/60 mx-1">x</span>
                  <div className="flex items-center">
                    <span className="text-sm text-[#1a472a]/60 mr-1">{currencySymbol}</span>
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
            </div>
          ))}
        </div>
      )}
      
      {/* Template Categories */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-[#1a472a] flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#f59e0b]" />
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
                <ChevronUp className="w-4 h-4 text-[#1a472a]/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#1a472a]/40" />
              )}
            </button>
            {selectedCategory === cat.category && (
              <div className="p-3 bg-[#f8f5f0] grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.items.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddFromTemplate(cat.category, item)}
                    className="flex items-center justify-between px-3 py-2 bg-white rounded-lg hover:bg-[#e8f5e9] transition-colors text-left"
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
              <p className="text-xs text-[#1a472a]/60 mt-1">You can edit this value if you have better figures</p>
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
          </div>
          <div className="flex gap-2 mt-4">            <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
              Cancel
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={!formData.name}
              className="flex-1 bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
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
  total 
}: {
  roles: RoleRequirement[];
  setRoles: React.Dispatch<React.SetStateAction<RoleRequirement[]>>;
  currencySymbol: string;
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState<Partial<RoleRequirement>>({
    title: '',
    category: '',
    description: '',
    hoursPerWeek: 20,
    weeksNeeded: 52,
    hourlyRate: 30,
  });
  
  const calculatedValue = (formData.hoursPerWeek || 0) * (formData.weeksNeeded || 0) * (formData.hourlyRate || 0);
  
  const handleAddFromTemplate = (category: string, role: { title: string; hourlyRate: number; hoursPerWeek: number; description: string }) => {
    const newRole: RoleRequirement = {
      id: generateId(),
      title: role.title,
      category,
      description: role.description,
      hoursPerWeek: role.hoursPerWeek,
      weeksNeeded: 52, // Default to 1 year
      hourlyRate: role.hourlyRate,
      estimatedValue: role.hoursPerWeek * 52 * role.hourlyRate,
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
      description: formData.description || '',
      hoursPerWeek: formData.hoursPerWeek || 20,
      weeksNeeded: formData.weeksNeeded || 52,
      hourlyRate: formData.hourlyRate || 30,
      estimatedValue: calculatedValue,
      customValue: null,
    };
    setRoles([...roles, newRole]);
    setFormData({ title: '', category: '', description: '', hoursPerWeek: 20, weeksNeeded: 52, hourlyRate: 30 });
    setShowForm(false);
    toast.success('Role added');
  };
  
  const handleRemove = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
    toast.success('Role removed');
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
          <p className="text-sm text-[#1a472a]/60 mt-1">
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
            <p className="text-sm text-[#1a472a]/60">Section Total</p>
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
                      value={role.hoursPerWeek}
                      onChange={(e) => updateRole(role.id, 'hoursPerWeek', parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/60">h/wk</span>
                  </div>
                  <span className="text-[#1a472a]/40">x</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={role.weeksNeeded}
                      onChange={(e) => updateRole(role.id, 'weeksNeeded', parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/60">wks</span>
                  </div>
                  <span className="text-[#1a472a]/40">@</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[#1a472a]/60">{currencySymbol}</span>
                    <Input
                      type="number"
                      value={role.hourlyRate}
                      onChange={(e) => updateRole(role.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-sm bg-white border-[#7dd87d]/30 text-center"
                    />
                    <span className="text-[#1a472a]/60">/h</span>
                  </div>
                  <span className="text-[#1a472a]/40">=</span>
                  <span className="font-bold text-[#1a472a]">
                    {formatCurrency(role.customValue ?? role.estimatedValue, currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Template Categories */}
      <div className="space-y-4 mb-6">
        <h3 className="font-medium text-[#1a472a] flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#f59e0b]" />
          Common Roles (click to add)
        </h3>
        
        {ROLE_TEMPLATES.map((cat) => (
          <div key={cat.category} className="border border-[#7dd87d]/30 rounded-xl overflow-hidden">
            <button
              onClick={() => setSelectedCategory(selectedCategory === cat.category ? '' : cat.category)}
              className="w-full px-4 py-3 bg-white hover:bg-[#f0f7f0] flex items-center justify-between transition-colors"
            >
              <span className="font-medium text-[#1a472a]">{cat.category}</span>
              {selectedCategory === cat.category ? (
                <ChevronUp className="w-4 h-4 text-[#1a472a]/40" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#1a472a]/40" />
              )}
            </button>
            {selectedCategory === cat.category && (
              <div className="p-3 bg-[#f8f5f0] space-y-2">
                {cat.roles.map((role) => (
                  <button
                    key={role.title}
                    onClick={() => handleAddFromTemplate(cat.category, role)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg hover:bg-[#e8f5e9] transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-medium text-[#1a472a]">{role.title}</span>
                      <p className="text-xs text-[#1a472a]/60">{role.hoursPerWeek}h/week @ {formatCurrency(role.hourlyRate, currencySymbol)}/h</p>
                    </div>
                    <span className="text-sm font-medium text-[#4a7c59]">
                      {formatCurrency(role.hoursPerWeek * 52 * role.hourlyRate, currencySymbol)}/yr
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
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
              <label className="block text-sm font-medium text-[#1a472a] mb-1">Hours/Week</label>
              <Input
                type="number"
                value={formData.hoursPerWeek || ''}
                onChange={(e) => setFormData({ ...formData, hoursPerWeek: parseInt(e.target.value) || 0 })}
                className="bg-white border-[#7dd87d]/30"
              />
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
                <p className="text-xs text-[#1a472a]/60">Calculated Value:</p>
                <p className="text-lg font-bold text-[#4a7c59]">{formatCurrency(calculatedValue, currencySymbol)}</p>
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
                <p className="text-xs text-[#1a472a]/60 mt-1">You can edit this value if you have better figures</p>
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
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
              Cancel
            </Button>
            <Button
              onClick={handleAddCustom}
              disabled={!formData.title}
              className="flex-1 bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
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
  
  const openFormWithCategory = (categoryId: string) => {
    const cat = OTHER_CATEGORIES.find(c => c.id === categoryId);
    setFormData({ ...formData, category: categoryId, title: cat?.label || '' });
    setShowForm(true);
    // Scroll to form after a tick so it's rendered
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };
  
  const handleAdd = () => {
    const newNeed: OtherNeed = {
      id: generateId(),
      category: formData.category || 'other',
      title: formData.title || '',
      description: formData.description || '',
      estimatedValue: formData.estimatedValue || 0,
      customValue: null,
    };
    setNeeds([...needs, newNeed]);
    setFormData({ category: 'other', title: '', description: '', estimatedValue: 0 });
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
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Package className="w-6 h-6 text-[#4a7c59]" />
            Other Needs
          </h2>
          <p className="text-sm text-[#1a472a]/60 mt-1">
            Permits, insurance, training, and anything else your project needs
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#1a472a]/60">Section Total</p>
          <p className="text-xl font-bold text-[#4a7c59]">{formatCurrency(total, currencySymbol)}</p>
        </div>
      </div>
      
      {/* Existing Needs */}
      {needs.length > 0 && (
        <div className="space-y-2 mb-6">
          {needs.map((need) => {
            const catInfo = OTHER_CATEGORIES.find(c => c.id === need.category);
            const Icon = catInfo?.icon || HelpCircle;
            return (
              <div key={need.id} className="bg-[#f0f7f0] rounded-xl p-3 border border-[#7dd87d]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-[#4a7c59]" />
                  <div>
                    <span className="font-medium text-[#1a472a]">{need.title}</span>
                    <p className="text-xs text-[#1a472a]/60">{catInfo?.label || need.category}</p>
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
            );
          })}
        </div>
      )}
      
      {/* Highly Suggested Needs */}
      <div className="mb-6" ref={listRef}>
        <h3 className="font-medium text-[#1a472a] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#f59e0b]" />
          Highly Suggested
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {OTHER_CATEGORIES.filter(cat => cat.suggested).map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => openFormWithCategory(cat.id)}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#f59e0b]/10 to-[#7dd87d]/10 rounded-xl border-2 border-[#f59e0b]/30 hover:border-[#f59e0b] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#f59e0b]/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <span className="font-medium text-[#1a472a] block">{cat.label}</span>
                  <span className="text-xs text-[#1a472a]/60">{cat.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Quick Add Categories */}
      <div className="mb-6">
        <h3 className="font-medium text-[#1a472a] mb-3">Other Categories</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {OTHER_CATEGORIES.filter(cat => !cat.suggested).map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => openFormWithCategory(cat.id)}
                className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-[#7dd87d]/30 hover:bg-[#f0f7f0] transition-colors"
              >
                <Icon className="w-5 h-5 text-[#4a7c59]" />
                <span className="text-xs text-[#1a472a]">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Add Form */}
      {showForm && (
        <div ref={formRef} className="bg-[#f8f5f0] rounded-xl p-6 border border-[#7dd87d]/30">
          <h3 className="font-medium text-[#1a472a] mb-4">
            Add {OTHER_CATEGORIES.find(c => c.id === formData.category)?.label || 'Item'}
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
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#4a7c59]/10">
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.title}
                className="flex-1 bg-[#4a7c59] hover:bg-[#2e7d32] text-white rounded-xl"
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

// Financial Target Section Component
function FinancialTargetSection({ 
  grandTotal,
  recommendedFinancial,
  financialTarget,
  setFinancialTarget,
  financialNotes,
  setFinancialNotes,
  durationDays,
  setDurationDays,
  currencySymbol,
  landTotal,
  equipmentTotal,
  rolesTotal,
  otherTotal,
}: {
  grandTotal: number;
  recommendedFinancial: number;
  financialTarget: number;
  setFinancialTarget: (value: number) => void;
  financialNotes: string;
  setFinancialNotes: (value: string) => void;
  durationDays: number;
  setDurationDays: (value: number) => void;
  currencySymbol: string;
  landTotal: number;
  equipmentTotal: number;
  rolesTotal: number;
  otherTotal: number;
}) {
  const financialPercentage = grandTotal > 0 ? (financialTarget / grandTotal) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Target className="w-6 h-6 text-[#4a7c59]" />
            Financial Target
          </h2>
          <p className="text-sm text-[#1a472a]/60 mt-1">
            How much actual money do you need to raise?
          </p>
        </div>
      </div>
      
      {/* Summary */}
      <div className="bg-gradient-to-br from-[#4a7c59] to-[#2e7d32] rounded-2xl p-6 text-white mb-6">
        <h3 className="text-lg font-medium mb-4 opacity-90">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs opacity-70">Land</p>
            <p className="text-xl font-bold">{formatCurrency(landTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Equipment</p>
            <p className="text-xl font-bold">{formatCurrency(equipmentTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Roles</p>
            <p className="text-xl font-bold">{formatCurrency(rolesTotal, currencySymbol)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Other</p>
            <p className="text-xl font-bold">{formatCurrency(otherTotal, currencySymbol)}</p>
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg">Total Campaign Value</span>
            <span className="text-3xl font-bold">{formatCurrency(grandTotal, currencySymbol)}</span>
          </div>
        </div>
      </div>
      
      {/* Financial Target Input */}
      <div className="bg-[#fff8e1] rounded-2xl p-6 border border-[#f59e0b]/30 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[#1a472a]">Why set a financial target?</h3>
            <p className="text-sm text-[#1a472a]/70 mt-1">
              While crowd pooling can provide land, equipment, and skills directly, some things require actual money: 
              permits, insurance, emergency funds, and operational costs. We recommend at least 20% of your total 
              campaign value be in financial contributions.
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-[#f59e0b]/20">
          <label className="block text-sm font-medium text-[#1a472a] mb-2">
            Financial Target ({currencySymbol})
          </label>
          
          {/* Full-width input with currency symbol */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#1a472a]/60">
              {currencySymbol}
            </span>
            <Input
              type="number"
              value={financialTarget || ''}
              onChange={(e) => setFinancialTarget(parseFloat(e.target.value) || 0)}
              placeholder={recommendedFinancial.toString()}
              className="w-full bg-white border-[#7dd87d]/30 text-2xl font-bold pl-10 h-14"
            />
          </div>
          
          {/* Percentage info */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <span className="text-[#1a472a]/60">
              {financialPercentage.toFixed(1)}% of total needs
            </span>
            <span className="text-[#4a7c59] font-medium">
              Recommended: {formatCurrency(recommendedFinancial, currencySymbol)} (20%)
            </span>
          </div>
          
          {/* Percentage slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#1a472a]/60">
              <span>5%</span>
              <span>Adjust % of total needs</span>
              <span>50%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={Math.min(50, Math.max(5, financialPercentage))}
              onChange={(e) => setFinancialTarget(Math.round(grandTotal * (parseInt(e.target.value) / 100)))}
              className="w-full h-3 bg-gradient-to-r from-[#e8f5e9] via-[#7dd87d] to-[#4a7c59] rounded-full appearance-none cursor-pointer"
              style={{
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, #e8f5e9 0%, #7dd87d ${((financialPercentage - 5) / 45) * 100}%, #e0e0e0 ${((financialPercentage - 5) / 45) * 100}%, #e0e0e0 100%)`
              }}
            />
            <div className="flex justify-between text-xs">
              <span className="text-[#1a472a]/40">Conservative</span>
              <span className="text-[#4a7c59] font-medium">{financialPercentage.toFixed(0)}%</span>
              <span className="text-[#1a472a]/40">Flexible</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Campaign Duration */}
      <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30 mb-6">
        <h3 className="font-medium text-[#1a472a] mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4a7c59]" />
          Campaign Duration
        </h3>
        <p className="text-sm text-[#1a472a]/60 mb-4">
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
            <span className="text-[#1a472a]/70">days</span>
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
            className="w-full h-2 bg-gradient-to-r from-[#e8f5e9] to-[#4a7c59] rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#1a472a]/40 mt-1">
            <span>1 day</span>
            <span className="text-[#4a7c59] font-medium">
              {durationDays} day{durationDays !== 1 ? 's' : ''}
              {durationDays >= 30 ? ` (~${Math.round(durationDays / 30)} month${Math.round(durationDays / 30) !== 1 ? 's' : ''})` : ''}
            </span>
            <span>1 year</span>
          </div>
        </div>
      </div>
      
      {/* Notes */}
      <div className="bg-white rounded-2xl p-6 border border-[#7dd87d]/30">
        <label className="block text-sm font-medium text-[#1a472a] mb-2">
          Additional Notes (optional)
        </label>
        <Textarea
          value={financialNotes}
          onChange={(e) => setFinancialNotes(e.target.value)}
          placeholder="Any additional context about your financial needs..."
          className="bg-white border-[#7dd87d]/30 min-h-[100px]"
        />
      </div>
    </div>
  );
}
