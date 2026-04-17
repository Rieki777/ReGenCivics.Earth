/**
 * Project Comparison Page
 * Allows users to compare 2-3 crowd pooling projects side by side
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Plus, X, Check, Minus, MapPin, Users, DollarSign, Calendar, Target, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';

import { BackButton } from "@/components/BackButton";


// Sample projects data - in production this would come from the database
const sampleProjects = [
  {
    id: 1,
    name: "Harmony Valley Ecovillage",
    location: "Costa Rica, Guanacaste Province",
    description: "A 150-acre regenerative community focused on permaculture, food forests, and sustainable housing for 50 families.",
    targetAmount: 500000,
    currentAmount: 127500,
    financialAmount: 85000,
    contributorCount: 23,
    pendingProposals: 8,
    deadline: "June 2026",
    focusAreas: ["Permaculture", "Housing", "Food Forest"],
    landSize: 150,
    communitySize: 50,
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    rolesNeeded: 12,
    equipmentNeeded: 8,
    vision: "Create a thriving regenerative community that demonstrates sustainable living practices.",
    governance: "Sociocracy with consent-based decision making",
    waterAccess: true,
    roadAccess: true,
    buildingPermits: true,
    existingDwellings: false,
  },
  {
    id: 2,
    name: "Terra Nova Community",
    location: "Portugal, Alentejo Region",
    description: "A 200-hectare land project creating an intentional community focused on regenerative agriculture and education.",
    targetAmount: 750000,
    currentAmount: 312000,
    financialAmount: 180000,
    contributorCount: 45,
    pendingProposals: 12,
    deadline: "September 2026",
    focusAreas: ["Education", "Agriculture", "Community"],
    landSize: 200,
    communitySize: 75,
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    rolesNeeded: 18,
    equipmentNeeded: 15,
    vision: "Build a learning center for regenerative practices accessible to all.",
    governance: "Holacracy with transparent circles",
    waterAccess: true,
    roadAccess: true,
    buildingPermits: false,
    existingDwellings: true,
  },
  {
    id: 3,
    name: "Green Valley Collective",
    location: "Mexico, Oaxaca",
    description: "A 75-acre cooperative focused on indigenous food systems, natural building, and cultural preservation.",
    targetAmount: 300000,
    currentAmount: 89000,
    financialAmount: 45000,
    contributorCount: 18,
    pendingProposals: 5,
    deadline: "March 2026",
    focusAreas: ["Indigenous Food", "Natural Building", "Culture"],
    landSize: 75,
    communitySize: 30,
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    rolesNeeded: 8,
    equipmentNeeded: 6,
    vision: "Preserve and share indigenous knowledge while creating sustainable livelihoods.",
    governance: "Traditional council with consensus",
    waterAccess: true,
    roadAccess: false,
    buildingPermits: true,
    existingDwellings: false,
  },
  {
    id: 4,
    name: "Sunrise Sanctuary",
    location: "Philippines, Palawan",
    description: "A 50-hectare marine and forest conservation project with sustainable tourism and local community development.",
    targetAmount: 400000,
    currentAmount: 156000,
    financialAmount: 98000,
    contributorCount: 32,
    pendingProposals: 7,
    deadline: "December 2026",
    focusAreas: ["Conservation", "Tourism", "Marine"],
    landSize: 50,
    communitySize: 40,
    status: "active",
    daoLink: "https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution",
    rolesNeeded: 10,
    equipmentNeeded: 12,
    vision: "Protect biodiversity while creating economic opportunities for local communities.",
    governance: "Community assembly with rotating leadership",
    waterAccess: true,
    roadAccess: true,
    buildingPermits: true,
    existingDwellings: true,
  },
];

export default function ProjectComparison() {
  const [, setLocation] = useLocation();
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Parse URL params for pre-selected projects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIds = params.get('projects');
    if (projectIds) {
      const ids = projectIds.split(',').map(Number).filter(id => !isNaN(id));
      setSelectedProjects(ids.slice(0, 3));
    }
  }, []);

  const addProject = (projectId: number) => {
    if (selectedProjects.length < 3 && !selectedProjects.includes(projectId)) {
      setSelectedProjects([...selectedProjects, projectId]);
    }
    setShowProjectSelector(false);
  };

  const removeProject = (projectId: number) => {
    setSelectedProjects(selectedProjects.filter(id => id !== projectId));
  };

  const getSelectedProjectData = () => {
    return selectedProjects.map(id => sampleProjects.find(p => p.id === id)).filter(Boolean);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const ComparisonRow = ({ label, values, icon: Icon, type = 'text' }: { 
    label: string; 
    values: (string | number | boolean | undefined)[]; 
    icon?: any;
    type?: 'text' | 'currency' | 'boolean' | 'percent' | 'number';
  }) => (
    <tr className="border-b border-[#7dd87d]/20">
      <td className="py-3 px-4 bg-[#f0f7f0] font-medium text-[#1a472a] text-sm">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#4a7c59]" />}
          {label}
        </div>
      </td>
      {values.map((value, idx) => (
        <td key={idx} className="py-3 px-4 text-center text-[#1a472a]">
          {type === 'boolean' ? (
            value ? (
              <Check className="w-5 h-5 text-green-500 mx-auto" />
            ) : (
              <Minus className="w-5 h-5 text-gray-300 mx-auto" />
            )
          ) : type === 'currency' ? (
            <span className="font-semibold">{formatCurrency(value as number)}</span>
          ) : type === 'percent' ? (
            <span className="font-semibold">{value}%</span>
          ) : type === 'number' ? (
            <span className="font-semibold">{value}</span>
          ) : (
            <span>{value || '-'}</span>
          )}
        </td>
      ))}
      {/* Fill empty columns */}
      {Array(3 - values.length).fill(null).map((_, idx) => (
        <td key={`empty-${idx}`} className="py-3 px-4 text-center text-gray-300">-</td>
      ))}
    </tr>
  );

  const projects = getSelectedProjectData();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f5f0] to-white">
      <BackButton />
      <SEO 
        title="Compare Projects | ReGen Civics"
        description="Compare crowd pooling projects side by side to find the best fit for your contribution."
      />
      <main className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/crowd-pooling-projects">
            <Button variant="ghost" className="mb-4 text-[#4a7c59] hover:text-[#1a472a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <h1 
            className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Compare Projects
          </h1>
          <p className="text-[#4a7c59]">
            Select up to 3 projects to compare side by side
          </p>
        </div>

        {/* Project Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((slot) => {
            const projectId = selectedProjects[slot];
            const project = projectId ? sampleProjects.find(p => p.id === projectId) : null;

            return (
              <Card 
                key={slot} 
                className={`border-2 ${project ? 'border-[#7dd87d]' : 'border-dashed border-[#7dd87d]/40'} bg-white`}
              >
                {project ? (
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[#1a472a] text-sm line-clamp-1">{project.name}</h3>
                      <button 
                        onClick={() => removeProject(project.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#4a7c59] mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {project.location}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {project.focusAreas.slice(0, 2).map(area => (
                        <Badge key={area} variant="secondary" className="text-xs bg-[#f0f7f0] text-[#1a472a]">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                    <button
                      onClick={() => setShowProjectSelector(true)}
                      className="flex flex-col items-center gap-2 text-[#4a7c59] hover:text-[#1a472a] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#7dd87d]/40 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-sm">Add Project</span>
                    </button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Project Selector Modal */}
        {showProjectSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <CardHeader className="border-b border-[#7dd87d]/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1a472a]">Select a Project</CardTitle>
                  <button onClick={() => setShowProjectSelector(false)} className="p-2 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-3">
                  {sampleProjects.filter(p => !selectedProjects.includes(p.id)).map(project => (
                    <button
                      key={project.id}
                      onClick={() => addProject(project.id)}
                      className="w-full text-left p-4 rounded-lg border border-[#7dd87d]/30 hover:border-[#7dd87d] hover:bg-[#f0f7f0] transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-[#1a472a]">{project.name}</h4>
                          <p className="text-sm text-[#4a7c59] flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {project.location}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-[#f0f7f0] text-[#1a472a]">
                          {getProgressPercent(project.currentAmount, project.targetAmount)}% funded
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.focusAreas.map(area => (
                          <Badge key={area} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Comparison Table */}
        {projects.length > 0 ? (
          <Card className="overflow-hidden border-[#7dd87d]/30">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1a472a] text-white">
                    <th className="py-4 px-4 text-left font-semibold w-48">Metric</th>
                    {projects.map(project => (
                      <th key={project!.id} className="py-4 px-4 text-center font-semibold">
                        {project!.name}
                      </th>
                    ))}
                    {Array(3 - projects.length).fill(null).map((_, idx) => (
                      <th key={`empty-header-${idx}`} className="py-4 px-4 text-center text-white/60">
                        -
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Funding Section */}
                  <tr className="bg-[#7dd87d]/20">
                    <td colSpan={4} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                      Funding Progress
                    </td>
                  </tr>
                  <ComparisonRow 
                    label="Target Amount" 
                    values={projects.map(p => p!.targetAmount)} 
                    icon={Target}
                    type="currency"
                  />
                  <ComparisonRow 
                    label="Current Amount" 
                    values={projects.map(p => p!.currentAmount)} 
                    icon={DollarSign}
                    type="currency"
                  />
                  <ComparisonRow 
                    label="Progress" 
                    values={projects.map(p => getProgressPercent(p!.currentAmount, p!.targetAmount))} 
                    type="percent"
                  />
                  <ComparisonRow 
                    label="Financial Only" 
                    values={projects.map(p => p!.financialAmount)} 
                    type="currency"
                  />
                  <ComparisonRow 
                    label="Contributors" 
                    values={projects.map(p => p!.contributorCount)} 
                    icon={Users}
                    type="number"
                  />
                  <ComparisonRow 
                    label="Deadline" 
                    values={projects.map(p => p!.deadline)} 
                    icon={Calendar}
                  />

                  {/* Project Details Section */}
                  <tr className="bg-[#7dd87d]/20">
                    <td colSpan={4} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                      Project Details
                    </td>
                  </tr>
                  <ComparisonRow 
                    label="Location" 
                    values={projects.map(p => p!.location)} 
                    icon={MapPin}
                  />
                  <ComparisonRow 
                    label="Land Size (hectares)" 
                    values={projects.map(p => p!.landSize)} 
                    icon={Scale}
                    type="number"
                  />
                  <ComparisonRow 
                    label="Community Size" 
                    values={projects.map(p => `${p!.communitySize} families`)} 
                    icon={Users}
                  />
                  <ComparisonRow 
                    label="Governance" 
                    values={projects.map(p => p!.governance)} 
                  />

                  {/* Needs Section */}
                  <tr className="bg-[#7dd87d]/20">
                    <td colSpan={4} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                      Current Needs
                    </td>
                  </tr>
                  <ComparisonRow 
                    label="Roles Needed" 
                    values={projects.map(p => p!.rolesNeeded)} 
                    type="number"
                  />
                  <ComparisonRow 
                    label="Equipment Needed" 
                    values={projects.map(p => p!.equipmentNeeded)} 
                    type="number"
                  />
                  <ComparisonRow 
                    label="Pending Proposals" 
                    values={projects.map(p => p!.pendingProposals)} 
                    type="number"
                  />

                  {/* Features Section */}
                  <tr className="bg-[#7dd87d]/20">
                    <td colSpan={4} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                      Land Features
                    </td>
                  </tr>
                  <ComparisonRow 
                    label="Water Access" 
                    values={projects.map(p => p!.waterAccess)} 
                    type="boolean"
                  />
                  <ComparisonRow 
                    label="Road Access" 
                    values={projects.map(p => p!.roadAccess)} 
                    type="boolean"
                  />
                  <ComparisonRow 
                    label="Building Permits" 
                    values={projects.map(p => p!.buildingPermits)} 
                    type="boolean"
                  />
                  <ComparisonRow 
                    label="Existing Dwellings" 
                    values={projects.map(p => p!.existingDwellings)} 
                    type="boolean"
                  />
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center border-[#7dd87d]/30">
            <Scale className="w-16 h-16 mx-auto text-[#7dd87d]/40 mb-4" />
            <h3 className="text-xl font-bold text-[#1a472a] mb-2">No Projects Selected</h3>
            <p className="text-[#4a7c59] mb-4">
              Select at least one project above to start comparing
            </p>
            <Button 
              onClick={() => setShowProjectSelector(true)}
              className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </Card>
        )}

        {/* Action Buttons */}
        {projects.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/crowd-pooling">
              <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                Create Contribution Proposal
              </Button>
            </Link>
            <Link href="/crowd-pooling-projects">
              <Button variant="outline" className="border-[#7dd87d] text-[#1a472a]">
                View All Projects
              </Button>
            </Link>
          </div>
        )}
      </main>


    </div>
  );
}
