/**
 * Calculator Weights Sheet Component
 * Displays all current multipliers and measurements used in the Contribution Calculator
 * with editable weights for experimentation, impact preview, draft saving, and collaborative improvement features
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Scale, 
  Coins, 
  Package, 
  Leaf, 
  Users, 
  Brain, 
  Compass, 
  Sparkles, 
  Globe,
  ExternalLink,
  Info,
  History,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  Pencil,
  Save,
  Trash2,
  Eye,
  ThumbsUp,
  Plus,
  Lightbulb,
  X,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Local storage keys
const DRAFT_STORAGE_KEY = 'regen-civics-calculator-draft';
const IDEAS_STORAGE_KEY = 'regen-civics-calculator-ideas';
const VOTES_STORAGE_KEY = 'regen-civics-calculator-votes';

// Type for community idea
interface CommunityIdea {
  id: string;
  title: string;
  description: string;
  proposedWeight?: string;
  capitalType?: string;
  votes: number;
  createdAt: string;
  isSample?: boolean;
}

// Default starter ideas
const defaultIdeas: CommunityIdea[] = [
  {
    id: 'idea-1',
    title: 'Carbon Sequestration Metric',
    description: 'Add a metric for tons of CO2 sequestered annually to Living Capital',
    proposedWeight: '$50 per ton/year',
    capitalType: 'Living Capital',
    votes: 12,
    createdAt: '2026-01-15',
    isSample: true
  },
  {
    id: 'idea-2',
    title: 'Volunteer Hours Tracking',
    description: 'Track volunteer hours separately from paid work in Experiential Capital',
    proposedWeight: '$15 per hour',
    capitalType: 'Experiential Capital',
    votes: 8,
    createdAt: '2026-01-20',
    isSample: true
  },
  {
    id: 'idea-3',
    title: 'Regional Cost Multipliers',
    description: 'Adjust all weights based on regional cost of living differences',
    proposedWeight: '0.5x - 2.0x modifier',
    capitalType: 'All',
    votes: 15,
    createdAt: '2026-01-10',
    isSample: true
  }
];

// Changelog entries
const changelogEntries = [
  {
    date: 'January 2026',
    version: '1.0',
    status: 'current',
    changes: [
      { type: 'new', description: 'Initial calculator weights established based on 8 Forms of Capital framework' },
      { type: 'new', description: 'Added Living Capital soil health bonus multiplier system' },
      { type: 'new', description: 'Set industry-standard rates for Financial Capital (finder\'s fees, commissions)' },
    ]
  },
  {
    date: 'Coming Soon',
    version: '1.1',
    status: 'planned',
    changes: [
      { type: 'proposed', description: 'Community review of tree planting value ($25/tree)' },
      { type: 'proposed', description: 'Consider regional cost adjustments for Material Capital' },
      { type: 'proposed', description: 'Add time-based depreciation for equipment contributions' },
    ]
  }
];

// Type for weight item
interface WeightItem {
  input: string;
  multiplier: string;
  unit: string;
  rationale: string;
  key: string;
}

// Type for capital
interface CapitalType {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  description: string;
  example: {
    scenario: string;
    input: string;
    calculation: string;
    result: string;
  };
  weights: WeightItem[];
}

// Capital type definitions with their weights and examples
const defaultCapitalWeights: CapitalType[] = [
  {
    id: 'financial',
    name: 'Financial Capital',
    icon: Coins,
    color: '#ffd700',
    description: 'Money, currencies, securities, and other financial instruments',
    example: {
      scenario: 'You connect a land project to a $50,000 grant',
      input: '$50,000 funds facilitated',
      calculation: '$50,000 x 0.05 (5% finder\'s fee)',
      result: '$2,500 contribution value'
    },
    weights: [
      { input: 'Direct financial contribution', multiplier: '1x', unit: 'per $', rationale: 'Dollar-for-dollar value of direct investment', key: 'financial_direct' },
      { input: 'Funds raised or facilitated', multiplier: '0.05x', unit: 'per $', rationale: 'Industry standard finder\'s fee for connecting projects to funding', key: 'financial_raised' },
      { input: 'Revenue generated', multiplier: '0.10x', unit: 'per $', rationale: 'Standard commission rate for sales and revenue generation', key: 'financial_revenue' },
      { input: 'Costs saved', multiplier: '0.25x', unit: 'per $', rationale: 'Portion of savings credited to the contributor', key: 'financial_saved' },
    ]
  },
  {
    id: 'material',
    name: 'Material Capital',
    icon: Package,
    color: '#8b4513',
    description: 'Physical assets, tools, equipment, infrastructure, and resources',
    example: {
      scenario: 'You donate a $2,000 irrigation system to a food forest',
      input: '$2,000 infrastructure value',
      calculation: '$2,000 x 1.0 (full value)',
      result: '$2,000 contribution value'
    },
    weights: [
      { input: 'Equipment/tools provided', multiplier: '1x', unit: 'per $', rationale: 'Fair market value of equipment donated or loaned', key: 'material_equipment' },
      { input: 'Materials/supplies', multiplier: '1x', unit: 'per $', rationale: 'Direct cost value of materials contributed', key: 'material_supplies' },
      { input: 'Infrastructure value created', multiplier: '1x', unit: 'per $', rationale: 'Assessed value of infrastructure improvements', key: 'material_infrastructure' },
      { input: 'Space/land value contributed', multiplier: '1x', unit: 'per $', rationale: 'Market rate value of space or land access', key: 'material_space' },
    ]
  },
  {
    id: 'living',
    name: 'Living Capital',
    icon: Leaf,
    color: '#228b22',
    description: 'Soil, water, trees, animals, ecosystems, and all living systems',
    example: {
      scenario: 'You plant 100 fruit trees and build 4 inches of topsoil with 50% organic matter increase',
      input: '100 trees + 4" soil + 50% organic matter',
      calculation: '(100 x $25) + (4 x $50 x 1.5 bonus)',
      result: '$2,500 + $300 = $2,800 contribution value'
    },
    weights: [
      { input: 'Trees planted', multiplier: '$25', unit: 'per tree', rationale: 'Average cost of planting and establishing a tree to maturity', key: 'living_trees' },
      { input: 'Acres regenerated', multiplier: '$500', unit: 'per acre', rationale: 'Estimated value of land restoration per acre', key: 'living_acres' },
      { input: 'Soil depth increased', multiplier: '$50', unit: 'per inch', rationale: 'Value of topsoil creation (base rate, modified by organic matter)', key: 'living_soilDepth' },
      { input: 'Organic matter increase', multiplier: '2x', unit: 'soil depth bonus', rationale: 'Multiplies soil depth value based on quality improvement', key: 'living_organicMatter' },
      { input: 'Water systems improved', multiplier: '$0.005', unit: 'per gallon/year', rationale: 'Long-term value of water capture and management', key: 'living_water' },
      { input: 'Species diversity increase', multiplier: '$50', unit: 'per % increase', rationale: 'Biodiversity value based on ecosystem services research', key: 'living_biodiversity' },
    ]
  },
  {
    id: 'social',
    name: 'Social Capital',
    icon: Users,
    color: '#ff6b6b',
    description: 'Relationships, trust, goodwill, community connections, and networks',
    example: {
      scenario: 'You form 3 new partnerships and engage 50 community members',
      input: '3 partnerships + 50 members engaged',
      calculation: '(3 x $200) + (50 x $10)',
      result: '$600 + $500 = $1,100 contribution value'
    },
    weights: [
      { input: 'Partnerships formed', multiplier: '$200', unit: 'per partnership', rationale: 'Value of establishing strategic relationships', key: 'social_partnerships' },
      { input: 'Community members engaged', multiplier: '$10', unit: 'per member', rationale: 'Cost of community building and engagement', key: 'social_members' },
      { input: 'Events organized', multiplier: '$100', unit: 'per event', rationale: 'Average value of event facilitation and coordination', key: 'social_events' },
      { input: 'Network strength increase', multiplier: '$20', unit: 'per % increase', rationale: 'Value of network effects and connection quality', key: 'social_network' },
    ]
  },
  {
    id: 'intellectual',
    name: 'Intellectual Capital',
    icon: Brain,
    color: '#9b59b6',
    description: 'Knowledge, ideas, intellectual property, systems, and innovations',
    example: {
      scenario: 'You create 2 guides that get adopted by 5 land projects',
      input: '2 guides + 5 adoptions',
      calculation: '(2 x $150) + (5 x $100)',
      result: '$300 + $500 = $800 contribution value'
    },
    weights: [
      { input: 'Guides/documents created', multiplier: '$150', unit: 'per document', rationale: 'Average cost of professional documentation', key: 'intellectual_documents' },
      { input: 'Groups using your guides', multiplier: '$100', unit: 'per adoption', rationale: 'Value of knowledge transfer and adoption', key: 'intellectual_adoption' },
      { input: 'Systems/processes designed', multiplier: '$500', unit: 'per system', rationale: 'Value of system design and architecture work', key: 'intellectual_systems' },
      { input: 'People using your systems', multiplier: '$5', unit: 'per user', rationale: 'Ongoing value per active user of your systems', key: 'intellectual_users' },
    ]
  },
  {
    id: 'experiential',
    name: 'Experiential Capital',
    icon: Compass,
    color: '#3498db',
    description: 'Skills, expertise, hands-on experience, and practical wisdom',
    example: {
      scenario: 'You mentor 4 new contributors and train 20 people in a workshop',
      input: '4 mentored + 20 trained',
      calculation: '(4 x $75) + (20 x $25)',
      result: '$300 + $500 = $800 contribution value'
    },
    weights: [
      { input: 'Deliverables completed', multiplier: '$100', unit: 'per deliverable', rationale: 'Average value of skilled work output', key: 'experiential_deliverables' },
      { input: 'People mentored', multiplier: '$75', unit: 'per person', rationale: 'Value of one-on-one guidance and support', key: 'experiential_mentored' },
      { input: 'People trained', multiplier: '$25', unit: 'per person', rationale: 'Value of group training and skill transfer', key: 'experiential_trained' },
      { input: 'Problems solved', multiplier: '$150', unit: 'per problem', rationale: 'Value of expertise applied to challenges', key: 'experiential_problems' },
    ]
  },
  {
    id: 'spiritual',
    name: 'Spiritual Capital',
    icon: Sparkles,
    color: '#e91e63',
    description: 'Purpose, meaning, inspiration, faith, and meaningful experiences',
    example: {
      scenario: 'You facilitate 2 vision sessions with 30 attendees total',
      input: '2 sessions + 30 attendees',
      calculation: '(2 x $150) + (30 x $15)',
      result: '$300 + $450 = $750 contribution value'
    },
    weights: [
      { input: 'Vision sessions facilitated', multiplier: '$150', unit: 'per session', rationale: 'Value of strategic visioning and purpose work', key: 'spiritual_vision' },
      { input: 'Ceremonies/gatherings led', multiplier: '$100', unit: 'per ceremony', rationale: 'Value of sacred space holding and ritual facilitation', key: 'spiritual_ceremonies' },
      { input: 'Session attendees', multiplier: '$15', unit: 'per person', rationale: 'Per-person value of meaningful experiences', key: 'spiritual_attendees' },
      { input: 'Inspiration impact', multiplier: '$25', unit: 'per % morale increase', rationale: 'Value of motivation and purpose alignment', key: 'spiritual_inspiration' },
    ]
  },
  {
    id: 'cultural',
    name: 'Cultural Capital',
    icon: Globe,
    color: '#00bcd4',
    description: 'Stories, art, traditions, heritage, and shared meaning-making',
    example: {
      scenario: 'You create 3 art pieces and write 5 blog posts with 10,000 total views',
      input: '3 artworks + 5 stories + 10K views',
      calculation: '(3 x $150) + (5 x $75) + (10,000 x $0.02)',
      result: '$450 + $375 + $200 = $1,025 contribution value'
    },
    weights: [
      { input: 'Stories/articles created', multiplier: '$75', unit: 'per piece', rationale: 'Value of narrative creation and storytelling', key: 'cultural_stories' },
      { input: 'Art/creative works', multiplier: '$150', unit: 'per work', rationale: 'Average value of creative and artistic contributions', key: 'cultural_art' },
      { input: 'Content views/reach', multiplier: '$0.02', unit: 'per view', rationale: 'CPM-based value of content reach and distribution', key: 'cultural_reach' },
      { input: 'Engagement rate', multiplier: '$25', unit: 'per % engagement', rationale: 'Value of audience engagement quality', key: 'cultural_engagement' },
    ]
  }
];

// Build initial weights map from default values
const buildInitialWeights = (): Record<string, string> => {
  const weights: Record<string, string> = {};
  defaultCapitalWeights.forEach(capital => {
    capital.weights.forEach(weight => {
      weights[weight.key] = weight.multiplier;
    });
  });
  return weights;
};

// Build initial sample contributions with units that result in $100 value per metric
const buildInitialSampleContributions = (): Array<{ key: string; value: number }> => {
  const contributions: Array<{ key: string; value: number }> = [];
  defaultCapitalWeights.forEach(capital => {
    capital.weights.forEach(weight => {
      // Calculate the number of units needed to get $100 value
      const multiplierValue = parseWeightValue(weight.multiplier);
      // For multipliers like 1x, 0.05x, etc., we need $100 / multiplier
      // For multipliers like $25, $500, etc., we need 100 / multiplier
      const unitsNeeded = multiplierValue > 0 ? (100 / multiplierValue) : 0;
      // Round to reasonable precision
      const roundedUnits = Math.round(unitsNeeded * 100) / 100;
      contributions.push({ key: weight.key, value: roundedUnits });
    });
  });
  return contributions;
};

// Parse weight value to number for calculations
const parseWeightValue = (value: string): number => {
  // Remove common prefixes/suffixes and parse
  const cleaned = value.replace(/[$x%]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

// Generate consolidated proposal URL with all changes
const generateConsolidatedProposalUrl = (changes: Array<{ capitalName: string; metricName: string; originalValue: string; newValue: string }>) => {
  const title = encodeURIComponent(`[Calculator] Proposed Weight Updates (${changes.length} changes)`);
  
  let changesTable = changes.map(c => 
    `| ${c.capitalName} | ${c.metricName} | ${c.originalValue} | ${c.newValue} |`
  ).join('\n');
  
  const description = encodeURIComponent(
`## Proposal to Update Calculator Weights

This proposal includes ${changes.length} suggested weight change${changes.length > 1 ? 's' : ''} to the Contribution Calculator.

### Proposed Changes

| Capital Type | Metric | Current Weight | Proposed Weight |
|-------------|--------|----------------|-----------------|
${changesTable}

### Rationale
[Explain why these changes would better reflect the true value of contributions]

### Supporting Evidence
[Include any research, comparisons, or data that supports your proposal]

### Impact Assessment
[Describe how these changes would affect contribution calculations]

---
*This proposal was generated from the ReGen Civics Calculator Weights Sheet*`
  );
  
  return `https://app.hypha.earth/en/dho/regen-games/agreements/create?title=${title}&description=${description}`;
};

// Sample contribution for impact preview
interface SampleContribution {
  key: string;
  value: number;
}

export function CalculatorWeightsSheet() {
  const [activeTab, setActiveTab] = useState('weights');
  const [editedWeights, setEditedWeights] = useState<Record<string, string>>(buildInitialWeights);
  const [isEditing, setIsEditing] = useState(false);
  const [sampleContributions, setSampleContributions] = useState<SampleContribution[]>(buildInitialSampleContributions);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  
  // Ideas state
  const [ideas, setIdeas] = useState<CommunityIdea[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaDescription, setNewIdeaDescription] = useState('');
  const [newIdeaProposedWeight, setNewIdeaProposedWeight] = useState('');
  const [showAddIdea, setShowAddIdea] = useState(false);

  // Load ideas and votes from local storage on mount
  useEffect(() => {
    // Load ideas
    const savedIdeas = localStorage.getItem(IDEAS_STORAGE_KEY);
    if (savedIdeas) {
      try {
        const parsed = JSON.parse(savedIdeas);
        setIdeas(parsed);
      } catch (e) {
        setIdeas(defaultIdeas);
      }
    } else {
      setIdeas(defaultIdeas);
    }
    
    // Load voted IDs
    const savedVotes = localStorage.getItem(VOTES_STORAGE_KEY);
    if (savedVotes) {
      try {
        const parsed = JSON.parse(savedVotes);
        setVotedIds(new Set(parsed));
      } catch (e) {
        // Ignore
      }
    }
    
    // Load draft
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.weights && draft.timestamp) {
          setHasSavedDraft(true);
        }
      } catch (e) {
        // Invalid draft, ignore
      }
    }
  }, []);

  // Save ideas to local storage whenever they change
  useEffect(() => {
    if (ideas.length > 0) {
      localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
    }
  }, [ideas]);

  // Save voted IDs to local storage
  useEffect(() => {
    if (votedIds.size > 0) {
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(Array.from(votedIds)));
    }
  }, [votedIds]);

  // Get the original weight value for a key
  const getOriginalWeight = (key: string): string => {
    for (const capital of defaultCapitalWeights) {
      for (const weight of capital.weights) {
        if (weight.key === key) return weight.multiplier;
      }
    }
    return '';
  };

  // Calculate changes from original
  const changes = useMemo(() => {
    const result: Array<{ capitalName: string; metricName: string; originalValue: string; newValue: string; key: string }> = [];
    defaultCapitalWeights.forEach(capital => {
      capital.weights.forEach(weight => {
        const original = weight.multiplier;
        const edited = editedWeights[weight.key];
        if (original !== edited) {
          result.push({
            capitalName: capital.name,
            metricName: weight.input,
            originalValue: original,
            newValue: edited,
            key: weight.key
          });
        }
      });
    });
    return result;
  }, [editedWeights]);

  const hasChanges = changes.length > 0;

  // Calculate impact preview values
  const impactPreview = useMemo(() => {
    let originalTotal = 0;
    let newTotal = 0;

    sampleContributions.forEach(contribution => {
      const originalWeight = parseWeightValue(getOriginalWeight(contribution.key));
      const newWeight = parseWeightValue(editedWeights[contribution.key]);
      
      originalTotal += contribution.value * originalWeight;
      newTotal += contribution.value * newWeight;
    });

    const difference = newTotal - originalTotal;
    const percentChange = originalTotal > 0 ? ((difference / originalTotal) * 100) : 0;

    return {
      originalTotal,
      newTotal,
      difference,
      percentChange
    };
  }, [sampleContributions, editedWeights]);

  // Reset all weights to original
  const resetAllWeights = () => {
    setEditedWeights(buildInitialWeights());
    toast.success('All weights reset to original values');
  };

  // Reset individual weight
  const resetIndividualWeight = (key: string) => {
    const originalValue = getOriginalWeight(key);
    setEditedWeights(prev => ({
      ...prev,
      [key]: originalValue
    }));
    toast.success('Weight reset to original value');
  };

  // Handle weight change
  const handleWeightChange = (key: string, value: string) => {
    setEditedWeights(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Save draft to local storage
  const saveDraft = () => {
    const draft = {
      weights: editedWeights,
      timestamp: new Date().toISOString(),
      changes: changes
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setHasSavedDraft(true);
    toast.success('Draft saved! You can return later to continue editing.');
  };

  // Load draft from local storage
  const loadDraft = () => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEditedWeights(draft.weights);
        setIsEditing(true);
        toast.success('Draft loaded successfully!');
      } catch (e) {
        toast.error('Failed to load draft');
      }
    }
  };

  // Delete draft from local storage
  const deleteDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasSavedDraft(false);
    toast.success('Draft deleted');
  };

  // Update sample contribution value
  const updateSampleContribution = (key: string, value: number) => {
    setSampleContributions(prev => 
      prev.map(c => c.key === key ? { ...c, value } : c)
    );
  };

  // Get metric info by key
  const getMetricInfo = (key: string) => {
    for (const capital of defaultCapitalWeights) {
      for (const weight of capital.weights) {
        if (weight.key === key) {
          return { capital, weight };
        }
      }
    }
    return null;
  };

  // Upvote an idea
  const upvoteIdea = (ideaId: string) => {
    if (votedIds.has(ideaId)) {
      toast.info('You already voted for this idea!');
      return;
    }
    
    setIdeas(prev => 
      prev.map(idea => 
        idea.id === ideaId 
          ? { ...idea, votes: idea.votes + 1 }
          : idea
      ).sort((a, b) => b.votes - a.votes)
    );
    
    setVotedIds(prev => new Set([...Array.from(prev), ideaId]));
    toast.success('Vote recorded!');
  };

  // Add a new idea
  const addIdea = () => {
    if (!newIdeaTitle.trim()) {
      toast.error('Please enter an idea title');
      return;
    }
    
    const newIdea: CommunityIdea = {
      id: `idea-${Date.now()}`,
      title: newIdeaTitle.trim(),
      description: newIdeaDescription.trim() || 'No description provided',
      proposedWeight: newIdeaProposedWeight.trim() || undefined,
      votes: 1,
      createdAt: new Date().toISOString().split('T')[0],
      isSample: false
    };
    
    setIdeas(prev => [newIdea, ...prev].sort((a, b) => b.votes - a.votes));
    setVotedIds(prev => new Set([...Array.from(prev), newIdea.id]));
    setNewIdeaTitle('');
    setNewIdeaDescription('');
    setNewIdeaProposedWeight('');
    setShowAddIdea(false);
    toast.success('Idea added! Others can now vote on it.');
  };

  // Sort ideas by votes (highest first)
  const sortedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => b.votes - a.votes);
  }, [ideas]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-sm text-[#7dd87d] hover:text-[#7dd87d] transition-colors underline underline-offset-2 decoration-[#7dd87d]/40 hover:decoration-[#7dd87d]">
          <Scale className="w-4 h-4" />
          View Current Weights & Details
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white border-l border-[#7dd87d]/20">
        <SheetHeader className="pb-4 border-b border-[#1a472a]/10">
          <SheetTitle className="flex items-center gap-2 text-[#1a472a]">
            <Scale className="w-5 h-5 text-[#7dd87d]" />
            Calculator Weights & Multipliers
          </SheetTitle>
          <SheetDescription className="text-[#1a472a]/70">
            Edit weights to experiment, preview impact, and submit proposals collaboratively!
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-[#f0f7f0]">
              <TabsTrigger value="weights" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <Scale className="w-3 h-3 mr-1" />
                Weights
                {hasChanges && <span className="ml-1 w-4 h-4 rounded-full bg-[#1a472a] text-white text-[10px] flex items-center justify-center">{changes.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="ideas" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <Lightbulb className="w-3 h-3 mr-1" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="changelog" className="text-xs data-[state=active]:bg-[#7dd87d] data-[state=active]:text-[#1a472a]">
                <History className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Weights Tab */}
            <TabsContent value="weights" className="mt-4 space-y-4">
              {/* Info banner */}
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Pencil className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Experiment with Weights</p>
                    <p>Click on any multiplier value to edit it. Use the Preview tab to see how changes affect calculations.</p>
                  </div>
                </div>
              </div>

              {/* Editing controls */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className={isEditing ? "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]" : ""}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  {isEditing ? 'Editing Mode' : 'Enable Editing'}
                </Button>
                
                {hasChanges && isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveDraft}
                      className="text-[#7dd87d] border-[#7dd87d]/30 hover:bg-[#7dd87d]/10"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save Draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetAllWeights}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset All
                    </Button>
                  </>
                )}
              </div>

              {/* Changes summary */}
              {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-800">
                      <Send className="w-4 h-4 inline mr-1" />
                      {changes.length} Change{changes.length > 1 ? 's' : ''} Ready to Submit
                    </span>
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    {changes.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>{change.metricName}:</span>
                        <span className="line-through opacity-60">{change.originalValue}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-medium">{change.newValue}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={generateConsolidatedProposalUrl(changes)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
                  >
                    Submit All Changes as Proposal
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveTab('preview');
                    }}
                    className="ml-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview Impact
                  </Button>
                </div>
              )}

              {/* Capital types accordion */}
              <Accordion type="single" collapsible className="space-y-2">
                {defaultCapitalWeights.map((capital) => {
                  const capitalChanges = changes.filter(c => c.capitalName === capital.name);
                  return (
                    <AccordionItem 
                      key={capital.id} 
                      value={capital.id}
                      className="border border-[#1a472a]/10 rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:bg-[#f0f7f0] hover:no-underline">
                        <div className="flex items-center gap-3">
                          <capital.icon className="w-5 h-5" style={{ color: capital.color }} />
                          <div className="text-left">
                            <span className="font-medium text-[#1a472a]">{capital.name}</span>
                            {capitalChanges.length > 0 && (
                              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                {capitalChanges.length} edit{capitalChanges.length > 1 ? 's' : ''}
                              </span>
                            )}
                            <span className="block text-xs text-[#1a472a]/80">
                              {capital.weights.length} metrics
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <p className="text-sm text-[#1a472a]/70 mb-3">{capital.description}</p>
                        
                        {/* Example calculation */}
                        <div className="bg-[#f0f7f0] rounded-lg p-3 mb-4 border border-[#1a472a]/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Calculator className="w-4 h-4 text-[#7dd87d]" />
                            <span className="text-xs font-medium text-[#1a472a]">Example Calculation</span>
                          </div>
                          <p className="text-xs text-[#1a472a]/70 italic mb-2">"{capital.example.scenario}"</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="bg-white px-2 py-1 rounded border border-[#1a472a]/10">{capital.example.input}</span>
                            <ArrowRight className="w-3 h-3 text-[#1a472a]/80" />
                            <span className="bg-white px-2 py-1 rounded border border-[#1a472a]/10">{capital.example.calculation}</span>
                            <ArrowRight className="w-3 h-3 text-[#1a472a]/80" />
                            <span className="bg-[#7dd87d]/20 px-2 py-1 rounded border border-[#7dd87d]/30 font-medium text-[#1a472a]">{capital.example.result}</span>
                          </div>
                        </div>

                        {/* Weights list */}
                        <div className="space-y-3">
                          {capital.weights.map((weight) => {
                            const isChanged = editedWeights[weight.key] !== weight.multiplier;
                            return (
                              <div 
                                key={weight.key}
                                className={`rounded-lg p-3 border ${
                                  isChanged 
                                    ? 'bg-amber-50 border-amber-200' 
                                    : 'bg-white border-[#1a472a]/10'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-[#1a472a] text-sm">{weight.input}</h4>
                                    <p className="text-xs text-[#1a472a]/80">{weight.unit}</p>
                                    <p className="text-xs text-[#1a472a]/80 mt-1 italic">{weight.rationale}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isChanged && (
                                      <button
                                        onClick={() => resetIndividualWeight(weight.key)}
                                        className="p-1 text-[#1a472a]/80 hover:text-amber-600 hover:bg-amber-100 rounded transition-colors"
                                        title="Reset to original"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                    {isChanged && (
                                      <span className="text-xs text-[#1a472a]/80 line-through">
                                        {weight.multiplier}
                                      </span>
                                    )}
                                    {isEditing ? (
                                      <Input
                                        type="text"
                                        value={editedWeights[weight.key]}
                                        onChange={(e) => handleWeightChange(weight.key, e.target.value)}
                                        className={`w-20 h-8 text-sm text-right font-medium ${
                                          isChanged ? 'border-amber-300 bg-white' : ''
                                        }`}
                                      />
                                    ) : (
                                      <span className={`text-sm font-semibold px-3 py-1 rounded ${
                                        isChanged 
                                          ? 'bg-amber-200 text-amber-800' 
                                          : 'bg-[#7dd87d]/20 text-[#1a472a]'
                                      }`}>
                                        {editedWeights[weight.key]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {/* CTA for editing */}
              {!isEditing && (
                <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-lg p-5 text-white">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#7dd87d]" />
                    Have Ideas for Better Weights?
                  </h4>
                  <p className="text-sm text-white/80 mb-4">
                    Enable editing mode above to experiment with different values, then submit all your changes as a single proposal!
                  </p>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Start Editing Weights
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-4 space-y-4">
              {/* Info banner */}
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Eye className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Preview Impact</p>
                    <p>See how your proposed weight changes would affect calculations. Each metric starts with $100 of value so you can easily compare the impact.</p>
                  </div>
                </div>
              </div>

              {/* Impact summary card */}
              <div className={`rounded-lg p-4 border ${
                impactPreview.difference > 0 
                  ? 'bg-green-50 border-green-200' 
                  : impactPreview.difference < 0 
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className="font-semibold text-[#1a472a] mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Impact Summary
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-[#1a472a]/80 mb-1">Current Weights</div>
                    <div className="text-lg font-bold text-[#1a472a]">
                      ${impactPreview.originalTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#1a472a]/80 mb-1">With Your Changes</div>
                    <div className={`text-lg font-bold ${
                      impactPreview.difference > 0 ? 'text-green-600' : 
                      impactPreview.difference < 0 ? 'text-red-600' : 'text-[#1a472a]'
                    }`}>
                      ${impactPreview.newTotal.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#1a472a]/80 mb-1">Difference</div>
                    <div className={`text-lg font-bold ${
                      impactPreview.difference > 0 ? 'text-green-600' : 
                      impactPreview.difference < 0 ? 'text-red-600' : 'text-[#1a472a]'
                    }`}>
                      {impactPreview.difference >= 0 ? '+' : ''}${impactPreview.difference.toLocaleString()}
                      <span className="text-xs ml-1">
                        ({impactPreview.percentChange >= 0 ? '+' : ''}{impactPreview.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample contributions by capital type */}
              <div className="space-y-4">
                <h4 className="font-medium text-[#1a472a] flex items-center gap-2">
                  Sample Contributions
                  <span className="text-xs text-[#1a472a]/80 font-normal">($100 base value per metric)</span>
                </h4>
                
                <Accordion type="single" collapsible className="space-y-2">
                  {defaultCapitalWeights.map((capital) => {
                    const capitalContributions = sampleContributions.filter(c => 
                      capital.weights.some(w => w.key === c.key)
                    );
                    
                    // Calculate totals for this capital
                    let capitalOriginalTotal = 0;
                    let capitalNewTotal = 0;
                    capitalContributions.forEach(contribution => {
                      const originalWeight = parseWeightValue(getOriginalWeight(contribution.key));
                      const newWeight = parseWeightValue(editedWeights[contribution.key]);
                      capitalOriginalTotal += contribution.value * originalWeight;
                      capitalNewTotal += contribution.value * newWeight;
                    });
                    const capitalDiff = capitalNewTotal - capitalOriginalTotal;
                    const hasCapitalChanges = capitalDiff !== 0;
                    
                    return (
                      <AccordionItem 
                        key={capital.id} 
                        value={capital.id}
                        className="border border-[#1a472a]/10 rounded-lg overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:bg-[#f0f7f0] hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-3">
                              <capital.icon className="w-5 h-5" style={{ color: capital.color }} />
                              <span className="font-medium text-[#1a472a]">{capital.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-[#1a472a]/80">${capitalOriginalTotal.toLocaleString()}</span>
                              {hasCapitalChanges && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-[#1a472a]/80" />
                                  <span className={capitalDiff > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    ${capitalNewTotal.toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-2">
                            {capital.weights.map((weight) => {
                              const contribution = sampleContributions.find(c => c.key === weight.key);
                              if (!contribution) return null;
                              
                              const originalWeight = parseWeightValue(weight.multiplier);
                              const newWeight = parseWeightValue(editedWeights[weight.key]);
                              const originalValue = contribution.value * originalWeight;
                              const newValue = contribution.value * newWeight;
                              const isChanged = originalWeight !== newWeight;
                              
                              return (
                                <div 
                                  key={weight.key}
                                  className={`rounded-lg p-3 border ${
                                    isChanged ? 'bg-amber-50 border-amber-200' : 'bg-[#f0f7f0] border-[#1a472a]/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-[#1a472a]">{weight.input}</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Input
                                          type="number"
                                          value={contribution.value}
                                          onChange={(e) => updateSampleContribution(weight.key, parseFloat(e.target.value) || 0)}
                                          className="w-20 h-7 text-sm"
                                        />
                                        <span className="text-xs text-[#1a472a]/80">{weight.unit}</span>
                                        <span className="text-xs text-[#1a472a]/80">x {editedWeights[weight.key]}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-medium ${isChanged ? 'line-through text-[#1a472a]/80' : 'text-[#1a472a]'}`}>
                                        ${originalValue.toLocaleString()}
                                      </div>
                                      {isChanged && (
                                        <div className={`text-sm font-bold ${
                                          newValue > originalValue ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          ${newValue.toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>

              {/* Action buttons */}
              {hasChanges && (
                <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-lg p-4 text-white">
                  <h4 className="font-semibold mb-2">Ready to Submit?</h4>
                  <p className="text-sm text-white/80 mb-3">
                    Your {changes.length} proposed change{changes.length > 1 ? 's' : ''} would result in a {impactPreview.percentChange >= 0 ? '+' : ''}{impactPreview.percentChange.toFixed(1)}% difference for the sample contributions above.
                  </p>
                  <a
                    href={generateConsolidatedProposalUrl(changes)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Submit Proposal to Hypha
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </TabsContent>

            {/* Ideas Tab - Simplified voting system */}
            <TabsContent value="ideas" className="mt-4 space-y-4">
              {/* Info banner */}
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Community Ideas</p>
                    <p>Vote on ideas you support or add your own. The highest-voted ideas rise to the top!</p>
                  </div>
                </div>
              </div>

              {/* Add new idea section */}
              {showAddIdea ? (
                <div className="bg-[#f0f7f0] rounded-lg p-4 border border-[#7dd87d]/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[#1a472a] flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#7dd87d]" />
                      Add Your Idea
                    </h4>
                    <button
                      onClick={() => setShowAddIdea(false)}
                      className="p-1 text-[#1a472a]/80 hover:text-[#1a472a] rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Idea title (e.g., 'Add water conservation metric')"
                      value={newIdeaTitle}
                      onChange={(e) => setNewIdeaTitle(e.target.value)}
                      className="w-full"
                    />
                    <textarea
                      placeholder="Brief description (optional)"
                      value={newIdeaDescription}
                      onChange={(e) => setNewIdeaDescription(e.target.value)}
                      className="w-full h-20 px-3 py-2 text-sm border border-[#1a472a]/20 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                    />
                    <Input
                      type="text"
                      placeholder="Proposed multiplier (e.g., '$50 per ton' or '1.5x')"
                      value={newIdeaProposedWeight}
                      onChange={(e) => setNewIdeaProposedWeight(e.target.value)}
                      className="w-full"
                    />
                    <Button
                      onClick={addIdea}
                      className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Idea
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddIdea(true)}
                  variant="outline"
                  className="w-full border-dashed border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:text-[#7dd87d]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your Idea
                </Button>
              )}

              {/* Ideas list - sorted by votes */}
              <div className="space-y-3">
                {sortedIdeas.map((idea, index) => {
                  const hasVoted = votedIds.has(idea.id);
                  return (
                    <div 
                      key={idea.id}
                      className={`rounded-lg border p-4 transition-all ${
                        index === 0 
                          ? 'border-[#7dd87d]/50 bg-[#7dd87d]/5' 
                          : 'border-[#1a472a]/10 bg-white hover:border-[#7dd87d]/30'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Vote button */}
                        <button
                          onClick={() => upvoteIdea(idea.id)}
                          disabled={hasVoted}
                          className={`flex flex-col items-center justify-center min-w-[50px] py-2 rounded-lg transition-all ${
                            hasVoted 
                              ? 'bg-[#7dd87d]/20 text-[#7dd87d] cursor-default' 
                              : 'bg-[#f0f7f0] text-[#1a472a]/80 hover:bg-[#7dd87d]/10 hover:text-[#7dd87d] cursor-pointer'
                          }`}
                        >
                          <ChevronUp className={`w-5 h-5 ${hasVoted ? 'text-[#7dd87d]' : ''}`} />
                          <span className={`text-lg font-bold ${hasVoted ? 'text-[#7dd87d]' : ''}`}>
                            {idea.votes}
                          </span>
                        </button>
                        
                        {/* Idea content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-[#1a472a]">{idea.title}</h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {idea.isSample && (
                                <span className="text-xs bg-[#1a472a]/10 text-[#1a472a]/80 px-2 py-0.5 rounded-full">
                                  Sample
                                </span>
                              )}
                              {index === 0 && (
                                <span className="text-xs bg-[#7dd87d]/20 text-[#1a472a] px-2 py-0.5 rounded-full">
                                  Top Idea
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-[#1a472a]/70 mt-1">{idea.description}</p>
                          {idea.proposedWeight && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-[#f0f7f0] px-2 py-1 rounded text-[#1a472a]/70">
                                Proposed: {idea.proposedWeight}
                              </span>
                              {idea.capitalType && (
                                <span className="text-xs text-[#1a472a]/80">
                                  {idea.capitalType}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit to Hypha CTA */}
              <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-lg p-5 text-white">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#7dd87d]" />
                  Ready to Make It Official?
                </h4>
                <p className="text-sm text-white/80 mb-4">
                  When an idea has enough support, submit it as a formal proposal on Hypha for the community to vote on!
                </p>
                <a
                  href="https://app.hypha.earth/en/dho/regen-games/agreements/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Submit Proposal to Hypha
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </TabsContent>

            {/* Changelog Tab */}
            <TabsContent value="changelog" className="mt-4 space-y-4">
              {/* Info banner */}
              <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <History className="w-5 h-5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#1a472a]/80">
                    <p className="font-medium text-[#1a472a] mb-1">Calculator Evolution</p>
                    <p>Track how the calculator weights have changed over time through community governance and proposals.</p>
                  </div>
                </div>
              </div>

              {/* Changelog entries */}
              <div className="space-y-4">
                {changelogEntries.map((entry, idx) => (
                  <div 
                    key={idx}
                    className={`rounded-lg border p-4 ${
                      entry.status === 'current' 
                        ? 'border-[#7dd87d]/40 bg-[#f0f7f0]' 
                        : 'border-[#1a472a]/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {entry.status === 'current' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#7dd87d]" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#1a472a]/80" />
                        )}
                        <span className="font-semibold text-[#1a472a]">
                          Version {entry.version}
                        </span>
                        {entry.status === 'current' && (
                          <span className="text-xs bg-[#7dd87d]/20 text-[#1a472a] px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {entry.status === 'planned' && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Planned
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[#1a472a]/80">{entry.date}</span>
                    </div>
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIdx) => (
                        <li key={changeIdx} className="flex items-start gap-2 text-sm">
                          <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${
                            change.type === 'new' 
                              ? 'bg-green-100 text-green-700' 
                              : change.type === 'updated'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {change.type === 'new' ? 'NEW' : change.type === 'updated' ? 'UPD' : 'TBD'}
                          </span>
                          <span className="text-[#1a472a]/80">{change.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Governance info */}
              <div className="bg-[#f0f7f0] rounded-lg p-4 border border-[#1a472a]/10">
                <h4 className="font-medium text-[#1a472a] mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#7dd87d]" />
                  How Changes Are Made
                </h4>
                <ol className="text-sm text-[#1a472a]/70 space-y-2 list-decimal list-inside">
                  <li>Community member submits a proposal on Hypha</li>
                  <li>Voice holders discuss and vote on the change</li>
                  <li>If approved, the calculator is updated</li>
                  <li>Change is documented in this changelog</li>
                </ol>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-lg p-5 text-white">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#7dd87d]" />
                  Shape the Next Version
                </h4>
                <p className="text-sm text-white/80 mb-4">
                  Have ideas for Version 1.1? Go to the Weights tab to experiment with changes, then submit your proposal.
                </p>
                <Button
                  onClick={() => {
                    setActiveTab('weights');
                    setIsEditing(true);
                  }}
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Weights
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Version info */}
          <div className="text-center text-xs text-[#1a472a]/80 pt-4 mt-4 border-t border-[#1a472a]/10">
            Calculator Version 1.0 | Last Updated: January 2026
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
