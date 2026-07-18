/**
 * Crowd Pooling Tool Component
 * An interactive tool for land projects to pool capital from multiple contributors
 * Tracks immediate contributions and future value commitments
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { getLoginUrl } from '@/const';
import { 
  Calculator, 
  Coins, 
  Package, 
  Wrench,
  Car,
  Tractor,
  Hammer,
  Laptop,
  TreePine,
  Home,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  Info,
  Download,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Euro,
  PoundSterling,
  Users,
  Target,
  Send,
  Lightbulb,
  Copy,
  Save,
  FolderOpen,
  Star,
  LogIn,
  Sprout,
  BookOpen,
  Compass,
  Palette,
  Sparkles,
  HeartPulse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SuggestUpgradesSheet, { suggestedRoles } from '@/components/SuggestUpgradesSheet';
import { CAPITAL_TYPES, zeroCapitalScores, type CapitalType } from '@shared/capitals';
import {
  CONTRIBUTION_CATEGORIES,
  ROLE_TEMPLATES_BY_CAPITAL,
  CAPITAL_LABELS,
  CRYPTO_PAYMENT_CONTEXT,
  categoryForKey,
  type RoleTemplate,
} from '@shared/crowdpoolingTaxonomy';

// Currency definitions
const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

// Icon components for the shared taxonomy's icon names
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
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

// Immediate contribution categories, derived from the shared taxonomy
// (shared/crowdpoolingTaxonomy.ts) so the Tool speaks the same language
// as campaigns and the Contribution Calculator
const immediateCategories = CONTRIBUTION_CATEGORIES.map((cat) => ({
  id: cat.key,
  name: cat.label,
  icon: (cat.icon && categoryIcons[cat.icon]) || Package,
  description: cat.examples.join(', '),
  capital: cat.capital,
}));

// Contribution interfaces
interface ImmediateContribution {
  id: string;
  category: string;
  description: string;
  value: number;
  capital: CapitalType;
}

interface FutureContribution {
  id: string;
  roleName: string;
  weeks: number;
  hoursPerWeek: number;
  hourlyRate: number;
  capital: CapitalType;
}

interface ContributorData {
  name: string;
  email: string;
  immediateContributions: ImmediateContribution[];
  futureContributions: FutureContribution[];
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Format currency for display
const formatCurrency = (value: number, symbol: string): string => {
  if (value >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(1)}K`;
  }
  return `${symbol}${value.toLocaleString()}`;
};

// LocalStorage key for saving form data
const STORAGE_KEY = 'crowdPoolingFormData';

// Type guard for the nine-capital enum
const isCapital = (v: unknown): v is CapitalType =>
  typeof v === 'string' && (CAPITAL_TYPES as readonly string[]).includes(v);

// Older saved data (localStorage, saved profiles, shared JSON) predates the
// capital field and may use the old "money" category. These normalizers fill
// in capitals via the shared taxonomy so old forms keep loading.
const normalizeImmediate = (items: unknown): ImmediateContribution[] => {
  if (!Array.isArray(items)) return [];
  return items.map((c: any) => {
    const category = categoryForKey(String(c?.category ?? ''))?.key ?? 'other';
    return {
      id: typeof c?.id === 'string' ? c.id : generateId(),
      category,
      description: typeof c?.description === 'string' ? c.description : '',
      value: typeof c?.value === 'number' ? c.value : 0,
      capital: isCapital(c?.capital)
        ? c.capital
        : categoryForKey(category)?.capital ?? 'material',
    };
  });
};

const normalizeFuture = (items: unknown): FutureContribution[] => {
  if (!Array.isArray(items)) return [];
  return items.map((f: any) => ({
    id: typeof f?.id === 'string' ? f.id : generateId(),
    roleName: typeof f?.roleName === 'string' ? f.roleName : '',
    weeks: typeof f?.weeks === 'number' ? f.weeks : 12,
    hoursPerWeek: typeof f?.hoursPerWeek === 'number' ? f.hoursPerWeek : 8,
    hourlyRate: typeof f?.hourlyRate === 'number' ? f.hourlyRate : 25,
    capital: isCapital(f?.capital) ? f.capital : 'experiential',
  }));
};

// Compact list of pooled value across the nine forms of capital
function CapitalSummaryList({
  totals,
  symbol,
}: {
  totals: Record<CapitalType, number>;
  symbol: string;
}) {
  const active = CAPITAL_TYPES.filter((c) => totals[c] > 0);
  if (active.length === 0) return null;
  return (
    <div className="bg-white/80 rounded-xl p-4 border border-[#7dd87d]/20">
      <div className="flex items-center gap-2 mb-3">
        <Coins className="w-5 h-5 text-[#4a7c59]" />
        <span className="font-bold text-[#1a472a]">Your Contribution by Capital</span>
      </div>
      <div className="space-y-1.5">
        {active.map((c) => (
          <div key={c} className="flex items-center justify-between text-sm">
            <span className="text-[#1a472a]/80">{CAPITAL_LABELS[c].label}</span>
            <span className="font-medium text-[#1a472a]">{formatCurrency(totals[c], symbol)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrowdPoolingTool() {
  // Get URL search params
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  
  // Project setup - initialize from URL params or defaults
  const [projectName, setProjectName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(100000);
  const [currency, setCurrency] = useState('USD');
  const [showSetup, setShowSetup] = useState(true);
  const [isGenericMode, setIsGenericMode] = useState(false);
  const [hasNoTarget, setHasNoTarget] = useState(false);
  
  // Contributor data
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  
  // Contributions - must be declared before useEffects that reference them
  const [immediateContributions, setImmediateContributions] = useState<ImmediateContribution[]>([]);
  const [futureContributions, setFutureContributions] = useState<FutureContribution[]>([]);
  
  // Auth and saved contributions
  const { user, isAuthenticated } = useAuth();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // tRPC mutations for saving contributions
  const savedContributionsQuery = trpc.savedContributions.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createSavedContribution = trpc.savedContributions.create.useMutation({
    onSuccess: () => {
      toast.success('Contribution form saved to your profile!');
      setShowSaveDialog(false);
      setSaveName('');
      savedContributionsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
  const deleteSavedContribution = trpc.savedContributions.delete.useMutation({
    onSuccess: () => {
      toast.success('Saved contribution deleted');
      savedContributionsQuery.refetch();
    },
    onError: (err) => toast.error(err.message || 'Failed to delete'),
  });
  const setDefaultContribution = trpc.savedContributions.setDefault.useMutation({
    onSuccess: () => {
      toast.success('Set as default contribution form');
      savedContributionsQuery.refetch();
    },
    onError: (err) => toast.error(err.message || 'Failed to update default'),
  });
  
  // Load from URL params on mount
  useEffect(() => {
    const projectParam = urlParams.get('project');
    const targetParam = urlParams.get('target');
    const currencyParam = urlParams.get('currency');
    
    if (projectParam) {
      setProjectName(decodeURIComponent(projectParam));
    }
    if (targetParam) {
      const targetValue = parseFloat(targetParam);
      if (!isNaN(targetValue) && targetValue > 0) {
        setTargetAmount(targetValue);
      }
    }
    if (currencyParam && currencies.some(c => c.code === currencyParam)) {
      setCurrency(currencyParam);
    }
  }, []);
  
  // Load saved form data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !urlParams.get('project')) {
      try {
        const data = JSON.parse(saved);
        if (data.contributorName) setContributorName(data.contributorName);
        if (data.contributorEmail) setContributorEmail(data.contributorEmail);
        if (data.immediateContributions) setImmediateContributions(normalizeImmediate(data.immediateContributions));
        if (data.futureContributions) setFutureContributions(normalizeFuture(data.futureContributions));
        // Only load project-specific data if not coming from a project link
        if (!urlParams.get('project')) {
          if (data.projectName) setProjectName(data.projectName);
          if (data.targetAmount) setTargetAmount(data.targetAmount);
          if (data.currency) setCurrency(data.currency);
          if (data.isGenericMode) setIsGenericMode(data.isGenericMode);
          if (data.hasNoTarget) setHasNoTarget(data.hasNoTarget);
        }
      } catch (e) {
        console.error('Failed to load saved form data:', e);
      }
    }
  }, []);
  
  // Auto-save to localStorage when form changes
  useEffect(() => {
    const dataToSave = {
      projectName,
      targetAmount,
      currency,
      contributorName,
      contributorEmail,
      immediateContributions,
      futureContributions,
      isGenericMode,
      hasNoTarget,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [projectName, targetAmount, currency, contributorName, contributorEmail, immediateContributions, futureContributions, isGenericMode, hasNoTarget]);
  
  // Clear form function
  const clearForm = () => {
    setProjectName('');
    setTargetAmount(100000);
    setCurrency('USD');
    setContributorName('');
    setContributorEmail('');
    setImmediateContributions([]);
    setFutureContributions([]);
    setIsGenericMode(false);
    setHasNoTarget(false);
    setShowSetup(true);
    setShowResults(false);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('Form cleared!');
  };
  
  // Save to profile function
  const handleSaveToProfile = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save to your profile');
      return;
    }
    setShowSaveDialog(true);
    setSaveName(projectName || 'My Contribution Form');
  };
  
  const confirmSaveToProfile = () => {
    if (!saveName.trim()) {
      toast.error('Please enter a name for this saved form');
      return;
    }

    // Normalize email: server schema rejects malformed strings with a zod
    // validation error that surfaces as an onError toast. Treat anything
    // that doesn't pass a basic shape check as empty so the save isn't
    // blocked by a half-typed email the user didn't mean to submit.
    const trimmedEmail = (contributorEmail ?? "").trim();
    const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? trimmedEmail : "";

    createSavedContribution.mutate({
      name: saveName.trim(),
      isDefault: saveAsDefault,
      projectName: projectName || undefined,
      targetAmount: hasNoTarget ? undefined : targetAmount,
      currency,
      contributorName: contributorName || undefined,
      contributorEmail: safeEmail || undefined,
      immediateContributions: JSON.stringify(immediateContributions),
      futureContributions: JSON.stringify(futureContributions),
      totalImmediateValue: immediateTotal,
      totalFutureValue: futureTotal,
    });
  };
  
  // Load from profile function
  const loadFromProfile = (savedContribution: any) => {
    if (savedContribution.projectName) setProjectName(savedContribution.projectName);
    if (savedContribution.targetAmount) {
      setTargetAmount(savedContribution.targetAmount);
      setHasNoTarget(false);
    } else {
      setHasNoTarget(true);
    }
    if (savedContribution.currency) setCurrency(savedContribution.currency);
    if (savedContribution.contributorName) setContributorName(savedContribution.contributorName);
    if (savedContribution.contributorEmail) setContributorEmail(savedContribution.contributorEmail);
    
    try {
      if (savedContribution.immediateContributions) {
        setImmediateContributions(normalizeImmediate(JSON.parse(savedContribution.immediateContributions)));
      }
      if (savedContribution.futureContributions) {
        setFutureContributions(normalizeFuture(JSON.parse(savedContribution.futureContributions)));
      }
    } catch (e) {
      console.error('Failed to parse saved contributions:', e);
    }
    
    setShowLoadDialog(false);
    toast.success(`Loaded: ${savedContribution.name}`);
  };
  
  // UI state
  const [activeSection, setActiveSection] = useState<'immediate' | 'future'>('immediate');
  const [showResults, setShowResults] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Get current currency symbol
  const currencySymbol = currencies.find(c => c.code === currency)?.symbol || '$';
  
  // Calculate totals
  const immediateTotal = useMemo(() => {
    return immediateContributions.reduce((sum, c) => sum + c.value, 0);
  }, [immediateContributions]);
  
  const futureTotal = useMemo(() => {
    return futureContributions.reduce((sum, c) => sum + (c.weeks * c.hoursPerWeek * c.hourlyRate), 0);
  }, [futureContributions]);
  
  const grandTotal = immediateTotal + futureTotal;
  const progressPercentage = targetAmount > 0 ? Math.min((grandTotal / targetAmount) * 100, 100) : 0;

  // Pooled value across the nine forms of capital
  const capitalTotals = useMemo(() => {
    const totals = zeroCapitalScores();
    immediateContributions.forEach((c) => {
      totals[isCapital(c.capital) ? c.capital : 'material'] += c.value;
    });
    futureContributions.forEach((f) => {
      totals[isCapital(f.capital) ? f.capital : 'experiential'] += f.weeks * f.hoursPerWeek * f.hourlyRate;
    });
    return totals;
  }, [immediateContributions, futureContributions]);

  // Add immediate contribution
  const addImmediateContribution = () => {
    setImmediateContributions([
      ...immediateContributions,
      {
        id: generateId(),
        category: 'crypto',
        description: '',
        value: 0,
        capital: 'financial',
      }
    ]);
  };

  // Update immediate contribution; a category change also updates the capital
  const updateImmediateContribution = (id: string, field: keyof ImmediateContribution, value: string | number) => {
    setImmediateContributions(contributions =>
      contributions.map(c => {
        if (c.id !== id) return c;
        const next = { ...c, [field]: value } as ImmediateContribution;
        if (field === 'category') {
          next.capital = categoryForKey(String(value))?.capital ?? 'material';
        }
        return next;
      })
    );
  };
  
  // Remove immediate contribution
  const removeImmediateContribution = (id: string) => {
    setImmediateContributions(contributions => contributions.filter(c => c.id !== id));
  };
  
  // Add future contribution
  const addFutureContribution = () => {
    setFutureContributions([
      ...futureContributions,
      {
        id: generateId(),
        roleName: '',
        weeks: 12,
        hoursPerWeek: 8,
        hourlyRate: 25,
        capital: 'experiential',
      }
    ]);
  };

  // Add a role commitment from a shared taxonomy template
  const addRoleFromTemplate = (capital: CapitalType, role: RoleTemplate) => {
    setFutureContributions(prev => [
      ...prev,
      {
        id: generateId(),
        roleName: role.title,
        weeks: 12,
        hoursPerWeek: role.defaultHoursPerWeek,
        hourlyRate: role.defaultHourlyRate,
        capital,
      },
    ]);
    toast.success(`${role.title} added`);
  };

  // Update which capital a role commitment counts toward
  const updateFutureCapital = (id: string, capital: CapitalType) => {
    setFutureContributions(contributions =>
      contributions.map(c => (c.id === id ? { ...c, capital } : c))
    );
  };
  
  // Update future contribution
  const updateFutureContribution = (id: string, field: keyof FutureContribution, value: string | number) => {
    setFutureContributions(contributions =>
      contributions.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
  };
  
  // Remove future contribution
  const removeFutureContribution = (id: string) => {
    setFutureContributions(contributions => contributions.filter(c => c.id !== id));
  };
  
  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;
    
    // Colors
    const darkGreen: [number, number, number] = [26, 71, 42];
    const primaryGreen: [number, number, number] = [46, 125, 50];
    const warmBg: [number, number, number] = [252, 251, 248];
    
    // Background
    doc.setFillColor(...warmBg);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...darkGreen);
    doc.text('Crowd Pooling Contribution', pageWidth / 2, yPos + 10, { align: 'center' });
    
    yPos += 20;
    
    // Project info
    doc.setFontSize(14);
    doc.text(projectName || 'Untitled Project', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Contributor info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Contributor: ${contributorName || 'Anonymous'}`, margin, yPos);
    if (contributorEmail) {
      doc.text(`Email: ${contributorEmail}`, margin, yPos + 6);
      yPos += 6;
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos + 6);
    
    yPos += 20;
    
    // Progress bar
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 8, 2, 2, 'F');
    doc.setFillColor(...primaryGreen);
    doc.roundedRect(margin, yPos, (pageWidth - margin * 2) * (progressPercentage / 100), 8, 2, 2, 'F');
    
    yPos += 15;
    
    // Total summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...darkGreen);
    doc.text(`Total Contribution: ${formatCurrency(grandTotal, currencySymbol)}`, pageWidth / 2, yPos, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Target: ${formatCurrency(targetAmount, currencySymbol)} (${progressPercentage.toFixed(1)}%)`, pageWidth / 2, yPos + 6, { align: 'center' });
    
    yPos += 20;
    
    // Immediate contributions section
    if (immediateContributions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...darkGreen);
      doc.text('Immediate Contributions', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Subtotal: ${formatCurrency(immediateTotal, currencySymbol)}`, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 8;
      
      immediateContributions.forEach((contribution) => {
        const category = immediateCategories.find(c => c.id === contribution.category);
        const capitalLabel = CAPITAL_LABELS[contribution.capital]?.label || 'Material';
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${category?.name || 'Other'} [${capitalLabel}]: ${contribution.description || 'No description'}`, margin + 5, yPos);
        doc.text(formatCurrency(contribution.value, currencySymbol), pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;
      });
      
      yPos += 10;
    }
    
    // Future contributions section
    if (futureContributions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...darkGreen);
      doc.text('Future Value Commitments', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Subtotal: ${formatCurrency(futureTotal, currencySymbol)}`, pageWidth - margin, yPos, { align: 'right' });
      
      yPos += 8;
      
      futureContributions.forEach((contribution) => {
        const totalValue = contribution.weeks * contribution.hoursPerWeek * contribution.hourlyRate;
        const capitalLabel = CAPITAL_LABELS[contribution.capital]?.label || 'Experiential';
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`${contribution.roleName || 'Role'} [${capitalLabel}]: ${contribution.weeks}wks x ${contribution.hoursPerWeek}hrs/wk x ${currencySymbol}${contribution.hourlyRate}/hr`, margin + 5, yPos);
        doc.text(formatCurrency(totalValue, currencySymbol), pageWidth - margin, yPos, { align: 'right' });
        yPos += 6;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by ReGen Civics Crowd Pooling Tool', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    // Save
    doc.save(`${projectName || 'crowd-pooling'}-contribution.pdf`);
    toast.success('PDF downloaded successfully!');
  };
  
  // Project setup screen
  if (showSetup) {
    return (
      <div className="bg-gradient-to-br from-[#f0f7f0] to-[#f0ebe3] rounded-2xl p-6 md:p-8 border border-[#7dd87d]/30">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-[#4a7c59]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              Crowd Pooling Tool
            </h3>
            <p className="text-sm text-[#1a472a]/80">Pool capital from multiple contributors</p>
          </div>
        </div>
        
        {/* Info box */}
        <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800">
                <strong>How it works:</strong> This tool helps land projects pool capital from multiple contributors. Each contributor fills out their own form, and the project can aggregate all contributions to show the total pooled resources.
              </p>
            </div>
          </div>
        </div>
        
        {/* Project setup form */}
        <div className="space-y-4">
          {/* Generic Mode Toggle */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="genericMode"
                checked={isGenericMode}
                onChange={(e) => {
                  setIsGenericMode(e.target.checked);
                  if (e.target.checked) {
                    setProjectName('Generic Contribution');
                  } else {
                    setProjectName('');
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <label htmlFor="genericMode" className="text-sm font-medium text-amber-800 cursor-pointer">
                  Not sure which project you'll join?
                </label>
                <p className="text-xs text-amber-700 mt-1">
                  Build a reusable contribution proposal that you can submit to multiple projects. Perfect for showcasing all the value you can bring!
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1a472a] mb-2">
              Project Name {isGenericMode && <span className="text-amber-600 text-xs">(optional for generic forms)</span>}
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={isGenericMode ? "Leave blank or enter 'Generic Contribution'" : "e.g., Sunrise Ecovillage"}
              className="bg-white border-[#7dd87d]/30 focus:border-[#7dd87d] focus:ring-[#7dd87d]/20"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#1a472a]">
                Target Amount
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="noTarget"
                  checked={hasNoTarget}
                  onChange={(e) => setHasNoTarget(e.target.checked)}
                  className="h-4 w-4 rounded border-[#7dd87d] text-[#4a7c59] focus:ring-[#7dd87d]"
                />
                <label htmlFor="noTarget" className="text-xs text-[#1a472a]/70 cursor-pointer">
                  No target (unlimited)
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-32 bg-white border-[#7dd87d]/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a472a]/80">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  value={hasNoTarget ? '' : targetAmount}
                  onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 100000)}
                  placeholder={hasNoTarget ? "No target set" : "100,000"}
                  disabled={hasNoTarget}
                  className="pl-8 bg-white border-[#7dd87d]/30 focus:border-[#7dd87d] focus:ring-[#7dd87d]/20 disabled:bg-gray-100 disabled:text-gray-300"
                />
              </div>
            </div>
            {hasNoTarget && (
              <p className="text-xs text-[#4a7c59] mt-1">
                Contributions can be any amount with no upper limit.
              </p>
            )}
          </div>
          
          <div className="pt-4 border-t border-[#7dd87d]/20">
            <label className="block text-sm font-medium text-[#1a472a] mb-2">
              Your Name (Contributor)
            </label>
            <Input
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              placeholder="Your full name"
              className="bg-white border-[#7dd87d]/30 focus:border-[#7dd87d] focus:ring-[#7dd87d]/20"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1a472a] mb-2">
              Your Email (Optional)
            </label>
            <Input
              type="email"
              value={contributorEmail}
              onChange={(e) => setContributorEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-white border-[#7dd87d]/30 focus:border-[#7dd87d] focus:ring-[#7dd87d]/20"
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              onClick={clearForm}
              variant="outline"
              size="sm"
              className="rounded-xl border-[#1a472a]/30 text-[#1a472a] hover:bg-[#1a472a]/5"
            >
              Clear Form
            </Button>
            
            {isAuthenticated ? (
              <>
                <Button
                  onClick={handleSaveToProfile}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#4a7c59]/30 text-[#4a7c59] hover:bg-[#4a7c59]/5"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save to Profile
                </Button>
                <Button
                  onClick={() => setShowLoadDialog(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#4a7c59]/30 text-[#4a7c59] hover:bg-[#4a7c59]/5"
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Load Saved
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                variant="outline"
                size="sm"
                className="rounded-xl border-[#4a7c59]/30 text-[#4a7c59] hover:bg-[#4a7c59]/5"
              >
                <LogIn className="w-4 h-4 mr-1" />
                Sign in to Save
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => setShowSetup(false)}
            disabled={!isGenericMode && !projectName}
            className="w-full mt-3 rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white"
          >
            Start Adding Contributions
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="bg-white md:max-w-md md:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Save Contribution Form
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1a472a] mb-1">Name</label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My Contribution Form"
                  className="bg-white border-[#7dd87d]/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveAsDefault"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-[#7dd87d] text-[#4a7c59]"
                />
                <label htmlFor="saveAsDefault" className="text-sm text-[#1a472a]/70">
                  Set as default form (auto-load on new proposals)
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmSaveToProfile}
                disabled={createSavedContribution.isPending}
                className="flex-1 rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white"
              >
                {createSavedContribution.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Load Dialog */}
        <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
          <DialogContent className="bg-white md:max-w-lg md:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Load Saved Contribution Form
              </DialogTitle>
            </DialogHeader>
            {savedContributionsQuery.isLoading ? (
              <p className="text-[#1a472a]/80 text-center py-8">Loading...</p>
            ) : savedContributionsQuery.data?.length === 0 ? (
              <p className="text-[#1a472a]/80 text-center py-8">No saved forms yet. Create one by clicking "Save to Profile".</p>
            ) : (
              <div className="space-y-2">
                {savedContributionsQuery.data?.map((saved) => (
                  <div
                    key={saved.id}
                    className="p-4 border border-[#7dd87d]/30 rounded-xl hover:bg-[#f0f7f0] cursor-pointer transition-colors"
                    onClick={() => loadFromProfile(saved)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1a472a]">{saved.name}</span>
                          {saved.isDefault && (
                            <span className="text-xs bg-[#7dd87d]/20 text-[#4a7c59] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#1a472a]/80 mt-1">
                          {saved.projectName || 'Generic Form'} - {formatCurrency((saved.totalImmediateValue || 0) + (saved.totalFutureValue || 0), currencySymbol)} total
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!saved.isDefault && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultContribution.mutate({ id: saved.id });
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Set as default"
                          >
                            <Star className="w-4 h-4 text-[#4a7c59]" />
                          </Button>
                        )}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this saved form?')) {
                              deleteSavedContribution.mutate({ id: saved.id });
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          title="Delete"
                          aria-label="Delete saved contribution"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={() => setShowLoadDialog(false)}
              variant="outline"
              className="w-full rounded-xl"
            >
              Close
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Results screen
  if (showResults) {
    return (
      <div className="bg-gradient-to-br from-[#f0f7f0] to-[#f0ebe3] rounded-2xl p-6 md:p-8 border border-[#7dd87d]/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7dd87d]/20 mb-4">
            <Target className="w-8 h-8 text-[#4a7c59]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Contribution Summary
          </h3>
          <p className="text-[#1a472a]/80">{projectName}</p>
          {contributorName && <p className="text-sm text-[#1a472a]/80">Contributor: {contributorName}</p>}
        </div>
        
        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-[#7dd87d]/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#1a472a]/80">Progress to Target</span>
            <span className="font-bold text-[#1a472a]">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
              className="h-4 rounded-full bg-gradient-to-r from-[#4a7c59] to-[#7dd87d] transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1a472a] font-bold">{formatCurrency(grandTotal, currencySymbol)}</span>
            <span className="text-[#1a472a]/80">of {formatCurrency(targetAmount, currencySymbol)}</span>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="space-y-4 mb-6">
          {/* Immediate contributions */}
          <div className="bg-white/80 rounded-xl p-4 border border-[#7dd87d]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#4a7c59]" />
                <span className="font-bold text-[#1a472a]">Immediate Contributions</span>
              </div>
              <span className="font-bold text-[#1a472a]">{formatCurrency(immediateTotal, currencySymbol)}</span>
            </div>
            {immediateContributions.length > 0 ? (
              <div className="space-y-2">
                {immediateContributions.map((c) => {
                  const category = immediateCategories.find(cat => cat.id === c.category);
                  const Icon = category?.icon || Package;
                  return (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#1a472a]/80" />
                        <span className="text-[#1a472a]/80">{c.description || category?.name}</span>
                      </div>
                      <span className="text-[#1a472a]">{formatCurrency(c.value, currencySymbol)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#1a472a]/80 text-center py-2">No immediate contributions added</p>
            )}
          </div>
          
          {/* Future contributions */}
          <div className="bg-white/80 rounded-xl p-4 border border-[#7dd87d]/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#4a7c59]" />
                <span className="font-bold text-[#1a472a]">Future Value Commitments</span>
              </div>
              <span className="font-bold text-[#1a472a]">{formatCurrency(futureTotal, currencySymbol)}</span>
            </div>
            {futureContributions.length > 0 ? (
              <div className="space-y-2">
                {futureContributions.map((c) => {
                  const totalValue = c.weeks * c.hoursPerWeek * c.hourlyRate;
                  return (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#1a472a]/80" />
                        <span className="text-[#1a472a]/80">{c.roleName || 'Role'}</span>
                        <span className="text-xs text-[#1a472a]/80">
                          ({c.weeks}wks x {c.hoursPerWeek}hrs x {currencySymbol}{c.hourlyRate})
                        </span>
                      </div>
                      <span className="text-[#1a472a]">{formatCurrency(totalValue, currencySymbol)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#1a472a]/80 text-center py-2">No future commitments added</p>
            )}
          </div>

          {/* Contribution by capital */}
          <CapitalSummaryList totals={capitalTotals} symbol={currencySymbol} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={generatePDF}
              variant="outline"
              className="flex-1 rounded-xl border-[#4a7c59] text-[#4a7c59] hover:bg-[#7dd87d]/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={() => setShowResults(false)}
              variant="outline"
              className="flex-1 rounded-xl border-[#7dd87d] text-[#4a7c59] hover:bg-[#7dd87d]/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Edit Contributions
            </Button>
          </div>
          
          {/* Copy Proposal Data for submission */}
          <Button
            onClick={() => {
              const proposalData = {
                projectName,
                targetAmount,
                currency,
                contributorName,
                contributorEmail,
                totalValue: grandTotal,
                financialValue: immediateTotal,
                byCapital: capitalTotals,
                immediateContributions: immediateContributions.map((c: ImmediateContribution) => ({
                  category: c.category,
                  capital: c.capital,
                  value: c.value,
                  description: c.description
                })),
                futureContributions: futureContributions.map(f => ({
                  roleName: f.roleName,
                  capital: f.capital,
                  hourlyRate: f.hourlyRate,
                  hoursPerWeek: f.hoursPerWeek,
                  weeks: f.weeks,
                  totalValue: f.hourlyRate * f.hoursPerWeek * f.weeks
                })),
                createdAt: new Date().toISOString()
              };
              navigator.clipboard.writeText(JSON.stringify(proposalData, null, 2));
              toast.success("Proposal data copied!", {
                description: "Paste this into the Submit Proposal form on any project."
              });
            }}
            variant="outline"
            className="w-full rounded-xl border-[#1a472a] text-[#1a472a] hover:bg-[#1a472a]/10"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Proposal Data (for submission)
          </Button>
        </div>
        
        {/* Ready to Submit section */}
        <div className="mt-6 bg-[#7dd87d]/10 rounded-xl p-4 border border-[#7dd87d]/30">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-[#4a7c59] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#1a472a] mb-3">
                <strong>Ready to submit your contribution?</strong> Browse active crowd pooling projects and submit your proposal directly to their DAO.
              </p>
              <a
                href="/crowd-pooling-projects"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#4a7c59] hover:bg-[#1a472a] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                View Projects Crowd Pooling
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Main contribution form
  return (
    <div className="bg-gradient-to-br from-[#f0f7f0] to-[#f0ebe3] rounded-2xl p-6 md:p-8 border border-[#7dd87d]/30">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#4a7c59]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
              {projectName}
            </h3>
            <p className="text-xs text-[#1a472a]/80">Crowd Pooling Tool</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSetup(true)}
          className="text-[#4a7c59] hover:bg-[#7dd87d]/10"
        >
          Edit Setup
        </Button>
      </div>
      
      {/* Progress tracker */}
      <div className="bg-white rounded-xl p-4 mb-6 border border-[#7dd87d]/30">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#1a472a]/80">Your Contribution</span>
          <span className="font-bold text-[#1a472a]">
            {formatCurrency(grandTotal, currencySymbol)} / {formatCurrency(targetAmount, currencySymbol)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 rounded-full bg-gradient-to-r from-[#4a7c59] to-[#7dd87d] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-[#1a472a]/80 mt-2 text-center">
          {progressPercentage.toFixed(1)}% of target
        </p>
      </div>
      
      {/* Section tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSection('immediate')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeSection === 'immediate'
              ? 'bg-[#4a7c59] text-white'
              : 'bg-white text-[#1a472a] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/10'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Immediate
          <span className="ml-2 text-xs opacity-80">
            {formatCurrency(immediateTotal, currencySymbol)}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('future')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeSection === 'future'
              ? 'bg-[#4a7c59] text-white'
              : 'bg-white text-[#1a472a] border border-[#7dd87d]/30 hover:bg-[#7dd87d]/10'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Future Value
          <span className="ml-2 text-xs opacity-80">
            {formatCurrency(futureTotal, currencySymbol)}
          </span>
        </button>
      </div>
      
      {/* Immediate contributions section */}
      {activeSection === 'immediate' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[#1a472a]">Immediate Contributions</h4>
              <p className="text-xs text-[#1a472a]/80">Land, crypto, equipment, plants, and more</p>
            </div>
            <Button
              onClick={addImmediateContribution}
              size="sm"
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          
          {immediateContributions.length === 0 ? (
            <div className="bg-white/50 rounded-xl p-8 text-center border border-dashed border-[#7dd87d]/30">
              <Package className="w-10 h-10 mx-auto mb-3 text-[#1a472a]/75" />
              <p className="text-[#1a472a]/80 mb-3">No immediate contributions yet</p>
              <Button
                onClick={addImmediateContribution}
                variant="outline"
                className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#7dd87d]/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Contribution
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {immediateContributions.map((contribution) => {
                const category = immediateCategories.find(c => c.id === contribution.category);
                const Icon = category?.icon || Package;
                return (
                  <div key={contribution.id} className="bg-white rounded-xl p-4 border border-[#7dd87d]/20">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <div className="hidden sm:flex w-10 h-10 rounded-lg bg-[#7dd87d]/20 items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#4a7c59]" />
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select
                            value={contribution.category}
                            onValueChange={(value) => updateImmediateContribution(contribution.id, 'category', value)}
                          >
                            <SelectTrigger className="w-full bg-white border-[#7dd87d]/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {immediateCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative w-full">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a472a]/80 text-sm">
                              {currencySymbol}
                            </span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={contribution.value || ''}
                              onChange={(e) => updateImmediateContribution(contribution.id, 'value', parseFloat(e.target.value) || 0)}
                              placeholder="Value"
                              className="pl-7 bg-white border-[#7dd87d]/30 w-full text-base"
                            />
                          </div>
                        </div>
                        <Input
                          value={contribution.description}
                          onChange={(e) => updateImmediateContribution(contribution.id, 'description', e.target.value)}
                          placeholder={contribution.category === 'crypto' ? 'USDC, ETH, or other tokens' : `Description (e.g., ${immediateCategories.find(c => c.id === contribution.category)?.description || 'item details'})`}
                          className="bg-white border-[#7dd87d]/30 w-full"
                        />
                        {contribution.category === 'crypto' && (
                          <p className="text-xs text-[#1a472a]/70">
                            {CRYPTO_PAYMENT_CONTEXT.fiatNote}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImmediateContribution(contribution.id)}
                        className="text-red-500 hover:bg-red-50 flex-shrink-0 self-end sm:self-start"
                        aria-label="Remove contribution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Future contributions section */}
      {activeSection === 'future' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[#1a472a]">Future Value Commitments</h4>
              <p className="text-xs text-[#1a472a]/80">Roles and work you commit to contributing</p>
            </div>
            <Button
              onClick={addFutureContribution}
              size="sm"
              className="bg-[#4a7c59] hover:bg-[#1a472a] text-white rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Role
            </Button>
          </div>

          {/* Role templates across the nine capitals */}
          <div className="bg-white/70 rounded-xl border border-[#7dd87d]/30">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between p-3"
            >
              <span className="text-sm font-medium text-[#1a472a] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4a7c59]" />
                Pick a role from the nine capitals
              </span>
              <ChevronDown className={`w-4 h-4 text-[#4a7c59] transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="px-3 pb-3 space-y-3">
                {CAPITAL_TYPES.map((capital) => (
                  <div key={capital}>
                    <p className="text-xs font-bold text-[#1a472a]">{CAPITAL_LABELS[capital].label} Capital</p>
                    <p className="text-[11px] text-[#1a472a]/70 mb-1.5">{CAPITAL_LABELS[capital].blurb}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_TEMPLATES_BY_CAPITAL[capital].map((role) => (
                        <button
                          key={role.title}
                          type="button"
                          title={role.description}
                          onClick={() => addRoleFromTemplate(capital, role)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-[#f0f7f0] border border-[#7dd87d]/30 text-[#1a472a] hover:bg-[#7dd87d]/20 transition-colors"
                        >
                          {role.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Smart Suggestions Box */}
          {(() => {
            const remaining = targetAmount - grandTotal;
            if (remaining > 0) {
              // Generate realistic suggestions based on remaining amount
              const suggestions = [];
              
              // Part-time suggestion (8 hrs/week, $25/hr)
              const partTimeWeeks = Math.ceil(remaining / (8 * 25));
              if (partTimeWeeks <= 104) { // Max 2 years
                suggestions.push({
                  label: 'Part-time (8 hrs/week)',
                  weeks: Math.min(partTimeWeeks, 52),
                  hoursPerWeek: 8,
                  hourlyRate: partTimeWeeks > 52 ? Math.ceil(remaining / (52 * 8)) : 25,
                  description: 'Casual commitment'
                });
              }
              
              // Half-time suggestion (20 hrs/week, $30/hr)
              const halfTimeWeeks = Math.ceil(remaining / (20 * 30));
              if (halfTimeWeeks <= 52) {
                suggestions.push({
                  label: 'Half-time (20 hrs/week)',
                  weeks: halfTimeWeeks,
                  hoursPerWeek: 20,
                  hourlyRate: 30,
                  description: 'Significant commitment'
                });
              }
              
              // Full-time suggestion (40 hrs/week, $35/hr)
              const fullTimeWeeks = Math.ceil(remaining / (40 * 35));
              if (fullTimeWeeks <= 52) {
                suggestions.push({
                  label: 'Full-time (40 hrs/week)',
                  weeks: fullTimeWeeks,
                  hoursPerWeek: 40,
                  hourlyRate: 35,
                  description: 'Full dedication'
                });
              }
              
              // Intensive short-term (40 hrs/week, $50/hr for skilled work)
              const intensiveWeeks = Math.ceil(remaining / (40 * 50));
              if (intensiveWeeks <= 12 && remaining >= 5000) {
                suggestions.push({
                  label: 'Intensive Sprint',
                  weeks: intensiveWeeks,
                  hoursPerWeek: 40,
                  hourlyRate: 50,
                  description: 'Skilled professional rate'
                });
              }
              
              return suggestions.length > 0 ? (
                <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
                  <div className="flex items-start gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Need {formatCurrency(remaining, currencySymbol)} more to reach your target
                      </p>
                      <p className="text-xs text-amber-700 mt-1">Here are some realistic options:</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestions.slice(0, 4).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setFutureContributions([
                            ...futureContributions,
                            {
                              id: generateId(),
                              roleName: '',
                              weeks: suggestion.weeks,
                              hoursPerWeek: suggestion.hoursPerWeek,
                              hourlyRate: suggestion.hourlyRate,
                              capital: 'experiential',
                            }
                          ]);
                        }}
                        className="text-left p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-[#1a472a]">{suggestion.label}</p>
                        <p className="text-xs text-[#1a472a]/80 mt-1">
                          {suggestion.weeks} weeks × {suggestion.hoursPerWeek} hrs × {currencySymbol}{suggestion.hourlyRate}/hr
                        </p>
                        <p className="text-xs font-medium text-[#1a472a] mt-1">
                          = {formatCurrency(suggestion.weeks * suggestion.hoursPerWeek * suggestion.hourlyRate, currencySymbol)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
            }
            return null;
          })()}
          
          {futureContributions.length === 0 ? (
            <div className="bg-white/50 rounded-xl p-8 text-center border border-dashed border-[#7dd87d]/30">
              <Clock className="w-10 h-10 mx-auto mb-3 text-[#1a472a]/75" />
              <p className="text-[#1a472a]/80 mb-3">No future commitments yet</p>
              <Button
                onClick={addFutureContribution}
                variant="outline"
                className="border-[#4a7c59] text-[#4a7c59] hover:bg-[#7dd87d]/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Role Commitment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {futureContributions.map((contribution) => {
                const totalValue = contribution.weeks * contribution.hoursPerWeek * contribution.hourlyRate;
                return (
                  <div key={contribution.id} className="bg-white rounded-xl p-4 border border-[#7dd87d]/20">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <div className="hidden sm:flex w-10 h-10 rounded-lg bg-[#7dd87d]/20 items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-[#4a7c59]" />
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={contribution.roleName}
                            onChange={(e) => updateFutureContribution(contribution.id, 'roleName', e.target.value)}
                            placeholder="Role name (e.g., Builder, Gardener, Cook)"
                            className="bg-white border-[#7dd87d]/30 flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFutureContribution(contribution.id)}
                            className="text-red-500 hover:bg-red-50 flex-shrink-0 sm:hidden"
                            aria-label="Remove contribution"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="min-w-0">
                            <label className="text-xs text-[#1a472a]/80 mb-1 block truncate">Weeks</label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={contribution.weeks || ''}
                              onChange={(e) => updateFutureContribution(contribution.id, 'weeks', parseInt(e.target.value) || 0)}
                              placeholder="52"
                              className="bg-white border-[#7dd87d]/30 w-full text-base px-2"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="text-xs text-[#1a472a]/80 mb-1 block truncate">Hrs/Wk</label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={contribution.hoursPerWeek || ''}
                              onChange={(e) => updateFutureContribution(contribution.id, 'hoursPerWeek', parseInt(e.target.value) || 0)}
                              placeholder="8"
                              className="bg-white border-[#7dd87d]/30 w-full text-base px-2"
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="text-xs text-[#1a472a]/80 mb-1 block truncate">{currencySymbol}/Hr</label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={contribution.hourlyRate || ''}
                              onChange={(e) => updateFutureContribution(contribution.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                              placeholder="40"
                              className="bg-white border-[#7dd87d]/30 w-full text-base px-2"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Select
                            value={contribution.capital}
                            onValueChange={(value) => updateFutureCapital(contribution.id, value as CapitalType)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs bg-white border-[#7dd87d]/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CAPITAL_TYPES.map((capital) => (
                                <SelectItem key={capital} value={capital}>
                                  {CAPITAL_LABELS[capital].label} Capital
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-right text-sm">
                            <span className="text-[#1a472a]/80">Total: </span>
                            <span className="font-bold text-[#1a472a]">{formatCurrency(totalValue, currencySymbol)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFutureContribution(contribution.id)}
                        className="text-red-500 hover:bg-red-50 flex-shrink-0 hidden sm:flex"
                        aria-label="Remove contribution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Pooled value across the nine capitals */}
      {grandTotal > 0 && (
        <div className="mt-6">
          <CapitalSummaryList totals={capitalTotals} symbol={currencySymbol} />
        </div>
      )}

      {/* View Results button */}
      <div className="mt-6 pt-4 border-t border-[#7dd87d]/20">
        <Button
          onClick={() => setShowResults(true)}
          disabled={grandTotal === 0}
          className="w-full rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white"
        >
          View Summary & Download PDF
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      {/* Help improve this tool */}
      <div className="mt-4 pt-4 border-t border-[#7dd87d]/20 text-center">
        <SuggestUpgradesSheet 
          onSelectRole={(role) => {
            setFutureContributions(prev => [
              ...prev,
              {
                id: generateId(),
                roleName: role.name,
                weeks: role.typicalWeeks,
                hoursPerWeek: role.typicalHours,
                hourlyRate: role.suggestedRate,
                capital: 'experiential',
              }
            ]);
            setActiveSection('future');
          }}
        />
      </div>
    </div>
  );
}
