/**
 * Crowd Pooling Projects Page
 * Shows projects currently crowd pooling for contributions
 * Features: Dual progress bars (total vs financial, proposed vs accepted)
 * Enhanced project details with full application data
 */

import { Link, useLocation } from "wouter";
import { ArrowLeft, Users, MapPin, Target, Calendar, Sparkles, Clock, FileText, Send, DollarSign, TrendingUp, CheckCircle2, Loader2, Upload, X, ExternalLink, Briefcase, Home, Leaf, GraduationCap, Heart, Globe, Building, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SEO, pageSEO } from "@/components/SEO";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { BackButton } from "@/components/BackButton";

// Enhanced project data with full application details
const sampleProjects = [
  {
    id: 1,
    name: "Harmony Valley Ecovillage",
    location: "Costa Rica, Guanacaste Province",
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
    image: "https://assets.regencivics.earth/ptLdEEmSgyEQKzmF.jpg",
    tags: ["Permaculture", "Housing", "Food Forest"],
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "https://www.youtube.com/watch?v=example1",
    // Full application data
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
    // Open roles with detailed requirements
    openRoles: [
      {
        id: "role-1",
        title: "Permaculture Design Lead",
        description: "Lead the design and implementation of food forests and regenerative agriculture systems",
        weeks: 26,
        hoursPerWeek: 20,
        hourlyRate: 35,
        totalValue: 18200,
        skills: ["Permaculture Design Certificate", "Food Forest Experience", "Team Leadership"],
        responsibilities: ["Design food forest zones", "Train community members", "Manage planting schedules"]
      },
      {
        id: "role-2",
        title: "Natural Building Coordinator",
        description: "Coordinate natural building projects and train volunteers in cob, straw bale, and earthbag techniques",
        weeks: 52,
        hoursPerWeek: 30,
        hourlyRate: 30,
        totalValue: 46800,
        skills: ["Natural Building Experience", "Project Management", "Teaching Skills"],
        responsibilities: ["Plan building projects", "Source local materials", "Lead workshops"]
      },
      {
        id: "role-3",
        title: "Community Outreach Manager",
        description: "Build relationships with local communities, manage volunteer program, and coordinate events",
        weeks: 52,
        hoursPerWeek: 15,
        hourlyRate: 25,
        totalValue: 19500,
        skills: ["Community Development", "Event Planning", "Spanish Fluency"],
        responsibilities: ["Organize open days", "Manage volunteer applications", "Local partnerships"]
      }
    ]
  },
  {
    id: 2,
    name: "Terra Nova Regenerative Farm",
    location: "Portugal, Alentejo Region",
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
    image: "https://assets.regencivics.earth/wwnJXOsxkrlwtDre.jpg",
    tags: ["Agriculture", "Land Restoration", "Education"],
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "https://www.youtube.com/watch?v=example2",
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
        weeks: 40,
        hoursPerWeek: 25,
        hourlyRate: 40,
        totalValue: 40000,
        skills: ["Soil Science Degree", "Lab Analysis", "Regenerative Agriculture"],
        responsibilities: ["Soil testing", "Amendment recommendations", "Progress tracking"]
      }
    ]
  },
  {
    id: 3,
    name: "Pachamama Learning Village",
    location: "Ecuador, Andes Mountains",
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
    image: "https://assets.regencivics.earth/qDMEazGCLoNCuxiS.jpg",
    tags: ["Indigenous", "Education", "Traditional Knowledge"],
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    overviewVideoUrl: "https://www.youtube.com/watch?v=example3",
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
        weeks: 30,
        hoursPerWeek: 20,
        hourlyRate: 28,
        totalValue: 16800,
        skills: ["Video Production", "Cultural Sensitivity", "Spanish/Kichwa"],
        responsibilities: ["Interview elders", "Create educational materials", "Archive management"]
      }
    ]
  },
  {
    id: 4,
    name: "Rewild Britain Sanctuary",
    location: "Scotland, Highlands",
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
    image: "https://assets.regencivics.earth/FuQmXVqMDIJIpIbl.jpg",
    tags: ["Rewilding", "Conservation", "Wildlife"],
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
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
        weeks: 52,
        hoursPerWeek: 35,
        hourlyRate: 32,
        totalValue: 58240,
        skills: ["Ecology Degree", "Wildlife Monitoring", "Data Analysis"],
        responsibilities: ["Camera trap monitoring", "Species surveys", "Habitat assessment"]
      },
      {
        id: "role-7",
        title: "Tree Nursery Manager",
        description: "Manage native tree nursery and coordinate planting programs",
        weeks: 40,
        hoursPerWeek: 30,
        hourlyRate: 22,
        totalValue: 26400,
        skills: ["Horticulture", "Native Species Knowledge", "Volunteer Coordination"],
        responsibilities: ["Seed collection", "Nursery management", "Planting events"]
      }
    ]
  }
];

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PHP: "₱",
  JPY: "¥",
  INR: "₹"
};

