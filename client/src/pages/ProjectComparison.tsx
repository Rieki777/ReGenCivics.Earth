/**
 * Project Comparison Page
 *
 * Compares 2-4 crowd pooling campaigns side by side, reading real campaigns
 * from the database via campaigns.list. Demo campaigns (isDemo = 1) appear
 * with an Example badge, same as the gallery.
 *
 * Spec: CROWDPOOLING_PLATFORM_SPEC.md Part D.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Plus, X, MapPin, Users, DollarSign, Calendar, Target, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { trpc } from '@/lib/trpc';
import { BackButton } from "@/components/BackButton";

const MAX_COMPARE = 4;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", PHP: "₱", JPY: "¥", INR: "₹"
};

interface CompareCampaign {
  id: number;
  name: string;
  location: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  financialPledged: number;
  financialTarget: number;
  currency: string;
  contributorsCount?: number;
  deadline: string | null; // ISO
  focusAreas: string[];
  landSize: string;
  landStatus: string;
  teamSize: number | null;
  governance: string;
  legalStructure: string;
  currentPhase: string;
  timeline: string;
  landValue: number;
  equipmentValue: number;
  rolesValue: number;
  resourcesValue: number;
  status: "active" | "funded";
  isDemo: boolean;
}

const LISTED_STATUSES = ["active", "funded", "completed"] as const;

function money(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}

function deadlineLabel(iso: string | null): string {
  if (!iso) return "Ongoing";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Ongoing";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProjectComparison() {
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  const { data: campaignRows, isLoading } = trpc.campaigns.list.useQuery({});

  const campaigns = useMemo<CompareCampaign[]>(() => {
    return (campaignRows ?? [])
      .filter(c => (LISTED_STATUSES as readonly string[]).includes(c.status))
      .map((c) => {
        // contributorsCount is part of the campaigns.list contract but may not
        // be exposed yet; the row renders "-" until it is.
        const extras = c as { contributorsCount?: number };
        const base = c.startedAt ?? c.publishedAt ?? c.createdAt;
        const start = base ? new Date(base) : null;
        const deadline = start && !isNaN(start.getTime())
          ? new Date(start.getTime() + (c.durationDays || 90) * 24 * 60 * 60 * 1000).toISOString()
          : null;
        return {
          id: c.id,
          name: c.title || c.projectName,
          location: c.location || "Location TBD",
          description: c.description || "",
          targetAmount: (c.totalValue ?? 0) + (c.financialTarget ?? 0),
          currentAmount: (c.pledgedTotal ?? 0) + (c.pledgedFinancial ?? 0),
          financialPledged: c.pledgedFinancial ?? 0,
          financialTarget: c.financialTarget ?? 0,
          currency: c.currency || "USD",
          contributorsCount: typeof extras.contributorsCount === "number" ? extras.contributorsCount : undefined,
          deadline,
          focusAreas: c.currentPhase ? [c.currentPhase] : [],
          landSize: c.landSize || "",
          landStatus: c.landStatus || "",
          teamSize: c.teamSize ?? null,
          governance: c.governanceModel || "",
          legalStructure: c.legalStructure || "",
          currentPhase: c.currentPhase || "",
          timeline: c.timeline || "",
          landValue: c.landValue ?? 0,
          equipmentValue: c.equipmentValue ?? 0,
          rolesValue: c.rolesValue ?? 0,
          resourcesValue: c.resourcesValue ?? 0,
          status: c.status === "active" ? "active" as const : "funded" as const,
          isDemo: c.isDemo === 1,
        };
      });
  }, [campaignRows]);

  // Parse URL params for pre-selected campaigns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIds = params.get('projects');
    if (projectIds) {
      const ids = projectIds.split(',').map(Number).filter(id => !isNaN(id));
      setSelectedProjects(ids.slice(0, MAX_COMPARE));
    }
  }, []);

  const addProject = (projectId: number) => {
    if (selectedProjects.length < MAX_COMPARE && !selectedProjects.includes(projectId)) {
      setSelectedProjects([...selectedProjects, projectId]);
    }
    setShowProjectSelector(false);
  };

  const removeProject = (projectId: number) => {
    setSelectedProjects(selectedProjects.filter(id => id !== projectId));
  };

  const projects = selectedProjects
    .map(id => campaigns.find(p => p.id === id))
    .filter((p): p is CompareCampaign => Boolean(p));

  const getProgressPercent = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const ComparisonRow = ({ label, values, icon: Icon, type = 'text' }: {
    label: string;
    values: (string | number | undefined | null)[];
    icon?: React.ComponentType<{ className?: string }>;
    type?: 'text' | 'percent' | 'number';
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
          {type === 'percent' ? (
            <span className="font-semibold">{value}%</span>
          ) : type === 'number' ? (
            <span className="font-semibold">{value ?? '-'}</span>
          ) : (
            <span>{value || '-'}</span>
          )}
        </td>
      ))}
      {/* Fill empty columns */}
      {Array(MAX_COMPARE - values.length).fill(null).map((_, idx) => (
        <td key={`empty-${idx}`} className="py-3 px-4 text-center text-gray-300">-</td>
      ))}
    </tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f5f0] to-white">
      <BackButton />
      <SEO
        title="Compare Campaigns | ReGen Civics"
        description="Compare crowd pooling campaigns side by side to find the best fit for your contribution."
      />
      <main className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/campaigns">
            <Button variant="ghost" className="mb-4 text-[#4a7c59] hover:text-[#1a472a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Compare Campaigns
          </h1>
          <p className="text-[#4a7c59]">
            Select up to {MAX_COMPARE} campaigns to compare side by side
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse rounded-xl bg-[#1a472a]/10 h-32" />
            ))}
          </div>
        )}

        {/* Empty state: no campaigns in the database yet */}
        {!isLoading && campaigns.length === 0 && (
          <Card className="p-12 text-center border-[#7dd87d]/30">
            <Scale className="w-16 h-16 mx-auto text-[#7dd87d]/75 mb-4" />
            <h2 className="text-xl font-bold text-[#1a472a] mb-2">No campaigns yet.</h2>
            <p className="text-[#4a7c59] mb-4">
              The first season opens late 2026 / early 2027.
            </p>
            <Link href="/campaigns">
              <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                Back to Campaigns
              </Button>
            </Link>
          </Card>
        )}

        {!isLoading && campaigns.length > 0 && (
          <>
            {/* Campaign Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: MAX_COMPARE }).map((_, slot) => {
                const projectId = selectedProjects[slot];
                const project = projectId ? campaigns.find(p => p.id === projectId) : null;

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
                            className="p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 inline-flex items-center justify-center hover:bg-red-100 rounded text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#4a7c59] mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {project.isDemo && (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300">
                              Example
                            </Badge>
                          )}
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
                          <span className="text-sm">Add Campaign</span>
                        </button>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Campaign Selector Modal */}
            {showProjectSelector && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                  <CardHeader className="border-b border-[#7dd87d]/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[#1a472a]">Select a Campaign</CardTitle>
                      <button onClick={() => setShowProjectSelector(false)} className="p-2 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-3">
                      {campaigns.filter(p => !selectedProjects.includes(p.id)).map(project => (
                        <button
                          key={project.id}
                          onClick={() => addProject(project.id)}
                          className="w-full text-left p-4 rounded-lg border border-[#7dd87d]/30 hover:border-[#7dd87d] hover:bg-[#f0f7f0] transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-[#1a472a] flex items-center gap-2">
                                {project.name}
                                {project.isDemo && (
                                  <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300">
                                    Example
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-sm text-[#4a7c59] flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {project.location}
                              </p>
                            </div>
                            <Badge variant="secondary" className="bg-[#f0f7f0] text-[#1a472a]">
                              {getProgressPercent(project.currentAmount, project.targetAmount)}% funded
                            </Badge>
                          </div>
                          {project.focusAreas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.focusAreas.map(area => (
                                <Badge key={area} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                          <th key={project.id} className="py-4 px-4 text-center font-semibold">
                            <span className="inline-flex items-center gap-2">
                              {project.name}
                              {project.isDemo && (
                                <Badge className="text-[10px] bg-amber-400/90 text-amber-950 border border-amber-300">
                                  Example
                                </Badge>
                              )}
                            </span>
                          </th>
                        ))}
                        {Array(MAX_COMPARE - projects.length).fill(null).map((_, idx) => (
                          <th key={`empty-header-${idx}`} className="py-4 px-4 text-center text-white/60">
                            -
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Funding Section */}
                      <tr className="bg-[#7dd87d]/20">
                        <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                          Funding Progress
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Pool Target"
                        values={projects.map(p => money(p.targetAmount, p.currency))}
                        icon={Target}
                      />
                      <ComparisonRow
                        label="Pledged So Far"
                        values={projects.map(p => money(p.currentAmount, p.currency))}
                        icon={DollarSign}
                      />
                      <ComparisonRow
                        label="Progress"
                        values={projects.map(p => getProgressPercent(p.currentAmount, p.targetAmount))}
                        type="percent"
                      />
                      <ComparisonRow
                        label="Financial Target"
                        values={projects.map(p => money(p.financialTarget, p.currency))}
                      />
                      <ComparisonRow
                        label="Financial Pledged"
                        values={projects.map(p => money(p.financialPledged, p.currency))}
                      />
                      <ComparisonRow
                        label="Contributors"
                        values={projects.map(p => p.contributorsCount)}
                        icon={Users}
                        type="number"
                      />
                      <ComparisonRow
                        label="Deadline"
                        values={projects.map(p => deadlineLabel(p.deadline))}
                        icon={Calendar}
                      />

                      {/* Project Details Section */}
                      <tr className="bg-[#7dd87d]/20">
                        <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                          Project Details
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Location"
                        values={projects.map(p => p.location)}
                        icon={MapPin}
                      />
                      <ComparisonRow
                        label="Land Size"
                        values={projects.map(p => p.landSize)}
                        icon={Scale}
                      />
                      <ComparisonRow
                        label="Land Status"
                        values={projects.map(p => p.landStatus)}
                      />
                      <ComparisonRow
                        label="Current Phase"
                        values={projects.map(p => p.currentPhase)}
                      />
                      <ComparisonRow
                        label="Timeline"
                        values={projects.map(p => p.timeline)}
                      />
                      <ComparisonRow
                        label="Team Size"
                        values={projects.map(p => p.teamSize ?? undefined)}
                        icon={Users}
                        type="number"
                      />
                      <ComparisonRow
                        label="Governance"
                        values={projects.map(p => p.governance)}
                      />
                      <ComparisonRow
                        label="Legal Structure"
                        values={projects.map(p => p.legalStructure)}
                      />

                      {/* Needs Section: target value by contribution type */}
                      <tr className="bg-[#7dd87d]/20">
                        <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 font-bold text-[#1a472a] text-sm">
                          What They Need (by value)
                        </td>
                      </tr>
                      <ComparisonRow
                        label="Land"
                        values={projects.map(p => p.landValue > 0 ? money(p.landValue, p.currency) : undefined)}
                      />
                      <ComparisonRow
                        label="Equipment"
                        values={projects.map(p => p.equipmentValue > 0 ? money(p.equipmentValue, p.currency) : undefined)}
                      />
                      <ComparisonRow
                        label="Roles"
                        values={projects.map(p => p.rolesValue > 0 ? money(p.rolesValue, p.currency) : undefined)}
                      />
                      <ComparisonRow
                        label="Resources"
                        values={projects.map(p => p.resourcesValue > 0 ? money(p.resourcesValue, p.currency) : undefined)}
                      />
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center border-[#7dd87d]/30">
                <Scale className="w-16 h-16 mx-auto text-[#7dd87d]/75 mb-4" />
                <h2 className="text-xl font-bold text-[#1a472a] mb-2">No Campaigns Selected</h2>
                <p className="text-[#4a7c59] mb-4">
                  Select at least one campaign above to start comparing
                </p>
                <Button
                  onClick={() => setShowProjectSelector(true)}
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Campaign
                </Button>
              </Card>
            )}

            {/* Action Buttons */}
            {projects.length > 0 && (
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                {projects[0] && (
                  <Link href={`/campaign/${projects[0].id}`}>
                    <Button className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d]">
                      View {projects[0].name}
                    </Button>
                  </Link>
                )}
                <Link href="/campaigns">
                  <Button variant="outline" className="border-[#7dd87d] text-[#1a472a]">
                    View All Campaigns
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
