/**
 * Contribution Calculator Component
 * An interactive tool to help users estimate the value of their contributions
 * across the 9 Forms of Capital framework
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Coins, 
  Package, 
  Leaf, 
  Users, 
  Brain, 
  Compass, 
  Sparkles, 
  Globe,
  ChevronRight,
  ChevronLeft,
  Check,
  Info,
  Zap,
  Trophy,
  Target,
  Download,
  FileText,
  Send,
  Copy,
  ClipboardCheck,
  HeartPulse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { generateContributionPDF } from '@/lib/generateContributionPDF';
import { toast } from 'sonner';

// Question type definition
interface CapitalQuestion {
  label: string;
  type: 'currency' | 'number' | 'slider';
  key: string;
  multiplier?: number;
  max?: number;
  example?: string; // Real example for tooltip
}

// Capital form definition
interface CapitalForm {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  examples: string[];
  questions: CapitalQuestion[];
}

// 9 Forms of Capital definitions.
// Canonical capital coverage and shared labels live in
// shared/crowdpoolingTaxonomy.ts; this list must cover the same nine capitals.
const capitalForms: CapitalForm[] = [
  {
    id: 'financial',
    name: 'Financial Capital',
    icon: Coins,
    color: '#ffd700',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    description: 'Money, currencies, securities, and other financial instruments',
    examples: [
      'Direct monetary investment or donation',
      'Fundraising efforts and connections to funders',
      'Revenue generation activities',
      'Cost savings achieved'
    ],
    questions: [
      { label: 'Direct financial contribution ($)', type: 'currency', key: 'direct', multiplier: 1, example: 'e.g., $5,000 invested in Season 1 land fund' },
      { label: 'Funds raised or facilitated ($)', type: 'currency', key: 'raised', multiplier: 0.05, example: 'e.g., Connected project to $10,000 grant (5% finder\'s fee standard)' },
      { label: 'Revenue generated ($)', type: 'currency', key: 'revenue', multiplier: 0.10, example: 'e.g., $20,000 in sales (10% commission standard)' },
      { label: 'Costs saved ($)', type: 'currency', key: 'saved', multiplier: 0.25, example: 'e.g., $12,000 saved (25% of savings credited)' }
    ]
  },
  {
    id: 'material',
    name: 'Material Capital',
    icon: Package,
    color: '#8b4513',
    bgColor: 'bg-amber-700/20',
    borderColor: 'border-amber-700/40',
    description: 'Physical assets, tools, equipment, infrastructure, and resources',
    examples: [
      'Equipment or tools donated/loaned',
      'Materials and supplies provided',
      'Infrastructure built or improved',
      'Land or space made available'
    ],
    questions: [
      { label: 'Value of equipment/tools provided ($)', type: 'currency', key: 'equipment', example: 'e.g., $500 camera loaned for 3 months' },
      { label: 'Value of materials/supplies ($)', type: 'currency', key: 'materials', example: 'e.g., $200 worth of seeds and seedlings' },
      { label: 'Infrastructure value created ($)', type: 'currency', key: 'infrastructure', example: 'e.g., $5,000 irrigation system installed' },
      { label: 'Space/land value contributed ($)', type: 'currency', key: 'space', example: 'e.g., $1,000/month meeting space for 6 months' }
    ]
  },
  {
    id: 'living',
    name: 'Living Capital',
    icon: Leaf,
    color: '#228b22',
    bgColor: 'bg-green-600/20',
    borderColor: 'border-green-600/40',
    description: 'Soil, water, trees, animals, ecosystems, and all living systems',
    examples: [
      'Trees planted or ecosystems restored',
      'Soil health improvements',
      'Water systems protected or created',
      'Biodiversity enhanced'
    ],
    questions: [
      { label: 'Trees planted (count)', type: 'number', key: 'trees', multiplier: 25, example: 'e.g., 100 fruit trees in food forest' },
      { label: 'Acres of land regenerated', type: 'number', key: 'acres', multiplier: 500, example: 'e.g., 5 acres converted to permaculture' },
      { label: 'Soil depth increased (inches)', type: 'number', key: 'soilDepth', multiplier: 50, example: 'e.g., 6 inches of topsoil built' },
      { label: 'Organic matter increase (%)', type: 'slider', key: 'organicMatter', multiplier: 2, max: 200, example: 'e.g., 100% increase doubles soil depth bonus' },
      { label: 'Water systems improved (gallons/year)', type: 'number', key: 'water', multiplier: 0.005, example: 'e.g., 50,000 gallons/year rainwater capture' },
      { label: 'Species diversity increase (%)', type: 'slider', key: 'biodiversity', multiplier: 50, example: 'e.g., 30% more native species observed' }
    ]
  },
  {
    id: 'social',
    name: 'Social Capital',
    icon: Users,
    color: '#ff6b6b',
    bgColor: 'bg-red-400/20',
    borderColor: 'border-red-400/40',
    description: 'Relationships, trust, goodwill, community connections, and networks',
    examples: [
      'New partnerships or collaborations formed',
      'Community members engaged',
      'Trust and reputation built',
      'Conflict resolution facilitated'
    ],
    questions: [
      { label: 'New partnerships formed (count)', type: 'number', key: 'partnerships', multiplier: 200, example: 'e.g., 3 new land project partnerships' },
      { label: 'Community members engaged', type: 'number', key: 'members', multiplier: 10, example: 'e.g., 50 people joined Discord community' },
      { label: 'Events organized/facilitated', type: 'number', key: 'events', multiplier: 100, example: 'e.g., 4 community calls hosted' },
      { label: 'Network strength increase (%)', type: 'slider', key: 'network', multiplier: 20, example: 'e.g., 25% more active connections' }
    ]
  },
  {
    id: 'intellectual',
    name: 'Intellectual Capital',
    icon: Brain,
    color: '#9b59b6',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    description: 'Knowledge, ideas, intellectual property, systems, and innovations',
    examples: [
      'Guides and documentation created and adopted',
      'Systems or processes designed and implemented',
      'Groups/projects using your frameworks',
      'People actively using your systems'
    ],
    questions: [
      { label: 'Guides/documents created', type: 'number', key: 'documents', multiplier: 150, example: 'e.g., 2 onboarding guides for new members' },
      { label: 'Groups/projects using your guides', type: 'number', key: 'adoption', multiplier: 100, example: 'e.g., 5 land projects adopted your template' },
      { label: 'Systems/processes designed', type: 'number', key: 'systems', multiplier: 500, example: 'e.g., 1 governance voting system' },
      { label: 'People using your systems/processes', type: 'number', key: 'users', multiplier: 5, example: 'e.g., 200 people use your proposal template' }
    ]
  },
  {
    id: 'experiential',
    name: 'Experiential Capital',
    icon: Compass,
    color: '#3498db',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    description: 'Skills, expertise, hands-on experience, and practical wisdom',
    examples: [
      'Professional skills applied to deliverables',
      'Mentorship and coaching provided',
      'Training sessions delivered',
      'Problems solved using expertise'
    ],
    questions: [
      { label: 'Deliverables completed using your skills', type: 'number', key: 'deliverables', multiplier: 100, example: 'e.g., 5 website pages designed' },
      { label: 'People mentored/coached', type: 'number', key: 'mentored', multiplier: 75, example: 'e.g., 3 new contributors onboarded 1-on-1' },
      { label: 'People trained in workshops/sessions', type: 'number', key: 'trained', multiplier: 25, example: 'e.g., 20 people in permaculture workshop' },
      { label: 'Problems/challenges solved', type: 'number', key: 'problems', multiplier: 150, example: 'e.g., 2 technical bugs fixed on platform' }
    ]
  },
  {
    id: 'spiritual',
    name: 'Spiritual Capital',
    icon: Sparkles,
    color: '#e91e63',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/40',
    description: 'Purpose, meaning, inspiration, faith, and meaningful experiences',
    examples: [
      'Vision and purpose clarification sessions',
      'Ceremonies, rituals, or sacred gatherings',
      'Alignment and meaning-making facilitation',
      'Commitment and dedication demonstrated'
    ],
    questions: [
      { label: 'Vision/purpose sessions facilitated', type: 'number', key: 'vision', multiplier: 150, example: 'e.g., 2 strategic planning retreats' },
      { label: 'Ceremonies/rituals/gatherings led', type: 'number', key: 'ceremonies', multiplier: 100, example: 'e.g., 4 opening circles for community calls' },
      { label: 'People who attended your sessions', type: 'number', key: 'attendees', multiplier: 15, example: 'e.g., 30 people at equinox gathering' },
      { label: 'Months of dedicated commitment', type: 'number', key: 'commitment', multiplier: 100, example: 'e.g., 12 months as core team member' }
    ]
  },
  {
    id: 'cultural',
    name: 'Cultural Capital',
    icon: Globe,
    color: '#00bcd4',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    description: 'Stories, art, traditions, heritage, and shared meaning-making',
    examples: [
      'Stories and narratives shared',
      'Art and creative works produced',
      'Cultural practices preserved',
      'Media and content with engagement'
    ],
    questions: [
      { label: 'Stories/articles/posts created', type: 'number', key: 'stories', multiplier: 75, example: 'e.g., 5 blog posts about land projects' },
      { label: 'Art/creative works produced', type: 'number', key: 'art', multiplier: 150, example: 'e.g., 3 illustrations for the website' },
      { label: 'Total content views/reach', type: 'number', key: 'reach', multiplier: 0.02, example: 'e.g., 10,000 views on YouTube video' },
      { label: 'Engagement rate on content (%)', type: 'slider', key: 'engagement', multiplier: 25, example: 'e.g., 8% engagement on social posts' }
    ]
  },
  {
    id: 'health',
    name: 'Health Capital',
    icon: HeartPulse,
    color: '#ff9800',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    description: 'Physical and emotional wellbeing, movement, rest, and care',
    examples: [
      'Wellness and movement classes taught',
      'Bodywork and massage sessions given',
      'Herbal, nutrition, or recovery support provided',
      'Community fitness events led'
    ],
    questions: [
      { label: 'Wellness classes taught', type: 'number', key: 'classes', multiplier: 60, example: 'e.g., 10 community yoga classes' },
      { label: 'Bodywork sessions given', type: 'number', key: 'bodywork', multiplier: 80, example: 'e.g., 5 massage sessions during a build week' },
      { label: 'People supported with care plans', type: 'number', key: 'care', multiplier: 50, example: 'e.g., 8 people on herbal support plans' },
      { label: 'Community fitness events led', type: 'number', key: 'events', multiplier: 75, example: 'e.g., 4 morning movement sessions' }
    ]
  }
];

interface CapitalValues {
  [key: string]: {
    [key: string]: number;
  };
}

// Preset contribution templates
const presetTemplates = [
  {
    name: 'Website Development',
    description: 'Building or improving a website for the project',
    values: {
      financial: { direct: 0, raised: 0, revenue: 0, saved: 500 },
      material: { equipment: 0, materials: 0, infrastructure: 0, space: 0 },
      living: { trees: 0, acres: 0, soilDepth: 0, organicMatter: 0, water: 0, biodiversity: 0 },
      social: { partnerships: 0, members: 20, events: 0, network: 10 },
      intellectual: { documents: 1, adoption: 2, systems: 1, users: 50 },
      experiential: { deliverables: 10, mentored: 0, trained: 0, problems: 3 },
      spiritual: { vision: 0, ceremonies: 0, attendees: 0, commitment: 2 },
      cultural: { stories: 2, art: 5, reach: 1000, engagement: 5 }
    }
  },
  {
    name: 'Community Workshop',
    description: 'Facilitating a workshop or training session',
    values: {
      financial: { direct: 0, raised: 0, revenue: 500, saved: 0 },
      material: { equipment: 100, materials: 50, infrastructure: 0, space: 200 },
      living: { trees: 0, acres: 0, soilDepth: 0, organicMatter: 0, water: 0, biodiversity: 0 },
      social: { partnerships: 1, members: 25, events: 1, network: 15 },
      intellectual: { documents: 1, adoption: 1, systems: 0, users: 25 },
      experiential: { deliverables: 1, mentored: 5, trained: 20, problems: 0 },
      spiritual: { vision: 1, ceremonies: 1, attendees: 20, commitment: 1 },
      cultural: { stories: 1, art: 0, reach: 500, engagement: 8 }
    }
  },
  {
    name: 'Tree Planting Campaign',
    description: 'Organizing and executing a tree planting initiative',
    values: {
      financial: { direct: 0, raised: 2000, revenue: 0, saved: 500 },
      material: { equipment: 200, materials: 500, infrastructure: 0, space: 0 },
      living: { trees: 100, acres: 2, soilDepth: 2, organicMatter: 20, water: 5000, biodiversity: 15 },
      social: { partnerships: 2, members: 30, events: 1, network: 20 },
      intellectual: { documents: 1, adoption: 0, systems: 0, users: 0 },
      experiential: { deliverables: 1, mentored: 3, trained: 15, problems: 2 },
      spiritual: { vision: 0, ceremonies: 1, attendees: 30, commitment: 1 },
      cultural: { stories: 3, art: 2, reach: 2000, engagement: 10 }
    }
  },
  {
    name: 'Governance System Design',
    description: 'Creating decision-making processes and governance tools',
    values: {
      financial: { direct: 0, raised: 0, revenue: 0, saved: 1000 },
      material: { equipment: 0, materials: 0, infrastructure: 0, space: 0 },
      living: { trees: 0, acres: 0, soilDepth: 0, organicMatter: 0, water: 0, biodiversity: 0 },
      social: { partnerships: 3, members: 10, events: 2, network: 25 },
      intellectual: { documents: 3, adoption: 3, systems: 2, users: 100 },
      experiential: { deliverables: 3, mentored: 5, trained: 10, problems: 5 },
      spiritual: { vision: 2, ceremonies: 0, attendees: 0, commitment: 3 },
      cultural: { stories: 1, art: 0, reach: 500, engagement: 5 }
    }
  },
  {
    name: 'Fundraising Campaign',
    description: 'Leading efforts to raise capital for the project',
    values: {
      financial: { direct: 0, raised: 50000, revenue: 0, saved: 0 },
      material: { equipment: 0, materials: 0, infrastructure: 0, space: 0 },
      living: { trees: 0, acres: 0, soilDepth: 0, organicMatter: 0, water: 0, biodiversity: 0 },
      social: { partnerships: 5, members: 50, events: 3, network: 30 },
      intellectual: { documents: 2, adoption: 1, systems: 0, users: 0 },
      experiential: { deliverables: 2, mentored: 2, trained: 0, problems: 3 },
      spiritual: { vision: 1, ceremonies: 0, attendees: 0, commitment: 4 },
      cultural: { stories: 5, art: 1, reach: 5000, engagement: 6 }
    }
  }
];

export function ContributionCalculator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<CapitalValues>(() => {
    const initial: CapitalValues = {};
    capitalForms.forEach(form => {
      initial[form.id] = {};
      form.questions.forEach(q => {
        initial[form.id][q.key] = 0;
      });
    });
    return initial;
  });
  const [contributionName, setContributionName] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyTemplate = (template: typeof presetTemplates[0]) => {
    setValues(template.values as CapitalValues);
    setContributionName(template.name);
    setShowTemplates(false);
  };

  const currentCapital = capitalForms[currentStep];
  const Icon = currentCapital?.icon || Calculator;

  const updateValue = (capitalId: string, key: string, value: number) => {
    setValues(prev => ({
      ...prev,
      [capitalId]: {
        ...prev[capitalId],
        [key]: value
      }
    }));
  };

  const calculateCapitalValue = (capitalId: string) => {
    const capital = capitalForms.find(c => c.id === capitalId);
    if (!capital) return 0;
    
    let total = 0;
    
    // Special handling for Living Capital soil depth + organic matter bonus
    if (capitalId === 'living') {
      const soilDepth = values[capitalId]?.['soilDepth'] || 0;
      const organicMatter = values[capitalId]?.['organicMatter'] || 0;
      // Organic matter increase acts as a multiplier on soil depth value
      // e.g., 100% organic matter increase = 2x bonus on soil depth
      const organicMultiplier = 1 + (organicMatter / 100);
      const soilValue = soilDepth * 50 * organicMultiplier;
      total += soilValue;
      
      // Calculate other living capital values normally (excluding soilDepth and organicMatter)
      capital.questions.forEach(q => {
        if (q.key === 'soilDepth' || q.key === 'organicMatter') return;
        const value = values[capitalId]?.[q.key] || 0;
        total += value * (q.multiplier || 1);
      });
    } else {
      // Standard calculation for other capital types
      capital.questions.forEach(q => {
        const value = values[capitalId]?.[q.key] || 0;
        if (q.type === 'currency') {
          // Apply multiplier to currency fields (industry standard rates)
          total += value * (q.multiplier || 1);
        } else {
          total += value * (q.multiplier || 1);
        }
      });
    }
    return total;
  };

  const totalValue = useMemo(() => {
    return capitalForms.reduce((sum, capital) => {
      return sum + calculateCapitalValue(capital.id);
    }, 0);
  }, [values]);

  const capitalBreakdown = useMemo(() => {
    return capitalForms.map(capital => ({
      ...capital,
      value: calculateCapitalValue(capital.id),
      percentage: totalValue > 0 ? (calculateCapitalValue(capital.id) / totalValue) * 100 : 0
    }));
  }, [values, totalValue]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const generatePDF = () => {
    generateContributionPDF({
      contributionName,
      totalValue,
      capitalBreakdown,
      values
    });
  };

  const copyToClipboard = async () => {
    const activeCapitals = capitalBreakdown.filter(c => c.value > 0);
    
    let summary = `## Contribution Proposal: ${contributionName || 'Untitled Contribution'}\n\n`;
    summary += `**Estimated Total Value: ${formatCurrency(totalValue)}**\n\n`;
    summary += `### Breakdown by Capital Type\n\n`;
    
    activeCapitals.forEach(capital => {
      summary += `**${capital.name}**: ${formatCurrency(capital.value)} (${capital.percentage.toFixed(1)}%)\n`;
      capital.questions.forEach(q => {
        const val = values[capital.id]?.[q.key] || 0;
        if (val > 0) {
          const calculatedValue = val * (q.multiplier || 1);
          summary += `  - ${q.label}: ${val.toLocaleString()} x${q.multiplier || 1} = ${formatCurrency(calculatedValue)}\n`;
        }
      });
      summary += `\n`;
    });
    
    summary += `---\n`;
    summary += `*Generated using the ReGen Civics Contribution Calculator*\n`;
    summary += `*Based on the 9 Forms of Capital framework*\n`;
    
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Copied to clipboard!", {
        description: "Paste this into your Hypha proposal description.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Failed to copy", {
        description: "Please try again or manually select and copy the text.",
      });
    }
  };

  const renderInput = (question: typeof capitalForms[0]['questions'][0], capitalId: string) => {
    const value = values[capitalId]?.[question.key] || 0;
    
    if (question.type === 'slider') {
      const max = question.max || 100;
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-[#1a472a]/80">{question.label}</span>
              {question.example && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="More information" className="text-[#4a7c59] hover:text-[#1a472a]">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-white border border-[#7dd87d]/30 text-[#1a472a]">
                      <p className="text-xs">{question.example}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="font-bold text-[#1a472a]">{value}</span>
          </div>
          <Slider
            value={[value]}
            onValueChange={(v) => updateValue(capitalId, question.key, v[0])}
            max={max}
            step={1}
            className="w-full"
          />
          {question.example && (
            <p className="text-xs text-[#1a472a]/80 italic">{question.example}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <label className="text-sm text-[#1a472a]/80">{question.label}</label>
          {question.example && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="More information" className="text-[#4a7c59] hover:text-[#1a472a]">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-white border border-[#7dd87d]/30 text-[#1a472a]">
                  <p className="text-xs">{question.example}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="relative">
          {question.type === 'currency' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a472a]/80">$</span>
          )}
          <input
            type="number"
            min="0"
            value={value || ''}
            onChange={(e) => updateValue(capitalId, question.key, parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 rounded-lg border border-[#7dd87d]/30 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50 ${question.type === 'currency' ? 'pl-7' : ''}`}
            placeholder="0"
          />
        </div>
        {question.example && (
          <p className="text-xs text-[#1a472a]/80 italic">{question.example}</p>
        )}
      </div>
    );
  };

  if (showResults) {
    return (
      <div className="bg-gradient-to-br from-[#f0f7f0] to-[#f0f7f0] rounded-2xl p-6 md:p-8 border border-[#7dd87d]/30">
        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7dd87d]/20 mb-4">
            <Trophy className="w-8 h-8 text-[#4a7c59]" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Your Contribution Value
          </h3>
          {contributionName && (
            <p className="text-[#1a472a]/80">"{contributionName}"</p>
          )}
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-xl p-6 mb-6 text-center border border-[#7dd87d]/30 shadow-lg">
          <p className="text-sm text-[#1a472a]/80 mb-2">Estimated Total Value</p>
          <p className="text-4xl md:text-5xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            {formatCurrency(totalValue)}
          </p>
          <p className="text-sm text-[#1a472a]/80 mt-2">across 9 forms of capital</p>
        </div>

        {/* Capital Breakdown */}
        <div className="space-y-3 mb-6">
          <h4 className="font-bold text-[#1a472a] mb-3">Value Breakdown by Capital Type</h4>
          {capitalBreakdown.filter(c => c.value > 0).map(capital => {
            const CapitalIcon = capital.icon;
            return (
              <div key={capital.id} className="bg-white/80 rounded-lg p-3 border border-[#7dd87d]/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${capital.bgColor} flex items-center justify-center`}>
                      <CapitalIcon className="w-4 h-4" style={{ color: capital.color }} />
                    </div>
                    <span className="font-medium text-[#1a472a] text-sm">{capital.name}</span>
                  </div>
                  <span className="font-bold text-[#1a472a]">{formatCurrency(capital.value)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${capital.percentage}%`,
                      backgroundColor: capital.color
                    }}
                  />
                </div>
              </div>
            );
          })}
          {capitalBreakdown.filter(c => c.value > 0).length === 0 && (
            <p className="text-center text-[#1a472a]/80 py-4">No contributions recorded yet</p>
          )}
        </div>

        {/* Tips */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Remember:</p>
              <p>All proposals will ultimately be decided by the Voice holders in the space. Use this estimate as a starting point for your contribution proposal.</p>
            </div>
          </div>
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
              onClick={copyToClipboard}
              variant="outline"
              className={`flex-1 rounded-xl border-[#4a7c59] hover:bg-[#7dd87d]/10 transition-colors ${
                copied ? 'bg-[#7dd87d]/20 text-[#1a472a]' : 'text-[#4a7c59]'
              }`}
            >
              {copied ? (
                <>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy for Hypha
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowResults(false)}
              variant="outline"
              className="flex-1 rounded-xl border-[#7dd87d] text-[#4a7c59] hover:bg-[#7dd87d]/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Edit Values
            </Button>
            <Button
              onClick={() => window.open('https://app.hypha.earth/en/dho/regen-games/agreements', '_blank')}
              className="flex-1 rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white"
            >
              Submit Proposal
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#f0f7f0] to-[#f0f7f0] rounded-2xl p-6 md:p-8 border border-[#7dd87d]/30">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#7dd87d]/20 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-[#4a7c59]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            Contribution Calculator
          </h3>
          <p className="text-sm text-[#1a472a]/80">Estimate your value across 9 forms of capital</p>
        </div>
      </div>

      {/* Warning Disclaimer */}
      <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 mb-3">
              <strong>CALCULATOR WILL BE EVOLVED BY PROPOSALS</strong> It's impossible to fully quantify the intangible, but to acknowledge contributions we must try. While this tool is far from perfect, if we all use the same one it will give more equitable results - and we can use the game to evolve our tool together!
            </p>
            <a
              href="https://app.hypha.earth/en/dho/regen-games/agreements/select-create-action"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit Proposal to Improve Calculator
            </a>
          </div>
        </div>
      </div>

      {/* Preset Templates Dropdown */}
      <div className="mb-6">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-[#7dd87d]/30 hover:border-[#7dd87d]/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#4a7c59]" />
            <span className="font-medium text-[#1a472a]">Start from a Template</span>
          </div>
          <ChevronRight className={`w-5 h-5 text-[#1a472a]/80 transition-transform ${showTemplates ? 'rotate-90' : ''}`} />
        </button>
        
        {showTemplates && (
          <div className="mt-2 bg-white rounded-xl border border-[#7dd87d]/30 overflow-hidden">
            {presetTemplates.map((template, index) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template)}
                className={`w-full px-4 py-3 text-left hover:bg-[#f0f7f0] transition-colors flex items-center justify-between ${index !== presetTemplates.length - 1 ? 'border-b border-[#7dd87d]/20' : ''}`}
              >
                <div>
                  <p className="font-medium text-[#1a472a]">{template.name}</p>
                  <p className="text-xs text-[#1a472a]/80">{template.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#1a472a]/80" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#1a472a]/80 mb-2">
          <span>Progress</span>
          <span>{currentStep + 1} of {capitalForms.length}</span>
        </div>
        <div className="flex gap-1">
          {capitalForms.map((capital, index) => {
            const hasValue = calculateCapitalValue(capital.id) > 0;
            return (
              <button
                key={capital.id}
                onClick={() => setCurrentStep(index)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'bg-[#4a7c59]' 
                    : hasValue 
                      ? 'bg-[#7dd87d]' 
                      : 'bg-gray-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Contribution Name (first step only) */}
      {currentStep === 0 && (
        <div className="mb-6">
          <label className="text-sm font-medium text-[#1a472a] mb-2 block">
            What are you contributing? (optional)
          </label>
          <input
            type="text"
            value={contributionName}
            onChange={(e) => setContributionName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#7dd87d]/30 bg-white text-[#1a472a] placeholder:text-[#1a472a]/75 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
            placeholder="e.g., Website development, Community workshop, Tree planting..."
          />
        </div>
      )}

      {/* Current Capital Form */}
      <div className="bg-white rounded-xl p-5 mb-6 border border-[#7dd87d]/20">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className={`w-10 h-10 rounded-full ${currentCapital.bgColor} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5" style={{ color: currentCapital.color }} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[#1a472a]">{currentCapital.name}</h4>
            <p className="text-xs text-[#1a472a]/80">{currentCapital.description}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-5 h-5 text-[#1a472a]/80 hover:text-[#1a472a]/80" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-bold mb-2">Examples:</p>
                <ul className="text-sm space-y-1">
                  {currentCapital.examples.map((ex, i) => (
                    <li key={i}>• {ex}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-4">
          {currentCapital.questions.map((question) => (
            <div key={question.key}>
              {renderInput(question, currentCapital.id)}
            </div>
          ))}
        </div>

        {/* Current Capital Value */}
        <div className="mt-4 pt-4 border-t border-[#7dd87d]/20 flex justify-between items-center">
          <span className="text-sm text-[#1a472a]/80">Subtotal for {currentCapital.name}:</span>
          <span className="font-bold text-[#1a472a]">{formatCurrency(calculateCapitalValue(currentCapital.id))}</span>
        </div>
      </div>

      {/* Running Total */}
      <div className="bg-[#1a472a] rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#7dd87d]" />
          <span className="text-white/80 text-sm">Running Total:</span>
        </div>
        <span className="text-xl font-bold text-[#7dd87d]">{formatCurrency(totalValue)}</span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          variant="outline"
          className="flex-1 rounded-xl border-[#7dd87d] text-[#4a7c59] hover:bg-[#7dd87d]/10 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {currentStep < capitalForms.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex-1 rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowResults(true)}
            className="flex-1 rounded-xl bg-[#1a472a] hover:bg-[#0d2818] text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            See Results
          </Button>
        )}
      </div>

      {/* Quick Jump */}
      <div className="mt-6 pt-4 border-t border-[#7dd87d]/20">
        <p className="text-xs text-[#1a472a]/80 mb-2">Quick jump to capital type:</p>
        <div className="flex flex-wrap gap-2">
          {capitalForms.map((capital, index) => {
            const CapitalIcon = capital.icon;
            const hasValue = calculateCapitalValue(capital.id) > 0;
            return (
              <button
                key={capital.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                  index === currentStep
                    ? 'bg-[#4a7c59] text-white'
                    : hasValue
                      ? 'bg-[#7dd87d]/30 text-[#1a472a]'
                      : 'bg-gray-100 text-[#1a472a]/80 hover:bg-gray-200'
                }`}
              >
                <CapitalIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{capital.name.replace(' Capital', '')}</span>
                {hasValue && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ContributionCalculator;