// Dual Progress Bar Component
function DualProgressBar({ 
  label,
  totalValue, 
  financialValue, 
  targetAmount, 
  currency,
  showProposed = false,
  proposedTotal = 0,
  proposedFinancial = 0
}: { 
  label: string;
  totalValue: number; 
  financialValue: number; 
  targetAmount: number;
  currency: string;
  showProposed?: boolean;
  proposedTotal?: number;
  proposedFinancial?: number;
}) {
  const symbol = currencySymbols[currency] || currency;
  const totalPercent = Math.min((totalValue / targetAmount) * 100, 100);
  const financialPercent = Math.min((financialValue / targetAmount) * 100, 100);
  const proposedTotalPercent = showProposed ? Math.min((proposedTotal / targetAmount) * 100, 100) : 0;
  const proposedFinancialPercent = showProposed ? Math.min((proposedFinancial / targetAmount) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#1a472a]">{label}</span>
          <span className="text-[#1a472a]/80">{symbol}{targetAmount.toLocaleString()} goal</span>
        </div>
      )}
      
      {/* Total Contributions Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#4a7c59]" />
            <span className="text-[#1a472a]/85">Total Value</span>
          </div>
          <span className="text-[#336644] font-medium">{symbol}{totalValue.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-[#1a472a]/10 rounded-full overflow-hidden relative">
          {showProposed && proposedTotal > totalValue && (
            <div 
              className="absolute h-full bg-[#7dd87d]/40 rounded-full transition-all"
              style={{ width: `${proposedTotalPercent}%` }}
            />
          )}
          <div 
            className="h-full bg-gradient-to-r from-[#7dd87d] to-[#4a9f4a] rounded-full transition-all relative z-10"
            style={{ width: `${totalPercent}%` }}
          />
        </div>
        {showProposed && proposedTotal > totalValue && (
          <p className="text-xs text-[#336644] flex items-center gap-1">
            <span className="w-2 h-2 bg-[#7dd87d]/40 rounded-full inline-block" />
            +{symbol}{(proposedTotal - totalValue).toLocaleString()} proposed
          </p>
        )}
      </div>
      
      {/* Financial Contributions Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-600" />
            <span className="text-[#1a472a]/85">Cash, Crypto, etc.</span>
          </div>
          <span className="text-amber-600 font-medium">{symbol}{financialValue.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-[#1a472a]/10 rounded-full overflow-hidden relative">
          {showProposed && proposedFinancial > financialValue && (
            <div 
              className="absolute h-full bg-amber-400/40 rounded-full transition-all"
              style={{ width: `${proposedFinancialPercent}%` }}
            />
          )}
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all relative z-10"
            style={{ width: `${financialPercent}%` }}
          />
        </div>
        {showProposed && proposedFinancial > financialValue && (
          <p className="text-xs text-amber-500/80 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-400/40 rounded-full inline-block" />
            +{symbol}{(proposedFinancial - financialValue).toLocaleString()} proposed
          </p>
        )}
      </div>
    </div>
  );
}

// Role Card Component with copy-to-proposal functionality
function RoleCard({ 
  role, 
  currency, 
  projectName,
  daoLink 
}: { 
  role: typeof sampleProjects[0]['openRoles'][0];
  currency: string;
  projectName: string;
  daoLink: string;
}) {
  const symbol = currencySymbols[currency] || currency;
  const [copied, setCopied] = useState(false);
  
  const copyToProposal = () => {
    const proposalData = {
      type: "role",
      roleName: role.title,
      weeks: role.weeks,
      hoursPerWeek: role.hoursPerWeek,
      hourlyRate: role.hourlyRate,
      totalValue: role.totalValue,
      project: projectName
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(proposalData, null, 2));
    setCopied(true);
    toast.success("Role copied to clipboard!", {
      description: "Paste this into the Crowd Pooling Tool to add to your proposal"
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-white rounded-xl border border-[#7dd87d]/30 p-4 hover:border-[#7dd87d] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
            {role.title}
          </h4>
          <p className="text-sm text-[#1a472a]/85 mt-1">{role.description}</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 flex-shrink-0">
          <Briefcase className="w-3 h-3 mr-1" />
          Role
        </Badge>
      </div>
      
      {/* Role Details */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-[#f8f5f0] rounded-lg p-2 text-center">
          <p className="text-[#1a472a]/80">Weeks</p>
          <p className="font-bold text-[#1a472a]">{role.weeks}</p>
        </div>
        <div className="bg-[#f8f5f0] rounded-lg p-2 text-center">
          <p className="text-[#1a472a]/80">Hrs/Week</p>
          <p className="font-bold text-[#1a472a]">{role.hoursPerWeek}</p>
        </div>
        <div className="bg-[#f8f5f0] rounded-lg p-2 text-center">
          <p className="text-[#1a472a]/80">{symbol}/Hour</p>
          <p className="font-bold text-[#1a472a]">{role.hourlyRate}</p>
        </div>
      </div>
      
      {/* Total Value */}
      <div className="flex items-center justify-between mb-3 py-2 border-t border-b border-[#1a472a]/10">
        <span className="text-sm text-[#1a472a]/85">Total Value:</span>
        <span className="font-bold text-[#336644]">{symbol}{role.totalValue.toLocaleString()}</span>
      </div>
      
      {/* Skills */}
      <div className="mb-3">
        <p className="text-xs text-[#1a472a]/80 mb-1">Required Skills:</p>
        <div className="flex flex-wrap gap-1">
          {role.skills.map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-xs bg-[#7dd87d]/10 text-[#1a472a]">
              {skill}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-[#1a472a]/30"
          onClick={copyToProposal}
        >
          <Copy className="w-3 h-3 mr-1" />
          {copied ? "Copied!" : "Add to Proposal"}
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-[#1a472a] hover:bg-[#2d5a3d]"
          onClick={() => window.open(daoLink, '_blank')}
        >
          <Send className="w-3 h-3 mr-1" />
          Apply in DAO
        </Button>
      </div>
    </div>
  );
}

// Project Detail Modal Component
function ProjectDetailModal({ 
  project, 
  isOpen, 
  onClose 
}: { 
  project: typeof sampleProjects[0]; 
  isOpen: boolean;
  onClose: () => void;
}) {
  const symbol = currencySymbols[project.currency] || project.currency;
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{project.name}</DialogTitle>
        </DialogHeader>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] text-white p-6 z-10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {project.name}
          </h2>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <MapPin className="w-4 h-4" />
            {project.location}
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#7dd87d]">
                {Math.round((project.currentAmount / project.targetAmount) * 100)}%
              </p>
              <p className="text-xs text-white/60">Funded</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{project.contributors}</p>
              <p className="text-xs text-white/60">Contributors</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{project.openRoles?.length || 0}</p>
              <p className="text-xs text-white/60">Open Roles</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Project Details</TabsTrigger>
            <TabsTrigger value="roles">Open Roles</TabsTrigger>
            <TabsTrigger value="contribute">Contribute</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <p className="text-[#1a472a]/80">{project.description}</p>
            
            {/* Progress */}
            <div className="bg-[#f8f5f0] rounded-xl p-4">
              <DualProgressBar
                label="Funding Progress"
                totalValue={project.currentAmount}
                financialValue={project.financialAmount}
                targetAmount={project.targetAmount}
                currency={project.currency}
                showProposed={true}
                proposedTotal={project.proposedTotal}
                proposedFinancial={project.proposedFinancial}
              />
              
              <div className="mt-3 pt-3 border-t border-[#1a472a]/10 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#1a472a]/80">Accepted Contributors</span>
                  <p className="font-medium text-[#1a472a]">{project.contributors}</p>
                </div>
                <div>
                  <span className="text-[#1a472a]/80">Pending Proposals</span>
                  <p className="font-medium text-[#1a472a]">{project.pendingContributors}</p>
                </div>
              </div>
            </div>
            
            {/* Vision */}
            {project.applicationData?.vision && (
              <div className="bg-[#7dd87d]/10 rounded-xl p-4">
                <h3 className="font-bold text-[#1a472a] mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#7dd87d]" />
                  Vision
                </h3>
                <p className="text-sm text-[#1a472a]/80">{project.applicationData.vision}</p>
              </div>
            )}
            
            {/* Tags & Deadline */}
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="bg-[#7dd87d]/10 text-[#1a472a]">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-[#1a472a]/85">
              <Calendar className="w-4 h-4" />
              <span>Crowd Pooling deadline: <strong>{project.deadline}</strong></span>
            </div>
          </TabsContent>
          
          {/* Project Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {project.applicationData && (
              <>
                {/* Land & Legal */}
                <div className="bg-[#f8f5f0] rounded-xl p-4">
                  <h3 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#7dd87d]" />
                    Land & Legal Structure
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#1a472a]/80">Land Size</p>
                      <p className="font-medium text-[#1a472a]">{project.applicationData.landSize}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Land Status</p>
                      <p className="font-medium text-[#1a472a]">{project.applicationData.landStatus}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Legal Structure</p>
                      <p className="font-medium text-[#1a472a]">{project.applicationData.legalStructure}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Current Phase</p>
                      <p className="font-medium text-[#1a472a]">{project.applicationData.currentPhase}</p>
                    </div>
                  </div>
                </div>
                
                {/* Governance */}
                <div className="bg-[#f8f5f0] rounded-xl p-4">
                  <h3 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#7dd87d]" />
                    Governance & Membership
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[#1a472a]/80">Governance Model</p>
                      <p className="text-[#1a472a]">{project.applicationData.governanceModel}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Membership Model</p>
                      <p className="text-[#1a472a]">{project.applicationData.membershipModel}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Team Size</p>
                      <p className="text-[#1a472a]">{project.applicationData.teamSize} core members</p>
                    </div>
                  </div>
                </div>
                
                {/* Systems */}
                <div className="bg-[#f8f5f0] rounded-xl p-4">
                  <h3 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#7dd87d]" />
                    Regenerative Systems
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[#1a472a]/80">Housing Plans</p>
                      <p className="text-[#1a472a]">{project.applicationData.housingPlans}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Food Systems</p>
                      <p className="text-[#1a472a]">{project.applicationData.foodSystems}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Water Systems</p>
                      <p className="text-[#1a472a]">{project.applicationData.waterSystems}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Energy Systems</p>
                      <p className="text-[#1a472a]">{project.applicationData.energySystems}</p>
                    </div>
                  </div>
                </div>
                
                {/* Education & Community */}
                <div className="bg-[#f8f5f0] rounded-xl p-4">
                  <h3 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#7dd87d]" />
                    Education & Community
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[#1a472a]/80">Education Programs</p>
                      <p className="text-[#1a472a]">{project.applicationData.educationPrograms}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Community Engagement</p>
                      <p className="text-[#1a472a]">{project.applicationData.communityEngagement}</p>
                    </div>
                  </div>
                </div>
                
                {/* Impact & Challenges */}
                <div className="bg-[#f8f5f0] rounded-xl p-4">
                  <h3 className="font-bold text-[#1a472a] mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#7dd87d]" />
                    Impact & Challenges
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[#1a472a]/80">Impact Metrics</p>
                      <p className="text-[#1a472a]">{project.applicationData.impactMetrics}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Challenges</p>
                      <p className="text-[#1a472a]">{project.applicationData.challenges}</p>
                    </div>
                    <div>
                      <p className="text-[#1a472a]/80">Timeline</p>
                      <p className="text-[#1a472a]">{project.applicationData.timeline}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Open Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            {project.openRoles && project.openRoles.length > 0 ? (
              <>
                <p className="text-sm text-[#1a472a]/85">
                  These roles are open for contributors. Click "Add to Proposal" to copy the role details
                  to your clipboard, then paste into the Crowd Pooling Tool. Or apply directly through the DAO.
                </p>
                <div className="space-y-4">
                  {project.openRoles.map((role) => (
                    <RoleCard 
                      key={role.id} 
                      role={role} 
                      currency={project.currency}
                      projectName={project.name}
                      daoLink={project.daoLink}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-[#1a472a]/20 mx-auto mb-3" />
                <p className="text-[#1a472a]/80">No open roles at this time</p>
              </div>
            )}
          </TabsContent>
          
          {/* Contribute Tab */}
          <TabsContent value="contribute" className="space-y-4">
            <div className="bg-[#7dd87d]/10 rounded-xl p-4">
              <h3 className="font-bold text-[#1a472a] mb-2">How to Contribute</h3>
              <ol className="space-y-3 text-sm text-[#1a472a]/80">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Use the <Link href="/crowd-pooling" className="text-[#336644] underline">Crowd Pooling Tool</Link> to calculate your contribution value</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Add any open roles you want to fill (copy from the Roles tab)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#7dd87d] text-[#1a472a] flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Submit your proposal through the DAO for review</span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link href={`/crowd-pooling?project=${encodeURIComponent(project.name)}&target=${Math.round(project.targetAmount / (project.contributors || 10))}&currency=${project.currency}`}>
                <Button className="w-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c]">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Proposal in Crowd Pooling Tool
                </Button>
              </Link>
              
              <Button 
                className="w-full bg-[#1a472a] hover:bg-[#2d5a3d]"
                onClick={() => window.open(project.daoLink, '_blank')}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Proposal in DAO
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function CrowdPoolingProjects() {
  const [, navigate] = useLocation();
  const [selectedProject, setSelectedProject] = useState<typeof sampleProjects[0] | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Fetch real projects from database  -  auto-refresh every 5 minutes
  const { data: dbProjects, isLoading: dbLoading } = trpc.crowdPoolingProjects.list.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });
  
  // Convert DB projects to the same shape as sample projects for display
  const realProjects = (dbProjects || []).map((p: any) => ({
    id: p.id + 10000, // Offset to avoid ID collision with samples
    name: p.projectName,
    location: p.location || 'Location TBD',
    description: p.projectDescription || '',
    targetAmount: p.targetAmount,
    currentAmount: p.currentAmount || 0,
    financialAmount: p.currentAmount || 0,
    proposedTotal: 0,
    proposedFinancial: 0,
    currency: p.targetCurrency || 'USD',
    contributors: p.contributorCount || 0,
    pendingContributors: 0,
    deadline: p.endDate ? new Date(p.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Ongoing',
    image: p.projectImageUrl || '',
    tags: [] as string[],
    status: p.status,
    daoLink: p.projectUrl || 'https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution',
    overviewVideoUrl: '',
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
  }));
  
  // Show real projects first, then sample projects as examples
  const allProjects = realProjects.length > 0 
    ? [...realProjects, ...sampleProjects.map(p => ({ ...p, isFromDatabase: false }))]
    : sampleProjects.map(p => ({ ...p, isFromDatabase: false }));
  
  const handleOpenDetail = (project: typeof sampleProjects[0]) => {
    setSelectedProject(project);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f5f0] to-[#f0ebe0]">
      <SEO {...pageSEO.crowdPoolingProjects} />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] text-white py-12 md:py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://assets.regencivics.earth/LITCLobaccHmqZcc.jpg"
            alt="Crowd Pooling - Community members bringing diverse resources together"
            className="w-full h-full object-cover opacity-30"
          loading="lazy" />
        </div>
        
        <div className="relative z-10 container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-[#7dd87d]/20">
              <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" size={20} />
              <span className="text-sm font-medium">Crowd Pooling Projects</span>
            </div>
            <h1 
              className="text-3xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Support Regenerative Land Projects
            </h1>
            <p className="text-white/80 text-base md:text-lg mb-8">
              Contribute what projects actually need: land, equipment, skills, time, and financial resources
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Link href="/crowd-pooling">
                <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] w-full sm:w-auto">
                  <FileText className="w-4 h-4 mr-2" />
                  Create Your Proposal
                </Button>
              </Link>
              <Link href="/compare-projects">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                  <Target className="w-4 h-4 mr-2" />
                  Compare Projects
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="border-white/30 text-white/50 cursor-not-allowed w-full sm:w-auto"
                disabled
                onClick={() => toast.info("Project listing is coming soon! Contact us to learn more.")}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                List Your Project (Coming Soon)
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Aggregate Progress Banner */}
      {dbProjects && dbProjects.length > 0 && (() => {
        const totalFunded = dbProjects.reduce((s: number, p: any) => s + (p.currentAmount || 0), 0);
        const totalTarget = dbProjects.reduce((s: number, p: any) => s + (p.targetAmount || 0), 0);
        const totalContributors = dbProjects.reduce((s: number, p: any) => s + (p.contributorCount || 0), 0);
        const activeCount = dbProjects.filter((p: any) => p.status === 'active').length;
        const pct = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0;

        const fmtK = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${n}`;

        return (
          <div className="bg-[#1a472a]/90 border-b border-[#7dd87d]/20 py-4">
            <div className="container">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-6">
                  <div className="text-center">
                    <p className="text-[#7dd87d] font-bold text-xl">{activeCount}</p>
                    <p className="text-white/60 text-xs">Active Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#7dd87d] font-bold text-xl">{fmtK(totalFunded)}</p>
                    <p className="text-white/60 text-xs">Pooled</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#7dd87d] font-bold text-xl">{totalContributors}</p>
                    <p className="text-white/60 text-xs">Contributors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[#7dd87d] font-bold text-xl">{pct}%</p>
                    <p className="text-white/60 text-xs">Avg Funded</p>
                  </div>
                </div>
                <div className="flex-1 min-w-48 max-w-xs">
                  <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                    <span>Overall Progress</span>
                    <span>{fmtK(totalFunded)} / {fmtK(totalTarget)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7dd87d] rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
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
        <div className="bg-[#f0f7f0] border border-[#7dd87d]/30 rounded-xl px-5 py-4 mb-6 text-sm text-[#1a472a] flex items-center gap-3">
          <Leaf className="w-4 h-4 text-[#4a7c59] flex-shrink-0" />
          <span>
            These are land projects currently raising through crowd pooling.{" "}
            Want to run the numbers on your contribution?{" "}
            <Link href="/crowd-pooling" className="font-medium text-[#4a7c59] hover:underline">
              Open the Crowd Pooling Calculator →
            </Link>
          </span>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#1a472a] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#1a472a] font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-[#1a472a] text-sm">Browse Projects</h3>
                <p className="text-xs text-[#1a472a]/80">Click on any project to see full details and open roles</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#1a472a] font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-[#1a472a] text-sm">Create Your Proposal</h3>
                <p className="text-xs text-[#1a472a]/80">Use the Crowd Pooling Tool to calculate your contribution</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#1a472a] font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-[#1a472a] text-sm">Submit to Project(s)</h3>
                <p className="text-xs text-[#1a472a]/80">Submit your proposal for project review and acceptance</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Project Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {dbLoading && (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#4a7c59]" />
              <span className="ml-2 text-[#1a472a]/80">Loading projects...</span>
            </div>
          )}
          {allProjects.map((project: any) => (
            <div
              key={project.id}
              data-reveal
              className="group bg-white rounded-2xl overflow-hidden border border-[#7dd87d]/30 hover:border-[#7dd87d] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1"
              onClick={() => handleOpenDetail(project)}
            >
              {/* Project Image */}
              <div className="h-52 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] relative overflow-hidden">
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SeedOfLifeIcon className="w-16 h-16 text-white/35" size={64} />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {/* Funding % in bottom-left */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="bg-[#7dd87d] text-[#1a472a] font-bold text-base px-3 py-1 rounded-lg leading-tight">
                    {Math.round((project.currentAmount / project.targetAmount) * 100)}%
                  </span>
                  <span className="text-white text-sm font-medium drop-shadow-sm">funded</span>
                </div>
                <Badge className="absolute top-3 right-3 bg-[#7dd87d] text-[#1a472a]">
                  {project.status === 'active' ? 'Active' : project.status === 'upcoming' ? 'Upcoming' : project.status === 'completed' ? 'Completed' : 'Paused'}
                </Badge>
                {!project.isFromDatabase && (
                  <Badge className="absolute bottom-3 right-3 bg-amber-500/80 text-white text-[10px]">
                    Example
                  </Badge>
                )}
                {project.openRoles && project.openRoles.length > 0 && (
                  <Badge className="absolute top-3 left-3 bg-purple-500 text-white">
                    {project.openRoles.length} Open Roles
                  </Badge>
                )}
              </div>
              
              {/* Project Info */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-[#1a472a] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  {project.name}
                </h3>
                <div className="flex items-center gap-1 text-sm text-[#1a472a]/80 mb-3">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </div>
                
                <p className="text-sm text-[#1a472a]/85 mb-4 line-clamp-2">
                  {project.description}
                </p>
                
                {/* Dual Progress Bars */}
                <div className="mb-4">
                  <DualProgressBar
                    label="Funding Progress"
                    totalValue={project.currentAmount}
                    financialValue={project.financialAmount}
                    targetAmount={project.targetAmount}
                    currency={project.currency}
                    showProposed={true}
                    proposedTotal={project.proposedTotal}
                    proposedFinancial={project.proposedFinancial}
                  />
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-[#1a472a]/80 mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.contributors} accepted
                    {project.pendingContributors > 0 && (
                      <span className="text-[#336644]">+{project.pendingContributors} pending</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.deadline}
                  </div>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-[#7dd87d]/10 text-[#1a472a]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1 border-[#1a472a]/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(project);
                      }}
                    >
                      View Details
                    </Button>
                    {project.overviewVideoUrl && (
                      <Button 
                        variant="outline"
                        className="flex-1 border-[#7dd87d] text-[#4a7c59] hover:bg-[#7dd87d]/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(project.overviewVideoUrl, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Explore Video
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-br from-[#1a472a] to-[#2d5a3d] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Want Your Project Listed Here?
          </h2>
          <p className="text-white/80 max-w-lg mx-auto mb-6">
            If you are a land project looking to crowd pool contributions from your community, 
            apply to join the ReGen Civics alliance and get access to our Crowd Pooling platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/seasons">
              <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#6cc86c] w-full sm:w-auto">
                Apply for Season 3
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
      
      {/* Project Detail Modal */}
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
